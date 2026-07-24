export default function TagChip({ tag, active = false, onClick, size = "md" }) {
  // px-1.5 や px-2 にすることで、余計な左右の幅を削ぎ落とします
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap transition-colors",
        onClick ? "tap-target cursor-pointer" : "cursor-default",
        padding,
        active
          ? "bg-ink text-paper"
          : "bg-paper-dark/60 text-ink hover:bg-paper-dark",
        onClick ? "active:scale-95" : "",
      ].join(" ")}
    >
      #{tag}
    </button>
  );
}
