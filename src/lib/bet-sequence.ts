export interface SequencedBet {
  title?: string | null;
  bet_label?: string | null;
  created_at: string;
}

export function sequenceFromTitle(title: string | null | undefined) {
  const match = String(title || "").trim().match(/^(\d+)([a-z])?\s*[\).:-]/i);
  if (!match) return null;
  return {
    number: Number(match[1]),
    suffix: (match[2] || "").toUpperCase(),
  };
}

export function sequenceLabelFromTitle(title: string | null | undefined): string | null {
  const sequence = sequenceFromTitle(title);
  if (!sequence) return null;
  return `${sequence.number}${sequence.suffix}`;
}

// Bets created via the bulk strategy import keep their sequence in
// bet_label ("1", "2A") with clean titles; older bets encoded it in the
// title ("1. Ship the..."). Prefer the label, fall back to the title.
export function sequenceFromLabel(label: string | null | undefined) {
  const match = String(label || "").trim().match(/^(\d+)([a-z])?$/i);
  if (!match) return null;
  return {
    number: Number(match[1]),
    suffix: (match[2] || "").toUpperCase(),
  };
}

function sequenceForBet(bet: SequencedBet) {
  return sequenceFromLabel(bet.bet_label) || sequenceFromTitle(bet.title);
}

export function compareBetSequence(a: SequencedBet, b: SequencedBet): number {
  const aSequence = sequenceForBet(a);
  const bSequence = sequenceForBet(b);
  const createdDelta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  // Stable final tie-break so identical timestamps cannot shuffle the list.
  const titleDelta = String(a.title || "").localeCompare(String(b.title || ""));

  if (!aSequence && !bSequence) return createdDelta || titleDelta;
  if (aSequence && !bSequence) return -1;
  if (!aSequence && bSequence) return 1;
  if (!aSequence || !bSequence) return createdDelta || titleDelta;
  if (aSequence.number !== bSequence.number) return aSequence.number - bSequence.number;
  if (aSequence.suffix !== bSequence.suffix) return aSequence.suffix.localeCompare(bSequence.suffix);
  return createdDelta || titleDelta;
}
