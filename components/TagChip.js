"use client";

import { colorForTag } from "@/lib/tagColor";

export default function TagChip({ tag, active = false, onClick, size = "md" }) {
  const c = colorForTag(tag);
  const padding = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full font-medium whitespace-nowrap transition-colors",
        onClick ? "tap-target" : "",
        padding,
        active
          ? "bg-ink text-paper"
          : `${c.bg} ${c.text}`,
        onClick ? "active:scale-95" : "cursor-default",
      ].join(" ")}
    >
      #{tag}
    </button>
  );
}
