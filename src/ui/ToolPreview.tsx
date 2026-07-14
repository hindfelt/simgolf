import { useEffect, useRef } from 'react';
import type { ToolId } from '../game/types';
import { toolPreviewRecipe, type ToolPreviewMotif, type ToolPreviewRecipe } from './toolPreviewRecipes';

export const TOOL_PREVIEW_SIZE = { width: 68, height: 54 } as const;

type Point = readonly [number, number];
type Paint = string | CanvasGradient | CanvasPattern;

function polygon(ctx: CanvasRenderingContext2D, points: readonly Point[], fill: Paint, stroke?: string, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index][0], points[index][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function topDiamondPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(34, 3);
  ctx.lineTo(65, 21);
  ctx.lineTo(34, 40);
  ctx.lineTo(3, 21);
  ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, color: string, width: number, points: readonly Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) ctx.lineTo(points[index][0], points[index][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function pixel(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width = 2, height = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function drawPeopleProfile(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 34, 25, 23, 21, '#f5df27', '#303678');
  ellipse(ctx, 34, 25, 19, 17, '#8fab70', '#fff58b');
  polygon(ctx, [[18, 43], [23, 32], [31, 29], [38, 29], [46, 33], [50, 43]], '#426f9d', '#28316f');
  ellipse(ctx, 34, 22, 9, 11, '#dba77b', '#43362f');
  polygon(ctx, [[24, 18], [28, 11], [40, 12], [45, 18]], '#f4d83f', '#3e3c65');
  line(ctx, '#252c65', 1.5, [[30, 22], [32, 22], [36, 22], [38, 22]]);
  pixel(ctx, '#fff4b8', 28, 34, 4, 4);
  pixel(ctx, '#fff4b8', 37, 34, 4, 4);
}

function drawTileBase(ctx: CanvasRenderingContext2D, recipe: ToolPreviewRecipe, active: boolean) {
  if (active) {
    polygon(ctx, [[34, 0], [68, 20], [34, 43], [0, 20]], '#fff449', '#3a3577', 2);
    polygon(ctx, [[34, 2], [65, 20], [34, 40], [3, 20]], '#f2d914');
  }

  polygon(ctx, [[3, 21], [34, 40], [34, 49], [3, 30]], recipe.left, '#2d356e');
  polygon(ctx, [[65, 21], [34, 40], [34, 49], [65, 30]], recipe.right, '#2d356e');
  const gradient = ctx.createLinearGradient(12, 5, 54, 39);
  gradient.addColorStop(0, recipe.top[0]);
  gradient.addColorStop(1, recipe.top[1]);
  topDiamondPath(ctx);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#344078';
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.save();
  topDiamondPath(ctx);
  ctx.clip();
  line(ctx, 'rgba(255,255,255,.32)', 1, [[9, 18], [34, 5], [58, 18]]);
  const seed = recipe.motif.length;
  pixel(ctx, 'rgba(255,255,255,.18)', 11 + (seed % 7), 22 + (seed % 4), 2, 1);
  pixel(ctx, 'rgba(19,47,34,.14)', 44 + (seed % 5), 24 - (seed % 3), 2, 1);
  ctx.restore();
}

function drawPaperHand(ctx: CanvasRenderingContext2D, active: boolean) {
  if (active) polygon(ctx, [[12, 15], [55, 16], [64, 43], [22, 48]], '#fff449', '#3a3577', 2);
  polygon(ctx, [[13, 17], [54, 18], [61, 41], [23, 46]], '#555b9b');
  polygon(ctx, [[10, 12], [53, 13], [59, 38], [19, 42]], '#d8d8e9', '#354080', 1.2);
  const paper = ctx.createLinearGradient(16, 12, 54, 38);
  paper.addColorStop(0, '#f7f7fd');
  paper.addColorStop(1, '#aeb0d1');
  polygon(ctx, [[13, 12], [51, 14], [56, 35], [20, 39]], paper);
  line(ctx, 'rgba(255,255,255,.85)', 1, [[15, 14], [49, 16]]);

  // Pixel-hand cursor, authored instead of reusing the generic outline icon.
  ctx.fillStyle = '#fffdf3';
  ctx.strokeStyle = '#59639e';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(30, 31);
  ctx.lineTo(27, 27);
  ctx.lineTo(28, 25);
  ctx.lineTo(31, 27);
  ctx.lineTo(31, 20);
  ctx.lineTo(33, 19);
  ctx.lineTo(34, 25);
  ctx.lineTo(35, 18);
  ctx.lineTo(37, 18);
  ctx.lineTo(37, 25);
  ctx.lineTo(39, 19);
  ctx.lineTo(41, 20);
  ctx.lineTo(40, 27);
  ctx.lineTo(43, 22);
  ctx.lineTo(45, 23);
  ctx.lineTo(43, 31);
  ctx.lineTo(38, 35);
  ctx.lineTo(33, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFairwayStripes(ctx: CanvasRenderingContext2D, firm = false) {
  ctx.save();
  topDiamondPath(ctx);
  ctx.clip();
  for (let offset = -16; offset < 74; offset += firm ? 8 : 11) {
    line(ctx, firm ? 'rgba(223,242,137,.38)' : 'rgba(230,246,179,.34)', firm ? 3 : 5, [[offset, 7], [offset + 38, 42]]);
  }
  if (firm) {
    pixel(ctx, '#e3ed92', 47, 17, 2, 2);
    pixel(ctx, '#416f32', 20, 29, 2, 1);
  }
  ctx.restore();
}

function drawFlag(ctx: CanvasRenderingContext2D, x = 34, y = 9, gold = false) {
  line(ctx, '#24367a', 2, [[x, y], [x, 34]]);
  polygon(ctx, [[x + 1, y + 1], [x + 13, y + 5], [x + 1, y + 10]], gold ? '#28396c' : '#f5e33c', '#25336e');
  ellipse(ctx, x, 34, 5.5, 2.2, '#d8eaa0', '#315c36');
  ellipse(ctx, x, 34, 1.5, 0.8, '#1d2d46');
}

function drawSandBlob(ctx: CanvasRenderingContext2D, waste = false) {
  ctx.beginPath();
  ctx.moveTo(17, 22);
  ctx.bezierCurveTo(20, 14, 30, 12, 38, 15);
  ctx.bezierCurveTo(51, 16, 55, 23, 48, 29);
  ctx.bezierCurveTo(40, 35, 24, 34, 17, 28);
  ctx.closePath();
  ctx.fillStyle = waste ? '#c4a66c' : '#f0dfad';
  ctx.fill();
  ctx.strokeStyle = waste ? '#765f39' : '#b49d65';
  ctx.lineWidth = waste ? 2 : 1.3;
  ctx.stroke();
  if (waste) {
    line(ctx, '#8b713f', 1, [[22, 25], [29, 17]]);
    line(ctx, '#8b713f', 1, [[31, 31], [40, 18]]);
    line(ctx, '#8b713f', 1, [[41, 30], [47, 22]]);
    pixel(ctx, '#4e6b37', 21, 19, 3, 3);
    pixel(ctx, '#4e6b37', 45, 27, 2, 3);
  } else {
    line(ctx, 'rgba(255,249,213,.8)', 1, [[23, 25], [32, 19], [43, 22]]);
    line(ctx, '#c5ad73', 1, [[28, 30], [37, 24], [47, 25]]);
  }
}

function drawDeepRough(ctx: CanvasRenderingContext2D) {
  for (const [x, y, shade] of [[18, 27, '#264f2f'], [24, 22, '#b0ca73'], [30, 29, '#315c32'], [37, 19, '#a3c36e'], [43, 27, '#294e2d'], [49, 22, '#9db969']] as const) {
    line(ctx, shade, 1.5, [[x, y + 5], [x - 2, y], [x, y + 3], [x + 2, y - 2]]);
  }
}

function drawPotBunker(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 34, 22, 14, 7, '#6d5537', '#293d32');
  ellipse(ctx, 34, 20, 12, 5.5, '#efdcaa', '#ac945f');
  ellipse(ctx, 34, 22, 7, 3, '#9c8354');
  line(ctx, '#fff0c4', 1, [[25, 19], [34, 16], [43, 19]]);
}

function drawStream(ctx: CanvasRenderingContext2D) {
  ctx.save();
  topDiamondPath(ctx);
  ctx.clip();
  line(ctx, '#d7c487', 9, [[15, 14], [28, 19], [37, 27], [54, 31]]);
  line(ctx, '#4f9fbd', 6, [[15, 14], [28, 19], [37, 27], [54, 31]]);
  line(ctx, '#afe0e2', 1, [[17, 14], [28, 18], [38, 26], [52, 29]]);
  ctx.restore();
}

function drawBrush(ctx: CanvasRenderingContext2D) {
  for (const [x, y, r, color] of [[24, 23, 7, '#28542f'], [34, 19, 8, '#3f7437'], [43, 24, 7, '#244b2d'], [34, 27, 8, '#315f31']] as const) {
    ellipse(ctx, x, y, r, r * .55, color, '#1d3d29');
  }
  pixel(ctx, '#9abb65', 27, 18, 2, 2);
  pixel(ctx, '#adc974', 39, 21, 2, 2);
}

function drawRocks(ctx: CanvasRenderingContext2D) {
  polygon(ctx, [[17, 29], [22, 18], [29, 16], [34, 28]], '#8d8e83', '#3d4b4c');
  polygon(ctx, [[29, 30], [36, 13], [44, 17], [49, 30]], '#b1b09d', '#3d4b4c');
  polygon(ctx, [[42, 31], [48, 21], [54, 24], [55, 32]], '#787c76', '#3d4b4c');
  line(ctx, 'rgba(242,239,205,.55)', 1, [[37, 16], [43, 19]]);
}

function drawWater(ctx: CanvasRenderingContext2D) {
  ctx.save();
  topDiamondPath(ctx);
  ctx.clip();
  for (let y = 13; y < 35; y += 6) {
    line(ctx, y % 12 ? '#9cdce2' : '#d0f1e8', 1.2, [[10, y], [20, y - 2], [31, y + 1], [42, y - 1], [58, y + 1]]);
  }
  pixel(ctx, 'rgba(255,255,255,.65)', 45, 15, 5, 1);
  ctx.restore();
}

function drawPine(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 35, 34, 12, 4, 'rgba(25,48,33,.35)');
  pixel(ctx, '#714d2f', 33, 23, 4, 13);
  polygon(ctx, [[35, 7], [23, 24], [29, 23], [20, 31], [50, 31], [41, 23], [47, 24]], '#1f4d32', '#193a2c');
  polygon(ctx, [[35, 9], [27, 21], [43, 21]], '#42783b');
  pixel(ctx, '#74a24b', 31, 14, 3, 2);
}

function drawFlowers(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 34, 25, 17, 8, '#2f6934', '#244b2d');
  const flowers = [[22, 24, '#f7d755'], [28, 20, '#ee6f99'], [34, 27, '#f5f2d1'], [39, 20, '#9b7de1'], [46, 25, '#ef765f'], [29, 29, '#f2b856'], [42, 28, '#f5e86c']] as const;
  for (const [x, y, color] of flowers) {
    pixel(ctx, color, x, y, 3, 2);
    pixel(ctx, '#fff3bd', x + 1, y, 1, 1);
  }
}

function drawPath(ctx: CanvasRenderingContext2D) {
  ctx.save();
  topDiamondPath(ctx);
  ctx.clip();
  line(ctx, '#8a7659', 11, [[9, 33], [24, 27], [35, 20], [50, 16], [61, 12]]);
  line(ctx, '#d8bd8d', 8, [[9, 33], [24, 27], [35, 20], [50, 16], [61, 12]]);
  line(ctx, 'rgba(255,239,194,.55)', 1, [[11, 31], [25, 25], [36, 18], [50, 14]]);
  ctx.restore();
}

function drawElevation(ctx: CanvasRenderingContext2D, raised: boolean) {
  const top = raised ? 11 : 20;
  polygon(ctx, [[20, top + 10], [34, top + 2], [49, top + 10], [34, top + 19]], raised ? '#87b64e' : '#405f37', '#2f4732');
  if (raised) {
    polygon(ctx, [[20, top + 10], [34, top + 19], [34, top + 26], [20, top + 17]], '#3c6333');
    polygon(ctx, [[49, top + 10], [34, top + 19], [34, top + 26], [49, top + 17]], '#52763a');
    line(ctx, '#eef091', 2, [[34, 24], [34, 12], [29, 17], [34, 12], [39, 17]]);
  } else {
    polygon(ctx, [[20, top + 10], [34, top + 19], [49, top + 10], [45, top + 17], [34, top + 24], [24, top + 17]], '#263f30');
    line(ctx, '#dce88f', 2, [[34, 17], [34, 29], [29, 24], [34, 29], [39, 24]]);
  }
}

function drawLandDeed(ctx: CanvasRenderingContext2D) {
  polygon(ctx, [[18, 13], [49, 16], [46, 34], [21, 32]], '#f4ebc3', '#554c4c');
  line(ctx, '#8d805f', 1, [[24, 19], [43, 21]]);
  line(ctx, '#8d805f', 1, [[24, 23], [40, 25]]);
  line(ctx, '#8d805f', 1, [[24, 27], [36, 28]]);
  ellipse(ctx, 43, 30, 4, 2.5, '#cc4145', '#6e2e3a');
  line(ctx, '#f3d66c', 1, [[43, 32], [40, 38], [44, 36], [47, 39], [46, 32]]);
}

function drawHouse(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 35, 35, 15, 4, 'rgba(36,42,63,.25)');
  polygon(ctx, [[23, 19], [44, 21], [44, 35], [23, 33]], '#ddd2b5', '#41456c');
  polygon(ctx, [[20, 20], [34, 10], [49, 21], [43, 25], [34, 17], [25, 24]], '#9d4d43', '#41456c');
  pixel(ctx, '#3d477c', 29, 24, 4, 7);
  pixel(ctx, '#f3d979', 38, 24, 4, 4);
}

function drawDozer(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 34, 34, 17, 4, 'rgba(38,39,47,.25)');
  polygon(ctx, [[18, 27], [45, 25], [51, 33], [20, 35]], '#e2ae19', '#4d4838');
  polygon(ctx, [[25, 17], [40, 17], [45, 26], [23, 28]], '#f3c72a', '#4d4838');
  polygon(ctx, [[45, 26], [58, 23], [57, 34], [50, 34]], '#c88e15', '#4d4838');
  pixel(ctx, '#667684', 29, 19, 8, 6);
  line(ctx, '#333b43', 3, [[20, 35], [47, 34]]);
  for (let x = 23; x < 47; x += 6) ellipse(ctx, x, 35, 2.5, 2, '#3d4242');
}

function drawTeeOff(ctx: CanvasRenderingContext2D) {
  drawFlag(ctx, 39, 10, true);
  ellipse(ctx, 25, 30, 3, 1.5, '#fffdf1', '#38426c');
  line(ctx, '#28366f', 2, [[22, 19], [27, 23], [25, 29]]);
  ellipse(ctx, 21, 16, 3, 3, '#f0c19a', '#38426c');
  line(ctx, '#3e6da6', 3, [[22, 20], [23, 27]]);
  line(ctx, '#28366f', 1.5, [[26, 22], [31, 28], [30, 31]]);
}

function drawMotif(ctx: CanvasRenderingContext2D, motif: ToolPreviewMotif, active: boolean) {
  switch (motif) {
    case 'paper-hand': drawPaperHand(ctx, active); break;
    case 'people-profile': drawPeopleProfile(ctx); break;
    case 'new-hole': drawFlag(ctx, 34, 8, true); break;
    case 'fairway-stripes': drawFairwayStripes(ctx); break;
    case 'firm-fairway': drawFairwayStripes(ctx, true); break;
    case 'deep-rough': drawDeepRough(ctx); break;
    case 'putting-green': ellipse(ctx, 34, 25, 20, 10, '#86cf58', '#356d38'); drawFlag(ctx, 36, 8); break;
    case 'sand-trap': drawSandBlob(ctx); break;
    case 'waste-bunker': drawSandBlob(ctx, true); break;
    case 'pot-bunker': drawPotBunker(ctx); break;
    case 'stream-channel': drawStream(ctx); break;
    case 'brush-clump': drawBrush(ctx); break;
    case 'rock-cluster': drawRocks(ctx); break;
    case 'open-water': drawWater(ctx); break;
    case 'pine-tree': drawPine(ctx); break;
    case 'flower-bed': drawFlowers(ctx); break;
    case 'pathway': drawPath(ctx); break;
    case 'raised-land': drawElevation(ctx, true); break;
    case 'lowered-land': drawElevation(ctx, false); break;
    case 'land-deed': drawLandDeed(ctx); break;
    case 'facility-house': drawHouse(ctx); break;
    case 'bulldozer': drawDozer(ctx); break;
    case 'tee-off': drawTeeOff(ctx); break;
    default: {
      const exhaustive: never = motif;
      return exhaustive;
    }
  }
}

export function renderToolPreview(ctx: CanvasRenderingContext2D, tool: ToolId, active: boolean) {
  const recipe = toolPreviewRecipe(tool);
  ctx.clearRect(0, 0, TOOL_PREVIEW_SIZE.width, TOOL_PREVIEW_SIZE.height);
  if (recipe.base === 'tile') drawTileBase(ctx, recipe, active);
  drawMotif(ctx, recipe.motif, active);
}

export default function ToolPreview({ tool, active }: { tool: ToolId; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(TOOL_PREVIEW_SIZE.width * dpr);
    canvas.height = Math.round(TOOL_PREVIEW_SIZE.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    renderToolPreview(ctx, tool, active);
  }, [active, tool]);

  return <canvas ref={canvasRef} className="toolGraphic toolPreview" data-tool-preview={tool} aria-hidden="true" />;
}
