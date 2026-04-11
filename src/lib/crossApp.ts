// ---------------------------------------------------------------------------
// Cross-App Data Fetching — Workstream 3 Integration Layer
// Connects Build Authority (Bets) ↔ TrueNorthOS (Goals) ↔ OutcomeOS (Build)
// ---------------------------------------------------------------------------

// TrueNorthOS
const TNO_URL = 'https://higwlcptcuwnsrkbxsjl.supabase.co';
const TNO_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZ3dsY3B0Y3V3bnNya2J4c2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTQ3NDIsImV4cCI6MjA4NTk5MDc0Mn0.HJ0DxaZ88Ph03yTDiZ7cwlmX3nAdGleRZ8sjnelb8cA';

// OutcomeOS
const OOS_URL = 'https://fjctxppiyqexuqlqdixb.supabase.co';
const OOS_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqY3R4cHBpeXFleHVxbHFkaXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzAyOTAsImV4cCI6MjA4NjYwNjI5MH0.ef_xvTcAbd3CPtcYH53yvW2VEE6zN9Lm7HyUem0N7Rc';

// Build Authority (for reverse lookups from satellite apps)
const BA_URL = 'https://rqhmegnxtdlvytpxamjn.supabase.co';
const BA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxaG1lZ254dGRsdnl0cHhhbWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTA5NTIsImV4cCI6MjA4Njc2Njk1Mn0.l89Cdxn3TM7-UvHFyodRwvNOy9FZfq4jpuyxLieT6ww';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkedOKR {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  progress_percentage: number | null;
  key_results_count: number;
  app: 'truenorthos';
  url: string;
}

export interface LinkedOutcome {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  confidence_score: number | null;
  app: 'outcomeOS';
  url: string;
}

export interface LinkedBet {
  id: string;
  title: string;
  status: string;
  score: number | null;
  app: 'build_authority';
  url: string;
}

// ---------------------------------------------------------------------------
// Session cache
// ---------------------------------------------------------------------------

const okrCache = new Map<string, LinkedOKR | null>();
const outcomeCache = new Map<string, LinkedOutcome | null>();
const betCache = new Map<string, LinkedBet | null>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 3000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchLinkedOKR(okrId: string): Promise<LinkedOKR | null> {
  if (okrCache.has(okrId)) return okrCache.get(okrId)!;
  try {
    const headers = { apikey: TNO_ANON, Authorization: `Bearer ${TNO_ANON}` };
    const res = await fetchWithTimeout(
      `${TNO_URL}/rest/v1/okrs?id=eq.${okrId}&select=id,objective_text,status`,
      headers,
    );
    if (!res.ok) { okrCache.set(okrId, null); return null; }
    const rows = await res.json();
    if (!rows || rows.length === 0) { okrCache.set(okrId, null); return null; }
    const row = rows[0];

    // Fetch key results count
    let krCount = 0;
    try {
      const krRes = await fetchWithTimeout(
        `${TNO_URL}/rest/v1/key_results?okr_id=eq.${okrId}&select=id`,
        headers,
      );
      if (krRes.ok) {
        const krs = await krRes.json();
        krCount = Array.isArray(krs) ? krs.length : 0;
      }
    } catch { /* non-critical */ }

    const linked: LinkedOKR = {
      id: row.id,
      title: row.objective_text ?? '',
      description: null,
      status: row.status ?? null,
      progress_percentage: null,
      key_results_count: krCount,
      app: 'truenorthos',
      url: `https://truenorthos.vercel.app/okrs/${row.id}`,
    };
    okrCache.set(okrId, linked);
    return linked;
  } catch {
    okrCache.set(okrId, null);
    return null;
  }
}

export async function fetchLinkedOutcomes(outcomeIds: string[]): Promise<LinkedOutcome[]> {
  if (outcomeIds.length === 0) return [];
  const results: LinkedOutcome[] = [];
  const toFetch: string[] = [];

  for (const id of outcomeIds) {
    if (outcomeCache.has(id)) {
      const cached = outcomeCache.get(id);
      if (cached) results.push(cached);
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    try {
      const idList = toFetch.map((id) => `"${id}"`).join(',');
      const headers = { apikey: OOS_ANON, Authorization: `Bearer ${OOS_ANON}` };
      const res = await fetchWithTimeout(
        `${OOS_URL}/rest/v1/outcomes?id=in.(${idList})&select=id,title,description`,
        headers,
      );
      if (res.ok) {
        const rows = await res.json();
        for (const row of rows) {
          const linked: LinkedOutcome = {
            id: row.id,
            title: row.title ?? '',
            description: row.description ?? null,
            status: null,
            confidence_score: null,
            app: 'outcomeOS',
            url: `https://outcomeos.vercel.app/outcomes?id=${row.id}`,
          };
          outcomeCache.set(row.id, linked);
          results.push(linked);
        }
        // Mark unfound IDs
        for (const id of toFetch) {
          if (!outcomeCache.has(id)) outcomeCache.set(id, null);
        }
      }
    } catch { /* graceful degradation */ }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Cross-app summary counts (for Command Center)
// ---------------------------------------------------------------------------

export interface OKRSummary {
  total: number;
  active: number;
  closed: number;
}

export interface OutcomeSummary {
  total: number;
}

export async function fetchOKRSummary(): Promise<OKRSummary | null> {
  try {
    const headers = { apikey: TNO_ANON, Authorization: `Bearer ${TNO_ANON}` };
    const res = await fetchWithTimeout(
      `${TNO_URL}/rest/v1/okrs?select=id,status`,
      headers,
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    return {
      total: rows.length,
      active: rows.filter((r: any) => r.status === 'active').length,
      closed: rows.filter((r: any) => r.status === 'closed').length,
    };
  } catch {
    return null;
  }
}

export async function fetchOutcomeSummary(): Promise<OutcomeSummary | null> {
  try {
    const headers = { apikey: OOS_ANON, Authorization: `Bearer ${OOS_ANON}` };
    const res = await fetchWithTimeout(
      `${OOS_URL}/rest/v1/outcomes?select=id`,
      headers,
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    return { total: rows.length };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cross-app activity events (for Activity Feed)
// ---------------------------------------------------------------------------

export interface CrossAppEvent {
  id: string;
  altitude: 'goals' | 'bets' | 'build';
  type: string;
  description: string;
  timestamp: string;
}

export async function fetchTNORecentActivity(): Promise<CrossAppEvent[]> {
  const events: CrossAppEvent[] = [];
  const headers = { apikey: TNO_ANON, Authorization: `Bearer ${TNO_ANON}` };
  try {
    // Recent OKRs
    const okrRes = await fetchWithTimeout(
      `${TNO_URL}/rest/v1/okrs?select=id,objective_text,created_at&order=created_at.desc&limit=5`,
      headers,
    );
    if (okrRes.ok) {
      const rows = await okrRes.json();
      for (const r of rows) {
        events.push({
          id: `tno-okr-${r.id}`,
          altitude: 'goals',
          type: 'okr_created',
          description: `New OKR: ${r.objective_text}`,
          timestamp: r.created_at,
        });
      }
    }
  } catch { /* graceful */ }
  try {
    // Recent check-ins
    const ciRes = await fetchWithTimeout(
      `${TNO_URL}/rest/v1/check_ins?select=id,created_at,okr_id&order=created_at.desc&limit=5`,
      headers,
    );
    if (ciRes.ok) {
      const rows = await ciRes.json();
      for (const r of rows) {
        events.push({
          id: `tno-ci-${r.id}`,
          altitude: 'goals',
          type: 'checkin_added',
          description: `Check-in added for OKR`,
          timestamp: r.created_at,
        });
      }
    }
  } catch { /* graceful */ }
  return events;
}

export async function fetchOOSRecentActivity(): Promise<CrossAppEvent[]> {
  const events: CrossAppEvent[] = [];
  const headers = { apikey: OOS_ANON, Authorization: `Bearer ${OOS_ANON}` };
  try {
    const res = await fetchWithTimeout(
      `${OOS_URL}/rest/v1/outcomes?select=id,title,created_at&order=created_at.desc&limit=5`,
      headers,
    );
    if (res.ok) {
      const rows = await res.json();
      for (const r of rows) {
        events.push({
          id: `oos-${r.id}`,
          altitude: 'build',
          type: 'outcome_created',
          description: `New outcome: ${r.title}`,
          timestamp: r.created_at,
        });
      }
    }
  } catch { /* graceful */ }
  return events;
}

// ---------------------------------------------------------------------------
// Single-bet fetch (for satellite apps)
// ---------------------------------------------------------------------------

export async function fetchLinkedBet(betId: string): Promise<LinkedBet | null> {
  if (betCache.has(betId)) return betCache.get(betId)!;
  try {
    const headers = { apikey: BA_ANON, Authorization: `Bearer ${BA_ANON}` };
    const res = await fetchWithTimeout(
      `${BA_URL}/rest/v1/decisions?id=eq.${betId}&select=id,title,status,score`,
      headers,
    );
    if (!res.ok) { betCache.set(betId, null); return null; }
    const rows = await res.json();
    if (!rows || rows.length === 0) { betCache.set(betId, null); return null; }
    const row = rows[0];
    const linked: LinkedBet = {
      id: row.id,
      title: row.title ?? '',
      status: row.status ?? 'unknown',
      score: row.score ?? null,
      app: 'build_authority',
      url: `https://buildauthority.vercel.app/decisions?bet=${row.id}`,
    };
    betCache.set(betId, linked);
    return linked;
  } catch {
    betCache.set(betId, null);
    return null;
  }
}
