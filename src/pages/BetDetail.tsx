import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useDecisions, useUpdateDecision } from "@/hooks/useOrgData";
import { useLogActivity } from "@/hooks/useDecisionActivity";
import { useCreateInterruption } from "@/hooks/useInterruptions";
import { useOrgMembers } from "@/hooks/useTeam";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  BetCard,
  isDecisionOwner,
  BET_CATEGORY_OPTIONS,
} from "@/pages/Decisions";
import {
  BET_LIFECYCLE_LABELS,
  type BetLifecycleStatus,
  isClosedBetLifecycle,
} from "@/lib/bet-status";

export default function BetDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: decisions = [], isLoading } = useDecisions();
  const { data: members = [] } = useOrgMembers();
  const updateDecision = useUpdateDecision();
  const logActivity = useLogActivity();
  const createInterruption = useCreateInterruption();
  const { currentRole } = useOrg();
  const { user } = useAuth();

  const canWrite = currentRole === "admin" || currentRole === "pod_lead";
  const canManageOwner = currentRole === "admin" || currentRole === "pod_lead";
  const categories = BET_CATEGORY_OPTIONS as unknown as { key: string; label: string }[];

  const [pendingStatus, setPendingStatus] = useState<{ decisionId: string; newStatus: string; oldStatus: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const { decision, index } = useMemo(() => {
    if (!id) return { decision: null, index: 0 };
    // Index reflects portfolio ordering for the eyebrow label.
    const active = decisions.filter((d) => !isClosedBetLifecycle(d.status));
    const ordered = [...active].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const activeIdx = ordered.findIndex((d) => d.id === id);
    if (activeIdx >= 0) return { decision: ordered[activeIdx], index: activeIdx + 1 };
    const fromAny = decisions.find((d) => d.id === id) ?? null;
    return { decision: fromAny, index: 0 };
  }, [decisions, id]);

  const handleStatusConfirm = async () => {
    if (!pendingStatus) return;
    const note = statusNote.trim();
    try {
      await updateDecision.mutateAsync({
        id: pendingStatus.decisionId,
        status: pendingStatus.newStatus as any,
        state_changed_at: new Date().toISOString(),
        state_change_note: note || null,
      } as any);
      logActivity(pendingStatus.decisionId, "status", pendingStatus.oldStatus, pendingStatus.newStatus);
      toast.success(`Lifecycle updated to ${BET_LIFECYCLE_LABELS[pendingStatus.newStatus as BetLifecycleStatus]}.`);
      setPendingStatus(null);
      setStatusNote("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Status update failed.", { description: message });
    }
  };

  const handleInlineSave = async (id: string, field: string, _oldValue: string, newValue: string) => {
    const payload: any = { id };
    if (field === "capacity_allocated" || field === "capacity_diverted") {
      const num = newValue ? Math.min(100, Math.max(0, parseInt(newValue, 10) || 0)) : 0;
      payload[field] = num;
    } else {
      payload[field] = newValue || null;
    }
    await updateDecision.mutateAsync(payload);
    qc.invalidateQueries({ queryKey: ["decision_activity", id] });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!decision) {
    return (
      <div className="max-w-xl">
        <Link to="/bets" className="text-sm text-gray-700 hover:text-foreground inline-flex items-center gap-1">
          ← All bets
        </Link>
        <p className="text-sm text-gray-500 mt-6">Bet not found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/bets" className="text-sm text-gray-700 hover:text-foreground inline-flex items-center gap-1">
          ← All bets
        </Link>
      </div>
      <div className="eyebrow-mono mb-3">
        {`// BET${index ? ` ${index}` : ""}`}
      </div>
      <BetCard
        d={decision}
        index={index || 1}
        canWrite={canWrite}
        canUpdateStatus={currentRole === "admin" || isDecisionOwner(decision, user)}
        canManageOwner={canManageOwner}
        members={members}
        user={user}
        categories={categories}
        handleInlineSave={handleInlineSave}
        logActivity={logActivity}
        createInterruption={createInterruption}
        updateDecision={updateDecision}
        qc={qc}
        pendingStatus={pendingStatus}
        setPendingStatus={setPendingStatus}
        statusNote={statusNote}
        setStatusNote={setStatusNote}
        handleStatusConfirm={handleStatusConfirm}
      />
    </div>
  );
}
