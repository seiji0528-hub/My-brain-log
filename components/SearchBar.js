{allTags.length > 0 && (
  // gap-0.5 にしてタグ同士の隙間をギュッと詰めます
  <div className="mt-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
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
