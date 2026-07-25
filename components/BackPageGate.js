"use client";

import { useEffect, useRef, useState } from "react";
import "./BackPageGate.css";

/**
 * 裏ページ全体(霞+扉のゲート → 夜の海岸シーン)を管理するコンポーネント。
 *
 * Home側の使い方:
 *
 *   const logoRef = useRef(null);
 *   ...
 *   <h1 ref={logoRef} className="...">My Brain Log</h1>
 *   ...
 *   <BackPageGate triggerRef={logoRef} cards={cards} />
 *
 * 表示/非表示はReactのstateで管理している(opacityをJSX側で計算する)。
 * DOMのclassName/styleを直接書き換えるだけだと、Home側が何らかの理由で
 * 再描画された瞬間にReactがJSXの値へ強制的に巻き戻してしまうため、
 * 「扉は消えるのに夜景が出てこない」といった非対称なバグの元になる。
 * state駆動にすることで、再描画されても常に正しい表示状態が保たれる。
 */
export default function BackPageGate({ triggerRef, cards = [] }) {
  const doorLayerRef = useRef(null);
  const doorHintRef = useRef(null);
  const trailSvgRef = useRef(null);
  const backRef = useRef(null);
  const sceneRef = useRef(null);
  const infoRef = useRef(null);
  const astroPanelRef = useRef(null);
  const constellationPanelRef = useRef(null);
  const exitClickHandlerRef = useRef(() => {});
  const signatureSvgRef = useRef(null);
  const lastPointsRef = useRef([]);

  // 表示状態はすべてReact stateで持つ(DOMを直接いじって終わりにしない)
  const [doorShown, setDoorShown] = useState(false);
  const [doorOpening, setDoorOpening] = useState(false);
  const [doorHintShown, setDoorHintShown] = useState(true);
  const [backShown, setBackShown] = useState(false);
  const [exitBtnShown, setExitBtnShown] = useState(false);

  useEffect(() => {
    if (!triggerRef?.current) {
      console.log("[BackPageGate] triggerRef.current が null です。effectが動きません。");
      return;
    }
    console.log("[BackPageGate] 初期化しました。triggerRef:", triggerRef.current);
    const cleanupFns = [];
    const timeoutIds = [];

    // ============================================================
    // 実データの準備(表の投稿から抽出)
    // ============================================================
    function pickRandomPost(list) {
      const eligible = list.filter((c) => (c.body || "").trim().length > 4);
      if (eligible.length === 0) return null;
      const c = eligible[Math.floor(Math.random() * eligible.length)];
      return (c.body || "").trim();
    }
    function extractLyrics(list) {
      return list
        .filter((c) => Array.isArray(c.tags) && c.tags.includes("歌詞"))
        .map((c) => (c.body || c.title || "").trim())
        .filter((t) => t.length > 0);
    }

    // ============================================================
    // ① 扉ゲート(霞+扉+フリーハンド円判定)
    // ============================================================
    const doorLayer = doorLayerRef.current;
    const back = backRef.current;
    const trailSvg = trailSvgRef.current;
    // interactionState は「今どの段階か」を判定するためだけの内部フラグ。
    // 実際の見た目(opacity等)は上のReact stateが担当する。
    let interactionState = "front";

    function onTriggerClick(e) {
      console.log("[BackPageGate] ロゴがクリックされました。interactionState:", interactionState);
      if (interactionState !== "front") return;
      interactionState = "door";
      const ox = e.clientX;
      const oy = e.clientY;
      const maxR =
        Math.hypot(
          Math.max(ox, window.innerWidth - ox),
          Math.max(oy, window.innerHeight - oy)
        ) * 1.15;
      // clip-pathはReactのstyle管理下に置いていないので、直接操作してよい
      doorLayer.style.clipPath = `circle(0px at ${ox}px ${oy}px)`;
      setDoorShown(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          doorLayer.style.clipPath = `circle(${maxR}px at ${ox}px ${oy}px)`;
        });
      });
    }
    triggerRef.current.addEventListener("click", onTriggerClick);
    cleanupFns.push(() =>
      triggerRef.current?.removeEventListener("click", onTriggerClick)
    );

    // --- フリーハンド円の検知(トレイル描画 + 判定) ---
    let points = [];
    let drawing = false;
    let pathEl = null;

    function startTrail() {
      pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("stroke", "#C9A96A");
      pathEl.setAttribute("stroke-width", "2.6");
      pathEl.setAttribute("fill", "none");
      pathEl.setAttribute("stroke-linecap", "round");
      pathEl.setAttribute("opacity", "0.85");
      trailSvg.appendChild(pathEl);
    }
    function updateTrail() {
      if (!pathEl) return;
      pathEl.setAttribute(
        "d",
        points.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ")
      );
    }
    function clearTrail() {
      trailSvg.innerHTML = "";
      pathEl = null;
    }
    function pointerPos(e) {
      if (e.touches && e.touches[0])
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    function onDown(e) {
      if (interactionState !== "door") return;
      console.log("[BackPageGate] 描画開始");
      if (e.cancelable) e.preventDefault(); // スマホでのスクロール/ズームジェスチャーと競合させない
      drawing = true;
      points = [];
      points.push(pointerPos(e));
      startTrail();
    }
    function onMove(e) {
      if (!drawing) return;
      if (e.cancelable) e.preventDefault();
      points.push(pointerPos(e));
      updateTrail();
    }
    function onUp() {
      if (!drawing) return;
      drawing = false;
      const isCircle = detectCircle(points);
      console.log("[BackPageGate] 描画終了。点の数:", points.length, "円と判定:", isCircle);
      if (isCircle) {
        lastPointsRef.current = points.slice();
        openDoor();
        // トレイルはここではクリアしない。扉と同じタイミング・同じ消え方で一緒にフェードアウトさせる
      } else {
        const hint = doorHintRef.current;
        if (hint) {
          hint.classList.remove("shake");
          void hint.offsetWidth;
          hint.classList.add("shake");
        }
        timeoutIds.push(setTimeout(clearTrail, 220));
      }
    }
    function detectCircle(pts) {
      if (pts.length < 8) return false;
      let cx = 0,
        cy = 0;
      pts.forEach((p) => {
        cx += p.x;
        cy += p.y;
      });
      cx /= pts.length;
      cy /= pts.length;

      let totalAngle = 0;
      let prevAngle = Math.atan2(pts[0].y - cy, pts[0].x - cx);
      let radii = [];
      for (let i = 1; i < pts.length; i++) {
        const a = Math.atan2(pts[i].y - cy, pts[i].x - cx);
        let diff = a - prevAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        totalAngle += diff;
        prevAngle = a;
        radii.push(Math.hypot(pts[i].x - cx, pts[i].y - cy));
      }
      const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
      const radiusVariance =
        radii.reduce((a, b) => a + Math.abs(b - avgR), 0) / radii.length;

      const start = pts[0],
        end = pts[pts.length - 1];
      const closeLoop = Math.hypot(end.x - start.x, end.y - start.y) < avgR * 1.15;
      const sweptEnough = Math.abs(totalAngle) > Math.PI * 1.15; // 約207°以上でOK
      const roundEnough = avgR > 14 && radiusVariance < avgR * 0.7;

      return sweptEnough && closeLoop && roundEnough;
    }

    doorLayer.addEventListener("mousedown", onDown);
    doorLayer.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    // touchはpassive:falseにしてpreventDefaultを効かせる(スクロール暴発による描画中断を防ぐ)
    doorLayer.addEventListener("touchstart", onDown, { passive: false });
    doorLayer.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    cleanupFns.push(() => {
      doorLayer.removeEventListener("mousedown", onDown);
      doorLayer.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      doorLayer.removeEventListener("touchstart", onDown);
      doorLayer.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    });

    // 描いた円の軌跡を、目標サイズにきれいに整形して座標変換する
    // (hidden_page_signature.html の buildSignaturePath と同じ考え方)
    function buildSignaturePath(pts, targetW, targetH, padding) {
      if (!pts || pts.length < 2) return "";
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      pts.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      const w = maxX - minX || 1;
      const h = maxY - minY || 1;
      const availW = targetW - padding * 2;
      const availH = targetH - padding * 2;
      const scale = Math.min(availW / w, availH / h);
      const offsetX = (targetW - w * scale) / 2;
      const offsetY = (targetH - h * scale) / 2;
      const mapped = pts.map((p) => ({
        x: offsetX + (p.x - minX) * scale,
        y: offsetY + (p.y - minY) * scale,
      }));
      return mapped.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ") + " Z";
    }

    // 「表のページに戻る」ボタンを囲む形で、描いた円をもう一度描く(ふわっと描き込まれるアニメーション付き)
    function drawSignature() {
      const svg = signatureSvgRef.current;
      if (!svg || lastPointsRef.current.length < 2) return;
      svg.innerHTML = "";
      const d = buildSignaturePath(lastPointsRef.current, 200, 84, 18);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);

      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      // 強制リフロー後にトランジションを効かせる
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 1.2s ease";
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = "0";
      });
    }

    function openDoor() {
      console.log("[BackPageGate] openDoor() 開始");
      interactionState = "opening";
      setDoorOpening(true);
      setDoorHintShown(false);
      timeoutIds.push(
        setTimeout(() => {
          console.log("[BackPageGate] setBackShown(true) 実行");
          setBackShown(true);
          timeoutIds.push(
            setTimeout(() => {
              // 扉(と、その中にあるトレイルの軌跡)を同じタイミング・同じ消え方でフェードアウト
              console.log("[BackPageGate] setDoorShown(false) 実行");
              setDoorShown(false);
              timeoutIds.push(
                setTimeout(() => {
                  setDoorOpening(false);
                  clearTrail();
                  setExitBtnShown(true);
                  drawSignature();
                  interactionState = "back";
                }, 1600)
              );
            }, 400)
          );
        }, 500)
      );
    }

    function onExitClick() {
      setExitBtnShown(false);
      setBackShown(false);
      timeoutIds.push(
        setTimeout(() => {
          setDoorOpening(false);
          if (doorLayer) doorLayer.style.clipPath = "circle(0px at 50px 40px)";
          setDoorHintShown(true);
          if (signatureSvgRef.current) signatureSvgRef.current.innerHTML = "";
          interactionState = "front";
        }, 500)
      );
    }
    // exitBtnはReactの<button onClick>で扱うので、ここではonExitClickを外に出す
    exitClickHandlerRef.current = onExitClick;

    // ============================================================
    // ② 夜の海岸シーン一式(決定版ロジック)
    // ============================================================
    console.log("[BackPageGate] buildScene呼び出し前。sceneEl:", sceneRef.current);
    let disposeScene = () => {};
    try {
      disposeScene = buildScene({
        sceneEl: sceneRef.current,
        infoEl: infoRef.current,
        astroPanelEl: astroPanelRef.current,
        constellationPanelEl: constellationPanelRef.current,
        randomPost: pickRandomPost(cards),
        lyricPool: extractLyrics(cards),
      });
      console.log("[BackPageGate] buildScene 完了");
    } catch (err) {
      console.error("[BackPageGate] buildScene でエラー:", err);
    }
    cleanupFns.push(disposeScene);

    return () => {
      timeoutIds.forEach((id) => clearTimeout(id));
      cleanupFns.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRef, cards]);

  // onExitClickはuseEffect内で定義されるため、refを介してボタンのonClickから呼び出す

  return (
    <>
      <div
        ref={doorLayerRef}
        className={`bpg-door-layer${doorOpening ? " opening" : ""}`}
        style={{
          opacity: doorShown ? 1 : 0,
          pointerEvents: doorShown ? "all" : "none",
        }}
      >
        <svg className="bpg-door-svg" viewBox="0 0 220 320">
          <defs>
            <radialGradient id="bpgGlowGrad" cx="50%" cy="52%" r="60%">
              <stop offset="0%" stopColor="rgba(255,244,214,0.95)" />
              <stop offset="60%" stopColor="rgba(255,222,150,0.35)" />
              <stop offset="100%" stopColor="rgba(255,222,150,0)" />
            </radialGradient>
          </defs>
          <ellipse
            className="bpg-door-glow"
            cx="110"
            cy="165"
            rx="130"
            ry="170"
            fill="url(#bpgGlowGrad)"
          />
          <path
            d="M14,300 L14,60 Q14,14 110,14 Q206,14 206,60 L206,300 Z"
            fill="none"
            stroke="#C9A96A"
            strokeWidth="2.5"
            opacity="0.85"
          />
          <g className="bpg-door-panel bpg-left">
            <path
              d="M18,296 L18,62 Q18,20 110,18 L110,296 Z"
              fill="rgba(14,15,22,0.92)"
              stroke="rgba(201,169,106,0.5)"
              strokeWidth="1"
            />
            <rect x="30" y="70" width="70" height="90" fill="none" stroke="rgba(201,169,106,0.35)" strokeWidth="1" />
            <rect x="30" y="175" width="70" height="100" fill="none" stroke="rgba(201,169,106,0.35)" strokeWidth="1" />
            <circle cx="98" cy="175" r="3" fill="#C9A96A" />
          </g>
          <g className="bpg-door-panel bpg-right">
            <path
              d="M202,296 L202,62 Q202,20 110,18 L110,296 Z"
              fill="rgba(14,15,22,0.92)"
              stroke="rgba(201,169,106,0.5)"
              strokeWidth="1"
            />
            <rect x="120" y="70" width="70" height="90" fill="none" stroke="rgba(201,169,106,0.35)" strokeWidth="1" />
            <rect x="120" y="175" width="70" height="100" fill="none" stroke="rgba(201,169,106,0.35)" strokeWidth="1" />
            <circle cx="122" cy="175" r="3" fill="#C9A96A" />
          </g>
        </svg>
        <div
          ref={doorHintRef}
          className="bpg-door-hint"
          style={{ opacity: doorHintShown ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          指でそっと、円を描いてください
        </div>
        <svg ref={trailSvgRef} className="bpg-trail" />
      </div>

      <div
        ref={backRef}
        className="bpg-back"
        style={{
          opacity: backShown ? 1 : 0,
          pointerEvents: backShown ? "all" : "none",
        }}
      >
        <div className="bpg-stage">
          <svg ref={sceneRef} viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" />
        </div>
        <div ref={infoRef} className="bpg-info" />
        <div ref={astroPanelRef} className="bpg-astro-panel" />
        <div ref={constellationPanelRef} className="bpg-constellation-panel" />
        <div
          className="bpg-exit-wrap"
          style={{ opacity: exitBtnShown ? 1 : 0, pointerEvents: exitBtnShown ? "auto" : "none" }}
        >
          <svg ref={signatureSvgRef} className="bpg-signature" viewBox="0 0 200 84" />
          <button
            type="button"
            className="bpg-exit"
            aria-label="表のページに戻る"
            onClick={() => exitClickHandlerRef.current?.()}
          />
        </div>
      </div>
    </>
  );
}

// ==================================================================
// シーン構築(決定版ロジック。プロトタイプの back_page_scene_v9 相当)
// ==================================================================
function buildScene({ sceneEl, infoEl, astroPanelEl, constellationPanelEl, randomPost, lyricPool }) {
  const svgns = "http://www.w3.org/2000/svg";
  const scene = sceneEl;
  const info = infoEl;
  if (!scene) return () => {};

  const H = 500;
  const rawAspect = window.innerWidth / window.innerHeight;
  const W = Math.round(Math.max(320, Math.min(1400, H * rawAspect)));
  scene.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const sx = (x) => (x * W) / 800;

  const HORIZON_Y = H - H * 0.375;
  const GLITTER_TOP_Y = H - H * 0.35;

  let rafIds = [];
  let timeoutIds = [];

  function el(name, attrs) {
    const e = document.createElementNS(svgns, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // ---------- 和数字変換 ----------
  const KANJI_DIGIT = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  function kanjiPlaceValue(n) {
    if (n === 0) return KANJI_DIGIT[0];
    const thousands = Math.floor(n / 1000);
    const hundreds = Math.floor(n / 100) % 10;
    const tens = Math.floor(n / 10) % 10;
    const ones = n % 10;
    let s = "";
    if (thousands > 0) s += (thousands > 1 ? KANJI_DIGIT[thousands] : "") + "千";
    if (hundreds > 0) s += (hundreds > 1 ? KANJI_DIGIT[hundreds] : "") + "百";
    if (tens > 0) s += (tens > 1 ? KANJI_DIGIT[tens] : "") + "十";
    if (ones > 0) s += KANJI_DIGIT[ones];
    return s;
  }
  function kanjiDay(n) {
    if (n < 20) return kanjiPlaceValue(n);
    if (n < 30) {
      const ones = n % 10;
      return "廿" + (ones > 0 ? KANJI_DIGIT[ones] : "");
    }
    const ones = n % 10;
    return "卅" + (ones > 0 ? KANJI_DIGIT[ones] : "");
  }
  function poeticTimeOfDay(hour) {
    if (hour >= 0 && hour < 3) return "深夜";
    if (hour >= 3 && hour < 5) return "未明";
    if (hour >= 5 && hour < 7) return "黎明";
    if (hour >= 7 && hour < 10) return "朝";
    if (hour >= 10 && hour < 12) return "午前";
    if (hour >= 12 && hour < 14) return "昼下がり";
    if (hour >= 14 && hour < 17) return "午後";
    if (hour >= 17 && hour < 19) return "黄昏";
    if (hour >= 19 && hour < 23) return "宵";
    return "深夜";
  }
  function buildPoeticDate(date) {
    const y = kanjiPlaceValue(date.getFullYear());
    const m = kanjiPlaceValue(date.getMonth() + 1);
    const d = kanjiDay(date.getDate());
    const tod = poeticTimeOfDay(date.getHours());
    return { line1: `${y}年 ${m}月 ${d}日`, line2: tod };
  }

  // ---------- 月齢 ----------
  function getMoonPhase(date) {
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const synodicMonth = 29.530588853;
    const diffDays = (date.getTime() - knownNewMoon.getTime()) / 86400000;
    let phase = (diffDays % synodicMonth) / synodicMonth;
    if (phase < 0) phase += 1;
    return phase;
  }
  function phaseName(p) {
    if (p < 0.03 || p > 0.97) return "新月";
    if (p < 0.22) return "三日月";
    if (p < 0.28) return "上弦の月";
    if (p < 0.47) return "十三夜月";
    if (p < 0.53) return "満月";
    if (p < 0.72) return "十六夜月";
    if (p < 0.78) return "下弦の月";
    return "有明月";
  }

  const now = new Date();
  const moonPhase = getMoonPhase(now);
  const illumination = (1 - Math.cos(moonPhase * 2 * Math.PI)) / 2;
  const tidalStrength = (1 + Math.cos(4 * Math.PI * moonPhase)) / 2;

  function getSeason(date) {
    const m = date.getMonth() + 1;
    if (m === 12 || m <= 2) return "winter";
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    return "autumn";
  }

  const constellations = {
    winter: [
      { name: "オリオン座", pts: [[20,8],[72,10],[46,42],[35,44],[46,46],[57,48],[18,88],[70,84]], edges: [[0,3],[1,5],[3,4],[4,5],[3,6],[5,7]], trivia: "狩人オリオンが、蠍(さそり座)から逃れるように今も夜空を駆けている、という言い伝えがあります。" },
      { name: "おおいぬ座", pts: [[50,10],[20,55],[75,60],[45,90]], edges: [[0,1],[0,2],[1,3],[2,3]], trivia: "オリオンが連れていた猟犬とされ、最も明るい恒星シリウスを胸に抱いています。" },
      { name: "おうし座", pts: [[15,60],[35,40],[55,42],[75,58],[50,20]], edges: [[0,1],[1,2],[2,3],[1,4],[2,4]], trivia: "ゼウスが姿を変えた牡牛の背に、姫エウロパを乗せて海を渡ったという神話が伝わります。" },
      { name: "ふたご座", pts: [[30,10],[70,10],[25,40],[75,40],[20,75],[80,75],[15,95],[85,95]], edges: [[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[0,1]], trivia: "双子の兄弟カストルとポルックスが、片方だけ不死だったため神々に頼み天に上げてもらったとされます。" },
      { name: "ぎょしゃ座", pts: [[50,10],[85,35],[70,80],[30,80],[15,35]], edges: [[0,1],[1,2],[2,3],[3,4],[4,0]], trivia: "足の悪い王が発明した戦車を操る御者の姿とされ、山羊を抱いた形で描かれることもあります。" },
      { name: "こいぬ座", pts: [[30,20],[70,70]], edges: [[0,1]], trivia: "おおいぬ座と共にオリオンに寄り添う、もう一匹の猟犬とされています。" },
    ],
    spring: [
      { name: "おおぐま座(北斗七星)", pts: [[10,70],[30,72],[50,68],[65,55],[75,35],[60,25],[45,30]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]], trivia: "美しい娘カリストが女神の怒りに触れて熊に姿を変えられ、天に上げられた姿だと言われます。" },
      { name: "しし座", pts: [[15,50],[30,25],[55,20],[65,35],[50,55],[30,50],[80,60],[70,80]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[4,6],[6,7]], trivia: "英雄ヘラクレスが倒したネメアの獅子が、その功績をたたえて星座になったとされます。" },
      { name: "おとめ座", pts: [[20,10],[35,30],[55,25],[70,45],[50,60],[60,85]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5]], trivia: "豊穣の女神が持つ麦の穂が、一番星スピカとして輝いていると言われます。" },
      { name: "うしかい座", pts: [[50,10],[75,30],[70,60],[50,90],[30,60],[25,30]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]], trivia: "熊に姿を変えられた母カリストを追う息子アルカスの姿だという説があります。" },
      { name: "からす座", pts: [[20,20],[80,15],[70,70],[30,80]], edges: [[0,1],[1,2],[2,3],[3,0]], trivia: "アポロンの使いだったカラスが、嘘の報告をした罰で喉の渇きに苦しむ姿とされています。" },
    ],
    summer: [
      { name: "さそり座", pts: [[12,60],[26,55],[40,62],[52,78],[58,100],[64,125],[70,148],[77,168],[84,178],[90,172],[95,155],[93,135]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11]], antaresIndex: 4, trivia: "オリオンを刺し殺した蠍が、その功績で天に上げられたとされ、今もオリオンの反対側で夜空を追いかけています。" },
      { name: "こと座", pts: [[50,15],[35,45],[50,75],[65,45]], edges: [[0,1],[1,2],[2,3],[3,0]], trivia: "音楽家オルフェウスが冥界から連れ戻せなかった妻を想って奏でた竪琴とされます。" },
      { name: "はくちょう座", pts: [[50,10],[50,80],[15,45],[85,45],[35,25],[65,65]], edges: [[0,1],[2,3],[0,4],[1,5]], trivia: "ゼウスが白鳥に姿を変えて地上に降りたという神話にちなみ、北十字とも呼ばれます。" },
      { name: "わし座", pts: [[50,10],[75,45],[50,50],[25,45],[50,90]], edges: [[0,1],[1,2],[2,3],[3,0],[2,4]], trivia: "ゼウスの使いである鷲が、美少年ガニュメデスを天へ運んだ姿だと言われます。" },
      { name: "いて座", pts: [[20,30],[45,15],[70,25],[80,45],[65,60],[70,80],[40,75],[25,55]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[6,7],[7,0]], trivia: "半人半馬のケンタウロス、賢者ケイローンが弓を構える姿だとされています。" },
    ],
    autumn: [
      { name: "カシオペヤ座", pts: [[10,50],[30,25],[50,45],[70,20],[90,40]], edges: [[0,1],[1,2],[2,3],[3,4]], trivia: "美しさを自慢しすぎた王妃が、その罰として椅子ごと空に縛りつけられた姿と言われます。" },
      { name: "ペガスス座", pts: [[25,20],[70,20],[70,60],[25,60],[10,80]], edges: [[0,1],[1,2],[2,3],[3,0],[3,4]], trivia: "英雄ペルセウスが怪物メデューサを倒したときに生まれた、翼を持つ天馬の姿です。" },
      { name: "アンドロメダ座", pts: [[25,60],[15,75],[8,88],[3,98]], edges: [[0,1],[1,2],[2,3]], trivia: "怪物の生贄にされかけた王女を、ペルセウスが救い出したという神話に由来します。" },
      { name: "みずがめ座", pts: [[20,15],[35,30],[30,50],[50,55],[55,75],[75,80]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5]], trivia: "美少年ガニュメデスが神々に捧げる酒を注ぐ姿だとされています。" },
      { name: "うお座", pts: [[10,20],[25,35],[20,55],[50,60],[80,55],[85,35],[70,20]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]], trivia: "怪物から逃げた女神アフロディーテとその子が、魚に姿を変えて紐で結ばれたまま泳いだ姿とされます。" },
    ],
  };
  const season = getSeason(now);
  const seasonList = constellations[season];
  const chosen = seasonList[Math.floor(Math.random() * seasonList.length)];

  // ---------- defs ----------
  const defs = el("defs", {});
  const SKY_PALETTES = {
    winter: ["#04050D", "#090E24", "#131A3A"],
    spring: ["#05060C", "#0B1024", "#181E36"],
    summer: ["#06050A", "#100F22", "#241C34"],
    autumn: ["#05050A", "#0D0E20", "#201B2C"],
  };
  const skyColors = SKY_PALETTES[season];
  const skyGrad = el("linearGradient", { id: "bpgSkyGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
  skyGrad.appendChild(el("stop", { offset: "0%", "stop-color": skyColors[0] }));
  skyGrad.appendChild(el("stop", { offset: "55%", "stop-color": skyColors[1] }));
  skyGrad.appendChild(el("stop", { offset: "100%", "stop-color": skyColors[2] }));
  defs.appendChild(skyGrad);

  const seaGrad = el("linearGradient", { id: "bpgSeaGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
  seaGrad.appendChild(el("stop", { offset: "0%", "stop-color": "#0D1526" }));
  seaGrad.appendChild(el("stop", { offset: "100%", "stop-color": "#03050A" }));
  defs.appendChild(seaGrad);

  const moonGlow = el("radialGradient", { id: "bpgMoonGlow" });
  moonGlow.appendChild(el("stop", { offset: "0%", "stop-color": "rgba(238,239,246,0.5)" }));
  moonGlow.appendChild(el("stop", { offset: "100%", "stop-color": "rgba(238,239,246,0)" }));
  defs.appendChild(moonGlow);

  const blur = el("filter", { id: "bpgSoftBlur" });
  blur.appendChild(el("feGaussianBlur", { stdDeviation: "0.8" }));
  defs.appendChild(blur);

  scene.appendChild(defs);
  scene.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#bpgSkyGrad)" }));

  const bgStars = el("g", {});
  for (let i = 0; i < 130; i++) {
    const x = Math.random() * W,
      y = Math.random() * HORIZON_Y * 0.95;
    const r = Math.random() * 1.1 + 0.25,
      op = Math.random() * 0.5 + 0.2;
    const s = el("circle", { cx: x, cy: y, r, fill: "#E9EAF2", class: "twinkle" });
    s.style.setProperty("--base-op", op);
    s.style.animationDelay = Math.random() * 4 + "s";
    bgStars.appendChild(s);
  }
  scene.appendChild(bgStars);

  const constGroup = el("g", { opacity: 0.88 });
  const boxW = 150,
    boxH = 130;
  const marginX = 40,
    marginTop = 20,
    marginBottom = HORIZON_Y - 30;
  const originXc = marginX + Math.random() * (W - boxW - marginX * 2);
  const originYc = marginTop + Math.random() * (marginBottom - boxH - marginTop);
  const mapped = chosen.pts.map((p) => [originXc + (p[0] / 100) * boxW, originYc + (p[1] / 100) * boxH]);
  chosen.edges.forEach(([a, b]) => {
    constGroup.appendChild(
      el("line", {
        x1: mapped[a][0],
        y1: mapped[a][1],
        x2: mapped[b][0],
        y2: mapped[b][1],
        stroke: "rgba(233,234,242,0.32)",
        "stroke-width": 0.8,
      })
    );
  });
  mapped.forEach((p, i) => {
    const isSpecial = chosen.antaresIndex === i;
    const star = el("circle", {
      cx: p[0],
      cy: p[1],
      r: isSpecial ? 2.6 : 1.5,
      fill: isSpecial ? "#E8A87C" : "#E9EAF2",
      class: "twinkle",
    });
    star.style.setProperty("--base-op", isSpecial ? 0.95 : 0.8);
    star.style.animationDelay = Math.random() * 3 + "s";
    constGroup.appendChild(star);
  });
  scene.appendChild(constGroup);

  // 星座タップで豆知識(線・星それぞれに沿った当たり判定)
  const constHitGroup = el("g", {});
  chosen.edges.forEach(([a, b]) => {
    constHitGroup.appendChild(
      el("line", {
        x1: mapped[a][0],
        y1: mapped[a][1],
        x2: mapped[b][0],
        y2: mapped[b][1],
        stroke: "transparent",
        "stroke-width": 16,
        "stroke-linecap": "round",
        "pointer-events": "stroke",
        class: "const-hit",
      })
    );
  });
  mapped.forEach((p, i) => {
    const isSpecial = chosen.antaresIndex === i;
    constHitGroup.appendChild(
      el("circle", {
        cx: p[0],
        cy: p[1],
        r: isSpecial ? 14 : 11,
        fill: "transparent",
        "pointer-events": "fill",
        class: "const-hit",
      })
    );
  });
  scene.appendChild(constHitGroup);
  let constRevealed = false;
  function onConstClick() {
    constRevealed = !constRevealed;
    if (constRevealed && constellationPanelEl) {
      constellationPanelEl.innerHTML = `<span class="const-name">${chosen.name}</span>${chosen.trivia || ""}`;
    }
    constellationPanelEl?.classList.toggle("revealed", constRevealed);
  }
  constHitGroup.addEventListener("click", onConstClick);

  // ---------- 月 ----------
  const moonR = 18,
    moonCx = W * 0.7,
    moonCy = H * 0.17;
  scene.appendChild(
    el("circle", { cx: moonCx, cy: moonCy, r: moonR * 3.4, fill: "url(#bpgMoonGlow)", "pointer-events": "none" })
  );
  scene.appendChild(
    el("circle", { cx: moonCx, cy: moonCy, r: moonR, fill: "#2A2D3D", "pointer-events": "none" })
  );

  function moonLitPath(cx, cy, r, phase) {
    if (phase < 0.02 || phase > 0.98) return null;
    if (phase > 0.48 && phase < 0.52) {
      return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 Z`;
    }
    const rx = Math.abs(r * Math.cos(phase * 2 * Math.PI));
    let s1, s2;
    if (phase < 0.5) {
      s1 = 1;
      s2 = phase < 0.25 ? 1 : 0;
    } else {
      s1 = 0;
      s2 = phase < 0.75 ? 0 : 1;
    }
    return `M ${cx},${cy - r} A ${r},${r} 0 0 ${s1} ${cx},${cy + r} A ${rx},${r} 0 0 ${s2} ${cx},${cy - r} Z`;
  }
  const litPath = moonLitPath(moonCx, moonCy, moonR, moonPhase);
  if (litPath) {
    scene.appendChild(el("path", { d: litPath, fill: "#EDEEF4", "pointer-events": "none" }));
    const clip = el("clipPath", { id: "bpgMoonClip" });
    clip.appendChild(el("path", { d: litPath }));
    defs.appendChild(clip);
    const craters = el("g", {
      filter: "url(#bpgSoftBlur)",
      opacity: 0.5,
      "clip-path": "url(#bpgMoonClip)",
      "pointer-events": "none",
    });
    const craterSpecs = [
      [moonCx - 4.5, moonCy - 4.5, 3.4, 2.5],
      [moonCx + 3.4, moonCy - 2.2, 2.2, 1.7],
      [moonCx - 1.1, moonCy + 4.5, 3.9, 2.8],
      [moonCx + 5.6, moonCy + 5.6, 1.7, 1.4],
      [moonCx - 7.8, moonCy + 1.1, 2, 1.7],
      [moonCx + 1.7, moonCy - 9, 1.7, 1.4],
    ];
    craterSpecs.forEach(([cx, cy, rx, ry]) => {
      craters.appendChild(el("ellipse", { cx, cy, rx, ry, fill: "#9CA0A0" }));
    });
    scene.appendChild(craters);
  }

  // 月の当たり判定(映画レコメンド機能のプレースホルダー。輪郭よりわずかに大きい程度)
  const moonHit = el("circle", { cx: moonCx, cy: moonCy, r: moonR + 4, fill: "transparent", style: "cursor:pointer;" });
  scene.appendChild(moonHit);
  function onMoonClick() {
    // TODO: 映画レコメンド機能(Gemini API連携)をここに実装する
    console.log("月がタップされました(映画レコメンド機能は未実装)");
  }
  moonHit.addEventListener("click", onMoonClick);

  scene.appendChild(el("rect", { x: 0, y: HORIZON_Y, width: W, height: H - HORIZON_Y, fill: "url(#bpgSeaGrad)" }));

  // ---------- 海面のきらめき ----------
  const glitterGroup = el("g", {});
  const bottomY = H - 30;
  const rows = 28;
  function glitterColor(t) {
    const from = [108, 122, 153],
      to = [245, 245, 236];
    const c = from.map((v, i) => Math.round(v + (to[i] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  const glitterCol = glitterColor(illumination);
  const glitterMax = Math.max(0.1, illumination);
  for (let i = 0; i < rows; i++) {
    const yRatio = i / rows;
    const y = GLITTER_TOP_Y + yRatio * (bottomY - GLITTER_TOP_Y);
    const spread = 5 + yRatio * 65;
    const segCount = 2 + Math.floor(yRatio * 4);
    for (let s = 0; s < segCount; s++) {
      const dx = (Math.random() - 0.5) * spread;
      const w = (6 + Math.random() * 16) * (0.4 + yRatio);
      const op = (0.55 - yRatio * 0.25) * (0.6 + Math.random() * 0.5) * glitterMax;
      const rect = el("rect", {
        x: moonCx + dx - w / 2,
        y,
        width: w,
        height: 1.3 + Math.random() * 1.1,
        rx: 1,
        fill: glitterCol,
        class: "shimmer",
      });
      rect.style.setProperty("--base-op", Math.max(0.05, op));
      rect.style.animationDelay = Math.random() * 3 + "s";
      glitterGroup.appendChild(rect);
    }
  }
  scene.appendChild(glitterGroup);

  const wavePath = el("path", { fill: "none", stroke: "rgba(233,234,242,0.15)", "stroke-width": 1 });
  scene.appendChild(wavePath);

  // ---------- 岩(W追従の比例スケール) ----------
  const rockMain = el("path", {
    d: `M0,${H} L0,420
       Q ${sx(20)},380 ${sx(60)},395
       Q ${sx(90)},360 ${sx(130)},375
       Q ${sx(160)},340 ${sx(195)},355
       Q ${sx(225)},330 ${sx(255)},345
       L ${sx(300)},${H} Z`,
    fill: "#010203",
  });
  scene.appendChild(rockMain);

  const rockSmall1 = el("path", {
    d: `M${sx(330)},${H} L${sx(340)},470 Q${sx(365)},455 ${sx(385)},468 Q${sx(405)},458 ${sx(420)},475 L${sx(430)},${H} Z`,
    fill: "#010203",
  });
  scene.appendChild(rockSmall1);

  const rockSmall2 = el("path", {
    d: `M${sx(600)},${H} L${sx(610)},478 Q${sx(635)},465 ${sx(655)},478 L${sx(665)},${H} Z`,
    fill: "#010203",
  });
  scene.appendChild(rockSmall2);

  if (illumination > 0.85) {
    const wolfGroup = el("g", { transform: `translate(${sx(70)},258) scale(1.55)` });
    const wolf = el("path", {
      d: `M0,70 C -4,60 -2,50 6,46 C 4,40 8,35 14,36 C 22,30 34,28 44,22 C 50,10 58,-2 66,-14 C 68,-18 72,-17 71,-12 C 69,-4 66,4 62,12 C 68,10 74,12 76,18 C 82,16 88,20 86,26 C 92,26 96,32 92,37 C 96,40 96,46 90,47 L 78,47 C 76,54 68,58 58,56 L 50,72 L 42,72 L 46,58 C 40,58 34,57 30,54 L 24,72 L 16,72 L 20,55 C 12,54 4,58 4,64 C 4,68 2,70 0,70 Z`,
      fill: "#010203",
    });
    wolfGroup.appendChild(wolf);
    wolfGroup.appendChild(el("path", { d: "M64,-13 L58,-4 L67,-6 Z", fill: "#010203" }));
    wolfGroup.appendChild(el("path", { d: "M70,-15 L66,-6 L74,-9 Z", fill: "#010203" }));
    scene.appendChild(wolfGroup);
  }

  // ---------- 日付・時間(縦書き、空の左上) ----------
  const dateStartX = W * 0.1;
  const dateStartY = H * 0.15;
  const colGap = 24;
  const poetic = buildPoeticDate(now);
  const dateGroup = el("g", { id: "dateText" });
  const dateLine1 = el("text", {
    x: dateStartX,
    y: dateStartY,
    fill: "rgba(237,238,244,0.82)",
    "font-size": "15",
    "letter-spacing": "0.14em",
    "font-family": 'Georgia, "Yu Mincho", serif',
    style: "writing-mode: vertical-rl; text-orientation: upright;",
  });
  dateLine1.textContent = poetic.line1;
  dateGroup.appendChild(dateLine1);
  const dateLine2 = el("text", {
    x: dateStartX - colGap,
    y: dateStartY,
    fill: "rgba(201,169,106,0.78)",
    "font-size": "12",
    "letter-spacing": "0.3em",
    "font-family": 'Georgia, "Yu Mincho", serif',
    style: "writing-mode: vertical-rl; text-orientation: upright;",
  });
  dateLine2.textContent = poetic.line2;
  dateGroup.appendChild(dateLine2);
  scene.appendChild(dateGroup);
  const dateHit = el("rect", {
    id: "dateHit",
    x: dateStartX - colGap - 14,
    y: dateStartY - 12,
    width: 66,
    height: 220,
    fill: "transparent",
  });
  scene.appendChild(dateHit);
  let dateRevealed = false;
  function onDateClick() {
    dateRevealed = !dateRevealed;
    dateGroup.classList.toggle("revealed", dateRevealed);
  }
  dateHit.addEventListener("click", onDateClick);

  // 文字数ベースでざっくり折り返す(日本語はスペース区切りがないため文字数で判定)。
  // 過去の投稿・歌詞演出のどちらでも使う共通関数。
  function wrapByChars(text, maxChars) {
    const lines = [];
    let cur = "";
    for (const ch of text) {
      cur += ch;
      if (cur.length >= maxChars) {
        lines.push(cur);
        cur = "";
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  // ---------- 過去の投稿ランダム表示 ----------
  const postY = H - H * 0.275;
  const POST_FONT_SIZE = 14;
  const POST_LINE_HEIGHT = POST_FONT_SIZE * 1.7;
  const MAX_CHARS_PER_POST_LINE = 18;
  let onPostClick = null;
  let postHit = null;
  let postGroup = null;
  if (randomPost) {
    const postLines = wrapByChars(randomPost, MAX_CHARS_PER_POST_LINE);
    postGroup = el("g", { id: "postText" });
    const postTextEl = el("text", {
      x: W / 2,
      y: postY,
      "text-anchor": "middle",
      fill: "rgba(237,238,244,0.8)",
      "font-size": POST_FONT_SIZE,
      "letter-spacing": "0.06em",
      "font-family": 'Georgia, "Yu Mincho", serif',
    });
    const startDy = -((postLines.length - 1) / 2) * POST_LINE_HEIGHT;
    postLines.forEach((line, i) => {
      const tspan = el("tspan", { x: W / 2, dy: i === 0 ? startDy : POST_LINE_HEIGHT });
      tspan.textContent = line;
      postTextEl.appendChild(tspan);
    });
    postGroup.appendChild(postTextEl);
    scene.appendChild(postGroup);

    const postHitHeight = postLines.length * POST_LINE_HEIGHT + 24;
    const postHitWidth = Math.min(W - 60, MAX_CHARS_PER_POST_LINE * POST_FONT_SIZE * 1.15);
    postHit = el("rect", {
      id: "postHit",
      x: W / 2 - postHitWidth / 2,
      y: postY - postHitHeight / 2,
      width: postHitWidth,
      height: postHitHeight,
      fill: "transparent",
    });
    scene.appendChild(postHit);
    let postRevealed = false;
    onPostClick = () => {
      postRevealed = !postRevealed;
      postGroup.classList.toggle("revealed", postRevealed);
    };
    postHit.addEventListener("click", onPostClick);
  }

  // ---------- 歌詞演出 ----------
  let onLyricClick = null;
  let lyricHit = null;
  let lyricGroup = null;
  if (lyricPool && lyricPool.length > 0) {
    const chosenLyric = lyricPool[Math.floor(Math.random() * lyricPool.length)];
    const lyricVertical = Math.random() < 0.5;

    function rectsOverlap(a, b) {
      return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
    }

    const LYRIC_FONT_SIZE = 13;
    const LYRIC_CHAR_SIZE = LYRIC_FONT_SIZE * 1.25;
    const LYRIC_LINE_HEIGHT = LYRIC_FONT_SIZE * 1.8;
    const LYRIC_COL_GAP = 24;
    const MAX_CHARS_PER_LINE = 14;
    const MAX_CHARS_PER_COL = 11;

    const lyricLines = wrapByChars(chosenLyric, lyricVertical ? MAX_CHARS_PER_COL : MAX_CHARS_PER_LINE);

    let lyricHalfW, lyricHalfH;
    if (lyricVertical) {
      const maxColLen = Math.max(...lyricLines.map((l) => l.length));
      lyricHalfW = (lyricLines.length * LYRIC_COL_GAP) / 2 + 12;
      lyricHalfH = (maxColLen * LYRIC_CHAR_SIZE) / 2 + 12;
    } else {
      const maxLineLen = Math.max(...lyricLines.map((l) => l.length));
      lyricHalfW = (maxLineLen * LYRIC_CHAR_SIZE) / 2 + 12;
      lyricHalfH = (lyricLines.length * LYRIC_LINE_HEIGHT) / 2 + 12;
    }

    // 過去の投稿の当たり判定は、折り返し後の実サイズに応じて可変なので、
    // 実際に作られたpostHitの範囲があればそれを使い、なければ控えめな既定値にする
    const postZone = postHit
      ? {
          x1: Number(postHit.getAttribute("x")),
          y1: Number(postHit.getAttribute("y")),
          x2: Number(postHit.getAttribute("x")) + Number(postHit.getAttribute("width")),
          y2: Number(postHit.getAttribute("y")) + Number(postHit.getAttribute("height")),
        }
      : { x1: W / 2 - 150, y1: postY - 40, x2: W / 2 + 150, y2: postY + 40 };

    const exclusionZones = [
      { x1: moonCx - 95, y1: moonCy - 95, x2: moonCx + 95, y2: moonCy + 95 },
      { x1: dateStartX - colGap - 14 - 15, y1: dateStartY - 12 - 15, x2: dateStartX + 14 + 15, y2: dateStartY + 220 + 15 },
      { x1: originXc - 15, y1: originYc - 15, x2: originXc + boxW + 15, y2: originYc + boxH + 15 },
      postZone,
      { x1: 0, y1: H - 140, x2: 230, y2: H },
    ];

    const EDGE_MARGIN = 55;
    const cxMin = EDGE_MARGIN + lyricHalfW,
      cxMax = W - EDGE_MARGIN - lyricHalfW;
    const cyMin = EDGE_MARGIN + lyricHalfH,
      cyMax = H - EDGE_MARGIN - lyricHalfH;
    const canPlaceX = cxMin <= cxMax,
      canPlaceY = cyMin <= cyMax;

    let lyricX = W / 2,
      lyricY = H / 2;
    for (let attempt = 0; attempt < 40; attempt++) {
      const cx = canPlaceX ? cxMin + Math.random() * (cxMax - cxMin) : W / 2;
      const cy = canPlaceY ? cyMin + Math.random() * (cyMax - cyMin) : H / 2;
      const box = { x1: cx - lyricHalfW, y1: cy - lyricHalfH, x2: cx + lyricHalfW, y2: cy + lyricHalfH };
      const collide = exclusionZones.some((z) => rectsOverlap(box, z));
      if (!collide) {
        lyricX = cx;
        lyricY = cy;
        break;
      }
    }

    lyricGroup = el("g", { id: "lyricText" });
    if (lyricVertical) {
      const colCount = lyricLines.length;
      lyricLines.forEach((line, i) => {
        const colX = lyricX + ((colCount - 1) / 2 - i) * LYRIC_COL_GAP;
        const colEl = el("text", {
          x: colX,
          y: lyricY,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: "rgba(240,240,246,0.88)",
          "font-size": LYRIC_FONT_SIZE,
          "letter-spacing": "0.08em",
          "font-family": 'Georgia, "Yu Mincho", serif',
          style: "writing-mode: vertical-rl; text-orientation: upright;",
        });
        colEl.textContent = line;
        lyricGroup.appendChild(colEl);
      });
    } else {
      const textEl = el("text", {
        x: lyricX,
        y: lyricY,
        "text-anchor": "middle",
        fill: "rgba(240,240,246,0.88)",
        "font-size": LYRIC_FONT_SIZE,
        "letter-spacing": "0.08em",
        "font-family": 'Georgia, "Yu Mincho", serif',
      });
      const startDy = -((lyricLines.length - 1) / 2) * LYRIC_LINE_HEIGHT;
      lyricLines.forEach((line, i) => {
        const tspan = el("tspan", { x: lyricX, dy: i === 0 ? startDy : LYRIC_LINE_HEIGHT });
        tspan.textContent = line;
        textEl.appendChild(tspan);
      });
      lyricGroup.appendChild(textEl);
    }
    scene.appendChild(lyricGroup);

    lyricHit = el("rect", {
      id: "lyricHit",
      x: lyricX - lyricHalfW,
      y: lyricY - lyricHalfH,
      width: lyricHalfW * 2,
      height: lyricHalfH * 2,
      fill: "transparent",
    });
    scene.appendChild(lyricHit);
    let lyricRevealed = false;
    onLyricClick = () => {
      lyricRevealed = !lyricRevealed;
      lyricGroup.classList.toggle("revealed", lyricRevealed);
    };
    lyricHit.addEventListener("click", onLyricClick);
  }

  // ---------- 天文イベント(左下タップ) ----------
  const ASTRO_EVENTS = [
    { name: "しぶんぎ座流星群", month: 1, day: 4 },
    { name: "こと座流星群", month: 4, day: 22 },
    { name: "みずがめ座η流星群", month: 5, day: 6 },
    { name: "ペルセウス座流星群", month: 8, day: 13 },
    { name: "オリオン座流星群", month: 10, day: 21 },
    { name: "しし座流星群", month: 11, day: 17 },
    { name: "ふたご座流星群", month: 12, day: 14 },
    { name: "こぐま座流星群", month: 12, day: 22 },
  ];
  function daysUntil(date, month, day) {
    const y = date.getFullYear();
    let target = new Date(y, month - 1, day);
    target.setHours(0, 0, 0, 0);
    const d0 = new Date(date);
    d0.setHours(0, 0, 0, 0);
    if (target < d0) target = new Date(y + 1, month - 1, day);
    return Math.round((target - d0) / 86400000);
  }
  function nearestAstroEvent(date) {
    let best = null;
    ASTRO_EVENTS.forEach((ev) => {
      const d = daysUntil(date, ev.month, ev.day);
      if (best === null || d < best.days) best = Object.assign({}, ev, { days: d });
    });
    return best;
  }
  const nextEvent = nearestAstroEvent(now);
  const astroMsg =
    nextEvent.days === 0
      ? `<b>${nextEvent.name}</b><br>今夜がピークです`
      : `<b>${nextEvent.name}</b><br>ピークまであと${nextEvent.days}日(${nextEvent.month}月${nextEvent.day}日)`;
  if (astroPanelEl) astroPanelEl.innerHTML = astroMsg;
  let astroRevealed = false;
  function onInfoClick() {
    astroRevealed = !astroRevealed;
    astroPanelEl?.classList.toggle("revealed", astroRevealed);
  }
  info?.addEventListener("click", onInfoClick);

  // ---------- 波アニメーション ----------
  let t = 0;
  const baseAmp = 3 + tidalStrength * 7;
  function animateWave() {
    t += 0.012;
    let d = `M0,${HORIZON_Y}`;
    for (let x = 0; x <= W; x += 40) {
      const y = HORIZON_Y + Math.sin(x * 0.02 + t) * baseAmp * 0.3 + Math.sin(t * 0.6) * baseAmp * 0.5;
      d += ` L${x},${y}`;
    }
    wavePath.setAttribute("d", d);
    rafIds.push(requestAnimationFrame(animateWave));
  }
  animateWave();

  // ---------- 流れ星(数百回に1回程度) ----------
  const SHOOTING_STAR_PROBABILITY = 1 / 150;
  const FORCE_SHOOTING_STAR_FOR_DEMO = false; // 動作確認したい時だけ true にする

  function spawnShootingStar() {
    const startX = Math.random() * W * 0.6;
    const startY = Math.random() * HORIZON_Y * 0.45;
    const angle = ((18 + Math.random() * 22) * Math.PI) / 180;
    const length = 100 + Math.random() * 70;
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    const glow = el("circle", { cx: startX, cy: startY, r: 2.2, fill: "#F5F3EA", opacity: 0 });
    const trail = el("line", { x1: startX, y1: startY, x2: startX, y2: startY, stroke: "#F5F3EA", "stroke-width": 1.6, "stroke-linecap": "round", opacity: 0 });
    scene.appendChild(trail);
    scene.appendChild(glow);
    const dur = 750;
    const t0 = performance.now();
    function frame(now2) {
      const tt = Math.min(1, (now2 - t0) / dur);
      const op = tt < 0.12 ? tt / 0.12 : Math.max(0, 1 - (tt - 0.12) / 0.88);
      const headX = startX + (endX - startX) * tt;
      const headY = startY + (endY - startY) * tt;
      const tailT = Math.max(0, tt - 0.4);
      const tailX = startX + (endX - startX) * tailT;
      const tailY = startY + (endY - startY) * tailT;
      trail.setAttribute("x1", tailX);
      trail.setAttribute("y1", tailY);
      trail.setAttribute("x2", headX);
      trail.setAttribute("y2", headY);
      trail.setAttribute("opacity", op);
      glow.setAttribute("cx", headX);
      glow.setAttribute("cy", headY);
      glow.setAttribute("opacity", op);
      if (tt < 1) {
        rafIds.push(requestAnimationFrame(frame));
      } else {
        trail.remove();
        glow.remove();
      }
    }
    rafIds.push(requestAnimationFrame(frame));
  }
  function maybeSpawnShootingStar() {
    const shouldSpawn = FORCE_SHOOTING_STAR_FOR_DEMO || Math.random() < SHOOTING_STAR_PROBABILITY;
    if (!shouldSpawn) return;
    const delay = 1500 + Math.random() * 5000;
    timeoutIds.push(setTimeout(spawnShootingStar, delay));
  }
  maybeSpawnShootingStar();

  // ---------- デバッグ情報 ----------
  if (info) {
    info.innerHTML = `
      <div><b>月齢:</b> ${phaseName(moonPhase)} (${(moonPhase * 29.53).toFixed(1)}日目)</div>
      <div><b>照度:</b> ${(illumination * 100).toFixed(0)}%</div>
      <div><b>潮:</b> ${tidalStrength > 0.6 ? "大潮寄り" : tidalStrength < 0.4 ? "小潮寄り" : "中間"}</div>
      <div><b>季節/星座:</b> ${season} / ${chosen.name}</div>
    `;
  }

  // ---------- 後始末 ----------
  return function dispose() {
    rafIds.forEach((id) => cancelAnimationFrame(id));
    timeoutIds.forEach((id) => clearTimeout(id));
    constHitGroup.removeEventListener("click", onConstClick);
    moonHit.removeEventListener("click", onMoonClick);
    dateHit.removeEventListener("click", onDateClick);
    if (postHit && onPostClick) postHit.removeEventListener("click", onPostClick);
    if (lyricHit && onLyricClick) lyricHit.removeEventListener("click", onLyricClick);
    info?.removeEventListener("click", onInfoClick);
    while (scene.firstChild) scene.removeChild(scene.firstChild);
  };
}
