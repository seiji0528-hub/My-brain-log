import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- データの読み込み (削除されていないカードのみ取得) ---
export async function loadCards() {
  try {
    const { data, error } = await supabase
      .from('brain_logs')
      .select('*')
      .is('deleted_at', null) // deleted_at が NULL のもの（ゴミ箱に入っていないもの）だけ取得
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

    // 自己刷り込みリマインダー機能:新しく書いたカードを「投入待ち」として
    // リマインドキューにも登録しておく(全カード対象、あとで日次バッチが
    // 1日3枚まで queued に昇格させる)
    if (data && data[0]) {
      const { error: queueError } = await supabase
        .from('reminder_queue')
        .insert([{ card_id: data[0].id, status: 'waiting_for_slot' }]);
      if (queueError) {
        // リマインド登録に失敗しても、カード保存自体は成功させたいのでthrowしない
        console.error('リマインドキューへの登録エラー:', queueError);
      }
    }

    return data;
  } catch (e) {
    console.error('カードの保存に失敗しました', e);
    throw e;
  }
}

// --- データの更新(タイトル・本文・タグの編集) ---
export async function updateCard(id, { title, body, tags }) {
  try {
    const { error } = await supabase
      .from('brain_logs')
      .update({
        title,
        content: body,
        tags: normalizeTags(tags),
      })
      .eq('id', id);

    if (error) {
      console.error('Supabaseへの更新エラー:', error);
      throw error;
    }
  } catch (e) {
    console.error('カードの更新に失敗しました', e);
    throw e;
  }
}

// --- 以下、既存の便利機能 ---
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

// --- データの論理削除 (ゴミ箱へ移動) ---
export async function deleteCard(id) {
  try {
    const { error } = await supabase
      .from('brain_logs')
      .update({ deleted_at: new Date().toISOString() }) // 削除日時をセットして「ゴミ箱行き」にする
      .eq('id', id);

    if (error) {
      console.error('Supabaseからの削除(論理削除)エラー:', error);
      throw error;
    }
  } catch (e) {
    console.error('カードの削除に失敗しました', e);
    throw e;
  }
}

// --- データの復元 (ゴミ箱から元に戻す) ---
export async function restoreCard(id) {
  try {
    const { error } = await supabase
      .from('brain_logs')
      .update({ deleted_at: null }) // deleted_at を NULL に戻す
      .eq('id', id);

    if (error) {
      console.error('Supabaseでの復元エラー:', error);
      throw error;
    }
  } catch (e) {
    console.error('カードの復元に失敗しました', e);
    throw e;
  }
}

// ============================================================
// 固定タグ(ピン留め)
// ============================================================

// --- 固定タグの読み込み(古い順=固定した順) ---
export async function loadPinnedTags() {
  try {
    const { data, error } = await supabase
      .from('pinned_tags')
      .select('tag')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('固定タグの読み込みエラー:', error);
      return [];
    }
    return (data || []).map((row) => row.tag);
  } catch (e) {
    console.error('固定タグの読み込みに失敗しました', e);
    return [];
  }
}

// --- タグを固定する(上限3個は呼び出し側でチェックする想定) ---
export async function pinTag(tag) {
  try {
    const { error } = await supabase.from('pinned_tags').insert([{ tag }]);
    if (error) {
      console.error('タグの固定エラー:', error);
      throw error;
    }
  } catch (e) {
    console.error('タグの固定に失敗しました', e);
    throw e;
  }
}

// --- タグの固定を解除する ---
export async function unpinTag(tag) {
  try {
    const { error } = await supabase.from('pinned_tags').delete().eq('tag', tag);
    if (error) {
      console.error('タグの固定解除エラー:', error);
      throw error;
    }
  } catch (e) {
    console.error('タグの固定解除に失敗しました', e);
    throw e;
  }
}
