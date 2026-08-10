import { NextResponse } from "next/server";

function extractMeta(html, property) {
  // <meta property="og:xxx" content="..."> / <meta name="xxx" content="...">
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractTitleTag(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : null;
}

export async function POST(request) {
  let url;
  try {
    const body = await request.json();
    url = body.url;
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URLが指定されていません" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "有効なURLではありません" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MyBrainLogBot/1.0; +https://example.com)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        title: parsed.hostname,
        image: null,
        siteName: parsed.hostname,
        url: parsed.toString(),
      });
    }

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      const MAX_BYTES = 200000;
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        received += value.length;
      }
      reader.cancel().catch(() => {});
    } else {
      html = await res.text();
    }

    const title =
      extractMeta(html, "og:title") || extractTitleTag(html) || parsed.hostname;
    const image = extractMeta(html, "og:image");
    const siteName = extractMeta(html, "og:site_name") || parsed.hostname;

    return NextResponse.json({
      title,
      image,
      siteName,
      url: parsed.toString(),
    });
  } catch (e) {
    console.error("[link-preview] error:", e);
    return NextResponse.json({
      title: parsed.hostname,
      image: null,
      siteName: parsed.hostname,
      url: parsed.toString(),
    });
  }
}
