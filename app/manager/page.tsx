import Link from "next/link";
import {
  getPopularMenuItems,
  getTierCounts,
  getTodayOverview,
  getTopClientsThisMonth,
  getUpcomingSpecials,
  getWeeklyRevenue,
  type PopularCategoryFilter,
} from "@/lib/analytics";
import {
  getActiveVisits,
  getClients,
  getMenu,
  getOrders,
} from "@/lib/data";
import type { MenuItem } from "@/lib/types";
import { TIER_ORDER } from "@/lib/waiter-utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WeeklyRevenueChart } from "@/components/manager/weekly-revenue-chart";
import { TierDistributionChart } from "@/components/manager/tier-distribution-chart";
import { PopularItemsChart } from "@/components/manager/popular-items-chart";
import { SendNoteButton } from "@/components/manager/send-note-button";

const MENU_CATEGORIES: MenuItem["category"][] = [
  "Starter",
  "Main",
  "Dessert",
  "Drink",
];

const TIER_STYLES: Record<string, string> = {
  Bronze: "border-[#cd7f32]/40 text-[#cd7f32] bg-[#cd7f32]/10",
  Silver: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
  Gold: "border-[#C9A84C]/50 text-[#C9A84C] bg-[#C9A84C]/12",
  VIP: "border-violet-400/50 text-violet-300 bg-violet-500/10",
};

function parseCategoryParam(
  raw: string | string[] | undefined
): PopularCategoryFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || v === "all") return "all";
  if (MENU_CATEGORIES.includes(v as MenuItem["category"])) {
    return v as MenuItem["category"];
  }
  return "all";
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatVisitDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncateLabel(name: string, max = 22) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

type PageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ManagerPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const category = parseCategoryParam(sp.category);

  const orders = getOrders();
  const clients = getClients();
  const menu = getMenu();
  const visits = getActiveVisits();

  const overview = getTodayOverview(orders, clients, visits);
  const topClients = getTopClientsThisMonth(orders, clients);
  const popularRaw = getPopularMenuItems(orders, menu, category);
  const tierCounts = getTierCounts(clients);
  const weeklyRevenue = getWeeklyRevenue(orders, undefined, 8);
  const upcoming = getUpcomingSpecials(clients, undefined, 7);

  const popularChartData = popularRaw.map((r) => ({
    name: truncateLabel(r.name),
    quantity: r.quantity,
  }));

  const tierPieData = TIER_ORDER.map((name) => ({
    name,
    value: tierCounts[name],
  }));

  const weeklyChartData = weeklyRevenue.map((w) => ({
    label: w.label,
    revenue: w.revenue,
  }));

  const categoryFilters: { label: string; value: PopularCategoryFilter }[] = [
    { label: "All", value: "all" },
    ...MENU_CATEGORIES.map((c) => ({ label: c, value: c })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#C9A84C]">
              Analytics
            </p>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Manager dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Today&apos;s overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Orders today"
              value={String(overview.ordersToday)}
              hint="Excluding cancelled"
            />
            <StatCard
              title="Revenue today"
              value={formatMoney(overview.revenueToday)}
              hint="Completed orders"
            />
            <StatCard
              title="Active clients"
              value={String(overview.activeClients)}
              hint="Checked in now"
            />
            <StatCard
              title="New clients today"
              value={String(overview.newClientsToday)}
              hint="Registered today"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Top clients (this month)
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>By spend</CardTitle>
              <CardDescription>
                Completed orders this calendar month, sorted by total spend
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Client</th>
                    <th className="px-4 py-2 font-medium">Tier</th>
                    <th className="px-4 py-2 font-medium">Visits</th>
                    <th className="px-4 py-2 font-medium">Spend</th>
                    <th className="px-4 py-2 font-medium">Last visit</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No completed orders this month yet.
                      </td>
                    </tr>
                  ) : (
                    topClients.map((row) => (
                      <tr
                        key={row.clientId}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(TIER_STYLES[row.tier])}
                          >
                            {row.tier}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{row.visits}</td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {formatMoney(row.spend)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatVisitDate(row.lastVisit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Most popular menu items</CardTitle>
                <CardDescription>
                  Total quantity across completed orders
                  {category !== "all" ? ` · ${category}` : ""}
                </CardDescription>
              </div>
              <nav className="flex flex-wrap gap-2">
                {categoryFilters.map(({ label, value }) => {
                  const active = category === value;
                  const href =
                    value === "all" ? "/manager" : `/manager?category=${value}`;
                  return (
                    <Link
                      key={value}
                      href={href}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-[#C9A84C] bg-[#C9A84C]/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-[#C9A84C]/50 hover:text-foreground"
                      )}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </CardHeader>
            <CardContent>
              {popularChartData.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No items in this category.
                </p>
              ) : (
                <PopularItemsChart data={popularChartData} />
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Tier distribution</CardTitle>
              <CardDescription>Total clients per loyalty tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-3">
                {TIER_ORDER.map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", TIER_STYLES[t])}
                    >
                      {t}
                    </Badge>
                    <span className="tabular-nums text-foreground">
                      {tierCounts[t]}
                    </span>
                  </div>
                ))}
              </div>
              <TierDistributionChart data={tierPieData} />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Revenue over time</CardTitle>
              <CardDescription>
                Last 8 weeks (Mon–Sun), completed orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyRevenueChart data={weeklyChartData} />
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Upcoming specials
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Birthdays & anniversaries</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No birthdays or anniversaries in the next week.
                </p>
              ) : (
                upcoming.map((row) => (
                  <div
                    key={`${row.clientId}-${row.type}-${row.eventDate}`}
                    className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.type === "birthday" ? "Birthday" : "Anniversary"} ·{" "}
                        {formatVisitDate(row.eventDate)} · In {row.daysUntil}{" "}
                        {row.daysUntil === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <SendNoteButton
                      clientId={row.clientId}
                      clientName={row.name}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Separator className="opacity-50" />
        <p className="pb-8 text-center text-xs text-muted-foreground">
          Data is loaded from JSON files at request time (demo).
        </p>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
