export const BET_LIFECYCLE_STATUSES = [
  "defined",
  "activated",
  "proving_value",
  "scaling",
  "durable",
  "closed",
] as const;

export type BetLifecycleStatus = (typeof BET_LIFECYCLE_STATUSES)[number];

export const BET_RISK_LEVELS = ["healthy", "watch", "at_risk"] as const;

export type BetRiskLevel = (typeof BET_RISK_LEVELS)[number];

export const BET_LIFECYCLE_LABELS: Record<BetLifecycleStatus, string> = {
  defined: "Defined",
  activated: "Activated",
  proving_value: "Proving Value",
  scaling: "Scaling",
  durable: "Durable",
  closed: "Closed",
};

export const BET_RISK_LABELS: Record<BetRiskLevel, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
};

// Visual buckets for the lifecycle dimension. Canonical map — must match across
// every surface that renders a lifecycle pill (BetRow, BetDetail, BetNavigator,
// Sample Bet on the landing page). Do not redeclare locally.
export type LifecycleBucket = "defined" | "activated" | "shipping" | "closed";

export function lifecycleBucket(status: string | null | undefined): LifecycleBucket {
  if (status === "defined") return "defined";
  if (status === "activated") return "activated";
  if (status === "closed") return "closed";
  // proving_value | scaling | durable
  return "shipping";
}

export const LIFECYCLE_BUCKET_LABEL: Record<LifecycleBucket, string> = {
  defined: "Defined",
  activated: "Activated",
  shipping: "Shipping",
  closed: "Closed",
};

// Single source of truth for lifecycle color treatment. The one purple in the
// in-app palette lives here on Shipping.
export const LIFECYCLE_BUCKET_STYLE: Record<
  LifecycleBucket,
  { bg: string; text: string; dot: string }
> = {
  defined: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  activated: { bg: "bg-foreground/10", text: "text-foreground", dot: "bg-foreground" },
  shipping: { bg: "bg-accent/15", text: "text-accent", dot: "bg-accent" },
  closed: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
};

export function isBetLifecycleStatus(value: string): value is BetLifecycleStatus {
  return (BET_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function isBetRiskLevel(value: string): value is BetRiskLevel {
  return (BET_RISK_LEVELS as readonly string[]).includes(value);
}

export function formatBetLifecycleStatus(value: string | null | undefined): string {
  if (!value) return BET_LIFECYCLE_LABELS.defined;
  if (isBetLifecycleStatus(value)) return BET_LIFECYCLE_LABELS[value];
  return BET_LIFECYCLE_LABELS.defined;
}

export function formatBetRiskLevel(value: string | null | undefined): string {
  if (!value) return BET_RISK_LABELS.healthy;
  if (isBetRiskLevel(value)) return BET_RISK_LABELS[value];
  return BET_RISK_LABELS.healthy;
}

export function toBetLifecycleStatus(value: string | null | undefined): BetLifecycleStatus {
  if (!value) return "defined";
  if (isBetLifecycleStatus(value)) return value;
  return "defined";
}

export function toBetRiskLevel(value: string | null | undefined): BetRiskLevel {
  if (!value) return "healthy";
  if (isBetRiskLevel(value)) return value;
  return "healthy";
}

export function isClosedBetLifecycle(value: string | null | undefined): boolean {
  return toBetLifecycleStatus(value) === "closed";
}

export function mapLegacyBetStatus(rawStatus: string | null | undefined): {
  status: BetLifecycleStatus;
  riskLevel: BetRiskLevel;
} {
  const status = String(rawStatus ?? "").trim().toLowerCase();
  switch (status) {
    case "hypothesis defined":
    case "hypothesis":
    case "draft":
    case "defined":
      return { status: "defined", riskLevel: "healthy" };
    case "active":
    case "activated":
      return { status: "activated", riskLevel: "healthy" };
    case "piloting":
    case "proving value":
    case "proving_value":
      return { status: "proving_value", riskLevel: "healthy" };
    case "scaling":
      return { status: "scaling", riskLevel: "healthy" };
    case "durable":
    case "accepted":
      return { status: "durable", riskLevel: "healthy" };
    case "closed":
    case "archived":
    case "rejected":
      return { status: "closed", riskLevel: "healthy" };
    case "at risk":
    case "at_risk":
    case "blocked":
      return { status: "proving_value", riskLevel: "at_risk" };
    default:
      return { status: "defined", riskLevel: "watch" };
  }
}
