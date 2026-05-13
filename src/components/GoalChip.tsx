import { useState } from "react";
import { useOrgOKRs, useCreateOKR, useUpdateDecision } from "@/hooks/useOrgData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GoalChipProps {
  betId: string;
  linkedOkrId: string | null;
  linkedOkrTitle: string | null;
  canEdit: boolean;
}

export default function GoalChip({ betId, linkedOkrId, linkedOkrTitle, canEdit }: GoalChipProps) {
  const { data: okrs = [] } = useOrgOKRs();
  const createOKR = useCreateOKR();
  const updateDecision = useUpdateDecision();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(linkedOkrId ?? "");
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalQuarter, setNewGoalQuarter] = useState("");

  const saveLink = async (okrId: string) => {
    try {
      await updateDecision.mutateAsync({ id: betId, linked_okr_id: okrId } as any);
      setEditing(false);
      toast.success("Goal assigned.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to assign goal.", { description: message });
    }
  };

  const createAndLink = async () => {
    const titleClean = newGoalTitle.trim();
    if (!titleClean) {
      toast.error("Goal title is required.");
      return;
    }
    try {
      const okr = await createOKR.mutateAsync({ title: titleClean, quarter: newGoalQuarter.trim() || null });
      await saveLink(okr.id);
      setNewGoalOpen(false);
      setNewGoalTitle("");
      setNewGoalQuarter("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to create goal.", { description: message });
    }
  };

  if (!editing) {
    if (linkedOkrId && linkedOkrTitle) {
      return (
        <button
          type="button"
          onClick={() => canEdit && setEditing(true)}
          disabled={!canEdit}
          className={cn(
            "text-xs text-white/50 mb-1 flex items-center gap-1",
            canEdit && "hover:text-white/80 cursor-pointer",
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
          GOAL: {linkedOkrTitle}
        </button>
      );
    }
    // No goal assigned — show error-code chip
    return (
      <button
        type="button"
        onClick={() => canEdit && setEditing(true)}
        disabled={!canEdit}
        className={cn(
          "mb-1 flex items-center gap-2",
          canEdit && "hover:opacity-80 cursor-pointer",
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-signal-red inline-block animate-pulse shrink-0" />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-mono text-[11px] text-signal-red">ERR_GOAL_MISSING</span>
          <span className="text-xs text-white/60">No goal assigned — {canEdit ? "click to assign" : "ask owner to assign"}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="mb-2 border border-white/20 rounded-sm p-2 bg-black/40 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 border border-white/20 rounded-sm px-2 py-1 text-xs bg-black/60 text-white focus:outline-none focus:ring-1 focus:ring-white/60"
        >
          <option value="" disabled>Select a goal…</option>
          {okrs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}{o.quarter ? ` (${o.quarter})` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => selected && saveLink(selected)}
          disabled={!selected || updateDecision.isPending}
          className="font-mono text-[11px] uppercase tracking-[0.05em] bg-white text-black px-2 py-1 hover:opacity-[0.85] transition-opacity disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setSelected(linkedOkrId ?? ""); }}
          className="text-xs text-white/60 hover:text-white px-1"
        >
          Cancel
        </button>
      </div>
      {!newGoalOpen ? (
        <button
          type="button"
          onClick={() => setNewGoalOpen(true)}
          className="text-[11px] text-white/60 hover:text-white"
        >
          + New goal
        </button>
      ) : (
        <div className="space-y-2 pt-1 border-t border-white/10">
          <input
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="Goal title"
            autoFocus
            className="w-full border border-white/20 rounded-sm px-2 py-1 text-xs bg-black/60 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/60"
          />
          <input
            value={newGoalQuarter}
            onChange={(e) => setNewGoalQuarter(e.target.value)}
            placeholder="Quarter (optional)"
            className="w-full border border-white/20 rounded-sm px-2 py-1 text-xs bg-black/60 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/60"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setNewGoalOpen(false); setNewGoalTitle(""); setNewGoalQuarter(""); }}
              className="text-[11px] text-white/60 hover:text-white px-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createAndLink}
              disabled={createOKR.isPending || updateDecision.isPending}
              className="font-mono text-[11px] uppercase tracking-[0.05em] bg-white text-black px-2 py-1 hover:opacity-[0.85] transition-opacity disabled:opacity-40"
            >
              {createOKR.isPending ? "Creating…" : "Create + assign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
