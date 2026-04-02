import { describe, it, expect, vi } from "vitest";
import { emitOrderSaved, subscribeOrderEvents } from "./events";

describe("subscribeOrderEvents / emitOrderSaved", () => {
  it("delivers payload only to matching clientId", () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribeOrderEvents("c1", a);
    const unsubB = subscribeOrderEvents("c2", b);

    emitOrderSaved("c1", "o1");

    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith({ orderId: "o1" });
    expect(b).not.toHaveBeenCalled();

    unsubA();
    unsubB();
  });

  it("unsubscribe stops delivery", () => {
    const fn = vi.fn();
    const unsub = subscribeOrderEvents("c3", fn);
    emitOrderSaved("c3", "o-a");
    expect(fn).toHaveBeenCalledTimes(1);

    unsub();
    emitOrderSaved("c3", "o-b");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
