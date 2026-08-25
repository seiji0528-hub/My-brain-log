"use client";

export default function ReminderBadge({ count, visible, onClick }) {
  const hasItems = visible && count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target fixed bottom-6 left-6 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper/80 text-base text-ink-faint shadow-sm backdrop-blur active:scale-95"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      aria-label={hasItems ? `${count}枚、届いています` : "リマインダーを確認する"}
    >
      🔔
      {hasItems && (
        <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-accent" />
      )}
    </button>
  );
}
