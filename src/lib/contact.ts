// Single source of truth for the public Authority mailto destination. Swap
// this one constant when the inbox changes.
export const CONTACT_EMAIL = "mc@bspg.build";

export function contactHref(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
