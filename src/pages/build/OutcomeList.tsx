import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Outcome = Tables<"outcomes">;

const STATUS_ORDER = ["in_progress", "planned", "shipped", "cancelled"] as const;
type OutcomeStatus = (typeof STATUS_ORDER)[number];

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  planned: "Planned",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  planned: "bg-muted text-muted-foreground border-border",
  shipped: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground/50 border-border line-through",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-xs font-semibold px-2 py-0.5 rounded-sm border",
        STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "No date set";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface DecisionOption {
  id: string;
  title: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Slide-over panel for creating a new outcome
// ---------------------------------------------------------------------------

function CreateOutcomePanel({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<OutcomeStatus>("planned");
  const [betId, setBetId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [confidence, setConfidence] = useState(5);
  const [betSearch, setBetSearch] = useState("");

  // Fetch active decisions (bets) for linking
  const { data: decisions = [] } = useQuery<DecisionOption[]>({
    queryKey: ["decisions-for-linking", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decisions")
        .select("id, title, status")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DecisionOption[];
    },
    enabled: !!orgId,
  });

  const filteredDecisions = useMemo(() => {
    if (!betSearch.trim()) return decisions;
    const q = betSearch.toLowerCase();
    return decisions.filter((d) => d.title.toLowerCase().includes(q));
  }, [decisions, betSearch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("outcomes").insert({
        org_id: orgId,
        title: title.trim(),
        description: description.trim() || null,
        status,
        bet_id: betId,
        target_date: targetDate || null,
        confidence_score: confidence,
        created_by: user?.id ?? null,
        owner_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outcomes", orgId] });
      toast.success("Outcome created");
      onCreated();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to create outcome");
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-background border-l border-border overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold">
              Create Outcome
            </h2>
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you building?"
                className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional context..."
                className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors resize-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Status
              </label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "text-sm font-semibold px-2.5 py-1 rounded-sm border transition-colors",
                      status === s
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:text-foreground",
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Link to bet */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Link to Bet
              </label>
              <input
                type="text"
                value={betSearch}
                onChange={(e) => setBetSearch(e.target.value)}
                placeholder="Search bets..."
                className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors mb-2"
              />
              <div className="max-h-32 overflow-y-auto border border-border rounded-sm divide-y divide-border">
                <button
                  onClick={() => setBetId(null)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs transition-colors",
                    betId === null
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  None
                </button>
                {filteredDecisions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setBetId(d.id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs transition-colors truncate",
                      betId === d.id
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d.title}
                  </button>
                ))}
                {filteredDecisions.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground/60">
                    No bets found
                  </p>
                )}
              </div>
            </div>

            {/* Target date */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            {/* Confidence */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Confidence Score ({confidence}/10)
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="flex justify-between text-xs text-muted-foreground/60 mt-0.5">
                <span>0</span>
                <span>10</span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || createMutation.isPending}
              className={cn(
                "w-full text-sm font-semibold px-4 py-2.5 rounded-sm transition-colors",
                "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50",
              )}
            >
              {createMutation.isPending ? "Creating..." : "Create Outcome"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OutcomeList() {
  const { currentOrg } = useOrg();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const orgId = currentOrg?.id;

  // Fetch outcomes with linked bet title
  const { data: outcomes = [], isLoading } = useQuery<
    (Outcome & { bet_title?: string | null })[]
  >({
    queryKey: ["outcomes", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("*, decisions(title)")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        bet_title: row.decisions?.title ?? null,
      }));
    },
    enabled: !!orgId,
  });

  // Group by status
  const grouped = useMemo(() => {
    const groups: Record<string, (Outcome & { bet_title?: string | null })[]> = {};
    for (const s of STATUS_ORDER) groups[s] = [];
    for (const o of outcomes) {
      const key = STATUS_ORDER.includes(o.status as OutcomeStatus)
        ? o.status
        : "planned";
      groups[key]?.push(o);
    }
    return groups;
  }, [outcomes]);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading...
      </p>
    );
  }

  const isEmpty = outcomes.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Outcomes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {outcomes.length} outcome{outcomes.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!isEmpty && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm font-semibold text-foreground border border-foreground px-3 py-1.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
          >
            + New Outcome
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !showCreate && (
        <div className="border border-dashed rounded-md px-6 py-14 text-center">
          <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
            You're at the Build altitude. Outcomes are the product improvements
            your team builds to deliver on your bets.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-sm font-semibold text-foreground border border-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors"
          >
            + Create Your First Outcome
          </button>
        </div>
      )}

      {/* Grouped outcome list */}
      {!isEmpty && (
        <div className="space-y-8">
          {STATUS_ORDER.map((statusKey) => {
            const items = grouped[statusKey];
            if (!items || items.length === 0) return null;
            return (
              <section key={statusKey}>
                <h2 className="text-xs font-semibold text-muted-foreground mb-3">
                  {STATUS_LABELS[statusKey]} ({items.length})
                </h2>
                <div className="border rounded-md divide-y divide-border">
                  {items.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => navigate(`/build/${o.id}`)}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-muted/30 transition-colors",
                        statusKey === "cancelled" && "opacity-60",
                      )}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") navigate(`/build/${o.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            statusKey === "cancelled" && "line-through",
                          )}
                        >
                          {o.title}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {o.bet_title && (
                          <Link
                            to="/decisions"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Bet: {o.bet_title}
                          </Link>
                        )}
                        {o.owner_id && (
                          <span className="text-xs text-muted-foreground">
                            Owner: {o.owner_id.slice(0, 8)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(o.target_date)}
                        </span>
                        {o.confidence_score !== null && (
                          <span className="text-xs text-muted-foreground">
                            Confidence: {o.confidence_score}/10
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Slide-over */}
      {showCreate && orgId && (
        <CreateOutcomePanel
          orgId={orgId}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
