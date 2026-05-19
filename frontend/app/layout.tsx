import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InterviewMind AI — Adaptive Interview Coaching",
  description:
    "AI-powered technical interview preparation that remembers your weaknesses, adapts to your learning curve, and routes models intelligently for optimal performance.",
  keywords: ["technical interview", "AI coaching", "adaptive learning", "interview preparation"],
  openGraph: {
    title: "InterviewMind AI",
    description: "Persistent memory. Intelligent routing. Better interviews.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0f0f17] text-slate-100 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
