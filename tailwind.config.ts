// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // If you were using 'pages' (we leave it just in case)
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Includes your components
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Includes your 'app' directory
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
     require('@tailwindcss/line-clamp'), // Useful for truncating text (optional but good)
  ],
};
export default config;