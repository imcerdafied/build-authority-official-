import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useInitiatives,
  useAddInitiative,
  useUpdateInitiative,
  useDeleteInitiative,
} from "@/hooks/useInitiatives";
import type { BetInitiative, InitiativeStatus } from "@/lib/types";

const STATUS_ORDER: InitiativeStatus[] = ["proposed", "active", "shipped", "paused"];

const STATUS_LABEL: Record<InitiativeStatus, string> = {
  proposed: "Proposed",
  active: "Active",
  shipped: "Shipped",
  paused: "Paused",
};

const STATUS_STYLE: Record<InitiativeStatus, { dot: string; pill: string }> = {
  proposed: { dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
  active: { dot: "bg-accent", pill: "bg-accent/15 text-accent" },
  shipped: { dot: "bg-signal-green", pill: "bg-signal-green/15 text-signal-green" },
  paused: { dot: "bg-signal-amber", pill: "bg-signal-amber/15 text-signal-amber" },
};

function normalizeStatus(raw: string | null | undefined): InitiativeStatus {
  if (raw && (STATUS_ORDER as string[]).includes(raw)) return raw as InitiativeStatus;
  return "active";
}

interface KeyInitiativesSectionProps {
  betId: string;
  canWrite: boolean;
}

export default function KeyInitiativesSection({ betId, canWrite }: KeyInitiativesSectionProps) {
  const { data: initiatives = [], isLoading } = useInitiatives(betId);
  const addInit = useAddInitiative(betId);
  const updateInit = useUpdateInitiative(betId);
  const deleteInit = useDeleteInitiative(betId);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div>
      {initiatives.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          No initiatives logged yet.
          {canWrite && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-foreground font-medium hover:underline"
              >
                + Log the first one
              </button>
            </>
          )}
        </p>
      )}

      {initiatives.length > 0 && (
        <ul className="space-y-2">
          {initiatives.map((init) =>
            editingId === init.id ? (
              <InitiativeEditRow
                key={init.id}
                initiative={init}
                onSave={async (updates) => {
                  try {
                    await updateInit.mutateAsync({ id: init.id, ...updates });
                    setEditingId(null);
                  } catch {
                    toast.error("Update failed — try again.");
                  }
                }}
                onCancel={() => setEditingId(null)}
                onDelete={async () => {
                  try {
                    await deleteInit.mutateAsync(init.id);
                    setEditingId(null);
                  } catch {
                    toast.error("Delete failed — try again.");
                  }
                }}
                saving={updateInit.isPending}
                deleting={deleteInit.isPending}
              />
            ) : (
              <InitiativeReadRow
                key={init.id}
                initiative={init}
                canWrite={canWrite}
                onEdit={() => setEditingId(init.id)}
              />
            ),
          )}
        </ul>
      )}

      {canWrite && initiatives.length > 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          + Log initiative
        </button>
      )}

      {adding && (
        <InitiativeAddRow
          onSave={async (payload) => {
            try {
              await addInit.mutateAsync(payload);
              setAdding(false);
            } catch {
              toast.error("Add failed — try again.");
            }
          }}
          onCancel={() => setAdding(false)}
          saving={addInit.isPending}
        />
      )}
    </div>
  );
}

// === Read row ===

function InitiativeReadRow({
  initiative,
  canWrite,
  onEdit,
}: {
  initiative: BetInitiative;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const status = normalizeStatus(initiative.status);
  const style = STATUS_STYLE[status];
  return (
    <li className="grid grid-cols-[auto_1fr_auto] gap-3 items-start py-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 mt-0.5 shrink-0",
          "font-mono text-[10px] uppercase tracking-[0.05em]",
          style.pill,
        )}
      >
        <span className={cn("w-1 h-1 rounded-full inline-block shrink-0", style.dot)} aria-hidden />
        {STATUS_LABEL[status]}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-foreground leading-snug">{initiative.description}</p>
        {initiative.owner && (
          <p className="text-xs text-muted-foreground mt-0.5">{initiative.owner}</p>
        )}
      </div>
      {canWrite && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Edit
        </button>
      )}
    </li>
  );
}

// === Edit row ===

function InitiativeEditRow({
  initiative,
  onSave,
  onCancel,
  onDelete,
  saving,
  deleting,
}: {
  initiative: BetInitiative;
  onSave: (updates: { description: string; owner: string | null; status: InitiativeStatus }) => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  saving: boolean;
  deleting: boolean;
}) {
  const [description, setDescription] = useState(initiative.description);
  const [owner, setOwner] = useState(initiative.owner ?? "");
  const [status, setStatus] = useState<InitiativeStatus>(normalizeStatus(initiative.status));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Description is required.");
      return;
    }
    await onSave({
      description: trimmed,
      owner: owner.trim() || null,
      status,
    });
  };

  return (
    <li className="border border-border rounded-[2px] p-3 space-y-3 bg-muted/30" style={{ borderWidth: "0.5px" }}>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="What is the team doing?"
        className="w-full text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Owner (optional)"
          className="text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InitiativeStatus)}
          className="text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="text-sm font-medium bg-foreground text-background px-3 py-1.5 rounded-sm hover:opacity-[0.85] transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-muted-foreground hover:text-signal-red transition-colors"
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-xs font-medium text-signal-red hover:underline"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

// === Add row ===

function InitiativeAddRow({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (payload: { description: string; owner: string | null; status: InitiativeStatus }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<InitiativeStatus>("active");

  const submit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Description is required.");
      return;
    }
    await onSave({
      description: trimmed,
      owner: owner.trim() || null,
      status,
    });
    setDescription("");
    setOwner("");
    setStatus("active");
  };

  return (
    <div className="mt-4 border border-border rounded-[2px] p-3 space-y-3 bg-muted/30" style={{ borderWidth: "0.5px" }}>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        autoFocus
        placeholder="What is the team doing in service of this bet?"
        className="w-full text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Owner (optional)"
          className="text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InitiativeStatus)}
          className="text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="text-sm font-medium bg-foreground text-background px-3 py-1.5 rounded-sm hover:opacity-[0.85] transition-opacity disabled:opacity-40"
        >
          {saving ? "Adding…" : "Add initiative"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
