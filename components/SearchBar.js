"use client";

import TagChip from "./TagChip";

export default function SearchBar({ query, onQueryChange, allTags, activeTag, onTagToggle }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-paper/95 px-4 pb-3 pt-3 backdrop-blur">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          🔍
        </span>
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="キーワードで検索（タイトル・本文・タグ）"
          className="tap-target w-full rounded-full border border-line bg-paper-card py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {allTags.length > 0 && (
        /* gap-2 と no-scrollbar、py-1 を追加してキレイに並べます */
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {allTags.map((t) => (
            <TagChip
              key={t}
              tag={t}
              size="sm"
              active={activeTag === t}
              onClick={() => onTagToggle(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
