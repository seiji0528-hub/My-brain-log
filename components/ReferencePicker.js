"use client";

import { useRef, useState } from "react";
import { uploadReferenceImage, deleteReferenceImage } from "@/lib/storage";

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export default function ReferencePicker({ reference, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      setError("画像ファイルのみ貼り付けできます");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const url = await uploadReferenceImage(file);
      onChange({ type: "image", value: url });
    } catch (e) {
      setError("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e) {
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
        onChange({ type: "url", value: trimmed });
      } else {
        onChange({ type: "text", value: text }); // 改行を保つため trim だけでtext自体は加工しない
      }
      setTypedValue("");
    }
  }

  function commitTypedValue() {
    const v = typedValue.trim();
    if (!v) return;
    if (URL_REGEX.test(v)) {
      onChange({ type: "url", value: v });
    } else {
      onChange({ type: "text", value: v });
    }
    setTypedValue("");
    setError("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTypedValue();
    }
  }

  async function handleRemove() {
    if (reference?.type === "image") {
      deleteReferenceImage(reference.value).catch(() => {});
    }
    onChange(null);
  }

  // --- 既に何か添付されている状態 ---
  if (reference && reference.type) {
    const icon = reference.type === "url" ? "🔗" : reference.type === "text" ? "❝" : null;
    return (
      <div className="flex items-center gap-2 rounded-card border border-line bg-paper-card p-2">
        {reference.type === "image" ? (
          <img src={reference.value} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-paper-dark/60 text-lg">
            {icon}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-xs text-ink-soft">
          {reference.value}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          className="tap-target shrink-0 rounded-full px-2 text-xs text-ink-faint active:bg-paper-dim"
          aria-label="参考資料を削除"
        >
          ×
        </button>
      </div>
    );
  }

  // --- 未添付:1つの欄に「貼り付け(画像/URL/長文)」「入力してEnter」「画像を選ぶ(小さいアイコン)」を集約 ---
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          disabled={uploading}
          placeholder={
            uploading ? "アップロード中…" : "画像・URL・引用文を貼り付け、または入力してEnter"
          }
          className="tap-target min-w-0 flex-1 rounded-card border border-dashed border-line bg-paper-card px-3 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="画像を選ぶ"
          className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-sm text-ink-soft active:bg-paper-dim"
        >
          🖼
        </button>
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
      {error && <p className="mt-1 text-[11px] text-[#93445A]">{error}</p>}
    </div>
  );
}
