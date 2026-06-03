import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDecisions, useDecisionRisks } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { ChevronDown, ChevronRight } from "lucide-react";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import BetRow from "@/components/bets/BetRow";
import { categoryLabels } from "@/pages/Decisions";
import type { DecisionComputed } from "@/hooks/useOrgData";
import { aggregateMagnitudes, extractMagnitude, movementState } from "@/lib/bet-magnitude";
import {
  BET_LIFECYCLE_LABELS,
  BET_LIFECYCLE_STATUSES,
  BET_RISK_LABELS,
  isClosedBetLifecycle,
  toBetRiskLevel,
} from "@/lib/bet-status";
import { cn } from "@/lib/utils";

function formatDate(ts: string): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface SummaryDecision {
  exposure_value?: string | null;
  revenue_at_risk?: string | null;
  updated_at: string;
  created_at: string;
}

interface SequencedDecision {
  title?: string | null;
  created_at: string;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value || "").trim());
}

function sequenceFromTitle(title: string | null | undefined) {
  const match = String(title || "").trim().match(/^(\d+)([a-z])?\s*[\).:-]/i);
  if (!match) return null;
  return {
    number: Number(match[1]),
    suffix: (match[2] || "").toUpperCase(),
  };
}

function compareBetSequence(a: SequencedDecision, b: SequencedDecision): number {
  const aSequence = sequenceFromTitle(a.title);
  const bSequence = sequenceFromTitle(b.title);
  const createdDelta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  if (!aSequence && !bSequence) return createdDelta;
  if (aSequence && !bSequence) return -1;
  if (!aSequence && bSequence) return 1;
  if (!aSequence || !bSequence) return createdDelta;
  if (aSequence.number !== bSequence.number) return aSequence.number - bSequence.number;
  if (aSequence.suffix !== bSequence.suffix) return aSequence.suffix.localeCompare(bSequence.suffix);
  return createdDelta;
}

function AuthorityRoleSummary({
  activeDecisions,
}: {
  activeDecisions: DecisionComputed[];
}) {
  const total = activeDecisions.length;
  const outcomesReady = activeDecisions.filter(
    (d) => hasText(d.trigger_signal) && hasText(d.outcome_target) && hasText(d.expected_impact),
  ).length;
  const systemReady = activeDecisions.filter(
    (d) => hasText(d.owner) && (hasText(d.slice_due_at) || hasText(d.target_completion_date)),
  ).length;
  const needsShape = total - outcomesReady;
  const operatingGaps = total - systemReady;
  const needsReview = activeDecisions.filter(
    (d) => !hasText(d.trigger_signal) || !hasText(d.outcome_target) || !hasText(d.expected_impact),
  ).length;
  const allHandoffReady = total > 0 && needsShape === 0 && operatingGaps === 0;

  const ReadinessFact = ({
    label,
    value,
    detail,
    tone = "neutral",
  }: {
    label: string;
    value: string | number;
    detail: string;
    tone?: "neutral" | "clear" | "attention";
  }) => (
    <div
      className={cn(
        "rounded-[2px] border bg-background p-3",
        tone === "clear" && "border-green-300 bg-green-50/40",
        tone === "attention" && "border-amber-300 bg-amber-50/50",
        tone === "neutral" && "border-gray-300",
      )}
      style={{ borderWidth: "0.5px" }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{detail}</p>
    </div>
  );

  return (
    <section
      className="mb-8 border-y border-border py-6"
      style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
      aria-label="Authority role in the platform"
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Platform Role
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Strategic bets and rationale records
          </h2>
          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            Authority owns the durable why: sponsor, owner, trigger signal, upside, risk, rationale, and decision history. Outcomes_ turns ready bets into prompt-aware product work. System tracks whether the work moves.
          </p>
        </div>
        <div className="rounded-[2px] border border-gray-300 bg-background px-3 py-2 text-sm text-muted-foreground" style={{ borderWidth: "0.5px" }}>
          <span className="font-semibold tabular-nums text-foreground">{total}</span>{" "}
          active strategic {total === 1 ? "record" : "records"}
        </div>
      </div>

      {allHandoffReady ? (
        <div className="rounded-[2px] border border-green-300 bg-green-50/40 px-3 py-3" style={{ borderWidth: "0.5px" }}>
          <p className="text-sm font-medium text-foreground">
            All {total} open {total === 1 ? "bet has" : "bets have"} enough rationale for product shaping and operating follow-through.
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            The useful question is no longer “are these complete?” It is which bet should move first, and what proof would change the next decision.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ReadinessFact
              label="Ready for handoff"
              value={`${outcomesReady}/${total}`}
              detail="Bets with trigger, outcome target, and expected impact."
              tone={needsShape === 0 ? "clear" : "attention"}
            />
            <ReadinessFact
              label="Needs shaping"
              value={needsReview}
              detail={needsReview === 0 ? "No product handoff gaps." : "Missing rationale, outcome, or impact context."}
              tone={needsReview === 0 ? "clear" : "attention"}
            />
            <ReadinessFact
              label="Operating gaps"
              value={operatingGaps}
              detail={operatingGaps === 0 ? "Owner and timing are in place." : "Missing owner or timing for follow-through."}
              tone={operatingGaps === 0 ? "clear" : "attention"}
            />
          </div>
          <div className="mt-3 rounded-[2px] bg-muted/25 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next useful move</p>
            <p className="mt-1 text-sm leading-snug text-foreground">
              Tighten the bets with gaps before sending them into Outcomes_ or System. Once the gaps are clear, this page should guide priority rather than count readiness.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function PortfolioSummary({
  activeDecisions,
  showMagnitudes,
}: {
  activeDecisions: SummaryDecision[];
  showMagnitudes: boolean;
}) {
  const upside = aggregateMagnitudes(activeDecisions.map((d) => d.exposure_value ?? null));
  const risk = aggregateMagnitudes(activeDecisions.map((d) => d.revenue_at_risk ?? null));
  const stalled = activeDecisions.filter(
    (d) => movementState(d.updated_at, d.created_at).tier === "red",
  ).length;
  const denom = activeDecisions.length;
  const stalledMajority = denom > 0 && stalled / denom > 0.5;

  const Col = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight leading-tight">{children}</span>
    </div>
  );

  const Magnitude = ({
    agg,
  }: {
    agg: ReturnType<typeof aggregateMagnitudes>;
  }) => {
    if (agg.unquantifiedCount > 0) {
      const skipped = agg.unquantifiedCount;
      return (
        <span
          className="text-gray-500"
          title={`${skipped} bet${skipped === 1 ? "" : "s"} could not be summed — value is non-numeric`}
        >
          Not aggregated
        </span>
      );
    }
    if (!agg.display) return <span className="text-gray-500">—</span>;
    return <span className="text-foreground">{agg.display}</span>;
  };

  // Stalled is a critical signal when it exists and silent noise when zero.
  // Same pattern as showMagnitudes — only render the column when it carries
  // information worth reading.
  const showStalled = stalled > 0;
  if (!showMagnitudes && !showStalled) return null;

  const colCount = (showMagnitudes ? 2 : 0) + (showStalled ? 1 : 0);
  const gridClass =
    colCount === 3
      ? "md:grid-cols-3"
      : colCount === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-1";

  return (
    <div
      className="border-y border-border py-6 mb-6"
      style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
    >
      <div className={cn("grid grid-cols-1 gap-6 md:gap-10", gridClass)}>
        {showMagnitudes && (
          <>
            <Col label="TOTAL UPSIDE">
              <Magnitude agg={upside} />
            </Col>
            <Col label="TOTAL RISK">
              <Magnitude agg={risk} />
            </Col>
          </>
        )}
        {showStalled && (
          <Col label="STALLED">
            <span className={stalledMajority ? "text-red-700" : "text-foreground"}>
              {stalled} of {denom} {denom === 1 ? "bet" : "bets"}
            </span>
          </Col>
        )}
      </div>
    </div>
  );
}

function PlatformPathPanel({ activeCount }: { activeCount: number }) {
  return (
    <section className="mb-6 border rounded-md bg-background px-4 py-4">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Platform path</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Authority is the strategic record. It keeps the bet, rationale, proof target, and constraint. Outcomes turns selected bets into prompt-ready product work. System tracks delivery momentum.
          </p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm border text-muted-foreground">
          Strategy → Work → Momentum
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-sm border bg-muted/20 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Authority users see</p>
          <p className="mt-1 text-sm font-medium">Bets, rationale, proof, and operating constraints</p>
          <p className="mt-1 text-xs text-muted-foreground">{activeCount} open strategic record{activeCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-sm border bg-muted/20 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outcomes creates</p>
          <p className="mt-1 text-sm font-medium">Roadmap cards, readiness briefs, and build prompts</p>
          <p className="mt-1 text-xs text-muted-foreground">Use when a bet becomes product work.</p>
        </div>
        <div className="rounded-sm border bg-muted/20 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">System tracks</p>
          <p className="mt-1 text-sm font-medium">Owners, status, dependencies, and shipped momentum</p>
          <p className="mt-1 text-xs text-muted-foreground">Use after the work is moving.</p>
        </div>
      </div>
    </section>
  );
}

export default function Bets() {
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { isLoading: risksLoading } = useDecisionRisks();
  const { currentRole } = useOrg();
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const [showCreate, setShowCreate] = useState(false);
  const [closedBetsOpen, setClosedBetsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get("status") ?? "";
  const filterRisk = searchParams.get("risk") ?? "";
  const filterDomain = searchParams.get("domain") ?? "";

  const setFilter = (key: "status" | "risk" | "domain", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  if (decisionsLoading || risksLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const activeDecisions = decisions.filter((d) => !isClosedBetLifecycle(d.status));
  const closedDecisions = decisions
    .filter((d) => isClosedBetLifecycle(d.status))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const closedCount = closedDecisions.length;
  const orderedDecisions = [...activeDecisions].sort(
    compareBetSequence,
  );
  const productAreaOptions = Array.from(
    new Set(orderedDecisions.map((d) => String(d.surface || "").trim()).filter(Boolean)),
  );
  const isEmpty = decisions.length === 0;

  // Auto-hide Upside/Risk columns + totals when no active bet has a parseable
  // dollar magnitude. Keeps a 0-to-1 workspace from screaming "Not quantified"
  // on every row; columns reappear automatically once any bet gets a $-amount.
  const showMagnitudes = activeDecisions.some(
    (d) => extractMagnitude(d.exposure_value) !== null || extractMagnitude(d.revenue_at_risk) !== null,
  );

  const filtersActive = !!(filterStatus || filterRisk || filterDomain);
  const filteredDecisions = orderedDecisions.filter((d) => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterRisk && toBetRiskLevel(d.risk_level) !== filterRisk) return false;
    if (filterDomain && String(d.surface || "").trim() !== filterDomain) return false;
    return true;
  });

  const filterStatusOptions = BET_LIFECYCLE_STATUSES.filter((s) => s !== "closed");
  const riskLevelOptions = ["at_risk", "watch", "healthy"] as const;
  const selectClass = "text-xs border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight tracking-tight">Bets</h1>
            <p className="text-sm text-muted-foreground mt-2 tabular-nums">
              {decisions.length} total · {activeDecisions.length} open · {closedCount} closed
            </p>
          </div>
          {canWrite && !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center rounded-[2px] bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-[0.9] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              + Register bet
            </button>
          )}
        </div>
      </div>

      <AuthorityRoleSummary activeDecisions={activeDecisions as DecisionComputed[]} />

      {/* Portfolio summary — aggregates across active bets */}
      <PortfolioSummary activeDecisions={activeDecisions} showMagnitudes={showMagnitudes} />

      <PlatformPathPanel activeCount={activeDecisions.length} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select value={filterStatus} onChange={(e) => setFilter("status", e.target.value)} className={selectClass}>
          <option value="">All Lifecycles</option>
          {filterStatusOptions.map((s) => (
            <option key={s} value={s}>{BET_LIFECYCLE_LABELS[s]}</option>
          ))}
        </select>
        <select value={filterRisk} onChange={(e) => setFilter("risk", e.target.value)} className={selectClass}>
          <option value="">All Risk Levels</option>
          {riskLevelOptions.map((r) => (
            <option key={r} value={r}>{BET_RISK_LABELS[r]}</option>
          ))}
        </select>
        {productAreaOptions.length > 0 && (
          <select value={filterDomain} onChange={(e) => setFilter("domain", e.target.value)} className={selectClass}>
            <option value="">All Product Areas</option>
            {productAreaOptions.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        )}
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {/* Zero-bet empty state — single line, no centered card */}
      {isEmpty && !showCreate ? (
        <div
          className="border-y border-border py-6"
          style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
        >
          <p className="text-sm text-muted-foreground">
            No bets yet.{" "}
            {canWrite && (
              <button
                onClick={() => setShowCreate(true)}
                className="text-foreground font-medium hover:underline"
              >
                + Register your first bet
              </button>
            )}
          </p>
        </div>
      ) : (
        <>
          {filteredDecisions.length === 0 && filtersActive ? (
            <div
              className="border-y border-border py-6"
              style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
            >
              <p className="text-sm text-muted-foreground">
                No bets match these filters.{" "}
                <button
                  onClick={clearFilters}
                  className="text-foreground font-medium hover:underline"
                >
                  Clear filters
                </button>
              </p>
            </div>
          ) : (
            <div
              className="border-t border-border"
              style={{ borderTopWidth: "0.5px" }}
            >
              {filteredDecisions.map((d, index) => (
                <BetRow key={d.id} d={d as any} index={index + 1} showMagnitudes={showMagnitudes} />
              ))}
            </div>
          )}

          {/* Closed bets — collapsible */}
          {closedCount > 0 && (
            <section
              className="border-t border-border pt-6 mt-10"
              style={{ borderTopWidth: "0.5px" }}
            >
              <button
                onClick={() => setClosedBetsOpen(!closedBetsOpen)}
                aria-expanded={closedBetsOpen}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {closedBetsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {`Closed bets (${closedCount})`}
              </button>
              {closedBetsOpen && (
                <div className="mt-4">
                  {closedDecisions.map((d) => (
                    <a
                      key={d.id}
                      href={`/bets/${d.id}`}
                      className={cn(
                        "block border-b border-border px-2 py-3",
                        "flex flex-col md:flex-row md:items-center md:justify-between gap-2",
                        "hover:bg-muted transition-colors",
                      )}
                      style={{ borderBottomWidth: "0.5px" }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{d.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(() => {
                            const k = (d.outcome_category_key ?? d.outcome_category) ?? "";
                            if (!k) return "—";
                            return categoryLabels[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                          })()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">Closed {formatDate(d.updated_at)}</p>
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
