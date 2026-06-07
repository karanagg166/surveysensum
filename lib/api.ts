export type QuestionType = "rating" | "nps" | "single_choice" | "open_text";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  scale?: number;
  options?: string[];
}

export interface SurveyDefinition {
  title: string;
  questions: Question[];
}

export interface SurveyResponse {
  response_id: string;
  answers: Record<string, any>;
}

export interface NpsCounts {
  promoters: number;
  passives: number;
  detractors: number;
}

export interface SurveyStats {
  avg_satisfaction: number;
  avg_nps: number;
  nps_score: number;
  delivery_on_time_percentage: number;
  category_counts: Record<string, number>;
  nps_counts: NpsCounts;
  pearson_r: number | null;
  total_responses: number;
  token_usage: number;
  sentiment_alignment: number;
}

export interface GenerateResult {
  responses: SurveyResponse[];
  stats: SurveyStats;
}

/**
 * Check health of the backend API
 */
export async function healthCheck(): Promise<{ status: string; message: string }> {
  const res = await fetch("/api/health");
  if (!res.ok) {
    throw new Error("API health check failed");
  }
  return res.json();
}

/**
 * Generate survey responses
 */
export async function generateResponses(
  survey: SurveyDefinition,
  n: number
): Promise<GenerateResult> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ survey, n }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate responses");
  }

  return res.json();
}

/**
 * Download responses as CSV
 */
export async function downloadCSV(survey: SurveyDefinition, n: number): Promise<Blob> {
  const res = await fetch("/api/download/csv", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ survey, n }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to export CSV");
  }

  return res.blob();
}
