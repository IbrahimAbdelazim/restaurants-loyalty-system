import { describe, it, expect } from "vitest";
import type { Client, MenuItem, Order } from "./types";
import {
  daysUntilNextMonthDay,
  getMondayOfWeek,
  getPopularMenuItems,
  getTierCounts,
  getTodayOverview,
  getTopClientsThisMonth,
  getUpcomingSpecials,
  getWeeklyRevenue,
  nextOccurrenceDateString,
  toISODateString,
} from "./analytics";

const menuFixture: MenuItem[] = [
  { id: "m1", name: "Salmon", category: "Main", price: 28 },
  { id: "m2", name: "Wine", category: "Drink", price: 12 },
  { id: "m3", name: "Cake", category: "Dessert", price: 8 },
];

describe("toISODateString / getMondayOfWeek", () => {
  it("formats local YYYY-MM-DD", () => {
    expect(toISODateString(new Date(2026, 3, 2))).toBe("2026-04-02");
  });

  it("returns Monday for a Wednesday in April 2026", () => {
    const wed = new Date(2026, 3, 2);
    const mon = getMondayOfWeek(wed);
    expect(mon.getDay()).toBe(1);
    expect(toISODateString(mon)).toBe("2026-03-30");
  });
});

describe("daysUntilNextMonthDay / nextOccurrenceDateString", () => {
  it("returns 0 when birthday is today", () => {
    const ref = new Date(2026, 3, 2);
    expect(daysUntilNextMonthDay("1990-04-02", ref)).toBe(0);
    expect(nextOccurrenceDateString("1990-04-02", ref)).toBe("2026-04-02");
  });

  it("returns days until birthday later in same year", () => {
    const ref = new Date(2026, 3, 2);
    expect(daysUntilNextMonthDay("1980-04-10", ref)).toBe(8);
  });

  it("wraps to next year when date already passed this year", () => {
    const ref = new Date(2026, 11, 30);
    expect(daysUntilNextMonthDay("1990-01-05", ref)).toBe(6);
    expect(nextOccurrenceDateString("1990-01-05", ref)).toBe("2027-01-05");
  });

  it("returns null for null input", () => {
    expect(daysUntilNextMonthDay(null, new Date())).toBeNull();
    expect(nextOccurrenceDateString(null, new Date())).toBeNull();
  });
});

describe("getTodayOverview", () => {
  const orders: Order[] = [
    {
      id: "o1",
      clientId: "c1",
      date: "2026-04-02",
      status: "completed",
      table: "1",
      items: [],
      total: 50,
      notes: "",
    },
    {
      id: "o2",
      clientId: "c2",
      date: "2026-04-02",
      status: "pending",
      table: "1",
      items: [],
      total: 20,
      notes: "",
    },
    {
      id: "o3",
      clientId: "c1",
      date: "2026-04-01",
      status: "completed",
      table: "1",
      items: [],
      total: 100,
      notes: "",
    },
  ];

  const clients: Client[] = [
    {
      id: "c1",
      name: "A",
      phone: "1",
      email: "",
      birthday: null,
      anniversary: null,
      tier: "Bronze",
      points: 0,
      familyGroupId: null,
      notes: "",
      createdAt: "2026-04-02",
    },
    {
      id: "c2",
      name: "B",
      phone: "2",
      email: "",
      birthday: null,
      anniversary: null,
      tier: "Bronze",
      points: 0,
      familyGroupId: null,
      notes: "",
      createdAt: "2025-01-01",
    },
  ];

  it("counts orders today excluding cancelled, revenue from completed only", () => {
    const ref = new Date(2026, 3, 2);
    const o = getTodayOverview(orders, clients, [{ clientId: "c1", phone: "", name: "", arrivedAt: "", table: "1" }], ref);
    expect(o.ordersToday).toBe(2);
    expect(o.revenueToday).toBe(50);
    expect(o.newClientsToday).toBe(1);
    expect(o.activeClients).toBe(1);
  });
});

describe("getTopClientsThisMonth", () => {
  const orders: Order[] = [
    {
      id: "o1",
      clientId: "c1",
      date: "2026-04-10",
      status: "completed",
      table: "1",
      items: [],
      total: 100,
      notes: "",
    },
    {
      id: "o2",
      clientId: "c1",
      date: "2026-04-15",
      status: "completed",
      table: "1",
      items: [],
      total: 50,
      notes: "",
    },
    {
      id: "o3",
      clientId: "c2",
      date: "2026-04-20",
      status: "completed",
      table: "1",
      items: [],
      total: 200,
      notes: "",
    },
    {
      id: "o4",
      clientId: "c2",
      date: "2026-03-01",
      status: "completed",
      table: "1",
      items: [],
      total: 999,
      notes: "",
    },
  ];

  const clients: Client[] = [
    {
      id: "c1",
      name: "Low",
      phone: "1",
      email: "",
      birthday: null,
      anniversary: null,
      tier: "Silver",
      points: 500,
      familyGroupId: null,
      notes: "",
      createdAt: "2020-01-01",
    },
    {
      id: "c2",
      name: "High",
      phone: "2",
      email: "",
      birthday: null,
      anniversary: null,
      tier: "Gold",
      points: 1500,
      familyGroupId: null,
      notes: "",
      createdAt: "2020-01-01",
    },
  ];

  it("sorts by spend descending and only April 2026", () => {
    const ref = new Date(2026, 3, 15);
    const rows = getTopClientsThisMonth(orders, clients, ref);
    expect(rows.length).toBe(2);
    expect(rows[0].clientId).toBe("c2");
    expect(rows[0].spend).toBe(200);
    expect(rows[0].visits).toBe(1);
    expect(rows[1].clientId).toBe("c1");
    expect(rows[1].spend).toBe(150);
    expect(rows[1].visits).toBe(2);
    expect(rows[1].lastVisit).toBe("2026-04-15");
  });
});

describe("getPopularMenuItems", () => {
  const orders: Order[] = [
    {
      id: "o1",
      clientId: "c1",
      date: "2026-04-01",
      status: "completed",
      table: "1",
      items: [
        { menuItemId: "m1", name: "Salmon", quantity: 2, price: 28 },
        { menuItemId: "m2", name: "Wine", quantity: 1, price: 12 },
      ],
      total: 68,
      notes: "",
    },
    {
      id: "o2",
      clientId: "c1",
      date: "2026-04-02",
      status: "cancelled",
      table: "1",
      items: [{ menuItemId: "m1", name: "Salmon", quantity: 10, price: 28 }],
      total: 280,
      notes: "",
    },
  ];

  it("aggregates completed orders only and sorts by quantity", () => {
    const all = getPopularMenuItems(orders, menuFixture, "all");
    expect(all.find((r) => r.menuItemId === "m1")?.quantity).toBe(2);
    expect(all.find((r) => r.menuItemId === "m2")?.quantity).toBe(1);
  });

  it("filters by category", () => {
    const mains = getPopularMenuItems(orders, menuFixture, "Main");
    expect(mains.length).toBe(1);
    expect(mains[0].menuItemId).toBe("m1");
    const drinks = getPopularMenuItems(orders, menuFixture, "Drink");
    expect(drinks.length).toBe(1);
  });
});

describe("getTierCounts", () => {
  it("counts tiers", () => {
    const clients: Client[] = [
      {
        id: "c1",
        name: "A",
        phone: "",
        email: "",
        birthday: null,
        anniversary: null,
        tier: "Bronze",
        points: 0,
        familyGroupId: null,
        notes: "",
        createdAt: "2020-01-01",
      },
      {
        id: "c2",
        name: "B",
        phone: "",
        email: "",
        birthday: null,
        anniversary: null,
        tier: "VIP",
        points: 4000,
        familyGroupId: null,
        notes: "",
        createdAt: "2020-01-01",
      },
      {
        id: "c3",
        name: "C",
        phone: "",
        email: "",
        birthday: null,
        anniversary: null,
        tier: "VIP",
        points: 5000,
        familyGroupId: null,
        notes: "",
        createdAt: "2020-01-01",
      },
    ];
    const c = getTierCounts(clients);
    expect(c.Bronze).toBe(1);
    expect(c.VIP).toBe(2);
    expect(c.Silver).toBe(0);
  });
});

describe("getWeeklyRevenue", () => {
  it("sums revenue per week bucket", () => {
    const orders: Order[] = [
      {
        id: "o1",
        clientId: "c1",
        date: "2026-04-02",
        status: "completed",
        table: "1",
        items: [],
        total: 10,
        notes: "",
      },
      {
        id: "o2",
        clientId: "c1",
        date: "2026-03-30",
        status: "completed",
        table: "1",
        items: [],
        total: 5,
        notes: "",
      },
    ];
    const ref = new Date(2026, 3, 2);
    const weeks = getWeeklyRevenue(orders, ref, 8);
    expect(weeks.length).toBe(8);
    const currentWeek = weeks[weeks.length - 1];
    expect(currentWeek.weekStart <= "2026-04-02" && currentWeek.weekEnd >= "2026-04-02").toBe(true);
    expect(currentWeek.revenue).toBe(15);
  });
});

describe("getUpcomingSpecials", () => {
  const clients: Client[] = [
    {
      id: "c1",
      name: "Soon",
      phone: "",
      email: "",
      birthday: "1990-04-05",
      anniversary: null,
      tier: "Bronze",
      points: 0,
      familyGroupId: null,
      notes: "",
      createdAt: "2020-01-01",
    },
  ];

  it("includes birthday within 7 days", () => {
    const ref = new Date(2026, 3, 2);
    const rows = getUpcomingSpecials(clients, ref, 7);
    expect(rows.some((r) => r.type === "birthday" && r.daysUntil === 3)).toBe(true);
  });
});
