import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useInitiatives,
  useAddInitiative,
  useUpdateInitiative,
  useDeleteInitiative,
} from "@/hooks/useInitiatives";
import { useOrgMembers, type OrgMember } from "@/hooks/useTeam";
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

function memberDisplay(m: OrgMember): string {
  return m.display_name?.trim() || m.email || "Unknown member";
}

/**
 * Resolve the owner label for an initiative.
 * Prefers the live member display_name (so renames propagate everywhere),
 * falls back to the text snapshot we wrote at the time of selection, and
 * finally to any free-text owner that was never tied to a member.
 */
function resolveOwnerLabel(
  init: Pick<BetInitiative, "owner" | "owner_user_id">,
  memberById: Map<string, OrgMember>,
): string | null {
  if (init.owner_user_id) {
    const member = memberById.get(init.owner_user_id);
    if (member) return memberDisplay(member);
  }
  return init.owner?.trim() || null;
}

interface KeyInitiativesSectionProps {
  betId: string;
  canWrite: boolean;
}

export default function KeyInitiativesSection({ betId, canWrite }: KeyInitiativesSectionProps) {
  const { data: initiatives = [], isLoading } = useInitiatives(betId);
  const { data: members = [] } = useOrgMembers();
  const addInit = useAddInitiative(betId);
  const updateInit = useUpdateInitiative(betId);
  const deleteInit = useDeleteInitiative(betId);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members],
  );

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
                members={members}
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
                ownerLabel={resolveOwnerLabel(init, memberById)}
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
          members={members}
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
  ownerLabel,
  canWrite,
  onEdit,
}: {
  initiative: BetInitiative;
  ownerLabel: string | null;
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
        {ownerLabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{ownerLabel}</p>
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
  members,
  onSave,
  onCancel,
  onDelete,
  saving,
  deleting,
}: {
  initiative: BetInitiative;
  members: OrgMember[];
  onSave: (updates: {
    description: string;
    owner: string | null;
    owner_user_id: string | null;
    status: InitiativeStatus;
  }) => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  saving: boolean;
  deleting: boolean;
}) {
  const [description, setDescription] = useState(initiative.description);
  // Owner mode is "custom" only when the saved owner is a free-text snapshot
  // with no FK — every member-backed initiative defaults to the member picker.
  const initialMode: "member" | "custom" = initiative.owner_user_id || !initiative.owner ? "member" : "custom";
  const [ownerMode, setOwnerMode] = useState<"member" | "custom">(initialMode);
  const [ownerUserId, setOwnerUserId] = useState<string>(initiative.owner_user_id ?? "");
  const [ownerCustom, setOwnerCustom] = useState<string>(
    !initiative.owner_user_id ? initiative.owner ?? "" : "",
  );
  const [status, setStatus] = useState<InitiativeStatus>(normalizeStatus(initiative.status));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Description is required.");
      return;
    }
    const ownerFields = resolveOwnerFields(ownerMode, ownerUserId, ownerCustom, members);
    await onSave({
      description: trimmed,
      ...ownerFields,
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
        <OwnerPicker
          mode={ownerMode}
          onModeChange={setOwnerMode}
          ownerUserId={ownerUserId}
          onOwnerUserIdChange={setOwnerUserId}
          ownerCustom={ownerCustom}
          onOwnerCustomChange={setOwnerCustom}
          members={members}
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
  members,
  onSave,
  onCancel,
  saving,
}: {
  members: OrgMember[];
  onSave: (payload: {
    description: string;
    owner: string | null;
    owner_user_id: string | null;
    status: InitiativeStatus;
  }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [description, setDescription] = useState("");
  const [ownerMode, setOwnerMode] = useState<"member" | "custom">("member");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [ownerCustom, setOwnerCustom] = useState<string>("");
  const [status, setStatus] = useState<InitiativeStatus>("active");

  const submit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Description is required.");
      return;
    }
    const ownerFields = resolveOwnerFields(ownerMode, ownerUserId, ownerCustom, members);
    await onSave({
      description: trimmed,
      ...ownerFields,
      status,
    });
    setDescription("");
    setOwnerMode("member");
    setOwnerUserId("");
    setOwnerCustom("");
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
        <OwnerPicker
          mode={ownerMode}
          onModeChange={setOwnerMode}
          ownerUserId={ownerUserId}
          onOwnerUserIdChange={setOwnerUserId}
          ownerCustom={ownerCustom}
          onOwnerCustomChange={setOwnerCustom}
          members={members}
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

// === Owner picker (shared by Add + Edit) ===

function OwnerPicker({
  mode,
  onModeChange,
  ownerUserId,
  onOwnerUserIdChange,
  ownerCustom,
  onOwnerCustomChange,
  members,
}: {
  mode: "member" | "custom";
  onModeChange: (m: "member" | "custom") => void;
  ownerUserId: string;
  onOwnerUserIdChange: (v: string) => void;
  ownerCustom: string;
  onOwnerCustomChange: (v: string) => void;
  members: OrgMember[];
}) {
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        memberDisplay(a).localeCompare(memberDisplay(b), undefined, { sensitivity: "base" }),
      ),
    [members],
  );

  if (mode === "member") {
    return (
      <div className="flex flex-col gap-1">
        <select
          value={ownerUserId}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              onModeChange("custom");
              return;
            }
            onOwnerUserIdChange(e.target.value);
          }}
          className="text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">Unassigned</option>
          {sortedMembers.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {memberDisplay(m)}
            </option>
          ))}
          <option value="__custom__">Custom name…</option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={ownerCustom}
        onChange={(e) => onOwnerCustomChange(e.target.value)}
        placeholder="Owner name (off-platform)"
        autoFocus
        className="text-sm border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
      />
      <button
        type="button"
        onClick={() => {
          onModeChange("member");
          onOwnerCustomChange("");
        }}
        className="text-xs text-muted-foreground hover:text-foreground self-start"
      >
        ← Pick a workspace member instead
      </button>
    </div>
  );
}

/**
 * Translate the picker UI state into the two DB columns.
 * Member selected   → owner_user_id + owner snapshot of display_name.
 * Custom text       → owner text only, owner_user_id null.
 * Nothing chosen    → both null.
 */
function resolveOwnerFields(
  mode: "member" | "custom",
  ownerUserId: string,
  ownerCustom: string,
  members: OrgMember[],
): { owner: string | null; owner_user_id: string | null } {
  if (mode === "member") {
    if (!ownerUserId) return { owner: null, owner_user_id: null };
    const member = members.find((m) => m.user_id === ownerUserId);
    return {
      owner: member ? memberDisplay(member) : null,
      owner_user_id: ownerUserId,
    };
  }
  const trimmed = ownerCustom.trim();
  return {
    owner: trimmed || null,
    owner_user_id: null,
  };
}
