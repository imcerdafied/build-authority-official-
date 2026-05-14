import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDecisions, useUpdateDecision, useOrgOKRs, useCreateOKR } from "@/hooks/useOrgData";
import { useLogActivity, useDecisionActivity } from "@/hooks/useDecisionActivity";
import { useOrgMembers } from "@/hooks/useTeam";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  InlineEdit,
  CategorySelect,
  OwnerAccountSelect,
  isDecisionOwner,
  BET_CATEGORY_OPTIONS,
} from "@/pages/Decisions";
import {
  BET_LIFECYCLE_LABELS,
  BET_LIFECYCLE_STATUSES,
  type BetLifecycleStatus,
  isClosedBetLifecycle,
} from "@/lib/bet-status";
import { extractMagnitude, movementState } from "@/lib/bet-magnitude";
import MetricsSidebar from "@/components/MetricsSidebar";
import ScoreHistory from "@/components/ScoreHistory";
import DriftIndicators from "@/components/DriftIndicators";
import { cn } from "@/lib/utils";

function nudgeMailto(betTitle: string, days: number, owner: string): string {
  const subject = encodeURIComponent(`Authority: ${betTitle} needs attention`);
  const body = encodeURIComponent(
    `${betTitle} has had no movement in ${days} days.\nOwner: ${owner}\n\nPlease update your bet at https://buildauthorityos.com/bets`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export default function BetDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: decisions = [], isLoading } = useDecisions();
  const { data: members = [] } = useOrgMembers();
  const { data: okrs = [] } = useOrgOKRs();
  const createOKR = useCreateOKR();
  const updateDecision = useUpdateDecision();
  const logActivity = useLogActivity();
  const { currentRole } = useOrg();
  const { user } = useAuth();

  const categories = BET_CATEGORY_OPTIONS as unknown as { key: string; label: string }[];
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const decision = useMemo(() => {
    if (!id) return null;
    return decisions.find((d) => d.id === id) ?? null;
  }, [decisions, id]);

  const canUpdateStatus = !!decision && (currentRole === "admin" || isDecisionOwner(decision, user));

  // Lifecycle confirmation state
  const [pendingStatus, setPendingStatus] = useState<{ newStatus: string; oldStatus: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");

  // Goal picker state
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalQuarter, setNewGoalQuarter] = useState("");
  const [pickerSelected, setPickerSelected] = useState("");

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

  const handleLifecycleChange = (next: BetLifecycleStatus) => {
    if (!decision || !canUpdateStatus) return;
    if (next === decision.status) return;
    setPendingStatus({ newStatus: next, oldStatus: decision.status });
  };

  const handleStatusConfirm = async () => {
    if (!pendingStatus || !decision) return;
    const note = statusNote.trim();
    try {
      await updateDecision.mutateAsync({
        id: decision.id,
        status: pendingStatus.newStatus as any,
        state_changed_at: new Date().toISOString(),
        state_change_note: note || null,
      } as any);
      logActivity(decision.id, "status", pendingStatus.oldStatus, pendingStatus.newStatus);
      toast.success(`Lifecycle updated to ${BET_LIFECYCLE_LABELS[pendingStatus.newStatus as BetLifecycleStatus]}.`);
      setPendingStatus(null);
      setStatusNote("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Status update failed.", { description: message });
    }
  };

  const handleAssignGoal = async (okrId: string) => {
    if (!decision) return;
    try {
      await updateDecision.mutateAsync({ id: decision.id, linked_okr_id: okrId } as any);
      setGoalPickerOpen(false);
      setPickerSelected("");
      toast.success("Goal assigned.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to assign goal.", { description: message });
    }
  };

  const handleCreateAndAssignGoal = async () => {
    const titleClean = newGoalTitle.trim();
    if (!titleClean) {
      toast.error("Goal title is required.");
      return;
    }
    try {
      const okr = await createOKR.mutateAsync({
        title: titleClean,
        quarter: newGoalQuarter.trim() || null,
      });
      await handleAssignGoal(okr.id);
      setNewGoalOpen(false);
      setNewGoalTitle("");
      setNewGoalQuarter("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to create goal.", { description: message });
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!decision) {
    return (
      <div className="max-w-4xl">
        <Link to="/bets" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          ← All bets
        </Link>
        <p className="text-sm text-muted-foreground mt-6">Bet not found.</p>
      </div>
    );
  }

  // Compute issues
  const move = movementState(decision.updated_at, decision.created_at);
  const issues: Array<{ code: string; desc: string; action?: React.ReactNode }> = [];
  if (!decision.linked_okr_id) {
    issues.push({
      code: "ERR_GOAL_MISSING",
      desc: "No goal assigned.",
      action: canWrite ? (
        <button
          onClick={() => setGoalPickerOpen(true)}
          className="text-sm font-medium text-foreground hover:underline transition-colors"
        >
          Assign goal →
        </button>
      ) : null,
    });
  }
  if (move.tier === "red") {
    issues.push({
      code: "ERR_NO_MOVEMENT",
      desc: `No movement in ${move.days} days.`,
      action: (
        <a
          href={nudgeMailto(decision.title ?? "Untitled", move.days, decision.owner ?? "")}
          className="text-sm font-medium text-foreground hover:underline transition-colors"
        >
          Nudge owner →
        </a>
      ),
    });
  }

  const upside = extractMagnitude(decision.exposure_value);
  const risk = extractMagnitude(decision.revenue_at_risk);

  return (
    <div className="max-w-4xl">
      {/* Back link — subtle, page-edge aligned */}
      <Link
        to="/bets"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-8"
      >
        ← All bets
      </Link>

      {/* Title — H1, no container, no numbering */}
      <h1 className="mb-8">
        <InlineEdit
          value={decision.title ?? ""}
          field="title"
          decisionId={decision.id}
          canEdit={canWrite}
          onSave={handleInlineSave}
          logActivity={logActivity}
          variant="title"
          placeholder="Untitled"
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-foreground block"
        />
      </h1>

      {/* Metadata strip */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 mb-6">
        <MetaItem label="Category">
          <CategorySelect
            value={(decision.outcome_category_key ?? decision.outcome_category) ?? ""}
            categories={categories}
            decisionId={decision.id}
            canEdit={canWrite}
            onSave={handleInlineSave}
            logActivity={logActivity}
            className="text-sm text-foreground"
          />
        </MetaItem>
        <MetaItem label="Owner">
          <div className="text-sm text-foreground">
            <InlineEdit
              value={decision.owner ?? ""}
              field="owner"
              decisionId={decision.id}
              canEdit={canWrite}
              onSave={handleInlineSave}
              logActivity={logActivity}
              placeholder="TBD"
              className="text-sm text-foreground"
            />
          </div>
        </MetaItem>
        <MetaItem label="Sponsor">
          <div className="text-sm text-foreground">
            <InlineEdit
              value={decision.sponsor ?? ""}
              field="sponsor"
              decisionId={decision.id}
              canEdit={canWrite}
              onSave={handleInlineSave}
              logActivity={logActivity}
              placeholder="TBD"
              className="text-sm text-foreground"
            />
          </div>
        </MetaItem>
        <MetaItem label="Goal">
          {decision.linked_okr_title ? (
            <button
              type="button"
              onClick={() => canWrite && setGoalPickerOpen(true)}
              disabled={!canWrite}
              className={cn(
                "text-sm text-foreground text-left",
                canWrite && "hover:text-muted-foreground transition-colors",
              )}
            >
              {decision.linked_okr_title}
            </button>
          ) : (
            <span className="text-sm text-muted-foreground italic">Not assigned</span>
          )}
        </MetaItem>
        <MetaItem label="Lifecycle">
          <select
            aria-label="Lifecycle"
            value={decision.status}
            disabled={!canUpdateStatus}
            onChange={(e) => handleLifecycleChange(e.target.value as BetLifecycleStatus)}
            className={cn(
              "text-sm bg-transparent border-0 -mx-1 px-1 py-0.5 rounded-sm cursor-pointer",
              "hover:bg-gray-100 focus:outline-none focus:bg-gray-100",
              !canUpdateStatus && "opacity-60 cursor-not-allowed",
            )}
          >
            {BET_LIFECYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BET_LIFECYCLE_LABELS[s]}
              </option>
            ))}
          </select>
        </MetaItem>
        {canWrite && (
          <MetaItem label="Owner Account">
            <OwnerAccountSelect
              value={decision.owner_user_id ?? null}
              members={members}
              decisionId={decision.id}
              canEdit={canWrite}
              onSave={handleInlineSave}
              logActivity={logActivity}
              className="text-sm text-foreground"
            />
          </MetaItem>
        )}
      </div>

      {/* Goal picker — appears under metadata when active */}
      {goalPickerOpen && (
        <div className="border border-gray-300 rounded-[2px] p-4 mb-6 bg-card" style={{ borderWidth: "0.5px" }}>
          <div className="flex items-center gap-2 mb-2">
            <select
              value={pickerSelected}
              onChange={(e) => setPickerSelected(e.target.value)}
              className="flex-1 border border-gray-300 rounded-sm px-2 py-1 text-sm bg-background"
            >
              <option value="" disabled>
                Select a goal…
              </option>
              {okrs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                  {o.quarter ? ` (${o.quarter})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => pickerSelected && handleAssignGoal(pickerSelected)}
              disabled={!pickerSelected || updateDecision.isPending}
              className="font-mono text-[11px] uppercase tracking-[0.05em] bg-foreground text-background px-3 py-1.5 hover:opacity-[0.85] transition-opacity disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setGoalPickerOpen(false);
                setPickerSelected("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          {!newGoalOpen ? (
            <button
              type="button"
              onClick={() => setNewGoalOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + New goal
            </button>
          ) : (
            <div className="border-t border-gray-300 pt-3 mt-3 space-y-2" style={{ borderTopWidth: "0.5px" }}>
              <input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Goal title"
                autoFocus
                className="w-full border border-gray-300 rounded-sm px-2 py-1.5 text-sm bg-background"
              />
              <input
                value={newGoalQuarter}
                onChange={(e) => setNewGoalQuarter(e.target.value)}
                placeholder="Quarter (optional)"
                className="w-full border border-gray-300 rounded-sm px-2 py-1.5 text-sm bg-background"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNewGoalOpen(false);
                    setNewGoalTitle("");
                    setNewGoalQuarter("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateAndAssignGoal}
                  disabled={createOKR.isPending || updateDecision.isPending}
                  className="font-mono text-[11px] uppercase tracking-[0.05em] bg-foreground text-background px-3 py-1.5 hover:opacity-[0.85] transition-opacity disabled:opacity-40"
                >
                  {createOKR.isPending ? "Creating…" : "Create + assign"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issues strip */}
      {issues.length > 0 && (
        <div className="border-t border-b border-gray-300 py-3 mb-12" style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}>
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.code} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                <span className="font-mono text-xs text-red-700">{issue.code}</span>
                <span className="text-sm text-foreground">{issue.desc}</span>
                <div>{issue.action}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      <Section label="Trigger Signal">
        <InlineEdit
          value={decision.trigger_signal ?? ""}
          field="trigger_signal"
          decisionId={decision.id}
          canEdit={canWrite}
          onSave={handleInlineSave}
          logActivity={logActivity}
          className="text-base text-foreground leading-relaxed block"
          placeholder="Add trigger signal…"
          multiline
        />
      </Section>

      <Section label="Outcome Target">
        <InlineEdit
          value={decision.outcome_target ?? ""}
          field="outcome_target"
          decisionId={decision.id}
          canEdit={canWrite}
          onSave={handleInlineSave}
          logActivity={logActivity}
          className="text-base text-foreground leading-relaxed block"
          placeholder="Add outcome target…"
          multiline
        />
      </Section>

      <Section label="Expected Impact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          <div>
            <p className="text-sm font-semibold text-green-700 mb-2">Upside</p>
            {upside ? (
              <p className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                +{upside.display}
              </p>
            ) : (
              <p className="text-base text-muted-foreground mb-2 italic">Not quantified</p>
            )}
            <InlineEdit
              value={decision.exposure_value ?? ""}
              field="exposure_value"
              decisionId={decision.id}
              canEdit={canWrite}
              onSave={handleInlineSave}
              logActivity={logActivity}
              className="text-sm text-foreground leading-relaxed block"
              placeholder="Describe the upside…"
              multiline
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 mb-2">Risk</p>
            {risk ? (
              <p className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                {risk.display} at risk
              </p>
            ) : (
              <p className="text-base text-muted-foreground mb-2 italic">Not quantified</p>
            )}
            <InlineEdit
              value={decision.revenue_at_risk ?? ""}
              field="revenue_at_risk"
              decisionId={decision.id}
              canEdit={canWrite}
              onSave={handleInlineSave}
              logActivity={logActivity}
              className="text-sm text-foreground leading-relaxed block"
              placeholder="Describe the risk…"
              multiline
            />
          </div>
        </div>
      </Section>

      <Section label="Outcome Metrics">
        <MetricsSidebar betId={decision.id} canWrite={canWrite} />
      </Section>

      <Section label="What Moved">
        <DriftIndicators betId={decision.id} />
        <ScoreHistory betId={decision.id} />
      </Section>

      <Section label="Activity">
        <ActivityFeed decisionId={decision.id} />
      </Section>

      {/* Lifecycle confirmation modal */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4">
          <div
            className="w-full max-w-md bg-background border border-gray-300 rounded-[2px] p-6"
            style={{ borderWidth: "0.5px" }}
          >
            <p className="text-base font-semibold text-foreground mb-2">
              Change lifecycle to {BET_LIFECYCLE_LABELS[pendingStatus.newStatus as BetLifecycleStatus]}?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Optional: leave a note for the audit trail.
            </p>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              rows={3}
              placeholder="Note (optional)"
              className="w-full border border-gray-300 rounded-sm px-2 py-1.5 text-sm bg-background mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPendingStatus(null);
                  setStatusNote("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusConfirm}
                disabled={updateDecision.isPending}
                className="font-mono text-xs uppercase tracking-[0.05em] bg-foreground text-background px-3 py-1.5 hover:opacity-[0.85] transition-opacity"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isClosedBetLifecycle(decision.status) && (
        <p className="text-xs text-muted-foreground mt-12">
          This bet is closed. Edits are locked beyond reopening.
        </p>
      )}
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground mb-1">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-300 pt-8 mt-12" style={{ borderTopWidth: "0.5px" }}>
      <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">
        {label}
      </h2>
      {children}
    </section>
  );
}

function ActivityFeed({ decisionId }: { decisionId: string }) {
  const { data: activity = [], isLoading } = useDecisionActivity(decisionId);
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (activity.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {activity.map((entry: any) => (
        <li key={entry.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-baseline">
          <span className="text-xs font-medium text-muted-foreground capitalize">
            {String(entry.field_name).replace(/_/g, " ")}
          </span>
          <span className="text-sm text-foreground truncate">
            {entry.old_value ? <span className="text-muted-foreground line-through">{entry.old_value}</span> : <span className="text-muted-foreground italic">empty</span>}
            <span className="mx-2 text-muted-foreground">→</span>
            {entry.new_value ?? <span className="text-muted-foreground italic">empty</span>}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </li>
      ))}
    </ul>
  );
}
