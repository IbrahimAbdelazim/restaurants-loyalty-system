"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const TIER_FILL: Record<string, string> = {
  Bronze: "#cd7f32",
  Silver: "#9ca3af",
  Gold: "#C9A84C",
  VIP: "#a78bfa",
};

export type TierSlice = { name: string; value: number };

export function TierDistributionChart({ data }: { data: TierSlice[] }) {
  const filtered = data.filter((d) => d.value > 0);
  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {filtered.map((entry) => (
              <Cell key={entry.name} fill={TIER_FILL[entry.name] ?? "#888"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
