"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SurveyStats } from "@/lib/api";

interface CategoryChartProps {
  stats: SurveyStats;
}

export default function CategoryChart({ stats }: CategoryChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="h-[350px] border-zinc-200/80 bg-white animate-pulse" />
        <Card className="h-[350px] border-zinc-200/80 bg-white animate-pulse" />
      </div>
    );
  }

  // Format data for Category distribution bar chart
  const categoryData = Object.keys(stats.category_counts || {}).map((cat) => ({
    name: cat,
    volume: stats.category_counts[cat],
  }));

  // Format data for NPS pie chart
  const npsData = [
    { name: "Promoters (9-10)", value: stats.nps_counts.promoters, color: "#10b981" }, // Emerald 500
    { name: "Passives (7-8)", value: stats.nps_counts.passives, color: "#f59e0b" },   // Amber 500
    { name: "Detractors (0-6)", value: stats.nps_counts.detractors, color: "#ef4444" }, // Red 500
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2" id="analytics-charts">
      {/* Category Chart */}
      <Card className="border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900">Purchase Volume by Category</CardTitle>
          <CardDescription>Response distribution across product departments</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pb-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "#f4f4f5", radius: 4 }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  color: "#18181b",
                }}
              />
              <Bar
                dataKey="volume"
                fill="url(#colorBar)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* NPS Distribution Chart */}
      <Card className="border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900">NPS Group Breakdown</CardTitle>
          <CardDescription>Customer sentiment segmentation (Promoters vs Detractors)</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center">
          <div className="relative h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={npsData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {npsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e4e4e7",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs font-medium text-zinc-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center NPS Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Score</span>
              <span className="text-2xl font-extrabold text-zinc-800">
                {stats.nps_score > 0 ? `+${stats.nps_score}` : stats.nps_score}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
