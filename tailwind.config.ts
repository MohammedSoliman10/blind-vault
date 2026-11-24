import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Hermes-style: everything is square. Only status dots use `rounded-full`.
    borderRadius: {
      none: "0px",
      DEFAULT: "0px",
      full: "9999px",
    },
    // Brand guide tokens + the authorized semantic alert red. Nothing else.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      background: "var(--color-background)",
      text: "var(--color-text)",
      accent: "var(--color-accent)",
      alert: "var(--color-alert)",
      blue: "#2531FF",
      white: "#FFFFFF",
      onahau: "#BFF0FF",
      red: "#C8102E",
      // Hairlines and secondary text, all derived from White on Blue.
      line: "var(--line)",
      "line-soft": "var(--line-soft)",
      "line-strong": "var(--line-strong)",
      "text-2": "var(--text-2)",
      wash: "var(--wash)",
    },
    fontFamily: {
      heading: ["var(--font-heading)", '"Bluu Next"', "serif"],
      body: ["var(--font-body)", "Excon", "sans-serif"],
      sans: ["var(--font-body)", "Excon", "sans-serif"],
      serif: ["var(--font-heading)", '"Bluu Next"', "serif"],
      mono: ["var(--font-mono)", '"IBM Plex Mono"', "ui-monospace", "monospace"],
    },
    extend: {
      maxWidth: { page: "1360px" },
      boxShadow: {
        lift: "var(--shadow-lift)",
        press: "var(--shadow-press)",
      },
    },
  },
  plugins: [],
};

export default config;
