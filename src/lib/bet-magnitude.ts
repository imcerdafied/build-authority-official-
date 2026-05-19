// Parsing + aggregation for the free-form dollar magnitudes that live inside
// decisions.exposure_value and decisions.revenue_at_risk. The fields hold
// narratives like "Drives $12M+ expansion ARR across ~$74M base by embedding…"
// or "~$15–25M ARR exposure over 24 months if execution stalls…".
//
// Portfolio surfaces need the magnitude only; the detail page keeps the full
// narrative.

export interface ParsedMagnitude {
  /** The matched substring as it appeared in the source, trimmed. e.g. "$12M+ ARR" or "~$15–25M ARR". */
  display: string;
  /** Lower bound in dollars. */
  min: number;
  /** Upper bound in dollars. Equal to min when not a range. */
  max: number;
}

const RANGE_DASH = /[-–—]/; // hyphen, en dash, em dash

const MAGNITUDE_PATTERN =
  /~?\$\d+(?:\.\d+)?\s*[KMB]?\+?(?:\s*[-–—]\s*\$?\d+(?:\.\d+)?\s*[KMB]?\+?)?/i;

const NUM_UNIT_PATTERN = /\$?(\d+(?:\.\d+)?)\s*([KMB])?/gi;

// Look for "ARR" within this many characters after the magnitude so phrasing
// like "$12M+ expansion ARR" still renders as "$12M+ ARR" in the row.
const ARR_LOOKAHEAD_WINDOW = 30;
const ARR_LOOKAHEAD = /\bARR\b/i;

const UNIT_MULTIPLIER: Record<string, number> = {
  K: 1_000,
  M: 1_000_000,
  B: 1_000_000_000,
};

/** Pull the first dollar magnitude (with optional range) out of a free-form string. */
export function extractMagnitude(s: string | null | undefined): ParsedMagnitude | null {
  if (!s) return null;
  const match = s.match(MAGNITUDE_PATTERN);
  if (!match) return null;

  const matchedText = match[0].trim();
  const matchEnd = (match.index ?? 0) + match[0].length;
  const window = s.slice(matchEnd, matchEnd + ARR_LOOKAHEAD_WINDOW);
  const hasArr = ARR_LOOKAHEAD.test(window);
  const display = hasArr ? `${matchedText} ARR` : matchedText;

  // Re-scan the matched substring to read all $-numbers + units numerically.
  const nums: { val: number; unit: string }[] = [];
  let nm: RegExpExecArray | null;
  NUM_UNIT_PATTERN.lastIndex = 0;
  while ((nm = NUM_UNIT_PATTERN.exec(display)) !== null) {
    nums.push({ val: parseFloat(nm[1]), unit: (nm[2] || "").toUpperCase() });
  }
  if (nums.length === 0) return null;

  // If the user wrote "$20-30M", only the trailing number carries the unit.
  // Use the trailing unit for any number that didn't specify one.
  const trailingUnit = [...nums].reverse().find((n) => n.unit)?.unit || "";
  const toDollars = (n: { val: number; unit: string }): number => {
    const u = n.unit || trailingUnit;
    return n.val * (UNIT_MULTIPLIER[u] ?? 1);
  };
  const values = nums.map(toDollars);
  return { display, min: Math.min(...values), max: Math.max(...values) };
}

/** Format a dollar count back to abbreviated form for the summary row. */
export function formatDollars(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export interface AggregatedTotal {
  /** "$32M ARR" or "$30–55M ARR", or null when nothing is quantifiable. */
  display: string | null;
  /** Number of bets that had a usable magnitude. */
  quantifiedCount: number;
  /** Number of bets whose value was non-empty but unparseable. */
  unquantifiedCount: number;
}

/**
 * Sum a slice of magnitudes. Per spec, if ANY bet had a value we couldn't
 * parse, the summary column should fall back to "Not aggregated" — so we
 * surface unquantifiedCount and let the caller decide the wording.
 */
export function aggregateMagnitudes(
  rawValues: Array<string | null | undefined>,
): AggregatedTotal {
  let totalMin = 0;
  let totalMax = 0;
  let quantifiedCount = 0;
  let unquantifiedCount = 0;

  for (const raw of rawValues) {
    if (!raw || !raw.trim()) continue; // empty is skipped, not "unquantified"
    const parsed = extractMagnitude(raw);
    if (!parsed) {
      unquantifiedCount += 1;
      continue;
    }
    totalMin += parsed.min;
    totalMax += parsed.max;
    quantifiedCount += 1;
  }

  if (quantifiedCount === 0) {
    return { display: null, quantifiedCount, unquantifiedCount };
  }
  const display =
    totalMin === totalMax
      ? `${formatDollars(totalMin)} ARR`
      : `${formatDollars(totalMin)}–${formatDollars(totalMax)} ARR`;
  return { display, quantifiedCount, unquantifiedCount };
}

export type MovementStateTier = "green" | "amber" | "red" | "none";

export interface MovementState {
  tier: MovementStateTier;
  days: number;
  /** Short label; empty when tier === "none". */
  label: string;
  /** Error-code label when stalled, otherwise null. */
  code: string | null;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const HEALTHY_THRESHOLD = 14;
const SLOWING_THRESHOLD = 30;

/**
 * State-aware movement indicator. Uses updated_at as a proxy for last movement.
 *
 * Tiers:
 *   <14d → green "Moved Xd ago"
 *   14-30d → amber "Slowing · Xd"
 *   >30d → red "ERR_NO_MOVEMENT · Xd"
 *
 * Reset rule: a bet that has never moved since creation (updated_at ===
 * created_at) returns tier "none" regardless of age. Bulk-imported bets that
 * haven't been touched yet are not a movement signal — they're a backlog
 * signal, which lives elsewhere.
 */
export function movementState(
  updatedAt: string | null | undefined,
  createdAt?: string | null | undefined,
): MovementState {
  if (!updatedAt) return { tier: "none", days: 0, label: "", code: null };
  const days = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / DAY_MS));
  const neverMoved = !!createdAt && new Date(updatedAt).getTime() === new Date(createdAt).getTime();

  // Never moved since creation: stay quiet regardless of age.
  if (neverMoved) {
    return { tier: "none", days, label: "", code: null };
  }
  if (days > SLOWING_THRESHOLD) {
    return { tier: "red", days, label: `${days}d`, code: "ERR_NO_MOVEMENT" };
  }
  if (days >= HEALTHY_THRESHOLD) {
    return { tier: "amber", days, label: `Slowing · ${days}d`, code: null };
  }
  return { tier: "green", days, label: `Moved ${days}d ago`, code: null };
}
