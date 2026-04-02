import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Guards theme token contract so refactors do not drop navy/light border tuning. */
describe("app/globals.css theme", () => {
  const css = readFileSync(
    join(__dirname, "../app/globals.css"),
    "utf8",
  );

  it("uses navy-hued dark surfaces and gold primary", () => {
    expect(css).toMatch(/--background:\s*oklch\(0\.14[56].*258\)/);
    expect(css).toContain("--primary: oklch(0.76 0.11 78)");
  });

  it("strengthens light-mode borders vs legacy 8% black", () => {
    expect(css).toContain(
      "--border: oklch(0.52 0.04 260 / 0.2)",
    );
  });

  it("documents Card border via border-border utility", () => {
    // card.tsx must use token-backed border, not ring-foreground/10
    const card = readFileSync(
      join(__dirname, "../components/ui/card.tsx"),
      "utf8",
    );
    expect(card).toContain("border border-border");
    expect(card).not.toContain("ring-foreground/10");
  });
});

/** Waiter search/dial must use CSS variables in light mode (not white/opacity on white). */
describe("app/waiter/page.tsx surfaces", () => {
  const waiter = readFileSync(
    join(__dirname, "../app/waiter/page.tsx"),
    "utf8",
  );

  it("uses token borders and muted surfaces for phone field and dial pad", () => {
    expect(waiter).toContain("bg-card border-border");
    expect(waiter).toContain("border-border bg-muted");
    expect(waiter).not.toMatch(/border-white\/10/);
    expect(waiter).not.toMatch(/bg-white\/\[0\./);
  });

  it("keeps empty state helper text readable (not ultra-faint muted)", () => {
    expect(waiter).not.toContain("text-muted-foreground/40");
  });

  it("avoids autoFocus on phone input (Base UI + focus breaks SSR/client hydration)", () => {
    expect(waiter).not.toMatch(/\bautoFocus\b/);
  });
});

/** Cashier POS panels use token borders in light mode (same issue as waiter). */
describe("app/cashier/page.tsx surfaces", () => {
  const cashier = readFileSync(
    join(__dirname, "../app/cashier/page.tsx"),
    "utf8",
  );

  it("uses border-border for chrome instead of invisible white/6% borders", () => {
    expect(cashier).toContain("border-border/80");
    expect(cashier).not.toContain("border-white/[0.06]");
    expect(cashier).not.toMatch(/bg-white\/\[0\.04\]/);
  });
});
