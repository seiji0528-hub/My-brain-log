"use client";

export default function ReminderBadge({ count, visible, onClick }) {
  if (!visible || count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target fixed left-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-line bg-paper/95 px-3 py-1.5 text-xs font-bold text-ink shadow-md backdrop-blur active:scale-95"
      aria-label={`${count}枚、届いています`}
    >
      <span className="flex h-2 w-2 rounded-full bg-accent" />
      {count}枚、届いています
    </button>
  );
}
