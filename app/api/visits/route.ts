import { NextRequest, NextResponse } from "next/server";
import {
  getActiveVisits,
  getClientById,
  markArrived,
  markDeparted,
} from "@/lib/data";
import { localizedMessage, pickLocalized, resolveLang } from "@/lib/api-messages";

const errNoClientId = localizedMessage("clientId is required.", "معرّف الضيف مطلوب.");
const errClientNotFound = localizedMessage("Client not found.", "لم يُعثر على الضيف.");
const msgArrived = localizedMessage("Guest marked as arrived.", "تم تسجيل وصول الضيف.");
const msgDeparted = localizedMessage("Guest marked as departed.", "تم تسجيل مغادرة الضيف.");

// GET /api/visits — active in-house guests
export async function GET(req: NextRequest) {
  const lang = resolveLang(req);
  const visits = getActiveVisits();
  return NextResponse.json({
    visits,
    message: localizedMessage("Active visits loaded.", "تم تحميل الزيارات النشطة."),
    messagePrimary: pickLocalized(
      localizedMessage("Active visits loaded.", "تم تحميل الزيارات النشطة."),
      lang
    ),
  });
}

// POST /api/visits — body: { clientId }
export async function POST(req: NextRequest) {
  const lang = resolveLang(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: localizedMessage("Invalid JSON body.", "محتوى JSON غير صالح."),
        message: pickLocalized(localizedMessage("Invalid JSON body.", "محتوى JSON غير صالح."), lang),
      },
      { status: 400 }
    );
  }

  const clientId =
    typeof body === "object" && body !== null && "clientId" in body
      ? String((body as { clientId: unknown }).clientId)
      : "";

  if (!clientId) {
    return NextResponse.json(
      { error: errNoClientId, message: pickLocalized(errNoClientId, lang) },
      { status: 400 }
    );
  }

  const client = getClientById(clientId);
  if (!client) {
    return NextResponse.json(
      { error: errClientNotFound, message: pickLocalized(errClientNotFound, lang) },
      { status: 404 }
    );
  }

  markArrived(client);
  return NextResponse.json({
    visits: getActiveVisits(),
    message: msgArrived,
    messagePrimary: pickLocalized(msgArrived, lang),
  });
}

// DELETE /api/visits?clientId=xxx
export async function DELETE(req: NextRequest) {
  const lang = resolveLang(req);
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: errNoClientId, message: pickLocalized(errNoClientId, lang) },
      { status: 400 }
    );
  }

  markDeparted(clientId);
  return NextResponse.json({
    visits: getActiveVisits(),
    message: msgDeparted,
    messagePrimary: pickLocalized(msgDeparted, lang),
  });
}
