import { S } from './state';
import { PE, screenToWorldT, zoomAt, rotateView } from './camera';
import { lerp } from './rng';
import { ensureAudio } from './audio';
import { paintAt, holeToolTap, buildTap, buyLandTap, playerAimIntent, playerFire, setClub, setShape, setSpeed, setHint, beginPaintStroke, updatePlayHud, pickGolferAtScreen, selectGolfer } from './engine';
import { shotShortcutForEvent } from './shotShortcuts';
import type { Aim } from './types';
import { pointerStartsAtPlayerBall } from './playerAimHit';

const HOLE_HINT = 'Tap the map to place the TEE.';

/** Game-wide shortcuts must never steal activation or text entry from UI controls. */
export function isInteractiveShortcutTarget(target: EventTarget | null): boolean {
  const candidate = target as { closest?: (selector: string) => unknown; isContentEditable?: boolean } | null;
  if (!candidate) return false;
  if (candidate.isContentEditable) return true;
  return typeof candidate.closest === 'function' && !!candidate.closest('button, input, select, textarea, summary, a[href], [role="button"], [contenteditable="true"]');
}

export function isCanvasShortcutTarget(target: EventTarget | null, canvas: EventTarget, activeElement: EventTarget | null): boolean {
  return !isInteractiveShortcutTarget(target) && target === canvas && activeElement === canvas;
}

export function isGameShortcutSurface(
  target: EventTarget | null,
  canvas: EventTarget,
  activeElement: EventTarget | null,
  body: EventTarget | null,
  documentElement: EventTarget | null,
): boolean {
  const bodyFocused = target === body && (activeElement === body || activeElement === null);
  const documentFocused = target === documentElement && (activeElement === documentElement || activeElement === null);
  return !isInteractiveShortcutTarget(target) && (
    isCanvasShortcutTarget(target, canvas, activeElement) || bodyFocused || documentFocused
  );
}

export function keyboardAimState(angle: number, power: number): Aim {
  return {
    on: true,
    sx: 0,
    sy: 0,
    cx: 0,
    cy: 0,
    kind: 'keyboard',
    worldDirX: Math.cos(angle),
    worldDirY: Math.sin(angle),
    worldPower: power,
  };
}

export function updatePointerAim(aim: Aim | null, x: number, y: number): boolean {
  if (!aim?.on || aim.kind === 'keyboard') return false;
  aim.cx = x;
  aim.cy = y;
  return true;
}

export function spaceHeldAfterKeyUp(held: boolean, key: string): boolean {
  return key === ' ' ? false : held;
}

export interface KeyboardAimMemory {
  angle: number | null;
  power: number;
  origin: string;
}

export function resetKeyboardAimMemory(memory: KeyboardAimMemory): void {
  memory.angle = null;
  memory.origin = '';
}

/** Binds pointer/wheel/keyboard handlers to the canvas. Returns a cleanup fn. */
export function bindInput(cv: HTMLCanvasElement): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let panDrag: { sx: number; sy: number; cx: number; cy: number } | null = null;
  let painting = false;
  let lastPaint: { x: number; y: number } | null = null;
  let pinch: { d: number; mx: number; my: number } | null = null;
  let spaceHeld = false;
  const keyboardAim: KeyboardAimMemory = { angle: null, power: 0.75, origin: '' };
  let elevationDelay: number | null = null;
  let elevationRepeat: number | null = null;
  let elevationHold: { pointerId: number; x: number; y: number } | null = null;

  const pos = (e: PointerEvent) => {
    const rect = cv.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const updatePlayerAimCursor = (p: { x: number; y: number }, pointerType: string) => {
    const player = S.mode === 'play' && S.player?.state === 'aim' ? S.player : null;
    const ready = !!player?.ball && pointerStartsAtPlayerBall(p, PE(player.ball.x, player.ball.y), pointerType);
    cv.classList.toggle('playerBallReady', ready);
    return ready;
  };

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
    cv.focus({ preventScroll: true });
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
    if (S.mode === 'play' && S.player && S.player.state === 'aim' && updatePlayerAimCursor(p, e.pointerType)) {
      S.player.aim = { on: true, sx: p.x, sy: p.y, cx: p.x, cy: p.y, kind: 'pointer' };
      cv.classList.add('playerAimActive');
      updatePlayHud();
      return;
    }
    const w = screenToWorldT(p.x, p.y);
    if (S.mode === 'play') {
      S.camTarget = null;
      panDrag = { sx: p.x, sy: p.y, cx: S.cam.x, cy: S.cam.y };
      return;
    }
    if (S.tool === 'inspect') {
      const golfer = pickGolferAtScreen(p.x, p.y, e.pointerType === 'touch');
      selectGolfer(golfer);
      S.camTarget = null;
      if (!golfer) panDrag = { sx: p.x, sy: p.y, cx: S.cam.x, cy: S.cam.y };
      return;
    }
    if (S.tool === 'pan') {
      // a tap that lands on a golfer opens their profile; empty ground pans
      const golfer = pickGolferAtScreen(p.x, p.y, e.pointerType === 'touch');
      if (golfer) {
        selectGolfer(golfer);
        S.camTarget = null;
        return;
      }
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
    if (!S.player?.aim?.on) updatePlayerAimCursor(p, e.pointerType);
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
    if (S.player && updatePointerAim(S.player.aim, p.x, p.y)) {
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
    if (S.player && S.player.aim && S.player.aim.on && S.player.aim.kind !== 'keyboard' && pointers.size === 0) {
      const a = S.player.aim;
      const intent = playerAimIntent(a, S.player.lie);
      S.player.aim = null;
      if (intent && intent.rawPower >= 0.3 / 9) playerFire(intent.dirX, intent.dirY, intent.power);
    }
    cv.classList.remove('playerAimActive');
    if (S.player?.ball) updatePlayerAimCursor(pos(e), e.pointerType);
    painting = false;
    panDrag = null;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    S.camTarget = null;
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.89);
    if (S.player?.aim?.on) updatePlayHud();
  }
  function onContext(e: Event) {
    e.preventDefault();
  }
  function onKey(e: KeyboardEvent) {
    const doc = typeof document !== 'undefined' ? document : null;
    const activeElement = doc?.activeElement ?? null;
    const canvasFocused = isCanvasShortcutTarget(e.target, cv, activeElement);
    if (!isGameShortcutSurface(e.target, cv, activeElement, doc?.body ?? null, doc?.documentElement ?? null)) return;
    if (e.key === 'Escape') {
      let handled = false;
      if (S.player && S.player.aim) {
        S.player.aim = null;
        resetKeyboardAimMemory(keyboardAim);
        updatePlayHud();
        handled = true;
      }
      else if (S.holeDraft) {
        S.holeDraft = null;
        setHint(HOLE_HINT);
        handled = true;
      }
      else if (S.selectedGolfer) {
        selectGolfer(null);
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        return;
      }
    }
    if (canvasFocused && S.mode === 'play' && S.player?.state === 'aim' && S.player.ball) {
      const shotShortcut = S.player.lie === 'green' ? null : shotShortcutForEvent(e);
      if (shotShortcut) {
        e.preventDefault();
        if (shotShortcut.kind === 'club') setClub(shotShortcut.id);
        else setShape(shotShortcut.id);
        return;
      }
      const hole = S.holes[S.player.holeIdx];
      const aimOrigin = `${S.player.holeIdx}:${S.player.ball.x.toFixed(3)}:${S.player.ball.y.toFixed(3)}`;
      if (aimOrigin !== keyboardAim.origin) {
        keyboardAim.origin = aimOrigin;
        keyboardAim.angle = hole ? Math.atan2(hole.cup.y - S.player.ball.y, hole.cup.x - S.player.ball.x) : null;
        keyboardAim.power = 0.75;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keyboardAim.angle = (keyboardAim.angle ?? 0) + (e.key === 'ArrowLeft' ? -Math.PI / 18 : Math.PI / 18);
        setKeyboardAim(keyboardAim.angle, keyboardAim.power);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = S.player.lie === 'green' ? 0.05 : 0.1;
        const minimum = S.player.lie === 'green' ? 0.02 : 0.08;
        keyboardAim.power = Math.max(minimum, Math.min(1, keyboardAim.power + (e.key === 'ArrowUp' ? step : -step)));
        setKeyboardAim(keyboardAim.angle ?? 0, keyboardAim.power);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const keyboardIntent = S.player.aim?.kind === 'keyboard' ? playerAimIntent(S.player.aim, S.player.lie) : null;
        const angle = keyboardAim.angle ?? 0;
        playerFire(keyboardIntent?.dirX ?? Math.cos(angle), keyboardIntent?.dirY ?? Math.sin(angle), keyboardIntent?.power ?? keyboardAim.power);
        resetKeyboardAimMemory(keyboardAim);
        return;
      }
    }
    if (canvasFocused && e.key === ' ') {
      e.preventDefault();
      spaceHeld = true; // hold to pan
    }
    if (e.key === 'p' || e.key === 'P') setSpeed(S.speed === 0 ? 1 : 0);
    if (e.key === 'r') {
      rotateView(1);
      if (S.player?.aim?.on) updatePlayHud();
    }
    if (e.key === 'R') {
      rotateView(-1);
      if (S.player?.aim?.on) updatePlayHud();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    spaceHeld = spaceHeldAfterKeyUp(spaceHeld, e.key);
    if (isInteractiveShortcutTarget(e.target)) return;
  }

  function setKeyboardAim(angle: number, power: number) {
    const player = S.player;
    if (!player?.ball) return;
    player.aim = keyboardAimState(angle, power);
    updatePlayHud();
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
    cv.classList.remove('playerBallReady', 'playerAimActive');
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
