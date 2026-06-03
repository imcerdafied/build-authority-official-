export interface SequencedBet {
  title?: string | null;
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

export function compareBetSequence(a: SequencedBet, b: SequencedBet): number {
  const aSequence = sequenceFromTitle(a.title);
  const bSequence = sequenceFromTitle(b.title);
  const createdDelta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  if (!aSequence && !bSequence) return createdDelta;
  if (aSequence && !bSequence) return -1;
  if (!aSequence && bSequence) return 1;
  if (!aSequence || !bSequence) return createdDelta;
  if (aSequence.number !== bSequence.number) return aSequence.number - bSequence.number;
  if (aSequence.suffix !== bSequence.suffix) return aSequence.suffix.localeCompare(bSequence.suffix);
  return createdDelta;
}
