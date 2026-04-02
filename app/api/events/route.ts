import type { NextRequest } from "next/server";
import { localizedMessage, pickLocalized, resolveLang } from "@/lib/api-messages";
import { subscribeOrderEvents } from "@/lib/events";

export const runtime = "nodejs";

const errMissingClientId = localizedMessage(
  "Query parameter clientId is required.",
  "معامل الاستعلام clientId مطلوب."
);

export async function GET(req: NextRequest) {
  const lang = resolveLang(req);
  const clientId = req.nextUrl.searchParams.get("clientId")?.trim() ?? "";

  if (!clientId) {
    return Response.json(
      {
        error: errMissingClientId,
        message: pickLocalized(errMissingClientId, lang),
      },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: "connected", clientId });

      unsubscribe = subscribeOrderEvents(clientId, ({ orderId }) => {
        send({ type: "order", clientId, orderId });
      });

      const cleanup = () => {
        unsubscribe?.();
        unsubscribe = null;
      };

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      unsubscribe?.();
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
