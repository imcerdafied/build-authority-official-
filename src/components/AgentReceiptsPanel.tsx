import { useState } from "react";
import { useAgentReceipts } from "@/hooks/useAgentReceipts";
import { cn } from "@/lib/utils";

// Workspace provenance view: what agents and automations (and people) have
// done in this org, newest first. Reads the org-scoped agent-receipt ledger.
// Calm style: one card, divider rows, an actor tone chip, relative time.

const ACTOR_TONE: Record<string, string> = {
  agent: "bg-primary/10 text-primary",
  system: "bg-muted text-muted-foreground",
  service: "bg-muted text-muted-foreground",
  user: "bg-muted text-muted-foreground",
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AgentReceiptsPanel() {
  const [agentsOnly, setAgentsOnly] = useState(false);
  const { data: receipts = [], isLoading } = useAgentReceipts({ agentsOnly });

  return (
    <section
      className="mb-8 rounded-lg border border-border bg-card"
      data-testid="agent-receipts"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            agent activity
          </p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-foreground">
            Agent Receipts
          </h2>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setAgentsOnly(false)}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold transition-colors",
              !agentsOnly
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setAgentsOnly(true)}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold transition-colors",
              agentsOnly
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Agents only
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Loading agent activity...</p>
      ) : receipts.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-semibold text-foreground">No agent receipts yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            As the outcome engine re-scores bets, or syncs and scheduled jobs run, each
            automated action records a receipt here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  ACTOR_TONE[r.actor_type] ?? ACTOR_TONE.system,
                )}
              >
                {r.actor_type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {r.actor_label || r.actor_id || "Agent"}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {r.summary || r.action}
                </p>
              </div>
              <span
                className="shrink-0 font-mono text-[10px] text-muted-foreground"
                title={r.created_at}
              >
                {relativeTime(r.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
