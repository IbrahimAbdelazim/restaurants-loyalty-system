import { NextRequest, NextResponse } from "next/server";
import {
  appendShiftLogEntry,
  awardPointsAndSave,
  getClientById,
  getMenu,
  getOrders,
  getOrdersByClientId,
  getActivePromoByCode,
  markDeparted,
  saveOrder,
} from "@/lib/data";
import { localizedMessage, pickLocalized, resolveLang } from "@/lib/api-messages";
import { normalizeOrderItemsFromMenu } from "@/lib/order-checkout";
import {
  applyPercentDiscount,
  pointsEarnedFromSpend,
  proportionalSplitAfterDiscount,
  splitEvenDollars,
} from "@/lib/cashier-utils";
import type { CheckoutReceiptLine, Order, OrderItem } from "@/lib/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// GET /api/orders?clientId=xxx  or  GET /api/orders (all)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (clientId) {
    return NextResponse.json(getOrdersByClientId(clientId));
  }

  return NextResponse.json(getOrders());
}

// POST /api/orders — single or split checkout (prices from menu)
export async function POST(req: NextRequest) {
  const lang = resolveLang(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: localizedMessage("Invalid JSON body.", "محتوى JSON غير صالح."),
        message: pickLocalized(
          localizedMessage("Invalid JSON body.", "محتوى JSON غير صالح."),
          lang
        ),
      },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const table = String(b.table ?? "1");
  const notes = typeof b.notes === "string" ? b.notes : "";
  const promoCodeRaw = typeof b.promoCode === "string" ? b.promoCode.trim() : "";
  const splitMode = b.splitMode as "even" | "by_item" | undefined;
  const clientIds = Array.isArray(b.clientIds)
    ? (b.clientIds as unknown[]).map(String)
    : undefined;
  const clientIdSingle = typeof b.clientId === "string" ? b.clientId : "";
  const assignment =
    b.assignment && typeof b.assignment === "object" && b.assignment !== null
      ? (b.assignment as Record<string, string>)
      : undefined;

  const rawItems = Array.isArray(b.items) ? b.items : [];
  const menu = getMenu();
  const menuById = new Map(menu.map((m) => [m.id, m]));

  const normalized = normalizeOrderItemsFromMenu(
    rawItems.map((row: { menuItemId?: string; quantity?: number }) => ({
      menuItemId: String(row.menuItemId ?? ""),
      quantity: Number(row.quantity ?? 0),
    })),
    menuById
  );

  if (!normalized.ok) {
    return NextResponse.json(
      { error: normalized.error, message: pickLocalized(normalized.error, lang) },
      { status: 400 }
    );
  }

  const { items, subtotal } = normalized;
  let promoPercent = 0;
  if (promoCodeRaw) {
    const promo = getActivePromoByCode(promoCodeRaw);
    if (!promo) {
      const err = localizedMessage(
        "Invalid or inactive promo code.",
        "رمز الخصم غير صالح أو غير مفعّل."
      );
      return NextResponse.json(
        { error: err, message: pickLocalized(err, lang) },
        { status: 400 }
      );
    }
    promoPercent = promo.percentDiscount;
  }

  const discountedTotal = applyPercentDiscount(subtotal, promoPercent);
  const discountTotal = round2(subtotal - discountedTotal);
  const promoCodeSaved = promoCodeRaw && promoPercent > 0 ? promoCodeRaw.toUpperCase() : undefined;

  const msgOk = localizedMessage("Order completed.", "تم إتمام الطلب.");

  if (splitMode && clientIds && clientIds.length >= 2) {
    return handleSplitCheckout({
      lang,
      splitMode,
      clientIds,
      items,
      discountedTotal,
      discountTotal,
      table,
      notes,
      promoCode: promoCodeSaved,
      assignment,
    });
  }

  if (splitMode && clientIds && clientIds.length < 2) {
    const err = localizedMessage(
      "Split checkout requires at least two guests.",
      "تقسيم الفاتورة يتطلب ضيفين على الأقل."
    );
    return NextResponse.json(
      { error: err, message: pickLocalized(err, lang) },
      { status: 400 }
    );
  }

  if (!clientIdSingle) {
    const err = localizedMessage("Guest is required.", "الضيف مطلوب.");
    return NextResponse.json(
      { error: err, message: pickLocalized(err, lang) },
      { status: 400 }
    );
  }

  const client = getClientById(clientIdSingle);
  if (!client) {
    const err = localizedMessage("Client not found.", "لم يُعثر على الضيف.");
    return NextResponse.json(
      { error: err, message: pickLocalized(err, lang) },
      { status: 404 }
    );
  }

  const pointsEarned = pointsEarnedFromSpend(discountedTotal);
  const orderId = `o${Date.now()}-0`;
  const order: Order = {
    id: orderId,
    clientId: client.id,
    date: new Date().toISOString().split("T")[0],
    status: "completed",
    table,
    items,
    total: discountedTotal,
    notes,
    promoCode: promoCodeSaved,
    discountTotal: discountTotal > 0 ? discountTotal : undefined,
    pointsEarned,
  };
  saveOrder(order);
  const updated = awardPointsAndSave(client, pointsEarned);
  markDeparted(client.id);

  appendShiftLogEntry({
    confirmedAt: new Date().toISOString(),
    table,
    orderIds: [orderId],
    totalRevenue: discountedTotal,
    clientSummaries: [
      {
        clientId: updated.id,
        name: updated.name,
        pointsEarned,
        total: discountedTotal,
      },
    ],
  });

  const receipt: CheckoutReceiptLine[] = [
    {
      clientId: updated.id,
      name: updated.name,
      total: discountedTotal,
      pointsEarned,
      pointsTotal: updated.points,
      tier: updated.tier,
      items,
    },
  ];

  return NextResponse.json(
    {
      order,
      orders: [order],
      receipt,
      message: msgOk,
      messagePrimary: pickLocalized(msgOk, lang),
    },
    { status: 201 }
  );
}

function handleSplitCheckout(params: {
  lang: "en" | "ar";
  splitMode: "even" | "by_item";
  clientIds: string[];
  items: OrderItem[];
  discountedTotal: number;
  discountTotal: number;
  table: string;
  notes: string;
  promoCode?: string;
  assignment?: Record<string, string>;
}) {
  const {
    lang,
    splitMode,
    clientIds,
    items,
    discountedTotal,
    discountTotal,
    table,
    notes,
    promoCode,
    assignment,
  } = params;

  const clients = clientIds.map((id) => getClientById(id));
  if (clients.some((c) => !c)) {
    const err = localizedMessage("One or more guests were not found.", "لم يُعثر على أحد الضيوف أو أكثر.");
    return NextResponse.json(
      { error: err, message: pickLocalized(err, lang) },
      { status: 404 }
    );
  }

  const baseTime = Date.now();
  const orders: Order[] = [];
  const receipt: CheckoutReceiptLine[] = [];
  const orderIds: string[] = [];

  if (splitMode === "even") {
    const amounts = splitEvenDollars(discountedTotal, clientIds.length);
    const fullItems = items.map((i) => ({ ...i }));
    for (let i = 0; i < clientIds.length; i++) {
      const c = clients[i]!;
      const total = amounts[i]!;
      const pe = pointsEarnedFromSpend(total);
      const orderId = `o${baseTime}-${i}`;
      orderIds.push(orderId);
      const order: Order = {
        id: orderId,
        clientId: c!.id,
        date: new Date().toISOString().split("T")[0],
        status: "completed",
        table,
        items: fullItems,
        total: total,
        notes,
        promoCode,
        discountTotal: i === 0 && discountTotal > 0 ? discountTotal : undefined,
        pointsEarned: pe,
      };
      saveOrder(order);
      orders.push(order);
      const updated = awardPointsAndSave(c!, pe);
      markDeparted(c!.id);
      receipt.push({
        clientId: updated.id,
        name: updated.name,
        total,
        pointsEarned: pe,
        pointsTotal: updated.points,
        tier: updated.tier,
        items: fullItems,
      });
    }
  } else {
    if (!assignment) {
      const err = localizedMessage(
        "Item assignment is required for split by item.",
        "تعيين العناصر للضيوف مطلوب لتقسيم الفاتورة حسب الصنف."
      );
      return NextResponse.json(
        { error: err, message: pickLocalized(err, lang) },
        { status: 400 }
      );
    }
    const perClientItems = new Map<string, OrderItem[]>();
    for (const id of clientIds) perClientItems.set(id, []);

    for (const line of items) {
      const aid = assignment[line.menuItemId];
      if (!aid || !clientIds.includes(aid)) {
        const err = localizedMessage(
          `Assign every line item to a guest (${line.name}).`,
          `عيّن كل بند لأحد الضيوف (${line.name}).`
        );
        return NextResponse.json(
          { error: err, message: pickLocalized(err, lang) },
          { status: 400 }
        );
      }
      const list = perClientItems.get(aid)!;
      list.push({ ...line });
    }

    const sums = clientIds.map((id) =>
      (perClientItems.get(id) ?? []).reduce((s, x) => s + x.price * x.quantity, 0)
    );
    const sumTotal = sums.reduce((a, b) => a + b, 0);
    if (sumTotal <= 0) {
      const err = localizedMessage("Invalid item assignment totals.", "مجموع التعيين غير صالح.");
      return NextResponse.json(
        { error: err, message: pickLocalized(err, lang) },
        { status: 400 }
      );
    }

    const finalAmounts = proportionalSplitAfterDiscount(sums, sumTotal, discountedTotal);

    for (let i = 0; i < clientIds.length; i++) {
      const c = clients[i]!;
      const lineItems = perClientItems.get(c!.id) ?? [];
      const total = finalAmounts[i] ?? 0;
      const pe = pointsEarnedFromSpend(total);
      const orderId = `o${baseTime}-${i}`;
      orderIds.push(orderId);
      const order: Order = {
        id: orderId,
        clientId: c!.id,
        date: new Date().toISOString().split("T")[0],
        status: "completed",
        table,
        items: lineItems,
        total,
        notes,
        promoCode,
        discountTotal: i === 0 && discountTotal > 0 ? discountTotal : undefined,
        pointsEarned: pe,
      };
      saveOrder(order);
      orders.push(order);
      const updated = awardPointsAndSave(c!, pe);
      markDeparted(c!.id);
      receipt.push({
        clientId: updated.id,
        name: updated.name,
        total,
        pointsEarned: pe,
        pointsTotal: updated.points,
        tier: updated.tier,
        items: lineItems,
      });
    }
  }

  appendShiftLogEntry({
    confirmedAt: new Date().toISOString(),
    table,
    orderIds,
    totalRevenue: discountedTotal,
    clientSummaries: receipt.map((r) => ({
      clientId: r.clientId,
      name: r.name,
      pointsEarned: r.pointsEarned,
      total: r.total,
    })),
  });

  const msgOk = localizedMessage("Orders completed.", "تم إتمام الطلبات.");
  return NextResponse.json(
    {
      orders,
      receipt,
      message: msgOk,
      messagePrimary: pickLocalized(msgOk, lang),
    },
    { status: 201 }
  );
}
