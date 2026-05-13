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
  // proving_value | scaling | durable
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

  return (
    <Link
      to={`/bets/${d.id}`}
      aria-label={`Open bet ${index}: ${d.title || "Untitled"}`}
      className={cn(
        "group block border border-gray-300 rounded-lg p-5 transition-colors",
        "hover:bg-gray-100 cursor-pointer",
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Lifecycle badge */}
        <div className="shrink-0">
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

        {/* Center column: title, meta, outcome target */}
        <div className="flex-1 min-w-0">
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

        {/* Right column: upside, risk, movement */}
        <div className="shrink-0 flex flex-row md:flex-col md:items-end gap-4 md:gap-2 md:min-w-[180px]">
          <div className="flex flex-col">
            <span className="eyebrow-mono">UPSIDE</span>
            <span className="text-base font-semibold text-signal-green leading-tight">
              {d.exposure_value || "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="eyebrow-mono">RISK</span>
            <span className="text-base font-semibold text-signal-red leading-tight">
              {d.revenue_at_risk || "—"}
            </span>
          </div>
          <div className="flex flex-col">
            {stale.code ? (
              <>
                <span className="font-mono text-xs text-signal-red flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-red inline-block animate-pulse" />
                  {stale.code}
                </span>
                <span className="text-xs text-gray-500">{stale.days} days</span>
              </>
            ) : (
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", stale.dotClass)} />
                {stale.label}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          className="hidden md:block shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors"
          aria-hidden
        />
      </div>
    </Link>
  );
}
