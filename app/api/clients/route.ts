import { NextRequest, NextResponse } from "next/server";
import { getClients, getClientByPhone, getClientWithStats } from "@/lib/data";

// GET /api/clients?phone=xxx  or  GET /api/clients?id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const id = searchParams.get("id");

  if (phone) {
    const client = getClientByPhone(phone);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const profile = getClientWithStats(client.id);
    return NextResponse.json(profile);
  }

  if (id) {
    const profile = getClientWithStats(id);
    if (!profile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  }

  // Return all clients (basic, for cashier selector)
  return NextResponse.json(getClients());
}
