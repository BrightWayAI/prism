"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ModelChartProps {
  byModel: Record<string, number>;
}

const MODEL_COLORS: Record<string, string> = {
  "gpt-4o": "#10a37f",
  "gpt-4o-mini": "#74aa9c",
  "gpt-4-turbo": "#1a7f64",
  "gpt-3.5-turbo": "#95d5b2",
  "claude-3-5-sonnet": "#d97757",
  "claude-3-opus": "#c4553c",
  "claude-3-sonnet": "#e8a592",
  "claude-3-haiku": "#f0c6b8",
};

export function ModelChart({ byModel }: ModelChartProps) {
  const data = Object.entries(byModel)
    .map(([name, value]) => ({
      name: name.length > 20 ? name.slice(0, 18) + "..." : name,
      fullName: name,
      value,
      color: MODEL_COLORS[name] || "#6b7280",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend by Model</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend by Model</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" tickFormatter={(value) => `$${value.toFixed(0)}`} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ""}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
