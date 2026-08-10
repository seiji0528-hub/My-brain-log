"use client";

import { useEffect, useState } from "react";

function getYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1];
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1];
    }
  } catch {
    return null;
  }
  return null;
}

function ReferenceItem({ type, value }) {
  const [open, setOpen] = useState(false);
  const [linkMeta, setLinkMeta] = useState(null);
  const [linkMetaLoading, setLinkMetaLoading] = useState(false);

  const youTubeId = type === "url" ? getYouTubeId(value) : null;

  useEffect(() => {
    if (type !== "url" || youTubeId || !value) return;
    let cancelled = false;
    setLinkMetaLoading(true);
    fetch("/api/link-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: value }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLinkMeta(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLinkMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, value]);

  if (!type || !value) return null;

  // --- 引用テキスト(長文もOK。タップで全文をモーダル表示、改行も保持) ---
  if (type === "text") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-line bg-paper text-lg text-ink-faint"
        >
          ❝
        </button>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <div
              className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-2xl bg-paper p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{value}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- 画像 ---
  if (type === "image") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line"
        >
          <img src={value} alt="参考資料" className="h-full w-full object-cover" />
        </button>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <img src={value} alt="参考資料" className="max-h-full max-w-full rounded-lg" />
          </div>
        )}
      </>
    );
  }

  // --- YouTube:公式のembed機能でアプリ内再生できる唯一の例外 ---
  if (youTubeId) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line"
        >
          <img
            src={`https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`}
            alt="YouTube"
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] text-ink">
              ▶
            </span>
          </span>
        </button>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <div
              className="aspect-video w-full max-w-lg overflow-hidden rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1`}
                title="YouTube video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // --- その他のURL:多くのサイトはアプリ内埋め込み表示をブロックしているため、
  // OGP情報(タイトル・画像)だけ小さくプレビューし、タップで外部タブへ開く ---
  let hostname = value;
  try {
    hostname = new URL(value).hostname;
  } catch {
    // noop
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex max-w-[220px] items-center gap-2 overflow-hidden rounded-lg border border-line bg-paper px-2 py-1.5 text-left"
    >
      {linkMeta?.image ? (
        <img src={linkMeta.image} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-paper-dark/60 text-xs text-ink-faint">
          🔗
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-ink">
          {linkMetaLoading ? "読み込み中…" : linkMeta?.title || value}
        </span>
        <span className="block truncate text-[10px] text-ink-faint">
          {linkMeta?.siteName || hostname}
        </span>
      </span>
    </a>
  );
}

export default function ReferencePreview({ items }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-start gap-1.5">
      {list.map((ref, i) => (
        <ReferenceItem key={i} type={ref.type} value={ref.value} />
      ))}
    </div>
  );
}
