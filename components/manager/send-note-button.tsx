"use client";

import { Button } from "@/components/ui/button";

export function SendNoteButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0"
      onClick={() =>
        console.log("send note to waiter", { clientId, clientName })
      }
    >
      Send note to waiter
    </Button>
  );
}
