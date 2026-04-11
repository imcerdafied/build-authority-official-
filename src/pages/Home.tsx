import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  fetchOKRSummary,
  fetchOutcomeSummary,
  type OKRSummary,
  type OutcomeSummary,
} from "@/lib/crossApp";
import ActivityFeed from "@/components/ActivityFeed";

// ---------------------------------------------------------------------------
// App URLs (same as SharedNav)
// ---------------------------------------------------------------------------

const GOALS_URL = import.meta.env.VITE_TRUENORTHOS_URL ?? "https://truenorthos.vercel.app";
const BUILD_URL = import.meta.env.VITE_OUTCOMEOS_URL ?? "https://outcomeos.vercel.app";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useLocalBetStats() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["home-bet-stats", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return { active: 0, avgScore: 0, drifting: 0 };
      const { data } = await supabase
        .from("decisions")
        .select("id,status,score")
        .eq("org_id", currentOrg.id)
        .neq("status", "closed");
      const bets = data ?? [];
      const scores = bets.map((b: any) => b.score).filter((s: any) => typeof s === "number" && s > 0);
      const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
      return {
        active: bets.length,
        avgScore: Math.round(avg * 10) / 10,
        drifting: 0, // drift detection is computed client-side in the main hook
      };
    },
    enabled: !!currentOrg,
  });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted/60 rounded ${className ?? "h-5 w-12"}`} />;
}

function AltitudeCard({
  icon,
  label,
  subtitle,
  stats,
  linkLabel,
  linkHref,
  external,
}: {
  icon: string;
  label: string;
  subtitle: string;
  stats: { label: string; value: string | number | null }[];
  linkLabel: string;
  linkHref: string;
  external?: boolean;
}) {
  const content = (
    <div className="border border-border/60 rounded-lg p-5 hover:border-foreground/20 transition-colors h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2 flex-1">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            {s.value === null ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <span className="text-sm font-medium">{s.value}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border/40">
        <span className="text-xs font-medium text-foreground hover:text-foreground/70">
          {linkLabel} →
        </span>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={linkHref} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return <Link to={linkHref}>{content}</Link>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const { currentOrg } = useOrg();
  const { data: betStats, isLoading: betsLoading } = useLocalBetStats();
  const [okrSummary, setOkrSummary] = useState<OKRSummary | null | undefined>(undefined);
  const [outcomeSummary, setOutcomeSummary] = useState<OutcomeSummary | null | undefined>(undefined);

  useEffect(() => {
    fetchOKRSummary().then(setOkrSummary);
    fetchOutcomeSummary().then(setOutcomeSummary);
  }, []);

  const okrCount = okrSummary === undefined ? null : okrSummary?.active ?? "—";
  const outcomeCount = outcomeSummary === undefined ? null : outcomeSummary?.total ?? "—";
  const betCount = betsLoading ? null : betStats?.active ?? 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Section 1 — System Status Bar */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-widest text-foreground">
          BSPG Strategic OS
        </span>
        {currentOrg && (
          <>
            <span className="text-muted-foreground/30">|</span>
            <span>{currentOrg.name}</span>
          </>
        )}
        <span className="text-muted-foreground/30">|</span>
        <span>
          Goals: {okrCount === null ? <Skeleton className="inline-block h-3 w-6" /> : <strong className="text-foreground">{okrCount}</strong>} OKRs
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span>
          Bets: {betCount === null ? <Skeleton className="inline-block h-3 w-6" /> : <strong className="text-foreground">{betCount}</strong>} active
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span>
          Build: {outcomeCount === null ? <Skeleton className="inline-block h-3 w-6" /> : <strong className="text-foreground">{outcomeCount}</strong>} outcomes
        </span>
      </div>

      {/* Section 2 — Altitude Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AltitudeCard
          icon="🎯"
          label="Goals"
          subtitle="TrueNorthOS"
          stats={[
            { label: "Active OKRs", value: okrSummary === undefined ? null : okrSummary?.active ?? "—" },
            { label: "Closed", value: okrSummary === undefined ? null : okrSummary?.closed ?? "—" },
          ]}
          linkLabel="Open Goals"
          linkHref={GOALS_URL}
          external
        />
        <AltitudeCard
          icon="⚡"
          label="Bets"
          subtitle="Build Authority"
          stats={[
            { label: "Active bets", value: betsLoading ? null : betStats?.active ?? 0 },
            { label: "Avg score", value: betsLoading ? null : betStats?.avgScore ?? "—" },
          ]}
          linkLabel="Open Bets"
          linkHref="/decisions"
        />
        <AltitudeCard
          icon="🔨"
          label="Build"
          subtitle="OutcomeOS"
          stats={[
            { label: "Outcomes", value: outcomeSummary === undefined ? null : outcomeSummary?.total ?? "—" },
          ]}
          linkLabel="Open Build"
          linkHref={BUILD_URL}
          external
        />
      </div>

      {/* Section 3 — Cross-Altitude Activity Feed */}
      <div className="border border-border/60 rounded-lg p-5">
        <ActivityFeed maxItems={15} showHeader />
      </div>
    </div>
  );
}
