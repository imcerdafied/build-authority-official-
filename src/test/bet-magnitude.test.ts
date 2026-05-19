import { describe, expect, it } from "vitest";
import {
  aggregateMagnitudes,
  extractMagnitude,
  formatDollars,
  movementState,
} from "@/lib/bet-magnitude";

describe("extractMagnitude", () => {
  it("parses a simple amount with unit and plus", () => {
    const m = extractMagnitude("Drives $12M+ expansion ARR and strengthens renewal defense");
    expect(m?.display).toBe("$12M+ ARR");
    expect(m?.min).toBe(12_000_000);
    expect(m?.max).toBe(12_000_000);
  });

  it("parses a range where only the upper bound carries the unit", () => {
    const m = extractMagnitude("$20-30M ARR at risk over 24 months");
    expect(m?.display).toBe("$20-30M ARR");
    expect(m?.min).toBe(20_000_000);
    expect(m?.max).toBe(30_000_000);
  });

  it("parses a range with tilde and en dash", () => {
    const m = extractMagnitude("~$15–25M ARR exposure over 24 months");
    expect(m?.display).toBe("~$15–25M ARR");
    expect(m?.min).toBe(15_000_000);
    expect(m?.max).toBe(25_000_000);
  });

  it("parses K and B units", () => {
    expect(extractMagnitude("$500K saved")?.min).toBe(500_000);
    expect(extractMagnitude("$1.5B opportunity")?.min).toBe(1_500_000_000);
  });

  it("returns null when no dollar amount is present", () => {
    expect(extractMagnitude("Reduces R&D cost structure by 20%+ over 12 months")).toBeNull();
    expect(extractMagnitude("")).toBeNull();
    expect(extractMagnitude(null)).toBeNull();
    expect(extractMagnitude(undefined)).toBeNull();
  });
});

describe("formatDollars", () => {
  it("formats millions", () => {
    expect(formatDollars(12_000_000)).toBe("$12M");
    expect(formatDollars(20_000_000)).toBe("$20M");
  });
  it("formats billions with one decimal, trims trailing zero", () => {
    expect(formatDollars(1_500_000_000)).toBe("$1.5B");
    expect(formatDollars(2_000_000_000)).toBe("$2B");
  });
  it("formats thousands", () => {
    expect(formatDollars(500_000)).toBe("$500K");
  });
});

describe("aggregateMagnitudes", () => {
  it("sums singles and ranges", () => {
    const a = aggregateMagnitudes(["$12M+ ARR", "$20-30M ARR", "~$15-25M ARR"]);
    expect(a.display).toBe("$47M–$67M ARR");
    expect(a.quantifiedCount).toBe(3);
    expect(a.unquantifiedCount).toBe(0);
  });

  it("ignores empty strings without marking them unquantified", () => {
    const a = aggregateMagnitudes(["$10M ARR", "", null, undefined]);
    expect(a.display).toBe("$10M ARR");
    expect(a.unquantifiedCount).toBe(0);
  });

  it("counts non-empty unparseable values as unquantified", () => {
    const a = aggregateMagnitudes(["$10M ARR", "20% adoption lift"]);
    expect(a.unquantifiedCount).toBe(1);
  });

  it("returns null display when nothing is quantifiable", () => {
    const a = aggregateMagnitudes(["20% adoption lift", "increased velocity"]);
    expect(a.display).toBeNull();
    expect(a.quantifiedCount).toBe(0);
  });
});

describe("movementState", () => {
  const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

  it("is green under 14 days", () => {
    const m = movementState(isoDaysAgo(3), isoDaysAgo(50));
    expect(m.tier).toBe("green");
    expect(m.label).toMatch(/Moved/);
  });

  it("is amber between 14 and 30 days", () => {
    const m = movementState(isoDaysAgo(20), isoDaysAgo(50));
    expect(m.tier).toBe("amber");
    expect(m.label).toMatch(/Slowing/);
  });

  it("is red over 30 days", () => {
    const m = movementState(isoDaysAgo(57), isoDaysAgo(120));
    expect(m.tier).toBe("red");
    expect(m.code).toBe("ERR_NO_MOVEMENT");
  });

  it("stays quiet for a brand-new bet that hasn't been touched", () => {
    const ts = isoDaysAgo(2);
    const m = movementState(ts, ts);
    expect(m.tier).toBe("none");
  });

  it("stays quiet for an old bet that never moved (no ERR_NO_MOVEMENT noise on backlog)", () => {
    const ts = isoDaysAgo(45);
    const m = movementState(ts, ts);
    expect(m.tier).toBe("none");
    expect(m.code).toBeNull();
  });
});
