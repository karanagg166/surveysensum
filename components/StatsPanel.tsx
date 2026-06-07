"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Truck, Award, Smile } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurveyStats } from "@/lib/api";

interface StatsPanelProps {
  stats: SurveyStats;
}

function AnimatedNumber({ value, precision = 0 }: { value: number; precision?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    if (start === end) {
      setCurrent(end);
      return;
    }

    const duration = 1200; // 1.2s for smooth counting
    const startTime = performance.now();

    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = start + (end - start) * ease;
      setCurrent(nextVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span>{current.toFixed(precision)}</span>;
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
        staggerChildren: 0.08,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
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
      <motion.div variants={item} whileHover={{ y: -4 }} className="h-full">
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Avg Satisfaction (CSAT)</CardTitle>
            <Smile className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                <AnimatedNumber value={stats.avg_satisfaction} precision={2} />
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
      <motion.div variants={item} whileHover={{ y: -4 }} className="h-full">
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Net Promoter Score (NPS)</CardTitle>
            <Award className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                {stats.nps_score > 0 && "+"}
                <AnimatedNumber value={stats.nps_score} precision={0} />
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
      <motion.div variants={item} whileHover={{ y: -4 }} className="h-full">
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">On-Time Delivery Rate</CardTitle>
            <Truck className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-zinc-900">
                <AnimatedNumber value={stats.delivery_on_time_percentage} precision={1} />%
              </span>
            </div>
            <div className="mt-2 w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.delivery_on_time_percentage}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
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
      <motion.div variants={item} whileHover={{ y: -4 }} className="h-full">
        <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
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
              Responsible for <span className="font-semibold text-zinc-700"><AnimatedNumber value={topCategoryPct} precision={0} />%</span> of overall purchase volume.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
