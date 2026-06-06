"use client";

import { motion } from "framer-motion";
import { Star, Truck, Award, Smile } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurveyStats } from "@/lib/api";

interface StatsPanelProps {
  stats: SurveyStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  // Determine top category from category counts
  const categories = Object.keys(stats.category_counts || {});
  let topCategory = "N/A";
  let topCount = 0;
  let totalCategoryCount = 0;
  
  categories.forEach((cat) => {
    const count = stats.category_counts[cat];
    totalCategoryCount += count;
    if (count > topCount) {
      topCount = count;
      topCategory = cat;
    }
  });

  const topCategoryPct = totalCategoryCount > 0 
    ? Math.round((topCount / totalCategoryCount) * 100) 
    : 0;

  // NPS Styling based on score
  const getNpsColor = (score: number) => {
    if (score >= 30) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 0) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      id="stats-panel"
    >
      {/* Average Satisfaction */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Avg Satisfaction (CSAT)</CardTitle>
            <Smile className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                {stats.avg_satisfaction.toFixed(2)}
              </span>
              <span className="text-sm text-zinc-500">/ 5.00</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < Math.round(stats.avg_satisfaction)
                        ? "fill-current"
                        : "text-zinc-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-400">based on overall rating</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Net Promoter Score (NPS) */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Net Promoter Score (NPS)</CardTitle>
            <Award className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                {stats.nps_score > 0 ? `+${stats.nps_score}` : stats.nps_score}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getNpsColor(
                  stats.nps_score
                )}`}
              >
                {stats.nps_score >= 30 ? "Excellent" : stats.nps_score >= 0 ? "Good" : "Needs Care"}
              </span>
              <span className="text-xs text-zinc-400">
                {stats.nps_counts.promoters} P / {stats.nps_counts.detractors} D
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delivery Success Rate */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">On-Time Delivery Rate</CardTitle>
            <Truck className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                {stats.delivery_on_time_percentage.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.delivery_on_time_percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-indigo-600 h-1.5 rounded-full"
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
              <span>On-time deliveries</span>
              <span>100% Target</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Purchasing Category */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Top Product Category</CardTitle>
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Demographic</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 truncate max-w-full">
                {topCategory}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Responsible for <span className="font-semibold text-zinc-700">{topCategoryPct}%</span> of overall purchase volume.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
