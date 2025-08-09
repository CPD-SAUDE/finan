"use client"

import {
  LineChart as RLineChart,
  Line,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

type Point = { name: string; vendas?: number; lucros?: number; impostos?: number }

export function OverviewChart({
  data = [],
  type = "bar",
}: {
  data?: Point[]
  type?: "bar" | "line"
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <RBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="vendas" fill="hsl(160 84% 39%)" name="Vendas" />
            <Bar dataKey="lucros" fill="hsl(142 76% 36%)" name="Lucros" />
            <Bar dataKey="impostos" fill="hsl(24 95% 53%)" name="Impostos" />
          </RBarChart>
        ) : (
          <RLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="vendas" stroke="hsl(160 84% 39%)" name="Vendas" />
            <Line type="monotone" dataKey="lucros" stroke="hsl(142 76% 36%)" name="Lucros" />
            <Line type="monotone" dataKey="impostos" stroke="hsl(24 95% 53%)" name="Impostos" />
          </RLineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
