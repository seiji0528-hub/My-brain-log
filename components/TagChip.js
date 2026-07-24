"use client";

export default function TagChip({ tag, active = false, onClick, size = "md" }) {
  const padding = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        // shrink-0 で要素が縮んで重なるのを完全に防止
        "inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap transition-colors",
        onClick ? "tap-target cursor-pointer" : "cursor-default",
        padding,
        // ランダムカラーを廃止し、通常時は落ち着いた背景＋ダーク文字、選択(active)時は黒背景＋白文字に統一
        active
          ? "bg-ink text-paper"
          : "bg-paper-dark/50 text-ink hover:bg-paper-dark",
        onClick ? "active:scale-95" : "",
      ].join(" ")}
    >
      #{tag}
    </button>
  );
}
