import { NextResponse } from "next/server";

// 【第2フェーズ用スタブ】
// Gemini Embedding API (text-embedding-004) でテキストをベクトル化するだけの
// エンドポイント。フェーズ1のUIからはまだ呼び出していない。
//
// 使い方の想定（README参照）:
// 1. カード保存時にこのAPIでbodyをベクトル化し、カードに embedding: number[] を持たせて保存
// 2. 検索クエリも同様にベクトル化
// 3. クライアント側（またはサーバー側）で全カードとのコサイン類似度を計算し、
//    スコア上位のカードを「意味検索の結果」として表示する
//
// カード数が数百件程度までならブラウザ側でのコサイン類似度計算で十分実用的。
// それ以上に増えたらSupabase(pgvector)等への移行を検討する。

const MODEL = "text-embedding-004";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEYが未設定です" }, { status: 500 });
  }

  const { text } = await request.json().catch(() => ({}));
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "textが空です" }, { status: 400 });
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Embedding API error:", errText);
    return NextResponse.json({ error: "embedding取得に失敗しました" }, { status: 502 });
  }

  const data = await res.json();
  const values = data?.embedding?.values;

  if (!values) {
    return NextResponse.json({ error: "embeddingが取得できませんでした" }, { status: 502 });
  }

  return NextResponse.json({ embedding: values });
}

// コサイン類似度（フェーズ2でクライアント側から利用する想定のユーティリティ）
export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
