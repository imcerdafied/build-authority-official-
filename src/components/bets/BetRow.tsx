import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { staleness, categoryLabels } from "@/pages/Decisions";
import type { DecisionComputed } from "@/hooks/useOrgData";

type LifecycleBucket = "defined" | "activated" | "shipping" | "closed";

function bucketForStatus(status: string): LifecycleBucket {
  if (status === "defined") return "defined";
  if (status === "activated") return "activated";
  if (status === "closed") return "closed";
  return "shipping";
}

const bucketLabel: Record<LifecycleBucket, string> = {
  defined: "Defined",
  activated: "Activated",
  shipping: "Shipping",
  closed: "Closed",
};

const bucketBadgeClass: Record<LifecycleBucket, string> = {
  defined: "bg-gray-100 text-gray-700",
  activated: "bg-signal-amber/15 text-signal-amber",
  shipping: "bg-accent/15 text-accent",
  closed: "bg-signal-green/15 text-signal-green",
};

// Strip newlines + bullet markers so a free-form narrative renders cleanly
// on one truncated line in the portfolio row.
function oneLinePreview(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\s*[•‣◦⁃∙•·]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface BetRowProps {
  d: DecisionComputed & {
    surface?: string;
    sponsor?: string | null;
    outcome_target?: string | null;
    outcome_category?: string | null;
    outcome_category_key?: string | null;
    expected_impact?: string | null;
    exposure_value?: string | null;
    revenue_at_risk?: string | null;
  };
  index: number;
}

export default function BetRow({ d, index }: BetRowProps) {
  const bucket = bucketForStatus(d.status);
  const isAging = bucket === "activated" && d.is_aging;
  const stale = staleness(d.updated_at);
  const categoryKey = d.outcome_category_key ?? d.outcome_category ?? "";
  const category = categoryLabels[categoryKey] || categoryKey || "Uncategorized";
  const upsidePreview = oneLinePreview(d.exposure_value);
  const riskPreview = oneLinePreview(d.revenue_at_risk);

  return (
    <Link
      to={`/bets/${d.id}`}
      aria-label={`Open bet ${index}: ${d.title || "Untitled"}`}
      className={cn(
        "group block border border-gray-300 rounded-lg p-5 transition-colors",
        "hover:bg-gray-100 cursor-pointer",
      )}
    >
      {/* Desktop: 4-column grid. Mobile: stack. */}
      <div className="flex flex-col md:grid md:grid-cols-[auto_minmax(0,1fr)_220px_auto] md:items-center md:gap-6">
        {/* 1. Lifecycle badge */}
        <div className="shrink-0 mb-3 md:mb-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.05em]",
              bucketBadgeClass[bucket],
            )}
          >
            {isAging && <span className="w-1.5 h-1.5 rounded-full bg-signal-amber inline-block" aria-hidden />}
            {bucketLabel[bucket]}{isAging ? " · Aging" : ""}
          </span>
        </div>

        {/* 2. Title + meta + outcome preview — must be allowed to shrink for truncate */}
        <div className="min-w-0 mb-3 md:mb-0">
          <p className="text-[18px] font-semibold text-foreground leading-snug truncate">
            <span className="text-gray-500 mr-1">{index}.</span>
            {d.title || "Untitled"}
          </p>
          <p className="text-sm text-gray-500 mt-1 truncate">
            {category}
            {d.owner ? ` · ${d.owner}` : ""}
            {d.sponsor ? ` · ${d.sponsor}` : ""}
          </p>
          {d.outcome_target && (
            <p className="text-sm text-gray-700 mt-1 truncate">{d.outcome_target}</p>
          )}
        </div>

        {/* 3. Right column — fixed 220px on desktop, full row on mobile */}
        <div className="min-w-0 md:w-[220px] flex flex-col gap-1.5">
          {upsidePreview && (
            <div className="min-w-0">
              <span className="eyebrow-mono">UPSIDE</span>
              <p className="text-sm font-semibold text-signal-green truncate leading-tight">{upsidePreview}</p>
            </div>
          )}
          {riskPreview && (
            <div className="min-w-0">
              <span className="eyebrow-mono">RISK</span>
              <p className="text-sm font-semibold text-signal-red truncate leading-tight">{riskPreview}</p>
            </div>
          )}
          <div className="min-w-0">
            {stale.code ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-red inline-block animate-pulse shrink-0" />
                <span className="font-mono text-[11px] text-signal-red truncate">{stale.code}</span>
                <span className="text-[11px] text-gray-500 shrink-0">· {stale.days}d</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", stale.dotClass)} />
                <span className="text-[11px] text-gray-500 truncate">{stale.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Chevron */}
        <ChevronRight
          className="hidden md:block shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors"
          aria-hidden
        />
      </div>
    </Link>
  );
}
