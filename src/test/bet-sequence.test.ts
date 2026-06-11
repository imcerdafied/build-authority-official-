import { describe, it, expect } from "vitest";
import { compareBetSequence, sequenceFromLabel, sequenceFromTitle } from "@/lib/bet-sequence";

const SAME_TS = "2026-06-01T23:06:25.529Z";

describe("sequenceFromLabel", () => {
  it("parses plain and suffixed labels", () => {
    expect(sequenceFromLabel("1")).toEqual({ number: 1, suffix: "" });
    expect(sequenceFromLabel("2A")).toEqual({ number: 2, suffix: "A" });
    expect(sequenceFromLabel("2b")).toEqual({ number: 2, suffix: "B" });
  });

  it("rejects non-label values", () => {
    expect(sequenceFromLabel("")).toBeNull();
    expect(sequenceFromLabel(null)).toBeNull();
    expect(sequenceFromLabel("B1x")).toBeNull();
  });
});

describe("compareBetSequence", () => {
  it("orders by bet_label even when titles carry no number and timestamps tie", () => {
    // The Phunware case: bulk-imported bets share one created_at and keep
    // their sequence in bet_label, not the title.
    const bets = [
      { bet_label: "2B", title: "Open the Repeatable Platform Channel", created_at: SAME_TS },
      { bet_label: "4", title: "Prove the Monetization Model", created_at: SAME_TS },
      { bet_label: "3", title: "Own the Category", created_at: SAME_TS },
      { bet_label: "2A", title: "Anchor the Flagship Design Partner (Atlantis)", created_at: SAME_TS },
      { bet_label: "1", title: "Ship the Apollo Platform Foundation", created_at: SAME_TS },
    ];
    const ordered = [...bets].sort(compareBetSequence).map((bet) => bet.bet_label);
    expect(ordered).toEqual(["1", "2A", "2B", "3", "4"]);
  });

  it("still honors title-encoded sequences for older bets", () => {
    const bets = [
      { title: "2. Second thing", created_at: SAME_TS },
      { title: "1. First thing", created_at: SAME_TS },
    ];
    expect([...bets].sort(compareBetSequence).map((bet) => sequenceFromTitle(bet.title)?.number)).toEqual([1, 2]);
  });

  it("falls back to created_at then title for unlabeled bets", () => {
    const bets = [
      { title: "Zeta", created_at: SAME_TS },
      { title: "Alpha", created_at: SAME_TS },
      { title: "Earlier", created_at: "2026-05-01T00:00:00.000Z" },
    ];
    expect([...bets].sort(compareBetSequence).map((bet) => bet.title)).toEqual(["Earlier", "Alpha", "Zeta"]);
  });

  it("puts sequenced bets ahead of unsequenced ones", () => {
    const bets = [
      { title: "No sequence here", created_at: "2026-01-01T00:00:00.000Z" },
      { bet_label: "1", title: "Labeled", created_at: SAME_TS },
    ];
    expect([...bets].sort(compareBetSequence)[0].bet_label).toBe("1");
  });
});
