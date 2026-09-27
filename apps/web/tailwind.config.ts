import type { Config } from "tailwindcss";

// Design tokens for the "CNG meter & permit sticker" direction (see
// .impeccable/surfaces/app-page-tsx.md for the full contract). Committed
// color strategy: green carries 30-60% of the surface at page scale, not
// as a scattered accent. Pages must reference these tokens, never raw hex.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // CNG body green — the committed color.
        green: {
          50: "#E7F5EC",
          500: "#0F8A3C", // large-scale fields, oversized display text only
          600: "#0B6B2E", // interactive surfaces carrying small/white text
        },
        // dash-plastic charcoal — structural ink.
        ink: {
          900: "#14181A",
          600: "#4A5551",
        },
        // laminated sticker-card surfaces — cool white, never warm cream.
        surface: {
          DEFAULT: "#FFFFFF",
          card: "#F4F6F5",
        },
        // seven-segment meter-digit accent — decorative/numeral use only,
        // never as a text color on light backgrounds (fails contrast).
        amber: {
          500: "#FFB100",
        },
        border: {
          DEFAULT: "#DCE3E0",
        },
        danger: {
          50: "#FDECEA",
          600: "#B3261E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        meter: ["var(--font-meter)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
