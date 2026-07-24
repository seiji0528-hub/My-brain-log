"use client";

export default function TagChip({ tag, active = false, onClick, size = "md" }) {
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        // tap-target を削除して、指定した余白（px-2）通りのコンパクトなサイズにします
        "inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap transition-colors",
        padding,
        active
          ? "bg-ink text-paper"
          : "bg-paper-dark/60 text-ink hover:bg-paper-dark",
        onClick ? "cursor-pointer active:scale-95" : "cursor-default",
      ].join(" ")}
    >
      #{tag}
    </button>
  );
}
