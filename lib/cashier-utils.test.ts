import { describe, it, expect } from "vitest";
import {
  tierForPoints,
  pointsEarnedFromSpend,
  applyPercentDiscount,
  splitEvenDollars,
  proportionalSplitAfterDiscount,
} from "./cashier-utils";

describe("tierForPoints", () => {
  it("returns Bronze below Silver threshold", () => {
    expect(tierForPoints(0)).toBe("Bronze");
    expect(tierForPoints(499)).toBe("Bronze");
  });
  it("returns Silver from 500", () => {
    expect(tierForPoints(500)).toBe("Silver");
    expect(tierForPoints(1499)).toBe("Silver");
  });
  it("returns Gold from 1500", () => {
    expect(tierForPoints(1500)).toBe("Gold");
    expect(tierForPoints(3999)).toBe("Gold");
  });
  it("returns VIP from 4000", () => {
    expect(tierForPoints(4000)).toBe("VIP");
    expect(tierForPoints(99999)).toBe("VIP");
  });
});

describe("pointsEarnedFromSpend", () => {
  it("floors dollars", () => {
    expect(pointsEarnedFromSpend(10.7)).toBe(10);
    expect(pointsEarnedFromSpend(10)).toBe(10);
    expect(pointsEarnedFromSpend(0.4)).toBe(0);
  });
});

describe("applyPercentDiscount", () => {
  it("applies percentage", () => {
    expect(applyPercentDiscount(100, 10)).toBe(90);
    expect(applyPercentDiscount(100, 20)).toBe(80);
  });
});

describe("splitEvenDollars", () => {
  it("splits whole dollars evenly", () => {
    expect(splitEvenDollars(100, 2)).toEqual([50, 50]);
  });
  it("assigns remainder cents to first clients", () => {
    const s = splitEvenDollars(10.01, 3);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(10.01, 5);
    expect(s.length).toBe(3);
  });
});

describe("proportionalSplitAfterDiscount", () => {
  it("splits proportionally", () => {
    const subtotals = [60, 40];
    const sum = 100;
    const discounted = 90;
    const got = proportionalSplitAfterDiscount(subtotals, sum, discounted);
    expect(got[0] + got[1]).toBeCloseTo(90, 5);
    expect(got[0] / got[1]).toBeCloseTo(60 / 40, 2);
  });
  it("returns zeros when subtotal sum is zero", () => {
    expect(proportionalSplitAfterDiscount([0, 0], 0, 0)).toEqual([0, 0]);
  });
});
