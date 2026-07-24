// ブラウザから直接Gemini APIキーを叩かないよう、必ず自前のAPI Route経由で呼ぶ。

export async function formatRawText(rawText) {
  const res = await fetch("/api/format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "AI整形に失敗しました");
  }
  return res.json(); // { title, body, tags }
}

// 本文からタイトル案を1つだけ取得する
export async function suggestTitle(body) {
  const res = await fetch("/api/suggest-title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "タイトル案の取得に失敗しました");
  }
  const data = await res.json();
  return data.title || "";
}

// 本文と過去タグ一覧から、近い既存タグだけを取得する
export async function suggestTags(body, existingTags = []) {
  const res = await fetch("/api/suggest-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, existingTags }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "タグ候補の取得に失敗しました");
  }
  const data = await res.json();
  return Array.isArray(data.tags) ? data.tags : [];
}
