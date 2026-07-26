"use client";

import { useEffect, useState } from "react";
import TagChip from "./TagChip";

const ATTRACT_DURATION_MS = 4000; // この時間だけ揺れて、その後は静止する

export default function PinnedTagsBar({ pinnedTags, activeTag, onTagToggle, onTagLongPress }) {
  const [attracting, setAttracting] = useState(true);

  // アプリを開いてから数秒だけ揺らして目を引き、その後は静止させる
  // (常時アニメーションさせても負荷はごく小さいが、作業中に気が散らないようにする狙い)
  useEffect(() => {
    const timer = setTimeout(() => setAttracting(false), ATTRACT_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!pinnedTags || pinnedTags.length === 0) return null;

  return (
    <div className="fixed right-8 top-4 z-20 flex flex-col items-end gap-2.5">
      {pinnedTags.map((t, i) => (
        <div
          key={t}
          className={attracting ? "pinned-wobble" : ""}
          style={attracting ? { animationDelay: `${i * 0.35}s` } : undefined}
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
