"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Download, FileSpreadsheet, FileJson, BarChart3, Database } from "lucide-react";
import { toast } from "sonner";

import StatsPanel from "@/components/StatsPanel";
import CategoryChart from "@/components/CategoryChart";
import ResponseTable from "@/components/ResponseTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SurveyDefinition, SurveyResponse, SurveyStats } from "@/lib/api";

export default function ResultsDashboardPage() {
  const router = useRouter();

  const [survey, setSurvey] = useState<SurveyDefinition | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data from localStorage
    try {
      const storedSurvey = localStorage.getItem("survey_definition");
      const storedResponses = localStorage.getItem("survey_responses");
      const storedStats = localStorage.getItem("survey_stats");

      if (!storedSurvey || !storedResponses || !storedStats) {
        toast.error("No active session found. Redirecting to survey creator.");
        router.push("/");
        return;
      }

      setSurvey(JSON.parse(storedSurvey));
      setResponses(JSON.parse(storedResponses));
      setStats(JSON.parse(storedStats));
    } catch (e) {
      console.error("Failed to parse stored survey session", e);
      toast.error("Error loading session data.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Client-side CSV Download
  const handleDownloadCSV = () => {
    if (!survey || responses.length === 0) return;

    try {
      toast.info("Preparing CSV export...");

      const headers = ["response_id", ...survey.questions.map((q) => q.id)];
      
      const csvRows = [
        headers.join(","), // Header row
        ...responses.map((resp) => {
          return headers
            .map((header) => {
              if (header === "response_id") {
                return resp.response_id;
              }
              const answer = resp.answers[header];
              if (answer === null || answer === undefined) {
                return "";
              }
              // Format strings to escape commas and quotes
              const escaped = String(answer).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",");
        }),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const safeTitle = survey.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      link.setAttribute("download", `${safeTitle}_synthetic_responses.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("CSV download started!");
    } catch (e) {
      toast.error("Failed to export CSV file.");
    }
  };

  // Client-side JSON Download
  const handleDownloadJSON = () => {
    if (!survey || responses.length === 0) return;

    try {
      toast.info("Preparing JSON export...");

      const exportData = {
        survey,
        generated_at: new Date().toISOString(),
        responses,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      const safeTitle = survey.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      link.setAttribute("download", `${safeTitle}_synthetic_data.json`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("JSON download started!");
    } catch (e) {
      toast.error("Failed to export JSON file.");
    }
  };

  if (loading || !survey || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50" id="results-dashboard-loading">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-zinc-500">Loading analysis dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-50 flex flex-col justify-between" id="results-dashboard-page">
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              id="back-to-editor-btn"
              variant="outline"
              size="icon"
              onClick={() => router.push("/")}
              className="h-9 w-9 border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
                {survey.title}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  <Database className="h-3 w-3 mr-1" />
                  {responses.length} Synthetic Responses
                </span>
                <span className="text-xs text-zinc-400">Generated locally via Cohere AI</span>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            {/* Download CSV */}
            <Button
              id="download-csv-btn"
              onClick={handleDownloadCSV}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </Button>

            {/* Download JSON */}
            <Button
              id="download-json-btn"
              onClick={handleDownloadJSON}
              variant="outline"
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer"
            >
              <FileJson className="h-3.5 w-3.5" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Stats Summary cards */}
        <StatsPanel stats={stats} />

        {/* Recharts Analytics Charts */}
        <CategoryChart stats={stats} />

        {/* Tabular Responses Details */}
        <Card className="border-zinc-200/80 bg-white shadow-sm">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-indigo-600" />
                Raw Simulation Dataset
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">View and filter individual synthetic profiles</p>
            </div>
          </div>
          <CardContent className="p-6">
            <ResponseTable responses={responses} survey={survey} />
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-200 bg-white mt-12 text-center text-xs text-zinc-400">
        &copy; {new Date().getFullYear()} SurveySensum AI. All rights reserved.
      </footer>
    </div>
  );
}
