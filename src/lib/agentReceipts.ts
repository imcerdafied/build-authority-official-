import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/integrations/supabase/client";

// Agent-receipt ledger writer. A receipt is a normalized provenance record:
// who (actor) did what (action) to which entity (target), from where (source),
// when. This mirrors the System_ (bsos) ledger shape so the trail reads the
// same across the BSPG trio.
//
// Writes are FAIL-OPEN: a ledger problem must never break the mutation that
// triggered it. Every error is swallowed (and logged) so an automated action
// like a bet re-scoring always completes even if the receipt insert fails.

export type ActorType = "user" | "agent" | "system" | "service";

export interface ReceiptInput {
  orgId: string;
  action: string; // required: dotted verb, e.g. "bet.initiatives.rescored"
  actorType?: ActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  source?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Record a single agent receipt. Fail-open: returns silently on any error.
 * Pass an explicit client (e.g. a service-role client inside an edge function)
 * or rely on the default authenticated browser client.
 */
export async function recordReceipt(
  receipt: ReceiptInput,
  client: SupabaseClient = defaultClient,
): Promise<void> {
  try {
    if (!receipt?.action || !receipt?.orgId) return; // both required
    const row = {
      org_id: receipt.orgId,
      actor_type: receipt.actorType ?? "system",
      actor_id: receipt.actorId != null ? String(receipt.actorId) : null,
      actor_label: receipt.actorLabel ?? null,
      action: receipt.action,
      target_type: receipt.targetType ?? null,
      target_id: receipt.targetId != null ? String(receipt.targetId) : null,
      target_label: receipt.targetLabel ?? null,
      source: receipt.source ?? null,
      summary: receipt.summary ?? null,
      metadata: receipt.metadata ?? {},
    };
    const { error } = await client.from("agent_receipts").insert(row as never);
    if (error) console.error("[agent-receipt]", error.message);
  } catch (err) {
    console.error("[agent-receipt]", err instanceof Error ? err.message : err);
  }
}
