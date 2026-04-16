import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { content, sourceName, pdfBase64 } = req.body ?? {};
  if (!content && !pdfBase64) {
    return res.status(400).json({ error: "content or pdfBase64 is required" });
  }
  if (!sourceName) {
    return res.status(400).json({ error: "sourceName is required" });
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are an expert product strategist. Analyze source documents to extract actionable intelligence for product teams.

You MUST respond with ONLY valid JSON and nothing else — no preamble, no explanation, no markdown fences.`;

  const userContent = pdfBase64
    ? [
        {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: pdfBase64,
          },
        },
        {
          type: "text" as const,
          text: `Analyze this PDF document named "${sourceName}" and extract product intelligence.

Return a JSON object with exactly this structure:`,
        },
      ]
    : `Analyze this source document and extract product intelligence.

SOURCE: "${sourceName}"

CONTENT:
${(content as string).slice(0, 8000)}

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
- Return ONLY the JSON object. No other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = (
      response.content[0].type === "text" ? response.content[0].text : ""
    ).trim();

    if (!raw) {
      return res.status(502).json({ error: "Empty response from Claude" });
    }

    // Strip code fences in case Claude wraps the JSON
    const cleaned = raw
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const result = JSON.parse(cleaned);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Analyze API error:", err);
    const message = err?.message ?? "Analysis failed";
    return res.status(502).json({ error: message });
  }
}
