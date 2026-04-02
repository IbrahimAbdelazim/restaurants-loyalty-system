import { NextRequest, NextResponse } from "next/server";
import { getActivePromoByCode, getPromos } from "@/lib/data";
import { localizedMessage, pickLocalized, resolveLang } from "@/lib/api-messages";

// GET /api/promos — optional ?code=XXX to validate and return percent
export async function GET(req: NextRequest) {
  const lang = resolveLang(req);
  const code = new URL(req.url).searchParams.get("code");

  if (code && code.trim()) {
    const promo = getActivePromoByCode(code);
    if (!promo) {
      const err = localizedMessage("Invalid or inactive promo code.", "رمز الخصم غير صالح أو غير مفعّل.");
      return NextResponse.json(
        { error: err, message: pickLocalized(err, lang) },
        { status: 404 }
      );
    }
    const msg = localizedMessage("Promo found.", "تم العثور على العرض.");
    return NextResponse.json({
      code: promo.code,
      percentDiscount: promo.percentDiscount,
      message: msg,
      messagePrimary: pickLocalized(msg, lang),
    });
  }

  const active = getPromos().filter((p) => p.active);
  const msg = localizedMessage("Promo codes loaded.", "تم تحميل رموز الخصم.");
  return NextResponse.json({
    promos: active.map((p) => ({ code: p.code, percentDiscount: p.percentDiscount })),
    message: msg,
    messagePrimary: pickLocalized(msg, lang),
  });
}
