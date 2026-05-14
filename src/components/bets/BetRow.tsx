import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabels } from "@/pages/Decisions";
import { extractMagnitude, movementState } from "@/lib/bet-magnitude";
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

// Per spec: same shape across all states; dot color matches the state.
const bucketStyle: Record<LifecycleBucket, { bg: string; text: string; dot: string }> = {
  defined: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  activated: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  shipping: { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  closed: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
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
  const style = bucketStyle[bucket];
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
        "group block border border-gray-300 rounded-lg p-5 transition-colors",
        "hover:bg-gray-100 cursor-pointer",
      )}
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
            {bucketLabel[bucket]}
          </span>
          {isAging && (
            <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-gray-500 pl-3">
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
            <span className="text-gray-500 mr-1">{index}.</span>
            {d.title || "Untitled"}
          </p>
          <p className="text-sm text-gray-500 mt-1 truncate">
            {category}
            {d.owner ? ` · ${d.owner}` : ""}
            {d.sponsor ? ` · ${d.sponsor}` : ""}
          </p>
        </div>

        {/* 3. Right column: magnitudes + movement. 220px hard cap. */}
        <div className="min-w-0 md:w-[220px] flex flex-col gap-1.5">
          <div className="min-w-0">
            <span className="eyebrow-mono">UPSIDE</span>
            {upside ? (
              <p className="text-base font-semibold text-green-700 truncate leading-tight">{upside.display}</p>
            ) : (
              <p className="text-sm text-gray-500 leading-tight">Not quantified</p>
            )}
          </div>
          <div className="min-w-0">
            <span className="eyebrow-mono">RISK</span>
            {risk ? (
              <p className="text-base font-semibold text-red-700 truncate leading-tight">{risk.display}</p>
            ) : (
              <p className="text-sm text-gray-500 leading-tight">Not quantified</p>
            )}
          </div>
          {move.tier !== "none" && (
            <div className="min-w-0 flex items-center gap-1.5">
              {move.tier === "red" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block animate-pulse shrink-0" />
                  <span className="font-mono text-xs text-red-700 truncate">{move.code}</span>
                  <span className="text-xs text-gray-500 shrink-0">· {move.days}d</span>
                </>
              ) : move.tier === "amber" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
                  <span className="font-mono text-xs text-amber-700 truncate">{move.label}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block shrink-0" />
                  <span className="text-xs text-gray-500 truncate">{move.label}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Chevron — strengthened: 20px, gray-500, hover → ink. */}
        <ChevronRight
          className="hidden md:block shrink-0 w-5 h-5 text-gray-500 group-hover:text-foreground transition-colors"
          aria-hidden
        />
      </div>
    </Link>
  );
}
