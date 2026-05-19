import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAllInitiatives, type InitiativeWithBet } from "@/hooks/useInitiatives";
import { useOrgMembers, type OrgMember } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";
import type { InitiativeStatus } from "@/lib/types";

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

function resolveOwnerLabel(
  init: Pick<InitiativeWithBet, "owner" | "owner_user_id">,
  memberById: Map<string, OrgMember>,
): string | null {
  if (init.owner_user_id) {
    const member = memberById.get(init.owner_user_id);
    if (member) return memberDisplay(member);
  }
  return init.owner?.trim() || null;
}

export default function Initiatives() {
  const { data: initiatives = [], isLoading } = useAllInitiatives();
  const { data: members = [] } = useOrgMembers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filterStatus = searchParams.get("status") ?? "";
  const filterBet = searchParams.get("bet") ?? "";

  const setFilter = (key: "status" | "bet", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });
  const filtersActive = !!(filterStatus || filterBet);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.user_id, m])),
    [members],
  );

  // Build the bet filter options from the loaded data so we don't load decisions twice.
  const betOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; title: string }>();
    for (const i of initiatives) {
      if (!seen.has(i.bet.id)) {
        seen.set(i.bet.id, {
          id: i.bet.id,
          label: i.bet.bet_label ?? "",
          title: i.bet.title ?? "Untitled",
        });
      }
    }
    return Array.from(seen.values());
  }, [initiatives]);

  const filtered = useMemo(() => {
    return initiatives.filter((i) => {
      if (filterStatus && normalizeStatus(i.status) !== filterStatus) return false;
      if (filterBet && i.bet.id !== filterBet) return false;
      return true;
    });
  }, [initiatives, filterStatus, filterBet]);

  // Group rendered initiatives by parent bet (preserving the underlying sort).
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; label: string; title: string; rows: InitiativeWithBet[] }
    >();
    for (const i of filtered) {
      const existing = map.get(i.bet.id);
      if (existing) {
        existing.rows.push(i);
      } else {
        map.set(i.bet.id, {
          id: i.bet.id,
          label: i.bet.bet_label ?? "",
          title: i.bet.title ?? "Untitled",
          rows: [i],
        });
      }
    }
    return Array.from(map.values());
  }, [filtered]);

  // Status counts across all (unfiltered) initiatives for the header summary.
  const statusCounts = useMemo(() => {
    const counts: Record<InitiativeStatus, number> = {
      proposed: 0,
      active: 0,
      shipped: 0,
      paused: 0,
    };
    for (const i of initiatives) counts[normalizeStatus(i.status)] += 1;
    return counts;
  }, [initiatives]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (initiatives.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight tracking-tight">
            Initiatives
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            What every team is doing in service of every active bet.
          </p>
        </div>
        <div
          className="border-y border-border py-6"
          style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
        >
          <p className="text-sm text-muted-foreground">
            No initiatives logged yet across the portfolio. Open any bet to log
            the first one.
          </p>
        </div>
      </div>
    );
  }

  const selectClass =
    "text-xs border border-gray-300 rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight tracking-tight">
          Initiatives
        </h1>
        <p className="text-sm text-muted-foreground mt-2 tabular-nums">
          {initiatives.length} active across {betOptions.length}{" "}
          {betOptions.length === 1 ? "bet" : "bets"} ·{" "}
          {STATUS_ORDER.map((s) => `${statusCounts[s]} ${STATUS_LABEL[s].toLowerCase()}`).join(" · ")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilter("status", e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={filterBet}
          onChange={(e) => setFilter("bet", e.target.value)}
          className={selectClass}
        >
          <option value="">All bets</option>
          {betOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label ? `${b.label}. ` : ""}
              {b.title}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grouped rows */}
      {groups.length === 0 ? (
        <div
          className="border-y border-border py-6"
          style={{ borderTopWidth: "0.5px", borderBottomWidth: "0.5px" }}
        >
          <p className="text-sm text-muted-foreground">
            No initiatives match these filters.{" "}
            <button
              onClick={clearFilters}
              className="text-foreground font-medium hover:underline"
            >
              Clear filters
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id}>
              <Link
                to={`/bets/${group.id}`}
                className="group inline-flex items-baseline gap-2 mb-3 hover:text-accent transition-colors"
              >
                {group.label && (
                  <span className="text-accent font-mono tabular-nums text-sm">
                    {group.label}.
                  </span>
                )}
                <h2 className="text-base font-semibold text-foreground tracking-tight group-hover:text-accent transition-colors">
                  {group.title}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  · {group.rows.length}
                </span>
              </Link>
              <ul>
                {group.rows.map((init) => (
                  <InitiativeRow
                    key={init.id}
                    initiative={init}
                    ownerLabel={resolveOwnerLabel(init, memberById)}
                    expanded={expandedId === init.id}
                    onToggle={() =>
                      setExpandedId(expandedId === init.id ? null : init.id)
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// === Row ===

function InitiativeRow({
  initiative,
  ownerLabel,
  expanded,
  onToggle,
}: {
  initiative: InitiativeWithBet;
  ownerLabel: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = normalizeStatus(initiative.status);
  const style = STATUS_STYLE[status];
  const headline = initiative.title?.trim() || initiative.description;
  const hasDetailBody =
    !!initiative.title?.trim() && !!initiative.description?.trim();
  const hasAcceptance = !!initiative.acceptance_signal?.trim();
  const hasDetail = hasDetailBody || hasAcceptance;

  return (
    <li
      className="py-2 border-b border-border last:border-b-0"
      style={{ borderBottomWidth: "0.5px" }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 mt-0.5 shrink-0",
            "font-mono text-[10px] uppercase tracking-[0.05em]",
            style.pill,
          )}
        >
          <span
            className={cn("w-1 h-1 rounded-full inline-block shrink-0", style.dot)}
            aria-hidden
          />
          {STATUS_LABEL[status]}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {headline}
          </p>
          {ownerLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{ownerLabel}</p>
          )}
          {hasDetail && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className="mt-1.5 text-xs font-medium text-accent hover:underline"
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>
        <Link
          to={`/bets/${initiative.bet.id}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Open bet →
        </Link>
      </div>

      {expanded && hasDetail && (
        <div className="mt-3 ml-[5.5rem] space-y-3 max-w-2xl">
          {hasDetailBody && (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {initiative.description}
            </p>
          )}
          {hasAcceptance && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Acceptance
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {initiative.acceptance_signal}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
