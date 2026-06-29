import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Глубокая тёмная палитра под тон «Лилы»
        ink: {
          950: "#08090f",
          900: "#0d0f1a",
          800: "#131626",
          700: "#1a1d30",
          600: "#222640",
        },
        gold: {
          400: "#d4a853",
          300: "#e0bc78",
          200: "#ecd09f",
        },
        sage: {
          600: "#4a7c6f",
          500: "#5d9e8e",
          400: "#73b8a6",
        },
        rust: {
          600: "#8b3a3a",
          500: "#b04a4a",
          400: "#c96060",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
        sans: ["system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "dice-roll": "diceRoll 0.5s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        diceRoll: {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "30%": { transform: "rotate(-15deg) scale(0.9)" },
          "70%": { transform: "rotate(10deg) scale(1.1)" },
          "100%": { transform: "rotate(0deg) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
