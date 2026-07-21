"use client";

import { colorForTag } from "@/lib/tagColor";
import TagChip from "./TagChip";

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function CardItem({ card, expanded, onToggle, onDelete, onTagClick }) {
  const spineColor = card.tags.length ? colorForTag(card.tags[0]).bar : "bg-line";

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-paper-card shadow-card animate-fade-in">
      <div className={`absolute left-0 top-0 h-full w-1.5 ${spineColor}`} />

      {/* タイトル・本文部分だけをタップ可能にする（タグのbuttonをネストしない） */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle();
        }}
        className="w-full cursor-pointer px-4 py-3.5 pl-5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[15px] font-bold leading-snug text-ink">
            {card.title || "（無題の思考）"}
          </h3>
          <span className="shrink-0 pt-0.5 text-xs text-ink-faint">
            {formatDate(card.createdAt)}
          </span>
        </div>

        {!expanded ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {card.body}
          </p>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {card.body}
          </p>
        )}
      </div>

      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pl-5">
          {card.tags.map((t) => (
            <TagChip
              key={t}
              tag={t}
              size="sm"
              onClick={onTagClick ? () => onTagClick(t) : undefined}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div className="flex justify-end border-t border-line px-4 py-2">
          <button
            type="button"
            onClick={onDelete}
            className="tap-target rounded-md px-3 text-xs font-medium text-ink-faint active:bg-paper-dim"
          >
            このカードを削除
          </button>
        </div>
      )}
    </div>
  );
}
