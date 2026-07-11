import { S } from './state';
import { screenToWorld, screenToWorldT, zoomAt, rotateView } from './camera';
import { lerp } from './rng';
import { ensureAudio } from './audio';
import { paintAt, holeToolTap, buildTap, buyLandTap, playerFire, setSpeed, setHint, beginPaintStroke, updatePlayHud } from './engine';

const HOLE_HINT = 'Tap the map to place the TEE.';

/** Binds pointer/wheel/keyboard handlers to the canvas. Returns a cleanup fn. */
export function bindInput(cv: HTMLCanvasElement): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let panDrag: { sx: number; sy: number; cx: number; cy: number } | null = null;
  let painting = false;
  let lastPaint: { x: number; y: number } | null = null;
  let pinch: { d: number; mx: number; my: number } | null = null;
  let spaceHeld = false;
  let keyboardAimAngle: number | null = null;
  let keyboardPower = 0.75;
  let keyboardAimOrigin = '';
  let elevationDelay: number | null = null;
  let elevationRepeat: number | null = null;
  let elevationHold: { pointerId: number; x: number; y: number } | null = null;

  const pos = (e: PointerEvent) => ({ x: e.clientX, y: e.clientY });

  function cancelElevationHold() {
    if (elevationDelay !== null) window.clearTimeout(elevationDelay);
    if (elevationRepeat !== null) window.clearInterval(elevationRepeat);
    elevationDelay = null;
    elevationRepeat = null;
    elevationHold = null;
  }

  function startElevationHold(pointerId: number, p: { x: number; y: number }) {
    cancelElevationHold();
    elevationHold = { pointerId, x: p.x, y: p.y };
    elevationDelay = window.setTimeout(() => {
      const repeat = () => {
        if (!painting || !elevationHold || (S.tool !== 'raise' && S.tool !== 'lower')) return cancelElevationHold();
        const held = pointers.get(elevationHold.pointerId);
        if (!held) return cancelElevationHold();
        const w = screenToWorldT(held.x, held.y);
        beginPaintStroke();
        paintAt(w.x, w.y);
      };
      repeat();
      elevationRepeat = window.setInterval(repeat, 260);
    }, 430);
  }

  function onDown(e: PointerEvent) {
    ensureAudio();
    cv.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, pos(e));
    if (pointers.size === 2) {
      cancelElevationHold();
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      painting = false;
      panDrag = null;
      if (S.player) S.player.aim = null;
      return;
    }
    const p = pos(e);
    if (spaceHeld) {
      // hold SPACE: temporary pan with any tool
      S.camTarget = null;
      panDrag = { sx: p.x, sy: p.y, cx: S.cam.x, cy: S.cam.y };
      return;
    }
    if (S.mode === 'play' && S.player && S.player.state === 'aim') {
      S.player.aim = { on: true, sx: p.x, sy: p.y, cx: p.x, cy: p.y };
      updatePlayHud();
      return;
    }
    const w = screenToWorldT(p.x, p.y);
    if (S.mode === 'play') {
      S.camTarget = null;
      panDrag = { sx: p.x, sy: p.y, cx: S.cam.x, cy: S.cam.y };
      return;
    }
    if (S.tool === 'pan') {
      S.camTarget = null;
      panDrag = { sx: p.x, sy: p.y, cx: S.cam.x, cy: S.cam.y };
      return;
    }
    if (S.tool === 'hole') {
      holeToolTap(w.x, w.y);
      return;
    }
    if (S.tool === 'land') {
      buyLandTap(w.x, w.y);
      return;
    }
    if (S.tool === 'build') {
      buildTap(w.x, w.y);
      return;
    }
    painting = true;
    lastPaint = w;
    beginPaintStroke();
    paintAt(w.x, w.y);
    if (S.tool === 'raise' || S.tool === 'lower') startElevationHold(e.pointerId, p);
  }

  function onMove(e: PointerEvent) {
    const p = pos(e);
    if (elevationHold && e.pointerId === elevationHold.pointerId && Math.hypot(p.x - elevationHold.x, p.y - elevationHold.y) > 7) cancelElevationHold();
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    const w = screenToWorldT(p.x, p.y);
    S.hover = { x: Math.floor(w.x), y: Math.floor(w.y) };
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (pinch.d > 0) zoomAt(mx, my, d / pinch.d);
      S.cam.x += mx - pinch.mx;
      S.cam.y += my - pinch.my;
      pinch = { d, mx, my };
      return;
    }
    if (S.player && S.player.aim && S.player.aim.on) {
      S.player.aim.cx = p.x;
      S.player.aim.cy = p.y;
      updatePlayHud();
      return;
    }
    if (panDrag) {
      S.cam.x = panDrag.cx + (p.x - panDrag.sx);
      S.cam.y = panDrag.cy + (p.y - panDrag.sy);
      return;
    }
    if (painting && lastPaint) {
      const steps = Math.ceil(Math.hypot(w.x - lastPaint.x, w.y - lastPaint.y) / 0.5) || 1;
      for (let i = 1; i <= steps; i++) paintAt(lerp(lastPaint.x, w.x, i / steps), lerp(lastPaint.y, w.y, i / steps));
      lastPaint = w;
    }
  }

  function onUp(e: PointerEvent) {
    if (elevationHold?.pointerId === e.pointerId) cancelElevationHold();
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (S.player && S.player.aim && S.player.aim.on && pointers.size === 0) {
      const a = S.player.aim;
      const w0 = screenToWorld(a.sx, a.sy);
      const w1 = screenToWorld(a.cx, a.cy);
      const dx = w0.x - w1.x;
      const dy = w0.y - w1.y;
      const pl = Math.hypot(dx, dy);
      S.player.aim = null;
      if (pl >= 0.3) playerFire(dx / pl, dy / pl, pl / 9);
    }
    painting = false;
    panDrag = null;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    S.camTarget = null;
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.89);
  }
  function onContext(e: Event) {
    e.preventDefault();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (S.player && S.player.aim) S.player.aim = null;
      else if (S.holeDraft) {
        S.holeDraft = null;
        setHint(HOLE_HINT);
      }
    }
    if (S.mode === 'play' && S.player?.state === 'aim' && S.player.ball) {
      const hole = S.holes[S.player.holeIdx];
      const aimOrigin = `${S.player.holeIdx}:${S.player.ball.x.toFixed(3)}:${S.player.ball.y.toFixed(3)}`;
      if (aimOrigin !== keyboardAimOrigin) {
        keyboardAimOrigin = aimOrigin;
        keyboardAimAngle = hole ? Math.atan2(hole.cup.y - S.player.ball.y, hole.cup.x - S.player.ball.x) : null;
        keyboardPower = 0.75;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keyboardAimAngle = (keyboardAimAngle ?? 0) + (e.key === 'ArrowLeft' ? -Math.PI / 18 : Math.PI / 18);
        setHint(`Keyboard aim ${Math.round((((keyboardAimAngle * 180) / Math.PI) + 360) % 360)}° · ${Math.round(keyboardPower * 100)}% power · Enter to swing.`);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keyboardPower = Math.max(0.1, Math.min(1, keyboardPower + (e.key === 'ArrowUp' ? 0.1 : -0.1)));
        setHint(`Keyboard aim ${Math.round(((((keyboardAimAngle ?? 0) * 180) / Math.PI) + 360) % 360)}° · ${Math.round(keyboardPower * 100)}% power · Enter to swing.`);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const angle = keyboardAimAngle ?? 0;
        playerFire(Math.cos(angle), Math.sin(angle), keyboardPower);
        keyboardAimAngle = null;
        return;
      }
    }
    if (e.key === ' ') {
      e.preventDefault();
      spaceHeld = true; // hold to pan
    }
    if (e.key === 'p' || e.key === 'P') setSpeed(S.speed === 0 ? 1 : 0);
    if (e.key === 'r') rotateView(1);
    if (e.key === 'R') rotateView(-1);
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.key === ' ') spaceHeld = false;
  }

  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('contextmenu', onContext);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelElevationHold();
    cv.removeEventListener('pointerdown', onDown);
    cv.removeEventListener('pointermove', onMove);
    cv.removeEventListener('pointerup', onUp);
    cv.removeEventListener('pointercancel', onUp);
    cv.removeEventListener('wheel', onWheel);
    cv.removeEventListener('contextmenu', onContext);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
  };
}
