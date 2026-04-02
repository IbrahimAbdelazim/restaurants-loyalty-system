import type { MenuItem, OrderItem, Tier } from "./types";

/** Strip to digits only */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** Display as `050 123 4567` for 10-digit numbers; otherwise groups of 3 */
export function formatPhoneDisplay(digits: string): string {
  const d = normalizePhoneDigits(digits);
  if (d.length === 0) return "";
  if (d.length <= 10) {
    const parts: string[] = [];
    if (d.length <= 3) return d;
    parts.push(d.slice(0, 3));
    if (d.length <= 6) {
      parts.push(d.slice(3));
      return parts.join(" ");
    }
    parts.push(d.slice(3, 6));
    parts.push(d.slice(6));
    return parts.join(" ");
  }
  return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export const TIER_ORDER: Tier[] = ["Bronze", "Silver", "Gold", "VIP"];

/** Minimum points required to be in that tier (Bronze 0, Silver 500, Gold 1500, VIP 4000) */
export const TIER_THRESHOLD: Record<Tier, number> = {
  Bronze: 0,
  Silver: 500,
  Gold: 1500,
  VIP: 4000,
};

const NEXT_TIER_NAME: Record<Tier, Tier | null> = {
  Bronze: "Silver",
  Silver: "Gold",
  Gold: "VIP",
  VIP: null,
};

export function tierProgressPercent(tier: Tier, points: number): number {
  if (tier === "VIP") return 100;
  const next = NEXT_TIER_NAME[tier];
  if (!next) return 100;
  const low = TIER_THRESHOLD[tier];
  const high = TIER_THRESHOLD[next];
  if (high <= low) return 100;
  return Math.min(100, Math.max(0, Math.round(((points - low) / (high - low)) * 100)));
}

export function pointsToNextTier(tier: Tier, points: number): number | null {
  if (tier === "VIP") return null;
  const next = NEXT_TIER_NAME[tier];
  if (!next) return null;
  const need = TIER_THRESHOLD[next];
  return Math.max(0, need - points);
}

export function nextTierLabel(tier: Tier): Tier | null {
  return NEXT_TIER_NAME[tier];
}

export function isDrinkCategory(category: MenuItem["category"]): boolean {
  return category === "Drink";
}

export function orderFoodDrinkTotals(
  items: OrderItem[],
  categoryByMenuId: Map<string, MenuItem["category"]>
): { food: number; drinks: number } {
  let food = 0;
  let drinks = 0;
  for (const item of items) {
    const cat = categoryByMenuId.get(item.menuItemId);
    const line = item.price * item.quantity;
    if (cat && isDrinkCategory(cat)) drinks += line;
    else food += line;
  }
  return { food, drinks };
}

export function buildMenuCategoryMap(menu: MenuItem[]): Map<string, MenuItem["category"]> {
  return new Map(menu.map((m) => [m.id, m.category]));
}

/** True if `clientDigits` contains `searchDigits` as substring (partial search, search length >= 4). */
export function clientPhoneMatchesPartial(clientDigits: string, searchDigits: string): boolean {
  if (searchDigits.length < 4) return false;
  return clientDigits.includes(searchDigits);
}

export type GapLocale = "en" | "ar";

export function gapSincePreviousVisit(
  newerDateStr: string,
  olderDateStr: string,
  locale: GapLocale = "en"
): string {
  const d1 = new Date(newerDateStr).getTime();
  const d2 = new Date(olderDateStr).getTime();
  const days = Math.max(0, Math.floor((d1 - d2) / 86400000));
  if (locale === "ar") {
    if (days === 0) return "نفس يوم الزيارة السابقة";
    if (days === 1) return "يوم واحد منذ الزيارة السابقة";
    if (days < 30) return `${days} أيام منذ الزيارة السابقة`;
    const months = Math.floor(days / 30);
    if (months < 12) {
      return months === 1 ? "شهر واحد منذ الزيارة السابقة" : `${months} أشهر منذ الزيارة السابقة`;
    }
    const years = Math.floor(months / 12);
    return years === 1 ? "عام واحد منذ الزيارة السابقة" : `${years} أعوام منذ الزيارة السابقة`;
  }
  if (days === 0) return "Same day as previous visit";
  if (days === 1) return "1 day since previous visit";
  if (days < 30) return `${days} days since previous visit`;
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "1 month since previous visit" : `${months} months since previous visit`;
  }
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year since previous visit" : `${years} years since previous visit`;
}
