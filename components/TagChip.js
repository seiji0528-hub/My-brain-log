"use client";

import { useRef } from "react";

const LONG_PRESS_MS = 600;

export default function TagChip({
  tag,
  active = false,
  onClick,
  onLongPress,
  pinned = false,
  size = "md",
}) {
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  const timerRef = useRef(null);
  const firedRef = useRef(false);

  function startPress() {
    firedRef.current = false;
    if (!onLongPress) return;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      // 長押しが発火したことを軽く伝える(振動対応端末のみ)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(15);
      }
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleClick(e) {
    // 長押しメニューが開いた直後のクリックで、絞り込みが同時に走らないようにする
    if (firedRef.current) {
      firedRef.current = false;
      e.preventDefault();
      return;
    }
    onClick && onClick();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      className={[
        "inline-flex shrink-0 items-center gap-0.5 rounded-full font-medium whitespace-nowrap transition-colors",
        padding,
        active
          ? "bg-ink text-paper"
          : "bg-paper-dark/60 text-ink hover:bg-paper-dark",
        onClick || onLongPress ? "cursor-pointer active:scale-95" : "cursor-default",
      ].join(" ")}
    >
      {pinned && <span className="text-[0.85em] leading-none">📌</span>}
      #{tag}
    </button>
  );
}
