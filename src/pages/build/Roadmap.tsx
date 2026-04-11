import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type RoadmapItem = Tables<"roadmap_items">;
type Outcome = Tables<"outcomes">;

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  planned: "bg-muted text-muted-foreground border-border",
  shipped: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground/50 border-border",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  planned: "Planned",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

// ---------------------------------------------------------------------------
// Quarter helpers
// ---------------------------------------------------------------------------

function currentQuarter(): { year: number; q: number } {
  const now = new Date();
  return { year: now.getFullYear(), q: Math.ceil((now.getMonth() + 1) / 3) };
}

function nextQuarters(count: number): string[] {
  const { year, q } = currentQuarter();
  const quarters: string[] = [];
  let y = year;
  let qn = q;
  for (let i = 0; i < count; i++) {
    quarters.push(`${y}-Q${qn}`);
    qn++;
    if (qn > 4) {
      qn = 1;
      y++;
    }
  }
  return quarters;
}

function quarterLabel(qKey: string): string {
  // "2026-Q2" -> "2026 Q2"
  return qKey.replace("-", " ");
}

function dateToQuarter(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-Q${q}`;
}

// ---------------------------------------------------------------------------
// Unified item type for display
// ---------------------------------------------------------------------------

interface DisplayItem {
  id: string;
  title: string;
  status: string;
  type: "roadmap" | "outcome";
  quarter: string;
}

// ---------------------------------------------------------------------------
// Add item form
// ---------------------------------------------------------------------------

function AddItemForm({
  quarter,
  orgId,
  onDone,
}: {
  quarter: string;
  orgId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("roadmap_items").insert({
        org_id: orgId,
        title: title.trim(),
        quarter,
        status: "planned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", orgId] });
      toast.success("Item added");
      setTitle("");
      onDone();
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to add item");
    },
  });

  return (
    <div className="border border-border rounded-sm p-2 mt-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Item title..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) createMutation.mutate();
          if (e.key === "Escape") onDone();
        }}
        className="w-full bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground/40"
      />
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={() => createMutation.mutate()}
          disabled={!title.trim() || createMutation.isPending}
          className="text-xs font-semibold px-2 py-1 rounded-sm bg-foreground text-background disabled:opacity-50"
        >
          Add
        </button>
        <button
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single item card
// ---------------------------------------------------------------------------

function ItemCard({
  item,
  quarters,
  orgId,
}: {
  item: DisplayItem;
  quarters: string[];
  orgId: string;
}) {
  const queryClient = useQueryClient();

  const moveItem = useMutation({
    mutationFn: async (newQuarter: string) => {
      if (item.type === "roadmap") {
        const { error } = await supabase
          .from("roadmap_items")
          .update({ quarter: newQuarter })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        // For outcomes, we compute a target_date in the middle of the target quarter
        const [yearStr, qStr] = newQuarter.split("-Q");
        const qn = parseInt(qStr, 10);
        const year = parseInt(yearStr, 10);
        const monthStart = (qn - 1) * 3; // 0-indexed
        // Set to the 15th of the second month of the quarter
        const targetDate = new Date(year, monthStart + 1, 15)
          .toISOString()
          .slice(0, 10);
        const { error } = await supabase
          .from("outcomes")
          .update({ target_date: targetDate })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", orgId] });
      queryClient.invalidateQueries({
        queryKey: ["roadmap-outcomes", orgId],
      });
      toast.success("Moved");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Move failed");
    },
  });

  return (
    <div className="border border-border rounded-sm p-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded-sm border",
            item.type === "outcome"
              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          {item.type === "outcome" ? "Outcome" : "Roadmap"}
        </span>
        <span
          className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded-sm border",
            STATUS_COLORS[item.status] ?? "bg-muted text-muted-foreground border-border",
          )}
        >
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
      <p className="text-sm font-medium mb-2">{item.title}</p>
      <select
        value={item.quarter}
        onChange={(e) => moveItem.mutate(e.target.value)}
        className="text-xs bg-transparent border border-border rounded-sm px-1.5 py-0.5 text-muted-foreground focus:outline-none focus:border-foreground cursor-pointer transition-colors"
      >
        {quarters.map((qk) => (
          <option key={qk} value={qk}>
            {quarterLabel(qk)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Roadmap() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const quarters = useMemo(() => nextQuarters(4), []);

  const [addingToQuarter, setAddingToQuarter] = useState<string | null>(null);

  // Fetch roadmap items
  const { data: roadmapItems = [], isLoading: riLoading } = useQuery<
    RoadmapItem[]
  >({
    queryKey: ["roadmap-items", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoadmapItem[];
    },
    enabled: !!orgId,
  });

  // Fetch outcomes with target_date
  const { data: outcomes = [], isLoading: oLoading } = useQuery<Outcome[]>({
    queryKey: ["roadmap-outcomes", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("*")
        .eq("org_id", orgId!)
        .not("target_date", "is", null)
        .order("target_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Outcome[];
    },
    enabled: !!orgId,
  });

  // Build display items grouped by quarter
  const columnData = useMemo(() => {
    const map: Record<string, DisplayItem[]> = {};
    for (const q of quarters) map[q] = [];

    // Roadmap items
    for (const ri of roadmapItems) {
      const qk = ri.quarter;
      if (qk && map[qk]) {
        map[qk].push({
          id: ri.id,
          title: ri.title,
          status: ri.status,
          type: "roadmap",
          quarter: qk,
        });
      }
    }

    // Outcomes
    for (const o of outcomes) {
      const qk = dateToQuarter(o.target_date!);
      if (qk && map[qk]) {
        map[qk].push({
          id: o.id,
          title: o.title,
          status: o.status,
          type: "outcome",
          quarter: qk,
        });
      }
    }

    return map;
  }, [quarters, roadmapItems, outcomes]);

  const isLoading = riLoading || oLoading;

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading...
      </p>
    );
  }

  const totalItems = Object.values(columnData).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">Roadmap</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalItems} item{totalItems !== 1 ? "s" : ""} across {quarters.length}{" "}
          quarters
        </p>
      </div>

      {/* Quarter columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quarters.map((qk) => {
          const items = columnData[qk] ?? [];
          return (
            <div key={qk} className="border border-border rounded-md">
              {/* Column header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {quarterLabel(qk)}
                </h2>
                <span className="text-xs text-muted-foreground/60 tabular-nums">
                  {items.length}
                </span>
              </div>

              {/* Items */}
              <div className="p-3 space-y-2 min-h-[120px]">
                {items.length === 0 && addingToQuarter !== qk && (
                  <p className="text-xs text-muted-foreground/40 text-center py-4">
                    No items
                  </p>
                )}
                {items.map((item) => (
                  <ItemCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    quarters={quarters}
                    orgId={orgId!}
                  />
                ))}

                {/* Add item */}
                {addingToQuarter === qk ? (
                  <AddItemForm
                    quarter={qk}
                    orgId={orgId!}
                    onDone={() => setAddingToQuarter(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingToQuarter(qk)}
                    className="w-full text-xs text-muted-foreground/60 hover:text-foreground border border-dashed border-border rounded-sm py-2 transition-colors"
                  >
                    + Add Item
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
