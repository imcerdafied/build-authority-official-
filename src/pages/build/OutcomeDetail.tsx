import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Outcome = Tables<"outcomes">;

const STATUS_ORDER = ["planned", "in_progress", "shipped", "cancelled"] as const;

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
  cancelled: "bg-muted text-muted-foreground/50 border-border",
};

function formatDate(d: string | null): string {
  if (!d) return "Not set";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Inline editable text field
// ---------------------------------------------------------------------------

function InlineText({
  value,
  onSave,
  variant = "default",
  placeholder = "---",
  multiline = false,
}: {
  value: string;
  onSave: (v: string) => void;
  variant?: "title" | "default";
  placeholder?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          "text-left w-full rounded-sm hover:bg-muted/40 transition-colors px-1 -mx-1",
          variant === "title"
            ? "text-xl font-bold"
            : "text-sm",
          !value && "text-muted-foreground/50 italic",
        )}
      >
        {value || placeholder}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        rows={4}
        className={cn(
          "w-full bg-transparent border border-border rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-foreground transition-colors resize-none",
        )}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={cn(
        "w-full bg-transparent border border-border rounded-sm px-2 py-1.5 focus:outline-none focus:border-foreground transition-colors",
        variant === "title" ? "text-xl font-bold" : "text-sm",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OutcomeDetail() {
  const { outcomeId } = useParams<{ outcomeId: string }>();
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();

  // Fetch outcome
  const {
    data: outcome,
    isLoading,
    isError,
  } = useQuery<Outcome | null>({
    queryKey: ["outcome", outcomeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes")
        .select("*")
        .eq("id", outcomeId!)
        .single();
      if (error) throw error;
      return data as Outcome;
    },
    enabled: !!outcomeId,
  });

  // Fetch linked bet if bet_id is set
  const { data: linkedBet } = useQuery<{
    id: string;
    title: string;
    status: string;
  } | null>({
    queryKey: ["linked-bet", outcome?.bet_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decisions")
        .select("id, title, status")
        .eq("id", outcome!.bet_id!)
        .single();
      if (error) throw error;
      return data as { id: string; title: string; status: string };
    },
    enabled: !!outcome?.bet_id,
  });

  // Generic field update
  const updateField = useMutation({
    mutationFn: async (fields: Partial<Outcome>) => {
      const { error } = await supabase
        .from("outcomes")
        .update(fields)
        .eq("id", outcomeId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outcome", outcomeId] });
      queryClient.invalidateQueries({
        queryKey: ["outcomes", currentOrg?.id],
      });
      toast.success("Updated");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Update failed");
    },
  });

  const handleFieldSave = useCallback(
    (field: string, value: string | number | null) => {
      updateField.mutate({ [field]: value } as any);
    },
    [updateField],
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading...
      </p>
    );
  }

  if (isError || !outcome) {
    return (
      <div>
        <Link
          to="/build"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Outcomes
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Outcome not found.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/build"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-block mb-4"
      >
        &larr; Back to Outcomes
      </Link>

      {/* Title */}
      <div className="mb-6">
        <InlineText
          value={outcome.title}
          variant="title"
          onSave={(v) => handleFieldSave("title", v)}
          placeholder="Untitled Outcome"
        />
      </div>

      {/* Status + confidence row */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {/* Status dropdown */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Status
          </label>
          <select
            value={outcome.status}
            onChange={(e) => handleFieldSave("status", e.target.value)}
            className={cn(
              "text-sm font-semibold px-2.5 py-1 rounded-sm border bg-transparent cursor-pointer focus:outline-none",
              STATUS_COLORS[outcome.status] ?? "border-border text-muted-foreground",
            )}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Confidence
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={outcome.confidence_score ?? 5}
              onChange={(e) =>
                handleFieldSave("confidence_score", Number(e.target.value))
              }
              className="w-24 accent-foreground"
            />
            <span className="text-sm font-medium tabular-nums">
              {outcome.confidence_score ?? "---"}/10
            </span>
          </div>
        </div>

        {/* Target date */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Target Date
          </label>
          <input
            type="date"
            value={outcome.target_date ?? ""}
            onChange={(e) =>
              handleFieldSave("target_date", e.target.value || null)
            }
            className="bg-transparent border border-border rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        {/* Shipped date */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Shipped Date
          </label>
          <input
            type="date"
            value={outcome.shipped_date ?? ""}
            onChange={(e) =>
              handleFieldSave("shipped_date", e.target.value || null)
            }
            className="bg-transparent border border-border rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-foreground transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="text-xs text-muted-foreground block mb-1">
          Description
        </label>
        <InlineText
          value={outcome.description ?? ""}
          onSave={(v) => handleFieldSave("description", v || null)}
          placeholder="Add a description..."
          multiline
        />
      </div>

      {/* Linked Bet card */}
      <div className="mb-6">
        <label className="text-xs text-muted-foreground block mb-2">
          Linked Bet
        </label>
        {linkedBet ? (
          <Link
            to="/decisions"
            className="block border border-border rounded-md p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{linkedBet.title}</span>
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-sm border border-border">
                {linkedBet.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              View in Decisions &rarr;
            </p>
          </Link>
        ) : (
          <div className="border border-dashed rounded-md px-4 py-3">
            <p className="text-xs text-muted-foreground/60">
              No bet linked to this outcome.
            </p>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">
          Notes
        </label>
        <NotesEditor
          value={outcome.notes ?? ""}
          onSave={(v) => handleFieldSave("notes", v || null)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes editor — separate component to avoid re-renders
// ---------------------------------------------------------------------------

function NotesEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(value);
    setDirty(false);
  }, [value]);

  const handleBlur = () => {
    if (dirty && draft !== value) {
      onSave(draft);
      setDirty(false);
    }
  };

  return (
    <textarea
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        setDirty(true);
      }}
      onBlur={handleBlur}
      rows={6}
      placeholder="Add notes..."
      className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors resize-y"
    />
  );
}
