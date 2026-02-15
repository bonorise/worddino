import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-sc)", "ui-sans-serif", "sans-serif"],
        serif: ["var(--font-bree-serif)", "ui-serif", "serif"],
      },
      boxShadow: {
        fossil: "0 8px 30px rgba(34, 78, 65, 0.18)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(57,73,81,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
