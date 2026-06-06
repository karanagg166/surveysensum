import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SurveySensum AI — Synthetic Survey Response Generator",
  description: "Generate N realistic, coherent synthetic responses for any survey definition using statistical and LLM methods.",
  keywords: ["survey", "synthetic responses", "data generation", "customer satisfaction", "NPS", "FastAPI", "Next.js"],
  openGraph: {
    title: "SurveySensum AI — Synthetic Survey Response Generator",
    description: "Accept any survey definition and generate realistic responses using hybrid statistical + LLM models.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-950 font-sans">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
