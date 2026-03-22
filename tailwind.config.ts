import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        animind: {
          "primary": "#D4845C",
          "secondary": "#E8A87C",
          "accent": "#C9A961",
          "neutral": "#5C4033",
          "base-100": "#FFF8F0",
          "base-200": "#FFF0E0",
          "base-300": "#F5E1CC",
          "info": "#7EB8C9",
          "success": "#8DB580",
          "warning": "#E8C170",
          "error": "#D98080",
        },
      },
    ],
  },
} satisfies Config;
