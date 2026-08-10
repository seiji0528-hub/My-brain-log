import { supabase } from "./storage";

// --- 右スワイプ(今も変わらずそう思う)時の、間隔の伸ばし方 ---
// 「急な伸び」:1〜3日(初回投入時) → 1週間 → 1ヶ月 → 3ヶ月 → 半年、以降は半年で頭打ち
const RIGHT_SWIPE_INTERVAL_DAYS = [7, 30, 90, 180];

const NEW_INTAKE_PER_DAY = 3; // 1日あたりの新規投入上限
const SHOW_PER_DAY = 10; // 1日あたりの表示上限
const EXPIRE_AFTER_DAYS = 90; // 投入待ちのまま何日で自然除外するか

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function randomInitialDelayDays() {
  // 初回は1〜3日後のどこかにランダムに散らす
  return 1 + Math.floor(Math.random() * 3);
}

function intervalDaysForStage(stage) {
  const idx = Math.min(stage - 1, RIGHT_SWIPE_INTERVAL_DAYS.length - 1);
  return RIGHT_SWIPE_INTERVAL_DAYS[Math.max(0, idx)];
}

// ============================================================
// 通知設定
// ============================================================

export async function getReminderSettings() {
  try {
    const { data, error } = await supabase
      .from("reminder_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) {
      console.error("リマインダー設定の読み込みエラー:", error);
      return { notifyTime: "09:00", lastIntakeDate: null };
    }
    return { notifyTime: data.notify_time || "09:00", lastIntakeDate: data.last_intake_date };
  } catch (e) {
    console.error("リマインダー設定の読み込みに失敗しました", e);
    return { notifyTime: "09:00", lastIntakeDate: null };
  }
}

export async function updateNotifyTime(time) {
  try {
    const { error } = await supabase
      .from("reminder_settings")
      .update({ notify_time: time, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      console.error("通知時刻の更新エラー:", error);
      throw error;
    }
  } catch (e) {
    console.error("通知時刻の更新に失敗しました", e);
    throw e;
  }
}

// 今日、設定した通知時刻をもう過ぎているかどうか(プッシュ通知の代わりに、
// バッジを「その時刻を過ぎてから」出すための判定)
export function hasPassedNotifyTime(notifyTime) {
  if (!notifyTime) return true;
  const [h, m] = notifyTime.split(":").map((v) => parseInt(v, 10));
  const now = new Date();
  const target = new Date();
  target.setHours(h || 0, m || 0, 0, 0);
  return now >= target;
}

// ============================================================
// 日次メンテナンス(新規投入バッチ + 有効期限チェック)
// アプリを開くたびに呼び、その日まだ実行していなければ1回だけ動く
// ============================================================
export async function runDailyReminderMaintenance() {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const settings = await getReminderSettings();
  if (settings.lastIntakeDate === todayStr) {
    // 今日はもう実行済み
    return;
  }

  try {
    // ① 新規投入:waiting_for_slot のうち古いもの(=作成順)から最大3件を queued に昇格
    // (ゴミ箱入り=deleted_atが入っているカードは対象から除外)
    const { data: waiting, error: waitingError } = await supabase
      .from("reminder_queue")
      .select("id, created_at, brain_logs!inner(deleted_at)")
      .eq("status", "waiting_for_slot")
      .is("brain_logs.deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(NEW_INTAKE_PER_DAY);

    if (waitingError) {
      console.error("新規投入対象の取得エラー:", waitingError);
    } else if (waiting && waiting.length > 0) {
      for (const row of waiting) {
        const { error: promoteError } = await supabase
          .from("reminder_queue")
          .update({
            status: "queued",
            next_show_at: daysFromNow(randomInitialDelayDays()),
            interval_stage: 0,
          })
          .eq("id", row.id);
        if (promoteError) {
          console.error("キューへの昇格エラー:", promoteError);
        }
      }
    }

    // ② 有効期限チェック:リマインドキューに登録されてから(queued_since起点で)
    //    投入待ち/表示待ちのまま90日経過したものを除外。
    //    投稿を書いた元の日付(created_at)は起点にしない。
    const expireBefore = new Date();
    expireBefore.setDate(expireBefore.getDate() - EXPIRE_AFTER_DAYS);

    const { error: expireError } = await supabase
      .from("reminder_queue")
      .update({ status: "excluded" })
      .in("status", ["waiting_for_slot", "queued"])
      .lt("queued_since", expireBefore.toISOString());

    if (expireError) {
      console.error("有効期限チェックのエラー:", expireError);
    }

    // ③ 今日実行したことを記録
    const { error: markError } = await supabase
      .from("reminder_settings")
      .update({ last_intake_date: todayStr })
      .eq("id", 1);
    if (markError) {
      console.error("last_intake_date の更新エラー:", markError);
    }
  } catch (e) {
    console.error("リマインダーの日次メンテナンスに失敗しました", e);
  }
}

// ============================================================
// 表示対象の取得(繰り越し分が自然に優先される:next_show_at の昇順で
// 取るので、過去の日付で積み残っているものほど先に出てくる)
// ============================================================
export async function getDueReminderCards() {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("reminder_queue")
      .select(
        "id, card_id, interval_stage, next_show_at, brain_logs!inner(id, title, content, tags, created_at, deleted_at, attachments)"
      )
      .eq("status", "queued")
      .lte("next_show_at", nowIso)
      .is("brain_logs.deleted_at", null) // ゴミ箱入りのカードはリマインド対象から除外
      .order("next_show_at", { ascending: true })
      .limit(SHOW_PER_DAY);

    if (error) {
      console.error("リマインド対象の取得エラー:", error);
      return [];
    }

    return (data || [])
      .filter((row) => row.brain_logs) // 念のため
      .map((row) => ({
        queueId: row.id,
        cardId: row.card_id,
        intervalStage: row.interval_stage,
        title: row.brain_logs.title,
        body: row.brain_logs.content,
        tags: row.brain_logs.tags || [],
        createdAt: row.brain_logs.created_at,
        references: Array.isArray(row.brain_logs.attachments) ? row.brain_logs.attachments : [],
      }));
  } catch (e) {
    console.error("リマインド対象の取得に失敗しました", e);
    return [];
  }
}

// ============================================================
// スワイプ処理
// ============================================================

// 右:今も変わらずそう思う → 間隔を伸ばす
export async function swipeReminderRight(queueId, currentStage) {
  const nextStage = (currentStage || 0) + 1;
  const days = intervalDaysForStage(nextStage);
  try {
    const { error } = await supabase
      .from("reminder_queue")
      .update({
        interval_stage: nextStage,
        next_show_at: daysFromNow(days),
        last_shown_at: new Date().toISOString(),
      })
      .eq("id", queueId);
    if (error) throw error;
  } catch (e) {
    console.error("右スワイプの処理に失敗しました", e);
    throw e;
  }
}

// 左:もう違う、考えが変わった → 間隔をリセットして近いうちに再表示
export async function swipeReminderLeft(queueId) {
  try {
    const { error } = await supabase
      .from("reminder_queue")
      .update({
        interval_stage: 0,
        next_show_at: daysFromNow(randomInitialDelayDays()),
        last_shown_at: new Date().toISOString(),
      })
      .eq("id", queueId);
    if (error) throw error;
  } catch (e) {
    console.error("左スワイプの処理に失敗しました", e);
    throw e;
  }
}

// 上:また近いうちに表示させる(スヌーズ) → 間隔の段階(interval_stage)は
// そのまま維持し、次回表示日だけ1〜3日後に前倒しする。
// 「考えが変わった」わけではないので、左スワイプと違って進捗はリセットしない。
export async function swipeReminderUp(queueId) {
  try {
    const { error } = await supabase
      .from("reminder_queue")
      .update({
        next_show_at: daysFromNow(randomInitialDelayDays()),
        last_shown_at: new Date().toISOString(),
      })
      .eq("id", queueId);
    if (error) throw error;
  } catch (e) {
    console.error("上スワイプの処理に失敗しました", e);
    throw e;
  }
}

// 下:今後リマインドの必要がない → 完全除外(カード自体は残る)
export async function swipeReminderDown(queueId) {
  try {
    const { error } = await supabase
      .from("reminder_queue")
      .update({ status: "excluded", last_shown_at: new Date().toISOString() })
      .eq("id", queueId);
    if (error) throw error;
  } catch (e) {
    console.error("下スワイプの処理に失敗しました", e);
    throw e;
  }
}
