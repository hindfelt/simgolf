import { useEffect, useRef } from 'react';
import { initMap, update, updateTopbar, setTool, loadPortfolioGame, saveGame } from '../game/engine';
import { fitCamera, P, PE, screenToWorld } from '../game/camera';
import { S } from '../game/state';
import { draw } from '../game/render';
import { bindInput } from '../game/input';
import { useUI } from './store';

let bootPromise: Promise<boolean> | null = null;

export default function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const setUI = useUI((s) => s.set);
  const pushTicker = useUI((s) => s.pushTicker);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let cssW = window.innerWidth;
    let cssH = window.innerHeight;

    function resize() {
      // Cap the backing store at 2x: on 3x phones (iPhone) this renders 2.25x
      // fewer pixels per frame with no visible loss on a moving isometric scene.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
      cv.style.width = cssW + 'px';
      cv.style.height = cssH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S.view = { w: cssW, h: cssH };
    }
    resize();

    const unbind = bindInput(cv);
    // iOS Safari suspends home-screen apps without a reliable pagehide; save on hide too.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveGame();
    };
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', saveGame);
    document.addEventListener('visibilitychange', onVisibility);

    let cancelled = false;
    let raf = 0;
    let lastTs = 0;
    let lastFrameTs = 0;
    // 60fps is plenty for the sim; without a cap, 120Hz displays (ProMotion
    // iPads/iPhones) run the whole update+draw twice as often for no benefit.
    const FRAME_INTERVAL = 1000 / 61;
    function tick(ts: number) {
      raf = requestAnimationFrame(tick);
      if (ts - lastFrameTs < FRAME_INTERVAL) return;
      lastFrameTs = ts;
      const dt = Math.min(Math.max((ts - lastTs) / 1000, 0), 0.05) || 0.016;
      lastTs = ts;
      update(dt);
      draw(ctx, cssW, cssH);
    }

    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__sim = { S, P, PE, screenToWorld };
    if (!bootPromise) {
      bootPromise = (async () => {
        const resumed = await loadPortfolioGame();
        if (!resumed) initMap();
        updateTopbar();
        setTool('hole');
        fitCamera(cssW, cssH);
        if (!resumed) setUI({ modal: { kind: 'newCourse', initial: true } });
        pushTicker('Pro shop', resumed ? 'Welcome back, boss. The course missed you.' : 'Hole 1 is open. Golfers are on their way!', 'money');
        return resumed;
      })();
    }
    void bootPromise.then(() => {
      if (!cancelled) raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pagehide', saveGame);
      document.removeEventListener('visibilitychange', onVisibility);
      unbind();
    };
  }, [setUI, pushTicker]);

  return (
    <canvas
      ref={ref}
      className="game"
      tabIndex={0}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter"
      aria-label="Interactive isometric golf course. Use pointer or touch controls. While playing, drag from the gold ball marker toward your target and release to swing; or focus the course, use left and right arrows to aim, up and down arrows for power, and Enter to swing."
    />
  );
}
