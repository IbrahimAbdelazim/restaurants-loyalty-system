"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ClientWithStats, Order } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  Bronze: { label: "Bronze", color: "#cd7f32", bg: "rgba(205,127,50,0.15)", icon: "🥉" },
  Silver: { label: "Silver", color: "#aaa",    bg: "rgba(170,170,170,0.15)", icon: "🥈" },
  Gold:   { label: "Gold",   color: "#C9A84C", bg: "rgba(201,168,76,0.15)",  icon: "🥇" },
  VIP:    { label: "VIP",    color: "#a78bfa", bg: "rgba(167,139,250,0.15)", icon: "💎" },
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function daysUntilNextOccurrence(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  const d = new Date(dateStr);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

function isTodayOccurrence(dateStr: string | null) {
  return daysUntilNextOccurrence(dateStr) === 0;
}

const TIER_POINTS: Record<string, number> = { Bronze: 500, Silver: 1500, Gold: 4000, VIP: Infinity };
const NEXT_TIER: Record<string, string> = { Bronze: "Silver", Silver: "Gold", Gold: "VIP", VIP: "VIP" };

function tierProgress(tier: string, points: number) {
  const target = TIER_POINTS[tier] ?? 500;
  const prev = tier === "Bronze" ? 0 : TIER_POINTS[Object.keys(TIER_POINTS)[Object.keys(TIER_POINTS).indexOf(tier) - 1]] ?? 0;
  if (tier === "VIP") return 100;
  return Math.min(100, Math.round(((points - prev) / (target - prev)) * 100));
}

export default function WaiterPage() {
  const [phone, setPhone] = useState("");
  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "family">("history");
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchClient = useCallback(async (phoneNum: string, isRefresh = false) => {
    if (!isRefresh) { setLoading(true); setError(""); }
    try {
      const res = await fetch(`/api/clients?phone=${encodeURIComponent(phoneNum)}`);
      if (!res.ok) {
        if (!isRefresh) setError("No guest found with that number.");
        return;
      }
      const data: ClientWithStats = await res.json();
      if (isRefresh && data.recentOrders.length > lastOrderCount) {
        setNewOrderFlash(true);
        setTimeout(() => setNewOrderFlash(false), 4000);
      }
      setClient(data);
      setLastOrderCount(data.recentOrders.length);
    } catch {
      if (!isRefresh) setError("Connection error. Try again.");
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [lastOrderCount]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) fetchClient(phone.trim());
  };

  useEffect(() => {
    if (!client) return;
    const id = setInterval(() => fetchClient(client.phone, true), 3000);
    return () => clearInterval(id);
  }, [client, fetchClient]);

  const tier = client ? TIER_CONFIG[client.tier] : null;
  const progress = client ? tierProgress(client.tier, client.points) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center text-lg shadow-lg">
              🍽️
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-none">Waiter App</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Guest Loyalty</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
            {client && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setClient(null); setPhone(""); setError(""); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="text-xs text-muted-foreground hover:text-foreground border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                Clear
              </motion.button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">📱</span>
            <Input
              ref={inputRef}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter guest phone number..."
              className="h-14 pl-11 pr-32 text-base bg-white/[0.04] border-white/10 rounded-2xl focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]/50 placeholder:text-muted-foreground/50"
              type="tel"
              autoFocus
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 gold-gradient text-[#0F0D09] rounded-xl font-semibold text-sm shadow-lg"
            >
              Search
            </motion.button>
          </div>
        </form>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 justify-center py-8 text-muted-foreground"
            >
              <div className="w-5 h-5 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
              Looking up guest...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-sm flex items-center gap-2"
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New order notification */}
        <AnimatePresence>
          {newOrderFlash && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl p-3 text-sm flex items-center gap-2"
            >
              <span className="animate-bounce">🔔</span> New order added by cashier!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client profile */}
        <AnimatePresence>
          {client && !loading && (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Alerts */}
              {isTodayOccurrence(client.birthday) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">🎂</span>
                  <div>
                    <p className="font-semibold text-pink-300">Birthday Today!</p>
                    <p className="text-xs text-pink-400/70">Wish {client.name.split(" ")[0]} a wonderful birthday.</p>
                  </div>
                </motion.div>
              )}
              {isTodayOccurrence(client.anniversary) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">💑</span>
                  <div>
                    <p className="font-semibold text-rose-300">Anniversary Today!</p>
                    <p className="text-xs text-rose-400/70">Congratulate the couple on their special day.</p>
                  </div>
                </motion.div>
              )}

              {/* Main client card */}
              <div className="glass rounded-3xl overflow-hidden">
                {/* Top gradient bar */}
                <div className="h-1 gold-gradient" />

                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 ring-2 ring-[#C9A84C]/30">
                        <AvatarFallback
                          className="text-xl font-bold"
                          style={{ background: tier?.bg, color: tier?.color }}
                        >
                          {initials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 text-base">{tier?.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-foreground truncate">{client.name}</h2>
                        <span
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                          style={{ color: tier?.color, background: tier?.bg }}
                        >
                          {tier?.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                      {client.familyGroupName && (
                        <p className="text-xs text-[#C9A84C]/70 mt-0.5">{client.familyGroupName}</p>
                      )}

                      {/* Tier progress */}
                      {client.tier !== "VIP" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              Progress to {NEXT_TIER[client.tier]}
                            </span>
                            <span className="text-[10px] text-[#C9A84C]">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full gold-gradient rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 mt-5">
                    {[
                      { label: "Visits", value: client.totalVisits, icon: "🗓" },
                      { label: "Spent", value: `$${client.totalSpent}`, icon: "💳" },
                      { label: "Points", value: client.points.toLocaleString(), icon: "⭐" },
                      { label: "Last Visit", value: client.lastVisit ? timeAgo(client.lastVisit) : "—", icon: "🕐" },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.07 }}
                        className="bg-white/[0.04] rounded-2xl p-3 text-center"
                      >
                        <p className="text-base">{stat.icon}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        <p className="text-sm font-bold text-foreground mt-0.5 leading-none">{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <>
                      <Separator className="my-4 bg-white/[0.06]" />
                      <div className="bg-[#C9A84C]/[0.08] border border-[#C9A84C]/20 rounded-2xl p-3.5">
                        <p className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest mb-1.5">Notes</p>
                        <p className="text-sm text-foreground/80">{client.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Upcoming occasions */}
                  {(() => {
                    const bdDays = daysUntilNextOccurrence(client.birthday);
                    const annDays = daysUntilNextOccurrence(client.anniversary);
                    const upcoming = [];
                    if (bdDays !== null && bdDays > 0 && bdDays <= 14) upcoming.push(`🎂 Birthday in ${bdDays} day${bdDays > 1 ? "s" : ""}`);
                    if (annDays !== null && annDays > 0 && annDays <= 14) upcoming.push(`💑 Anniversary in ${annDays} day${annDays > 1 ? "s" : ""}`);
                    if (!upcoming.length) return null;
                    return (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {upcoming.map((u) => (
                          <span key={u} className="text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                            {u}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Favorites */}
                  {client.favoriteItems.length > 0 && (
                    <>
                      <Separator className="my-4 bg-white/[0.06]" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                          ⭐ Favorite Items
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {client.favoriteItems.map((item, i) => (
                            <motion.span
                              key={item.menuItemId}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 * i }}
                              className="text-sm px-3 py-1.5 rounded-full font-medium border"
                              style={{
                                color: "#C9A84C",
                                background: "rgba(201,168,76,0.1)",
                                borderColor: "rgba(201,168,76,0.25)",
                              }}
                            >
                              {item.name}
                              <span className="ml-1.5 opacity-60 text-xs">×{item.count}</span>
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="glass rounded-3xl overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-white/[0.06]">
                  {(["history", "family"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="relative flex-1 py-4 text-sm font-medium transition-colors"
                      style={{ color: activeTab === tab ? "#C9A84C" : undefined }}
                    >
                      {tab === "history"
                        ? `Order History (${client.recentOrders.length})`
                        : `Family (${client.familyMembers.length})`}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 gold-gradient"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  <AnimatePresence mode="wait">
                    {activeTab === "history" && (
                      <motion.div
                        key="history"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        {client.recentOrders.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8 text-sm">No orders yet.</p>
                        ) : (
                          client.recentOrders.map((order, i) => (
                            <motion.div
                              key={order.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <OrderCard order={order} isNew={i === 0 && newOrderFlash} />
                            </motion.div>
                          ))
                        )}
                      </motion.div>
                    )}

                    {activeTab === "family" && (
                      <motion.div
                        key="family"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        {client.familyMembers.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8 text-sm">No family members linked.</p>
                        ) : (
                          client.familyMembers.map((member, i) => {
                            const mt = TIER_CONFIG[member.tier];
                            return (
                              <motion.button
                                key={member.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => { setPhone(member.phone); fetchClient(member.phone); }}
                                className="w-full text-left bg-white/[0.04] hover:bg-white/[0.07] rounded-2xl p-4 flex items-center gap-3 transition-colors border border-white/[0.05]"
                              >
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback
                                      className="text-sm font-bold"
                                      style={{ background: mt.bg, color: mt.color }}
                                    >
                                      {initials(member.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="absolute -bottom-1 -right-1 text-xs">{mt.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground truncate">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.phone}</p>
                                </div>
                                <span
                                  className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                                  style={{ color: mt.color, background: mt.bg }}
                                >
                                  {mt.label}
                                </span>
                              </motion.button>
                            );
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!client && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20 text-muted-foreground/40 space-y-3"
          >
            <p className="text-5xl">🔍</p>
            <p className="text-sm">Search a guest by phone number to view their profile</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order, isNew }: { order: Order; isNew?: boolean }) {
  return (
    <div className={`
      rounded-2xl p-4 border transition-all duration-500
      ${isNew
        ? "bg-green-500/10 border-green-500/30"
        : "bg-white/[0.04] border-white/[0.05]"
      }
    `}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{formatDate(order.date)}</span>
          <span className="text-xs text-muted-foreground bg-white/[0.06] px-2 py-0.5 rounded-full">
            Table {order.table}
          </span>
          {isNew && (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-medium">
              New
            </span>
          )}
        </div>
        <span className="font-bold text-[#C9A84C]">${order.total}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {order.items.map((item, i) => (
          <span key={i} className="text-xs bg-white/[0.06] text-foreground/70 px-2 py-1 rounded-lg">
            {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
          </span>
        ))}
      </div>
      {order.notes && (
        <p className="text-xs text-muted-foreground/60 mt-2 italic">{order.notes}</p>
      )}
    </div>
  );
}
