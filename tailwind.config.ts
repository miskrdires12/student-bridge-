import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background, #f7faf9)",
        surface: {
          DEFAULT: "var(--surface, #ffffff)",
          secondary: "var(--surface-secondary, #eef5f1)",
          tertiary: "var(--surface-tertiary, #e2ede6)",
          card: "var(--surface, #ffffff)",
        },
        border: {
          DEFAULT: "var(--border, #dce7e1)",
          subtle: "var(--border, #e9f1ed)",
          strong: "var(--foreground, #080808)",
        },
        accent: {
          DEFAULT: "#8fe617",
          hover: "#7ecc10",
          lemon: "#9ee817",
          dark: "#080808",
          glow: "rgba(143, 230, 23, 0.35)",
          dim: "rgba(143, 230, 23, 0.14)",
        },
        foreground: {
          DEFAULT: "var(--foreground, #080808)",
          muted: "var(--foreground-muted, #3f4743)",
          subtle: "var(--foreground-subtle, #6b7771)",
        },
        status: {
          active: "#8fe617",
          inactive: "#8a9690",
          archived: "#4b5563",
          suspended: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -3px rgba(143, 230, 23, 0.35)",
        "glow-sm": "0 0 10px -2px rgba(143, 230, 23, 0.25)",
        card: "0 2px 12px -2px rgba(8, 8, 8, 0.05)",
        "card-hover": "0 8px 24px -4px rgba(8, 8, 8, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
