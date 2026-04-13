import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// ---------------------------------------------------------------------------
// Analyze helper — mirrors /build/analyze, text-only, lightweight error paths
// ---------------------------------------------------------------------------

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
    { "title": "...", "summary": "...", "severity": "low|medium|high|critical", "cluster": "...", "confidence_score": 0.0-1.0 }
  ],
  "insights": [
    { "title": "...", "summary": "...", "severity": "low|medium|high|critical", "confidence_score": 0.0-1.0 }
  ],
  "hypotheses": [
    { "title": "If we build X... (10 words max)", "description": "...", "expected_impact": "...", "value_score": 1-5, "effort_score": 1-5, "confidence_score": 0.0-1.0 }
  ]
}

Rules:
- friction_points: 3-8 items. insights: 3-6. hypotheses: 3-5.
- value_score: 5=transformative, 1=marginal. effort_score: 5=months, 1=trivial.
- Return ONLY the JSON object. No markdown fences.`,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `API error ${response.status}`);
  }
  const raw = (data.content?.[0]?.text ?? "").trim();
  const text = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Three-altitude explainer (reusable visual)
// ---------------------------------------------------------------------------

function AltitudeIntro() {
  const rows: Array<{ label: string; sub: string }> = [
    { label: "Goals", sub: "What you're measuring" },
    { label: "Bets", sub: "What you're trying" },
    { label: "Build", sub: "What you're making" },
  ];
  return (
    <div className="border border-border rounded-sm p-3 space-y-1.5 bg-muted/20">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground w-12 shrink-0">
            {r.label}
          </span>
          <span className="text-xs text-muted-foreground">{r.sub}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OrgSetup() {
  const { createOrg } = useOrg();
  const { signOut, user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — workspace name
  const [name, setName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  // Step 2 — hero Analyze moment
  const [sourceName, setSourceName] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [hypothesisCount, setHypothesisCount] = useState<number | null>(null);

  // Step 3 — invite
  const [copied, setCopied] = useState(false);

  const inviteUrl = createdOrgId
    ? `https://buildauthorityos.com/auth?org=${encodeURIComponent(createdOrgId)}`
    : "";

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleCreateWorkspace = async () => {
    if (!name.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const orgId = await createOrg(name.trim());
      setCreatedOrgId(orgId);
      void trackEvent("onboarding_workspace_created", {
        userId: user?.id ?? null,
        metadata: { org_id: orgId, org_name: name.trim() },
      });
      setStep(2);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Workspace creation failed. Please try again.";
      setCreateError(message);
      void trackEvent("organization_create_failed", {
        userId: user?.id ?? null,
        severity: "error",
        metadata: { message, org_name: name.trim() },
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!createdOrgId || !user) return;
    if (!sourceName.trim() || !sourceContent.trim()) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeStep("Saving source...");

    const { data: source, error: insertErr } = await supabase
      .from("intel_sources")
      .insert({
        org_id: createdOrgId,
        name: sourceName.trim(),
        source_type: "text",
        content: sourceContent.trim(),
        processing_status: "analyzing",
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertErr || !source) {
      setAnalyzeError(insertErr?.message ?? "Failed to save source");
      setAnalyzing(false);
      return;
    }

    setAnalyzeStep("Extracting friction, insights, and hypotheses...");

    let result;
    try {
      result = await analyzeSource(sourceContent.trim(), sourceName.trim());
    } catch (err) {
      await supabase
        .from("intel_sources")
        .update({ processing_status: "failed" })
        .eq("id", source.id);
      const message =
        err instanceof Error ? err.message : "Analysis failed — please retry.";
      setAnalyzeError(message);
      void trackEvent("onboarding_analyze_failed", {
        userId: user.id,
        severity: "error",
        metadata: { message, org_id: createdOrgId },
      });
      setAnalyzing(false);
      return;
    }

    setAnalyzeStep("Saving results...");

    const sid = source.id;
    await Promise.all([
      result.friction_points.length > 0 &&
        supabase.from("intel_friction_points").insert(
          result.friction_points.map((fp) => ({
            ...fp,
            org_id: createdOrgId,
            source_id: sid,
          })),
        ),
      result.insights.length > 0 &&
        supabase.from("intel_insights").insert(
          result.insights.map((i) => ({
            ...i,
            org_id: createdOrgId,
            source_id: sid,
          })),
        ),
      result.hypotheses.length > 0 &&
        supabase.from("intel_hypotheses").insert(
          result.hypotheses.map((h) => ({
            ...h,
            org_id: createdOrgId,
            source_id: sid,
          })),
        ),
      supabase
        .from("intel_sources")
        .update({ processing_status: "complete" })
        .eq("id", sid),
    ]);

    void trackEvent("onboarding_analyze_submitted", {
      userId: user.id,
      metadata: {
        org_id: createdOrgId,
        hypotheses: result.hypotheses.length,
        friction_points: result.friction_points.length,
        insights: result.insights.length,
      },
    });

    setHypothesisCount(result.hypotheses.length);
    setAnalyzing(false);
    setStep(3);
  };

  const handleSkipAnalyze = () => {
    void trackEvent("onboarding_analyze_skipped", {
      userId: user?.id ?? null,
      metadata: { org_id: createdOrgId },
    });
    setStep(3);
  };

  const handleEnterWorkspace = () => {
    // If they analyzed, send them to the Analyze tab to see their results.
    // Otherwise, land them at the top altitude.
    const destination = hypothesisCount !== null ? "/build/analyze" : "/goals";
    window.location.replace(destination);
  };

  const copyInviteLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const stepLabels: Record<1 | 2 | 3, string> = {
    1: "Create your workspace",
    2: "See it work",
    3: "Invite your team",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">
            Build Authority
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {stepLabels[step]}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 rounded-full flex-1 transition-colors",
                s <= step ? "bg-foreground" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="border rounded-md p-6">
          {/* ---------- Step 1: Workspace name ---------- */}
          {step === 1 && (
            <>
              <p className="text-sm text-foreground font-medium mb-1">
                What should we call your workspace?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                You'll be the Admin. Everything else can be set up later.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="Your company or team name"
                  onKeyDown={(e) =>
                    e.key === "Enter" && name.trim() && handleCreateWorkspace()
                  }
                />

                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
                    How Build Authority works
                  </p>
                  <AltitudeIntro />
                </div>

                <button
                  onClick={handleCreateWorkspace}
                  disabled={!name.trim() || createLoading}
                  className="w-full text-sm font-semibold text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating workspace..." : "Create workspace"}
                </button>

                {createError && (
                  <p className="text-xs text-signal-red">{createError}</p>
                )}
              </div>
            </>
          )}

          {/* ---------- Step 2: Analyze hero ---------- */}
          {step === 2 && (
            <>
              <p className="text-sm text-foreground font-medium mb-1">
                Turn a signal into priorities.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Paste a research synthesis, support transcript, competitor
                memo, or strategic doc. We'll extract friction points,
                insights, and scored hypotheses you can promote to the Roadmap.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Source name
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder='e.g. "Q1 customer interview synthesis"'
                    className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground placeholder:text-muted-foreground/40"
                    disabled={analyzing}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Content
                  </label>
                  <textarea
                    value={sourceContent}
                    onChange={(e) => setSourceContent(e.target.value)}
                    placeholder="Paste your source content here..."
                    rows={8}
                    className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground placeholder:text-muted-foreground/40 resize-y"
                    disabled={analyzing}
                  />
                </div>

                {analyzing && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      {analyzeStep}
                    </span>
                  </div>
                )}

                {analyzeError && (
                  <p className="text-xs text-signal-red">{analyzeError}</p>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={
                    !sourceName.trim() || !sourceContent.trim() || analyzing
                  }
                  className="w-full text-sm font-semibold text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {analyzing ? "Analyzing..." : "Analyze"}
                </button>

                <button
                  onClick={handleSkipAnalyze}
                  disabled={analyzing}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Skip for now — I'll try this later
                </button>
              </div>
            </>
          )}

          {/* ---------- Step 3: Invite + enter ---------- */}
          {step === 3 && (
            <>
              <p className="text-sm text-foreground font-medium mb-1">
                {name} is ready.
              </p>

              {hypothesisCount !== null && hypothesisCount > 0 ? (
                <div className="text-sm text-muted-foreground mb-4">
                  <span className="text-foreground font-semibold">
                    {hypothesisCount} hypothes
                    {hypothesisCount === 1 ? "is" : "es"}
                  </span>{" "}
                  generated and ranked by V² score. Waiting for you in the
                  Analyze tab.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Invite your team now, or jump in and get started.
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Invite link
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 border rounded-sm px-3 py-2 text-sm bg-muted text-foreground min-w-0"
                    />
                    <button
                      onClick={copyInviteLink}
                      disabled={!inviteUrl}
                      className="text-sm font-semibold text-foreground border border-foreground px-3 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors shrink-0 w-full sm:w-auto"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleEnterWorkspace}
                  className="w-full text-sm font-semibold text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors"
                >
                  {hypothesisCount !== null
                    ? "See your hypotheses"
                    : "Enter workspace"}
                </button>
              </div>
            </>
          )}
        </div>

        {step < 3 && (
          <button
            onClick={signOut}
            className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
