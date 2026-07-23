import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- データの読み込み (Supabaseから) ---
export async function loadCards() {
  try {
    const { data, error } = await supabase
      .from('brain_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabaseからの読み込みエラー:', error);
      return [];
    }

    // Supabaseのデータ形式を、既存アプリの形式に変換
    return (data || []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.content,
      tags: item.tags || [],
      createdAt: item.created_at,
    }));
  } catch (e) {
    console.error('カードの読み込みに失敗しました', e);
    return [];
  }
}

// --- データの保存 (Supabaseへ) ---
export async function saveCards(card) {
  try {
    const { data, error } = await supabase
      .from('brain_logs')
      .insert([
        {
          title: card.title,
          content: card.body,
          tags: card.tags || [],
        },
      ])
      .select();

    if (error) {
      console.error('Supabaseへの保存エラー:', error);
      throw error;
    }
    return data;
  } catch (e) {
    console.error('カードの保存に失敗しました', e);
  }
}

// --- 以下、既存の便利機能（そのまま維持） ---
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
    : String(tags || '')
        .split(/[,\s　]+/)
        .filter(Boolean);
  return Array.from(
    new Set(
      list
        .map((t) => t.replace(/^#/, '').trim())
        .filter(Boolean)
    )
  );
}

export function findRelatedCards(target, allCards, limit = 4) {
  const targetWords = extractWords(target.title + ' ' + target.body);

  return allCards
    .filter((c) => c.id !== target.id)
    .map((c) => {
      const sharedTags = c.tags.filter((t) => target.tags.includes(t));
      const words = extractWords(c.title + ' ' + c.body);
      const sharedWords = words.filter((w) => targetWords.includes(w));
      const score = sharedTags.length * 3 + sharedWords.length;
      return { card: c, score, sharedTags };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function extractWords(text) {
  const matches = text.match(/[一-龥ぁ-んァ-ヶー]{2,}|[A-Za-z0-9]{3,}/g);
  return matches ? Array.from(new Set(matches)) : [];
}
