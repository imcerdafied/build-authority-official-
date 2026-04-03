import type { BetMetric } from "@/lib/types";

/**
 * Determines metric health based on current progress toward target.
 *
 * For positive targets (e.g. revenue = 1M):
 *  >= 80% of target → OnTrack
 *  >= 50% of target → AtRisk
 *  < 50% of target  → OffTrack
 *
 * For negative targets (e.g. churn reduction, target = -5%):
 *  <= target * 0.8 (closer to or past target) → OnTrack
 *  <= target * 0.5 → AtRisk
 *  > target * 0.5 (far from target) → OffTrack
 *
 * Zero target returns OffTrack (likely a data entry error).
 */
export function calculateMetricStatus(
  currentValue: number,
  targetValue: number,
): BetMetric["status"] {
  if (targetValue === 0) return "OffTrack";
  if (targetValue < 0) {
    // For negative targets, lower is better (e.g. reducing churn from -2% to -5%)
    if (currentValue <= targetValue * 0.8) return "OnTrack";
    if (currentValue <= targetValue * 0.5) return "AtRisk";
    return "OffTrack";
  }
  if (currentValue >= targetValue * 0.8) return "OnTrack";
  if (currentValue >= targetValue * 0.5) return "AtRisk";
  return "OffTrack";
}
