import { NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `あなたは「My Brain Log」というセルフ分析アプリのAIアシスタントです。
ユーザーの思考のメモを受け取り、以下の3つを抽出・整形してください。

1. title: 内容を一言で表す簡潔なタイトル（20文字程度、体言止めか短い問い形式）
2. body: 元の内容を保ちながら、読みやすい日本語に整形した本文（誤字脱字の修正、句読点の補完、話し言葉の軽い整理のみ。新しい主張を勝手に追加しない）
3. tags: 内容に合う日本語タグを2〜4個。「#」は付けない。

【タグ抽出に関する最重要ルール】
ユーザーから「existingTags」（過去に使用したタグ一覧）が提供されている場合、まずその中から内容に合致・酷似するタグがないかを最優先で探して採用してください。
「映画」が存在するのに「映画鑑賞」を新しく作るような「表記揺れ」は絶対に避けてください。
既存タグでカバーしきれない部分のみ、抽象的な新しいタグ（例: 自分の性質, 意思決定, 対人関係）を補完してください。

必ず有効なJSONのみを出力してください。`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーにGEMINI_API_KEYが設定されていません（.env.localを確認してください）" },
      { status: 500 }
    );
  }

  let rawText;
  let existingTags = [];
  try {
    const body = await request.json();
    rawText = body.rawText;
    existingTags = Array.isArray(body.existingTags) ? body.existingTags : [];
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  if (!rawText || !rawText.trim()) {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }

  const userPrompt = `【過去のタグ一覧】\n${existingTags.join(", ")}\n\n【入力内容】\n${rawText}`;

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "body", "tags"],
      },
      temperature: 0.3,
    },
  };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "Gemini APIの呼び出しに失敗しました" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini APIから有効な応答が得られませんでした" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text);

    return NextResponse.json({
      title: parsed.title || "",
      body: parsed.body || rawText,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "整形処理中にエラーが発生しました" }, { status: 500 });
  }
}
