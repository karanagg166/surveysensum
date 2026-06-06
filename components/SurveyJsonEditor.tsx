"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { SurveyDefinition } from "@/lib/api";

const DEFAULT_SURVEY: SurveyDefinition = {
  title: "E-commerce Customer Satisfaction Survey",
  questions: [
    {
      id: "q1_overall_sat",
      type: "rating",
      text: "How satisfied are you with your overall shopping experience?",
      scale: 5,
    },
    {
      id: "q2_nps",
      type: "nps",
      text: "How likely are you to recommend us to a friend or colleague?",
      scale: 10,
    },
    {
      id: "q3_category",
      type: "single_choice",
      text: "Which category best describes the product you purchased?",
      options: ["Electronics", "Clothing", "Home", "Other"],
    },
    {
      id: "q4_delivery",
      type: "single_choice",
      text: "Was your package delivered on time?",
      options: ["Yes", "No"],
    },
    {
      id: "q5_feedback",
      type: "open_text",
      text: "Please share any additional comments or suggestions about your experience.",
    },
  ],
};

interface SurveyJsonEditorProps {
  onValidationChange: (isValid: boolean, survey: SurveyDefinition | null) => void;
}

export default function SurveyJsonEditor({ onValidationChange }: SurveyJsonEditorProps) {
  const [jsonText, setJsonText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Set initial default value
    const initialText = JSON.stringify(DEFAULT_SURVEY, null, 2);
    setJsonText(initialText);
    onValidationChange(true, DEFAULT_SURVEY);
  }, []);

  const handleChange = (val: string) => {
    setJsonText(val);
    
    if (val.trim() === "") {
      setErrorMsg("JSON content cannot be empty.");
      onValidationChange(false, null);
      return;
    }

    try {
      const parsed = JSON.parse(val);
      
      // Basic schema validation
      if (!parsed.title || typeof parsed.title !== "string") {
        throw new Error("Missing or invalid field: 'title' (must be a string).");
      }
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Missing or invalid field: 'questions' (must be an array).");
      }
      
      if (parsed.questions.length === 0) {
        throw new Error("'questions' array must contain at least one question.");
      }

      // Check each question structure
      parsed.questions.forEach((q: any, index: number) => {
        if (!q.id || typeof q.id !== "string") {
          throw new Error(`Question at index ${index} is missing a valid 'id'.`);
        }
        if (!q.type || !["rating", "nps", "single_choice", "open_text"].includes(q.type)) {
          throw new Error(`Question '${q.id}' has an invalid or missing 'type'. Must be: rating, nps, single_choice, or open_text.`);
        }
        if (!q.text || typeof q.text !== "string") {
          throw new Error(`Question '${q.id}' is missing a valid 'text' string.`);
        }
        if (q.type === "single_choice" && (!q.options || !Array.isArray(q.options) || q.options.length === 0)) {
          throw new Error(`Question '${q.id}' is a 'single_choice' but is missing an 'options' array with at least one element.`);
        }
      });

      // All checks passed
      setErrorMsg(null);
      onValidationChange(true, parsed as SurveyDefinition);
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid JSON syntax.");
      onValidationChange(false, null);
    }
  };

  const handleReset = () => {
    const text = JSON.stringify(DEFAULT_SURVEY, null, 2);
    setJsonText(text);
    setErrorMsg(null);
    onValidationChange(true, DEFAULT_SURVEY);
  };

  const isValid = errorMsg === null;

  return (
    <Card className="border-zinc-200/80 bg-white shadow-sm flex flex-col h-full">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-zinc-900">Survey Definition (JSON)</CardTitle>
          <CardDescription>Edit the survey questions or fields below</CardDescription>
        </div>
        <Button
          id="editor-reset-btn"
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-8 px-2.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 pb-4">
        <div className="relative flex-1 min-h-[300px]">
          <Textarea
            id="editor-textarea"
            value={jsonText}
            onChange={(e) => handleChange(e.target.value)}
            className={`w-full h-full font-mono text-xs p-4 leading-relaxed bg-zinc-50 border transition-all duration-300 resize-none ${
              isValid 
                ? "border-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                : "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            }`}
            style={{ minHeight: "350px", fontFamily: "var(--font-geist-mono), monospace" }}
          />
        </div>

        {/* Validation Status Footer */}
        <div
          id="editor-status-text"
          className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
            isValid
              ? "bg-emerald-50/50 text-emerald-800 border-emerald-100"
              : "bg-rose-50/50 text-rose-800 border-rose-100"
          }`}
        >
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Survey schema is valid and ready to generate.</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
