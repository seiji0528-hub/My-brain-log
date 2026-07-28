"use client";

export default function ReminderBadge({ count, visible, onClick }) {
  const revealed = visible && count > 0;

  if (revealed) {
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

  // 通知時刻を過ぎるまでは、控えめなアイコンだけを常に出しておく。
  // これを押せば、時刻前でも中身の確認や通知時刻の変更がいつでもできる。
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target fixed left-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper/70 text-sm text-ink-faint shadow-sm backdrop-blur active:scale-95"
      aria-label="リマインダーを確認する"
    >
      🔔
    </button>
  );
}
