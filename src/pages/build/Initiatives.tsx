import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useDecisions } from "@/hooks/useOrgData";
import { cn } from "@/lib/utils";
import type { BetInitiative } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 7) return "bg-signal-green/15 text-signal-green";
  if (score >= 5) return "bg-signal-amber/15 text-signal-amber";
  return "bg-signal-red/15 text-signal-red";
}

export default function Initiatives() {
  const { currentOrg } = useOrg();
  const { data: decisions = [] } = useDecisions();
  const [betFilter, setBetFilter] = useState("");

  const { data: initiatives = [], isLoading } = useQuery<BetInitiative[]>({
    queryKey: ["all-initiatives", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      // Get all bet IDs for this org
      const { data: orgBets } = await supabase
        .from("decisions")
        .select("id")
        .eq("org_id", currentOrg.id);
      if (!orgBets || orgBets.length === 0) return [];
      const betIds = orgBets.map((b) => b.id);
      const { data, error } = await supabase
        .from("bet_initiatives")
        .select("*")
        .in("bet_id", betIds)
        .order("score_v3", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BetInitiative[];
    },
    enabled: !!currentOrg,
    staleTime: 30_000,
  });

  const betMap = useMemo(
    () => new Map(decisions.map((d) => [d.id, { title: d.title, status: d.status }])),
    [decisions],
  );

  const betsWithInitiatives = useMemo(() => {
    const ids = new Set(initiatives.map((i) => i.bet_id));
    return Array.from(ids);
  }, [initiatives]);

  const filtered = betFilter
    ? initiatives.filter((i) => i.bet_id === betFilter)
    : initiatives;

  const groupedByBet = useMemo(() => {
    const map = new Map<string, BetInitiative[]>();
    for (const init of filtered) {
      const list = map.get(init.bet_id) ?? [];
      list.push(init);
      map.set(init.bet_id, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-12 text-center">Loading...</p>;
  }

  if (initiatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
          Initiatives are the specific actions your team is committing to for each bet.
          They feed the scoring engine — higher value × confidence ÷ effort = better score.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Add initiatives by opening any bet in the Bets altitude.
        </p>
        <Link
          to="/decisions"
          className="text-xs font-semibold border border-foreground/20 rounded-sm px-4 py-2 hover:bg-foreground/5 transition-colors"
        >
          Go to Bets →
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">Initiatives</h1>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {initiatives.length} total across {betsWithInitiatives.length} bet{betsWithInitiatives.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specific commitments that feed each bet's score.
            </p>
          </div>
          {betsWithInitiatives.length > 1 && (
            <select
              value={betFilter}
              onChange={(e) => setBetFilter(e.target.value)}
              className="text-xs border rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <option value="">All Bets</option>
              {betsWithInitiatives.map((betId) => (
                <option key={betId} value={betId}>
                  {betMap.get(betId)?.title || "Unknown Bet"}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grouped by bet */}
      <div className="space-y-6">
        {groupedByBet.map(([betId, inits]) => {
          const bet = betMap.get(betId);
          return (
            <div key={betId} className="border rounded-md overflow-hidden">
              {/* Bet header */}
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground/60">⚡</span>
                  <span className="text-sm font-semibold truncate">
                    {bet?.title || "Unknown Bet"}
                  </span>
                </div>
                {bet?.status && (
                  <span className="text-xs text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 shrink-0">
                    {String(bet.status).replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {/* Initiative rows */}
              <div className="divide-y divide-border">
                {inits.map((init) => (
                  <div key={init.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-sm flex-1 min-w-0 truncate">
                      {init.description.length > 60
                        ? init.description.slice(0, 60) + "\u2026"
                        : init.description}
                    </span>

                    {/* Score badge */}
                    <span
                      className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded-sm shrink-0 tabular-nums",
                        scoreColor(init.score_v3),
                      )}
                    >
                      {init.score_v3.toFixed(1)}
                    </span>

                    {/* Confidence */}
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-12 text-right">
                      {Math.round(init.confidence * 100)}%
                    </span>

                    {/* Effort bar */}
                    <div className="w-16 flex items-center gap-1 shrink-0">
                      <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/40 rounded-full"
                          style={{ width: `${Math.min(100, (init.effort / 10) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{init.effort}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
