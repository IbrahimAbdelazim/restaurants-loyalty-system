"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Client, MenuItem, OrderItem } from "@/lib/types";

const CATEGORIES = ["Starter", "Main", "Dessert", "Drink"] as const;

const TIER_CONFIG: Record<string, { color: string; bg: string }> = {
  Bronze: { color: "#cd7f32", bg: "rgba(205,127,50,0.15)" },
  Silver: { color: "#aaa",    bg: "rgba(170,170,170,0.15)" },
  Gold:   { color: "#C9A84C", bg: "rgba(201,168,76,0.15)" },
  VIP:    { color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
};

const CAT_ICONS: Record<string, string> = {
  Starter: "🥗", Main: "🍽️", Dessert: "🍮", Drink: "🥂",
};

export default function CashierPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Main");
  const [table, setTable] = useState("1");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/menu").then((r) => r.json()).then(setMenu);
  }, []);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone.includes(clientSearch)
  );

  const visibleMenu = menu.filter((m) => m.category === activeCategory);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) return prev.map((i) => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  }

  function removeOne(menuItemId: string) {
    setCart((prev) => {
      const ex = prev.find((i) => i.menuItemId === menuItemId);
      if (!ex) return prev;
      if (ex.quantity === 1) return prev.filter((i) => i.menuItemId !== menuItemId);
      return prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  function removeItem(menuItemId: string) {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  async function confirmOrder() {
    if (!selectedClient || cart.length === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClient.id, table, items: cart, total, notes }),
      });
      setSuccess(true);
      setCart([]);
      setNotes("");
      setTimeout(() => setSuccess(false), 3500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg border border-white/10">
              🧾
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-none">Cashier App</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">POS · Order Entry</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Connected
          </div>
        </div>
      </header>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="shrink-0 bg-green-500/15 border-b border-green-500/20 px-6 py-3 flex items-center gap-3 text-green-400"
          >
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="text-xl"
            >
              ✅
            </motion.span>
            <span className="font-semibold text-sm">Order confirmed — synced to loyalty system!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Menu */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.06]">
          {/* Category tabs */}
          <div className="shrink-0 flex gap-1 p-3 border-b border-white/[0.06] overflow-x-auto">
            {CATEGORIES.map((cat) => {
              const count = cart.filter((i) => {
                const mi = menu.find((m) => m.id === i.menuItemId);
                return mi?.category === cat;
              }).reduce((s, i) => s + i.quantity, 0);
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="relative shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: activeCategory === cat ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                    color: activeCategory === cat ? "#C9A84C" : undefined,
                    border: activeCategory === cat ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  }}
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

          {/* Menu grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {visibleMenu.map((item, i) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id);
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addToCart(item)}
                      className="relative text-left p-4 rounded-2xl border transition-all duration-200"
                      style={{
                        background: inCart ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
                        borderColor: inCart ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.07)",
                      }}
                    >
                      {inCart && (
                        <span className="absolute top-2.5 right-2.5 w-6 h-6 gold-gradient text-[#0F0D09] text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                          {inCart.quantity}
                        </span>
                      )}
                      <p className="font-semibold text-sm text-foreground pr-6">{item.name}</p>
                      <p className="text-sm mt-1" style={{ color: inCart ? "#C9A84C" : "#6b7280" }}>
                        ${item.price}
                      </p>
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT — Order panel */}
        <div className="w-88 shrink-0 flex flex-col overflow-hidden" style={{ width: "22rem" }}>
          {/* Client selector */}
          <div className="shrink-0 p-4 border-b border-white/[0.06] space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Guest</p>

            {!selectedClient ? (
              <div className="relative">
                <Input
                  placeholder="Search guest..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="h-10 bg-white/[0.04] border-white/10 rounded-xl text-sm"
                />
                <AnimatePresence>
                  {showClientDropdown && clientSearch && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-white/10 overflow-hidden"
                      style={{ background: "#1a1a1a" }}
                    >
                      {filteredClients.slice(0, 5).map((c) => {
                        const t = TIER_CONFIG[c.tier];
                        return (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 text-sm"
                            onClick={() => {
                              setSelectedClient(c);
                              setClientSearch(c.name);
                              setShowClientDropdown(false);
                            }}
                          >
                            <span className="font-medium text-foreground truncate">{c.name}</span>
                            <span className="text-muted-foreground text-xs shrink-0">{c.phone}</span>
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ color: t.color, background: t.bg }}>
                              {c.tier}
                            </span>
                          </button>
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <p className="text-sm text-muted-foreground p-3">No guests found.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2.5 bg-white/[0.05] rounded-xl px-3 py-2.5 border border-white/[0.08]"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: TIER_CONFIG[selectedClient.tier].bg, color: TIER_CONFIG[selectedClient.tier].color }}>
                  {selectedClient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedClient.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>
                </div>
                <button
                  onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="text-muted-foreground hover:text-foreground text-sm w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </div>

          {/* Table */}
          <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Table</p>
            <Input
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className="w-20 h-8 bg-white/[0.04] border-white/10 rounded-lg text-sm text-center"
            />
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground/40 text-sm py-10"
                >
                  Tap items to add them
                </motion.p>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.menuItemId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price} ea</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => removeOne(item.menuItemId)}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-sm font-bold transition-colors flex items-center justify-center">
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price, category: "Main" })}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-sm font-bold transition-colors flex items-center justify-center">
                        +
                      </button>
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-[#C9A84C] shrink-0">
                      ${item.price * item.quantity}
                    </span>
                    <button onClick={() => removeItem(item.menuItemId)}
                      className="w-6 h-6 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 text-xs transition-colors flex items-center justify-center shrink-0">
                      ✕
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Footer */}
          <div className="shrink-0 p-4 space-y-3">
            <Input
              placeholder="Order notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 bg-white/[0.04] border-white/10 rounded-xl text-sm"
            />

            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs text-muted-foreground">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground mr-2">Total</span>
                <span className="text-3xl font-bold gold-text">${total}</span>
              </div>
            </div>

            <motion.button
              onClick={confirmOrder}
              disabled={!selectedClient || cart.length === 0 || submitting}
              whileHover={!selectedClient || cart.length === 0 ? {} : { scale: 1.01 }}
              whileTap={!selectedClient || cart.length === 0 ? {} : { scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: (!selectedClient || cart.length === 0)
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, #C9A84C, #E8C96A)",
                color: (!selectedClient || cart.length === 0) ? "#6b7280" : "#0F0D09",
                boxShadow: (!selectedClient || cart.length === 0) ? "none" : "0 4px 20px rgba(201,168,76,0.3)",
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0F0D09]/30 border-t-[#0F0D09] rounded-full animate-spin" />
                  Processing...
                </span>
              ) : "Confirm Order"}
            </motion.button>

            {!selectedClient && cart.length > 0 && (
              <p className="text-xs text-center text-red-400/80">Select a guest to confirm</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
