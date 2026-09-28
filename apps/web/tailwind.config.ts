import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0A1814", 900: "#10241D", 700: "#315047", 500: "#60766E" },
        forest: { 950: "#07140F", 900: "#0D2B22", 800: "#123A2E", 700: "#18513F" },
        lime: { 50: "#F8FFE7", 200: "#EBFFAA", 300: "#DCFF72", 400: "#CBF34E", 500: "#B6DF35" },
        mango: { 100: "#FFF0D7", 400: "#FFB85C", 500: "#F59B2A" },
        surface: { DEFAULT: "#F4F6F0", raised: "#FBFCF8", muted: "#E9EEE7" },
        line: "#D9E1D8",
        danger: { 50: "#FFF0ED", 600: "#BE3D2F" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        meter: ["var(--font-meter)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(13, 43, 34, 0.09)",
        card: "0 10px 30px rgba(13, 43, 34, 0.08)",
        lift: "0 16px 38px rgba(7, 20, 15, 0.18)",
      },
      borderRadius: { xl: "1rem", "2xl": "1.5rem", "3xl": "2rem" },
    },
  },
  plugins: [],
};

export default config;
