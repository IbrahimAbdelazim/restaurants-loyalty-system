import { NextRequest, NextResponse } from "next/server";
import {
  findClientsByPhoneDigits,
  getClients,
  getClientByPhone,
  getClientWithStats,
  registerClient,
} from "@/lib/data";
import { localizedMessage, pickLocalized, resolveLang } from "@/lib/api-messages";
import type { ClientMatchPreview } from "@/lib/types";

const errNotFound = localizedMessage("Client not found.", "لم يُعثر على الضيف.");
const errDigitsShort = localizedMessage(
  "Enter at least 4 digits to search.",
  "أدخل 4 أرقام على الأقل للبحث."
);
const errRegisterDuplicate = localizedMessage(
  "A guest with this phone number already exists.",
  "يوجد بالفعل ضيف بهذا الرقم."
);
const errRegisterName = localizedMessage("Name is required.", "الاسم مطلوب.");
const errRegisterPhone = localizedMessage(
  "Valid phone number is required.",
  "رقم هاتف صالح مطلوب."
);
const msgRegistered = localizedMessage("Guest registered successfully.", "تم تسجيل الضيف بنجاح.");

function preview(c: { id: string; name: string; phone: string }): ClientMatchPreview {
  return { id: c.id, name: c.name, phone: c.phone };
}

// GET /api/clients?phone=xxx | ?id=xxx | ?digits=xxxx | (no params) all clients
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = resolveLang(req);
  const phone = searchParams.get("phone");
  const id = searchParams.get("id");
  const digits = searchParams.get("digits");

  if (phone) {
    const client = getClientByPhone(phone);
    if (!client) {
      return NextResponse.json(
        { error: errNotFound, message: pickLocalized(errNotFound, lang) },
        { status: 404 }
      );
    }
    const profile = getClientWithStats(client.id);
    return NextResponse.json(profile);
  }

  if (id) {
    const profile = getClientWithStats(id);
    if (!profile) {
      return NextResponse.json(
        { error: errNotFound, message: pickLocalized(errNotFound, lang) },
        { status: 404 }
      );
    }
    return NextResponse.json(profile);
  }

  if (digits !== null && digits !== "") {
    const d = digits.replace(/\D/g, "");
    if (d.length < 4) {
      return NextResponse.json(
        { error: errDigitsShort, message: pickLocalized(errDigitsShort, lang) },
        { status: 400 }
      );
    }
    const matches = findClientsByPhoneDigits(d).map(preview);
    return NextResponse.json({ matches });
  }

  return NextResponse.json(getClients());
}

// POST /api/clients — register new guest
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

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name : "";
  const phone = typeof b.phone === "string" ? b.phone : "";
  const birthday =
    b.birthday === null || b.birthday === undefined
      ? null
      : typeof b.birthday === "string"
        ? b.birthday
        : null;
  const notes = typeof b.notes === "string" ? b.notes : "";

  const result = registerClient({ name, phone, birthday, notes });
  if (!result.ok) {
    if (result.reason === "duplicate_phone") {
      return NextResponse.json(
        { error: errRegisterDuplicate, message: pickLocalized(errRegisterDuplicate, lang) },
        { status: 409 }
      );
    }
    if (result.reason === "invalid_name") {
      return NextResponse.json(
        { error: errRegisterName, message: pickLocalized(errRegisterName, lang) },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: errRegisterPhone, message: pickLocalized(errRegisterPhone, lang) },
      { status: 400 }
    );
  }

  const profile = getClientWithStats(result.client.id);
  return NextResponse.json(
    {
      client: profile,
      message: msgRegistered,
      messagePrimary: pickLocalized(msgRegistered, lang),
    },
    { status: 201 }
  );
}
