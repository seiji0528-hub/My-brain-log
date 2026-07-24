import { NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `あなたは「My Brain Log」というセルフ分析アプリのAIアシスタントです。
本文の内容と、ユーザーがこれまで使ってきたタグ一覧（existingTags）を渡します。

【ルール】
- existingTagsの中から、本文の内容と意味的に近い・同じ話題を指すタグを探して、そのタグの表記そのままで返してください。
- 該当するタグはいくつでも構いません（数の上限はありません）。
- 「映画」と「映画鑑賞」のような表記揺れを防ぐため、新しいタグを勝手に作らないでください。
- existingTagsの中に本当に何も当てはまるものが無ければ、無理に何かを返す必要はありません。その場合は空配列を返してください。

必ず有効なJSONのみを出力してください。`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーにGEMINI_API_KEYが設定されていません" },
      { status: 500 }
    );
  }

  let body;
  let existingTags = [];
  try {
    const req = await request.json();
    body = req.body;
    existingTags = Array.isArray(req.existingTags) ? req.existingTags : [];
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  if (!body || !body.trim()) {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }

  if (existingTags.length === 0) {
    // 過去タグが無ければAIを呼ぶまでもなく空配列を返す
    return NextResponse.json({ tags: [] });
  }

  const userPrompt = `【existingTags】\n${existingTags.join(", ")}\n\n【本文】\n${body}`;

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: { tags: { type: "array", items: { type: "string" } } },
        required: ["tags"],
      },
      temperature: 0.2,
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
      return NextResponse.json({ error: "Gemini APIの呼び出しに失敗しました" }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "有効な応答が得られませんでした" }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    // AIが提案したタグのうち、実際にexistingTagsに存在するものだけを信用する（表記揺れ防止の最終ガード）
    const safeTags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t) => existingTags.includes(t))
      : [];

    return NextResponse.json({ tags: safeTags });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "処理中にエラーが発生しました" }, { status: 500 });
  }
}
