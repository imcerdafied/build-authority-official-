import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://buildauthorityos.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    keys.join(","),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const expectedSecret = Deno.env.get("BACKUP_CRON_SECRET");
    const providedSecret = req.headers.get("x-backup-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const results: string[] = [];

    // Fetch all orgs and scope backup per org
    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id, name");
    if (orgError) {
      return new Response(JSON.stringify({ error: "Failed to fetch organizations" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tables = ["decisions", "signals", "pods", "pod_initiatives", "closed_decisions", "decision_events"];

    for (const org of orgs || []) {
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").eq("org_id", org.id);
        if (error) {
          console.error(`Error fetching ${table} for org ${org.id}:`, error.message);
          continue;
        }
        if (!data?.length) continue;

        const csv = toCsv(data);
        const safeName = (org.name || org.id).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
        const path = `${stamp}/${safeName}/${table}.csv`;
        const { error: uploadError } = await supabase.storage
          .from("data-backups")
          .upload(path, new Blob([csv], { type: "text/csv" }), {
            contentType: "text/csv",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${table} (org ${org.id}):`, uploadError.message);
        } else {
          results.push(path);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, files: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backup failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
