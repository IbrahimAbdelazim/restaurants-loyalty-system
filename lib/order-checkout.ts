import type { MenuItem, OrderItem } from "./types";
import { localizedMessage, type LocalizedText } from "./api-messages";

export type NormalizeItemsResult =
  | { ok: true; items: OrderItem[]; subtotal: number }
  | { ok: false; error: LocalizedText };

export function normalizeOrderItemsFromMenu(
  raw: Array<{ menuItemId: string; quantity: number }>,
  menuById: Map<string, MenuItem>
): NormalizeItemsResult {
  const items: OrderItem[] = [];
  let subtotal = 0;
  for (const r of raw) {
    const m = menuById.get(r.menuItemId);
    if (!m) {
      return {
        ok: false,
        error: localizedMessage(
          `Unknown menu item: ${r.menuItemId}`,
          `عنصر قائمة غير معروف: ${r.menuItemId}`
        ),
      };
    }
    const q = Math.max(0, Math.floor(Number(r.quantity)));
    if (q <= 0) continue;
    items.push({
      menuItemId: m.id,
      name: m.name,
      quantity: q,
      price: m.price,
    });
    subtotal += m.price * q;
  }
  if (items.length === 0) {
    return {
      ok: false,
      error: localizedMessage(
        "Cart is empty or all quantities are zero.",
        "السلة فارغة أو الكميات كلها صفر."
      ),
    };
  }
  return { ok: true, items, subtotal };
}
