"use client";

import { useRef, useState } from "react";
import { uploadReferenceImage, deleteReferenceImage } from "@/lib/storage";

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export default function ReferencePicker({ reference, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
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
    const text = e.clipboardData?.getData("text");
    if (text && URL_REGEX.test(text.trim())) {
      e.preventDefault();
      onChange({ type: "url", value: text.trim() });
    }
  }

  function handleUrlSubmit() {
    const v = urlInput.trim();
    if (!v) return;
    if (!URL_REGEX.test(v)) {
      setError("URLの形式が正しくありません(http(s)://から始まる形にしてください)");
      return;
    }
    setError("");
    onChange({ type: "url", value: v });
    setUrlInput("");
  }

  async function handleRemove() {
    if (reference?.type === "image") {
      // 失敗しても致命的ではないので待たずに投げっぱなしにする
      deleteReferenceImage(reference.value).catch(() => {});
    }
    onChange(null);
  }

  if (reference && reference.type) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-line bg-paper-card p-2">
        {reference.type === "image" ? (
          <img src={reference.value} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-paper-dark/60 text-lg">
            🔗
          </div>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{reference.value}</span>
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

  return (
    <div>
      <input
        type="text"
        readOnly={false}
        value=""
        onChange={() => {}} // ペースト以外の直接入力は無視する(貼り付け専用の見た目だけの欄)
        onPaste={handlePaste}
        placeholder={
          uploading
            ? "アップロード中…"
            : "ここをタップしてから、画像やURLを貼り付け（Cmd/Ctrl+V）"
        }
        disabled={uploading}
        className="tap-target flex min-h-[52px] w-full cursor-text items-center justify-center rounded-card border border-dashed border-line bg-paper-card px-3 text-center text-xs text-ink-faint placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="またはURLを直接入力"
          className="tap-target flex-1 rounded-card border border-line bg-paper px-2.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="button"
          onClick={handleUrlSubmit}
          className="tap-target shrink-0 rounded-full border border-line px-3 text-xs font-medium text-ink-soft active:bg-paper-dim"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tap-target shrink-0 rounded-full border border-line px-3 text-xs font-medium text-ink-soft active:bg-paper-dim"
        >
          画像を選ぶ
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
