import { NextResponse } from "next/server";

// ここに、あなたの好みをそのまま埋め込んでいます。
// 好みが変わったら、ここを書き換えるだけで反映されます。
const TASTE_PROFILE = `
- 今の気分:泣きたい、感情を揺さぶられたい映画が観たい
- 好きなジャンル・傾向:ヒューマンドラマ、ホラー系、ヨーロッパ企画やA24が手がけるような作品
- 具体的に好きな作品の例:「Super Happy Forever」「あんのこと」「宝島(2025)」「アナログ」「リバー、流れないでよ」
- 普段よく観るのは邦画
`.trim();

const MODEL = process.env.GEMINI_MOVIE_MODEL || "gemini-flash-latest";

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が環境変数に設定されていません" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const history = Array.isArray(body.history) ? body.history : [];
    const excludeText = history.length > 0 ? history.join("、") : "(なし)";

    const prompt = `あなたは映画推薦アシスタントです。以下のユーザーの好みに基づいて、実在する映画を1本だけ推薦してください。

【ユーザーの好み】
${TASTE_PROFILE}

【厳守事項】
- 実在する映画のみを推薦すること。事実に基づいて正確に。分からない情報(出演者名など)を推測で埋めず、不確かな場合は無理をせず正直に「不明」と書くこと。情報を絶対に捏造しないこと。
- 以下の除外リストに含まれる作品は絶対に選ばないこと(過去に推薦済み): ${excludeText}
- 出力は次のJSON形式のみとし、前後に説明文やコードブロック記法(\`\`\`)を付けないこと。

{
  "title": "映画タイトル(日本で流通している邦題があればそれ、なければ原題)",
  "year": "公開年(西暦、分かる範囲で)",
  "cast": ["出演者1", "出演者2", "出演者3", "出演者4", "出演者5"],
  "summary": "3〜4文程度の、興味を引く簡潔なあらすじ紹介文(ネタバレは避ける)"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[movie-recommend] Gemini API error:", res.status, errText);
      return NextResponse.json(
        { error: "映画のレコメンドに失敗しました(APIエラー)" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("[movie-recommend] JSON parse error:", e, rawText);
      return NextResponse.json(
        { error: "レコメンド結果の解析に失敗しました" },
        { status: 502 }
      );
    }

    if (!parsed.title || !Array.isArray(parsed.cast)) {
      return NextResponse.json(
        { error: "レコメンド結果の形式が不正です" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[movie-recommend] error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
