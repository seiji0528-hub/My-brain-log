"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;

// ピンチ拡大・ダブルタップ拡大・拡大中のドラッグ移動に対応した画像ビューア
export default function ImageViewer({ src, alt = "", onClose }) {
  const overlayRef = useRef(null);
  const imgRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const overlay = overlayRef.current;
    const img = imgRef.current;
    if (!overlay || !img) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let s = 1;
    let tx = 0;
    let ty = 0;
    let gesture = null; // { mode, ... }
    let lastTap = 0;
    let lastTapPos = null;
    let moved = false;

    const apply = () => {
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    };

    const clamp = () => {
      if (s <= 1) {
        s = 1;
        tx = 0;
        ty = 0;
        return;
      }
      const maxX = (img.clientWidth * s - overlay.clientWidth) / 2;
      const maxY = (img.clientHeight * s - overlay.clientHeight) / 2;
      const limX = Math.max(0, maxX) + 40;
      const limY = Math.max(0, maxY) + 40;
      tx = Math.min(limX, Math.max(-limX, tx));
      ty = Math.min(limY, Math.max(-limY, ty));
    };

    // 画面中央を原点とした座標
    const rel = (clientX, clientY) => {
      const r = overlay.getBoundingClientRect();
      return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
    };

    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const zoomAt = (p, newScale) => {
      const ns = Math.min(MAX_SCALE, Math.max(1, newScale));
      tx = p.x - ((p.x - tx) * ns) / s;
      ty = p.y - ((p.y - ty) * ns) / s;
      s = ns;
      clamp();
      apply();
    };

    const onStart = (e) => {
      e.stopPropagation();
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        gesture = {
          mode: "pinch",
          d0: dist(a, b),
          s0: s,
          tx0: tx,
          ty0: ty,
          c0: rel((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2),
        };
        moved = true;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        gesture = { mode: "pan", x0: t.clientX, y0: t.clientY, tx0: tx, ty0: ty, t0: Date.now() };
        moved = false;
      }
    };

    const onMove = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!gesture) return;
      if (gesture.mode === "pinch" && e.touches.length === 2) {
        const [a, b] = e.touches;
        const ns = Math.min(MAX_SCALE, Math.max(0.6, (gesture.s0 * dist(a, b)) / gesture.d0));
        const c = rel((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
        tx = c.x - ((gesture.c0.x - gesture.tx0) * ns) / gesture.s0;
        ty = c.y - ((gesture.c0.y - gesture.ty0) * ns) / gesture.s0;
        s = ns;
        apply();
      } else if (gesture.mode === "pan" && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - gesture.x0;
        const dy = t.clientY - gesture.y0;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (s > 1) {
          tx = gesture.tx0 + dx;
          ty = gesture.ty0 + dy;
          apply();
        } else if (!gesture.noDismiss) {
          // 拡大していない状態:指に追従して動かし、背景を薄くする(Xのように)
          tx = dx;
          ty = dy;
          gesture.dy = dy;
          apply();
          const fade = Math.min(Math.abs(dy) / 300, 1);
          overlay.style.backgroundColor = `rgba(0,0,0,${0.9 * (1 - fade)})`;
        }
      }
    };

    const onEnd = (e) => {
      e.stopPropagation();
      if (e.touches.length === 0) {
        const wasPinch = gesture?.mode === "pinch";
        const wasTap = gesture?.mode === "pan" && !moved;

        // 拡大していない状態で上下にスワイプしたら閉じる
        if (gesture?.mode === "pan" && s <= 1 && !gesture.noDismiss && moved) {
          const dy = gesture.dy || 0;
          const elapsed = Math.max(1, Date.now() - gesture.t0);
          const fast = Math.abs(dy) > 40 && Math.abs(dy) / elapsed > 0.6;
          if (Math.abs(dy) > 110 || fast) {
            gesture = null;
            const dir = dy < 0 ? -1 : 1;
            img.style.transition = "transform 0.2s ease-out";
            overlay.style.transition = "background-color 0.2s ease-out";
            ty = dir * window.innerHeight;
            apply();
            overlay.style.backgroundColor = "rgba(0,0,0,0)";
            setTimeout(() => closeRef.current?.(), 200);
            return;
          }
        }
        gesture = null;
        overlay.style.transition = "background-color 0.15s ease-out";
        overlay.style.backgroundColor = "";
        setTimeout(() => {
          if (overlay) overlay.style.transition = "";
        }, 180);
        if (s < 1.02) {
          s = 1;
          tx = 0;
          ty = 0;
        }
        clamp();
        img.style.transition = "transform 0.15s ease-out";
        apply();
        setTimeout(() => {
          if (img) img.style.transition = "";
        }, 180);

        // ダブルタップで拡大/リセット
        if (wasTap && !wasPinch && e.changedTouches[0]) {
          const t = e.changedTouches[0];
          const now = Date.now();
          const p = rel(t.clientX, t.clientY);
          if (
            now - lastTap < 300 &&
            lastTapPos &&
            Math.hypot(p.x - lastTapPos.x, p.y - lastTapPos.y) < 30
          ) {
            img.style.transition = "transform 0.2s ease-out";
            if (s > 1) {
              s = 1;
              tx = 0;
              ty = 0;
              apply();
            } else {
              zoomAt(p, DOUBLE_TAP_SCALE);
            }
            setTimeout(() => {
              if (img) img.style.transition = "";
            }, 220);
            lastTap = 0;
            lastTapPos = null;
          } else {
            lastTap = now;
            lastTapPos = p;
          }
        }
      } else if (e.touches.length === 1) {
        // ピンチ→1本指になった場合は続けてドラッグできるようにする
        const t = e.touches[0];
        gesture = { mode: "pan", x0: t.clientX, y0: t.clientY, tx0: tx, ty0: ty, t0: Date.now(), noDismiss: true };
        moved = true;
      }
    };

    // PC: ホイールで拡大縮小
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      zoomAt(rel(e.clientX, e.clientY), s * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };

    const stop = (e) => e.stopPropagation();

    overlay.addEventListener("touchstart", onStart, { passive: false });
    overlay.addEventListener("touchmove", onMove, { passive: false });
    overlay.addEventListener("touchend", onEnd, { passive: false });
    overlay.addEventListener("touchcancel", onEnd, { passive: false });
    overlay.addEventListener("wheel", onWheel, { passive: false });
    overlay.addEventListener("pointerdown", stop);
    overlay.addEventListener("pointermove", stop);
    overlay.addEventListener("pointerup", stop);
    overlay.addEventListener("mousedown", stop);

    return () => {
      document.body.style.overflow = prevOverflow;
      overlay.removeEventListener("touchstart", onStart);
      overlay.removeEventListener("touchmove", onMove);
      overlay.removeEventListener("touchend", onEnd);
      overlay.removeEventListener("touchcancel", onEnd);
      overlay.removeEventListener("wheel", onWheel);
      overlay.removeEventListener("pointerdown", stop);
      overlay.removeEventListener("pointermove", stop);
      overlay.removeEventListener("pointerup", stop);
      overlay.removeEventListener("mousedown", stop);
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      style={{ touchAction: "none" }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) closeRef.current?.();
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={{ WebkitUserDrag: "none", WebkitTouchCallout: "none", willChange: "transform" }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          closeRef.current?.();
        }}
        className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-2xl leading-none text-white"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        aria-label="閉じる"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
