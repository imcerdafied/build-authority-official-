import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */

interface OKR {
  id: string;
  title: string;
  description: string | null;
  quarter: string | null;
  status: string;
  owner_id: string | null;
  org_id: string;
  created_at: string;
}

interface KeyResult {
  id: string;
  title: string;
  metric_type: string;
  target_value: number | null;
  current_value: number | null;
  confidence_score: number | null;
  unit: string | null;
  status: string;
  okr_id: string;
}

interface CheckIn {
  id: string;
  key_result_id: string;
  value: number;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface LinkedBet {
  id: string;
  title: string;
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

function confidenceColor(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 7) return "bg-signal-green/15 text-signal-green";
  if (score >= 4) return "bg-signal-amber/15 text-signal-amber";
  return "bg-signal-red/15 text-signal-red";
}

function relativeTime(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ---------- component ---------- */

export default function OKRDetail() {
  const { okrId } = useParams<{ okrId: string }>();
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();

  const [checkInKrId, setCheckInKrId] = useState<string | null>(null);
  const [checkInValue, setCheckInValue] = useState("");
  const [checkInConfidence, setCheckInConfidence] = useState(5);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  /* --- queries --- */

  const { data: okr, isLoading: okrLoading } = useQuery<OKR | null>({
    queryKey: ["okr", okrId],
    queryFn: async () => {
      if (!okrId) return null;
      const { data, error } = await supabase.from("okrs").select("*").eq("id", okrId).single();
      if (error) throw error;
      return data as OKR;
    },
    enabled: !!okrId,
  });

  const { data: keyResults = [] } = useQuery<KeyResult[]>({
    queryKey: ["key_results", okrId],
    queryFn: async () => {
      if (!okrId) return [];
      const { data, error } = await supabase
        .from("key_results")
        .select("*")
        .eq("okr_id", okrId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KeyResult[];
    },
    enabled: !!okrId,
  });

  const { data: allCheckIns = [] } = useQuery<CheckIn[]>({
    queryKey: ["okr_check_ins", okrId],
    queryFn: async () => {
      if (!okrId || keyResults.length === 0) return [];
      const krIds = keyResults.map((kr) => kr.id);
      const { data, error } = await supabase
        .from("okr_check_ins")
        .select("*")
        .in("key_result_id", krIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CheckIn[];
    },
    enabled: !!okrId && keyResults.length > 0,
  });

  const { data: linkedBets = [] } = useQuery<LinkedBet[]>({
    queryKey: ["linked_bets", okrId],
    queryFn: async () => {
      if (!okrId) return [];
      try {
        const { data, error } = await supabase
          .from("decisions" as any)
          .select("id, title, status")
          .eq("linked_okr_id", okrId);
        if (error) return [];
        return (data ?? []) as LinkedBet[];
      } catch {
        return [];
      }
    },
    enabled: !!okrId,
  });

  /* --- check-in handler --- */

  async function submitCheckIn(krId: string) {
    if (!currentOrg || !checkInValue) return;
    setCheckInSubmitting(true);
    try {
      const numValue = Number(checkInValue);
      if (isNaN(numValue)) throw new Error("Value must be a number");

      const { error: ciError } = await supabase.from("okr_check_ins").insert({
        key_result_id: krId,
        value: numValue,
        confidence_score: checkInConfidence,
        notes: checkInNotes.trim() || null,
        org_id: currentOrg.id,
      } as any);
      if (ciError) throw ciError;

      const { error: krError } = await supabase
        .from("key_results")
        .update({
          current_value: numValue,
          confidence_score: checkInConfidence,
        } as any)
        .eq("id", krId);
      if (krError) throw krError;

      toast.success("Check-in recorded");
      queryClient.invalidateQueries({ queryKey: ["key_results", okrId] });
      queryClient.invalidateQueries({ queryKey: ["okr_check_ins", okrId] });
      setCheckInKrId(null);
      setCheckInValue("");
      setCheckInConfidence(5);
      setCheckInNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit check-in");
    } finally {
      setCheckInSubmitting(false);
    }
  }

  /* --- loading --- */

  if (okrLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest py-12 text-center">Loading...</p>;
  }

  if (!okr) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">OKR not found</p>
        <Link to="/goals" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          &larr; Back to OKRs
        </Link>
      </div>
    );
  }

  /* --- render --- */

  return (
    <div>
      {/* back link */}
      <Link
        to="/goals"
        className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 inline-flex"
      >
        <span>&larr;</span> Back to OKRs
      </Link>

      {/* header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold mb-1">{okr.title}</h1>
        {okr.description && <p className="text-sm text-muted-foreground mb-3">{okr.description}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          {okr.quarter && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-sm px-1.5 py-0.5">
              {okr.quarter}
            </span>
          )}
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-semibold rounded-sm px-1.5 py-0.5",
              STATUS_COLORS[okr.status] ?? "bg-muted text-muted-foreground",
            )}
          >
            {okr.status.replace(/_/g, " ")}
          </span>
          {okr.owner_id && (
            <span className="text-[10px] text-muted-foreground">
              Owner: <span className="font-mono">{okr.owner_id.slice(0, 8)}</span>
            </span>
          )}
        </div>
      </div>

      {/* key results */}
      <div className="mb-8">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Key Results</h2>

        {keyResults.length === 0 ? (
          <p className="text-xs text-muted-foreground">No key results defined for this objective.</p>
        ) : (
          <div className="border border-border rounded-sm divide-y divide-border">
            {keyResults.map((kr) => {
              const pct =
                kr.target_value && kr.target_value > 0
                  ? Math.min(100, Math.round(((kr.current_value ?? 0) / kr.target_value) * 100))
                  : 0;
              const krCheckIns = allCheckIns
                .filter((ci) => ci.key_result_id === kr.id)
                .slice(0, 5);
              const isExpanded = checkInKrId === kr.id;

              return (
                <div key={kr.id} className="px-4 py-3">
                  {/* KR row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm flex-1 min-w-0">{kr.title}</span>

                    {/* progress bar */}
                    <div className="w-28 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-foreground/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* value */}
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {kr.current_value ?? 0} / {kr.target_value ?? "?"}
                      {kr.unit ? ` ${kr.unit}` : ""}
                    </span>

                    {/* confidence badge */}
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider font-semibold rounded-sm px-1.5 py-0.5 shrink-0",
                        confidenceColor(kr.confidence_score),
                      )}
                    >
                      {kr.confidence_score != null ? `${kr.confidence_score}/10` : "--"}
                    </span>

                    {/* status badge */}
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider font-semibold rounded-sm px-1.5 py-0.5 shrink-0",
                        STATUS_COLORS[kr.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {kr.status.replace(/_/g, " ")}
                    </span>

                    {/* check-in toggle */}
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setCheckInKrId(null);
                        } else {
                          setCheckInKrId(kr.id);
                          setCheckInValue("");
                          setCheckInConfidence(kr.confidence_score ?? 5);
                          setCheckInNotes("");
                        }
                      }}
                      className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {isExpanded ? "Cancel" : "+ Check-in"}
                    </button>
                  </div>

                  {/* check-in form (inline) */}
                  {isExpanded && (
                    <div className="mt-3 border border-border rounded-sm p-3 bg-muted/20 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Value</label>
                          <input
                            value={checkInValue}
                            onChange={(e) => setCheckInValue(e.target.value)}
                            type="number"
                            className="w-full border border-border rounded-sm bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                            placeholder={`Current value${kr.unit ? ` (${kr.unit})` : ""}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                            Confidence ({checkInConfidence}/10)
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={checkInConfidence}
                            onChange={(e) => setCheckInConfidence(Number(e.target.value))}
                            className="w-full accent-foreground mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Notes</label>
                          <textarea
                            value={checkInNotes}
                            onChange={(e) => setCheckInNotes(e.target.value)}
                            rows={1}
                            className="w-full border border-border rounded-sm bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
                            placeholder="Optional context"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => submitCheckIn(kr.id)}
                        disabled={!checkInValue || checkInSubmitting}
                        className={cn(
                          "text-xs uppercase tracking-wider font-semibold border rounded-sm px-3 py-1.5 transition-colors",
                          checkInValue
                            ? "border-foreground/20 hover:bg-foreground/5"
                            : "border-border text-muted-foreground cursor-not-allowed",
                        )}
                      >
                        {checkInSubmitting ? "Saving..." : "Submit Check-in"}
                      </button>
                    </div>
                  )}

                  {/* check-in history */}
                  {krCheckIns.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {krCheckIns.map((ci) => (
                        <div key={ci.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="tabular-nums font-semibold">{ci.value}</span>
                          {ci.confidence_score != null && (
                            <span
                              className={cn(
                                "uppercase tracking-wider rounded-sm px-1 py-px",
                                confidenceColor(ci.confidence_score),
                              )}
                            >
                              {ci.confidence_score}/10
                            </span>
                          )}
                          {ci.notes && <span className="truncate max-w-[200px]">{ci.notes}</span>}
                          <span className="ml-auto shrink-0">{relativeTime(ci.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* linked bets */}
      {linkedBets.length > 0 && (
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Linked Bets</h2>
          <div className="border border-border rounded-sm divide-y divide-border">
            {linkedBets.map((bet) => (
              <Link
                key={bet.id}
                to="/decisions"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm flex-1 min-w-0 truncate">{bet.title}</span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold rounded-sm px-1.5 py-0.5 shrink-0",
                    STATUS_COLORS[bet.status] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {bet.status.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
