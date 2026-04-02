"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Client, MenuItem, OrderItem } from "@/lib/types";

const CATEGORIES = ["Starter", "Main", "Dessert", "Drink"] as const;

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-700 text-white",
  Silver: "bg-gray-400 text-white",
  Gold: "bg-yellow-500 text-white",
  VIP: "bg-purple-600 text-white",
};

export default function CashierPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
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

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price }];
    });
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((i) => i.menuItemId !== menuItemId);
      return prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function confirmOrder() {
    if (!selectedClient || cart.length === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          table,
          items: cart,
          total,
          notes,
        }),
      });
      setSuccess(true);
      setCart([]);
      setNotes("");
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🧾</span>
        <div>
          <h1 className="text-xl font-bold">Cashier App</h1>
          <p className="text-xs text-gray-400">POS — Order Entry</p>
        </div>
      </header>

      {success && (
        <div className="bg-green-500 text-white text-center py-3 font-semibold">
          ✓ Order confirmed and synced to loyalty system!
        </div>
      )}

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left — Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {CATEGORIES.map((cat) => {
            const items = menu.filter((m) => m.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {cat}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => {
                    const inCart = cart.find((c) => c.menuItemId === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          inCart
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        }`}
                      >
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className={`text-sm mt-0.5 ${inCart ? "text-gray-300" : "text-gray-500"}`}>
                          ${item.price}
                          {inCart && (
                            <span className="ml-2 font-bold text-yellow-400">×{inCart.quantity}</span>
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — Order Panel */}
        <div className="w-96 bg-white border-l flex flex-col">
          {/* Client selector */}
          <div className="p-4 border-b">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Client</p>
            <Input
              placeholder="Search by name or phone..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="mb-2"
            />
            {clientSearch && !selectedClient && (
              <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                {filteredClients.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => {
                      setSelectedClient(c);
                      setClientSearch(c.name);
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 ml-2">{c.phone}</span>
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="p-3 text-sm text-gray-400">No clients found.</p>
                )}
              </div>
            )}
            {selectedClient && (
              <div className="flex items-center justify-between bg-gray-50 rounded-md p-2 mt-1">
                <div>
                  <p className="text-sm font-semibold">{selectedClient.name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[selectedClient.tier]}`}>
                    {selectedClient.tier}
                  </span>
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Table</p>
            <Input
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className="w-20 h-8 text-sm"
            />
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                Tap menu items to add them.
              </p>
            ) : (
              cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">${item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(item.menuItemId)}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price, category: "Main" })}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="w-12 text-right text-sm font-semibold">
                      ${item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Notes + Total + Confirm */}
          <div className="p-4 space-y-3">
            <Input
              placeholder="Order notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-bold text-gray-900">${total}</span>
            </div>
            <button
              onClick={confirmOrder}
              disabled={!selectedClient || cart.length === 0 || submitting}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Processing..." : "Confirm Order"}
            </button>
            {!selectedClient && cart.length > 0 && (
              <p className="text-xs text-center text-red-500">Select a client to confirm.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
