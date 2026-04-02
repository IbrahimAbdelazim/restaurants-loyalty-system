import { NextResponse } from "next/server";
import { getMenu } from "@/lib/data";

export async function GET() {
  return NextResponse.json(getMenu());
}
