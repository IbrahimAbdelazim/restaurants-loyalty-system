"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type {
  ActiveVisit,
  ClientMatchPreview,
  ClientWithStats,
  OrderWithCategoryTotals,
  Tier,
} from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { detectUiLang, networkErrorCopy } from "@/lib/toast-i18n";
import {
  formatPhoneDisplay,
  gapSincePreviousVisit,
  normalizePhoneDigits,
  nextTierLabel,
  pointsToNextTier,
  tierProgressPercent,
} from "@/lib/waiter-utils";

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

function isWithinSevenDays(dateStr: string | null) {
  const d = daysUntilNextOccurrence(dateStr);
  return d !== null && d >= 1 && d <= 7;
}

const DIAL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const TOAST_NEW_ORDER = {
  en: "New order added by cashier!",
  ar: "طلب جديد أضافه أمين الصندوق!",
} as const;

function waiterUiLang(): "en" | "ar" {
  return detectUiLang();
}

type FetchClientOptions = { refresh?: boolean; skipNewOrderToast?: boolean };

export default function WaiterPage() {
  const [phoneDigits, setPhoneDigits] = useState("");
  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "family">("history");
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const [flashingOrderId, setFlashingOrderId] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [usingPollingFallback, setUsingPollingFallback] = useState(false);
  const [matches, setMatches] = useState<ClientMatchPreview[]>([]);
  const [partialLoading, setPartialLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerBirthday, setRegisterBirthday] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const [registering, setRegistering] = useState(false);
  const [activeVisits, setActiveVisits] = useState<ActiveVisit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialOrderIdsRef = useRef<Set<string>>(new Set());
  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashOrderClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchPhoneRef = useRef<string>("");

  const refreshVisits = useCallback(async () => {
    try {
      const res = await fetch("/api/visits");
      if (!res.ok) return;
      const data = await res.json();
      setActiveVisits(data.visits ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshVisits();
  }, [refreshVisits]);

  const fetchClient = useCallback(
    async (phoneNum: string, options?: boolean | FetchClientOptions) => {
      let isRefresh = false;
      let skipNewOrderToast = false;
      if (options === true) isRefresh = true;
      else if (options && typeof options === "object") {
        isRefresh = Boolean(options.refresh);
        skipNewOrderToast = Boolean(options.skipNewOrderToast);
      }

      const normalized = normalizePhoneDigits(phoneNum);
      if (!isRefresh) {
        lastSearchPhoneRef.current = normalized;
        setLoading(true);
        setError("");
        setShowRegister(false);
      }
      try {
        const res = await fetch(`/api/clients?phone=${encodeURIComponent(normalized)}`);
        if (!res.ok) {
          if (!isRefresh) {
            const j = await res.json().catch(() => null);
            const msg =
              j && typeof j.message === "string"
                ? j.message
                : "No guest found with that number.";
            setError(msg);
            setShowRegister(true);
          }
          return;
        }
        const data: ClientWithStats = await res.json();
        if (!isRefresh) {
          initialOrderIdsRef.current = new Set(data.recentOrders.map((o) => o.id));
        } else {
          const hasNew = data.recentOrders.some((o) => !initialOrderIdsRef.current.has(o.id));
          if (hasNew && !skipNewOrderToast) {
            setNewOrderFlash(true);
            setTimeout(() => setNewOrderFlash(false), 4000);
          }
        }
        setClient(data);
      } catch {
        if (!isRefresh) {
          const lang = detectUiLang();
          const copy = networkErrorCopy(lang);
          setError(
            lang === "ar"
              ? "خطأ في الاتصال. أعد المحاولة."
              : "Connection error. Try again."
          );
          toast.error(copy.title, {
            description:
              lang === "ar"
                ? "تعذر الوصول إلى الخادم."
                : "Could not reach the server.",
            action: {
              label: copy.retry,
              onClick: () => {
                const p = lastSearchPhoneRef.current;
                if (p.length >= 4) fetchClient(p);
              },
            },
          });
        }
      } finally {
        if (!isRefresh) setLoading(false);
      }
    },
    []
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const d = normalizePhoneDigits(phoneDigits);
    if (d.length >= 4) fetchClient(d);
  };

  const appendDigit = (d: string) => {
    setPhoneDigits((prev) => prev + d);
  };

  const backspaceDigit = () => {
    setPhoneDigits((prev) => prev.slice(0, -1));
  };

  const clearPhone = () => {
    setPhoneDigits("");
    setMatches([]);
    setError("");
    setShowRegister(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
    const d = phoneDigits;
    if (d.length < 4) {
      setMatches([]);
      return;
    }
    partialTimerRef.current = setTimeout(async () => {
      setPartialLoading(true);
      try {
        const res = await fetch(`/api/clients?digits=${encodeURIComponent(d)}`);
        if (!res.ok) {
          setMatches([]);
          return;
        }
        const data = await res.json();
        const list: ClientMatchPreview[] = data.matches ?? [];
        setMatches(list);
        if (list.length === 1) {
          const full = normalizePhoneDigits(list[0].phone);
          if (d.length < full.length) {
            setPhoneDigits(full);
            fetchClient(list[0].phone);
          }
        }
      } catch {
        setMatches([]);
      } finally {
        setPartialLoading(false);
      }
    }, 320);
    return () => {
      if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
    };
  }, [phoneDigits, fetchClient]);

  const selectMatch = (m: ClientMatchPreview) => {
    setPhoneDigits(normalizePhoneDigits(m.phone));
    fetchClient(m.phone);
    setMatches([]);
  };

  const performRegister = useCallback(async () => {
    setRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          phone: phoneDigits,
          birthday: registerBirthday.trim() || null,
          notes: registerNotes,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.message === "string" ? j.message : "Registration failed.");
        return;
      }
      const profile = j.client as ClientWithStats;
      if (profile) {
        initialOrderIdsRef.current = new Set(profile.recentOrders.map((o) => o.id));
        setClient(profile);
        setShowRegister(false);
        setRegisterName("");
        setRegisterBirthday("");
        setRegisterNotes("");
        setMatches([]);
      }
    } catch {
      const lang = detectUiLang();
      const copy = networkErrorCopy(lang);
      setError(
        lang === "ar"
          ? "خطأ في الاتصال. أعد المحاولة."
          : "Connection error. Try again."
      );
      toast.error(copy.title, {
        description:
          lang === "ar"
            ? "تعذر إكمال التسجيل."
            : "Could not complete registration.",
        action: {
          label: copy.retry,
          onClick: () => {
            void performRegister();
          },
        },
      });
    } finally {
      setRegistering(false);
    }
  }, [registerName, phoneDigits, registerBirthday, registerNotes]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    void performRegister();
  };

  const handleMarkArrived = async () => {
    if (!client) return;
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveVisits(data.visits ?? []);
      }
    } catch {
      /* ignore */
    }
  };

  const handleMarkDeparted = async (clientId: string) => {
    try {
      const res = await fetch(`/api/visits?clientId=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setActiveVisits(data.visits ?? []);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!client) {
      setSseConnected(false);
      setUsingPollingFallback(false);
      setFlashingOrderId(null);
      if (flashOrderClearRef.current) {
        clearTimeout(flashOrderClearRef.current);
        flashOrderClearRef.current = null;
      }
      return;
    }

    const clientId = client.id;
    const phone = client.phone;
    let alive = true;
    let source: EventSource | null = null;
    let pollIv: ReturnType<typeof setInterval> | null = null;
    let reconnectT: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    const clearReconnect = () => {
      if (reconnectT) {
        clearTimeout(reconnectT);
        reconnectT = null;
      }
    };

    const stopPoll = () => {
      if (pollIv) {
        clearInterval(pollIv);
        pollIv = null;
      }
      if (alive) setUsingPollingFallback(false);
    };

    const startPoll = () => {
      if (pollIv) return;
      if (alive) setUsingPollingFallback(true);
      pollIv = setInterval(() => {
        fetchClient(phone, true);
      }, 3000);
    };

    const attach = () => {
      if (!alive) return;
      clearReconnect();
      source?.close();
      source = new EventSource(
        `/api/events?clientId=${encodeURIComponent(clientId)}`
      );

      source.onopen = () => {
        if (!alive) return;
        failures = 0;
        setSseConnected(true);
        stopPoll();
      };

      source.onmessage = (event) => {
        if (!alive) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        if (typeof parsed !== "object" || parsed === null) return;
        const p = parsed as { type?: string; orderId?: string };
        if (p.type !== "order" || typeof p.orderId !== "string") return;
        setFlashingOrderId(p.orderId);
        if (flashOrderClearRef.current) clearTimeout(flashOrderClearRef.current);
        flashOrderClearRef.current = setTimeout(() => {
          setFlashingOrderId(null);
          flashOrderClearRef.current = null;
        }, 2800);
        setNewOrderFlash(true);
        setTimeout(() => setNewOrderFlash(false), 4000);
        fetchClient(phone, { refresh: true, skipNewOrderToast: true });
      };

      source.onerror = () => {
        if (!alive) return;
        source?.close();
        source = null;
        setSseConnected(false);
        failures += 1;
        if (failures >= 3) startPoll();
        const delay = Math.min(30_000, 500 * 2 ** Math.min(failures, 6));
        reconnectT = setTimeout(() => {
          reconnectT = null;
          if (alive) attach();
        }, delay);
      };
    };

    attach();

    const retrySseWhilePolling = setInterval(() => {
      if (!alive || pollIv === null) return;
      attach();
    }, 20_000);

    return () => {
      alive = false;
      clearReconnect();
      source?.close();
      stopPoll();
      clearInterval(retrySseWhilePolling);
      if (flashOrderClearRef.current) {
        clearTimeout(flashOrderClearRef.current);
        flashOrderClearRef.current = null;
      }
    };
  }, [client, fetchClient]);

  const tier = client ? TIER_CONFIG[client.tier] : null;
  const progress = client ? tierProgressPercent(client.tier as Tier, client.points) : 0;
  const ptsToNext = client ? pointsToNextTier(client.tier as Tier, client.points) : null;
  const nextTier = client ? nextTierLabel(client.tier as Tier) : null;
  const clientIsInHouse = client ? activeVisits.some((v) => v.clientId === client.id) : false;

  const liveDotGreen = Boolean(client && sseConnected && !usingPollingFallback);
  const liveLabel = !client
    ? "—"
    : usingPollingFallback
      ? "Polling"
      : sseConnected
        ? "Live"
        : "Connecting…";

  const showClientSplit = Boolean(client && !loading);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center text-lg shadow-lg">
              🍽️
            </div>
            <div>
              <p className="font-bold text-base text-foreground leading-none">Waiter App</p>
              <p className="text-xs text-muted-foreground mt-0.5">Guest Loyalty</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live / SSE / polling indicator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  liveDotGreen ? "bg-green-500 animate-pulse" : "bg-zinc-500"
                }`}
              />
              <span className="tabular-nums">{liveLabel}</span>
            </div>
            {client && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setClient(null);
                  clearPhone();
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="min-h-11 text-sm text-muted-foreground hover:text-foreground border border-white/10 rounded-lg px-3 py-2 transition-colors"
              >
                Clear
              </motion.button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Active in-house guests */}
        {activeVisits.length > 0 && (
          <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/[0.06] p-3">
            <p className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest mb-2">
              In house now ({activeVisits.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {activeVisits.map((v) => (
                <div
                  key={v.clientId}
                  className="flex items-center gap-2 bg-background/60 rounded-xl pl-3 pr-1 py-1.5 border border-white/10"
                >
                  <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{v.name}</span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleMarkDeparted(v.clientId)}
                    className="min-h-11 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-white/10"
                  >
                    Out
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={
            showClientSplit ? "lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start" : ""
          }
        >
          <div className="space-y-5 min-w-0">
        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">📱</span>
            <Input
              ref={inputRef}
              value={formatPhoneDisplay(phoneDigits)}
              onChange={(e) => setPhoneDigits(normalizePhoneDigits(e.target.value))}
              placeholder="Enter guest phone number..."
              className="h-14 pl-11 pr-32 text-base bg-white/[0.04] border-white/10 rounded-2xl focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]/50 placeholder:text-muted-foreground/50"
              type="tel"
              inputMode="numeric"
              autoFocus
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 h-11 px-5 gold-gradient text-[#0F0D09] rounded-xl font-semibold text-sm shadow-lg"
            >
              Search
            </motion.button>
          </div>
        </form>

        {/* Dial pad */}
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {DIAL_KEYS.map((k) => (
            <motion.button
              key={k}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => appendDigit(k)}
              className="h-14 rounded-2xl text-xl font-semibold bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] active:bg-white/[0.12]"
            >
              {k}
            </motion.button>
          ))}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={backspaceDigit}
            className="h-14 rounded-2xl text-sm font-semibold bg-white/[0.06] border border-white/10"
          >
            ⌫
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => appendDigit("0")}
            className="h-14 rounded-2xl text-xl font-semibold bg-white/[0.06] border border-white/10"
          >
            0
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={clearPhone}
            className="h-14 rounded-2xl text-xs font-semibold bg-white/[0.06] border border-white/10"
          >
            Clear
          </motion.button>
        </div>

        {partialLoading && (
          <p className="text-center text-xs text-muted-foreground">Searching matches…</p>
        )}
        {matches.length > 1 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">
              Tap a guest
            </p>
            {matches.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => selectMatch(m)}
                className="w-full text-left rounded-xl px-3 py-3 hover:bg-white/[0.06] border border-transparent hover:border-white/10"
              >
                <p className="font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{formatPhoneDisplay(normalizePhoneDigits(m.phone))}</p>
              </motion.button>
            ))}
          </div>
        )}

        {showRegister && !client && !loading && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleRegister}
            className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-4 space-y-3"
          >
            <p className="font-semibold text-foreground">Register new guest</p>
            <p className="text-xs text-muted-foreground">
              Phone: {formatPhoneDisplay(phoneDigits) || "—"}
            </p>
            <Input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder="Full name"
              className="h-11 bg-background/80 border-white/10 rounded-xl"
              required
            />
            <Input
              type="date"
              value={registerBirthday}
              onChange={(e) => setRegisterBirthday(e.target.value)}
              className="h-11 bg-background/80 border-white/10 rounded-xl"
            />
            <Input
              value={registerNotes}
              onChange={(e) => setRegisterNotes(e.target.value)}
              placeholder="Notes (allergies, preferences…)"
              className="h-11 bg-background/80 border-white/10 rounded-xl"
            />
            <motion.button
              type="submit"
              disabled={registering}
              whileTap={{ scale: 0.98 }}
              className="w-full h-11 gold-gradient text-[#0F0D09] rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {registering ? "Saving…" : "Create guest (Bronze, 0 pts)"}
            </motion.button>
          </motion.form>
        )}

        {showClientSplit && client && (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
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
              {(() => {
                const bd = daysUntilNextOccurrence(client.birthday);
                const ann = daysUntilNextOccurrence(client.anniversary);
                if (!isWithinSevenDays(client.birthday) && !isWithinSevenDays(client.anniversary)) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-2"
                  >
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Coming up (7 days)</p>
                    {isWithinSevenDays(client.birthday) && bd !== null && bd > 0 && (
                      <p className="text-sm text-amber-200">🎂 Birthday in {bd} day{bd > 1 ? "s" : ""}</p>
                    )}
                    {isWithinSevenDays(client.anniversary) && ann !== null && ann > 0 && (
                      <p className="text-sm text-amber-200">💑 Anniversary in {ann} day{ann > 1 ? "s" : ""}</p>
                    )}
                  </motion.div>
                );
              })()}

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
                      <p className="text-sm text-muted-foreground">
                        {formatPhoneDisplay(normalizePhoneDigits(client.phone))}
                      </p>
                      {client.familyGroupName && (
                        <p className="text-xs text-[#C9A84C]/70 mt-0.5">{client.familyGroupName}</p>
                      )}

                      {/* Tier progress */}
                      {client.tier === "VIP" ? (
                        <p className="mt-3 text-xs text-[#C9A84C]/90 font-medium">Maximum loyalty tier</p>
                      ) : (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              Progress to {nextTier}
                            </span>
                            <span className="text-[10px] text-[#C9A84C]">{progress}%</span>
                          </div>
                          {ptsToNext !== null && nextTier && (
                            <p className="text-[11px] text-muted-foreground mb-1.5">
                              {ptsToNext.toLocaleString()} points to {nextTier}
                            </p>
                          )}
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

                      {!clientIsInHouse && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={handleMarkArrived}
                          className="mt-3 w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        >
                          Mark as arrived
                        </motion.button>
                      )}
                      {clientIsInHouse && (
                        <p className="mt-3 text-xs text-emerald-400/90 font-medium">Checked in · in house</p>
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
                        <p className="text-sm font-bold text-foreground mt-0.5 leading-none tabular-nums">{stat.value}</p>
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

          </motion.div>
        )}
          </div>

        {showClientSplit && client && (
          <div className="min-w-0 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:self-start">
              {/* Tabs */}
              <div className="glass rounded-3xl overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-white/[0.06]">
                  {(["history", "family"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="relative flex-1 min-h-11 py-4 text-sm font-medium transition-colors"
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
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-3"
                      >
                        {client.recentOrders.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8 text-sm">No orders yet.</p>
                        ) : (
                          client.recentOrders.map((order, i) => {
                            const older = client.recentOrders[i + 1];
                            const gapText =
                              older != null
                                ? gapSincePreviousVisit(order.date, older.date, "en")
                                : null;
                            const isNewInSession = !initialOrderIdsRef.current.has(order.id);
                            return (
                              <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                              >
                                <OrderCard
                                  order={order}
                                  isNew={isNewInSession}
                                  flashHighlight={flashingOrderId === order.id}
                                  sincePreviousVisit={gapText}
                                />
                              </motion.div>
                            );
                          })
                        )}
                      </motion.div>
                    )}

                    {activeTab === "family" && (
                      <motion.div
                        key="family"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
                                onClick={() => {
                                  setPhoneDigits(normalizePhoneDigits(member.phone));
                                  fetchClient(member.phone);
                                }}
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
          </div>
        )}
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4 py-6"
            >
              <Skeleton className="h-44 w-full rounded-3xl" />
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-32 w-full rounded-2xl" />
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
              <span className="animate-bounce">🔔</span> {TOAST_NEW_ORDER[waiterUiLang()]}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Empty state */}
        {!client && !loading && !error && !showRegister && (
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

function OrderCard({
  order,
  isNew,
  flashHighlight,
  sincePreviousVisit,
}: {
  order: OrderWithCategoryTotals;
  isNew?: boolean;
  flashHighlight?: boolean;
  sincePreviousVisit?: string | null;
}) {
  return (
    <div
      className={`
      rounded-2xl p-4 border transition-all duration-500
      ${isNew
        ? "bg-green-500/10 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.12)]"
        : "bg-white/[0.04] border-white/[0.05]"
      }
      ${flashHighlight ? "ring-2 ring-green-400/70 ring-offset-2 ring-offset-background scale-[1.01]" : ""}
    `}
    >
      {sincePreviousVisit && (
        <p className="text-[10px] text-muted-foreground mb-2">{sincePreviousVisit}</p>
      )}
      <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{formatDate(order.date)}</span>
          <span className="text-xs text-muted-foreground bg-white/[0.06] px-2 py-0.5 rounded-full">
            Table {order.table}
          </span>
          {isNew && (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-medium animate-pulse">
              New
            </span>
          )}
        </div>
        <span className="font-bold text-[#C9A84C] tabular-nums">${order.total}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-2">
        <span>
          Food <span className="text-foreground font-semibold tabular-nums">${order.foodTotal}</span>
        </span>
        <span>
          Drinks <span className="text-foreground font-semibold tabular-nums">${order.drinkTotal}</span>
        </span>
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
