"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PopularItemPoint = { name: string; quantity: number };

export function PopularItemsChart({ data }: { data: PopularItemPoint[] }) {
  const top = data.slice(0, 12);
  const chartHeight = Math.min(480, Math.max(280, top.length * 28));
  return (
    <div className="w-full min-w-0" style={{ minHeight: 280, height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={top}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value) => [value != null ? String(value) : "0", "Qty"]}
          />
          <Bar dataKey="quantity" fill="#C9A84C" radius={[0, 4, 4, 0]} name="Quantity" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
