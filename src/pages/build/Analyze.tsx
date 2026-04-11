import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntelSource {
  id: string;
  org_id: string;
  name: string;
  source_type: string;
  content: string;
  processing_status: string;
  uploaded_by: string | null;
  created_at: string;
}

interface FrictionPoint {
  id: string;
  org_id: string;
  source_id: string;
  title: string;
  summary: string;
  severity: string;
  cluster: string | null;
  confidence_score: number;
  created_at: string;
}

interface Insight {
  id: string;
  org_id: string;
  source_id: string;
  title: string;
  summary: string;
  severity: string;
  confidence_score: number;
  created_at: string;
}

interface Hypothesis {
  id: string;
  org_id: string;
  source_id: string;
  title: string;
  description: string;
  expected_impact: string | null;
  value_score: number;
  effort_score: number;
  v_squared: number;
  confidence_score: number;
  promoted_to_roadmap: boolean;
  promoted_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Claude API analysis
// ---------------------------------------------------------------------------

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function analyzeSource(
  content: string,
  sourceName: string,
): Promise<{
  friction_points: Array<{
    title: string;
    summary: string;
    severity: "low" | "medium" | "high" | "critical";
    cluster: string;
    confidence_score: number;
  }>;
  insights: Array<{
    title: string;
    summary: string;
    severity: "low" | "medium" | "high" | "critical";
    confidence_score: number;
  }>;
  hypotheses: Array<{
    title: string;
    description: string;
    expected_impact: string;
    value_score: number;
    effort_score: number;
    confidence_score: number;
  }>;
}> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: `You are an expert product strategist. Analyze source documents to extract actionable intelligence for product teams.

You MUST respond with ONLY valid JSON and nothing else — no preamble, no explanation, no markdown fences.`,
      messages: [
        {
          role: "user",
          content: `Analyze this source document and extract product intelligence.

SOURCE: "${sourceName}"

CONTENT:
${content.slice(0, 8000)}

Return a JSON object with exactly this structure:
{
  "friction_points": [
    {
      "title": "Brief title (8 words max)",
      "summary": "What the friction is and why it matters (2-3 sentences)",
      "severity": "low|medium|high|critical",
      "cluster": "Theme or category this belongs to",
      "confidence_score": 0.0-1.0
    }
  ],
  "insights": [
    {
      "title": "Brief title (8 words max)",
      "summary": "What was learned and what it signals (2-3 sentences)",
      "severity": "low|medium|high|critical",
      "confidence_score": 0.0-1.0
    }
  ],
  "hypotheses": [
    {
      "title": "If we build X... (10 words max)",
      "description": "Full hypothesis statement explaining what we'd build and why (2-3 sentences)",
      "expected_impact": "Specific measurable outcome we'd expect to see",
      "value_score": 1-5,
      "effort_score": 1-5,
      "confidence_score": 0.0-1.0
    }
  ]
}

Rules:
- friction_points: 3-8 items, real pain points from the source material
- insights: 3-6 items, patterns or opportunities observed
- hypotheses: 3-5 items, actionable "if we build X" statements with realistic value/effort scores
- value_score: 5=transformative, 4=significant, 3=meaningful, 2=minor, 1=marginal
- effort_score: 5=very hard/months, 4=hard/weeks, 3=moderate, 2=easy/days, 1=trivial
- confidence_score: how confident are you this is accurate given the source material
- Return ONLY the JSON object. No other text.`,
        },
      ],
    }),
  });

  const data = await response.json();

  // Surface API errors clearly
  if (!response.ok || data.error) {
    const errMsg = data.error?.message ?? `API error ${response.status}`;
    throw new Error(errMsg);
  }
  if (!data.content?.[0]?.text) {
    throw new Error(`Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // Strip code fences in case Claude wraps the JSON
  const raw = data.content[0].text.trim();
  const text = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Quarter helper
// ---------------------------------------------------------------------------

function currentQuarterString(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-500 border-red-500/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type Tab = "sources" | "friction" | "insights" | "hypotheses";

// ---------------------------------------------------------------------------
// Add Source Form
// ---------------------------------------------------------------------------

function AddSourceForm({
  onSubmit,
  onCancel,
  analyzing,
  analyzingStep,
}: {
  onSubmit: (name: string, content: string) => void;
  onCancel: () => void;
  analyzing: boolean;
  analyzingStep: string;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  return (
    <div className="border border-border rounded-md p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3">Add Source</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Q1 Customer Research Synthesis"'
            className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground placeholder:text-muted-foreground/40"
            disabled={analyzing}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Source type
          </label>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 rounded-sm border border-foreground/20 bg-foreground/5 text-foreground">
              Text
            </span>
            <span
              className="text-xs px-2 py-1 rounded-sm border border-border text-muted-foreground/50 cursor-not-allowed"
              title="PDF upload coming soon — paste PDF content as text for now"
            >
              PDF (paste as text)
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your source content here..."
            rows={10}
            className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-foreground placeholder:text-muted-foreground/40 resize-y"
            disabled={analyzing}
          />
        </div>

        {analyzing && (
          <div className="flex items-center gap-2 py-2">
            <div className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">
              {analyzingStep}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(name.trim(), content.trim())}
            disabled={!name.trim() || !content.trim() || analyzing}
            className="text-xs font-semibold px-4 py-2 rounded-sm bg-foreground text-background disabled:opacity-50"
          >
            Analyze
          </button>
          <button
            onClick={onCancel}
            disabled={analyzing}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sources Tab
// ---------------------------------------------------------------------------

function SourcesTab({
  sources,
  frictionCounts,
  insightCounts,
  hypothesisCounts,
  onDelete,
  onRetry,
  isAdmin,
}: {
  sources: IntelSource[];
  frictionCounts: Record<string, number>;
  insightCounts: Record<string, number>;
  hypothesisCounts: Record<string, number>;
  onDelete: (id: string) => void;
  onRetry: (source: IntelSource) => void;
  isAdmin: boolean;
}) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <p className="text-sm text-muted-foreground">No sources yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Upload a document to start extracting insights.
        </p>
        <div className="text-left text-xs text-muted-foreground/60 space-y-1 mt-2">
          <p className="text-xs text-muted-foreground/80 font-medium mb-2">
            What works well:
          </p>
          <p>- User research synthesis or interview transcripts</p>
          <p>- Competitor teardowns or market analysis</p>
          <p>- Support ticket summaries or NPS comments</p>
          <p>- Analytics reports or dashboards exports</p>
          <p>- Strategic memos or planning documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((s) => (
        <div
          key={s.id}
          className="border border-border rounded-sm p-3 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{s.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground shrink-0">
                {s.source_type}
              </span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-sm border shrink-0",
                  s.processing_status === "complete"
                    ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                    : s.processing_status === "failed"
                      ? "border-red-500/30 text-red-500 bg-red-500/10"
                      : s.processing_status === "analyzing"
                        ? "border-blue-500/30 text-blue-500 bg-blue-500/10"
                        : "border-border text-muted-foreground",
                )}
              >
                {s.processing_status}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {s.processing_status === "failed" && (
                <button
                  onClick={() => onRetry(s)}
                  className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors border border-border/60 rounded px-2 py-0.5 hover:border-foreground/30"
                >
                  ↻ Retry
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-xs text-muted-foreground/50 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-xs text-muted-foreground">
              {new Date(s.created_at).toLocaleDateString()}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {frictionCounts[s.id] ?? 0} friction - {insightCounts[s.id] ?? 0}{" "}
              insights - {hypothesisCounts[s.id] ?? 0} hypotheses
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friction Tab
// ---------------------------------------------------------------------------

function FrictionTab({
  frictionPoints,
  sourceMap,
  sourceFilter,
  setSourceFilter,
  search,
  setSearch,
  sources,
}: {
  frictionPoints: FrictionPoint[];
  sourceMap: Record<string, string>;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  sources: IntelSource[];
}) {
  const sorted = useMemo(() => {
    let items = [...frictionPoints];
    if (sourceFilter)
      items = items.filter((f) => f.source_id === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((f) => f.title.toLowerCase().includes(q));
    }
    items.sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 99) -
        (SEVERITY_ORDER[b.severity] ?? 99),
    );
    return items;
  }, [frictionPoints, sourceFilter, search]);

  // Group by cluster
  const grouped = useMemo(() => {
    const map = new Map<string, FrictionPoint[]>();
    for (const fp of sorted) {
      const key = fp.cluster || "Uncategorized";
      const list = map.get(key) ?? [];
      list.push(fp);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [sorted]);

  if (frictionPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No friction points yet.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Add a source to extract friction.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs border border-border rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="text-xs border border-border rounded-sm px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-foreground flex-1 max-w-xs"
        />
      </div>

      <div className="space-y-4">
        {grouped.map(([cluster, items]) => (
          <div key={cluster}>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              {cluster}
            </h3>
            <div className="space-y-2">
              {items.map((fp) => (
                <div
                  key={fp.id}
                  className="border border-border rounded-sm p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold px-1.5 py-0.5 rounded-sm border",
                        SEVERITY_COLORS[fp.severity] ?? SEVERITY_COLORS.low,
                      )}
                    >
                      {fp.severity}
                    </span>
                    <span className="text-sm font-medium">{fp.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {fp.summary}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground/60">
                      {sourceMap[fp.source_id] ?? "Unknown source"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/40 rounded-full"
                          style={{
                            width: `${(fp.confidence_score ?? 0) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground/50 tabular-nums">
                        {Math.round((fp.confidence_score ?? 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights Tab
// ---------------------------------------------------------------------------

function InsightsTab({
  insights,
  sourceMap,
}: {
  insights: Insight[];
  sourceMap: Record<string, string>;
}) {
  const sorted = useMemo(
    () =>
      [...insights].sort(
        (a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0),
      ),
    [insights],
  );

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No insights yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Add a source to extract insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((ins) => (
        <div key={ins.id} className="border border-border rounded-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${(ins.confidence_score ?? 0) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground/50 tabular-nums">
                {Math.round((ins.confidence_score ?? 0) * 100)}%
              </span>
            </div>
            <span className="text-sm font-medium">{ins.title}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {ins.summary}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            {sourceMap[ins.source_id] ?? "Unknown source"}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hypotheses Tab
// ---------------------------------------------------------------------------

function HypothesesTab({
  hypotheses,
  sourceMap,
  onPromote,
  promoting,
}: {
  hypotheses: Hypothesis[];
  sourceMap: Record<string, string>;
  onPromote: (h: Hypothesis) => void;
  promoting: string | null;
}) {
  const sorted = useMemo(
    () => [...hypotheses].sort((a, b) => (b.v_squared ?? 0) - (a.v_squared ?? 0)),
    [hypotheses],
  );

  if (hypotheses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm text-muted-foreground">No hypotheses yet.</p>
        <p className="text-xs text-muted-foreground/60 max-w-sm leading-relaxed">
          Hypotheses are AI-generated "if we build X, we expect Y" statements
          scored by value and effort. Add a source to generate some.
        </p>
        <p className="text-xs text-muted-foreground/40 mt-1">
          The V² score = value² / effort. Prioritize the highest scores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* V² explanation */}
      <div className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 mb-1">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">V² (Priority Score)</span>
          {" "}= value² ÷ effort. A hypothesis with high value and low effort scores highest.
          Scores above 7 are high priority (green), 4–7 are worth considering (amber), below 4 deprioritize.
          Promote the strongest hypotheses directly to your Roadmap.
        </p>
      </div>
      {sorted.map((h) => {
        const v2 = h.v_squared ?? 0;
        const v2Color =
          v2 >= 7
            ? "text-emerald-500"
            : v2 >= 4
              ? "text-amber-500"
              : "text-red-500";

        return (
          <div key={h.id} className="border border-border rounded-md p-4">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={cn("text-lg font-bold tabular-nums", v2Color)}
              >
                V² {v2.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground/50">priority</span>
              <span className="text-xs text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 tabular-nums">
                value: {h.value_score}/5
              </span>
              <span className="text-xs text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 tabular-nums">
                effort: {h.effort_score}/5
              </span>
            </div>

            <p className="text-sm font-semibold mb-1">{h.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {h.description}
            </p>

            {h.expected_impact && (
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                Expected: {h.expected_impact}
              </p>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/60">
                  {sourceMap[h.source_id] ?? "Unknown source"}
                </span>
                <span className="text-xs text-muted-foreground/50 tabular-nums">
                  Confidence: {Math.round((h.confidence_score ?? 0) * 100)}%
                </span>
              </div>

              {h.promoted_to_roadmap ? (
                <span className="text-xs font-semibold px-2 py-1 rounded-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Promoted
                </span>
              ) : (
                <button
                  onClick={() => onPromote(h)}
                  disabled={promoting === h.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-sm border border-foreground/20 hover:bg-foreground/5 transition-colors disabled:opacity-50"
                >
                  {promoting === h.id ? "Promoting..." : "Add to Roadmap"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Analyze() {
  const { user } = useAuth();
  const { currentOrg, currentRole } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const [activeTab, setActiveTab] = useState<Tab>("sources");
  const [showAddForm, setShowAddForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState("");
  const [promoting, setPromoting] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");

  // ---- Data queries ----

  const { data: sources = [], isLoading: srcLoading } = useQuery<IntelSource[]>(
    {
      queryKey: ["intel-sources", orgId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("intel_sources")
          .select("*")
          .eq("org_id", orgId!)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as IntelSource[];
      },
      enabled: !!orgId,
    },
  );

  const { data: frictionPoints = [] } = useQuery<FrictionPoint[]>({
    queryKey: ["intel-friction", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intel_friction_points")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FrictionPoint[];
    },
    enabled: !!orgId,
  });

  const { data: insights = [] } = useQuery<Insight[]>({
    queryKey: ["intel-insights", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intel_insights")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Insight[];
    },
    enabled: !!orgId,
  });

  const { data: hypotheses = [] } = useQuery<Hypothesis[]>({
    queryKey: ["intel-hypotheses", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intel_hypotheses")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Hypothesis[];
    },
    enabled: !!orgId,
  });

  // ---- Derived data ----

  const sourceMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of sources) m[s.id] = s.name;
    return m;
  }, [sources]);

  const frictionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of frictionPoints) m[f.source_id] = (m[f.source_id] ?? 0) + 1;
    return m;
  }, [frictionPoints]);

  const insightCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of insights) m[i.source_id] = (m[i.source_id] ?? 0) + 1;
    return m;
  }, [insights]);

  const hypothesisCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of hypotheses) m[h.source_id] = (m[h.source_id] ?? 0) + 1;
    return m;
  }, [hypotheses]);

  // ---- Handlers ----

  async function handleAnalyze(name: string, content: string) {
    if (!orgId || !user) return;
    setAnalyzing(true);
    setAnalyzingStep("Saving source...");

    const { data: source, error: insertErr } = await supabase
      .from("intel_sources")
      .insert({
        org_id: orgId,
        name,
        source_type: "text",
        content,
        processing_status: "analyzing",
        uploaded_by: user.id,
      } as any)
      .select()
      .single();

    if (insertErr || !source) {
      toast.error("Failed to save source");
      setAnalyzing(false);
      return;
    }

    setAnalyzingStep("Extracting friction points and insights...");

    let result;
    try {
      result = await analyzeSource(content, name);
    } catch (err) {
      await supabase
        .from("intel_sources")
        .update({ processing_status: "failed" } as any)
        .eq("id", source.id);
      toast.error(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      setAnalyzing(false);
      return;
    }

    setAnalyzingStep("Saving results...");

    const sid = source.id;
    await Promise.all([
      result.friction_points.length > 0 &&
        supabase.from("intel_friction_points").insert(
          result.friction_points.map((fp) => ({
            ...fp,
            org_id: orgId,
            source_id: sid,
          })) as any,
        ),
      result.insights.length > 0 &&
        supabase.from("intel_insights").insert(
          result.insights.map((i) => ({
            ...i,
            org_id: orgId,
            source_id: sid,
          })) as any,
        ),
      result.hypotheses.length > 0 &&
        supabase.from("intel_hypotheses").insert(
          result.hypotheses.map((h) => ({
            ...h,
            org_id: orgId,
            source_id: sid,
          })) as any,
        ),
      supabase
        .from("intel_sources")
        .update({ processing_status: "complete" } as any)
        .eq("id", sid),
    ]);

    queryClient.invalidateQueries({ queryKey: ["intel-sources", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-friction", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-insights", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-hypotheses", orgId] });
    setActiveTab("hypotheses");
    setAnalyzing(false);
    setShowAddForm(false);
    toast.success(
      `Analysis complete — ${result.hypotheses.length} hypotheses generated`,
    );
  }

  async function handleRetry(source: IntelSource) {
    if (!orgId || !user) return;
    setAnalyzing(true);
    setAnalyzingStep("Re-analyzing source...");

    // Mark as analyzing
    await supabase
      .from("intel_sources")
      .update({ processing_status: "analyzing" } as any)
      .eq("id", source.id);

    // Clear any partial results from previous attempt
    await Promise.all([
      supabase.from("intel_friction_points").delete().eq("source_id", source.id),
      supabase.from("intel_insights").delete().eq("source_id", source.id),
      supabase.from("intel_hypotheses").delete().eq("source_id", source.id),
    ]);

    setAnalyzingStep("Extracting friction points and insights...");

    let result;
    try {
      result = await analyzeSource(source.content, source.name);
    } catch (err) {
      await supabase
        .from("intel_sources")
        .update({ processing_status: "failed" } as any)
        .eq("id", source.id);
      toast.error(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
      setAnalyzing(false);
      return;
    }

    setAnalyzingStep("Saving results...");

    await Promise.all([
      result.friction_points.length > 0 &&
        supabase.from("intel_friction_points").insert(
          result.friction_points.map((fp) => ({
            ...fp,
            org_id: orgId,
            source_id: source.id,
          })) as any,
        ),
      result.insights.length > 0 &&
        supabase.from("intel_insights").insert(
          result.insights.map((i) => ({
            ...i,
            org_id: orgId,
            source_id: source.id,
          })) as any,
        ),
      result.hypotheses.length > 0 &&
        supabase.from("intel_hypotheses").insert(
          result.hypotheses.map((h) => ({
            ...h,
            org_id: orgId,
            source_id: source.id,
          })) as any,
        ),
      supabase
        .from("intel_sources")
        .update({ processing_status: "complete" } as any)
        .eq("id", source.id),
    ]);

    queryClient.invalidateQueries({ queryKey: ["intel-sources", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-friction", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-insights", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-hypotheses", orgId] });
    setActiveTab("hypotheses");
    setAnalyzing(false);
    toast.success(`Retry complete — ${result.hypotheses.length} hypotheses generated`);
  }

  async function handlePromote(h: Hypothesis) {
    if (!orgId || !user) return;
    setPromoting(h.id);

    const { error: riErr } = await supabase.from("roadmap_items").insert({
      org_id: orgId,
      title: h.title,
      description: h.description,
      quarter: currentQuarterString(),
      status: "planned",
    });

    if (riErr) {
      toast.error("Failed to add to roadmap");
      setPromoting(null);
      return;
    }

    await supabase
      .from("intel_hypotheses")
      .update({
        promoted_to_roadmap: true,
        promoted_at: new Date().toISOString(),
      } as any)
      .eq("id", h.id);

    queryClient.invalidateQueries({ queryKey: ["intel-hypotheses", orgId] });
    queryClient.invalidateQueries({ queryKey: ["roadmap-items", orgId] });
    setPromoting(null);
    toast.success("Added to Roadmap.");
  }

  async function handleDeleteSource(sourceId: string) {
    await supabase.from("intel_friction_points").delete().eq("source_id", sourceId);
    await supabase.from("intel_insights").delete().eq("source_id", sourceId);
    await supabase.from("intel_hypotheses").delete().eq("source_id", sourceId);
    await supabase.from("intel_sources").delete().eq("id", sourceId);

    queryClient.invalidateQueries({ queryKey: ["intel-sources", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-friction", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-insights", orgId] });
    queryClient.invalidateQueries({ queryKey: ["intel-hypotheses", orgId] });
    toast.success("Source deleted");
  }

  // ---- Loading state ----

  if (srcLoading) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        Loading...
      </p>
    );
  }

  // ---- Tabs config ----

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "sources", label: "Sources", count: sources.length },
    { key: "friction", label: "Friction", count: frictionPoints.length },
    { key: "insights", label: "Insights", count: insights.length },
    { key: "hypotheses", label: "Hypotheses", count: hypotheses.length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Analyze</h1>
        <button
          onClick={() => {
            setShowAddForm(true);
            setActiveTab("sources");
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          + Add Source
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Turn raw signals into build priorities.
      </p>

      {/* Add Source Form */}
      {showAddForm && (
        <AddSourceForm
          onSubmit={handleAnalyze}
          onCancel={() => setShowAddForm(false)}
          analyzing={analyzing}
          analyzingStep={analyzingStep}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "text-sm px-3 py-2 border-b-2 -mb-px transition-colors",
              activeTab === t.key
                ? "border-foreground text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className="text-xs text-muted-foreground/60 ml-1.5 tabular-nums">
                ({t.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "sources" && (
        <SourcesTab
          sources={sources}
          frictionCounts={frictionCounts}
          insightCounts={insightCounts}
          hypothesisCounts={hypothesisCounts}
          onDelete={handleDeleteSource}
          onRetry={handleRetry}
          isAdmin={currentRole === "admin"}
        />
      )}

      {activeTab === "friction" && (
        <FrictionTab
          frictionPoints={frictionPoints}
          sourceMap={sourceMap}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          search={search}
          setSearch={setSearch}
          sources={sources}
        />
      )}

      {activeTab === "insights" && (
        <InsightsTab insights={insights} sourceMap={sourceMap} />
      )}

      {activeTab === "hypotheses" && (
        <HypothesesTab
          hypotheses={hypotheses}
          sourceMap={sourceMap}
          onPromote={handlePromote}
          promoting={promoting}
        />
      )}
    </div>
  );
}
