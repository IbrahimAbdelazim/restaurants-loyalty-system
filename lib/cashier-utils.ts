import type { Tier } from "./types";
import { TIER_THRESHOLD } from "./waiter-utils";

/** Highest tier whose minimum points threshold is satisfied. */
export function tierForPoints(points: number): Tier {
  if (points >= TIER_THRESHOLD.VIP) return "VIP";
  if (points >= TIER_THRESHOLD.Gold) return "Gold";
  if (points >= TIER_THRESHOLD.Silver) return "Silver";
  return "Bronze";
}

/** 1 point per whole dollar spent (floor). */
export function pointsEarnedFromSpend(amountDollars: number): number {
  return Math.max(0, Math.floor(amountDollars));
}

/** Subtotal after percentage discount (two decimal places). */
export function applyPercentDiscount(subtotal: number, percent: number): number {
  if (percent <= 0) return round2(subtotal);
  const factor = Math.max(0, 1 - percent / 100);
  return round2(subtotal * factor);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Split `totalDollars` across `n` clients in whole cents.
 * The first `remainder` clients receive one extra cent so the sum matches exactly.
 */
export function splitEvenDollars(totalDollars: number, n: number): number[] {
  if (n <= 0) return [];
  const totalCents = Math.round(totalDollars * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const extra = i < remainder ? 1 : 0;
    out.push((base + extra) / 100);
  }
  return out;
}

/**
 * Each client's pre-discount subtotal; allocate discounted total proportionally.
 * When `subtotalSum` is 0, returns zeros.
 */
export function proportionalSplitAfterDiscount(
  clientSubtotals: number[],
  subtotalSum: number,
  discountedTotal: number
): number[] {
  if (clientSubtotals.length === 0) return [];
  if (subtotalSum <= 0) return clientSubtotals.map(() => 0);
  const targetCents = Math.round(discountedTotal * 100);
  const cents = clientSubtotals.map((s) =>
    Math.floor(((s / subtotalSum) * discountedTotal) * 100)
  );
  const sum = cents.reduce((a, b) => a + b, 0);
  let diff = targetCents - sum;
  let i = 0;
  while (diff > 0 && i < cents.length) {
    cents[i]++;
    diff--;
    i++;
  }
  return cents.map((c) => c / 100);
}
