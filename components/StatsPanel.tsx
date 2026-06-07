"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Truck, Award, Smile, Activity, TrendingUp, CheckCircle2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  const getPearsonStyle = (r: number | null) => {
    if (r === null) return { bg: "bg-zinc-100 text-zinc-500 border-zinc-200", text: "text-zinc-600", label: "N/A" };
    if (r >= 0.70) return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Strong Correlation" };
    if (r >= 0.50) return { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "Moderate Correlation" };
    return { bg: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700", label: "Weak Correlation" };
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

  const pearsonStyle = getPearsonStyle(stats.pearson_r);

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

      {/* Synthetic Quality & LLM Pipeline Metrics Banner */}
      <motion.div variants={item} className="sm:col-span-2 lg:col-span-4 mt-2">
        <Card className="overflow-hidden border-indigo-100 bg-indigo-50/20 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-3 border-b border-indigo-100/50 bg-indigo-50/30 px-6 py-4">
            <div>
              <CardTitle className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                <Activity className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                Synthetic Quality &amp; LLM Pipeline Metrics
              </CardTitle>
              <CardDescription className="text-xs text-indigo-700/70">
                Real-time validation of synthetic response coherence, semantic alignment, and pipeline cost.
              </CardDescription>
            </div>
            <span className="self-start sm:self-center inline-flex items-center rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
              Verification Active
            </span>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3 p-6">
            {/* Pearson Correlation Metric */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Statistical Coherence
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold text-zinc-900">
                  {stats.pearson_r !== null ? (
                    <>r = <AnimatedNumber value={stats.pearson_r} precision={3} /></>
                  ) : (
                    "N/A"
                  )}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${pearsonStyle.bg} ${pearsonStyle.text}`}>
                  {pearsonStyle.label}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
                Pearson correlation between satisfaction &amp; NPS. Write-up target: <span className="font-semibold text-zinc-700">r &ge; 0.70</span>.
              </p>
            </div>

            {/* Sentiment Alignment Metric */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                Semantic Sentiment Alignment
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold text-zinc-900">
                  <AnimatedNumber value={stats.sentiment_alignment} precision={1} />%
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Highly Aligned
                </span>
              </div>
              <div className="mt-2 w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.sentiment_alignment}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="bg-emerald-500 h-1 rounded-full"
                />
              </div>
              <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
                Matches numerical scores with open-text comment semantics.
              </p>
            </div>

            {/* Token Usage Metric */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Zap className="h-4 w-4 text-indigo-500" />
                LLM Pipeline Resource Cost
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold text-zinc-900">
                  {stats.token_usage > 0 ? (
                    <><AnimatedNumber value={stats.token_usage} precision={0} /> tns</>
                  ) : (
                    "0 tokens"
                  )}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  stats.token_usage > 0 
                    ? "bg-purple-50 text-purple-700 border-purple-200" 
                    : "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}>
                  {stats.token_usage > 0 ? "Command-R Active" : "Local Fallback Engine"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
                Resource usage for open-text generation. Estimated budget impact: <span className="font-semibold text-zinc-700">${(stats.token_usage * 0.0000015).toFixed(4)}</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
