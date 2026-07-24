"use client";

import { useState, useEffect } from "react";
import { formatRawText } from "@/lib/aiClient";
import { normalizeTags } from "@/lib/storage";

export default function CardForm({ onClose, onSave, initialData = null, allTags = [] }) {
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsText, setTagsText] = useState("");
  
  // AIおすすめ機能用ステート
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [step, setStep] = useState(initialData ? "review" : "raw");

  // 再利用（コピー）用データが渡された場合にフォームへセット
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setTagsText((initialData.tags || []).join(" "));
    }
  }, [initialData]);

  // AIで全体を整える処理
  async function handleFormat() {
    if (!rawText.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const result = await formatRawText(rawText, allTags);
      setTitle(result.title);
      setBody(result.body);
      setTagsText(result.tags.join(" "));
      setSuggestedTitle(result.title);
      setSuggestedTags(result.tags);
      setStep("review");
    } catch (e) {
      setAiError(e.message || "AI整形に失敗しました。手動で入力してください。");
      setBody(rawText);
      setStep("review");
    } finally {
      setAiLoading(false);
    }
  }

  // AIを使わずに直接編集画面へ進む処理
  function handleSkipAi() {
    setBody(rawText);
    setStep("review");
    // バックグラウンドで提案タイトル＆タグを生成
    fetchSuggestions(rawText);
  }

  // 本文をもとにAIおすすめ提案だけを取得する
  async function fetchSuggestions(textToAnalyze) {
    if (!textToAnalyze || !textToAnalyze.trim()) return;
    setSuggestLoading(true);
    try {
      const result = await formatRawText(textToAnalyze, allTags);
      setSuggestedTitle(result.title);
      setSuggestedTags(result.tags || []);
    } catch (e) {
      console.error("AI提案の取得に失敗しました:", e);
    } finally {
      setSuggestLoading(false);
    }
  }

  // 提案タグのトグル（追加/削除）
  function toggleSuggestedTag(tag) {
    const currentTags = normalizeTags(tagsText);
    if (currentTags.includes(tag)) {
      setTagsText(currentTags.filter((t) => t !== tag).join(" "));
    } else {
      setTagsText([...currentTags, tag].join(" "));
    }
  }

  function handleSave() {
    if (!title.trim() && !body.trim()) return;
    onSave({
      title: title.trim() || suggestedTitle || "（無題の思考）",
      body: body.trim(),
      tags: normalizeTags(tagsText),
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 animate-fade-in">
      <div className="safe-bottom flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl bg-paper shadow-xl animate-sheet-up">
        {/* ヘッダー */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-bold">
            {initialData ? "思考を再利用・編集" : "新しい思考を記録"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="tap-target rounded-full px-2 text-xl leading-none text-ink-faint active:bg-paper-dim"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* 入力エリア */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === "raw" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-ink-faint">
                思いついたことをそのまま書く（音声入力OK）
              </label>
              <textarea
                autoFocus
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={5}
                placeholder="例）頭に浮かんだメモやアイデアを自由に入力してください…"
                className="w-full resize-none rounded-card border border-line bg-paper-card p-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {aiError && <p className="text-xs text-[#93445A]">{aiError}</p>}
            </div>
          )}

          {step === "review" && (
            <div className="flex flex-col gap-4">
              {/* タイトル入力欄 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-ink-faint">
                    タイトル
                  </label>
                  {!suggestedTitle && !suggestLoading && body.trim() && (
                    <button
                      type="button"
                      onClick={() => fetchSuggestions(body)}
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      ✦ AIにタイトル案を聞く
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={suggestedTitle ? `例: ${suggestedTitle}` : "タイトルを入力..."}
                  className="tap-target w-full rounded-card border border-line bg-paper-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                />

                {/* AIおすすめタイトルのサジェスト表示 */}
                {suggestLoading && (
                  <p className="mt-1.5 text-xs text-ink-faint animate-pulse">
                    ✦ AIがおすすめのタイトル・タグを考えています…
                  </p>
                )}
                {!title && suggestedTitle && !suggestLoading && (
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-paper-card border border-line p-2 text-xs">
                    <span className="text-accent font-bold shrink-0">💡 AI提案:</span>
                    <span className="truncate text-ink font-medium">{suggestedTitle}</span>
                    <button
                      type="button"
                      onClick={() => setTitle(suggestedTitle)}
                      className="ml-auto shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-bold text-paper active:scale-95 transition-transform"
                    >
                      採用する
                    </button>
                  </div>
                )}
              </div>

              {/* 本文入力欄 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-faint">
                  本文
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={() => {
                    // 本文からフォーカスが外れたタイミングで未生成なら提案取得
                    if (!suggestedTitle && body.trim()) {
                      fetchSuggestions(body);
                    }
                  }}
                  rows={4}
                  className="w-full resize-none rounded-card border border-line bg-paper-card p-3 text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {/* タグ入力欄 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-faint">
                  タグ（スペース区切り）
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="自分の性質 意思決定"
                  className="tap-target w-full rounded-card border border-line bg-paper-card px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
                />

                {/* おすすめタグの候補一覧 */}
                {suggestedTags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] text-ink-faint mb-1">💡 おすすめのタグ（タップで追加/解除）:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTags.map((t) => {
                        const isSelected = normalizeTags(tagsText).includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleSuggestedTag(t)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                              isSelected
                                ? "bg-ink text-paper border-ink"
                                : "bg-paper-card text-ink border-line hover:border-accent"
                            }`}
                          >
                            #{t} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フッターボタン部分 */}
        <div className="flex shrink-0 gap-2 border-t border-line px-4 py-3">
          {step === "raw" && (
            <>
              <button
                type="button"
                onClick={handleSkipAi}
                disabled={!rawText.trim()}
                className="tap-target flex-1 rounded-full border border-line px-4 text-sm font-medium text-ink-soft disabled:opacity-40"
              >
                そのまま編集
              </button>
              <button
                type="button"
                onClick={handleFormat}
                disabled={!rawText.trim() || aiLoading}
                className="tap-target flex-[1.4] rounded-full bg-accent px-4 text-sm font-bold text-paper disabled:opacity-50"
              >
                {aiLoading ? "整えています…" : "✦ AIで整える"}
              </button>
            </>
          )}

          {step === "review" && (
            <>
              {!initialData && (
                <button
                  type="button"
                  onClick={() => setStep("raw")}
                  className="tap-target flex-1 rounded-full border border-line px-4 text-sm font-medium text-ink-soft"
                >
                  戻る
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="tap-target flex-[1.4] rounded-full bg-accent px-4 text-sm font-bold text-paper"
              >
                カードを保存
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
