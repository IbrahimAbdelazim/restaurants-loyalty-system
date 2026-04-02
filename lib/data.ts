import fs from "fs";
import path from "path";
import type {
  ActiveVisit,
  Client,
  ClientWithStats,
  FamilyGroup,
  MenuItem,
  Order,
  Promo,
  ShiftLogEntry,
} from "./types";
import { tierForPoints } from "./cashier-utils";
import {
  buildMenuCategoryMap,
  clientPhoneMatchesPartial,
  normalizePhoneDigits,
  orderFoodDrinkTotals,
} from "./waiter-utils";

const dataDir = path.join(process.cwd(), "data");

function readJSON<T>(filename: string): T {
  const file = path.join(dataDir, filename);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function writeJSON<T>(filename: string, data: T): void {
  const file = path.join(dataDir, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// --- Clients ---

export function getClients(): Client[] {
  return readJSON<Client[]>("clients.json");
}

export function getClientById(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function getClientByPhone(phone: string): Client | undefined {
  const normalized = normalizePhoneDigits(phone);
  return getClients().find((c) => normalizePhoneDigits(c.phone) === normalized);
}

export function findClientsByPhoneDigits(digits: string): Client[] {
  const d = normalizePhoneDigits(digits);
  if (d.length < 4) return [];
  return getClients().filter((c) =>
    clientPhoneMatchesPartial(normalizePhoneDigits(c.phone), d)
  );
}

function nextClientId(clients: Client[]): string {
  const nums = clients.map((c) => {
    const m = /^c(\d+)$/.exec(c.id);
    return m ? parseInt(m[1], 10) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `c${n}`;
}

export type RegisterClientInput = {
  name: string;
  phone: string;
  birthday: string | null;
  notes: string;
};

export type RegisterClientResult =
  | { ok: true; client: Client }
  | { ok: false; reason: "duplicate_phone" | "invalid_name" | "invalid_phone" };

export function registerClient(input: RegisterClientInput): RegisterClientResult {
  const name = input.name.trim();
  const phoneDigits = normalizePhoneDigits(input.phone);
  if (!name) return { ok: false, reason: "invalid_name" };
  if (phoneDigits.length < 4) return { ok: false, reason: "invalid_phone" };
  if (getClientByPhone(phoneDigits)) return { ok: false, reason: "duplicate_phone" };

  const clients = getClients();
  const client: Client = {
    id: nextClientId(clients),
    name,
    phone: phoneDigits,
    email: "",
    birthday: input.birthday,
    anniversary: null,
    tier: "Bronze",
    points: 0,
    familyGroupId: null,
    notes: input.notes.trim(),
    createdAt: new Date().toISOString().split("T")[0],
  };
  saveClient(client);
  return { ok: true, client };
}

export function saveClient(client: Client): void {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    clients[idx] = client;
  } else {
    clients.push(client);
  }
  writeJSON("clients.json", clients);
}

// --- Family Groups ---

export function getFamilyGroups(): FamilyGroup[] {
  return readJSON<FamilyGroup[]>("family_groups.json");
}

export function getFamilyMembers(familyGroupId: string): Client[] {
  return getClients().filter((c) => c.familyGroupId === familyGroupId);
}

// --- Menu ---

export function getMenu(): MenuItem[] {
  return readJSON<MenuItem[]>("menu.json");
}

// --- Orders ---

export function getOrders(): Order[] {
  return readJSON<Order[]>("orders.json");
}

export function getOrdersByClientId(clientId: string): Order[] {
  return getOrders()
    .filter((o) => o.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function saveOrder(order: Order): void {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
  } else {
    orders.push(order);
  }
  writeJSON("orders.json", orders);
}

// --- Promos ---

export function getPromos(): Promo[] {
  return readJSON<Promo[]>("promos.json");
}

export function getActivePromoByCode(code: string): Promo | undefined {
  const trimmed = code.trim().toUpperCase();
  return getPromos().find(
    (p) => p.active && p.code.toUpperCase() === trimmed
  );
}

// --- Shift log ---

export function getShiftLog(): ShiftLogEntry[] {
  return readJSON<ShiftLogEntry[]>("shift_log.json");
}

function nextShiftLogId(entries: ShiftLogEntry[]): string {
  const nums = entries.map((e) => {
    const m = /^sl(\d+)$/.exec(e.id);
    return m ? parseInt(m[1], 10) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `sl${n}`;
}

export function appendShiftLogEntry(
  entry: Omit<ShiftLogEntry, "id"> & { id?: string }
): ShiftLogEntry {
  const entries = getShiftLog();
  const row: ShiftLogEntry = {
    ...entry,
    id: entry.id ?? nextShiftLogId(entries),
  };
  entries.push(row);
  writeJSON("shift_log.json", entries);
  return row;
}

export function getShiftLogEntriesForDate(dateStr: string): ShiftLogEntry[] {
  const prefix = dateStr;
  return getShiftLog().filter((e) => e.confirmedAt.startsWith(prefix));
}

// --- Points & tier ---

export function awardPointsAndSave(client: Client, pointsDelta: number): Client {
  const nextPoints = Math.max(0, client.points + pointsDelta);
  const updated: Client = {
    ...client,
    points: nextPoints,
    tier: tierForPoints(nextPoints),
  };
  saveClient(updated);
  return updated;
}

// --- Active visits ---

export function getActiveVisits(): ActiveVisit[] {
  const raw = readJSON<Array<ActiveVisit & { table?: string }>>("active_visits.json");
  return raw.map((v) => ({
    ...v,
    table: v.table && String(v.table).trim() ? String(v.table).trim() : "1",
  }));
}

export function markArrived(client: Client, table: string = "1"): void {
  const visits = getActiveVisits();
  const idx = visits.findIndex((v) => v.clientId === client.id);
  const t = table.trim() || "1";
  const row: ActiveVisit = {
    clientId: client.id,
    phone: client.phone,
    name: client.name,
    arrivedAt: new Date().toISOString(),
    table: t,
  };
  if (idx >= 0) visits[idx] = row;
  else visits.push(row);
  writeJSON("active_visits.json", visits);
}

export function markDeparted(clientId: string): void {
  const visits = getActiveVisits().filter((v) => v.clientId !== clientId);
  writeJSON("active_visits.json", visits);
}

// --- Enriched client profile ---

export function getClientWithStats(clientId: string): ClientWithStats | null {
  const client = getClientById(clientId);
  if (!client) return null;

  const orders = getOrdersByClientId(clientId);
  const totalVisits = orders.filter((o) => o.status === "completed").length;
  const totalSpent = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total, 0);
  const lastVisit = orders.length > 0 ? orders[0].date : null;

  // Calculate favorite items across all orders
  const itemCount: Record<string, { name: string; menuItemId: string; count: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (!itemCount[item.menuItemId]) {
        itemCount[item.menuItemId] = { name: item.name, menuItemId: item.menuItemId, count: 0 };
      }
      itemCount[item.menuItemId].count += item.quantity;
    }
  }
  const favoriteItems = Object.values(itemCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Family
  const groups = getFamilyGroups();
  const group = client.familyGroupId
    ? groups.find((g) => g.id === client.familyGroupId)
    : undefined;
  const familyMembers = client.familyGroupId
    ? getFamilyMembers(client.familyGroupId).filter((m) => m.id !== clientId)
    : [];

  const categoryById = buildMenuCategoryMap(getMenu());
  const recentOrders = orders.slice(0, 10).map((o) => {
    const { food, drinks } = orderFoodDrinkTotals(o.items, categoryById);
    return { ...o, foodTotal: food, drinkTotal: drinks };
  });

  return {
    ...client,
    totalVisits,
    totalSpent,
    lastVisit,
    favoriteItems,
    familyMembers,
    familyGroupName: group?.name ?? null,
    recentOrders,
  };
}
