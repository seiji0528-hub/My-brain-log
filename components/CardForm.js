"use client";

import { useState, useEffect } from "react";
import { formatRawText } from "@/lib/aiClient";
import { normalizeTags } from "@/lib/storage";

export default function CardForm({ onClose, onSave, initialData = null }) {
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  // 初期データがある場合は最初から review 画面にする
  const [step, setStep] = useState(initialData ? "review" : "raw");

  // 再利用（コピー）用データが渡された場合にフォームへセット
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setBody(initialData.body || "");
      setTagsText((initialData.tags || []).join(" "));
    }
  }, [initialData]);

  async function handleFormat() {
    if (!rawText.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const result = await formatRawText(rawText);
      setTitle(result.title);
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
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-faint">
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="tap-target w-full rounded-card border border-line bg-paper-card px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

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
              {/* 再利用時は「戻る」ボタンを非表示にする（raw画面に戻る必要がないため） */}
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
