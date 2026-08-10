"use client";

import { useRef, useState } from "react";
import { uploadReferenceImage, deleteReferenceImage } from "@/lib/storage";

const URL_REGEX = /^https?:\/\/[^\s]+$/i;
const MAX_REFERENCES = 3;

export default function ReferencePicker({ references, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  function resetTextareaHeight() {
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const list = Array.isArray(references) ? references : [];
  const isFull = list.length >= MAX_REFERENCES;

  function addReference(item) {
    onChange([...list, item]);
  }

  async function handleFile(file) {
    if (isFull) return;
    if (!file || !file.type || !file.type.startsWith("image/")) {
      setError("画像ファイルのみ貼り付けできます");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const url = await uploadReferenceImage(file);
      addReference({ type: "image", value: url });
    } catch (e) {
      setError("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e) {
    if (isFull) return;
    // ① 画像がクリップボードにあれば最優先でアップロード
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    }
    // ② テキスト:URLならリンクとして、それ以外(長文含む・改行も保持)は引用として保存
    const text = e.clipboardData?.getData("text");
    if (text && text.trim()) {
      e.preventDefault();
      const trimmed = text.trim();
      if (URL_REGEX.test(trimmed)) {
        addReference({ type: "url", value: trimmed });
      } else {
        addReference({ type: "text", value: text });
      }
      setTypedValue("");
      resetTextareaHeight();
    }
  }

  function commitTypedValue() {
    if (isFull) return;
    const v = typedValue.trim();
    if (!v) return;
    if (URL_REGEX.test(v)) {
      addReference({ type: "url", value: v });
    } else {
      addReference({ type: "text", value: v });
    }
    setTypedValue("");
    resetTextareaHeight();
    setError("");
  }

  function handleKeyDown(e) {
    // Cmd/Ctrl+Enterはショートカットとして追加。ただのEnterは改行として使えるようにする
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commitTypedValue();
    }
  }

  async function handleRemove(index) {
    const target = list[index];
    if (target?.type === "image") {
      deleteReferenceImage(target.value).catch(() => {});
    }
    onChange(list.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {list.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {list.map((ref, i) => {
            const icon = ref.type === "url" ? "🔗" : ref.type === "text" ? "❝" : null;
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-card border border-line bg-paper-card p-2"
              >
                {ref.type === "image" ? (
                  <img
                    src={ref.value}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-paper-dark/60 text-base">
                    {icon}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-xs text-ink-soft">
                  {ref.value}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="tap-target shrink-0 rounded-full px-2 text-xs text-ink-faint active:bg-paper-dim"
                  aria-label="参考資料を削除"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!isFull && (
        <div className="flex items-end gap-1.5">
          <textarea
            ref={textareaRef}
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            disabled={uploading}
            rows={1}
            onInput={(e) => {
              // 入力に合わせて高さを自動調整する
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            placeholder={
              uploading
                ? "アップロード中…"
                : "画像・URL・引用文を貼り付け、または入力（改行OK）"
            }
            className="tap-target min-w-0 flex-1 resize-none rounded-card border border-dashed border-line bg-paper-card px-3 py-2 text-xs leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="画像を選ぶ"
              className="tap-target flex h-9 w-9 items-center justify-center rounded-full border border-line text-sm text-ink-soft active:bg-paper-dim"
            >
              🖼
            </button>
            {typedValue.trim() && (
              <button
                type="button"
                onClick={commitTypedValue}
                aria-label="追加"
                className="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm text-paper active:scale-95"
              >
                ＋
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {isFull && (
        <p className="text-[11px] text-ink-faint">
          参考資料は最大{MAX_REFERENCES}つまでです。追加するには、いずれかを削除してください。
        </p>
      )}
      {error && <p className="text-[11px] text-[#93445A]">{error}</p>}
    </div>
  );
}
