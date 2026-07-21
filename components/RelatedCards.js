"use client";

import TagChip from "./TagChip";

export default function RelatedCards({ related, onSelect }) {
  if (!related.length) return null;

  return (
    <div className="mt-2 mb-4 rounded-card border border-dashed border-line bg-paper-dim/60 px-4 py-3 animate-fade-in">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        <span aria-hidden>⋯⋯</span>
        <span>関連する思考</span>
      </div>
      <ul className="flex flex-col gap-2">
        {related.map(({ card, sharedTags }) => (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onSelect(card.id)}
              className="tap-target flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left active:bg-paper-card"
            >
              <span className="text-sm font-medium text-ink">{card.title}</span>
              {sharedTags.length > 0 && (
                <span className="mt-1 flex flex-wrap gap-1">
                  {sharedTags.map((t) => (
                    <TagChip key={t} tag={t} size="sm" />
                  ))}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
