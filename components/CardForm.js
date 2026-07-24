"use client";

import { useState, useEffect } from "react";
import { formatRawText, suggestTitle, suggestTags } from "@/lib/aiClient";
import { normalizeTags } from "@/lib/storage";

export default function CardForm({ onClose, onSave, initialData = null, allTags = [] }) {
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  // 初期データがある場合は最初から review 画面にする
  const [step, setStep] = useState(initialData ? "review" : "raw");

  // タイトル案（候補として表示し、タップした時だけ反映）用のステート
  const [titleSuggestion, setTitleSuggestion] = useState("");
  const [titleSuggestLoading, setTitleSuggestLoading] = useState(false);
  const [titleSuggestError, setTitleSuggestError] = useState("");

  // 過去タグ候補用のステート
  const [tagSuggestLoading, setTagSuggestLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [tagSuggestChecked, setTagSuggestChecked] = useState(false);
  const [tagSuggestError, setTagSuggestError] = useState("");

  // 再利用（コピー）用データが渡された場合にフォームへセット
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setTagsText((initialData.tags || []).join(" "));
    }
  }, [initialData]);

  // 「✦ AIで整える」：本文の整形とタグの下書きだけ行う。タイトルは自動で入れない
  async function handleFormat() {
    if (!rawText.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const result = await formatRawText(rawText);
      setBody(result.body);
      setTagsText(result.tags.join(" "));
      setStep("review");
    } catch (e) {
      setAiError(e.message || "AI整形に失敗しました。手動で入力してください。");
      setBody(rawText);
      setStep("review");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSkipAi() {
    setBody(rawText);
    setStep("review");
  }

  // 「✦ AIにタイトル案を聞く」：タップするたびに、その時点の本文で毎回聞き直す。
  // 直接タイトル欄には入れず、候補として保持するだけ。
  async function handleSuggestTitle() {
    if (!body.trim()) return;
    setTitleSuggestLoading(true);
    setTitleSuggestError("");
    try {
      const t = await suggestTitle(body);
      setTitleSuggestion(t || "");
    } catch (e) {
      setTitleSuggestError(e.message || "タイトル案の取得に失敗しました");
    } finally {
      setTitleSuggestLoading(false);
    }
  }

  // 候補チップをタップした時だけ、実際にタイトル欄へ反映する
  function applyTitleSuggestion() {
    if (!titleSuggestion) return;
    setTitle(titleSuggestion);
    setTitleSuggestion("");
  }

  // 「✦ 近い過去タグを探す」：本文と過去タグ一覧から近いものだけ拾う
  async function handleSuggestTags() {
    if (!body.trim()) return;
    setTagSuggestLoading(true);
    setTagSuggestChecked(false);
    setTagSuggestError("");
    try {
      const tags = await suggestTags(body, allTags);
      setSuggestedTags(tags);
      setTagSuggestChecked(true);
    } catch (e) {
      console.error("タグ候補の取得に失敗しました:", e);
      setSuggestedTags([]);
      setTagSuggestError(e.message || "タグ候補の取得に失敗しました");
    } finally {
      setTagSuggestLoading(false);
    }
  }

  function toggleSuggestedTag(tag) {
    const current = normalizeTags(tagsText);
    if (current.includes(tag)) {
      setTagsText(current.filter((t) => t !== tag).join(" "));
    } else {
      setTagsText([...current, tag].join(" "));
    }
  }

  function handleSave() {
    if (!title.trim() && !body.trim()) return;
    onSave({
      title: title.trim() || "（無題の思考）",
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
              {/* タイトル */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-faint">
                    タイトル
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestTitle}
                    disabled={!body.trim() || titleSuggestLoading}
                    className="text-xs font-medium text-accent active:opacity-60 disabled:opacity-40"
                  >
                    {titleSuggestLoading ? "考え中…" : "✦ AIにタイトル案を聞く"}
                  </button>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タイトルを入力..."
                  className="tap-target w-full rounded-card border border-line bg-paper-card px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
                />

                {titleSuggestError && (
                  <p className="mt-1 text-xs text-[#93445A]">{titleSuggestError}</p>
                )}

                {/* AI提案は候補として表示。タップした時だけ反映する */}
                {titleSuggestion && (
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-paper-card p-2 text-xs">
                    <span className="shrink-0 font-bold text-accent">💡 AI提案:</span>
                    <span className="truncate font-medium text-ink">{titleSuggestion}</span>
                    <button
                      type="button"
                      onClick={applyTitleSuggestion}
                      className="ml-auto shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-bold text-paper active:scale-95"
                    >
                      採用する
                    </button>
                  </div>
                )}
              </div>

              {/* 本文 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-faint">
                  本文
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-card border border-line bg-paper-card p-3 text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {/* タグ */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-ink-faint">
                    タグ（スペース区切り）
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestTags}
                    disabled={!body.trim() || tagSuggestLoading}
                    className="text-xs font-medium text-accent active:opacity-60 disabled:opacity-40"
                  >
                    {tagSuggestLoading ? "探し中…" : "✦ 近い過去タグを探す"}
                  </button>
                </div>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="自分の性質 意思決定"
                  className="tap-target w-full rounded-card border border-line bg-paper-card px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
                />

                {suggestedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestedTags.map((t) => {
                      const selected = normalizeTags(tagsText).includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleSuggestedTag(t)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? "border-ink bg-ink text-paper"
                              : "border-line bg-paper-card text-ink"
                          }`}
                        >
                          #{t} {selected ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                )}

                {tagSuggestError && (
                  <p className="mt-1.5 text-xs text-[#93445A]">{tagSuggestError}</p>
                )}
                {!tagSuggestError && tagSuggestChecked && suggestedTags.length === 0 && (
                  <p className="mt-1.5 text-xs text-ink-faint">
                    近い過去タグは見つかりませんでした
                  </p>
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
