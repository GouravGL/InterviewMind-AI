import type { Config } from "tailwindcss";

const config: any = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Dynamic selection states
    "border-indigo-500/50", "bg-indigo-500/15", "text-indigo-300",
    "border-emerald-500/50", "bg-emerald-500/15", "text-emerald-300",
    "border-amber-500/50", "bg-amber-500/15", "text-amber-400",
    "border-rose-500/50", "bg-rose-500/15", "text-rose-400",
    "border-violet-500/50", "bg-violet-500/15", "text-violet-300",
    "border-cyan-500/50", "bg-cyan-500/15", "text-cyan-300",
    "border-white/5", "border-white/8", "border-white/10",
    "text-slate-400", "text-slate-300", "text-slate-500",
    "bg-white/5", "bg-black/20", "bg-black/30",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#08080f",
          surface: "#0e0e1a",
          card: "#131320",
          elevated: "#1a1a2e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-dot": "bounceDot 1.2s infinite",
        shimmer: "shimmer 1.8s infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInRight: { "0%": { opacity: "0", transform: "translateX(12px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        bounceDot: { "0%,60%,100%": { transform: "translateY(0)", opacity: "0.3" }, "30%": { transform: "translateY(-6px)", opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        glow: { "0%": { boxShadow: "0 0 15px rgba(99,102,241,0.2)" }, "100%": { boxShadow: "0 0 35px rgba(99,102,241,0.5)" } },
      },
    },
  },
  plugins: [],
};
export default config;
