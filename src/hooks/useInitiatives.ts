import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { BetInitiative } from "@/lib/types";
import { isClosedBetLifecycle } from "@/lib/bet-status";
import { recalculateBetState } from "@/lib/outcome-engine/recalculateBetState";

export interface InitiativeWithBet extends BetInitiative {
  bet: {
    id: string;
    title: string | null;
    bet_label: string | null;
    status: string;
    created_at: string;
  };
}

/**
 * Workspace-scoped: every initiative across every active bet in the current
 * org. Closed bets are filtered out — their initiatives aren't actionable.
 * Sorted by parent bet (created_at order), then roadmap_position within bet.
 */
export function useAllInitiatives() {
  const { currentOrg } = useOrg();
  return useQuery<InitiativeWithBet[]>({
    queryKey: ["all_initiatives", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("bet_initiatives")
        .select(
          "*, decisions!inner(id, title, bet_label, status, org_id, created_at)",
        )
        .eq("decisions.org_id", currentOrg.id);
      if (error) throw error;
      const rows = ((data ?? []) as any[]).map((r) => ({
        ...r,
        bet: {
          id: r.decisions.id,
          title: r.decisions.title,
          bet_label: r.decisions.bet_label,
          status: r.decisions.status,
          created_at: r.decisions.created_at,
        },
      })) as InitiativeWithBet[];
      // Drop closed bets — they're not part of the active execution surface.
      const active = rows.filter((r) => !isClosedBetLifecycle(r.bet.status));
      // Order: parent bet's created_at ASC (matches portfolio numbering),
      // then roadmap_position within the bet.
      return active.sort((a, b) => {
        const ba = new Date(a.bet.created_at).getTime();
        const bb = new Date(b.bet.created_at).getTime();
        if (ba !== bb) return ba - bb;
        return a.roadmap_position - b.roadmap_position;
      });
    },
    enabled: !!currentOrg,
  });
}

export function useInitiatives(betId: string | undefined) {
  const { currentOrg } = useOrg();
  return useQuery<BetInitiative[]>({
    queryKey: ["bet_initiatives", betId],
    queryFn: async () => {
      if (!currentOrg || !betId) return [];
      const { data, error } = await supabase
        .from("bet_initiatives")
        .select("*")
        .eq("bet_id", betId)
        .order("roadmap_position", { ascending: true });
      if (error) throw error;
      return (data || []) as BetInitiative[];
    },
    enabled: !!currentOrg && !!betId,
  });
}

export function useAddInitiative(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      description: string;
      aligned_outcomes?: string[];
      value?: number;
      confidence?: number;
      effort?: number;
      owner?: string | null;
      owner_user_id?: string | null;
      status?: string | null;
      title?: string | null;
      acceptance_signal?: string | null;
    }) => {
      if (!betId) throw new Error("No betId");
      const { error } = await supabase.from("bet_initiatives").insert({
        bet_id: betId,
        description: input.description,
        aligned_outcomes: input.aligned_outcomes ?? [],
        value: input.value ?? 5,
        confidence: input.confidence ?? 0.5,
        effort: Math.max(1, input.effort ?? 5),
        owner: input.owner ?? null,
        owner_user_id: input.owner_user_id ?? null,
        status: input.status ?? null,
        title: input.title ?? null,
        acceptance_signal: input.acceptance_signal ?? null,
      } as any);
      if (error) throw error;
      await recalculateBetState(betId, "INITIATIVE_ADDED", supabase);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}

export function useUpdateInitiative(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BetInitiative> & { id: string }) => {
      if (!betId) throw new Error("No betId");
      // Enforce effort floor
      if (updates.effort !== undefined) updates.effort = Math.max(1, updates.effort);
      const { error } = await supabase
        .from("bet_initiatives")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await recalculateBetState(betId, "INITIATIVE_UPDATED", supabase);
    },
    // Optimistic update: reflect new V/C/E values instantly
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ["bet_initiatives", betId] });
      const previous = qc.getQueryData<BetInitiative[]>(["bet_initiatives", betId]);
      if (previous) {
        qc.setQueryData<BetInitiative[]>(["bet_initiatives", betId], (old) =>
          (old ?? []).map((init) =>
            init.id === id ? { ...init, ...updates } : init,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["bet_initiatives", betId], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}

export function useDeleteInitiative(betId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!betId) throw new Error("No betId");
      const { error } = await supabase.from("bet_initiatives").delete().eq("id", id);
      if (error) throw error;
      await recalculateBetState(betId, "INITIATIVE_DELETED", supabase);
    },
    // Optimistic: remove card immediately
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["bet_initiatives", betId] });
      const previous = qc.getQueryData<BetInitiative[]>(["bet_initiatives", betId]);
      if (previous) {
        qc.setQueryData<BetInitiative[]>(["bet_initiatives", betId], (old) =>
          (old ?? []).filter((init) => init.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(["bet_initiatives", betId], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bet_initiatives", betId] });
      qc.invalidateQueries({ queryKey: ["score_history", betId] });
      qc.invalidateQueries({ queryKey: ["bet_monitoring", betId] });
    },
  });
}
