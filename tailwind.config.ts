import type { Config } from "tailwindcss";

export default {
  content: [
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
          "primary": "#D04050",
          "secondary": "#F0D0D8",
          "accent": "#D8B050",
          "neutral": "#3A2030",
          "base-100": "#FFF8F8",
          "base-200": "#FFF0F0",
          "base-300": "#F5D8D8",
          "info": "#7EB8C9",
          "success": "#8DB580",
          "warning": "#E8C170",
          "error": "#D98080",
        },
      },
    ],
  },
} satisfies Config;
