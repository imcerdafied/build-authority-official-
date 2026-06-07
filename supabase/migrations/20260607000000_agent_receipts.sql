-- 20260607000000_agent_receipts.sql
-- Agent-receipt ledger: a normalized, cross-entity provenance trail. Every
-- agent/system action (an automated bet re-scoring, an Outcomes_ sync, a
-- scheduled job, an MCP tool call) writes a receipt: who did what to which
-- entity, from where, and when. This is distinct from the entity-specific
-- logs (score_history, decision_activity) which capture per-field deltas.
-- This is one consistent shape across entities, built for a calm "what have
-- the agents done in this workspace" read surface.
--
-- Scope: org_id (this app's tenant). RLS is ENABLED WITH POLICIES that mirror
-- the peer org-scoped tables (intel_sources, intel_insights, etc.): org
-- members can read and write receipts for their own org via is_org_member().
-- The Authority_ SPA has no service-role server, so writes happen from the
-- authenticated client (RLS-allowed) or from edge functions (service role,
-- which bypasses RLS). The insert policy keeps the SPA path safe by tenant.

create table if not exists public.agent_receipts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  actor_type    text not null default 'system',  -- 'user' | 'agent' | 'system' | 'service'
  actor_id      text,                            -- user id / agent name
  actor_label   text,                            -- human label e.g. "Outcome Engine", "Outcomes_ sync"
  action        text not null,                   -- dotted verb e.g. 'bet.initiatives.rescored'
  target_type   text,                            -- 'bet' | 'initiative' | 'decision' | ...
  target_id     text,                            -- uuid as text
  target_label  text,
  source        text,                            -- 'outcome_engine' | 'outcomes' | 'mcp' | 'scheduled' | 'manual'
  summary       text,                            -- one-line human-readable receipt
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists agent_receipts_org_created_idx
  on public.agent_receipts (org_id, created_at desc);
create index if not exists agent_receipts_actor_type_idx
  on public.agent_receipts (actor_type);
create index if not exists agent_receipts_action_idx
  on public.agent_receipts (action);

alter table public.agent_receipts enable row level security;

-- Mirror the intel_* tables: org members can read receipts for their org.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'agent_receipts'
      and policyname = 'Org members can read agent_receipts'
  ) then
    create policy "Org members can read agent_receipts" on public.agent_receipts
      for select to authenticated
      using (public.is_org_member(auth.uid(), org_id));
  end if;

  -- Org members can insert receipts for their own org. Receipts are append-only
  -- from the client path; updates and deletes are not granted to authenticated
  -- (service role bypasses RLS for any future backfill or retention job).
  if not exists (
    select 1 from pg_policies
    where tablename = 'agent_receipts'
      and policyname = 'Org members can insert agent_receipts'
  ) then
    create policy "Org members can insert agent_receipts" on public.agent_receipts
      for insert to authenticated
      with check (public.is_org_member(auth.uid(), org_id));
  end if;
end $$;
