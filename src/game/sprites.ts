// Baked pixel-art sprites. Everything is drawn once into small offscreen
// canvases (1 unit = 1 pixel), given a dark outline, and upscaled with
// image smoothing off — that chunky scaling is what makes it read as
// game pixel art instead of smooth vector shapes.

const cache = new Map<string, HTMLCanvasElement>();

type Px = (x: number, y: number, w?: number, h?: number, c?: string) => void;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D, Px] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  let cur = '#000';
  const px: Px = (x, y, pw = 1, ph = 1, c) => {
    if (c) cur = c;
    ctx.fillStyle = cur;
    ctx.fillRect(x, y, pw, ph);
  };
  return [cv, ctx, px];
}

/** Stamp a dark outline around everything drawn in `art`, return final sprite. */
function outlined(art: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [out, octx] = makeCanvas(art.width, art.height);
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    octx.drawImage(art, dx, dy);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, out.width, out.height);
  octx.globalCompositeOperation = 'source-over';
  octx.drawImage(art, 0, 0);
  return out;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return 'rgb(' + cl(((n >> 16) & 255) * f) + ',' + cl(((n >> 8) & 255) * f) + ',' + cl((n & 255) * f) + ')';
}

/* ================= golfers ================= */

export type GolferFrame = 'idle' | 'walkA' | 'walkB' | 'address' | 'back' | 'follow' | 'putt';

const PANTS = ['#3b4252', '#6b4f35', '#75787f', '#4a5d3a', '#7d4444', '#e8e4d8'];
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return h;
}

/** 24x32 golfer, drawn facing right. */
export function golferSprite(shirt: string, skin: string, cap: string, frame: GolferFrame): HTMLCanvasElement {
  const key = 'g|' + shirt + '|' + skin + '|' + cap + '|' + frame;
  const hit = cache.get(key);
  if (hit) return hit;

  const [art, ctx, p] = makeCanvas(24, 32);
  const pants = PANTS[hashStr(shirt + skin + cap) % PANTS.length];
  const shirtDk = shade(shirt, 0.78);
  const capDk = shade(cap, 0.75);
  const skinDk = shade(skin, 0.8);
  const walking = frame === 'walkA' || frame === 'walkB';
  const swingBack = frame === 'back';
  const follow = frame === 'follow';
  const putt = frame === 'putt';
  const address = frame === 'address' || putt;

  // golf bag on the back while walking
  if (walking) {
    p(4, 12, 3, 9, '#8a5a30');
    p(4, 12, 1, 9, shade('#8a5a30', 0.75));
    p(4, 11, 3, 1, '#6e4523');
    // club heads poking out
    p(4, 8, 1, 3, '#9aa0a8');
    p(6, 9, 1, 2, '#9aa0a8');
    p(5, 7, 2, 2, '#c9ced4');
    // strap
    p(7, 12, 1, 1, '#6e4523');
    p(8, 11, 1, 1, '#6e4523');
  }

  // legs + shoes
  const shoe = '#2e2a26';
  if (frame === 'walkA') {
    p(9, 24, 2, 5, pants); // back leg
    p(8, 29, 3, 2, shoe);
    p(13, 24, 2, 4, pants); // front leg forward
    p(14, 28, 3, 2, shoe);
  } else if (frame === 'walkB') {
    p(9, 24, 2, 4, pants);
    p(9, 28, 3, 2, shoe);
    p(13, 24, 2, 5, pants);
    p(12, 29, 3, 2, shoe);
  } else {
    p(9, 24, 2, 5, pants);
    p(8, 29, 3, 2, shoe);
    p(13, 24, 2, 5, pants);
    p(13, 29, 3, 2, shoe);
  }
  // hips / shorts
  p(9, 20, 6, 4, pants);
  p(9, 20, 1, 4, shade(pants, 0.8));

  // torso (slight crouch for address/putt poses)
  const ty = address ? 12 : 11;
  p(8, ty, 8, 8 - (address ? 0 : 0), shirt);
  p(8, ty, 8, 8, shirt);
  p(8, ty, 1, 8, shirtDk); // back shading
  p(8, ty + 7, 8, 1, shirtDk);
  // collar
  p(11, ty - 1, 3, 1, '#f2f0e8');

  // head + cap
  const hy = address ? 4 : 3;
  p(9, hy + 2, 6, 5, skin);
  p(9, hy + 2, 1, 5, skinDk);
  p(13, hy + 4, 1, 1, '#26221e'); // eye
  p(9, hy, 6, 2, cap);
  p(9, hy, 1, 2, capDk);
  p(14, hy + 1, 4, 1, capDk); // brim

  // arms + club
  const grey = '#8f959c';
  const steel = '#c9ced4';
  if (swingBack) {
    // arms up behind, club raised over the shoulder
    p(8, ty - 3, 2, 4, shirt);
    p(7, ty - 4, 2, 2, skin);
    ctx.strokeStyle = grey;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7.5, ty - 4);
    ctx.lineTo(2.5, ty - 9);
    ctx.stroke();
    p(1, ty - 11, 2, 2, steel);
  } else if (follow) {
    // follow-through: club swung up in front
    p(14, ty - 3, 2, 4, shirt);
    p(15, ty - 4, 2, 2, skin);
    ctx.strokeStyle = grey;
    ctx.beginPath();
    ctx.moveTo(16, ty - 4);
    ctx.lineTo(21.5, ty - 9);
    ctx.stroke();
    p(21, ty - 11, 2, 2, steel);
  } else if (address) {
    // both arms down to the grip, club to the ball
    p(14, ty + 1, 2, 5, shirt);
    p(14, ty + 6, 2, 2, skin);
    ctx.strokeStyle = grey;
    ctx.beginPath();
    ctx.moveTo(15, ty + 8);
    ctx.lineTo(putt ? 16 : 19, 29);
    ctx.stroke();
    p(putt ? 15 : 18, 29, 3, 1.5, steel);
  } else {
    // relaxed arm at the side
    p(14, ty + 1, 2, 5, shirt);
    p(14, ty + 6, 2, 2, skin);
  }

  const done = outlined(art, '#20242b');
  cache.set(key, done);
  return done;
}

/* ================= buildings =================
   Facilities are baked as isometric pixel sprites: 1 sprite px = 1 css px at
   zoom 1 (TWs/THs match the tile size), so zooming in gives chunky pixels
   that match the golfers and trees. All art is original, styled after
   early-2000s tycoon games: striped awnings, chunky roofs, little props. */

const TWs = 36;
const THs = 18;

export interface BSprite {
  cv: HTMLCanvasElement;
  ax: number; // anchor: canvas px of the footprint centre
  ay: number;
}
const bcache = new Map<string, BSprite>();

type P2 = [number, number];
function poly(ctx: CanvasRenderingContext2D, pts: P2[], fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
const mix = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const up = (p: P2, h: number): P2 => [p[0], p[1] - h];

interface BoxOpts {
  wall: string;
  roofC: string;
  wallH: number;
  roofH?: number;
  roof?: 'gable' | 'flat' | 'hip';
  roofStripes?: string;
  winRows?: number;
  winCols?: number; // per SW face
  door?: boolean;
  awning?: [string, string]; // striped canopy over the SW face
}

/** Iso box with pixel-era detailing. `c` maps tile coords -> canvas px. */
function isoBox(ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2, w: number, h: number, o: BoxOpts) {
  const A = c(0, 0);
  const B = c(w, 0);
  const C = c(w, h);
  const D = c(0, h);
  const A2 = up(A, o.wallH);
  const B2 = up(B, o.wallH);
  const C2 = up(C, o.wallH);
  const D2 = up(D, o.wallH);
  const wallSE = shade(o.wall, 0.84);
  const wallSW = shade(o.wall, 0.68);
  poly(ctx, [B, C, C2, B2], wallSE);
  poly(ctx, [C, D, D2, C2], wallSW);
  // skirting board
  poly(ctx, [B, C, up(C, 2), up(B, 2)], shade(o.wall, 0.6));
  poly(ctx, [C, D, up(D, 2), up(C, 2)], shade(o.wall, 0.5));
  // windows
  const winFace = (p0: P2, p1: P2, q0: P2, q1: P2, cols: number, rows: number) => {
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < cols; i++) {
        const t0 = (i + 0.3) / cols;
        const t1 = (i + 0.7) / cols;
        const v0 = 0.25 + (r / rows) * 0.55;
        const v1 = v0 + 0.3 / rows;
        const a = mix(p0, p1, t0);
        const b = mix(p0, p1, t1);
        const qa = mix(q0, q1, t0);
        const qb = mix(q0, q1, t1);
        poly(ctx, [mix(a, qa, v0), mix(b, qb, v0), mix(b, qb, v1), mix(a, qa, v1)], '#cfe6f2');
        // sill highlight
        poly(ctx, [mix(a, qa, v1), mix(b, qb, v1), mix(b, qb, v1 + 0.04), mix(a, qa, v1 + 0.04)], 'rgba(255,255,255,.55)');
      }
  };
  const rows = o.winRows ?? 1;
  if (rows > 0) {
    winFace(C, B, C2, B2, Math.max(1, Math.round(h)), rows);
    winFace(C, D, C2, D2, o.winCols ?? Math.max(1, Math.round(w)), rows);
  }
  if (o.door) {
    const a = mix(C, D, 0.14);
    const b = mix(C, D, 0.4);
    const qa = mix(C2, D2, 0.14);
    const qb = mix(C2, D2, 0.4);
    poly(ctx, [a, b, mix(b, qb, 0.8), mix(a, qa, 0.8)], '#6e4a2c');
    poly(ctx, [mix(a, b, 0.75), b, mix(b, qb, 0.78), mix(mix(a, b, 0.75), mix(qa, qb, 0.75), 0.78)], '#8a6238');
  }
  if (o.awning) {
    // striped canopy sloping out from the SW face
    const y0 = o.wallH * 0.62;
    const a = up(mix(C, D, 0.05), y0);
    const b = up(mix(C, D, 0.5), y0);
    const ao: P2 = [a[0] - 5, a[1] + 7];
    const bo: P2 = [b[0] - 5, b[1] + 7];
    const N = 5;
    for (let i = 0; i < N; i++) {
      poly(ctx, [mix(a, b, i / N), mix(a, b, (i + 1) / N), mix(ao, bo, (i + 1) / N), mix(ao, bo, i / N)], i % 2 ? o.awning[0] : o.awning[1]);
    }
    poly(ctx, [ao, bo, [bo[0], bo[1] + 1.5], [ao[0], ao[1] + 1.5]], 'rgba(0,0,0,.25)');
  }
  // roof
  const roofH = o.roofH ?? 10;
  if (o.roof === 'flat') {
    poly(ctx, [A2, B2, C2, D2], o.roofC);
    poly(ctx, [up(A2, 2), up(B2, 2), B2, A2], shade(o.roofC, 1.12));
    poly(ctx, [A2, up(A2, 2), up(D2, 2), D2], shade(o.roofC, 0.9));
    return { ridge: up(mix(A2, C2, 0.5), 2) };
  }
  const alongX = w >= h;
  const Ra = up(alongX ? c(0, h / 2) : c(w / 2, 0), o.wallH + roofH);
  const Rb = up(alongX ? c(w, h / 2) : c(w / 2, h), o.wallH + roofH);
  const upSlope: P2[] = alongX ? [A2, B2, Rb, Ra] : [A2, D2, Rb, Ra];
  const dnSlope: P2[] = alongX ? [D2, C2, Rb, Ra] : [B2, C2, Rb, Ra];
  poly(ctx, upSlope, shade(o.roofC, 1.08));
  poly(ctx, dnSlope, shade(o.roofC, 0.85));
  if (o.roofStripes) {
    // stripes parallel to the eaves on the visible slope
    ctx.strokeStyle = o.roofStripes;
    ctx.lineWidth = 1.5;
    for (let t = 0.25; t < 1; t += 0.25) {
      ctx.beginPath();
      const s0 = mix(dnSlope[0], Ra, t);
      const s1 = mix(dnSlope[1], Rb, t);
      ctx.moveTo(s0[0], s0[1]);
      ctx.lineTo(s1[0], s1[1]);
      ctx.stroke();
    }
  }
  // gable end
  const gable: P2[] = alongX ? [B2, C2, Rb] : [D2, C2, Rb];
  poly(ctx, gable, shade(o.wall, 0.78));
  // ridge cap
  ctx.strokeStyle = shade(o.roofC, 1.25);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(Ra[0], Ra[1]);
  ctx.lineTo(Rb[0], Rb[1]);
  ctx.stroke();
  return { ridge: mix(Ra, Rb, 0.5) };
}

/** Flat ground feature drawn as a diamond panel (courts, greens, strips). */
function isoPanel(ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2, w: number, h: number, inset: number, fill: string, edge: string) {
  const A = c(inset, inset);
  const B = c(w - inset, inset);
  const C = c(w - inset, h - inset);
  const D = c(inset, h - inset);
  poly(ctx, [A, B, C, D], fill, edge);
  return { A, B, C, D };
}

function makeB(key: string, cw: number, ch: number, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, c: (x: number, y: number) => P2) => void): BSprite {
  const hit = bcache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(cw, ch);
  const ox = (h * TWs) / 2 + 6; // canvas px of tile corner (0,0)
  const oy = ch - ((w + h) * THs) / 2 - 8;
  const c = (x: number, y: number): P2 => [ox + ((x - y) * TWs) / 2, oy + ((x + y) * THs) / 2];
  draw(ctx, c);
  const done = outlined(art, 'rgba(25,30,40,.75)');
  const anchor = c(w / 2, h / 2);
  const spr = { cv: done, ax: anchor[0], ay: anchor[1] };
  bcache.set(key, spr);
  return spr;
}

const FLAG_RED = '#d0453a';
function miniFlag(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number) {
  ctx.strokeStyle = '#f3efe2';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - hgt);
  ctx.stroke();
  poly(ctx, [[x, y - hgt], [x + 7, y - hgt + 2.5], [x, y - hgt + 5]], FLAG_RED);
}

export function buildingSprite(kind: string): BSprite {
  switch (kind) {
    case 'clubhouse':
      return makeB(kind, 120, 108, 2, 2, (ctx, c) => {
        const r = isoBox(ctx, c, 2, 2, {
          wall: '#f6efdc',
          roofC: '#b04438',
          wallH: 26,
          roofH: 14,
          roofStripes: 'rgba(255,255,255,.28)',
          winRows: 1,
          door: true,
          awning: ['#c8493c', '#f2ede0'],
        });
        miniFlag(ctx, r.ridge[0], r.ridge[1] - 1, 16);
      });
    case 'proshop':
      return makeB(kind, 120, 100, 2, 2, (ctx, c) => {
        isoBox(ctx, c, 2, 2, {
          wall: '#e8dcc0',
          roofC: '#3f6f9c',
          wallH: 20,
          roofH: 11,
          roofStripes: 'rgba(255,255,255,.25)',
          winRows: 1,
          door: true,
          awning: ['#3f6f9c', '#f2ede0'],
        });
        // golf-ball sign on the gable
        const g = c(2, 1);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(g[0] + 1, g[1] - 26, 3.2, 0, 7);
        ctx.fill();
        ctx.strokeStyle = '#3f6f9c';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    case 'snackbar':
      return makeB(kind, 120, 96, 2, 2, (ctx, c) => {
        isoBox(ctx, c, 2, 2, {
          wall: '#f2d9a0',
          roofC: '#c8493c',
          wallH: 16,
          roofH: 9,
          roofStripes: 'rgba(255,255,255,.3)',
          winRows: 1,
          winCols: 1,
          door: true,
          awning: ['#c8493c', '#fdf6e3'],
        });
        // parasol beside the bar
        const u0 = c(0.25, 1.75);
        ctx.strokeStyle = '#7a5233';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(u0[0], u0[1]);
        ctx.lineTo(u0[0], u0[1] - 14);
        ctx.stroke();
        for (let i = 0; i < 4; i++)
          poly(
            ctx,
            [
              [u0[0], u0[1] - 14],
              [u0[0] - 9 + i * 4.5, u0[1] - 8],
              [u0[0] - 9 + (i + 1) * 4.5, u0[1] - 8],
            ],
            i % 2 ? '#e9b53c' : '#fdf6e3'
          );
      });
    case 'cartgarage':
      return makeB(kind, 120, 92, 2, 2, (ctx, c) => {
        isoBox(ctx, c, 2, 2, {
          wall: '#cfd2d8',
          roofC: '#6a7280',
          wallH: 17,
          roof: 'flat',
          winRows: 0,
        });
        // roller door on the SW face
        const C0 = c(2, 2);
        const D0 = c(0, 2);
        const a = mix(C0, D0, 0.15);
        const b = mix(C0, D0, 0.85);
        poly(ctx, [a, b, up(b, 13), up(a, 13)], '#aeb4bd');
        ctx.strokeStyle = 'rgba(60,70,80,.6)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(a[0], a[1] - i * 2.6);
          ctx.lineTo(b[0], b[1] - i * 2.6);
          ctx.stroke();
        }
        // parked cart
        const k = c(2.3, 1.2);
        poly(ctx, [[k[0], k[1]], [k[0] + 10, k[1] - 3], [k[0] + 10, k[1] - 8], [k[0], k[1] - 5]], '#f2f0e8');
        poly(ctx, [[k[0] + 2, k[1] - 5], [k[0] + 8, k[1] - 7.5], [k[0] + 8, k[1] - 11], [k[0] + 2, k[1] - 8.5]], '#3f6f9c');
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath();
        ctx.arc(k[0] + 2.5, k[1] + 1, 1.6, 0, 7);
        ctx.arc(k[0] + 8.5, k[1] - 1.5, 1.6, 0, 7);
        ctx.fill();
      });
    case 'hotel':
      return makeB(kind, 120, 118, 2, 2, (ctx, c) => {
        isoBox(ctx, c, 2, 2, {
          wall: '#efe3c8',
          roofC: '#8c3a52',
          wallH: 38,
          roofH: 12,
          roofStripes: 'rgba(255,255,255,.22)',
          winRows: 3,
          door: true,
          awning: ['#8c3a52', '#f2ede0'],
        });
      });
    case 'tennis':
      return makeB(kind, 120, 70, 2, 2, (ctx, c) => {
        isoPanel(ctx, c, 2, 2, 0.06, '#3e8f5a', '#2d6b42');
        isoPanel(ctx, c, 2, 2, 0.3, '#4aa468', '#e8f4ec');
        // centre net
        const n0 = c(1, 0.32);
        const n1 = c(1, 1.68);
        ctx.strokeStyle = '#e8f4ec';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(n0[0], n0[1] - 6);
        ctx.lineTo(n1[0], n1[1] - 6);
        ctx.stroke();
        poly(ctx, [n0, n1, up(n1, 6), up(n0, 6)], 'rgba(240,245,240,.55)');
        ctx.strokeStyle = '#5a5f66';
        ctx.lineWidth = 1.4;
        for (const p of [n0, n1]) {
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 7);
          ctx.stroke();
        }
      });
    case 'puttinggreen':
      return makeB(kind, 120, 70, 2, 2, (ctx, c) => {
        isoPanel(ctx, c, 2, 2, 0.05, '#68b455', '#4c9440');
        isoPanel(ctx, c, 2, 2, 0.22, '#8ce49b', 'rgba(30,80,30,.35)');
        ctx.fillStyle = '#123a20';
        for (const [hx, hy] of [
          [0.6, 1.4],
          [1.5, 0.6],
        ]) {
          const p = c(hx, hy);
          ctx.beginPath();
          ctx.ellipse(p[0], p[1], 2, 1, 0, 0, 7);
          ctx.fill();
        }
        const f = c(1.5, 0.6);
        miniFlag(ctx, f[0], f[1], 13);
      });
    case 'drivingrange':
      return makeB(kind, 150, 100, 3, 2, (ctx, c) => {
        // grass apron + tee mats
        isoPanel(ctx, c, 3, 2, 0.06, '#85c545', '#5f9433');
        for (let i = 0; i < 3; i++) {
          const m = c(0.55, 0.45 + i * 0.55);
          poly(ctx, [m, [m[0] + 8, m[1] + 4], [m[0] + 16, m[1]], [m[0] + 8, m[1] - 4]], '#3e8f5a', '#2d6b42');
        }
        // open shelter over the mats
        const s0 = c(0.15, 0.1);
        const s1 = c(0.15, 1.9);
        poly(ctx, [up(s0, 16), up(s1, 16), up([s1[0] + 12, s1[1] + 6], 22), up([s0[0] + 12, s0[1] + 6], 22)], '#6a8f3c');
        ctx.strokeStyle = '#5a5f66';
        ctx.lineWidth = 1.4;
        for (const p of [s0, s1]) {
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 16);
          ctx.stroke();
        }
        // tall catch nets at the far side
        const n0 = c(2.9, 0.1);
        const n1 = c(2.9, 1.9);
        ctx.strokeStyle = '#8f959c';
        for (const p of [n0, mix(n0, n1, 0.5), n1]) {
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 30);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(200,210,220,.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
          ctx.beginPath();
          ctx.moveTo(n0[0], n0[1] - i * 5.5);
          ctx.lineTo(n1[0], n1[1] - i * 5.5);
          ctx.stroke();
        }
      });
    case 'marina':
      return makeB(kind, 150, 104, 3, 2, (ctx, c) => {
        // water pool + dock
        isoPanel(ctx, c, 3, 2, 0.05, '#3a7cba', '#2c639c');
        const d0 = c(0.2, 1);
        const d1 = c(2.4, 1);
        poly(ctx, [d0, d1, [d1[0], d1[1] + 6], [d0[0], d0[1] + 6]], '#a9825a', '#6e4523');
        ctx.strokeStyle = 'rgba(90,60,30,.55)';
        ctx.lineWidth = 1;
        for (let t = 0.12; t < 1; t += 0.12) {
          const p = mix(d0, d1, t);
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] + 6);
          ctx.stroke();
        }
        // boathouse
        const bo = (x: number, y: number): P2 => c(x * 0.9, y * 0.8);
        isoBox(ctx, bo, 1, 1, { wall: '#e3ecf2', roofC: '#3f6f9c', wallH: 12, roofH: 8, winRows: 1, door: true });
        // sailboat
        const s = c(2.3, 1.55);
        poly(ctx, [[s[0] - 7, s[1]], [s[0] + 7, s[1]], [s[0] + 4, s[1] + 4], [s[0] - 4, s[1] + 4]], '#f2f0e8', '#8f959c');
        ctx.strokeStyle = '#5a5f66';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(s[0], s[1] - 18);
        ctx.stroke();
        poly(ctx, [[s[0], s[1] - 18], [s[0] + 9, s[1] - 4], [s[0] + 1, s[1] - 4]], '#fdf6e3');
        poly(ctx, [[s[0] - 1, s[1] - 15], [s[0] - 7, s[1] - 4], [s[0] - 1, s[1] - 4]], '#c8493c');
      });
    case 'airstrip':
      return makeB(kind, 150, 96, 3, 2, (ctx, c) => {
        isoPanel(ctx, c, 3, 2, 0.05, '#9aa0a8', '#70757c');
        // runway centreline dashes
        ctx.strokeStyle = '#f2f0e8';
        ctx.lineWidth = 2;
        for (let t = 0.12; t < 0.95; t += 0.16) {
          const a = mix(c(0.2, 1), c(2.8, 1), t);
          const b = mix(c(0.2, 1), c(2.8, 1), t + 0.07);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        // hangar
        const hg = c(0.55, 0.35);
        poly(ctx, [[hg[0] - 10, hg[1]], [hg[0] + 10, hg[1] - 4], [hg[0] + 10, hg[1] - 14], [hg[0] - 10, hg[1] - 10]], '#c9ced4', '#70757c');
        poly(ctx, [[hg[0] - 10, hg[1] - 10], [hg[0] + 10, hg[1] - 14], [hg[0] + 6, hg[1] - 17], [hg[0] - 8, hg[1] - 13]], '#6a7280');
        // windsock
        const wsk = c(2.7, 0.3);
        ctx.strokeStyle = '#8f959c';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(wsk[0], wsk[1]);
        ctx.lineTo(wsk[0], wsk[1] - 18);
        ctx.stroke();
        poly(ctx, [[wsk[0], wsk[1] - 18], [wsk[0] + 11, wsk[1] - 16], [wsk[0] + 11, wsk[1] - 14], [wsk[0], wsk[1] - 13]], '#e8762c');
        poly(ctx, [[wsk[0] + 4, wsk[1] - 17.2], [wsk[0] + 7, wsk[1] - 16.5], [wsk[0] + 7, wsk[1] - 14.5], [wsk[0] + 4, wsk[1] - 14]], '#fdf6e3');
      });
    case 'lot0':
      return makeB(kind, 120, 84, 2, 2, (ctx, c) => {
        // dirt pad + timber frame
        isoPanel(ctx, c, 2, 2, 0.08, '#c2a06a', '#8a6a41');
        const f = (x: number, y: number): P2 => c(0.35 + x * 1.3, 0.35 + y * 1.3);
        const A = f(0, 0);
        const B = f(1, 0);
        const C = f(1, 1);
        const D = f(0, 1);
        ctx.strokeStyle = '#b08a52';
        ctx.lineWidth = 2;
        for (const [p, q] of [
          [A, B],
          [B, C],
          [C, D],
          [D, A],
        ] as [P2, P2][]) {
          poly(ctx, [p, q, up(q, 10), up(p, 10)], 'rgba(216,184,130,.4)');
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0], p[1] - 10);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(B[0], B[1] - 10);
        ctx.lineTo(C[0], C[1] - 10);
        ctx.lineTo(D[0], D[1] - 10);
        ctx.stroke();
        // material pile
        const m = c(1.7, 0.35);
        poly(ctx, [[m[0] - 6, m[1]], [m[0] + 6, m[1] - 2], [m[0] + 6, m[1] - 6], [m[0] - 6, m[1] - 4]], '#a9825a', '#6e4523');
      });
    default: {
      // houses: 'house<stage>_<variant>'
      const m = /^house([12])_(\d)$/.exec(kind);
      if (m) {
        const stage = +m[1];
        const vi = +m[2] % HOUSE_WALLS.length;
        return makeB(kind, 120, stage === 1 ? 92 : 112, 2, 2, (ctx, c) => {
          // garden
          isoPanel(ctx, c, 2, 2, 0.06, '#7fb54a', '#5f9433');
          const inner = (x: number, y: number): P2 => c(0.16 + x * 0.72, 0.05 + y * 0.72);
          isoBox(ctx, inner, stage === 1 ? 1.3 : 1.7, stage === 1 ? 1.2 : 1.6, {
            wall: HOUSE_WALLS[vi],
            roofC: HOUSE_ROOFS[(vi + (stage === 2 ? 2 : 0)) % HOUSE_ROOFS.length],
            wallH: stage === 1 ? 14 : 26,
            roofH: stage === 1 ? 9 : 12,
            roofStripes: 'rgba(255,255,255,.2)',
            winRows: stage === 1 ? 1 : 2,
            door: true,
          });
          // hedge along the front edge
          ctx.fillStyle = '#4c8a3c';
          for (let t = 0.08; t < 0.95; t += 0.11) {
            const p = mix(c(0.05, 1.95), c(1.6, 1.95), t);
            ctx.beginPath();
            ctx.arc(p[0], p[1] - 1, 2.4, 0, 7);
            ctx.fill();
          }
          if (stage === 2) {
            const ch = c(1.15, 0.5);
            ctx.fillStyle = '#8a6a55';
            ctx.fillRect(ch[0], ch[1] - 46, 5, 12);
            ctx.strokeStyle = 'rgba(40,30,20,.6)';
            ctx.strokeRect(ch[0], ch[1] - 46, 5, 12);
          }
          // flowers by the door
          const fl = c(0.35, 1.75);
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = ['#f2a7c3', '#f7d34d', '#ffffff', '#e78ad1'][i];
            ctx.beginPath();
            ctx.arc(fl[0] + i * 4 - 6, fl[1] - 1, 1.5, 0, 7);
            ctx.fill();
          }
        });
      }
      // fallback simple box
      return makeB(kind, 120, 100, 2, 2, (ctx, c) => {
        isoBox(ctx, c, 2, 2, { wall: '#d8cdb0', roofC: '#6a7280', wallH: 18, roofH: 10, winRows: 1, door: true });
      });
    }
  }
}

/** 1x1 props: bench and flower-bed planter. */
export function propSprite(kind: 'bench' | 'flowerbed'): BSprite {
  const key = 'p|' + kind;
  const hit = bcache.get(key);
  if (hit) return hit;
  const [art, ctx] = makeCanvas(48, 44);
  const cx = 24;
  const cy = 32;
  if (kind === 'bench') {
    // wooden bench, side-on
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    for (const dx of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy);
      ctx.lineTo(cx + dx, cy - 7);
      ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      poly(ctx, [[cx - 11, cy - 7 - i * 3.4], [cx + 11, cy - 7 - i * 3.4 - 3], [cx + 11, cy - 9.4 - i * 3.4 - 3], [cx - 11, cy - 9.4 - i * 3.4]], i === 0 ? '#b8905e' : '#a9825a');
    }
    for (let i = 0; i < 3; i++)
      poly(ctx, [[cx - 11, cy - 13.5 - i * 3], [cx + 11, cy - 16.5 - i * 3], [cx + 11, cy - 18.3 - i * 3], [cx - 11, cy - 15.3 - i * 3]], i % 2 ? '#a9825a' : '#b8905e');
  } else {
    // wooden planter box bursting with flowers
    poly(ctx, [[cx - 13, cy - 2], [cx, cy + 4], [cx + 13, cy - 2], [cx, cy - 8]], '#7a5233', '#4a3018');
    poly(ctx, [[cx - 13, cy - 2], [cx, cy + 4], [cx, cy + 8], [cx - 13, cy + 2]], '#8a6238');
    poly(ctx, [[cx + 13, cy - 2], [cx, cy + 4], [cx, cy + 8], [cx + 13, cy + 2]], '#6e4523');
    poly(ctx, [[cx - 10, cy - 3], [cx, cy + 2], [cx + 10, cy - 3], [cx, cy - 7]], '#3d2c18');
    const cols = ['#f2a7c3', '#f7d34d', '#ffffff', '#e78ad1', '#f0806a', '#c8493c'];
    for (let i = 0; i < 12; i++) {
      const a = (i * 137.5) % 360;
      const rr = 2 + ((i * 53) % 8);
      const x = cx + Math.cos((a * Math.PI) / 180) * rr;
      const y = cy - 6 - Math.abs(Math.sin((a * Math.PI) / 180)) * 5 - (i % 3) * 2;
      ctx.strokeStyle = '#2f6b2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = cols[i % cols.length];
      for (const [px2, py2] of [
        [x - 1.4, y],
        [x + 1.4, y],
        [x, y - 1.4],
        [x, y + 1.4],
      ])
        ctx.fillRect(px2 - 0.9, py2 - 0.9, 1.8, 1.8);
      ctx.fillStyle = '#f7e27a';
      ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
  }
  const done = outlined(art, 'rgba(25,30,40,.7)');
  const spr = { cv: done, ax: cx, ay: cy + 6 };
  bcache.set(key, spr);
  return spr;
}

const HOUSE_WALLS = ['#e8d8b8', '#d8e3ea', '#e6c9c0', '#cfe0c0', '#e3d3ec'];
const HOUSE_ROOFS = ['#a33d31', '#3f6f9c', '#6a8f3c', '#7a5233', '#9a3f5c'];

/* ================= trees ================= */

export type TreeKind = 'round' | 'pine' | 'blossom';

function ditherDisc(p: Px, cx: number, cy: number, r: number, base: string, mid: string, hi: string) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 0.2) continue;
      let c = base;
      if (x - y < -r * 0.5) c = mid; // upper-left lit
      if (x - y < -r * 0.9 && (x + y) % 2 === 0) c = hi; // dithered highlight
      if (d > r - 0.9 && x + y > r * 0.4) c = shade(base, 0.8); // lower-right rim
      p(cx + x, cy + y, 1, 1, c);
    }
}

/** ~30x38 tree sprite. `tone` 0..2 picks a green ramp. */
export function treeSprite(kind: TreeKind, tone: number): HTMLCanvasElement {
  const key = 't|' + kind + '|' + tone;
  const hit = cache.get(key);
  if (hit) return hit;

  const [art, , p] = makeCanvas(30, 38);
  const ramps: [string, string, string][] = [
    ['#2c7031', '#3f9245', '#63b968'],
    ['#256328', '#38853c', '#57ab5b'],
    ['#357a2f', '#4a9c42', '#6fc262'],
  ];
  const [base, mid, hi] = ramps[tone % 3];
  const trunk = '#6d4a2b';
  const trunkDk = '#54371e';

  if (kind === 'pine') {
    p(13, 28, 4, 8, trunk);
    p(13, 28, 1, 8, trunkDk);
    // stacked pixel triangles
    const tiers: [number, number, number][] = [
      [26, 11, 0],
      [20, 9, 1],
      [14, 7, 2],
      [8, 5, 3],
    ];
    for (const [yb, half] of tiers) {
      for (let r = 0; r < 6; r++) {
        const w = Math.max(1, half - r * (half / 6));
        const y = yb - r;
        const c = r > 3 ? mid : base;
        p(15 - w, y, w * 2, 1, c);
        if ((y + r) % 2 === 0) p(15 - w, y, 2, 1, hi);
      }
    }
    p(14, 2, 2, 3, mid);
  } else {
    p(13, 26, 4, 10, trunk);
    p(13, 26, 1, 10, trunkDk);
    p(11, 30, 2, 1, trunkDk); // root
    ditherDisc(p, 15, 13, 9, base, mid, hi);
    ditherDisc(p, 9, 18, 6, base, mid, hi);
    ditherDisc(p, 21, 18, 6, base, mid, hi);
    if (kind === 'blossom') {
      const pinks = ['#f2a7c3', '#f7c9dd', '#e78ad1'];
      for (let i = 0; i < 14; i++) {
        const a = (i * 137.5) % 360;
        const rr = 3 + ((i * 53) % 7);
        const x = 15 + Math.round(Math.cos((a * Math.PI) / 180) * rr);
        const y = 14 + Math.round(Math.sin((a * Math.PI) / 180) * rr * 0.8);
        p(x, y, 1, 1, pinks[i % 3]);
      }
    }
  }

  const done = outlined(art, '#1e3a1a');
  cache.set(key, done);
  return done;
}
