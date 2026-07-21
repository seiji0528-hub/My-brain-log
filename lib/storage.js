// MVPでは外部DBを持たず、ブラウザのlocalStorageにカードを保存する。
// 第2フェーズでSupabase等のDB＋ベクトル検索に差し替えることを想定し、
// 呼び出し側からはこの関数群だけを使うようにして依存を閉じ込めてある。

const STORAGE_KEY = "my-brain-log:cards";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadCards() {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("カードの読み込みに失敗しました", e);
    return [];
  }
}

export function saveCards(cards) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error("カードの保存に失敗しました", e);
  }
}

export function createCard({ title, body, tags }) {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    body: body.trim(),
    tags: normalizeTags(tags),
    createdAt: new Date().toISOString(),
  };
}

export function normalizeTags(tags) {
  const list = Array.isArray(tags)
    ? tags
    : String(tags || "")
        .split(/[,\s　]+/)
        .filter(Boolean);
  return Array.from(
    new Set(
      list
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean)
    )
  );
}

// 簡易的な関連カード判定（フェーズ1）：
// 共通タグ数 + タイトル/本文の共通単語数でスコアリングする。
// フェーズ2ではこれをEmbeddingのコサイン類似度に置き換える。
export function findRelatedCards(target, allCards, limit = 4) {
  const targetWords = extractWords(target.title + " " + target.body);

  return allCards
    .filter((c) => c.id !== target.id)
    .map((c) => {
      const sharedTags = c.tags.filter((t) => target.tags.includes(t));
      const words = extractWords(c.title + " " + c.body);
      const sharedWords = words.filter((w) => targetWords.includes(w));
      const score = sharedTags.length * 3 + sharedWords.length;
      return { card: c, score, sharedTags };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function extractWords(text) {
  // 日本語は分かち書きしていないため、2文字以上の連続した
  // 日本語/英数字トークンをざっくり抽出する簡易実装。
  const matches = text.match(/[一-龥ぁ-んァ-ヶー]{2,}|[A-Za-z0-9]{3,}/g);
  return matches ? Array.from(new Set(matches)) : [];
}
