import type { ActiveVisit, Client, MenuItem, Order, Tier } from "./types";
import { buildMenuCategoryMap } from "./waiter-utils";

/** Local calendar date as YYYY-MM-DD */
export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 local time of the week containing `d` */
export function getMondayOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function parseMonthDayFromISO(iso: string): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  return { month: parseInt(m[2], 10), day: parseInt(m[3], 10) };
}

/** Days from `ref` (start of local day) until next occurrence of month/day; null if invalid */
export function daysUntilNextMonthDay(
  isoDate: string | null,
  ref: Date
): number | null {
  if (!isoDate) return null;
  const md = parseMonthDayFromISO(isoDate);
  if (!md) return null;

  const refStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let y = refStart.getFullYear();
  let candidate = new Date(y, md.month - 1, md.day);
  if (candidate < refStart) {
    y += 1;
    candidate = new Date(y, md.month - 1, md.day);
  }
  const diffMs = candidate.getTime() - refStart.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/** Next calendar date (YYYY-MM-DD) for that month/day on or after `ref` (local midnight). */
export function nextOccurrenceDateString(
  isoDate: string | null,
  ref: Date
): string | null {
  if (!isoDate) return null;
  const md = parseMonthDayFromISO(isoDate);
  if (!md) return null;
  const refStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let y = refStart.getFullYear();
  let candidate = new Date(y, md.month - 1, md.day);
  if (candidate < refStart) {
    y += 1;
    candidate = new Date(y, md.month - 1, md.day);
  }
  return toISODateString(candidate);
}

export type TodayOverview = {
  ordersToday: number;
  revenueToday: number;
  activeClients: number;
  newClientsToday: number;
};

export function getTodayOverview(
  orders: Order[],
  clients: Client[],
  activeVisits: ActiveVisit[],
  referenceDate: Date = new Date()
): TodayOverview {
  const todayStr = toISODateString(referenceDate);
  const ordersToday = orders.filter(
    (o) => o.date === todayStr && o.status !== "cancelled"
  ).length;
  const revenueToday = orders
    .filter((o) => o.date === todayStr && o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);
  const newClientsToday = clients.filter((c) => c.createdAt === todayStr).length;
  return {
    ordersToday,
    revenueToday,
    activeClients: activeVisits.length,
    newClientsToday,
  };
}

export type TopClientRow = {
  clientId: string;
  name: string;
  tier: Tier;
  visits: number;
  spend: number;
  lastVisit: string | null;
};

export function getTopClientsThisMonth(
  orders: Order[],
  clients: Client[],
  referenceDate: Date = new Date()
): TopClientRow[] {
  const y = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const inMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.getFullYear() === y && d.getMonth() === month;
  };

  const completed = orders.filter((o) => o.status === "completed" && inMonth(o.date));
  const byClient = new Map<
    string,
    { spend: number; visits: number; lastVisit: string | null }
  >();

  for (const o of completed) {
    const cur = byClient.get(o.clientId) ?? {
      spend: 0,
      visits: 0,
      lastVisit: null as string | null,
    };
    cur.spend += o.total;
    cur.visits += 1;
    if (!cur.lastVisit || o.date > cur.lastVisit) cur.lastVisit = o.date;
    byClient.set(o.clientId, cur);
  }

  const rows: TopClientRow[] = [];
  for (const [clientId, agg] of byClient) {
    const c = clients.find((x) => x.id === clientId);
    if (!c) continue;
    rows.push({
      clientId,
      name: c.name,
      tier: c.tier,
      visits: agg.visits,
      spend: agg.spend,
      lastVisit: agg.lastVisit,
    });
  }
  rows.sort((a, b) => b.spend - a.spend);
  return rows;
}

export type PopularItemRow = {
  menuItemId: string;
  name: string;
  category: MenuItem["category"];
  quantity: number;
};

export type PopularCategoryFilter = "all" | MenuItem["category"];

export function getPopularMenuItems(
  orders: Order[],
  menu: MenuItem[],
  category: PopularCategoryFilter = "all"
): PopularItemRow[] {
  const menuById = new Map(menu.map((m) => [m.id, m]));
  const catMap = buildMenuCategoryMap(menu);
  const qty = new Map<string, number>();

  for (const o of orders) {
    if (o.status !== "completed") continue;
    for (const line of o.items) {
      const cat = catMap.get(line.menuItemId);
      if (category !== "all" && cat !== category) continue;
      qty.set(line.menuItemId, (qty.get(line.menuItemId) ?? 0) + line.quantity);
    }
  }

  const rows: PopularItemRow[] = [];
  for (const [menuItemId, quantity] of qty) {
    const m = menuById.get(menuItemId);
    if (!m) continue;
    rows.push({
      menuItemId,
      name: m.name,
      category: m.category,
      quantity,
    });
  }
  rows.sort((a, b) => b.quantity - a.quantity);
  return rows;
}

export type TierCounts = Record<Tier, number>;

export function getTierCounts(clients: Client[]): TierCounts {
  const counts: TierCounts = {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    VIP: 0,
  };
  for (const c of clients) {
    counts[c.tier] += 1;
  }
  return counts;
}

export type WeeklyRevenueRow = {
  weekStart: string;
  weekEnd: string;
  label: string;
  revenue: number;
};

export function getWeeklyRevenue(
  orders: Order[],
  referenceDate: Date = new Date(),
  weekCount: number = 8
): WeeklyRevenueRow[] {
  const mondayThisWeek = getMondayOfWeek(referenceDate);
  const rows: WeeklyRevenueRow[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = new Date(mondayThisWeek);
    weekStart.setDate(weekStart.getDate() - 7 * i);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = toISODateString(weekStart);
    const endStr = toISODateString(weekEnd);

    const revenue = orders
      .filter((o) => {
        if (o.status !== "completed") return false;
        return o.date >= startStr && o.date <= endStr;
      })
      .reduce((sum, o) => sum + o.total, 0);

    const label = `${formatShort(weekStart)} – ${formatShort(weekEnd)}`;
    rows.push({ weekStart: startStr, weekEnd: endStr, label, revenue });
  }
  return rows;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type UpcomingSpecialType = "birthday" | "anniversary";

export type UpcomingSpecialRow = {
  clientId: string;
  name: string;
  type: UpcomingSpecialType;
  eventDate: string;
  daysUntil: number;
};

export function getUpcomingSpecials(
  clients: Client[],
  referenceDate: Date = new Date(),
  rangeDays: number = 7
): UpcomingSpecialRow[] {
  const rows: UpcomingSpecialRow[] = [];

  for (const c of clients) {
    const bDays = daysUntilNextMonthDay(c.birthday, referenceDate);
    const bDate = nextOccurrenceDateString(c.birthday, referenceDate);
    if (
      bDays !== null &&
      bDate &&
      bDays >= 0 &&
      bDays <= rangeDays
    ) {
      rows.push({
        clientId: c.id,
        name: c.name,
        type: "birthday",
        eventDate: bDate,
        daysUntil: bDays,
      });
    }

    const aDays = daysUntilNextMonthDay(c.anniversary, referenceDate);
    const aDate = nextOccurrenceDateString(c.anniversary, referenceDate);
    if (
      aDays !== null &&
      aDate &&
      aDays >= 0 &&
      aDays <= rangeDays
    ) {
      rows.push({
        clientId: c.id,
        name: c.name,
        type: "anniversary",
        eventDate: aDate,
        daysUntil: aDays,
      });
    }
  }

  rows.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name));
  return rows;
}
