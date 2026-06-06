"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  currentStep: number; // 0: Persona, 1: Statistical, 2: Cohere, 3: Completed
}

const STEPS = [
  { id: 0, label: "Assigning responder personas & archetypes..." },
  { id: 1, label: "Simulating statistical answers & rating correlation..." },
  { id: 2, label: "Batch-synthesizing open-text comments via AI..." },
  { id: 3, label: "Finalizing response dataset & computing metrics..." },
];

export default function LoadingOverlay({ isVisible, currentStep }: LoadingOverlayProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
          id="loading-overlay"
        >
          <div className="w-full max-w-md p-8 text-center">
            {/* Spinning Indicator */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
            >
              <Loader2 className="h-8 w-8 animate-spin" />
            </motion.div>

            <h3 className="mb-8 text-xl font-semibold text-zinc-900">
              Generating Synthetic Responses{dots}
            </h3>

            {/* Steps List */}
            <div className="space-y-4 text-left">
              {STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                const isPending = currentStep < step.id;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 rounded-lg border p-3.5 transition-colors duration-300 ${
                      isActive
                        ? "border-indigo-200 bg-indigo-50/50 text-indigo-950 font-medium"
                        : isCompleted
                        ? "border-emerald-100 bg-emerald-50/20 text-zinc-500"
                        : "border-zinc-100 bg-zinc-50/50 text-zinc-400"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isActive
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : isActive ? (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                        </span>
                      ) : (
                        <span className="text-xs">{step.id + 1}</span>
                      )}
                    </div>

                    <span className="text-sm">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
