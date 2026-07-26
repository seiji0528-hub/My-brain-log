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
  const padding =
    size === "sm"
      ? "px-2 py-0.5 text-xs"
      : size === "lg"
      ? "px-3.5 py-1.5 text-sm"
      : "px-2.5 py-1 text-sm";

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

  // 固定タグは、通常タグと見分けがつくよう常に金色系のスタイルにする。
  // 現在絞り込み中(active)の場合はさらに濃い色+リングで強調する。
  const colorClasses = pinned
    ? active
      ? "bg-accent text-paper ring-2 ring-accent/50 shadow-lg shadow-accent/30"
      : "bg-accent/85 text-paper shadow-md shadow-accent/20 hover:bg-accent"
    : active
    ? "bg-ink text-paper"
    : "bg-paper-dark/60 text-ink hover:bg-paper-dark";

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
        "inline-flex shrink-0 items-center gap-1 rounded-full whitespace-nowrap transition-colors",
        pinned ? "font-bold" : "font-medium",
        padding,
        colorClasses,
        onClick || onLongPress ? "cursor-pointer active:scale-95" : "cursor-default",
      ].join(" ")}
    >
      {pinned && <span className="text-[0.9em] leading-none">📌</span>}
      #{tag}
    </button>
  );
}
