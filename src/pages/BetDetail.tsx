import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDecisions, useUpdateDecision, useOrgOKRs, useCreateOKR } from "@/hooks/useOrgData";
import { useLogActivity, useDecisionActivity } from "@/hooks/useDecisionActivity";
import { useOrgMembers } from "@/hooks/useTeam";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMetrics } from "@/hooks/useMetrics";
import { useDrift } from "@/hooks/useDrift";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import {
  InlineEdit,
  CategorySelect,
  isDecisionOwner,
  BET_CATEGORY_OPTIONS,
} from "@/pages/Decisions";
import {
  BET_LIFECYCLE_LABELS,
  BET_LIFECYCLE_STATUSES,
  type BetLifecycleStatus,
  LIFECYCLE_BUCKET_STYLE,
  lifecycleBucket,
  isClosedBetLifecycle,
} from "@/lib/bet-status";
import { extractMagnitude, movementState } from "@/lib/bet-magnitude";
import MetricsSidebar from "@/components/MetricsSidebar";
import DriftIndicators from "@/components/DriftIndicators";
import ScoreHistory from "@/components/ScoreHistory";
import { cn } from "@/lib/utils";

function nudgeMailto(betTitle: string, days: number, owner: string): string {
  const subject = encodeURIComponent(`Authority: ${betTitle} needs attention`);
  const body = encodeURIComponent(
    `${betTitle} has had no movement in ${days} days.\nOwner: ${owner}\n\nUpdate your bet at https://buildauthorityos.com/bets`,
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

  // Active bets in created-at order — used by both the navigator and the breadcrumb.
  const activeOrdered = useMemo(() => {
    const active = decisions.filter((d) => !isClosedBetLifecycle(d.status));
    return [...active].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [decisions]);

  const activeIndex = useMemo(
    () => (id ? activeOrdered.findIndex((d) => d.id === id) : -1),
    [activeOrdered, id],
  );

  const decision = useMemo(() => {
    if (!id) return null;
    if (activeIndex >= 0) return activeOrdered[activeIndex];
    return decisions.find((d) => d.id === id) ?? null;
  }, [decisions, id, activeIndex, activeOrdered]);

  const canUpdateStatus =
    !!decision && (currentRole === "admin" || isDecisionOwner(decision, user));

  // Side data for the inline metric / drift / score-history sections — needed
  // so we can render single-line empty states instead of the nested duplicate
  // headings the embedded components otherwise show.
  const { data: metrics = [] } = useMetrics(decision?.id);
  const { data: driftFlags = [] } = useDrift(decision?.id);
  const { data: scoreEntries = [] } = useScoreHistory(decision?.id);

  // Lifecycle confirmation modal
  const [pendingStatus, setPendingStatus] = useState<{
    newStatus: string;
    oldStatus: string;
  } | null>(null);
  const [statusNote, setStatusNote] = useState("");

  // Goal picker
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [pickerSelected, setPickerSelected] = useState("");
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalQuarter, setNewGoalQuarter] = useState("");

  // Activity collapse state
  const [activityExpanded, setActivityExpanded] = useState(false);

  const handleInlineSave = async (
    id: string,
    field: string,
    _oldValue: string,
    newValue: string,
  ) => {
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
      toast.success(
        `Lifecycle updated to ${BET_LIFECYCLE_LABELS[pendingStatus.newStatus as BetLifecycleStatus]}.`,
      );
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

  const scrollToId = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!decision) {
    return (
      <div className="max-w-4xl">
        <Link to="/bets" className="text-sm text-muted-foreground hover:text-foreground">
          ← All bets
        </Link>
        <p className="text-sm text-muted-foreground mt-6">Bet not found.</p>
      </div>
    );
  }

  const move = movementState(decision.updated_at, decision.created_at);
  const upside = extractMagnitude(decision.exposure_value);
  const risk = extractMagnitude(decision.revenue_at_risk);

  const triggerLines = (decision.trigger_signal ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^[•·\-\*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-12 pb-24 lg:pb-0">
      <main className="min-w-0 max-w-3xl">
        {/* Bet navigator strip — chips for every active bet, current highlighted */}
        {activeOrdered.length > 1 && (
          <BetNavigator activeOrdered={activeOrdered} currentId={decision.id} />
        )}

        {/* Header block — the navigator chip strip above and the lifecycle
            rail on the right already show "which bet" and "what lifecycle".
            No need to repeat with a breadcrumb + inline pill here. */}
        <header className="mt-6 mb-10">
          <h1 className="mb-6">
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

          {/* 4-fact strip + health indicator */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <FactItem label="CATEGORY">
                <CategorySelect
                  value={(decision.outcome_category_key ?? decision.outcome_category) ?? ""}
                  categories={categories}
                  decisionId={decision.id}
                  canEdit={canWrite}
                  onSave={handleInlineSave}
                  logActivity={logActivity}
                  className="text-sm text-foreground"
                />
              </FactItem>
              <FactItem label="OWNER">
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
              </FactItem>
              <FactItem label="SPONSOR">
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
              </FactItem>
              <FactItem label="GOAL">
                {decision.linked_okr_title ? (
                  <button
                    type="button"
                    onClick={() => canWrite && setGoalPickerOpen(true)}
                    disabled={!canWrite}
                    className={cn(
                      "text-sm text-foreground text-left block w-full leading-snug",
                      canWrite && "hover:text-accent transition-colors",
                    )}
                  >
                    {decision.linked_okr_title}
                  </button>
                ) : canWrite ? (
                  <button
                    type="button"
                    onClick={() => setGoalPickerOpen(true)}
                    className="text-sm text-accent hover:underline transition-colors text-left font-medium"
                  >
                    Assign a goal →
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Not assigned</span>
                )}
              </FactItem>
            </div>

            <HealthBlock
              move={move}
              betTitle={decision.title ?? "Untitled"}
              owner={decision.owner ?? ""}
            />
          </div>

          {/* Goal picker — appears under fact strip when active */}
          {goalPickerOpen && (
            <div
              className="mt-4 border border-gray-300 rounded-[2px] p-4 bg-card"
              style={{ borderWidth: "0.5px" }}
            >
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
                  className="text-sm font-medium bg-foreground text-background px-3 py-1.5 rounded-sm hover:opacity-[0.85] transition-opacity disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGoalPickerOpen(false);
                    setPickerSelected("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
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
                <div
                  className="border-t border-gray-300 pt-3 mt-3 space-y-2"
                  style={{ borderTopWidth: "0.5px" }}
                >
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
                      className="text-sm font-medium bg-foreground text-background px-3 py-1.5 rounded-sm hover:opacity-[0.85] transition-opacity disabled:opacity-40"
                    >
                      {createOKR.isPending ? "Creating…" : "Create + assign"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* At-a-glance band — the hero of the page. No bottom border:
            the next Section already provides a top hairline, so a bottom
            border here would double up. */}
        <section
          className="border-t border-gray-300 py-10"
          style={{ borderTopWidth: "0.5px" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <DecisionGate decision={decision} />
            <Magnitude
              label="Upside"
              tone="upside"
              figure={upside ? `+${upside.display}` : null}
              body={decision.exposure_value ?? ""}
            />
            <Magnitude
              label="Risk"
              tone="risk"
              figure={risk ? `${risk.display} at risk` : null}
              body={decision.revenue_at_risk ?? ""}
            />
          </div>
        </section>

        {/* Trigger Signal — structured list if multi-line, paragraph otherwise */}
        <Section id="trigger-signal" label="Trigger Signal">
          {triggerLines.length > 1 ? (
            <ul className="space-y-2">
              {triggerLines.map((line, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 inline-block w-3 h-3 rounded-sm border border-gray-400 shrink-0"
                    aria-hidden
                  />
                  <span className="text-base text-foreground leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          ) : (
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
          )}
        </Section>

        {/* Outcome Target — pulled-out paragraph */}
        <Section id="outcome-target" label="Outcome Target">
          <div className="max-w-2xl">
            <InlineEdit
              value={decision.outcome_target ?? ""}
              field="outcome_target"
              decisionId={decision.id}
              canEdit={canWrite}
              onSave={handleInlineSave}
              logActivity={logActivity}
              className="text-lg text-foreground leading-relaxed block"
              placeholder="Add outcome target…"
              multiline
            />
          </div>
        </Section>

        {/* Outcome Metrics — only render when metrics exist. The Log rail
            (Add metric →) is the entry point when there are none. */}
        {metrics.length > 0 && (
          <Section id="outcome-metrics" label="Outcome Metrics">
            <MetricsSidebar betId={decision.id} canWrite={canWrite} embedded />
          </Section>
        )}

        {/* What Moved — same treatment: hide entirely when there's no
            drift and no score history. Log rail handles entry. */}
        {(driftFlags.length > 0 || scoreEntries.length > 0) && (
          <Section id="what-moved" label="What Moved">
            <DriftIndicators betId={decision.id} embedded />
            <ScoreHistory betId={decision.id} embedded />
          </Section>
        )}

        {/* Activity — collapsed by default if >5 */}
        <Section id="activity" label="Activity">
          <ActivityFeed
            decisionId={decision.id}
            expanded={activityExpanded}
            onToggle={() => setActivityExpanded((v) => !v)}
          />
        </Section>

        {/* Lifecycle confirmation modal */}
        {pendingStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4">
            <div
              className="w-full max-w-md bg-background border border-gray-300 rounded-[2px] p-6"
              style={{ borderWidth: "0.5px" }}
            >
              <p className="text-base font-semibold text-foreground mb-2">
                Change lifecycle to{" "}
                {BET_LIFECYCLE_LABELS[pendingStatus.newStatus as BetLifecycleStatus]}?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Optional note for the audit trail.
              </p>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-sm px-2 py-1.5 text-sm bg-background mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setPendingStatus(null);
                    setStatusNote("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusConfirm}
                  disabled={updateDecision.isPending}
                  className="text-sm font-medium bg-foreground text-background px-3 py-1.5 rounded-sm hover:opacity-[0.85] transition-opacity"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Right rail — sticky on desktop, bottom bar on mobile */}
      <RailActions
        canEdit={canWrite}
        canUpdateStatus={canUpdateStatus}
        currentLifecycle={decision.status as BetLifecycleStatus}
        onLifecycleChange={handleLifecycleChange}
        scrollToId={scrollToId}
        members={members}
        decision={decision}
        onInlineSave={handleInlineSave}
        logActivity={logActivity}
      />
    </div>
  );
}

// === Sub-components ===

function FactItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      {/* Reserve 2 lines of small text so all fact cells align on the bottom
          regardless of whether a value wraps. */}
      <div className="leading-snug min-h-[2.5rem]">{children}</div>
    </div>
  );
}

function HealthBlock({
  move,
  betTitle,
  owner,
}: {
  move: ReturnType<typeof movementState>;
  betTitle: string;
  owner: string;
}) {
  // Compact, vertically aligned with the fact strip. Only error treatment on
  // the page. Quiet when the bet has never moved (e.g. just-imported backlog).
  if (move.tier === "none") {
    return null;
  }
  if (move.tier === "red") {
    return (
      <div className="text-right md:min-w-[180px]">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
          Health
        </p>
        <p className="font-mono text-xs text-signal-red mb-1">ERR_NO_MOVEMENT</p>
        <p className="text-sm text-foreground mb-1">No movement in {move.days} days</p>
        <a
          href={nudgeMailto(betTitle, move.days, owner)}
          className="text-sm font-medium text-accent hover:underline"
        >
          Nudge owner →
        </a>
      </div>
    );
  }
  if (move.tier === "amber") {
    return (
      <div className="text-right md:min-w-[180px]">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
          Health
        </p>
        <p className="text-sm text-signal-amber">Slowing · {move.days} days</p>
      </div>
    );
  }
  return (
    <div className="text-right md:min-w-[180px]">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        Health
      </p>
      <p className="text-sm text-muted-foreground">{move.label}</p>
    </div>
  );
}

function BetNavigator({
  activeOrdered,
  currentId,
}: {
  activeOrdered: any[];
  currentId: string;
}) {
  const total = activeOrdered.length;
  const currentIndex = activeOrdered.findIndex((b) => b.id === currentId);
  const prev = currentIndex > 0 ? activeOrdered[currentIndex - 1] : null;
  const next = currentIndex < total - 1 ? activeOrdered[currentIndex + 1] : null;

  // ≤8 bets: render titled chips with truncation.
  // >8: render compact prev/next pair with titles + numeric position.
  if (total <= 8) {
    return (
      <nav
        aria-label="Bet navigator"
        className="flex items-center gap-1.5 overflow-x-auto pb-2 -mb-2"
      >
        {activeOrdered.map((b, i) => {
          const isCurrent = b.id === currentId;
          const bucket = lifecycleBucket(b.status);
          const dot = LIFECYCLE_BUCKET_STYLE[bucket].dot;
          return (
            <Link
              key={b.id}
              to={`/bets/${b.id}`}
              aria-current={isCurrent ? "page" : undefined}
              title={b.title ?? `Bet ${i + 1}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs transition-colors shrink-0 max-w-[180px]",
                isCurrent
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
              style={{ border: "0.5px solid hsl(var(--border))" }}
            >
              <span
                className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", dot)}
                aria-hidden
              />
              <span className="font-mono tabular-nums opacity-60">{i + 1}.</span>
              <span className="truncate">{b.title || "Untitled"}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // >8 bets: prev/next pair with titles
  return (
    <nav
      aria-label="Bet navigator"
      className="flex items-center justify-between gap-4 pb-2 -mb-2 text-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        {prev ? (
          <Link
            to={`/bets/${prev.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-w-0"
          >
            <span aria-hidden>←</span>
            <span className="truncate max-w-[200px]">{prev.title || "Untitled"}</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
        Bet {currentIndex + 1} of {total}
      </span>
      <div className="flex items-center gap-2 min-w-0 justify-end">
        {next ? (
          <Link
            to={`/bets/${next.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-w-0"
          >
            <span className="truncate max-w-[200px]">{next.title || "Untitled"}</span>
            <span aria-hidden>→</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}

function DecisionGate({ decision }: { decision: any }) {
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(decision.created_at).getTime()) / 86400_000),
  );
  const deadlineDays = (decision.slice_deadline_days as number | null) ?? null;
  const sliceRemaining =
    (decision as any).slice_remaining ??
    (deadlineDays != null ? deadlineDays - ageDays : null);

  const triggerOneLine = (decision.trigger_signal ?? "")
    .split(/\n+/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .join(" · ");

  // Headline figure mirrors Upside/Risk visual weight: text-3xl semibold tabular.
  const overdue = sliceRemaining != null && sliceRemaining < 0;
  const headline =
    sliceRemaining != null
      ? overdue
        ? `${Math.abs(sliceRemaining)}d`
        : `${sliceRemaining}d`
      : `${ageDays}d`;
  const headlineColor = overdue ? "text-signal-red" : "text-foreground";
  const headlineLabel =
    sliceRemaining != null
      ? overdue
        ? "past the next review"
        : "until the next review"
      : "since defined";

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Decision Gate
      </p>
      <p className={cn("text-3xl font-semibold tabular-nums tracking-tight mb-1", headlineColor)}>
        {headline}
      </p>
      <p className="text-xs text-muted-foreground mb-3">{headlineLabel}</p>
      <p className="text-sm text-foreground leading-snug line-clamp-2">
        {triggerOneLine || <span className="text-muted-foreground italic">No trigger set.</span>}
      </p>
    </div>
  );
}

function Magnitude({
  label,
  tone,
  figure,
  body,
}: {
  label: string;
  tone: "upside" | "risk";
  figure: string | null;
  body: string;
}) {
  const figureColor = tone === "upside" ? "text-green-700" : "text-red-700";
  // Split free-form bullet text on newlines and strip leading "- " / "· " /
  // "* " markers so we can render proper list items instead of pre-formatted
  // dash characters. If the source isn't a list, this just yields one item.
  const items = body
    ? body
        .split(/\n+/)
        .map((line) => line.replace(/^[\s•·\-\*]+\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      {figure && (
        <p className={cn("text-3xl font-semibold tabular-nums tracking-tight mb-3", figureColor)}>
          {figure}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Add an {tone} description…
        </p>
      ) : items.length === 1 ? (
        <p className="text-sm text-foreground leading-relaxed">{items[0]}</p>
      ) : (
        <ul className="space-y-2 text-sm text-foreground leading-relaxed">
          {items.map((line, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-2.5">
              <span className="text-muted-foreground select-none" aria-hidden>
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-t border-gray-300 pt-8 mt-12"
      style={{ borderTopWidth: "0.5px" }}
    >
      <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">
        {label}
      </h2>
      {children}
    </section>
  );
}

function EmptyLine({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {text}
      {actionLabel && onAction && (
        <>
          {" "}
          <button
            type="button"
            onClick={onAction}
            className="text-foreground font-medium hover:underline"
          >
            {actionLabel}
          </button>
        </>
      )}
    </p>
  );
}

function ActivityFeed({
  decisionId,
  expanded,
  onToggle,
}: {
  decisionId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: activity = [], isLoading } = useDecisionActivity(decisionId);
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (activity.length === 0) {
    return <EmptyLine text="No activity yet." />;
  }
  const visible = expanded ? activity : activity.slice(0, 5);
  return (
    <div>
      <ul className="space-y-3">
        {visible.map((entry: any) => (
          <li key={entry.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-baseline">
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {String(entry.field_name).replace(/_/g, " ")}
            </span>
            <span className="text-sm text-foreground truncate">
              {entry.old_value ? (
                <span className="text-muted-foreground line-through">{entry.old_value}</span>
              ) : (
                <span className="text-muted-foreground italic">empty</span>
              )}
              <span className="mx-2 text-muted-foreground">→</span>
              {entry.new_value ?? <span className="text-muted-foreground italic">empty</span>}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(entry.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </li>
        ))}
      </ul>
      {activity.length > 5 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-4 text-sm font-medium text-foreground hover:underline"
        >
          {expanded ? "Show less" : `Show all (${activity.length})`}
        </button>
      )}
    </div>
  );
}

function RailActions({
  canEdit,
  canUpdateStatus,
  currentLifecycle,
  onLifecycleChange,
  scrollToId,
  decision: _decision,
  members: _members,
  onInlineSave: _onInlineSave,
  logActivity: _logActivity,
}: {
  canEdit: boolean;
  canUpdateStatus: boolean;
  currentLifecycle: BetLifecycleStatus;
  onLifecycleChange: (next: BetLifecycleStatus) => void;
  scrollToId: (id: string) => void;
  decision: any;
  members: any[];
  onInlineSave: any;
  logActivity: any;
}) {
  // Lifecycle pipeline as ordered steps. Each click advances the bet to that
  // state; the parent's pendingStatus modal confirms the change.
  const LIFECYCLE_STEPS: BetLifecycleStatus[] = [
    "defined",
    "activated",
    "proving_value",
    "scaling",
    "durable",
    "closed",
  ];
  const currentStepIdx = LIFECYCLE_STEPS.indexOf(currentLifecycle);

  return (
    <>
      <aside className="hidden lg:block sticky top-8 h-fit space-y-8">
        {/* Lifecycle — vertical step list */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Lifecycle
          </p>
          <ol className="space-y-1">
            {LIFECYCLE_STEPS.map((step, i) => {
              const isCurrent = step === currentLifecycle;
              const isPast = i < currentStepIdx;
              return (
                <li key={step}>
                  <button
                    type="button"
                    onClick={() => onLifecycleChange(step)}
                    disabled={!canUpdateStatus || isCurrent}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "w-full text-left text-sm px-2 py-1.5 rounded-[2px] flex items-center gap-2 transition-colors",
                      isCurrent
                        ? "bg-accent text-accent-foreground font-medium cursor-default"
                        : isPast
                          ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                          : "text-foreground hover:bg-muted",
                      !canUpdateStatus && !isCurrent && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <span className="font-mono text-[10px] tabular-nums opacity-60 w-4">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{BET_LIFECYCLE_LABELS[step]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Log — quick navigation to logging sections */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Log
          </p>
          <div className="space-y-1">
            <button
              onClick={() => scrollToId("what-moved")}
              disabled={!canEdit}
              className="block w-full text-left text-sm font-medium text-accent hover:underline px-2 py-1.5"
            >
              Log movement →
            </button>
            <button
              onClick={() => scrollToId("outcome-metrics")}
              disabled={!canEdit}
              className="block w-full text-left text-sm font-medium text-accent hover:underline px-2 py-1.5"
            >
              Add metric →
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex items-center justify-around gap-3 z-10"
        style={{ borderTopWidth: "0.5px" }}
      >
        {canUpdateStatus && (
          <select
            aria-label="Update lifecycle"
            value={currentLifecycle}
            onChange={(e) => onLifecycleChange(e.target.value as BetLifecycleStatus)}
            className="text-sm border border-border bg-background rounded-[2px] px-2 py-1 cursor-pointer"
            style={{ borderWidth: "0.5px" }}
          >
            {BET_LIFECYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BET_LIFECYCLE_LABELS[s]}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => scrollToId("what-moved")}
          className="text-sm font-medium text-foreground hover:underline"
          disabled={!canEdit}
        >
          Log movement
        </button>
        <button
          onClick={() => scrollToId("outcome-metrics")}
          className="text-sm font-medium text-foreground hover:underline"
          disabled={!canEdit}
        >
          Add metric
        </button>
      </div>
    </>
  );
}
