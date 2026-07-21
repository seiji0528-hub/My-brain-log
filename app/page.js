"use client";

import { useEffect, useMemo, useState } from "react";
import { loadCards, saveCards, createCard, findRelatedCards } from "@/lib/storage";
import CardItem from "@/components/CardItem";
import RelatedCards from "@/components/RelatedCards";
import SearchBar from "@/components/SearchBar";
import CardForm from "@/components/CardForm";

export default function Home() {
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    setCards(loadCards());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCards(cards);
  }, [cards, loaded]);

  const allTags = useMemo(() => {
    const set = new Set();
    cards.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => (activeTag ? c.tags.includes(activeTag) : true))
      .filter((c) => {
        if (!q) return true;
        return (
          c.title.toLowerCase().includes(q) ||
          c.body.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [cards, query, activeTag]);

  const expandedCard = cards.find((c) => c.id === expandedId) || null;
  const related = expandedCard ? findRelatedCards(expandedCard, cards) : [];

  function handleSaveCard(data) {
    const card = createCard(data);
    setCards((prev) => [card, ...prev]);
    setFormOpen(false);
    setExpandedId(card.id);
  }

  function handleDelete(id) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4">
      <header className="pt-5 pb-1">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink">
          My Brain Log
        </h1>
        <p className="mt-0.5 text-xs text-ink-faint">
          1カード＝1つの思考。{cards.length}件の記録
        </p>
      </header>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        allTags={allTags}
        activeTag={activeTag}
        onTagToggle={(t) => setActiveTag((prev) => (prev === t ? null : t))}
      />

      <section className="flex flex-1 flex-col gap-3 py-4">
        {loaded && filteredCards.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-ink-faint">
              {cards.length === 0
                ? "まだ思考が記録されていません。"
                : "条件に一致する思考が見つかりません。"}
            </p>
            {cards.length === 0 && (
              <p className="text-xs text-ink-faint">
                右下の「＋」から最初の1枚を書いてみましょう
              </p>
            )}
          </div>
        )}

        {filteredCards.map((card) => (
          <div key={card.id}>
            <CardItem
              card={card}
              expanded={expandedId === card.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === card.id ? null : card.id))
              }
              onDelete={() => handleDelete(card.id)}
              onTagClick={(t) => setActiveTag((prev) => (prev === t ? null : t))}
            />
            {expandedId === card.id && (
              <RelatedCards related={related} onSelect={(id) => setExpandedId(id)} />
            )}
          </div>
        ))}
      </section>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="tap-target fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-paper shadow-lg active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label="新しい思考を記録"
      >
        ＋
      </button>

      {formOpen && (
        <CardForm onClose={() => setFormOpen(false)} onSave={handleSaveCard} />
      )}
    </main>
  );
}
