"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type {
  ActiveVisit,
  CheckoutReceiptLine,
  Client,
  MenuItem,
  OrderItem,
} from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { applyPercentDiscount } from "@/lib/cashier-utils";
import { detectUiLang, networkErrorCopy } from "@/lib/toast-i18n";
import { cn } from "@/lib/utils";

/** Native input styling aligned with `components/ui/input` (avoids Base UI FieldControl hydration mismatch). */
const INPUT_BASE =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

const CATEGORIES = ["Starter", "Main", "Dessert", "Drink"] as const;

const TIER_CONFIG: Record<string, { color: string; bg: string }> = {
  Bronze: { color: "#cd7f32", bg: "rgba(205,127,50,0.15)" },
  Silver: { color: "#aaa", bg: "rgba(170,170,170,0.15)" },
  Gold: { color: "#C9A84C", bg: "rgba(201,168,76,0.15)" },
  VIP: { color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
};

const CAT_ICONS: Record<string, string> = {
  Starter: "🥗",
  Main: "🍽️",
  Dessert: "🍮",
  Drink: "🥂",
};

type SplitMode = "even" | "by_item";

export default function CashierPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orderClients, setOrderClients] = useState<Client[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Main");
  const [menuSearch, setMenuSearch] = useState("");
  const [table, setTable] = useState("1");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [visits, setVisits] = useState<ActiveVisit[]>([]);
  const [shiftSummary, setShiftSummary] = useState<{
    orderCount: number;
    totalRevenue: number;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<CheckoutReceiptLine[] | null>(null);
  const [promoPercentHint, setPromoPercentHint] = useState<number | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [confirmBurst, setConfirmBurst] = useState(false);
  const lastOrderAttemptRef = useRef<(() => void) | null>(null);

  const loadClients = useCallback(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d: Client[]) => setClients(Array.isArray(d) ? d : []));
  }, []);

  const loadVisits = useCallback(() => {
    fetch("/api/visits")
      .then((r) => r.json())
      .then((d: { visits?: ActiveVisit[] }) => setVisits(d.visits ?? []));
  }, []);

  const loadShift = useCallback(() => {
    fetch("/api/shift-log")
      .then((r) => r.json())
      .then((d: { summary?: { orderCount: number; totalRevenue: number } }) => {
        if (d.summary) setShiftSummary(d.summary);
      });
  }, []);

  useEffect(() => {
    loadClients();
    setMenuLoading(true);
    fetch("/api/menu")
      .then((r) => r.json())
      .then(setMenu)
      .catch(() => {
        const lang = detectUiLang();
        const copy = networkErrorCopy(lang);
        toast.error(copy.title, {
          description:
            lang === "ar" ? "تعذر تحميل القائمة." : "Could not load menu.",
          action: {
            label: copy.retry,
            onClick: () => window.location.reload(),
          },
        });
      })
      .finally(() => setMenuLoading(false));
    loadVisits();
    loadShift();
  }, [loadClients, loadVisits, loadShift]);

  useEffect(() => {
    if (!promoCode.trim()) {
      setPromoPercentHint(null);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/promos?code=${encodeURIComponent(promoCode.trim())}`, {
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { percentDiscount?: number } | null) => {
        if (d && typeof d.percentDiscount === "number") {
          setPromoPercentHint(d.percentDiscount);
        } else {
          setPromoPercentHint(null);
        }
      })
      .catch(() => setPromoPercentHint(null));
    return () => ac.abort();
  }, [promoCode]);

  useEffect(() => {
    const first = orderClients[0];
    if (!first) return;
    setAssignment((a) => {
      const next = { ...a };
      for (const line of cart) {
        if (!next[line.menuItemId]) next[line.menuItemId] = first.id;
      }
      return next;
    });
  }, [orderClients, cart]);

  const filteredGuests = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
      c.phone.includes(guestSearch)
  );

  const visibleMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (q) return menu.filter((m) => m.name.toLowerCase().includes(q));
    return menu.filter((m) => m.category === activeCategory);
  }, [menu, menuSearch, activeCategory]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountPct = promoPercentHint ?? 0;
  const estimatedTotal = applyPercentDiscount(subtotal, discountPct);

  function addGuest(c: Client) {
    setOrderClients((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
    setGuestSearch("");
    setShowGuestDropdown(false);
  }

  function removeGuest(id: string) {
    setOrderClients((prev) => prev.filter((x) => x.id !== id));
    setAssignment((a) => {
      const next = { ...a };
      for (const k of Object.keys(next)) {
        if (next[k] === id) delete next[k];
      }
      return next;
    });
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      const first = orderClients[0];
      if (first) {
        setAssignment((a) => ({ ...a, [item.id]: first.id }));
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  }

  function removeOne(menuItemId: string) {
    setCart((prev) => {
      const ex = prev.find((i) => i.menuItemId === menuItemId);
      if (!ex) return prev;
      if (ex.quantity === 1) {
        setAssignment((a) => {
          const n = { ...a };
          delete n[menuItemId];
          return n;
        });
        return prev.filter((i) => i.menuItemId !== menuItemId);
      }
      return prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  }

  function removeItem(menuItemId: string) {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
    setAssignment((a) => {
      const n = { ...a };
      delete n[menuItemId];
      return n;
    });
  }

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function pickVisit(v: ActiveVisit) {
    const c = clients.find((x) => x.id === v.clientId);
    if (c) {
      setOrderClients([c]);
      setTable(v.table || "1");
    }
  }

  async function confirmOrder() {
    lastOrderAttemptRef.current = () => {
      void confirmOrder();
    };
    if (orderClients.length === 0 || cart.length === 0) return;
    if (orderClients.length >= 2 && splitMode === "by_item") {
      for (const line of cart) {
        const aid = assignment[line.menuItemId];
        if (!aid || !orderClients.some((c) => c.id === aid)) return;
      }
    }
    setSubmitting(true);
    try {
      const items = cart.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
      }));
      const body: Record<string, unknown> = {
        table,
        notes,
        items,
      };
      if (promoCode.trim()) body.promoCode = promoCode.trim();

      if (orderClients.length === 1) {
        body.clientId = orderClients[0]!.id;
      } else {
        body.splitMode = splitMode;
        body.clientIds = orderClients.map((c) => c.id);
        if (splitMode === "by_item") {
          body.assignment = assignment;
        }
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.message === "string" ? data.message : "Error";
        const lang = detectUiLang();
        toast.error(lang === "ar" ? "فشل الطلب" : "Order failed", {
          description: msg,
        });
        return;
      }

      const receipt: CheckoutReceiptLine[] = data.receipt ?? [];
      setLastReceipt(receipt);
      setReceiptOpen(true);

      const parts = receipt.map(
        (r) => `Earned ${r.pointsEarned} pts · ${r.name} now ${r.pointsTotal} total`
      );
      setSuccessMsg(parts.join(" · "));
      setTimeout(() => setSuccessMsg(null), 5000);

      setConfirmBurst(true);
      setTimeout(() => setConfirmBurst(false), 900);

      setCart([]);
      setNotes("");
      setPromoCode("");
      setAssignment({});
      loadClients();
      loadVisits();
      loadShift();
    } catch {
      const lang = detectUiLang();
      const copy = networkErrorCopy(lang);
      toast.error(copy.title, {
        description:
          lang === "ar"
            ? "تعذر إرسال الطلب."
            : "Could not send the order.",
        action: {
          label: copy.retry,
          onClick: () => lastOrderAttemptRef.current?.(),
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm =
    orderClients.length > 0 &&
    cart.length > 0 &&
    !(orderClients.length >= 2 && splitMode === "by_item" && cart.some((line) => {
      const aid = assignment[line.menuItemId];
      return !aid || !orderClients.some((c) => c.id === aid);
    }));

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/80 bg-background/80 backdrop-blur-xl px-4 py-3 lg:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg border border-border">
              🧾
            </div>
            <div>
              <p className="font-bold text-base text-foreground leading-none">Cashier App</p>
              <p className="text-xs text-muted-foreground mt-0.5">POS · Order Entry</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {shiftSummary && (
              <div className="text-right text-[10px] text-muted-foreground hidden sm:block">
                <p className="uppercase tracking-widest font-bold text-foreground/70">Today</p>
                <p>
                  {shiftSummary.orderCount} orders · ${shiftSummary.totalRevenue.toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Connected
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {successMsg && (
        <div className="shrink-0 bg-green-500/15 border-b border-green-500/20 px-6 py-3 flex items-center gap-3 text-green-400">
          <span className="text-xl">✅</span>
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Active tables */}
        <div className="w-36 shrink-0 border-r border-border/80 flex flex-col bg-muted/25 hidden md:flex">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest p-3 pb-1">
            Tables
          </p>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {visits.length === 0 ? (
              <p className="text-[10px] text-muted-foreground px-1">No active visits</p>
            ) : (
              visits.map((v) => (
                <button
                  key={v.clientId}
                  type="button"
                  onClick={() => pickVisit(v)}
                  className="w-full text-left rounded-xl px-2 py-2 bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <p className="text-[10px] font-bold text-[#C9A84C]">T{v.table}</p>
                  <p className="text-xs font-medium truncate">{v.name}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border/80 min-w-0">
          <div className="shrink-0 p-2 sm:p-3 border-b border-border/80 space-y-2">
            <input
              data-slot="input"
              placeholder="Search menu…"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className={cn(
                INPUT_BASE,
                "h-9 bg-card border-border rounded-xl text-sm",
              )}
            />
            {!menuSearch.trim() && (
              <div className="flex gap-1 overflow-x-auto">
                {CATEGORIES.map((cat) => {
                  const count = cart
                    .filter((i) => {
                      const mi = menu.find((m) => m.id === i.menuItemId);
                      return mi?.category === cat;
                    })
                    .reduce((s, i) => s + i.quantity, 0);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "relative shrink-0 min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
                        activeCategory === cat
                          ? "bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/35"
                          : "bg-muted/70 text-foreground border-border hover:bg-muted",
                      )}
                    >
                      {CAT_ICONS[cat]} {cat}
                      {count > 0 && (
                        <span className="ml-1.5 bg-[#C9A84C] text-[#0F0D09] text-[10px] font-bold w-4 h-4 rounded-full inline-flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
            {menuLoading ? (
              <div className="grid grid-cols-2 min-[1280px]:grid-cols-3 gap-2 sm:gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : (
            <div
              key={menuSearch || activeCategory}
              className="grid grid-cols-2 min-[1280px]:grid-cols-3 gap-2 sm:gap-3"
            >
                {visibleMenu.map((item) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addToCart(item)}
                      className={cn(
                        "relative text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] hover:scale-[1.01]",
                        inCart
                          ? "bg-[#C9A84C]/12 border-[#C9A84C]/40"
                          : "bg-muted/60 border-border hover:bg-muted",
                      )}
                    >
                      {inCart && (
                        <span className="absolute top-2.5 right-2.5 min-w-7 min-h-7 h-7 px-1.5 gold-gradient text-[#0F0D09] text-xs font-bold rounded-full inline-flex items-center justify-center shadow-lg tabular-nums">
                          {inCart.quantity}
                        </span>
                      )}
                      <p className="font-semibold text-sm text-foreground pr-6">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                      <p
                        className={cn(
                          "text-sm mt-1 tabular-nums",
                          inCart ? "text-[#C9A84C]" : "text-muted-foreground",
                        )}
                      >
                        ${item.price}
                      </p>
                    </button>
                  );
                })}
            </div>
            )}
          </div>
        </div>

        {/* Order panel */}
        <div
          className="w-88 shrink-0 flex flex-col overflow-hidden min-h-0"
          style={{ width: "min(22rem, 100vw)" }}
        >
          <div className="shrink-0 p-4 border-b border-border/80 space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Guests
            </p>
            <div className="relative">
              <input
                data-slot="input"
                placeholder="Add guest…"
                value={guestSearch}
                onChange={(e) => {
                  setGuestSearch(e.target.value);
                  setShowGuestDropdown(true);
                }}
                onFocus={() => setShowGuestDropdown(true)}
                className={cn(
                  INPUT_BASE,
                  "h-10 bg-card border-border rounded-xl text-sm",
                )}
              />
                {showGuestDropdown && guestSearch && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-border bg-popover shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                  >
                    {filteredGuests.slice(0, 6).map((c) => {
                      const t = TIER_CONFIG[c.tier];
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center gap-2 text-sm"
                          onClick={() => addGuest(c)}
                        >
                          <span className="font-medium text-foreground truncate">{c.name}</span>
                          <span
                            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ color: t.color, background: t.bg }}
                          >
                            {c.tier}
                          </span>
                        </button>
                      );
                    })}
                    {filteredGuests.length === 0 && (
                      <p className="text-sm text-muted-foreground p-3">No guests found.</p>
                    )}
                  </div>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {orderClients.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-muted text-xs border border-border"
                >
                  <span className="truncate max-w-[120px]">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => removeGuest(c.id)}
                    className="w-5 h-5 rounded hover:bg-muted text-muted-foreground"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            {orderClients.length >= 2 && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSplitMode("even")}
                  className={`flex-1 text-xs py-2 rounded-lg border ${
                    splitMode === "even"
                      ? "border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]"
                      : "border-border bg-muted/40"
                  }`}
                >
                  Split even
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("by_item")}
                  className={`flex-1 text-xs py-2 rounded-lg border ${
                    splitMode === "by_item"
                      ? "border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]"
                      : "border-border bg-muted/40"
                  }`}
                >
                  By item
                </button>
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 py-3 border-b border-border/80 flex items-center gap-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
              Table
            </p>
            <input
              data-slot="input"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className={cn(
                INPUT_BASE,
                "w-20 h-8 bg-card border-border rounded-lg text-sm text-center",
              )}
            />
          </div>

          <div className="shrink-0 px-4 py-2 border-b border-border/80">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Promo
            </p>
            <input
              data-slot="input"
              placeholder="Code…"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className={cn(
                INPUT_BASE,
                "h-9 bg-card border-border rounded-xl text-sm uppercase",
              )}
            />
            {promoPercentHint != null && (
              <p className="text-[10px] text-[#C9A84C] mt-1">{promoPercentHint}% off if valid</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">
                Tap items to add them
              </p>
            ) : (
              cart.map((item) => (
                <CashierCartRow
                  key={item.menuItemId}
                  item={item}
                  menu={menu}
                  orderClients={orderClients}
                  splitMode={splitMode}
                  assignment={assignment}
                  setAssignment={setAssignment}
                  removeOne={removeOne}
                  removeItem={removeItem}
                  addToCart={addToCart}
                />
              ))
            )}
          </div>

          <div className="shrink-0 border-t border-border/80 bg-background/95 backdrop-blur-sm p-3 space-y-3">
            <input
              data-slot="input"
              placeholder="Order notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                INPUT_BASE,
                "h-9 bg-card border-border rounded-xl text-sm",
              )}
            />

            <div className="flex justify-between items-baseline gap-2 text-sm">
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {cartCount} item{cartCount !== 1 ? "s" : ""}
              </span>
              <div className="text-right space-y-0.5 min-w-0">
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Subtotal</span>
                  <span className="font-semibold tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                {discountPct > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Est. total</span>
                    <span className="text-xl font-bold gold-text tabular-nums">${estimatedTotal.toFixed(2)}</span>
                  </div>
                )}
                {discountPct === 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Total</span>
                    <span className="text-2xl sm:text-3xl font-bold gold-text tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={confirmOrder}
              disabled={!canConfirm || submitting}
              className={cn(
                "relative w-full min-h-[52px] py-4 rounded-2xl font-bold text-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden active:scale-[0.98] enabled:hover:scale-[1.01]",
                !canConfirm || cart.length === 0
                  ? "bg-muted text-muted-foreground shadow-none"
                  : "gold-gradient text-[#0F0D09] shadow-[0_4px_20px_rgba(201,168,76,0.3)]",
              )}
            >
              {confirmBurst && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl text-[#0F0D09]">
                  ✓
                </span>
              )}
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0F0D09]/30 border-t-[#0F0D09] rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                "Confirm order"
              )}
            </button>

            {orderClients.length === 0 && cart.length > 0 && (
              <p className="text-xs text-center text-red-400/80">Add a guest to confirm</p>
            )}
          </div>
        </div>
      </div>

      {receiptOpen && lastReceipt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 print:static print:bg-white print:p-0"
          >
            <div
              className="bg-card print:bg-white border border-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 text-foreground shadow-xl print:border-0 print:max-w-none print:shadow-none dark:bg-[#1a1a1a] dark:border-white/10"
            >
              <h2 className="text-lg font-bold mb-4 print:text-black">Receipt</h2>
              {lastReceipt.map((row) => (
                <div key={row.clientId} className="mb-6 border-b border-border pb-4 last:border-0 print:border-black/10">
                  <p className="font-semibold print:text-black">{row.name}</p>
                  <p className="text-xs text-muted-foreground print:text-gray-600">
                    +{row.pointsEarned} pts · balance {row.pointsTotal} · {row.tier}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm print:text-black">
                    {row.items.map((it) => (
                      <li key={`${row.clientId}-${it.menuItemId}`} className="flex justify-between">
                        <span>
                          {it.name} × {it.quantity}
                        </span>
                        <span>${(it.price * it.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-right font-bold text-[#C9A84C] mt-2 print:text-black">
                    ${row.total.toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-xl bg-muted border border-border font-semibold"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptOpen(false)}
                  className="flex-1 py-3 rounded-xl gold-gradient text-[#0F0D09] font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function CashierCartRow({
  item,
  menu,
  orderClients,
  splitMode,
  assignment,
  setAssignment,
  removeOne,
  removeItem,
  addToCart,
}: {
  item: OrderItem;
  menu: MenuItem[];
  orderClients: Client[];
  splitMode: SplitMode;
  assignment: Record<string, string>;
  setAssignment: Dispatch<SetStateAction<Record<string, string>>>;
  removeOne: (id: string) => void;
  removeItem: (id: string) => void;
  addToCart: (item: MenuItem) => void;
}) {
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const clearLp = () => {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 pl-2 pr-1 py-2 touch-pan-y dark:bg-white/[0.02]"
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        longPress.current = setTimeout(() => {
          removeItem(item.menuItemId);
        }, 520);
      }}
      onPointerMove={(e) => {
        if (!pointerStart.current) return;
        const dx = e.clientX - pointerStart.current.x;
        const dy = e.clientY - pointerStart.current.y;
        if (dx * dx + dy * dy > 144) clearLp();
      }}
      onPointerUp={() => {
        pointerStart.current = null;
        clearLp();
      }}
      onPointerCancel={clearLp}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">${item.price} ea</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => removeOne(item.menuItemId)}
            className="min-h-11 min-w-11 rounded-lg border border-border bg-muted hover:bg-muted/80 text-sm font-bold transition-colors flex items-center justify-center"
          >
            −
          </button>
          <span className="w-7 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
          <button
            type="button"
            onClick={() => {
              const mi = menu.find((m) => m.id === item.menuItemId);
              if (mi) addToCart(mi);
            }}
            className="min-h-11 min-w-11 rounded-lg border border-border bg-muted hover:bg-muted/80 text-sm font-bold transition-colors flex items-center justify-center"
          >
            +
          </button>
        </div>
        <span className="w-14 text-right text-sm font-semibold text-[#C9A84C] shrink-0 tabular-nums">
          ${item.price * item.quantity}
        </span>
        <button
          type="button"
          onClick={() => removeItem(item.menuItemId)}
          className="min-h-11 min-w-11 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 text-xs transition-colors flex items-center justify-center shrink-0"
        >
          ✕
        </button>
      </div>
      {orderClients.length >= 2 && splitMode === "by_item" && (
        <select
          className="text-[10px] bg-card border border-border rounded-lg px-2 py-1 max-w-full min-h-9 dark:bg-input/30"
          value={assignment[item.menuItemId] ?? ""}
          onChange={(e) =>
            setAssignment((a) => ({ ...a, [item.menuItemId]: e.target.value }))
          }
        >
          <option value="">Assign…</option>
          {orderClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
