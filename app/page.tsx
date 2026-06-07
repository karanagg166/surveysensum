"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Sliders, Play, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import SurveyJsonEditor from "@/components/SurveyJsonEditor";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SurveyDefinition, generateResponses } from "@/lib/api";

export default function SurveyEditorPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [survey, setSurvey] = useState<SurveyDefinition | null>(null);
  const [isValidJson, setIsValidJson] = useState(false);
  const [sampleSize, setSampleSize] = useState(200);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleValidationChange = (isValid: boolean, parsedSurvey: SurveyDefinition | null) => {
    setIsValidJson(isValid);
    if (parsedSurvey) {
      setSurvey(parsedSurvey);
    }
  };

  const handleGenerate = async () => {
    if (!isValidJson || !survey) {
      toast({
        title: "Validation Error",
        description: "Please resolve any JSON validation issues first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLoadingStep(0);

    // Simulate progress steps while generating
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1500);

    try {
      // Execute generate request to FastAPI
      const result = await generateResponses(survey, sampleSize);
      
      // Clear interval and set to final step
      clearInterval(stepInterval);
      setLoadingStep(3);
      
      // Short delay to let the user see the completed checklist
      setTimeout(() => {
        // Store in localStorage
        localStorage.setItem("survey_definition", JSON.stringify(survey));
        localStorage.setItem("survey_responses", JSON.stringify(result.responses));
        localStorage.setItem("survey_stats", JSON.stringify(result.stats));
        
        toast({
          title: "Success",
          description: `Generated ${sampleSize} responses successfully!`,
        });
        setIsLoading(false);
        router.push("/results");
      }, 800);

    } catch (e: any) {
      clearInterval(stepInterval);
      setIsLoading(false);
      toast({
        title: "Error",
        description: e.message || "Failed to generate responses. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 bg-zinc-50 flex flex-col justify-between" id="survey-editor-page">
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Header */}
        <div className="mb-8 text-center sm:text-left">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                SurveySensum AI
              </h1>
              <p className="text-sm text-zinc-500">
                Synthetic Survey Response Generator
              </p>
            </div>
          </motion.div>
        </div>

        {/* Workspace Layout */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-12 items-start"
        >
          {/* Left panel: JSON Editor */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } },
            }}
            className="md:col-span-7 h-full"
          >
            <SurveyJsonEditor onValidationChange={handleValidationChange} />
          </motion.div>

          {/* Right panel: Controls & Trigger */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } },
            }}
            className="md:col-span-5 space-y-6"
          >
            <Card className="border-zinc-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-zinc-900">
                  Generation Configuration
                </CardTitle>
                <CardDescription>
                  Configure the synthesis parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Sample Size Control */}
                <div className="space-y-2">
                  <label htmlFor="generator-count" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Response Count (N)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="generator-count"
                      type="number"
                      min={1}
                      max={500}
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                      className="bg-zinc-50 border-zinc-200"
                    />
                    <span className="text-xs text-zinc-400 shrink-0">Limit: 1 - 500</span>
                  </div>
                </div>

                {/* Info Box */}
                <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                    <Sliders className="h-4 w-4 text-indigo-600" />
                    SIMULATION DETAILS
                  </div>
                  <ul className="text-xs text-zinc-500 space-y-2 list-disc list-inside">
                    <li>4 responder archetypes: Promoter, Passive, Detractor, Mixed</li>
                    <li>Strong satisfaction-NPS correlation (Pearson r &gt; 0.70)</li>
                    <li>Automatic category weight assignment</li>
                    <li>High-fidelity open feedback comments via Cohere command-r</li>
                  </ul>
                </div>

                {/* Generate CTA Button */}
                <motion.div
                  whileHover={isValidJson && !isLoading ? { scale: 1.02 } : {}}
                  whileTap={isValidJson && !isLoading ? { scale: 0.98 } : {}}
                  className="w-full"
                >
                  <Button
                    id="generate-responses-btn"
                    onClick={handleGenerate}
                    disabled={!isValidJson || isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-lg shadow-indigo-100 hover:shadow-xl transition-all duration-300 py-6 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Generate Synthetic Data
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {/* Test Case Indicator Card */}
            <Card className="border-zinc-200/80 bg-zinc-50/50 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileJson className="h-3.5 w-3.5" />
                  Handoff Test Case
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-600 space-y-1">
                <p><span className="font-semibold text-zinc-800">Target:</span> E-commerce Customer Satisfaction Survey</p>
                <p><span className="font-semibold text-zinc-800">Sample size:</span> 200 synthetic responses</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} currentStep={loadingStep} />

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-200 bg-white mt-12 text-center text-xs text-zinc-400">
        &copy; {new Date().getFullYear()} SurveySensum AI. Built on Next.js 16 & FastAPI.
      </footer>
    </div>
  );
}
