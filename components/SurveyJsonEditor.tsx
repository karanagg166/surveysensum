"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Eye, 
  Code, 
  FileText, 
  Star, 
  Award, 
  List,
  Sparkles
} from "lucide-react";
import { SurveyDefinition, Question, QuestionType } from "@/lib/api";

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

type EditorTab = "visual" | "json";

export default function SurveyJsonEditor({ onValidationChange }: SurveyJsonEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("visual");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(DEFAULT_SURVEY, null, 2));
  const [surveyState, setSurveyState] = useState<SurveyDefinition | null>(DEFAULT_SURVEY);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Notify parent on mount
  useEffect(() => {
    onValidationChange(true, DEFAULT_SURVEY);
  }, []);

  // Sync state helpers
  const updateSurveyAndJSON = (newSurvey: SurveyDefinition) => {
    setSurveyState(newSurvey);
    const text = JSON.stringify(newSurvey, null, 2);
    setJsonText(text);
    setErrorMsg(null);
    onValidationChange(true, newSurvey);
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    
    if (val.trim() === "") {
      setErrorMsg("JSON content cannot be empty.");
      setSurveyState(null);
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

      setErrorMsg(null);
      setSurveyState(parsed as SurveyDefinition);
      onValidationChange(true, parsed as SurveyDefinition);
    } catch (e: any) {
      setErrorMsg(e.message || "Invalid JSON syntax.");
      setSurveyState(null);
      onValidationChange(false, null);
    }
  };

  const handleReset = () => {
    updateSurveyAndJSON(DEFAULT_SURVEY);
  };

  // Visual Editor handlers
  const handleTitleChange = (title: string) => {
    if (!surveyState) return;
    updateSurveyAndJSON({
      ...surveyState,
      title,
    });
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    if (!surveyState) return;
    const updatedQuestions = [...surveyState.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], text };
    updateSurveyAndJSON({ ...surveyState, questions: updatedQuestions });
  };

  const handleQuestionTypeChange = (index: number, type: QuestionType) => {
    if (!surveyState) return;
    const updatedQuestions = [...surveyState.questions];
    const original = updatedQuestions[index];
    
    // Setup defaults based on type
    const updated: Question = {
      id: original.id,
      text: original.text,
      type,
    };
    
    if (type === "rating") {
      updated.scale = 5;
    } else if (type === "nps") {
      updated.scale = 10;
    } else if (type === "single_choice") {
      updated.options = ["Yes", "No"];
    }

    updatedQuestions[index] = updated;
    updateSurveyAndJSON({ ...surveyState, questions: updatedQuestions });
  };

  const handleQuestionScaleChange = (index: number, scale: number) => {
    if (!surveyState) return;
    const updatedQuestions = [...surveyState.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], scale };
    updateSurveyAndJSON({ ...surveyState, questions: updatedQuestions });
  };

  const handleQuestionOptionsChange = (index: number, options: string[]) => {
    if (!surveyState) return;
    const updatedQuestions = [...surveyState.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], options };
    updateSurveyAndJSON({ ...surveyState, questions: updatedQuestions });
  };

  const addOption = (qIndex: number, newOptionText: string) => {
    if (!surveyState || !newOptionText.trim()) return;
    const question = surveyState.questions[qIndex];
    const currentOptions = question.options || [];
    if (!currentOptions.includes(newOptionText.trim())) {
      handleQuestionOptionsChange(qIndex, [...currentOptions, newOptionText.trim()]);
    }
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    if (!surveyState) return;
    const question = surveyState.questions[qIndex];
    const currentOptions = question.options || [];
    if (currentOptions.length > 1) {
      const updated = currentOptions.filter((_, i) => i !== optIndex);
      handleQuestionOptionsChange(qIndex, updated);
    }
  };

  const deleteQuestion = (index: number) => {
    if (!surveyState || surveyState.questions.length <= 1) return;
    const updatedQuestions = surveyState.questions.filter((_, i) => i !== index);
    updateSurveyAndJSON({ ...surveyState, questions: updatedQuestions });
  };

  const addQuestion = () => {
    if (!surveyState) return;
    const newId = `q${surveyState.questions.length + 1}_question`;
    const newQuestion: Question = {
      id: newId,
      type: "rating",
      text: "New Survey Question",
      scale: 5,
    };
    updateSurveyAndJSON({
      ...surveyState,
      questions: [...surveyState.questions, newQuestion],
    });
  };

  const getQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case "rating": return <Star className="h-4 w-4 text-amber-500" />;
      case "nps": return <Award className="h-4 w-4 text-indigo-500" />;
      case "single_choice": return <List className="h-4 w-4 text-emerald-500" />;
      case "open_text": return <FileText className="h-4 w-4 text-violet-500" />;
    }
  };

  const isValid = errorMsg === null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 15 }}
      className="h-full flex flex-col"
    >
      <Card className="border-zinc-200/80 bg-white shadow-sm flex flex-col h-full overflow-hidden">
        {/* Editor Controls & Tab Selector */}
        <CardHeader className="pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Configure Survey Questions
            </CardTitle>
            <CardDescription className="text-xs">
              Customize the fields and questions for synthetic generation
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Tab Switches */}
            <div className="bg-zinc-100 p-0.5 rounded-lg flex items-center border border-zinc-200/40">
              <button
                onClick={() => setActiveTab("visual")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "visual"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Visual Builder
              </button>
              <button
                onClick={() => setActiveTab("json")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "json"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                JSON Schema
              </button>
            </div>

            <Button
              id="editor-reset-btn"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2.5 border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardHeader>

        {/* Editor View Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[550px]" style={{ minHeight: "380px" }}>
          <AnimatePresence mode="wait">
            {activeTab === "visual" ? (
              <motion.div
                key="visual"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Visual Editor View */}
                {!isValid || !surveyState ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-6 flex flex-col items-center justify-center text-center gap-2">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                    <h4 className="text-sm font-semibold text-rose-900">Visual Builder Suspended</h4>
                    <p className="text-xs text-rose-700 max-w-sm leading-relaxed">
                      Please resolve the schema syntax error in the **JSON Schema** tab first before using the Visual Builder.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Survey Title */}
                    <div className="space-y-1.5 pb-3 border-b border-zinc-100">
                      <label htmlFor="survey-title-input" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Survey Title
                      </label>
                      <Input
                        id="survey-title-input"
                        value={surveyState.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="bg-zinc-50/50 border-zinc-200 font-semibold text-sm focus:bg-white"
                        placeholder="E.g. Customer Feedback Survey"
                      />
                    </div>

                    {/* Question Stack */}
                    <div className="space-y-3">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                        Questions List
                      </span>
                      
                      {surveyState.questions.map((q, qIndex) => (
                        <div 
                          key={q.id || qIndex}
                          className="group rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 transition-all duration-200 hover:border-zinc-300 hover:bg-white relative"
                        >
                          <div className="flex flex-col md:flex-row gap-4 items-start">
                            {/* Type indicator & ID */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="p-1.5 rounded-lg bg-zinc-100 border border-zinc-200/50 block">
                                {getQuestionIcon(q.type)}
                              </span>
                              <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100/80 px-2 py-0.5 rounded border border-zinc-200/20">
                                {q.id}
                              </span>
                            </div>

                            {/* Main Input Text */}
                            <div className="flex-1 w-full space-y-3">
                              <Input
                                value={q.text}
                                onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                                className="bg-white border-zinc-200 text-xs py-1"
                                placeholder="Enter question text..."
                              />

                              {/* Nested Options depending on Question Type */}
                              {q.type === "rating" && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-zinc-500">Rating Scale Max:</span>
                                  <Select 
                                    value={String(q.scale || 5)} 
                                    onValueChange={(val) => val && handleQuestionScaleChange(qIndex, parseInt(val))}
                                  >
                                    <SelectTrigger className="w-20 h-7 text-xs bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="5">5 Stars</SelectItem>
                                      <SelectItem value="10">10 Stars</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {q.type === "nps" && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-zinc-500">NPS Scale:</span>
                                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border border-indigo-150 text-[10px] py-0">
                                    0 - {q.scale || 10} Scale
                                  </Badge>
                                </div>
                              )}

                              {q.type === "single_choice" && (
                                <div className="space-y-2">
                                  <span className="text-[11px] font-semibold text-zinc-500 block">Choice Options:</span>
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {(q.options || []).map((opt, optIndex) => (
                                      <Badge 
                                        key={optIndex} 
                                        variant="secondary"
                                        className="text-[11px] py-0.5 px-2 bg-zinc-100 text-zinc-700 border border-zinc-200/60 rounded-md flex items-center gap-1.5"
                                      >
                                        {opt}
                                        {q.options && q.options.length > 1 && (
                                          <button 
                                            onClick={() => removeOption(qIndex, optIndex)}
                                            className="text-zinc-400 hover:text-zinc-700 font-bold ml-0.5 shrink-0"
                                            title="Delete Option"
                                          >
                                            &times;
                                          </button>
                                        )}
                                      </Badge>
                                    ))}
                                    
                                    {/* Inline Option Creator */}
                                    <input 
                                      type="text"
                                      placeholder="+ Add option"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          addOption(qIndex, e.currentTarget.value);
                                          e.currentTarget.value = "";
                                        }
                                      }}
                                      className="h-6 rounded border border-dashed border-zinc-300 px-2 text-[10px] text-zinc-500 bg-transparent focus:bg-white outline-none focus:border-indigo-400 w-24 transition-colors"
                                    />
                                  </div>
                                </div>
                              )}

                              {q.type === "open_text" && (
                                <span className="text-[10px] text-zinc-400 block italic">
                                  Natural feedback text generated via Cohere Command-R model.
                                </span>
                              )}
                            </div>

                            {/* Dropdown Type Select & Delete */}
                            <div className="flex items-center gap-2 shrink-0 md:self-start self-end">
                              <Select
                                value={q.type}
                                onValueChange={(val) => val && handleQuestionTypeChange(qIndex, val as QuestionType)}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rating">CSAT Rating</SelectItem>
                                  <SelectItem value="nps">NPS Scale</SelectItem>
                                  <SelectItem value="single_choice">Single Choice</SelectItem>
                                  <SelectItem value="open_text">Open Text</SelectItem>
                                </SelectContent>
                              </Select>

                              {surveyState.questions.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteQuestion(qIndex)}
                                  className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Question Button */}
                    <Button
                      onClick={addQuestion}
                      variant="outline"
                      className="w-full border-dashed border-zinc-300 bg-zinc-50/50 hover:bg-zinc-100 text-xs font-semibold text-zinc-600 h-10 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Survey Question
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="json"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col"
              >
                {/* Advanced Raw JSON View */}
                <div className="relative flex-1">
                  <Textarea
                    id="editor-textarea"
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    className={`w-full font-mono text-xs p-4 leading-relaxed bg-zinc-50 border transition-all duration-300 resize-none h-[420px] ${
                      isValid 
                        ? "border-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                        : "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    }`}
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Validation Status Footer */}
        <div className="border-t border-zinc-100 p-4 bg-zinc-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={isValid ? "valid" : `invalid-${errorMsg}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              id="editor-status-text"
              className={`flex items-center gap-2 rounded-xl p-3 text-xs border w-full ${
                isValid
                  ? "bg-emerald-50/80 text-emerald-800 border-emerald-100"
                  : "bg-rose-50/80 text-rose-800 border-rose-100"
              }`}
            >
              {isValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Survey questions are fully configured and ready for data generation.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
