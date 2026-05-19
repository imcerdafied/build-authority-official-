import { calculateV3Score } from "@/lib/outcome-engine/calculateV3Score";
import { calculateOutcomeMultiplier } from "@/lib/outcome-engine/calculateOutcomeMultiplier";
import { detectOutcomeDrift } from "@/lib/outcome-engine/detectOutcomeDrift";
import { rankInitiatives } from "@/lib/outcome-engine/rankInitiatives";
import { calculateMetricStatus } from "@/lib/metric-substrate/calculateMetricStatus";
import type { BetMetric, BetInitiative } from "@/lib/types";

// ── calculateV3Score ──

describe("calculateV3Score", () => {
  it("computes (value * confidence * multiplier) / effort", () => {
    expect(
      calculateV3Score({ value: 8, confidence: 0.8, effort: 4, outcomeMultiplier: 1.3 }),
    ).toBeCloseTo(2.08);
  });

  it("returns 0 when effort is 0", () => {
    expect(
      calculateV3Score({ value: 10, confidence: 1, effort: 0, outcomeMultiplier: 1.5 }),
    ).toBe(0);
  });

  it("returns 0 when effort is negative", () => {
    expect(
      calculateV3Score({ value: 10, confidence: 1, effort: -1, outcomeMultiplier: 1.0 }),
    ).toBe(0);
  });

  it("handles high-leverage low-effort initiatives", () => {
    const score = calculateV3Score({ value: 9, confidence: 0.9, effort: 1, outcomeMultiplier: 1.45 });
    expect(score).toBeCloseTo(11.745);
  });
});

// ── calculateOutcomeMultiplier ──

describe("calculateOutcomeMultiplier", () => {
  it("returns 1.0 with no alignment", () => {
    expect(calculateOutcomeMultiplier(["retention", "revenue"], ["adoption"])).toBe(1.0);
  });

  it("adds 0.15 per aligned outcome", () => {
    expect(
      calculateOutcomeMultiplier(["retention", "revenue", "adoption"], ["retention", "revenue"]),
    ).toBeCloseTo(1.3);
  });

  it("returns 1.0 for empty arrays", () => {
    expect(calculateOutcomeMultiplier([], [])).toBe(1.0);
    expect(calculateOutcomeMultiplier(["retention"], [])).toBe(1.0);
    expect(calculateOutcomeMultiplier([], ["retention"])).toBe(1.0);
  });

  it("handles full alignment to 3 outcomes", () => {
    const outcomes = ["a", "b", "c"];
    expect(calculateOutcomeMultiplier(outcomes, outcomes)).toBeCloseTo(1.45);
  });

  it("only counts intersection, ignores extras in aligned", () => {
    expect(
      calculateOutcomeMultiplier(["a"], ["a", "b", "c"]),
    ).toBeCloseTo(1.15);
  });
});

// ── detectOutcomeDrift ──

function makeInitiative(overrides: Partial<BetInitiative>): BetInitiative {
  return {
    id: "init-1",
    bet_id: "bet-1",
    description: "Test initiative",
    aligned_outcomes: [],
    value: 5,
    confidence: 0.7,
    effort: 3,
    outcome_multiplier: 1.0,
    score_v3: 1.0,
    roadmap_position: 1,
    last_score_delta: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    owner: null,
    owner_user_id: null,
    status: null,
    ...overrides,
  };
}

function makeMetric(overrides: Partial<BetMetric>): BetMetric {
  return {
    id: "m-1",
    bet_id: "bet-1",
    outcome_key: "retention",
    metric_name: "Retention Rate",
    target_value: 100,
    current_value: 90,
    status: "OnTrack",
    created_at: "2026-01-01",
    last_updated_at: "2026-01-01",
    ...overrides,
  };
}

describe("detectOutcomeDrift", () => {
  it("returns empty flags when everything is healthy", () => {
    const inits = [
      makeInitiative({ id: "i1", roadmap_position: 1, aligned_outcomes: ["retention"] }),
      makeInitiative({ id: "i2", roadmap_position: 2, aligned_outcomes: ["revenue"] }),
      makeInitiative({ id: "i3", roadmap_position: 3, aligned_outcomes: ["adoption"] }),
    ];
    const metrics = [makeMetric({ status: "OnTrack" })];
    const flags = detectOutcomeDrift(["retention", "revenue", "adoption"], metrics, inits);
    expect(flags).toHaveLength(0);
  });

  it("detects alignment drift when top-3 over-concentrate", () => {
    const inits = [
      makeInitiative({ id: "i1", roadmap_position: 1, aligned_outcomes: ["retention"] }),
      makeInitiative({ id: "i2", roadmap_position: 2, aligned_outcomes: ["retention"] }),
      makeInitiative({ id: "i3", roadmap_position: 3, aligned_outcomes: ["retention"] }),
    ];
    const flags = detectOutcomeDrift(["retention", "revenue"], [], inits);
    const alignmentFlags = flags.filter((f) => f.type === "alignment_drift");
    expect(alignmentFlags.length).toBeGreaterThan(0);
    expect(alignmentFlags[0].severity).toBe("medium");
  });

  it("detects metric gap when OffTrack metric has no top-3 coverage", () => {
    const inits = [
      makeInitiative({ id: "i1", roadmap_position: 1, aligned_outcomes: ["retention"] }),
    ];
    const metrics = [
      makeMetric({ outcome_key: "revenue", metric_name: "ARR", status: "OffTrack" }),
    ];
    const flags = detectOutcomeDrift(["retention", "revenue"], metrics, inits);
    const gapFlags = flags.filter((f) => f.type === "metric_gap");
    expect(gapFlags).toHaveLength(1);
    expect(gapFlags[0].severity).toBe("high");
  });

  it("does not flag metric gap for OnTrack or AtRisk metrics", () => {
    const inits = [
      makeInitiative({ id: "i1", roadmap_position: 1, aligned_outcomes: ["retention"] }),
    ];
    const metrics = [
      makeMetric({ outcome_key: "revenue", status: "AtRisk" }),
    ];
    const flags = detectOutcomeDrift(["retention", "revenue"], metrics, inits);
    expect(flags.filter((f) => f.type === "metric_gap")).toHaveLength(0);
  });

  it("detects score volatility", () => {
    const inits = [
      makeInitiative({ id: "i1", score_v3: 5.0, last_score_delta: 2.0, roadmap_position: 1 }),
    ];
    // previous score = 5.0 - 2.0 = 3.0, threshold = 3.0 * 0.2 = 0.6, delta 2.0 > 0.6
    const flags = detectOutcomeDrift([], [], inits);
    expect(flags.filter((f) => f.type === "score_volatility")).toHaveLength(1);
  });

  it("does not flag small score changes", () => {
    const inits = [
      makeInitiative({ id: "i1", score_v3: 5.0, last_score_delta: 0.1, roadmap_position: 1 }),
    ];
    const flags = detectOutcomeDrift([], [], inits);
    expect(flags.filter((f) => f.type === "score_volatility")).toHaveLength(0);
  });
});

// ── rankInitiatives ──

describe("rankInitiatives", () => {
  it("ranks by score_v3 descending", () => {
    const inits = [
      makeInitiative({ id: "low", score_v3: 1.0, roadmap_position: 1 }),
      makeInitiative({ id: "high", score_v3: 5.0, roadmap_position: 2 }),
      makeInitiative({ id: "mid", score_v3: 3.0, roadmap_position: 3 }),
    ];
    const ranked = rankInitiatives(inits);
    expect(ranked[0].id).toBe("high");
    expect(ranked[1].id).toBe("mid");
    expect(ranked[2].id).toBe("low");
    expect(ranked.map((r) => r.roadmap_position)).toEqual([1, 2, 3]);
  });

  it("returns empty for empty input", () => {
    expect(rankInitiatives([])).toEqual([]);
  });

  it("handles single initiative", () => {
    const ranked = rankInitiatives([makeInitiative({ id: "only", score_v3: 2.0 })]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].roadmap_position).toBe(1);
  });

  it("preserves tied scores in stable order", () => {
    const inits = [
      makeInitiative({ id: "a", score_v3: 3.0 }),
      makeInitiative({ id: "b", score_v3: 3.0 }),
    ];
    const ranked = rankInitiatives(inits);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].roadmap_position).toBe(1);
    expect(ranked[1].roadmap_position).toBe(2);
  });
});

// ── calculateMetricStatus ──

describe("calculateMetricStatus", () => {
  it("returns OnTrack when >= 80% of target", () => {
    expect(calculateMetricStatus(80, 100)).toBe("OnTrack");
    expect(calculateMetricStatus(100, 100)).toBe("OnTrack");
  });

  it("returns AtRisk between 50% and 80%", () => {
    expect(calculateMetricStatus(50, 100)).toBe("AtRisk");
    expect(calculateMetricStatus(79, 100)).toBe("AtRisk");
  });

  it("returns OffTrack below 50%", () => {
    expect(calculateMetricStatus(49, 100)).toBe("OffTrack");
    expect(calculateMetricStatus(0, 100)).toBe("OffTrack");
  });

  it("returns OffTrack for zero target", () => {
    expect(calculateMetricStatus(50, 0)).toBe("OffTrack");
  });

  it("handles negative targets correctly (lower is better)", () => {
    // Target: -10 (e.g., reduce churn to -10%)
    // 80% of -10 = -8, so currentValue <= -8 is OnTrack
    expect(calculateMetricStatus(-10, -10)).toBe("OnTrack");
    expect(calculateMetricStatus(-9, -10)).toBe("OnTrack");
    // 50% of -10 = -5, so currentValue <= -5 is AtRisk
    expect(calculateMetricStatus(-6, -10)).toBe("AtRisk");
    // Above -5 is OffTrack
    expect(calculateMetricStatus(-3, -10)).toBe("OffTrack");
  });

  it("handles exact boundary at 80%", () => {
    expect(calculateMetricStatus(80, 100)).toBe("OnTrack");
  });

  it("handles exact boundary at 50%", () => {
    expect(calculateMetricStatus(50, 100)).toBe("AtRisk");
  });
});
