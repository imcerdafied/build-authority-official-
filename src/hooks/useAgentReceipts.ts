import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

// Org-scoped read of the agent-receipt ledger. RLS already restricts rows to
// the caller's orgs; we also filter on org_id explicitly so the query layer
// scopes (not just the UI), matching how the peer hooks in this app work.

export interface AgentReceipt {
  id: string;
  org_id: string;
  actor_type: string;
  actor_id: string | null;
  actor_label: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  source: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useAgentReceipts(options?: { agentsOnly?: boolean; limit?: number }) {
  const { currentOrg } = useOrg();
  const agentsOnly = options?.agentsOnly ?? false;
  const limit = Math.min(options?.limit ?? 50, 200);

  return useQuery<AgentReceipt[]>({
    queryKey: ["agent_receipts", currentOrg?.id, agentsOnly, limit],
    queryFn: async () => {
      if (!currentOrg) return [];
      let query = supabase
        .from("agent_receipts")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (agentsOnly) query = query.eq("actor_type", "agent");
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as unknown as AgentReceipt[];
    },
    enabled: !!currentOrg,
  });
}
