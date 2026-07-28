import { NextResponse } from "next/server";

const MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `あなたは「My Brain Log」というセルフ分析アプリのAIアシスタントです。
渡された本文を読み、その内容を要約するのではなく、日記やエッセイの見出しのように
短く印象的な「タイトル」を1つだけ考えてください。

厳守事項:
厳守事項:
- 8〜12文字程度（最大15文字）
- 内容を説明・要約しない
- 「〜について」「〜ということ」「〜だと気づいた」は禁止
- 体言止め、短い名詞句、または短い問いかけにする
- 本文全体ではなく、一番心が動いた一語・一場面だけを切り取る
- 抽象的な感情語だけ（不安・葛藤・迷い・自己嫌悪・決意・もどかしさ等）をタイトルにしてはいけない
- 感情よりも、その感情を生んだ具体的な出来事・場所・人物・物・言葉を優先する
- 他の文章にも違和感なく付けられるタイトルは禁止。この本文にしか付けられない固有性を最優先する
- 小説やエッセイの章タイトルのように、一目で印象が残る見出しにする
良い例(短くタイトルらしい):「疲れの正体」「逃げてもいい日」「境界線」「本当に望むもの？」
悪い例(要約的で長い、これは書かないこと):「仕事のプレッシャーで疲れている自分に気づいた」「人間関係について考えたこと」

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
      temperature: 0.7,
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
