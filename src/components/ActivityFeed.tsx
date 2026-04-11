import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  fetchTNORecentActivity,
  fetchOOSRecentActivity,
  type CrossAppEvent,
} from "@/lib/crossApp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityFeedProps {
  maxItems?: number;
  showHeader?: boolean;
}

const ALTITUDE_CONFIG = {
  goals: { label: "Goals", color: "bg-teal-100 text-teal-700" },
  bets: { label: "Bets", color: "bg-blue-100 text-blue-700" },
  build: { label: "Build", color: "bg-purple-100 text-purple-700" },
} as const;

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActivityFeed({ maxItems = 15, showHeader = true }: ActivityFeedProps) {
  const { currentOrg } = useOrg();
  const [crossAppEvents, setCrossAppEvents] = useState<CrossAppEvent[]>([]);
  const [crossAppLoading, setCrossAppLoading] = useState(true);

  // Local Build Authority events
  const { data: localEvents = [], isLoading: localLoading } = useQuery({
    queryKey: ["activity-feed-local", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const events: CrossAppEvent[] = [];

      // Recent bets created
      const { data: bets } = await supabase
        .from("decisions")
        .select("id,title,created_at")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10);
      for (const b of bets ?? []) {
        events.push({
          id: `ba-new-${b.id}`,
          altitude: "bets",
          type: "bet_created",
          description: `New bet: ${b.title}`,
          timestamp: b.created_at,
        });
      }

      // Recent status changes (updated in last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: updated } = await supabase
        .from("decisions")
        .select("id,title,status,updated_at")
        .eq("org_id", currentOrg.id)
        .gt("updated_at", weekAgo)
        .order("updated_at", { ascending: false })
        .limit(10);
      for (const u of updated ?? []) {
        // Avoid duplicating with created events
        if (u.updated_at !== u.created_at) {
          events.push({
            id: `ba-upd-${u.id}-${u.updated_at}`,
            altitude: "bets",
            type: "bet_updated",
            description: `Updated: ${u.title}`,
            timestamp: u.updated_at,
          });
        }
      }

      return events;
    },
    enabled: !!currentOrg,
  });

  // Cross-app events
  useEffect(() => {
    setCrossAppLoading(true);
    Promise.all([fetchTNORecentActivity(), fetchOOSRecentActivity()])
      .then(([tno, oos]) => setCrossAppEvents([...tno, ...oos]))
      .catch(() => setCrossAppEvents([]))
      .finally(() => setCrossAppLoading(false));
  }, []);

  const allEvents = [...localEvents, ...crossAppEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);

  const loading = localLoading || crossAppLoading;

  return (
    <div>
      {showHeader && (
        <div className="mb-3">
          <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            Recent Activity
          </h3>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-5 w-12 bg-muted/60 rounded" />
              <div className="h-4 bg-muted/40 rounded flex-1" />
              <div className="h-3 w-14 bg-muted/30 rounded" />
            </div>
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No recent activity — create your first bet to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {allEvents.map((event) => {
            const cfg = ALTITUDE_CONFIG[event.altitude];
            return (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${cfg.color} shrink-0 min-w-[52px] text-center`}
                >
                  {cfg.label}
                </span>
                <p className="text-sm text-foreground truncate flex-1">
                  {event.description}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                  {timeAgo(event.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
