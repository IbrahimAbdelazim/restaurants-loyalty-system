import { describe, expect, it } from "vitest";
import {
  CART_SWIPE_REMOVE_THRESHOLD_PX,
  shouldRemoveCartItemBySwipe,
} from "./cart-swipe";

describe("shouldRemoveCartItemBySwipe", () => {
  it("returns false below threshold", () => {
    expect(shouldRemoveCartItemBySwipe(0)).toBe(false);
    expect(shouldRemoveCartItemBySwipe(40, 72)).toBe(false);
    expect(shouldRemoveCartItemBySwipe(71, 72)).toBe(false);
  });

  it("returns true at or above threshold", () => {
    expect(shouldRemoveCartItemBySwipe(72)).toBe(true);
    expect(shouldRemoveCartItemBySwipe(100)).toBe(true);
  });

  it("uses default threshold constant", () => {
    expect(shouldRemoveCartItemBySwipe(CART_SWIPE_REMOVE_THRESHOLD_PX)).toBe(true);
  });
});
