import { NextRequest, NextResponse } from "next/server";
import { toISODateString } from "@/lib/analytics";
import { getShiftLogEntriesForDate } from "@/lib/data";
import { localizedMessage, pickLocalized, resolveLang } from "@/lib/api-messages";

// GET /api/shift-log?date=YYYY-MM-DD&lang=en
export async function GET(req: NextRequest) {
  const lang = resolveLang(req);
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const dateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : toISODateString(new Date());

  const entries = getShiftLogEntriesForDate(dateStr);
  const totalRevenue = entries.reduce((s, e) => s + e.totalRevenue, 0);
  const orderCount = entries.reduce((s, e) => s + e.orderIds.length, 0);

  const msg = localizedMessage("Shift log loaded.", "تم تحميل سجل الوردية.");

  return NextResponse.json({
    date: dateStr,
    entries,
    summary: {
      orderCount,
      totalRevenue,
      batchCount: entries.length,
    },
    message: msg,
    messagePrimary: pickLocalized(msg, lang),
  });
}
