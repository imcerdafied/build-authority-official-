import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  fetchLinkedOKR,
  fetchLinkedOutcomes,
  type LinkedOKR,
  type LinkedOutcome,
} from "@/lib/crossApp";
import { cn } from "@/lib/utils";
import {
  BET_LIFECYCLE_LABELS,
  toBetLifecycleStatus,
} from "@/lib/bet-status";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BetRow {
  id: string;
  title: string;
  status: string;
  linked_okr_id: string | null;
  linked_okr_title: string | null;
  linked_outcome_ids: string[] | null;
  linked_outcome_titles: Record<string, string> | null;
}

interface AltitudeRow {
  bet: BetRow;
  okr: LinkedOKR | null;
  outcomes: LinkedOutcome[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useActiveBets() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["altitude-bets", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data } = await supabase
        .from("decisions")
        .select("id,title,status,linked_okr_id,linked_okr_title,linked_outcome_ids,linked_outcome_titles")
        .eq("org_id", currentOrg.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      return (data ?? []) as BetRow[];
    },
    enabled: !!currentOrg,
  });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ColumnHeader({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="pb-3 border-b border-border/60 mb-4">
      <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">{label}</h3>
      <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function CellCard({
  title,
  subtitle,
  url,
  accent,
}: {
  title: string;
  subtitle?: string;
  url?: string;
  accent?: string;
}) {
  const inner = (
    <div className={cn(
      "border border-border/60 rounded-lg p-3 transition-colors",
      url && "hover:border-foreground/30 cursor-pointer",
    )}>
      <p className="text-sm font-medium truncate">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      {accent && (
        <span className="inline-block mt-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
          {accent}
        </span>
      )}
    </div>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

function UnlinkedCell() {
  return (
    <div className="border border-dashed border-border/40 rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground/50 italic">unlinked</p>
    </div>
  );
}

function SkeletonCell() {
  return (
    <div className="border border-border/40 rounded-lg p-3 animate-pulse">
      <div className="h-4 bg-muted/60 rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted/40 rounded w-1/2" />
    </div>
  );
}

function AltitudeRowView({ row }: { row: AltitudeRow }) {
  const lifecycle = toBetLifecycleStatus(row.bet.status);
  const lifecycleLabel = BET_LIFECYCLE_LABELS[lifecycle] ?? row.bet.status;

  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      {/* Goals column */}
      <div>
        {row.loading && row.bet.linked_okr_id ? (
          <SkeletonCell />
        ) : row.okr ? (
          <CellCard
            title={row.okr.title}
            subtitle={row.okr.status ?? undefined}
            url={row.okr.url}
            accent={row.okr.key_results_count > 0 ? `${row.okr.key_results_count} KRs` : undefined}
          />
        ) : (
          <UnlinkedCell />
        )}
      </div>

      {/* Bets column */}
      <div>
        <CellCard title={row.bet.title} subtitle={lifecycleLabel} />
      </div>

      {/* Build column */}
      <div className="space-y-2">
        {row.loading && (row.bet.linked_outcome_ids?.length ?? 0) > 0 ? (
          <SkeletonCell />
        ) : row.outcomes.length > 0 ? (
          row.outcomes.map((o) => (
            <CellCard key={o.id} title={o.title} url={o.url} />
          ))
        ) : (
          <UnlinkedCell />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Altitude() {
  const { data: bets = [], isLoading } = useActiveBets();
  const [rows, setRows] = useState<AltitudeRow[]>([]);

  // Hydrate cross-app data
  useEffect(() => {
    if (bets.length === 0) { setRows([]); return; }

    // Initialize rows with loading state
    const initial: AltitudeRow[] = bets.map((bet) => ({
      bet,
      okr: null,
      outcomes: [],
      loading: !!(bet.linked_okr_id || (bet.linked_outcome_ids && bet.linked_outcome_ids.length > 0)),
    }));
    setRows(initial);

    // Fetch cross-app data
    (async () => {
      const updated = await Promise.all(
        bets.map(async (bet) => {
          let okr: LinkedOKR | null = null;
          let outcomes: LinkedOutcome[] = [];

          if (bet.linked_okr_id) {
            okr = await fetchLinkedOKR(bet.linked_okr_id);
          }
          if (bet.linked_outcome_ids && bet.linked_outcome_ids.length > 0) {
            outcomes = await fetchLinkedOutcomes(bet.linked_outcome_ids);
          }

          return { bet, okr, outcomes, loading: false } as AltitudeRow;
        }),
      );
      setRows(updated);
    })();
  }, [bets]);

  const linkedCount = rows.filter((r) => r.okr || r.outcomes.length > 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Altitude View</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Full altitude stack — Goals, Bets, and Build — visible in one place.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <SkeletonCell />
              <SkeletonCell />
              <SkeletonCell />
            </div>
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No active bets yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create a bet to start building altitude connections.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Column headers */}
          <div className="grid grid-cols-3 gap-4">
            <ColumnHeader label="Goals" subtitle="TrueNorthOS" />
            <ColumnHeader label="Bets" subtitle="Build Authority" />
            <ColumnHeader label="Build" subtitle="OutcomeOS" />
          </div>

          {/* Rows */}
          <div className="space-y-4">
            {rows.map((row) => (
              <AltitudeRowView key={row.bet.id} row={row} />
            ))}
          </div>

          {/* Summary */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {linkedCount} of {bets.length} bet{bets.length !== 1 ? "s" : ""} connected across altitudes.
              {linkedCount < bets.length && (
                <span className="ml-1">Open a bet to link it to an OKR or outcome.</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
