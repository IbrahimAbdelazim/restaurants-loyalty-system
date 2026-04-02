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

export type WeeklyRevenuePoint = { label: string; revenue: number };

export function WeeklyRevenueChart({ data }: { data: WeeklyRevenuePoint[] }) {
  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 4, bottom: 48 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={48}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [`$${Number.isFinite(n) ? n.toFixed(2) : "0"}`, "Revenue"];
            }}
          />
          <Bar dataKey="revenue" fill="#C9A84C" radius={[4, 4, 0, 0]} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
