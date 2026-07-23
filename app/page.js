"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  loadCards, 
  saveCards, 
  createCard, 
  findRelatedCards, 
  deleteCard
} from "@/lib/storage";
import CardItem from "@/components/CardItem";
import RelatedCards from "@/components/RelatedCards";
import SearchBar from "@/components/SearchBar";
import CardForm from "@/components/CardForm";

// 1桁のパスワード（ここを好きな数字に変えてもOK）
const PASSCODE = "0";

export default function Home() {
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  // パスコード認証関連のステート
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

  // 初回起動時のチェック：すでに認証済みか確認 ＆ Supabaseからデータを取得
  useEffect(() => {
    const authStatus = localStorage.getItem("app_authenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }

    async function fetchCards() {
      const data = await loadCards();
      setCards(data);
      setLoaded(true);
    }
    fetchCards();
  }, []);

  // パスコード送信処理
  function handlePassSubmit(e) {
    e.preventDefault();
    if (passInput === PASSCODE) {
      localStorage.setItem("app_authenticated", "true");
      setIsAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  }

  const allTags = useMemo(() => {
    const set = new Set();
    cards.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [cards]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => (activeTag ? (c.tags || []).includes(activeTag) : true))
      .filter((c) => {
        if (!q) return true;
        return (
          c.title.toLowerCase().includes(q) ||
          c.body.toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [cards, query, activeTag]);

  const expandedCard = cards.find((c) => c.id === expandedId) || null;
  const related = expandedCard ? findRelatedCards(expandedCard, cards) : [];

  // 保存処理
  async function handleSaveCard(data) {
    const newCardData = createCard(data);
    await saveCards(newCardData);

    const updatedCards = await loadCards();
    setCards(updatedCards);

    setFormOpen(false);
    setInitialFormData(null);
    setExpandedId(newCardData.id);
  }

  // 削除処理（確認ダイアログを追加）
  async function handleDelete(id) {
    const confirmed = window.confirm("この思考カードを削除してもよろしいですか？");
    if (!confirmed) return; // 「キャンセル」を押したらここでストップ

    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (error) {
      console.error("削除処理に失敗しました:", error);
      alert("削除に失敗しました。もう一度お試しください。");
    }
  }

  // 再利用（コピー）ボタンが押された時の処理
  function handleCopyCard(card) {
    setInitialFormData(card);
    setFormOpen(true);
  }

  // フォームを閉じる処理
  function handleCloseForm() {
    setFormOpen(false);
    setInitialFormData(null);
  }

  // --- 未認証時のロック画面 ---
  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-line bg-paper-card p-6 shadow-xl text-center">
          <h1 className="font-display text-xl font-bold text-ink">My Brain Log</h1>
          <p className="mt-2 text-xs text-ink-faint">
            1桁のパスワードを入力してください
          </p>

          <form onSubmit={handlePassSubmit} className="mt-6 flex flex-col items-center gap-3">
            <input
              type="password"
              maxLength={1}
              inputMode="numeric"
              value={passInput}
              onChange={(e) => {
                setPassInput(e.target.value);
                setPassError(false);
              }}
              placeholder="0"
              autoFocus
              className="h-12 w-16 text-center text-xl font-bold rounded-card border border-line bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />

            {passError && (
              <p className="text-xs text-[#93445A]">パスワードが違います</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-accent py-2.5 text-sm font-bold text-paper active:scale-95 transition-transform"
            >
              ロック解除
            </button>
          </form>
        </div>
      </main>
    );
  }

  // --- 認証済みのメイン画面 ---
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
        {!loaded && (
          <div className="mt-10 text-center text-xs text-ink-faint">
            データを読み込み中...
          </div>
        )}

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
              onCopy={handleCopyCard}
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
        onClick={() => {
          setInitialFormData(null);
          setFormOpen(true);
        }}
        className="tap-target fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-paper shadow-lg active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label="新しい思考を記録"
      >
        ＋
      </button>

      {formOpen && (
        <CardForm
          onClose={handleCloseForm}
          onSave={handleSaveCard}
          initialData={initialFormData}
        />
      )}
    </main>
  );
}
