import { useEffect, useRef } from 'react';
import { initMap, update, updateTopbar, setTool, loadGame } from '../game/engine';
import { fitCamera, P, PE, screenToWorld } from '../game/camera';
import { S } from '../game/state';
import { draw } from '../game/render';
import { bindInput } from '../game/input';
import { useUI } from './store';

let booted = false;

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
      const dpr = window.devicePixelRatio || 1;
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

    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__sim = { S, P, PE, screenToWorld };
    if (!booted) {
      booted = true;
      const resumed = loadGame();
      if (!resumed) initMap();
      updateTopbar();
      setTool('hole');
      fitCamera(cssW, cssH);
      if (!resumed) setUI({ modal: { kind: 'help' } });
      pushTicker('Pro shop', resumed ? 'Welcome back, boss. The course missed you.' : 'Hole 1 is open. Golfers are on their way!', 'money');
    }

    const unbind = bindInput(cv);
    window.addEventListener('resize', resize);

    let raf = 0;
    let lastTs = 0;
    function tick(ts: number) {
      const dt = Math.min(Math.max((ts - lastTs) / 1000, 0), 0.05) || 0.016;
      lastTs = ts;
      update(dt);
      draw(ctx, cssW, cssH);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      unbind();
    };
  }, [setUI, pushTicker]);

  return (
    <canvas
      ref={ref}
      className="game"
      tabIndex={0}
      aria-label="Interactive isometric golf course. Choose a construction tool, then use pointer or touch controls on the course."
    />
  );
}
