export type Tier = "Bronze" | "Silver" | "Gold" | "VIP";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string | null;
  anniversary: string | null;
  tier: Tier;
  points: number;
  familyGroupId: string | null;
  notes: string;
  createdAt: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: "Starter" | "Main" | "Dessert" | "Drink";
  price: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  clientId: string;
  date: string;
  status: "completed" | "pending" | "cancelled";
  table: string;
  items: OrderItem[];
  total: number;
  notes: string;
  promoCode?: string;
  discountTotal?: number;
  pointsEarned?: number;
}

export interface OrderWithCategoryTotals extends Order {
  foodTotal: number;
  drinkTotal: number;
}

export interface ActiveVisit {
  clientId: string;
  phone: string;
  name: string;
  arrivedAt: string;
  table: string;
}

export interface Promo {
  code: string;
  percentDiscount: number;
  active: boolean;
}

export interface ShiftLogClientSummary {
  clientId: string;
  name: string;
  pointsEarned: number;
  total: number;
}

export interface ShiftLogEntry {
  id: string;
  confirmedAt: string;
  table: string;
  orderIds: string[];
  totalRevenue: number;
  clientSummaries: ShiftLogClientSummary[];
}

/** Cashier checkout response — one row per guest after payment */
export interface CheckoutReceiptLine {
  clientId: string;
  name: string;
  total: number;
  pointsEarned: number;
  pointsTotal: number;
  tier: Tier;
  items: OrderItem[];
}

export type ClientMatchPreview = Pick<Client, "id" | "name" | "phone">;

// Enriched types for UI
export interface ClientWithStats extends Client {
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  favoriteItems: { name: string; menuItemId: string; count: number }[];
  familyMembers: Client[];
  familyGroupName: string | null;
  recentOrders: OrderWithCategoryTotals[];
}
