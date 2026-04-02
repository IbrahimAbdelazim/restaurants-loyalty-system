import fs from "fs";
import path from "path";
import type { Client, FamilyGroup, MenuItem, Order, ClientWithStats } from "./types";

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
  const normalized = phone.replace(/\s+/g, "");
  return getClients().find((c) => c.phone.replace(/\s+/g, "") === normalized);
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

  return {
    ...client,
    totalVisits,
    totalSpent,
    lastVisit,
    favoriteItems,
    familyMembers,
    familyGroupName: group?.name ?? null,
    recentOrders: orders.slice(0, 10),
  };
}
