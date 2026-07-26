"use client";

import TagChip from "./TagChip";

export default function PinnedTagsBar({ pinnedTags, activeTag, onTagToggle, onTagLongPress }) {
  if (!pinnedTags || pinnedTags.length === 0) return null;

  return (
    <div className="fixed right-8 top-4 z-20 flex flex-col items-end gap-2.5">
      {pinnedTags.map((t, i) => (
        <div
          key={t}
          className="pinned-wobble"
          style={{ animationDelay: `${i * 0.35}s` }}
        >
          <TagChip
            tag={t}
            size="lg"
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
          animation: pinnedWobble 3s ease-in-out infinite;
        }
        @keyframes pinnedWobble {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-3px) rotate(-5deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-3px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
}
