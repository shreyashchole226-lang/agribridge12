/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        agri: {
          green: "#1a6b3a",
          lime: "#4ade80",
          earth: "#92400e",
          gold: "#d97706",
          cream: "#fefce8",
          dark: "#0f2e1a",
        }
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
      }
    }
  },
  plugins: []
}
