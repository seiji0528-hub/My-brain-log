import { NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `あなたは「My Brain Log」というセルフ分析アプリのAIアシスタントです。
渡された本文を読み、その内容を一言で表す簡潔なタイトル案を1つ考えてください。
20文字程度で、体言止めか短い問いの形にしてください。
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
  try {
    const req = await request.json();
    body = req.body;
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  if (!body || !body.trim()) {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: body }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
      temperature: 0.6,
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
    return NextResponse.json({ title: parsed.title || "" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "処理中にエラーが発生しました" }, { status: 500 });
  }
}
