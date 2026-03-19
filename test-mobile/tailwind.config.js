/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        figma: {
          surface: "#F8F9FF",
          text: "#1F2937",
          muted: "#9CA3AF",
          amber: "#FFB830",
          orange: "#FF8C42",
          red: "#FF6B6B",
          blue: "#60C3F5",
          green: "#4CAF50",
          purple: "#A855F7",
          indigo: "#667EEA"
        }
      },
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        "4xl": "28px"
      }
    }
  },
  plugins: []
};
