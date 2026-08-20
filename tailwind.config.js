/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media", // iPhone/OSの設定(prefers-color-scheme)に自動追従する
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS変数(RGBチャンネル)を参照する形にすることで、
        // globals.css側でライト/ダークの値を切り替えるだけで
        // 全コンポーネントの見た目が自動的に切り替わるようにしている。
        // 例: bg-ink/40 のような透明度指定もそのまま使える。
        paper: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          dim: "rgb(var(--color-paper-dim) / <alpha-value>)",
          card: "rgb(var(--color-paper-card) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft) / <alpha-value>)",
          pale: "rgb(var(--color-accent-pale) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--color-gold) / <alpha-value>)",
          pale: "rgb(var(--color-gold-pale) / <alpha-value>)",
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
