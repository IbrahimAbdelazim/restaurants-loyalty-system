import { describe, it, expect } from "vitest";
import {
  normalizePhoneDigits,
  formatPhoneDisplay,
  tierProgressPercent,
  pointsToNextTier,
  orderFoodDrinkTotals,
  buildMenuCategoryMap,
  clientPhoneMatchesPartial,
  gapSincePreviousVisit,
} from "./waiter-utils";
import type { MenuItem, OrderItem } from "./types";

describe("normalizePhoneDigits", () => {
  it("strips non-digits", () => {
    expect(normalizePhoneDigits("050 123 4567")).toBe("0501234567");
    expect(normalizePhoneDigits("abc")).toBe("");
  });
});

describe("formatPhoneDisplay", () => {
  it("formats 10-digit UAE-style", () => {
    expect(formatPhoneDisplay("0501234567")).toBe("050 123 4567");
  });
  it("handles partial input", () => {
    expect(formatPhoneDisplay("050")).toBe("050");
    expect(formatPhoneDisplay("05012")).toBe("050 12");
  });
});

describe("tierProgressPercent", () => {
  it("Bronze segment 0–500", () => {
    expect(tierProgressPercent("Bronze", 0)).toBe(0);
    expect(tierProgressPercent("Bronze", 250)).toBe(50);
    expect(tierProgressPercent("Bronze", 500)).toBe(100);
  });
  it("Silver segment 500–1500", () => {
    expect(tierProgressPercent("Silver", 500)).toBe(0);
    expect(tierProgressPercent("Silver", 1000)).toBe(50);
    expect(tierProgressPercent("Silver", 1500)).toBe(100);
  });
  it("Gold segment 1500–4000", () => {
    expect(tierProgressPercent("Gold", 1500)).toBe(0);
    expect(tierProgressPercent("Gold", 2750)).toBe(50);
    expect(tierProgressPercent("Gold", 4000)).toBe(100);
  });
  it("VIP is 100%", () => {
    expect(tierProgressPercent("VIP", 5000)).toBe(100);
  });
});

describe("pointsToNextTier", () => {
  it("returns points needed", () => {
    expect(pointsToNextTier("Bronze", 320)).toBe(180);
    expect(pointsToNextTier("Silver", 780)).toBe(720);
    expect(pointsToNextTier("Gold", 2000)).toBe(2000);
  });
  it("VIP returns null", () => {
    expect(pointsToNextTier("VIP", 5000)).toBeNull();
  });
});

describe("orderFoodDrinkTotals", () => {
  const menu: MenuItem[] = [
    { id: "m1", name: "Main", category: "Main", price: 10 },
    { id: "m2", name: "Wine", category: "Drink", price: 5 },
  ];
  const map = buildMenuCategoryMap(menu);
  const items: OrderItem[] = [
    { menuItemId: "m1", name: "Main", quantity: 2, price: 10 },
    { menuItemId: "m2", name: "Wine", quantity: 1, price: 5 },
  ];
  it("splits food vs drinks", () => {
    expect(orderFoodDrinkTotals(items, map)).toEqual({ food: 20, drinks: 5 });
  });
});

describe("clientPhoneMatchesPartial", () => {
  it("requires 4+ search digits", () => {
    expect(clientPhoneMatchesPartial("0501234567", "050")).toBe(false);
    expect(clientPhoneMatchesPartial("0501234567", "0501")).toBe(true);
  });
  it("matches substring", () => {
    expect(clientPhoneMatchesPartial("0551112233", "1122")).toBe(true);
  });
});

describe("gapSincePreviousVisit", () => {
  it("english gaps", () => {
    expect(gapSincePreviousVisit("2024-04-10", "2024-04-10", "en")).toBe("Same day as previous visit");
    expect(gapSincePreviousVisit("2024-04-11", "2024-04-10", "en")).toBe("1 day since previous visit");
    expect(gapSincePreviousVisit("2024-05-10", "2024-04-10", "en")).toMatch(/since previous visit/);
  });
});
