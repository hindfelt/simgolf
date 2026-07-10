import { useEffect, useRef, useState } from 'react';
import { S } from '../game/state';
import { W, H, PW, PH, PARCEL_W, PARCEL_H } from '../game/constants';
import { Tile } from '../game/types';
import { screenToWorld } from '../game/camera';
import { buildRoutingHeatmap, type RoutingOverlayMode } from '../game/routing';
import { useUI } from './store';

const MAP_W = 184;
const MAP_H = 138; // 4:3, matches the 64x48 grid

const TILE_COLOR: Partial<Record<number, string>> = {
  [Tile.WATER]: '#2f6f9c', [Tile.SAND]: '#d9c07f', [Tile.TREE]: '#3f6b34',
  [Tile.GREEN]: '#5fb56a', [Tile.TEE]: '#7bc25a', [Tile.FAIR]: '#6bb04a',
  [Tile.FIRM_FAIR]: '#79ad43', [Tile.DEEP_ROUGH]: '#36592b', [Tile.FLOWER]: '#4d7a3a',
  [Tile.PATH]: '#a98a5e', [Tile.WASTE_BUNKER]: '#8b754c', [Tile.POT_BUNKER]: '#34382e',
  [Tile.STREAM]: '#245f73', [Tile.BRUSH]: '#344f2a', [Tile.ROCK]: '#666b67',
  [Tile.BRIDGE_WATER]: '#c1925c', [Tile.BRIDGE_STREAM]: '#c1925c',
};

function auraColor(value: number): string {
  if (value < 0) {
    const amount = Math.min(1, -value);
    return `rgb(${Math.round(93 + amount * 112)},${Math.round(75 - amount * 35)},${Math.round(63 - amount * 20)})`;
  }
  return `rgb(${Math.round(78 - value * 44)},${Math.round(91 + value * 146)},${Math.round(62 - value * 22)})`;
}

function homeColor(value: number): string {
  if (value <= 0.001) return '#050806';
  return `rgb(${Math.round(7 + value * 96)},${Math.round(25 + value * 214)},${Math.round(11 + value * 74)})`;
}

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<RoutingOverlayMode>('course');
  const holeCount = useUI((state) => state.holes);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    let heat: Float32Array | null = null;
    let heatAt = -Infinity;
    function frame(ts: number) {
      raf = requestAnimationFrame(frame);
      if (ts - last < 140) return;
      last = ts;
      if (!ctx) return;
      if (mode !== 'course' && ts - heatAt > 650) {
        heat = buildRoutingHeatmap(S, mode);
        heatAt = ts;
      }
      ctx.clearRect(0, 0, MAP_W, MAP_H);
      const sx = MAP_W / W;
      const sy = MAP_H / H;

      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const index = y * W + x;
        ctx.fillStyle = mode === 'course' ? TILE_COLOR[S.tiles[index]] ?? '#628f42' : mode === 'aura' ? auraColor(heat?.[index] ?? 0) : homeColor(heat?.[index] ?? 0);
        ctx.fillRect(x * sx, y * sy, sx + 0.6, sy + 0.6);
      }

      if (mode === 'course' || mode === 'aura') {
        ctx.fillStyle = 'rgba(8,12,20,.58)';
        for (let py = 0; py < PH; py++) for (let px = 0; px < PW; px++) {
          if (!S.owned[py * PW + px]) ctx.fillRect(px * PARCEL_W * sx, py * PARCEL_H * sy, PARCEL_W * sx, PARCEL_H * sy);
        }
      }

      if (mode === 'course') {
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = 'rgba(18,35,25,.7)';
        ctx.beginPath();
        S.holes.forEach((hole, index) => {
          if (index === 0) ctx.moveTo(hole.tee.x * sx, hole.tee.y * sy);
          else ctx.lineTo(hole.tee.x * sx, hole.tee.y * sy);
          ctx.lineTo(hole.cup.x * sx, hole.cup.y * sy);
        });
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fff7c7';
        ctx.stroke();
        ctx.fillStyle = '#ff5a4d';
        for (const hole of S.holes) {
          ctx.beginPath();
          ctx.arc(hole.cup.x * sx, hole.cup.y * sy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd856';
        for (const building of S.buildings) ctx.fillRect((building.x + building.w / 2) * sx - 1, (building.y + building.h / 2) * sy - 1, 2.5, 2.5);
      }

      const offered = new Set(S.specialVisitors.landOffer?.parcelIndices ?? []);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd856';
      ctx.setLineDash([4, 3]);
      for (const parcel of offered) {
        const px = parcel % PW;
        const py = Math.floor(parcel / PW);
        ctx.strokeRect(px * PARCEL_W * sx + 1, py * PARCEL_H * sy + 1, PARCEL_W * sx - 2, PARCEL_H * sy - 2);
      }
      ctx.setLineDash([]);

      const corners = [screenToWorld(0, 0), screenToWorld(S.view.w, 0), screenToWorld(S.view.w, S.view.h), screenToWorld(0, S.view.h)];
      const xs = corners.map((corner) => corner.x);
      const ys = corners.map((corner) => corner.y);
      const x0 = Math.max(0, Math.min(...xs));
      const x1 = Math.min(W, Math.max(...xs));
      const y0 = Math.max(0, Math.min(...ys));
      const y1 = Math.min(H, Math.max(...ys));
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 * sx, y0 * sy, (x1 - x0) * sx, (y1 - y0) * sy);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const legend = mode === 'course' ? 'Hole order · facilities · offered land' : mode === 'aura' ? 'Trouble  ←  mood aura  →  delight' : 'Black = impossible · bright green = valuable';
  return (
    <aside className={'routingMap mode-' + mode} aria-label="Routing map">
      <header><b>Routing map</b><span>{mode === 'course' ? `${holeCount} holes` : mode === 'aura' ? 'Player mood' : 'Building lots'}</span></header>
      <div className="routingTabs" role="tablist" aria-label="Routing map layers">
        {([['course', 'Route'], ['aura', 'Aura'], ['homeValue', 'Home value']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="minimap"
        width={MAP_W}
        height={MAP_H}
        role="img"
        aria-label={`${mode} routing map — click to pan the camera there`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          S.camTarget = { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
        }}
      />
      <footer><span className="legendRamp" />{legend}</footer>
    </aside>
  );
}
