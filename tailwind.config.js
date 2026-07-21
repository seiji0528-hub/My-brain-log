/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F6F3EC",
          dim: "#EDE9DE",
          card: "#FCFAF5",
        },
        ink: {
          DEFAULT: "#22252B",
          soft: "#4A4E58",
          faint: "#8A8D96",
        },
        line: "#DCD6C7",
        accent: {
          DEFAULT: "#2B4568",
          soft: "#3F5C82",
          pale: "#DCE4EE",
        },
        gold: {
          DEFAULT: "#B4823F",
          pale: "#F1E4CC",
        },
      },
      fontFamily: {
        display: ["'Zen Old Mincho'", "'Noto Serif JP'", "serif"],
        body: ["'Noto Sans JP'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(34,37,43,0.06), 0 1px 1px rgba(34,37,43,0.04)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
