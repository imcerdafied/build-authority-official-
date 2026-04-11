import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */

interface OKR {
  id: string;
  title: string;
  status: string;
  quarter: string | null;
}

interface KeyResult {
  id: string;
  okr_id: string;
  status: string;
}

/* ---------- constants ---------- */

const STATUS_COLORS: Record<string, string> = {
  on_track: "bg-signal-green/15 text-signal-green",
  at_risk: "bg-signal-amber/15 text-signal-amber",
  behind: "bg-signal-red/15 text-signal-red",
  complete: "bg-muted text-muted-foreground",
  active: "bg-blue-500/15 text-blue-400",
  cancelled: "bg-muted text-muted-foreground line-through",
};

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

/* ---------- component ---------- */

export default function QuarterReview() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const currentQuarter = useMemo(() => getCurrentQuarter(), []);
  const [closing, setClosing] = useState(false);

  /* --- queries --- */

  const { data: okrs = [], isLoading: okrsLoading } = useQuery<OKR[]>({
    queryKey: ["okrs_quarter", currentOrg?.id, currentQuarter],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("okrs")
        .select("id, title, status, quarter")
        .eq("org_id", currentOrg.id)
        .eq("quarter", currentQuarter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OKR[];
    },
    enabled: !!currentOrg,
  });

  const { data: keyResults = [] } = useQuery<KeyResult[]>({
    queryKey: ["key_results_quarter", currentOrg?.id, currentQuarter],
    queryFn: async () => {
      if (!currentOrg || okrs.length === 0) return [];
      const okrIds = okrs.map((o) => o.id);
      const { data, error } = await supabase
        .from("key_results")
        .select("id, okr_id, status")
        .in("okr_id", okrIds);
      if (error) throw error;
      return (data ?? []) as KeyResult[];
    },
    enabled: !!currentOrg && okrs.length > 0,
  });

  /* --- derived data --- */

  const summary = useMemo(() => {
    return okrs.map((okr) => {
      const krs = keyResults.filter((kr) => kr.okr_id === okr.id);
      const onTrack = krs.filter((kr) => kr.status === "on_track").length;
      const total = krs.length;
      const pct = total > 0 ? Math.round((onTrack / total) * 100) : 0;
      return { ...okr, krTotal: total, krOnTrack: onTrack, pct };
    });
  }, [okrs, keyResults]);

  const totalOkrs = okrs.length;
  const activeOkrs = okrs.filter((o) => o.status === "active").length;
  const completeOkrs = okrs.filter((o) => o.status === "complete").length;
  const totalKRs = keyResults.length;
  const totalOnTrack = keyResults.filter((kr) => kr.status === "on_track").length;
  const overallPct = totalKRs > 0 ? Math.round((totalOnTrack / totalKRs) * 100) : 0;

  /* --- close quarter --- */

  async function handleCloseQuarter() {
    if (!currentOrg) return;
    const activeIds = okrs.filter((o) => o.status === "active").map((o) => o.id);
    if (activeIds.length === 0) {
      toast.info("No active goals to close");
      return;
    }
    setClosing(true);
    try {
      const { error } = await supabase
        .from("okrs")
        .update({ status: "complete" } as any)
        .eq("org_id", currentOrg.id)
        .eq("quarter", currentQuarter)
        .eq("status", "active");
      if (error) throw error;
      toast.success(`Closed ${activeIds.length} OKR${activeIds.length === 1 ? "" : "s"} for ${currentQuarter}`);
      queryClient.invalidateQueries({ queryKey: ["okrs_quarter"] });
      queryClient.invalidateQueries({ queryKey: ["okrs"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to close quarter");
    } finally {
      setClosing(false);
    }
  }

  /* --- loading --- */

  if (okrsLoading) {
    return <p className="text-sm text-muted-foreground py-12 text-center">Loading...</p>;
  }

  /* --- render --- */

  return (
    <div>
      {/* header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Quarter Review</h1>
            <span className="text-xs text-muted-foreground border border-border rounded-sm px-1.5 py-0.5">
              {currentQuarter}
            </span>
          </div>
          <button
            onClick={handleCloseQuarter}
            disabled={closing || activeOkrs === 0}
            className={cn(
              "text-xs font-semibold border rounded-sm px-3 py-1.5 transition-colors",
              activeOkrs > 0
                ? "border-foreground/20 hover:bg-foreground/5"
                : "border-border text-muted-foreground cursor-not-allowed",
            )}
          >
            {closing ? "Closing..." : "Close Quarter"}
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">Objectives</span>
          <span className="text-lg font-bold tabular-nums">{totalOkrs}</span>
        </div>
        <div className="border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">Active</span>
          <span className="text-lg font-bold tabular-nums">{activeOkrs}</span>
        </div>
        <div className="border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">Complete</span>
          <span className="text-lg font-bold tabular-nums">{completeOkrs}</span>
        </div>
        <div className="border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground block">KRs On Track</span>
          <span className="text-lg font-bold tabular-nums">{totalOnTrack}</span>
          <span className="text-xs text-muted-foreground ml-1">/ {totalKRs}</span>
          {totalKRs > 0 && (
            <span className="text-xs text-muted-foreground ml-1">({overallPct}%)</span>
          )}
        </div>
      </div>

      {/* empty state */}
      {summary.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            No goals found for {currentQuarter}. Create goals to populate this review.
          </p>
          <Link
            to="/goals"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Goals
          </Link>
        </div>
      )}

      {/* OKR summary table */}
      {summary.length > 0 && (
        <div className="border border-border rounded-sm">
          {/* table header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border">
            <span className="text-xs text-muted-foreground font-semibold flex-1">Objective</span>
            <span className="text-xs text-muted-foreground font-semibold w-20 text-center hidden sm:block">
              Status
            </span>
            <span className="text-xs text-muted-foreground font-semibold w-32 text-center hidden md:block">
              Key Results
            </span>
            <span className="text-xs text-muted-foreground font-semibold w-32 hidden md:block">
              Progress
            </span>
          </div>

          {/* rows */}
          <div className="divide-y divide-border">
            {summary.map((row) => (
              <Link
                key={row.id}
                to={`/goals/${row.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                {/* title */}
                <span className="text-sm flex-1 min-w-0 truncate">{row.title}</span>

                {/* status */}
                <span
                  className={cn(
                    "text-xs font-semibold rounded-sm px-1.5 py-0.5 shrink-0 w-20 text-center",
                    STATUS_COLORS[row.status] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {row.status.replace(/_/g, " ")}
                </span>

                {/* KR count */}
                <span className="text-xs text-muted-foreground tabular-nums w-32 text-center shrink-0 hidden md:block">
                  {row.krOnTrack}/{row.krTotal} on track
                </span>

                {/* progress bar */}
                <div className="w-32 shrink-0 hidden md:flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/60 rounded-full transition-all"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{row.pct}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
