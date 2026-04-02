"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ClientWithStats, Order } from "@/lib/types";

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-700 text-white",
  Silver: "bg-gray-400 text-white",
  Gold: "bg-yellow-500 text-white",
  VIP: "bg-purple-600 text-white",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isBirthdayToday(birthday: string | null) {
  if (!birthday) return false;
  const today = new Date();
  const bday = new Date(birthday);
  return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
}

function isAnniversaryToday(anniversary: string | null) {
  if (!anniversary) return false;
  const today = new Date();
  const ann = new Date(anniversary);
  return today.getMonth() === ann.getMonth() && today.getDate() === ann.getDate();
}

export default function WaiterPage() {
  const [phone, setPhone] = useState("");
  const [client, setClient] = useState<ClientWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastOrderCount, setLastOrderCount] = useState(0);

  const fetchClient = useCallback(async (phoneNum: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clients?phone=${encodeURIComponent(phoneNum)}`);
      if (!res.ok) {
        if (!isRefresh) setError("Client not found. Check the phone number.");
        return;
      }
      const data: ClientWithStats = await res.json();
      setClient(data);
      setLastOrderCount(data.recentOrders.length);
    } catch {
      if (!isRefresh) setError("Failed to load client.");
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) fetchClient(phone.trim());
  };

  // Poll for new orders every 3 seconds when a client is loaded
  useEffect(() => {
    if (!client) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/clients?id=${client.id}`);
      if (!res.ok) return;
      const data: ClientWithStats = await res.json();
      if (data.recentOrders.length > lastOrderCount) {
        setClient(data);
        setLastOrderCount(data.recentOrders.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [client, lastOrderCount]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Waiter App</h1>
            <p className="text-xs text-gray-500">Guest Loyalty System</p>
          </div>
        </div>
        {client && (
          <button
            onClick={() => { setClient(null); setPhone(""); setError(""); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Clear
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter client phone number..."
            className="text-lg h-12"
            type="tel"
          />
          <button
            type="submit"
            className="h-12 px-6 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
          >
            Search
          </button>
        </form>

        {loading && (
          <div className="text-center text-gray-500 py-8">Searching...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {client && (
          <div className="space-y-4">
            {/* Birthday / Anniversary Alerts */}
            {isBirthdayToday(client.birthday) && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 flex items-center gap-2 text-pink-800">
                🎂 <span className="font-semibold">Birthday today!</span> Wish {client.name.split(" ")[0]} a happy birthday.
              </div>
            )}
            {isAnniversaryToday(client.anniversary) && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2 text-rose-800">
                💑 <span className="font-semibold">Anniversary today!</span> Congratulate the couple.
              </div>
            )}

            {/* Client Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-gray-200">
                      {initials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[client.tier]}`}>
                        {client.tier}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">{client.phone}</p>
                    {client.familyGroupName && (
                      <p className="text-gray-400 text-xs mt-0.5">{client.familyGroupName}</p>
                    )}
                    <div className="flex gap-6 mt-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Visits</p>
                        <p className="text-xl font-bold text-gray-900">{client.totalVisits}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Total Spent</p>
                        <p className="text-xl font-bold text-gray-900">${client.totalSpent}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Points</p>
                        <p className="text-xl font-bold text-gray-900">{client.points.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Last Visit</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {client.lastVisit ? formatDate(client.lastVisit) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {client.notes && (
                  <>
                    <Separator className="my-4" />
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1">NOTES</p>
                      <p className="text-sm text-amber-900">{client.notes}</p>
                    </div>
                  </>
                )}

                {/* Favorites */}
                {client.favoriteItems.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        ⭐ Favorites
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {client.favoriteItems.map((item) => (
                          <span
                            key={item.menuItemId}
                            className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium border border-yellow-300"
                          >
                            {item.name}
                            <span className="ml-1.5 text-yellow-600 font-normal text-xs">
                              ×{item.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tabs: History + Family */}
            <Tabs defaultValue="history">
              <TabsList className="w-full">
                <TabsTrigger value="history" className="flex-1">
                  Order History ({client.recentOrders.length})
                </TabsTrigger>
                <TabsTrigger value="family" className="flex-1">
                  Family ({client.familyMembers.length})
                </TabsTrigger>
              </TabsList>

              {/* Order History */}
              <TabsContent value="history" className="space-y-3 mt-4">
                {client.recentOrders.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No orders yet.</p>
                ) : (
                  client.recentOrders.map((order: Order) => (
                    <OrderCard key={order.id} order={order} />
                  ))
                )}
              </TabsContent>

              {/* Family */}
              <TabsContent value="family" className="space-y-3 mt-4">
                {client.familyMembers.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No family members linked.</p>
                ) : (
                  client.familyMembers.map((member) => (
                    <Card
                      key={member.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setPhone(member.phone);
                        fetchClient(member.phone);
                      }}
                    >
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-200">
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.phone}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[member.tier]}`}>
                          {member.tier}
                        </span>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{formatDate(order.date)}</span>
            <span className="text-xs text-gray-400">Table {order.table}</span>
          </div>
          <span className="font-bold text-gray-900">${order.total}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {order.items.map((item, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              {item.name} ×{item.quantity}
            </span>
          ))}
        </div>
        {order.notes && (
          <p className="text-xs text-gray-400 mt-1.5 italic">{order.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
