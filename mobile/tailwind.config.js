/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        figma: {
          surface: "#F7F9FB",
          text: "#191C1E",
          muted: "#64748B",
          amber: "#B45309",
          orange: "#C2410C",
          red: "#BA1A1A",
          blue: "#1E40AF",
          green: "#166534",
          purple: "#434B60",
          indigo: "#00288E"
        },
        academic: {
          background: "#F7F9FB",
          card: "#FFFFFF",
          border: "#E2E8F0",
          primary: "#00288E",
          primaryContainer: "#1E40AF",
          text: "#191C1E",
          muted: "#444653"
        }
      },
      boxShadow: {
        card: "0 4px 12px rgba(15, 23, 42, 0.05)"
      },
      borderRadius: {
        "4xl": "28px"
      }
    }
  },
  plugins: []
};
