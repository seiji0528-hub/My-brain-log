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




