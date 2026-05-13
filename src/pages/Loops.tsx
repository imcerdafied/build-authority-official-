import { useState } from "react";
import { useOutcomeLoops, type OutcomeLoopComputed, type LoopStatus } from "@/hooks/useOutcomeLoops";
import { useDecisions } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import LoopCard from "@/components/loops/LoopCard";
import LoopDetail from "@/components/loops/LoopDetail";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: LoopStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "proposed", label: "Proposed" },
  { value: "active", label: "Active" },
  { value: "iterating", label: "Iterating" },
  { value: "completed", label: "Completed" },
  { value: "killed", label: "Killed" },
];

export default function Loops() {
  const { data: loops = [], isLoading } = useOutcomeLoops();
  const { data: decisions = [] } = useDecisions();
  const { currentRole } = useOrg();
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const [statusFilter, setStatusFilter] = useState<LoopStatus | "">("");
  const [betFilter, setBetFilter] = useState("");
  const [selectedLoop, setSelectedLoop] = useState<OutcomeLoopComputed | null>(null);

  const filteredLoops = loops.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (betFilter && l.bet_id !== betFilter) return false;
    return true;
  });

  const activeCount = loops.filter((l) => l.status === "active" || l.status === "iterating").length;
  const staleCount = loops.filter((l) => l.is_stale).length;
  const needsDecisionCount = loops.filter((l) => l.has_no_decision).length;

  const betMap = new Map(decisions.map((d) => [d.id, d.title]));
  const betsWithLoops = Array.from(new Set(loops.map((l) => l.bet_id)));

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (selectedLoop) {
    const fresh = loops.find((l) => l.id === selectedLoop.id);
    return (
      <div>
        <button
          onClick={() => setSelectedLoop(null)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
        >
          <span>&larr;</span> Back to all loops
        </button>
        <div className="mb-2">
          <span className="text-xs text-muted-foreground">
            Bet: {betMap.get(selectedLoop.bet_id) || "Unknown"}
          </span>
        </div>
        <LoopDetail
          loop={fresh || selectedLoop}
          onClose={() => setSelectedLoop(null)}
          canWrite={canWrite}
        />
      </div>
    );
  }

  const selectClass = "text-xs border rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Loops</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {loops.length} total · {activeCount} active
              {staleCount > 0 && <span className="text-signal-amber"> · {staleCount} stale</span>}
              {needsDecisionCount > 0 && <span className="text-signal-red"> · {needsDecisionCount} need decision</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LoopStatus | "")}
              className={selectClass}
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {betsWithLoops.length > 1 && (
              <select
                value={betFilter}
                onChange={(e) => setBetFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Bets</option>
                {betsWithLoops.map((betId) => (
                  <option key={betId} value={betId}>
                    {betMap.get(betId) || "Unknown Bet"}
                  </option>
                ))}
              </select>
            )}
            {(statusFilter || betFilter) && (
              <button
                onClick={() => { setStatusFilter(""); setBetFilter(""); }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">
            What are we working on?
          </span>
          <span className="text-lg font-bold tabular-nums">{activeCount}</span>
          <span className="text-xs text-muted-foreground ml-1">active loops</span>
        </div>
        <div className="border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">
            What happened?
          </span>
          <span className="text-lg font-bold tabular-nums">
            {loops.filter((l) => l.last_ship_summary).length}
          </span>
          <span className="text-xs text-muted-foreground ml-1">have shipped</span>
        </div>
        <div className="border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">
            What&apos;s next?
          </span>
          <span className="text-lg font-bold tabular-nums">
            {loops.filter((l) => l.current_decision !== "unclear" && (l.status === "active" || l.status === "iterating")).length}
          </span>
          <span className="text-xs text-muted-foreground ml-1">with clear decisions</span>
        </div>
      </div>

      {/* Loop list grouped by bet */}
      {filteredLoops.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Loops track how a bet is executing in short cycles — ship something, learn from it,
            decide what to do next: scale, iterate, or kill. Create a loop from within any active bet.
          </p>
          {/* Ghost example loops */}
          {[
            {
              bet: "TransitionOS — AI displacement navigation platform",
              title: "B2B employer outreach campaign",
              status: "Active",
              shipped: "Scout tool live, first 20 outreach emails sent",
              decision: "Iterate — response rate too low, refine angle",
              note: "What's the loop for this bet's current push?"
            },
            {
              bet: "Authority — system of record for organizational decisions",
              title: "Conviva case study and renewal prep",
              status: "Iterating",
              shipped: "Q2 strategy review delivered",
              decision: "Scale — expand scope in renewal proposal",
              note: "What iteration is this bet on?"
            },
          ].map((ghost, i) => (
            <div
              key={i}
              className="border border-dashed border-border/60 rounded-lg p-5 opacity-60"
            >
              <div className="text-xs text-muted-foreground/50 mb-1">
                Example Loop · {ghost.bet}
              </div>
              <div className="font-medium text-muted-foreground/70 mb-3">{ghost.title}</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-xs text-muted-foreground/40 mb-1">What shipped</div>
                  <div className="text-muted-foreground/50">{ghost.shipped}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/40 mb-1">Decision</div>
                  <div className="text-muted-foreground/50">{ghost.decision}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground/40 mb-1">Start here</div>
                  <div className="text-muted-foreground/40 italic">{ghost.note}</div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground/40 text-center pt-1">
            Open any bet in the Bets altitude to create a loop for it.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {betsWithLoops
            .filter((betId) => !betFilter || betId === betFilter)
            .map((betId) => {
              const betLoops = filteredLoops.filter((l) => l.bet_id === betId);
              if (betLoops.length === 0) return null;
              return (
                <div key={betId}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {betMap.get(betId) || "Unknown Bet"}
                  </p>
                  <div className="space-y-2">
                    {betLoops.map((loop) => (
                      <LoopCard
                        key={loop.id}
                        loop={loop}
                        onClick={() => setSelectedLoop(loop)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
