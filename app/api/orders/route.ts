import { NextRequest, NextResponse } from "next/server";
import { getOrders, getOrdersByClientId, saveOrder } from "@/lib/data";
import type { Order } from "@/lib/types";

// GET /api/orders?clientId=xxx  or  GET /api/orders (all)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (clientId) {
    return NextResponse.json(getOrdersByClientId(clientId));
  }

  return NextResponse.json(getOrders());
}

// POST /api/orders  — create a new order (called by cashier)
export async function POST(req: NextRequest) {
  const body = await req.json();

  const order: Order = {
    id: `o${Date.now()}`,
    clientId: body.clientId,
    date: new Date().toISOString().split("T")[0],
    status: "completed",
    table: body.table ?? "1",
    items: body.items,
    total: body.total,
    notes: body.notes ?? "",
  };

  saveOrder(order);
  return NextResponse.json(order, { status: 201 });
}
