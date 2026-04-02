import { describe, expect, it } from "vitest";
import { networkErrorCopy } from "./toast-i18n";

describe("networkErrorCopy", () => {
  it("returns EN strings", () => {
    const c = networkErrorCopy("en");
    expect(c.title).toBe("Connection error");
    expect(c.retry).toBe("Retry");
  });

  it("returns AR strings", () => {
    const c = networkErrorCopy("ar");
    expect(c.title).toContain("اتصال");
    expect(c.retry).toBeTruthy();
  });
});
