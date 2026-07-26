"use client";

import TagChip from "./TagChip";

export default function PinnedTagsBar({ pinnedTags, activeTag, onTagToggle, onTagLongPress }) {
  if (!pinnedTags || pinnedTags.length === 0) return null;

  return (
    <div className="fixed right-3 top-4 z-20 flex flex-col items-end gap-2">
      {pinnedTags.map((t, i) => (
        <div
          key={t}
          className="pinned-wobble drop-shadow-md"
          style={{ animationDelay: `${i * 0.4}s` }}
        >
          <TagChip
            tag={t}
            size="md"
            pinned
            active={activeTag === t}
            onClick={() => onTagToggle(t)}
            onLongPress={() => onTagLongPress(t)}
          />
        </div>
      ))}

      <style jsx>{`
        .pinned-wobble {
          display: inline-flex;
          animation: pinnedWobble 4.5s ease-in-out infinite;
        }
        @keyframes pinnedWobble {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-2.5deg);
          }
        }
      `}</style>
    </div>
  );
}
