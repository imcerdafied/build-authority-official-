import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDecisions, useDecisionRisks } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import BetRow from "@/components/bets/BetRow";
import { categoryLabels } from "@/pages/Decisions";
import {
  BET_LIFECYCLE_LABELS,
  BET_LIFECYCLE_STATUSES,
  BET_RISK_LABELS,
  isClosedBetLifecycle,
  toBetRiskLevel,
} from "@/lib/bet-status";
import { cn } from "@/lib/utils";

function formatDate(ts: string): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Bets() {
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { isLoading: risksLoading } = useDecisionRisks();
  const { currentRole } = useOrg();
  const canWrite = currentRole === "admin" || currentRole === "pod_lead";

  const [showCreate, setShowCreate] = useState(false);
  const [closedBetsOpen, setClosedBetsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get("status") ?? "";
  const filterRisk = searchParams.get("risk") ?? "";
  const filterDomain = searchParams.get("domain") ?? "";

  const setFilter = (key: "status" | "risk" | "domain", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  if (decisionsLoading || risksLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const activeDecisions = decisions.filter((d) => !isClosedBetLifecycle(d.status));
  const closedDecisions = decisions
    .filter((d) => isClosedBetLifecycle(d.status))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const closedCount = closedDecisions.length;
  const orderedDecisions = [...activeDecisions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const productAreaOptions = Array.from(
    new Set(orderedDecisions.map((d) => String(d.surface || "").trim()).filter(Boolean)),
  );
  const isEmpty = decisions.length === 0;

  const filtersActive = !!(filterStatus || filterRisk || filterDomain);
  const filteredDecisions = orderedDecisions.filter((d) => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterRisk && toBetRiskLevel(d.risk_level) !== filterRisk) return false;
    if (filterDomain && String(d.surface || "").trim() !== filterDomain) return false;
    return true;
  });

  const filterStatusOptions = BET_LIFECYCLE_STATUSES.filter((s) => s !== "closed");
  const riskLevelOptions = ["at_risk", "watch", "healthy"] as const;
  const selectClass = "text-xs border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="eyebrow-mono mb-3">// BETS</div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-[40px] font-black text-foreground leading-none tracking-tight">Bets</h1>
            <p className="text-base text-gray-700 mt-2">
              {decisions.length} total · {activeDecisions.length} open · {closedCount} closed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={(e) => setFilter("status", e.target.value)} className={selectClass}>
              <option value="">All Lifecycles</option>
              {filterStatusOptions.map((s) => (
                <option key={s} value={s}>{BET_LIFECYCLE_LABELS[s]}</option>
              ))}
            </select>
            <select value={filterRisk} onChange={(e) => setFilter("risk", e.target.value)} className={selectClass}>
              <option value="">All Risk Levels</option>
              {riskLevelOptions.map((r) => (
                <option key={r} value={r}>{BET_RISK_LABELS[r]}</option>
              ))}
            </select>
            {productAreaOptions.length > 0 && (
              <select value={filterDomain} onChange={(e) => setFilter("domain", e.target.value)} className={selectClass}>
                <option value="">All Product Areas</option>
                {productAreaOptions.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            )}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-xs font-mono uppercase tracking-[0.05em] text-gray-500 hover:text-foreground"
              >
                Clear
              </button>
            )}
            {canWrite && !showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="font-mono text-sm uppercase tracking-[0.05em] border border-foreground text-foreground px-3 py-2 hover:opacity-[0.85] transition-opacity"
              >
                + Register Bet
              </button>
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {/* Zero-bet empty state */}
      {isEmpty && !showCreate ? (
        <div className="border border-gray-300 rounded-lg px-8 py-12 text-center max-w-xl mx-auto">
          <p className="text-lg font-semibold text-foreground">No bets yet</p>
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">
            Bets are the strategic decisions your team is making to move toward your goals.
          </p>
          {canWrite && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 font-mono text-sm uppercase tracking-[0.05em] bg-foreground text-background px-5 py-2.5 hover:opacity-[0.85] transition-opacity"
            >
              Create your first bet
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Filter-empty state */}
          {filteredDecisions.length === 0 && filtersActive ? (
            <div className="border border-gray-300 rounded-lg px-6 py-10 text-center">
              <p className="text-sm text-gray-500">No bets match these filters.</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-xs font-mono uppercase tracking-[0.05em] text-foreground hover:opacity-[0.85] underline-offset-4 underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDecisions.map((d, index) => (
                <BetRow key={d.id} d={d as any} index={index + 1} />
              ))}
            </div>
          )}

          {/* Closed bets — collapsible */}
          {closedCount > 0 && (
            <section className="border-t border-gray-300 pt-6 mt-10">
              <button
                onClick={() => setClosedBetsOpen(!closedBetsOpen)}
                aria-expanded={closedBetsOpen}
                className="flex items-center gap-2 eyebrow-mono hover:text-foreground transition-colors"
              >
                <span>{closedBetsOpen ? "▼" : "▶"}</span>
                {`// CLOSED BETS (${closedCount})`}
              </button>
              {closedBetsOpen && (
                <div className="mt-4 space-y-2">
                  {closedDecisions.map((d) => (
                    <a
                      key={d.id}
                      href={`/bets/${d.id}`}
                      className={cn(
                        "block border border-gray-300 rounded-md px-4 py-3",
                        "flex flex-col md:flex-row md:items-center md:justify-between gap-2",
                        "hover:bg-gray-100 transition-colors",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.title || "Untitled"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {categoryLabels[(d.outcome_category_key ?? d.outcome_category) ?? ""] || "—"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 shrink-0">Closed {formatDate(d.updated_at)}</p>
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
