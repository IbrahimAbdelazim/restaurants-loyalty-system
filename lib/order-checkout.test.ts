import { describe, it, expect } from "vitest";
import { normalizeOrderItemsFromMenu } from "./order-checkout";
import type { MenuItem } from "./types";

const menu: MenuItem[] = [
  { id: "m1", name: "A", category: "Main", price: 10 },
  { id: "m2", name: "B", category: "Drink", price: 5 },
];
const menuById = new Map(menu.map((m) => [m.id, m]));

describe("normalizeOrderItemsFromMenu", () => {
  it("builds items and subtotal from menu prices", () => {
    const r = normalizeOrderItemsFromMenu(
      [
        { menuItemId: "m1", quantity: 2 },
        { menuItemId: "m2", quantity: 1 },
      ],
      menuById
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.subtotal).toBe(25);
      expect(r.items).toHaveLength(2);
    }
  });
  it("rejects unknown id", () => {
    const r = normalizeOrderItemsFromMenu([{ menuItemId: "xx", quantity: 1 }], menuById);
    expect(r.ok).toBe(false);
  });
});
