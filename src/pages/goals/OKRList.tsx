import { useState, useMemo } from "react";
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
  unit: string | null;
  status: string;
  okr_id: string;
}

interface KRDraft {
  title: string;
  metric_type: string;
  target_value: string;
  unit: string;
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

const METRIC_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Boolean" },
];

function buildQuarterOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const options: string[] = [];
  for (let i = 0; i < 4; i++) {
    const totalQ = q + i;
    const y = year + Math.floor((totalQ - 1) / 4);
    const qn = ((totalQ - 1) % 4) + 1;
    options.push(`${y}-Q${qn}`);
  }
  return options;
}

function emptyKR(): KRDraft {
  return { title: "", metric_type: "percentage", target_value: "", unit: "" };
}

/* ---------- component ---------- */

export default function OKRList() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();

  const [expandedOkrId, setExpandedOkrId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  /* --- form state --- */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quarter, setQuarter] = useState(buildQuarterOptions()[0]);
  const [keyResults, setKeyResults] = useState<KRDraft[]>([emptyKR()]);
  const [submitting, setSubmitting] = useState(false);

  /* --- queries --- */

  const { data: okrs = [], isLoading } = useQuery<OKR[]>({
    queryKey: ["okrs", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("okrs")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OKR[];
    },
    enabled: !!currentOrg,
  });

  const { data: allKeyResults = [] } = useQuery<KeyResult[]>({
    queryKey: ["key_results_all", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("key_results")
        .select("*")
        .eq("org_id", currentOrg.id);
      if (error) throw error;
      return (data ?? []) as KeyResult[];
    },
    enabled: !!currentOrg,
  });

  /* --- derived data --- */

  const krByOkr = useMemo(() => {
    const map = new Map<string, KeyResult[]>();
    for (const kr of allKeyResults) {
      const list = map.get(kr.okr_id) ?? [];
      list.push(kr);
      map.set(kr.okr_id, list);
    }
    return map;
  }, [allKeyResults]);

  const grouped = useMemo(() => {
    const map = new Map<string, OKR[]>();
    for (const okr of okrs) {
      const key = okr.quarter ?? "No Quarter";
      const list = map.get(key) ?? [];
      list.push(okr);
      map.set(key, list);
    }
    // sort quarter keys descending
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [okrs]);

  /* --- helpers --- */

  function krSummary(okrId: string): string {
    const krs = krByOkr.get(okrId) ?? [];
    if (krs.length === 0) return "No key results";
    const onTrack = krs.filter((kr) => kr.status === "on_track").length;
    return `${onTrack} of ${krs.length} key results on track`;
  }

  /* --- create handler --- */

  async function handleCreate() {
    if (!currentOrg || !title.trim()) return;
    setSubmitting(true);
    try {
      const { data: okrData, error: okrError } = await supabase
        .from("okrs")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          quarter,
          org_id: currentOrg.id,
        } as any)
        .select("id")
        .single();

      if (okrError) throw okrError;

      const okrId = (okrData as any).id;

      const validKRs = keyResults.filter((kr) => kr.title.trim());
      if (validKRs.length > 0) {
        const { error: krError } = await supabase.from("key_results").insert(
          validKRs.map((kr) => ({
            title: kr.title.trim(),
            metric_type: kr.metric_type,
            target_value: kr.target_value ? Number(kr.target_value) : null,
            unit: kr.unit.trim() || null,
            okr_id: okrId,
            org_id: currentOrg.id,
          })) as any,
        );
        if (krError) throw krError;
      }

      toast.success("OKR created");
      queryClient.invalidateQueries({ queryKey: ["okrs"] });
      queryClient.invalidateQueries({ queryKey: ["key_results_all"] });
      resetForm();
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create OKR");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setQuarter(buildQuarterOptions()[0]);
    setKeyResults([emptyKR()]);
  }

  function updateKR(index: number, field: keyof KRDraft, value: string) {
    setKeyResults((prev) => prev.map((kr, i) => (i === index ? { ...kr, [field]: value } : kr)));
  }

  function removeKR(index: number) {
    setKeyResults((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  /* --- loading / empty --- */

  if (isLoading) {
    return <p className="text-xs text-muted-foreground uppercase tracking-widest py-12 text-center">Loading...</p>;
  }

  if (okrs.length === 0 && !showCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground max-w-md leading-relaxed">
          The Goals altitude is where you define what matters most. OKRs connect your strategic objectives to measurable key results
          so the entire organization stays aligned.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs uppercase tracking-wider font-semibold border border-foreground/20 rounded-sm px-4 py-2 hover:bg-foreground/5 transition-colors"
        >
          + Create Your First OKR
        </button>

        {/* slide-over rendered even in empty state */}
        {showCreate && <CreatePanel />}
      </div>
    );
  }

  /* --- create panel (slide-over) --- */

  function CreatePanel() {
    return (
      <>
        {/* backdrop */}
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowCreate(false)} />

        {/* panel */}
        <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-background border-l border-border z-50 overflow-y-auto shadow-xl animate-in slide-in-from-right duration-200">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider">Create OKR</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                aria-label="Close panel"
              >
                &times;
              </button>
            </div>

            {/* objective title */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Objective Title <span className="text-signal-red">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-border rounded-sm bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="e.g. Expand enterprise market share"
              />
            </div>

            {/* description */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-border rounded-sm bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
                placeholder="Optional context for this objective"
              />
            </div>

            {/* quarter */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full border border-border rounded-sm bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                {buildQuarterOptions().map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* key results */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Key Results</label>
              <div className="space-y-3">
                {keyResults.map((kr, i) => (
                  <div key={i} className="border border-border rounded-sm p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">KR {i + 1}</span>
                      {keyResults.length > 1 && (
                        <button
                          onClick={() => removeKR(i)}
                          className="text-[10px] text-muted-foreground hover:text-signal-red uppercase tracking-wider"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      value={kr.title}
                      onChange={(e) => updateKR(i, "title", e.target.value)}
                      className="w-full border border-border rounded-sm bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                      placeholder="Key result title"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={kr.metric_type}
                        onChange={(e) => updateKR(i, "metric_type", e.target.value)}
                        className="border border-border rounded-sm bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                      >
                        {METRIC_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={kr.target_value}
                        onChange={(e) => updateKR(i, "target_value", e.target.value)}
                        className="border border-border rounded-sm bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                        placeholder="Target"
                        type="number"
                      />
                      <input
                        value={kr.unit}
                        onChange={(e) => updateKR(i, "unit", e.target.value)}
                        className="border border-border rounded-sm bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                        placeholder="Unit (e.g. %)"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setKeyResults((prev) => [...prev, emptyKR()])}
                className="mt-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground"
              >
                + Add Key Result
              </button>
            </div>

            {/* actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || submitting}
                className={cn(
                  "text-xs uppercase tracking-wider font-semibold border rounded-sm px-4 py-2 transition-colors",
                  title.trim()
                    ? "border-foreground/20 hover:bg-foreground/5"
                    : "border-border text-muted-foreground cursor-not-allowed",
                )}
              >
                {submitting ? "Creating..." : "Create OKR"}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreate(false);
                }}
                className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* --- main render --- */

  return (
    <div>
      {/* header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">OKRs</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">{okrs.length} objectives</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs uppercase tracking-wider font-semibold border border-foreground/20 rounded-sm px-3 py-1.5 hover:bg-foreground/5 transition-colors"
          >
            + New OKR
          </button>
        </div>
      </div>

      {/* grouped by quarter */}
      <div className="space-y-6">
        {grouped.map(([quarterLabel, items]) => (
          <div key={quarterLabel}>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{quarterLabel}</h2>
            <div className="border border-border rounded-sm divide-y divide-border">
              {items.map((okr) => {
                const expanded = expandedOkrId === okr.id;
                const krs = krByOkr.get(okr.id) ?? [];

                return (
                  <div key={okr.id}>
                    {/* OKR row */}
                    <div className="flex items-center gap-3 px-4 py-3 group">
                      {/* expand toggle */}
                      <button
                        onClick={() => setExpandedOkrId(expanded ? null : okr.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label={expanded ? "Collapse key results" : "Expand key results"}
                      >
                        <svg
                          className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-90")}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* title + link */}
                      <Link
                        to={`/goals/${okr.id}`}
                        className="flex-1 min-w-0 text-sm font-medium hover:underline truncate"
                      >
                        {okr.title}
                      </Link>

                      {/* quarter badge */}
                      {okr.quarter && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 shrink-0">
                          {okr.quarter}
                        </span>
                      )}

                      {/* status badge */}
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider font-semibold rounded-sm px-1.5 py-0.5 shrink-0",
                          STATUS_COLORS[okr.status] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {okr.status.replace(/_/g, " ")}
                      </span>

                      {/* KR summary */}
                      <span className="text-[10px] text-muted-foreground hidden md:inline shrink-0">{krSummary(okr.id)}</span>
                    </div>

                    {/* expanded key results */}
                    {expanded && (
                      <div className="bg-muted/30 border-t border-border px-4 py-3">
                        {krs.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No key results yet</p>
                        ) : (
                          <div className="space-y-2">
                            {krs.map((kr) => {
                              const pct =
                                kr.target_value && kr.target_value > 0
                                  ? Math.min(100, Math.round(((kr.current_value ?? 0) / kr.target_value) * 100))
                                  : 0;

                              return (
                                <div key={kr.id} className="flex items-center gap-3">
                                  <span className="text-xs flex-1 min-w-0 truncate">{kr.title}</span>
                                  <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
                                    <div
                                      className="h-full bg-foreground/60 rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-14 text-right">
                                    {kr.current_value ?? 0} / {kr.target_value ?? "?"}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] uppercase tracking-wider font-semibold rounded-sm px-1.5 py-0.5 shrink-0",
                                      STATUS_COLORS[kr.status] ?? "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {kr.status.replace(/_/g, " ")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* slide-over */}
      {showCreate && <CreatePanel />}
    </div>
  );
}
