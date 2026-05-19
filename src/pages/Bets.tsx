import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDecisions, useDecisionRisks } from "@/hooks/useOrgData";
import { useOrg } from "@/contexts/OrgContext";
import { ChevronDown, ChevronRight } from "lucide-react";
import CreateDecisionForm from "@/components/CreateDecisionForm";
import BetRow from "@/components/bets/BetRow";
import { categoryLabels } from "@/pages/Decisions";
import { aggregateMagnitudes, movementState } from "@/lib/bet-magnitude";
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

interface SummaryDecision {
  exposure_value?: string | null;
  revenue_at_risk?: string | null;
  updated_at: string;
  created_at: string;
}

function PortfolioSummary({ activeDecisions }: { activeDecisions: SummaryDecision[] }) {
  const upside = aggregateMagnitudes(activeDecisions.map((d) => d.exposure_value ?? null));
  const risk = aggregateMagnitudes(activeDecisions.map((d) => d.revenue_at_risk ?? null));
  const stalled = activeDecisions.filter(
    (d) => movementState(d.updated_at, d.created_at).tier === "red",
  ).length;
  const denom = activeDecisions.length;
  const stalledMajority = denom > 0 && stalled / denom > 0.5;

  const Col = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col">
      <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground mb-1">
        {`// ${label}`}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight leading-tight">{children}</span>
    </div>
  );

  const Magnitude = ({
    agg,
  }: {
    agg: ReturnType<typeof aggregateMagnitudes>;
  }) => {
    if (agg.unquantifiedCount > 0) {
      const skipped = agg.unquantifiedCount;
      return (
        <span
          className="text-gray-500"
          title={`${skipped} bet${skipped === 1 ? "" : "s"} could not be summed — value is non-numeric`}
        >
          Not aggregated
        </span>
      );
    }
    if (!agg.display) return <span className="text-gray-500">—</span>;
    return <span className="text-foreground">{agg.display}</span>;
  };

  return (
    <div
      className="border-y border-border py-6 mb-6"
      style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        <Col label="TOTAL UPSIDE">
          <Magnitude agg={upside} />
        </Col>
        <Col label="TOTAL RISK">
          <Magnitude agg={risk} />
        </Col>
        <Col label="STALLED">
          <span className={stalledMajority ? "text-red-700" : "text-foreground"}>
            {stalled} of {denom} {denom === 1 ? "bet" : "bets"}
          </span>
        </Col>
      </div>
    </div>
  );
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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight tracking-tight">Bets</h1>
            <p className="text-sm text-muted-foreground mt-2 tabular-nums">
              {decisions.length} total · {activeDecisions.length} open · {closedCount} closed
            </p>
          </div>
          {canWrite && !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center rounded-[2px] bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-[0.9] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              + Register bet
            </button>
          )}
        </div>
      </div>

      {/* Portfolio summary — aggregates across active bets */}
      <PortfolioSummary activeDecisions={activeDecisions} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {showCreate && <CreateDecisionForm onClose={() => setShowCreate(false)} />}

      {/* Zero-bet empty state — single line, no centered card */}
      {isEmpty && !showCreate ? (
        <div
          className="border-y border-border py-6"
          style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
        >
          <p className="text-sm text-muted-foreground">
            No bets yet.{" "}
            {canWrite && (
              <button
                onClick={() => setShowCreate(true)}
                className="text-foreground font-medium hover:underline"
              >
                + Register your first bet
              </button>
            )}
          </p>
        </div>
      ) : (
        <>
          {filteredDecisions.length === 0 && filtersActive ? (
            <div
              className="border-y border-border py-6"
              style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
            >
              <p className="text-sm text-muted-foreground">
                No bets match these filters.{" "}
                <button
                  onClick={clearFilters}
                  className="text-foreground font-medium hover:underline"
                >
                  Clear filters
                </button>
              </p>
            </div>
          ) : (
            <div
              className="border-t border-border"
              style={{ borderTopWidth: "0.5px" }}
            >
              {filteredDecisions.map((d, index) => (
                <BetRow key={d.id} d={d as any} index={index + 1} />
              ))}
            </div>
          )}

          {/* Closed bets — collapsible */}
          {closedCount > 0 && (
            <section
              className="border-t border-border pt-6 mt-10"
              style={{ borderTopWidth: "0.5px" }}
            >
              <button
                onClick={() => setClosedBetsOpen(!closedBetsOpen)}
                aria-expanded={closedBetsOpen}
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors"
              >
                {closedBetsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {`// CLOSED BETS (${closedCount})`}
              </button>
              {closedBetsOpen && (
                <div className="mt-4">
                  {closedDecisions.map((d) => (
                    <a
                      key={d.id}
                      href={`/bets/${d.id}`}
                      className={cn(
                        "block border-b border-border px-2 py-3",
                        "flex flex-col md:flex-row md:items-center md:justify-between gap-2",
                        "hover:bg-muted transition-colors",
                      )}
                      style={{ borderBottomWidth: "0.5px" }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{d.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {categoryLabels[(d.outcome_category_key ?? d.outcome_category) ?? ""] || "—"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">Closed {formatDate(d.updated_at)}</p>
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
