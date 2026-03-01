import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", ...fontFamily.sans],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
      colors: {
        ah: {
          bg: "#0c0a09",
          surface: "#141110",
          raised: "#1d1a16",
          border: "#252118",
          "border-gold": "#5a4822",
          gold: "#c9a84c",
          "gold-bright": "#e8c76a",
          "gold-dim": "#3d3015",
          text: "#f0ebe0",
          "text-2": "#a09385",
          "text-3": "#7a6a5e",
          green: "#4aba6e",
          amber: "#d4874a",
          red: "#cc4e4e",
        },
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gold-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        "gold-pulse": "gold-pulse 2.2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
