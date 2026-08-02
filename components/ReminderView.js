"use client";

import { useState } from "react";
import ReminderCard from "./ReminderCard";
import {
  swipeReminderRight,
  swipeReminderLeft,
  swipeReminderUp,
  swipeReminderDown,
  updateNotifyTime,
} from "@/lib/reminders";
import { updateCard } from "@/lib/storage";

export default function ReminderView({ items, notifyTime, onClose, onConsumeTop, onRefreshSettings }) {
  const [showSettings, setShowSettings] = useState(false);
  const [timeInput, setTimeInput] = useState(notifyTime || "09:00");
  const [savingTime, setSavingTime] = useState(false);

  const current = items[0];

  async function handleSwipeRight() {
    if (!current) return;
    onConsumeTop();
    try {
      await swipeReminderRight(current.queueId, current.intervalStage);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSwipeLeft() {
    if (!current) return;
    onConsumeTop();
    try {
      await swipeReminderLeft(current.queueId);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSwipeUp() {
    if (!current) return;
    onConsumeTop();
    try {
      await swipeReminderUp(current.queueId);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSwipeDown() {
    if (!current) return;
    onConsumeTop();
    try {
      await swipeReminderDown(current.queueId);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveEdit({ title, body, tags }) {
    if (!current) return;
    try {
      await updateCard(current.cardId, { title, body, tags });
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました。もう一度お試しください。");
    }
  }

  async function handleSaveTime() {
    setSavingTime(true);
    try {
      await updateNotifyTime(timeInput);
      onRefreshSettings && onRefreshSettings(timeInput);
      setShowSettings(false);
    } catch (e) {
      alert("通知時刻の保存に失敗しました。");
    } finally {
      setSavingTime(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink/40 p-4 animate-fade-in">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between py-2">
          <button
            type="button"
            onClick={onClose}
            className="tap-target rounded-full bg-paper/90 px-3 py-1.5 text-xs font-medium text-ink-soft shadow"
          >
            閉じる
          </button>
          <p className="text-xs font-medium text-paper">
            {items.length > 0 ? `残り ${items.length} 枚` : "今日の分はここまで"}
          </p>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="tap-target rounded-full bg-paper/90 px-3 py-1.5 text-xs font-medium text-ink-soft shadow"
          >
            通知時刻
          </button>
        </div>

        {showSettings && (
          <div className="mb-2 shrink-0 rounded-2xl bg-paper p-4 shadow-lg">
            <label className="mb-1 block text-xs font-medium text-ink-faint">
              毎日この時刻を過ぎたら知らせる
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="tap-target rounded-card border border-line bg-paper-card px-3 text-sm text-ink"
              />
              <button
                type="button"
                onClick={handleSaveTime}
                disabled={savingTime}
                className="tap-target rounded-full bg-accent px-4 text-sm font-bold text-paper disabled:opacity-50"
              >
                {savingTime ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 items-center justify-center">
          {current ? (
            <ReminderCard
              key={current.queueId}
              item={current}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onSwipeUp={handleSwipeUp}
              onSwipeDown={handleSwipeDown}
              onSaveEdit={handleSaveEdit}
            />
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-paper">今日届いた分は、これで全部です</p>
              <p className="mt-1 text-xs text-paper/70">また明日、いくつか届きます</p>
            </div>
          )}
        </div>

        {current && (
          <div className="flex shrink-0 flex-col items-center gap-2 pb-4 pt-2">
            <button
              type="button"
              onClick={handleSwipeUp}
              className="tap-target flex h-11 w-11 items-center justify-center rounded-full bg-paper text-lg shadow active:scale-95"
              aria-label="また近いうちに"
            >
              ↑
            </button>
            <div className="flex justify-center gap-6">
              <button
                type="button"
                onClick={handleSwipeLeft}
                className="tap-target flex h-12 w-12 items-center justify-center rounded-full bg-paper text-lg shadow active:scale-95"
                aria-label="考えが変わった"
              >
                ←
              </button>
              <button
                type="button"
                onClick={handleSwipeDown}
                className="tap-target flex h-12 w-12 items-center justify-center rounded-full bg-paper text-lg shadow active:scale-95"
                aria-label="もう不要"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={handleSwipeRight}
                className="tap-target flex h-12 w-12 items-center justify-center rounded-full bg-paper text-lg shadow active:scale-95"
                aria-label="今も変わらない"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
