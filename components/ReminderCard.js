"use client";

import { useEffect, useImperativeHandle, forwardRef, useRef, useState } from "react";
import { colorForTag } from "@/lib/tagColor";
import TagChip from "./TagChip";
import ReferencePreview from "./ReferencePreview";

const SWIPE_THRESHOLD = 90; // これ以上動かしたら「スワイプ成立」とみなすピクセル数
const EXIT_DISTANCE = 700; // 飛んでいく先までの距離(px)
const EXIT_DURATION = 280; // 飛んでいくアニメーションの時間(ms)

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const ReminderCard = forwardRef(function ReminderCard(
  { item, onSwipeRight, onSwipeLeft, onSwipeUp, onSwipeDown, onSaveEdit },
  ref
) {
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
  const [exitDir, setExitDir] = useState(null); // null | "up" | "down" | "left" | "right"
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editBody, setEditBody] = useState(item.body);
  const [editTags, setEditTags] = useState((item.tags || []).join(" "));
  const startRef = useRef({ x: 0, y: 0 });
  const exitTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const spineColor = item.tags && item.tags.length ? colorForTag(item.tags[0]).bar : "bg-line";

  const callbackFor = {
    right: onSwipeRight,
    left: onSwipeLeft,
    up: onSwipeUp,
    down: onSwipeDown,
  };

  // スワイプ成立時:まず実際に画面外へ飛んでいくアニメーションを再生し、
  // それが終わってから(=見た目上ちゃんと消えてから)初めて次のカードへ進む処理を呼ぶ
  function triggerExit(dir) {
    if (exitDir) return; // 二重発火防止
    setExitDir(dir);
    exitTimerRef.current = setTimeout(() => {
      const cb = callbackFor[dir];
      cb && cb();
    }, EXIT_DURATION);
  }

  // PCのボタンなど、外部からも同じアニメーションを発火できるようにする
  useImperativeHandle(ref, () => ({
    triggerExit,
  }));

  function pointerPos(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function handlePointerDown(e) {
    if (editing || exitDir) return;
    startRef.current = pointerPos(e);
    setDrag({ x: 0, y: 0, dragging: true });
  }

  function handlePointerMove(e) {
    if (!drag.dragging || editing || exitDir) return;
    const p = pointerPos(e);
    setDrag({ x: p.x - startRef.current.x, y: p.y - startRef.current.y, dragging: true });
  }

  function handlePointerUp() {
    if (!drag.dragging || editing || exitDir) return;
    const { x, y } = drag;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absY > SWIPE_THRESHOLD && absY > absX && y > 0) {
      triggerExit("down");
    } else if (absY > SWIPE_THRESHOLD && absY > absX && y < 0) {
      triggerExit("up");
    } else if (absX > SWIPE_THRESHOLD && absX > absY && x > 0) {
      triggerExit("right");
    } else if (absX > SWIPE_THRESHOLD && absX > absY && x < 0) {
      triggerExit("left");
    }
    setDrag({ x: 0, y: 0, dragging: false });
  }

  function handleSaveEditClick() {
    onSaveEdit({
      title: editTitle.trim() || "（無題の思考）",
      body: editBody.trim(),
      tags: editTags,
    });
    setEditing(false);
  }

  // 表示用のtransform/opacityを、ドラッグ中/飛んでいく最中/通常時で出し分ける
  let transform;
  let transition;
  let opacity = 1;

  if (exitDir === "right") {
    transform = `translate(${EXIT_DISTANCE}px, ${drag.y}px) rotate(24deg)`;
    transition = `transform ${EXIT_DURATION}ms ease, opacity ${EXIT_DURATION}ms ease`;
    opacity = 0;
  } else if (exitDir === "left") {
    transform = `translate(-${EXIT_DISTANCE}px, ${drag.y}px) rotate(-24deg)`;
    transition = `transform ${EXIT_DURATION}ms ease, opacity ${EXIT_DURATION}ms ease`;
    opacity = 0;
  } else if (exitDir === "up") {
    transform = `translate(${drag.x}px, -${EXIT_DISTANCE}px) rotate(0deg)`;
    transition = `transform ${EXIT_DURATION}ms ease, opacity ${EXIT_DURATION}ms ease`;
    opacity = 0;
  } else if (exitDir === "down") {
    transform = `translate(${drag.x}px, ${EXIT_DISTANCE}px) rotate(0deg)`;
    transition = `transform ${EXIT_DURATION}ms ease, opacity ${EXIT_DURATION}ms ease`;
    opacity = 0;
  } else {
    const rotate = drag.x / 18;
    transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`;
    transition = drag.dragging ? "none" : "transform 0.25s ease";
  }

  const hintOpacity = Math.min(1, Math.max(Math.abs(drag.x), Math.abs(drag.y)) / SWIPE_THRESHOLD);
  const hintLabel =
    exitDir === "down" || (Math.abs(drag.y) > Math.abs(drag.x) && drag.y > 0)
      ? "もう不要"
      : exitDir === "up" || (Math.abs(drag.y) > Math.abs(drag.x) && drag.y < 0)
      ? "また近いうちに"
      : exitDir === "right" || drag.x > 0
      ? "今も変わらない"
      : exitDir === "left" || drag.x < 0
      ? "考えが変わった"
      : "";
  const hintColor =
    hintLabel === "もう不要"
      ? "text-ink-faint"
      : hintLabel === "また近いうちに"
      ? "text-[#4A6FA5]"
      : hintLabel === "今も変わらない"
      ? "text-[#3E7A5C]"
      : "text-[#93445A]";

  return (
    <div
      className="relative mx-auto w-full max-w-sm select-none overflow-hidden rounded-card border border-line bg-paper-card shadow-card"
      style={{
        transform,
        transition,
        opacity,
        touchAction: "none",
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 ${spineColor}`} />

      {(hintLabel && (drag.dragging || exitDir)) && (
        <div
          className={`pointer-events-none absolute right-4 top-3.5 z-10 text-xs font-bold ${hintColor}`}
          style={{ opacity: exitDir ? 1 : hintOpacity }}
        >
          {hintLabel}
        </div>
      )}

      {!editing ? (
        <>
          <div className="px-4 py-3.5 pl-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[15px] font-bold leading-snug text-ink">
                {item.title || "（無題の思考）"}
              </h3>
              <span className="shrink-0 pt-0.5 text-xs text-ink-faint">
                {formatDate(item.createdAt)}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2.5">
              <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {item.body}
              </p>
              {item.references && item.references.length > 0 && (
                <div className="w-36 shrink-0">
                  <ReferencePreview items={item.references} />
                </div>
              )}
            </div>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-3 pl-5">
              {item.tags.map((t) => (
                <TagChip key={t} tag={t} size="sm" />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line px-4 py-2 pl-5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="tap-target rounded-md px-1 text-xs font-medium text-accent active:opacity-60"
            >
              ✎ この場で編集する
            </button>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              → 変わらない　← 変わった　↑ また近いうちに　↓ 不要
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2.5 p-4 pl-5">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="tap-target w-full rounded-card border border-line bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-card border border-line bg-paper p-3 text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="タグ（スペース区切り）"
            className="tap-target w-full rounded-card border border-line bg-paper px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="tap-target flex-1 rounded-full border border-line px-4 text-sm font-medium text-ink-soft"
            >
              やめる
            </button>
            <button
              type="button"
              onClick={handleSaveEditClick}
              className="tap-target flex-[1.4] rounded-full bg-accent px-4 text-sm font-bold text-paper"
            >
              更新する
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default ReminderCard;
