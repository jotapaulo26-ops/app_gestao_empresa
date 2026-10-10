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
        dark: {
          950: "#000000",
          900: "#08080a",
          850: "#0f0f13",
          800: "#16161c",
          700: "#22222b",
        },
        neon: {
          green: "#00ff88",
          lime: "#22c55e",
          cyan: "#00f0ff",
          pink: "#ff2a85",
          purple: "#b026ff",
          amber: "#ff9900",
          yellow: "#ffd700",
        },
      },
      boxShadow: {
        'neon-green': '0 0 15px rgba(0, 255, 136, 0.3)',
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.3)',
        'neon-pink': '0 0 15px rgba(255, 42, 133, 0.3)',
        'neon-purple': '0 0 15px rgba(176, 38, 255, 0.3)',
        'neon-amber': '0 0 15px rgba(255, 153, 0, 0.3)',
        'neon-yellow': '0 0 15px rgba(255, 215, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
