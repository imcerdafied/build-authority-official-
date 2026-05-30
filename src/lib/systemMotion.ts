export interface SystemBetMotion {
  bet: { id: string | null; key: string | null; title: string | null };
  summary: {
    outcomes_linked: number;
    roadmap: { total: number; open: number; waiting: number; done: number };
    gtm: { total: number; open: number; waiting: number; done: number };
    blockers: number;
    proof_points: number;
    owner: string | null;
    latest_movement_at: string | null;
  };
  roadmap_items: Array<{
    id: string;
    item_code: string | null;
    title: string;
    workstream: string | null;
    status: string;
    owner: string | null;
    outcomeos_roadmap_item_id: string | null;
    latest_movement_at: string | null;
  }>;
  gtm_items: Array<{
    id: string;
    target: string;
    lane: string;
    owner: string | null;
    next_move: string | null;
    needs_from: string | null;
    proof_point: string | null;
    latest_movement_at: string | null;
  }>;
  blockers: Array<{
    id: string;
    target: string;
    lane: string;
    needs_from: string | null;
    owner: string | null;
  }>;
}

const SYSTEM_API_URL = (import.meta.env.VITE_SYSTEM_API_URL || "https://os.bspg.build").replace(/\/$/, "");

export async function fetchSystemBetMotion(args: {
  betId: string;
  betTitle: string;
  betKey?: string | null;
}): Promise<SystemBetMotion | null> {
  const params = new URLSearchParams();
  if (args.betId) params.set("bet_id", args.betId);
  if (args.betTitle) params.set("bet_title", args.betTitle);
  if (args.betKey) params.set("bet_key", args.betKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${SYSTEM_API_URL}/api/public/authority/bet-motion?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
