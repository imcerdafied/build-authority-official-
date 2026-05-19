import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabels } from "@/pages/Decisions";
import { extractMagnitude, movementState } from "@/lib/bet-magnitude";
import {
  LIFECYCLE_BUCKET_LABEL,
  LIFECYCLE_BUCKET_STYLE,
  lifecycleBucket,
} from "@/lib/bet-status";
import type { DecisionComputed } from "@/hooks/useOrgData";

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
  const bucket = lifecycleBucket(d.status);
  const style = LIFECYCLE_BUCKET_STYLE[bucket];
  const isAging = bucket === "activated" && d.is_aging;
  const categoryKey = d.outcome_category_key ?? d.outcome_category ?? "";
  const category = categoryLabels[categoryKey] || categoryKey || "Uncategorized";
  const upside = extractMagnitude(d.exposure_value);
  const risk = extractMagnitude(d.revenue_at_risk);
  const move = movementState(d.updated_at, d.created_at);

  return (
    <Link
      to={`/bets/${d.id}`}
      aria-label={`Open bet ${index}: ${d.title || "Untitled"}`}
      className={cn(
        "group block border-b border-border px-2 py-4 transition-colors",
        "hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      style={{ borderBottomWidth: "0.5px" }}
    >
      <div className="flex flex-col md:grid md:grid-cols-[auto_minmax(0,1fr)_220px_auto] md:items-center md:gap-6">
        {/* 1. Lifecycle badge — normalized: same shape across all states, colored dot, mono uppercase. */}
        <div className="shrink-0 mb-3 md:mb-0 flex flex-col items-start gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1",
              "font-mono text-[11px] uppercase tracking-[0.05em]",
              style.bg,
              style.text,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", style.dot)} aria-hidden />
            {LIFECYCLE_BUCKET_LABEL[bucket]}
          </span>
          {isAging && (
            <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground pl-3">
              Aging
            </span>
          )}
        </div>

        {/* 2. Title + meta — title may now wrap to 2 lines. Outcome target preview removed. */}
        <div className="min-w-0 mb-3 md:mb-0">
          <p
            className="text-[18px] font-semibold text-foreground leading-snug overflow-hidden"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          >
            <span className="text-muted-foreground mr-1 font-mono tabular-nums">{index}.</span>
            {d.title || "Untitled"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {category}
            {d.owner ? ` · ${d.owner}` : ""}
            {d.sponsor ? ` · ${d.sponsor}` : ""}
          </p>
        </div>

        {/* 3. Right column: magnitudes + movement. 220px hard cap. */}
        <div className="min-w-0 md:w-[220px] flex flex-col gap-1.5">
          <div className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">UPSIDE</span>
            {upside ? (
              <p className="font-mono text-base font-medium text-signal-green tabular-nums truncate leading-tight">
                {upside.display}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-tight">Not quantified</p>
            )}
          </div>
          <div className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">RISK</span>
            {risk ? (
              <p className="font-mono text-base font-medium text-signal-red tabular-nums truncate leading-tight">
                {risk.display}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-tight">Not quantified</p>
            )}
          </div>
          {move.tier !== "none" && (
            <div className="min-w-0 flex items-center gap-1.5">
              {move.tier === "red" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-red inline-block animate-pulse shrink-0" />
                  <span className="font-mono text-xs text-signal-red truncate">{move.code}</span>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">· {move.days}d</span>
                </>
              ) : move.tier === "amber" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-amber inline-block shrink-0" />
                  <span className="font-mono text-xs text-signal-amber truncate">{move.label}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{move.label}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Chevron — strengthened: 20px, gray-500, hover → ink. */}
        <ChevronRight
          className="hidden md:block shrink-0 w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors"
          aria-hidden
        />
      </div>
    </Link>
  );
}
