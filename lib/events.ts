import { EventEmitter } from "node:events";

const GLOBAL_KEY = "__restaurantsOrderBus__" as const;

type OrderSavedPayload = { orderId: string };

function getEmitter(): EventEmitter {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: EventEmitter };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new EventEmitter();
    g[GLOBAL_KEY]!.setMaxListeners(200);
  }
  return g[GLOBAL_KEY]!;
}

function channel(clientId: string): string {
  return `order:${clientId}`;
}

/** Subscribe to order-saved events for one guest. Returns unsubscribe. */
export function subscribeOrderEvents(
  clientId: string,
  listener: (payload: OrderSavedPayload) => void
): () => void {
  const emitter = getEmitter();
  const ch = channel(clientId);
  const wrapped = (payload: OrderSavedPayload) => listener(payload);
  emitter.on(ch, wrapped);
  return () => {
    emitter.off(ch, wrapped);
  };
}

/** Call after each successful saveOrder (same process only). */
export function emitOrderSaved(clientId: string, orderId: string): void {
  getEmitter().emit(channel(clientId), { orderId });
}
