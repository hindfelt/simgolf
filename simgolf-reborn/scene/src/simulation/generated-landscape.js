import {isCoastal,islandTree,terrainRandom} from './coast.js';
import { coastalWater } from "./coast.js";
import { GRID, key, blocked } from "./world.js";
import { STARTING_ROWS } from "./land-purchase.js";

export const LANDSCAPES = Object.freeze({
  classic: "Willow Brook · original study",
  rolling: "Rolling parkland · ponds and hills",
  river: "River valley · winding stream and ponds",
  island: "Island resort · lagoons and outer islands",
  coast: "Coastal course · bays and rolling headlands",
});

// A live, editable landscape generator. The original executable reconstruction
// remains separate until its property geometry and building placement are integrated.
export function generateLandscape(seed, style) {
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Object.hasOwn(LANDSCAPES, style) ||
    style === "classic"
  )
    throw Error("Invalid landscape settings.");
  const random = terrainRandom(seed);
  const phase = random() * Math.PI * 2;
  const riverRow = 18 + Math.floor(random() * 16);
  const hillX=4+random()*9,hillZ=4+random()*9,relief=.6+random()*1.8,riverBend=2+random()*5;
  const ponds = [
    {
      c: 23 + Math.floor(random() * 14),
      r: 9 + Math.floor(random() * 7),
      w: 3 + Math.floor(random() * 3),
      h: 2 + Math.floor(random() * 2),
    },
    {
      c: 12 + Math.floor(random() * 20),
      r: 33 + Math.floor(random() * 4),
      w: 3 + Math.floor(random() * 2),
      h: 2,
    },
  ];
  const wet = new Set();
  const protectedCell = (c, r) => blocked(c, r) || (c < 15 && r < 23);
  for (let r = 0; r < STARTING_ROWS; r++)
    for (let c = 0; c < GRID.width; c++) {
      if (isCoastal(style) && !blocked(c, r, {}) && coastalWater(seed, c, r, style,2)) {
        wet.add(key(c, r));
        continue;
      }
      if (protectedCell(c, r)) continue;
      const reach = riverRow + Math.round(riverBend * Math.sin(c / (6+hillX) + phase));
      const pond = ponds.some((p) => {
        const x = Math.abs(c - p.c),
          y = Math.abs(r - p.r);
        return x <= p.w && y <= p.h && x + y < p.w + p.h;
      });
      if (
        (!isCoastal(style) && pond) ||
        (style === "river" && Math.abs(r - reach) <= 1)
      )
        wet.add(key(c, r));
    }
  const tiles = {},
    elevation = {};
  for (let r = 0; r < STARTING_ROWS; r++)
    for (let c = 0; c < GRID.width; c++) {
      const k = key(c, r);
      if (wet.has(k)) {
        tiles[k] = { type: "water" };
        continue;
      }
      if (protectedCell(c, r)) continue;
      let distance = 4;
      for (let dr = -3; dr <= 3; dr++)
        for (let dc = -3; dc <= 3; dc++) {
          if (
            c + dc >= 0 &&
            c + dc < GRID.width &&
            wet.has(key(c + dc, r + dr))
          )
            distance = Math.min(distance, Math.max(Math.abs(dc), Math.abs(dr)));
        }
      // Keep water banks and the clubhouse approach level, then ease into hills.
      const shore = Math.max(0, (distance - 1) / 3);
      const edge = Math.min(
        1,
        c / 3,
        r / 3,
        (GRID.width - 1 - c) / 3,
        (STARTING_ROWS - 1 - r) / 3,
      );
      const approach = Math.min(1, Math.max(c - 14, r - 22) / 4);
      const value =
        (Math.sin(c / hillX + phase) * 1.6*relief + Math.cos(r / hillZ - phase) * 1.3*relief) *
        shore *
        edge *
        approach;
      const h = isCoastal(style)
        ? Math.round(((style==='island'?.5:2.5) + Math.max(0,value)) * 2) / 2
        : Math.round(value * 2) / 2;
      if (h) elevation[k] = Math.max(-6,Math.min(6,h));
      if(style==='island'&&islandTree(seed,c,r))tiles[k]={type:'tree'};
    }
  for (let r = 10; r <= 14; r++) tiles[key(7, r)] = { type: "path" };
  return { terrainGeneration:2, tiles, elevation, starterBridgeRemoved: true, editableWater: true };
}
