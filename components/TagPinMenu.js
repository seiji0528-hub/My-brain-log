"use client";

export default function TagPinMenu({ tag, isPinned, canPinMore, onPin, onUnpin, onClose }) {
  if (!tag) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="safe-bottom w-full max-w-sm rounded-2xl bg-paper p-4 shadow-xl animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-sm font-medium text-ink">#{tag}</p>

        {isPinned ? (
          <button
            type="button"
            onClick={onUnpin}
            className="tap-target w-full rounded-full border border-line px-4 text-sm font-medium text-ink-soft"
          >
            📌 固定を解除する
          </button>
        ) : canPinMore ? (
          <button
            type="button"
            onClick={onPin}
            className="tap-target w-full rounded-full bg-accent px-4 text-sm font-bold text-paper"
          >
            📌 固定する
          </button>
        ) : (
          <p className="px-2 text-center text-xs text-ink-faint">
            固定できるタグは最大3個までです。他のタグの固定を解除してから試してください。
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="tap-target mt-2 w-full rounded-full px-4 text-sm font-medium text-ink-faint"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
