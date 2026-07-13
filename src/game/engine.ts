import { W, H, HOLE_COST, CH, TINFO, LIE, ROLL, SHIRTS, SKINS, SAY, ELEV_COST, MAXE, PW, PH, PARCEL_W, PARCEL_H, LAND_COST, EH, CLUBS, SHOT_SHAPES } from './constants';
import { Tile } from './types';
import type { Aim, Ball, CareerProgress, FacilityActivity, FinanceCategory, Golfer, Hole, LieKey, Vec, ToolId, ClubId, ShotShape, PlayerShotRecord, PlayerRound, RoundRecord, RoundSource, Difficulty, SpecialGuestKind, SpecialVisitorState, ProProfile, ProSkillId, Regular, RegularSkill, RetiredCourse, ChampionshipResult, ProChallengeResult, ThemePackId, PropertyId, TreeCanopyImpact, WeatherState } from './types';
import { S, caches } from './state';
import { idx, idxC, inb, tileAt, clamp, lerp, rand, pick, gauss, dist, fmt$, hash2, lieOf, elevAt, ownedAt, parcelIdx, cornerH } from './rng';
import { isoOf, screenToWorld } from './camera';
import { golferFacingBetween } from './golferFacing';
import { sfx } from './audio';
import { ui, type TickerCharacter } from '../ui/store';
import {
  CH_TILES,
  buildingTiles,
  occupiedTiles,
  canPlace,
  recomputeConnectivity,
  feeMultiplier,
  spawnMoodBonus,
  moveSpeedMul,
  amenityMood,
  facilityNeedBoost,
  passiveIncomePerSec,
  themedDef,
  facilityDisplayName,
  facilityMaintenancePerSec,
  facilityOperational,
  facilityUpgradeInvestment,
  facilityUpgradeOptions,
  isUpgradeableFacility,
  facilityLevel,
  upgradedFacilityCount,
} from './buildings';
import type { Building, BuildingKind, EmployeeKind, CourseTheme, FacilityBranch } from './types';
import { EMP_CATALOG, hireCost, skilledUnlocked, addEmployee, fireOne, empWagesPerSec, empSpawnMood, empMoveSpeedMul, empMoodPerHole } from './employees';
import { footprintInBounds, greenFootprint, teeFootprint, tileKey } from './course';
import { findPath } from './pathfind';
import { isWaterBackedTile } from './bridges';
import { generateHoleConditions, weatherCarryMultiplier, weatherDispersionMultiplier, weatherRollMultiplier } from './weather';
import { clubLieProfile, fallbackClubForLie } from './clubProfiles';
import { applyRegularTraining, createRegularTraining, regularTrainingRates, sanitizeRegularTraining } from './regularTraining';
import { ballFlightPosition, firstTreeCanopyImpact, flightApexHeight, playerOnlyTreeCanopyImpact, shapeCurveOffset, treeDropPosition } from './flightPath';
import type { FlightPath } from './flightPath';
export { ballFlightPosition, flightApexHeight, shapeCurveOffset } from './flightPath';
import {
  ROUND_HISTORY_LIMIT,
  buildRoundRecord,
  courseFingerprint,
  isCourseRecord,
  isPersonalBest,
  roundHistoryToJson,
  sanitizeRoundHistory,
} from './scorecards';
import { attitudeDelta, isDifficulty } from './difficulty';
import { adjacentUnownedParcels, SPECIAL_GUESTS, specialGuestEnjoyed } from './specialGuests';
import {
  adjustProSkill,
  applyChampionshipCareer,
  applyProPracticeSession,
  championshipTitle,
  createDefaultTourPro,
  createProPracticeSession,
  createProChallengeOffer,
  createResidentPro,
  PRO_SKILLS,
  sanitizeProProfile,
  sanitizeProChallengeOffer,
  resolveProChallenge,
  simulateChampionshipResult,
} from './proCircuit';
import { classifySgaHole, sgaFeeMultiplier } from './sga';
import { FINANCE_LEDGER_LIMIT, financialYearAt, sanitizeFinanceLedger } from './finance';
import { MEMBER_GREEN_FEE_MULTIPLIER, membershipActive, membershipOfferFor, membershipVisitWeight, sanitizeMembership } from './memberships';
import { fillThemeStory, isThemePackId, themePackById, themePackCourse, themePackPlayers, themePackStories, themePackTouringPros } from './themePacks';
import { PROPERTY_INHERITANCE, WORLD_PROPERTIES, isPropertyId, newlyAvailableProperties, propertyAvailability, propertyById, sanitizeCareerProgress, sanitizePropertyHistory, starterPropertyForTheme } from './properties';
import type { PropertyAvailabilityContext } from './properties';
import { associateActivePortfolioMirror, bootstrapPortfolio, createPortfolioResort, listPortfolioResorts, portfolioSupported, saveActivePortfolioResort, sourceForPortfolioExpansion, switchPortfolioResortSnapshot, type ResortId, type ResortRecord } from './portfolio';

/* ---------------- UI bridge ---------------- */
export function setHint(t: string) {
  ui.set({ hint: t });
}
let commentSeq = 0;
function ticker(name: string, txt: string, cls?: string, character?: TickerCharacter) {
  ui.ticker(name, txt, cls, character);
  S.comments.push({ id: ++commentSeq, time: S.time, name, txt, cls });
  if (S.comments.length > 60) S.comments.shift();
}
export function updateTopbar() {
  ui.set({ cash: S.cash, rep: S.rep, fee: S.fee, golfers: S.golfers.length, holes: S.holes.length, courseName: S.courseName, courseTheme: S.theme, propertyId: S.propertyId, themePackId: S.themePackId, difficulty: S.difficulty, sandbox: S.sandbox });
}

function freshSpecialVisitors(): SpecialVisitorState {
  return {
    pickyCooldown: 38,
    ivanaCooldown: 62,
    pickyVisits: 0,
    ivanaVisits: 0,
    landmarkDonated: false,
    landmarkCredits: 0,
    landPurchased: false,
    landOffer: null,
  };
}

function changeMood(golfer: Golfer, delta: number) {
  golfer.mood += attitudeDelta(delta, S.difficulty);
}
/** Recolors the ground to a different course theme (manual: Parklands/Links/Desert/Tropical) — cosmetic only, no tiles/elevation change. */
export function setCourseTheme(theme: CourseTheme) {
  S.theme = theme;
  caches.orthoDirty = true;
  caches.groundDirty = true;
  updateTopbar();
}
export function updatePlayHud() {
  const p = S.player;
  if (!p) return;
  const h = S.holes[p.holeIdx];
  if (!h) return;
  const aim = p.aim?.on ? playerAimIntent(p.aim, p.lie) : null;
  const power = aim?.power ?? null;
  const weatherCarry = p.lie === 'green' ? 1 : weatherCarryMultiplier(S.weather);
  const clubRanges = {
    driver: playerIntendedDistance(p.lie, 'driver', 1) * weatherCarry,
    iron: playerIntendedDistance(p.lie, 'iron', 1) * weatherCarry,
    wedge: playerIntendedDistance(p.lie, 'wedge', 1) * weatherCarry,
  };
  const clubOptions = Object.fromEntries((['driver', 'iron', 'wedge'] as ClubId[]).map((clubId) => {
    const profile = clubLieProfile(p.lie, clubId);
    return [clubId, { carry: clubRanges[clubId], available: profile.available, reason: profile.reason, role: profile.role }];
  })) as Record<ClubId, { carry: number; available: boolean; reason: string | null; role: string }>;
  // The shared cache wraps the former direct call:
  // playerShotForecast(p.ball, p.lie, p.club, p.shape, aim.dirX, aim.dirY, aim.power)
  const forecast = aim ? cachedPlayerShotForecast(p, aim) : null;
  const plan = forecast?.plan ?? null;
  const landingLie = plan ? lieOf(plan.target.x, plan.target.y) : null;
  const rollout = plan && p.lie !== 'green' && landingLie && !forecast?.canopyImpact ? playerEstimatedRoll(landingLie, p.shape, p.club) : null;
  const landingDistance = plan && p.ball ? dist(p.ball, plan.target) : null;
  const restingDistance = forecast?.restingPoint && p.ball ? dist(p.ball, forecast.restingPoint) : null;
  const canopyStatus = forecast && p.lie !== 'green' ? forecast.canopyStatus : null;
  const canopyLabel = canopyStatus === 'clear'
    ? 'Canopy clear'
    : canopyStatus === 'canopy'
      ? 'Canopy risk'
      : canopyStatus === 'trunk'
        ? 'Trunk risk'
        : canopyStatus === 'pine'
          ? 'Pine risk'
          : null;
  const canopyAdvice = canopyStatus === 'canopy'
    ? p.shape === 'punch'
      ? 'Ideal line for Punch clips high branches; dispersion may miss. Shape around them or switch to Wedge for height.'
      : 'Ideal line clips the canopy; dispersion may miss. Try Punch under open branches, shape around the crown, or switch to Wedge for height.'
    : canopyStatus === 'trunk'
      ? 'Ideal line meets the trunk; dispersion may miss. Shape around it or switch to Wedge—Punch cannot go through wood.'
      : canopyStatus === 'pine'
        ? 'Ideal line clips low pine cover; dispersion may miss. Shape around it or choose a higher flight—Punch stays blocked.'
        : null;
  const keyboardRisk = canopyStatus && canopyStatus !== 'clear' && canopyLabel ? ` · ${canopyLabel}` : '';
  ui.set({
    playHud: {
      holeLabel: 'Hole ' + (p.holeIdx + 1) + ' of ' + S.holes.length + ' · Par ' + h.par,
      strokeLabel:
        'Stroke ' + (p.strokes + 1) + ' · ' +
        (p.lie === 'green' ? 'on the green · drag to putt' : 'lie: ' + p.lie + ' · drag back to swing'),
      coach: p.state === 'wait'
        ? 'Track the ball, then plan the next lie.'
        : p.aim?.kind === 'keyboard' && aim
          ? `Keyboard aim ${Math.round((((Math.atan2(aim.dirY, aim.dirX) * 180) / Math.PI) + 360) % 360)}° · ${Math.round(aim.power * 100)}% power · Enter to swing${keyboardRisk}.`
        : p.lie === 'green'
          ? 'Drag against the putting line, then release.'
          : 'Choose club and flight, drag back, then release.',
      onGreen: p.lie === 'green',
      lie: p.lie,
      pinDistance: dist(p.ball ?? h.tee, h.cup),
      clubRanges,
      clubOptions,
      power,
      carry: forecast?.plan.intend ?? (power === null ? null : playerIntendedDistance(p.lie, p.club, power)),
      rollout,
      finishDistance: restingDistance ?? (landingDistance === null ? null : landingDistance + (rollout ?? 0)),
      canopyStatus,
      canopyLabel,
      canopyAdvice,
      selectedRole: clubLieProfile(p.lie, p.club).role,
      club: p.club,
      shape: p.shape,
      windSpeed: S.wind.speed,
      windDx: S.wind.dx,
      windDy: S.wind.dy,
      weatherCondition: S.weather.condition,
      weatherIntensity: S.weather.intensity,
      weatherWetness: S.weather.wetness,
    },
  });
}

/* ---------------- money & feedback ---------------- */
function floater(wx: number, wy: number, txt: string, color?: string, kind?: 'txt' | 'cash' | 'bub') {
  S.floaters.push({ wx, wy, txt, color: color || '#fff', kind: kind || 'txt', age: 0, life: kind === 'bub' ? 2.6 : 1.6 });
}
let financeSeq = 1;
function recordFinance(amount: number, category: FinanceCategory, detail: string) {
  const whole = Math.trunc(amount);
  if (!whole) return;
  const year = financialYearAt(S.time);
  const safeDetail = detail.slice(0, 80);
  // The report is a journal, not a receipt printer: roll repeated per-hole and
  // operating entries into one line per detail/year so the full year remains legible.
  const existing = [...S.financeLedger].reverse().find((entry) => entry.year === year && entry.category === category && entry.detail === safeDetail);
  if (existing) {
    existing.amount += whole;
    existing.time = S.time;
    if (!existing.amount) S.financeLedger.splice(S.financeLedger.indexOf(existing), 1);
  } else {
    S.financeLedger.push({ id: ++financeSeq, time: S.time, year, amount: whole, category, detail: safeDetail });
  }
  if (S.financeLedger.length > FINANCE_LEDGER_LIMIT) S.financeLedger.splice(0, S.financeLedger.length - FINANCE_LEDGER_LIMIT);
}
function earn(n: number, wx: number, wy: number, category: FinanceCategory = 'greenFees', detail = 'Guest green fees') {
  S.cash += n;
  recordFinance(n, category, detail);
  floater(wx, wy, '+' + fmt$(n), '#ffd856', 'cash');
  sfx.coin();
  updateTopbar();
}
function spend(n: number, category: FinanceCategory = 'landscaping', detail = 'Course work'): boolean {
  if (S.sandbox) return true; // manual: Sandbox Mode plays "without the constraints of financial worries"
  if (S.cash < n) {
    sfx.err();
    setHint('Not enough cash in the bank!');
    return false;
  }
  S.cash -= n;
  recordFinance(-n, category, detail);
  updateTopbar();
  return true;
}

/* ---------------- holes ---------------- */
function lockedTiles(): Set<string> {
  const set = new Set<string>();
  for (const h of S.holes) {
    for (const k of h.teeTiles) set.add(k);
    for (const k of h.greenTiles) set.add(k);
  }
  return set;
}
export function parFor(d: number): number {
  return d <= 11 ? 3 : d <= 21 ? 4 : 5;
}
/** Renderer needs read access to hole-locked tiles for the placement ghost. */
export function lockedTilesForRender(): Set<string> {
  return lockedTiles();
}
function computeBeauty(h: Hole) {
  let score = 0;
  let n = 0;
  for (let t = 0; t <= 1; t += 0.2) {
    const px = Math.round(lerp(h.tee.x, h.cup.x, t));
    const py = Math.round(lerp(h.tee.y, h.cup.y, t));
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const tt = tileAt(px + dx, py + dy);
        if (tt === Tile.TREE || tt === Tile.FLOWER) score += 1;
        if (tt === Tile.WATER || tt === Tile.STREAM || tt === Tile.BRIDGE_WATER || tt === Tile.BRIDGE_STREAM) score += 0.7;
        if (tt === Tile.ROCK || tt === Tile.BRUSH) score += 0.25;
        n++;
      }
  }
  h.beauty = clamp((score / n) * 4, 0, 1);
}
/**
 * Risk/reward interest score: hazards close to the direct tee-cup line
 * ("in play"), how far the actual fairway bends off that line (dogleg),
 * elevation change tee->green, and green size (smaller = harder).
 */
function computeInterest(h: Hole) {
  let hazard = 0;
  let hazardN = 0;
  for (let t = 0.15; t <= 0.85; t += 0.1) {
    const px = lerp(h.tee.x, h.cup.x, t);
    const py = lerp(h.tee.y, h.cup.y, t);
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const tt = tileAt(Math.round(px) + dx, Math.round(py) + dy);
        if (tt === Tile.WATER || tt === Tile.STREAM) hazard += 1.2;
        if (tt === Tile.POT_BUNKER) hazard += 1.05;
        if (tt === Tile.ROCK) hazard += 0.95;
        if (tt === Tile.SAND || tt === Tile.WASTE_BUNKER) hazard += 0.8;
        if (tt === Tile.BRUSH) hazard += 0.75;
        if (tt === Tile.DEEP_ROUGH) hazard += 0.6;
        hazardN++;
      }
  }
  const hazardScore = clamp((hazard / hazardN) * 10, 0, 1);

  const lineDx = h.cup.x - h.tee.x;
  const lineDy = h.cup.y - h.tee.y;
  const len = Math.hypot(lineDx, lineDy) || 1;
  const nx = -lineDy / len;
  const ny = lineDx / len;
  let maxOffset = 0;
  for (let t = 0.25; t <= 0.75; t += 0.1) {
    const lx = lerp(h.tee.x, h.cup.x, t);
    const ly = lerp(h.tee.y, h.cup.y, t);
    let bestD2 = Infinity;
    let bestOffset = 0;
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const wx = Math.round(lx) + dx;
        const wy = Math.round(ly) + dy;
        const tt = tileAt(wx, wy);
        if (tt !== Tile.FAIR && tt !== Tile.FIRM_FAIR) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestOffset = Math.abs((wx - lx) * nx + (wy - ly) * ny);
        }
      }
    if (bestOffset > maxOffset) maxOffset = bestOffset;
  }
  const doglegScore = clamp(maxOffset / 6, 0, 1);

  const elevScore = clamp(Math.abs(elevAt(h.cup.x, h.cup.y) - elevAt(h.tee.x, h.tee.y)) / MAXE, 0, 1);
  const greenScore = clamp(1 - (h.greenTiles.length - 5) / 15, 0, 1);

  h.funBreakdown = { hazard: hazardScore, dogleg: doglegScore, elev: elevScore, green: greenScore };
  h.interest = clamp(hazardScore * 0.35 + doglegScore * 0.25 + elevScore * 0.2 + greenScore * 0.2, 0, 1);
}
function computeHoleStats(h: Hole) {
  computeBeauty(h);
  computeInterest(h);
}
/** Manual p.24 SGA skill class plus relative Top 100 / Top 18 recognition. */
function classifyHoles() {
  const scored = S.holes.map((h) => ({ h, score: h.beauty * 0.4 + h.interest * 0.6 }));
  scored.sort((a, b) => b.score - a.score);
  const top18Count = Math.max(1, Math.ceil(scored.length / 3));
  scored.forEach(({ h, score }, i) => {
    h.top100 = score >= 0.75;
    h.top18 = h.top100 && S.holes.length >= 6 && i < top18Count && score >= 0.85;
    classifySgaHole(h);
  });
}
function recomputeAllBeauty() {
  for (const h of S.holes) computeHoleStats(h);
  classifyHoles();
}

function holePlacementProblem(tx: number, ty: number, cx?: number, cy?: number): string | null {
  const tee = teeFootprint(tx, ty);
  const green = cx === undefined || cy === undefined ? [] : greenFootprint(cx, cy);
  const tiles = tee.concat(green);
  if (!footprintInBounds(tiles)) return 'Leave more room around the tee and green.';

  const locked = lockedTiles();
  const occupied = occupiedTiles();
  const clubhouse = new Set(CH_TILES.map(([x, y]) => `${x},${y}`));
  for (const tile of tiles) {
    const k = tileKey(tile);
    if (!ownedAt(tile.x, tile.y)) return 'The entire tee and green must be on land you own.';
    if (locked.has(k)) return 'That footprint overlaps another hole.';
    if (occupied.has(k) || clubhouse.has(k)) return 'A building is in the way.';
    const terrain = tileAt(tile.x, tile.y);
    if (
      terrain === Tile.WATER ||
      terrain === Tile.STREAM ||
      terrain === Tile.PATH ||
      terrain === Tile.BRIDGE_WATER ||
      terrain === Tile.BRIDGE_STREAM ||
      terrain === Tile.POT_BUNKER ||
      terrain === Tile.ROCK ||
      terrain === Tile.BRUSH
    )
      return 'The tee and green need clear, dry ground.';
  }
  return null;
}

function createHole(tx: number, ty: number, cx: number, cy: number, free: boolean): Hole | null {
  const problem = holePlacementProblem(tx, ty, cx, cy);
  if (problem) {
    setHint(problem);
    sfx.err();
    return null;
  }
  if (!free && !spend(HOLE_COST, 'courseConstruction', `Hole ${S.holes.length + 1} construction`)) return null;
  const teeTiles = teeFootprint(tx, ty).map(tileKey);
  const greenTiles = greenFootprint(cx, cy).map(tileKey);
  for (const { x, y } of teeFootprint(tx, ty)) S.tiles[idx(x, y)] = Tile.TEE;
  for (const { x, y } of greenFootprint(cx, cy)) S.tiles[idx(x, y)] = Tile.GREEN;
  // tees and greens sit on level pads carved into the terrain
  forceLevel(teeTiles, Math.round(elevAt(tx + 1, ty + 1)));
  forceLevel(greenTiles, Math.round(elevAt(cx + 0.5, cy + 0.5)));
  const tee = { x: tx + 1, y: ty + 1 };
  const cup = { x: cx + 0.5, y: cy + 0.5 };
  const h: Hole = { id: Date.now() + Math.random(), tee, cup, par: parFor(dist(tee, cup)), teeTiles, greenTiles, beauty: 0, interest: 0 };
  computeHoleStats(h);
  S.holes.push(h);
  classifyHoles();
  rebuildStatics();
  return h;
}
function removeHoleAt(x: number, y: number): boolean {
  const key = x + ',' + y;
  const i = S.holes.findIndex((h) => h.teeTiles.includes(key) || h.greenTiles.includes(key));
  if (i < 0) return false;
  const h = S.holes[i];
  const removedTiles = h.teeTiles.concat(h.greenTiles);
  for (const k of removedTiles) {
    const [a, b] = k.split(',');
    S.tiles[idx(+a, +b)] = Tile.ROUGH;
  }
  S.holes.splice(i, 1);
  S.cash += 300;
  recordFinance(300, 'refunds', 'Retired hole materials');
  updateTopbar();
  floater(h.cup.x, h.cup.y, 'Hole removed · +$300', '#ffd856');
  for (const g of S.golfers) {
    if (g.holeIdx > i) g.holeIdx--;
    else if (g.holeIdx === i) sendToNextHole(g);
  }
  if (S.player && S.player.holeIdx >= i) quitRound('That hole vanished under the bulldozer.');
  relaxPad(removedTiles);
  rebuildStatics();
  return true;
}
/** Lets a bulldozed tee/green pad settle back toward its surroundings instead of staying carved flat forever. */
function relaxPad(tileKeys: string[]) {
  const affected = new Set<number>();
  for (const k of tileKeys) {
    const [a, b] = k.split(',');
    for (const c of cornersOfTile(+a, +b)) affected.add(c);
  }
  const pins = cornerPins(); // now that the hole is gone, only other holes/buildings/water/clubhouse stay fixed
  for (let pass = 0; pass < 6; pass++) {
    for (const c of affected) {
      if (pins.has(c)) continue;
      const cx = c % (W + 1);
      const cy = (c / (W + 1)) | 0;
      let sum = 0;
      let n = 0;
      for (const [nx, ny] of [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ])
        if (nx >= 0 && ny >= 0 && nx <= W && ny <= H) {
          sum += S.elevC[idxC(nx, ny)];
          n++;
        }
      if (n) S.elevC[c] = Math.round(sum / n);
    }
    // re-enforce the ≤1-step invariant this pass may have disturbed
    for (const c of affected) {
      if (pins.has(c)) continue;
      const cx = c % (W + 1);
      const cy = (c / (W + 1)) | 0;
      for (const [nx, ny] of [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ])
        if (nx >= 0 && ny >= 0 && nx <= W && ny <= H) {
          const ni = idxC(nx, ny);
          if (pins.has(ni)) continue;
          const d = S.elevC[c] - S.elevC[ni];
          if (Math.abs(d) > 1) S.elevC[ni] += d > 0 ? 1 : -1;
        }
    }
  }
  caches.groundDirty = true;
}

/** Swap in a new hole order, keeping every golfer (and the player) pointed at the same physical hole by id. */
function applyHoleOrder(newHoles: Hole[]) {
  const newIndexById = new Map(newHoles.map((h, i) => [h.id, i]));
  const remap = (holeIdx: number) => {
    const id = S.holes[holeIdx]?.id;
    return id !== undefined && newIndexById.has(id) ? newIndexById.get(id)! : holeIdx;
  };
  for (const g of S.golfers) g.holeIdx = remap(g.holeIdx);
  if (S.player) S.player.holeIdx = remap(S.player.holeIdx);
  S.holes = newHoles;
  ui.set({ holesVersion: ui.get().holesVersion + 1 });
}
/** Swap hole `idx` with its neighbor in the play order (±1). Golfers already mid-round follow their hole, not the slot. */
export function moveHole(idx: number, dir: -1 | 1) {
  const j = idx + dir;
  if (idx < 0 || j < 0 || idx >= S.holes.length || j >= S.holes.length) return;
  const next = S.holes.slice();
  [next[idx], next[j]] = [next[j], next[idx]];
  applyHoleOrder(next);
  setHint('Hole order updated.');
}
/** Greedy nearest-neighbor route from the clubhouse — shortest total walk between tees and cups. */
export function renumberByProximity() {
  if (S.holes.length < 2) return;
  const remaining = S.holes.slice();
  const ordered: Hole[] = [];
  let cur: Vec = { x: CH.x, y: CH.y };
  while (remaining.length) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = dist(cur, remaining[i].tee);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const [h] = remaining.splice(bestI, 1);
    ordered.push(h);
    cur = h.cup;
  }
  applyHoleOrder(ordered);
  setHint('Course routing renumbered by proximity — shortest walk between holes.');
  ticker('Course Ops', 'Hole order renumbered for the shortest walk between greens and tees.', 'money');
}
/** Set (or clear, with `null`) a custom green fee for one hole — a signature hole can carry a premium price. */
export function setHoleFee(holeId: number, fee: number | null) {
  const h = S.holes.find((hh) => hh.id === holeId);
  if (!h) return;
  h.fee = fee === null ? undefined : clamp(Math.round(fee), 5, 200);
  ui.set({ holesVersion: ui.get().holesVersion + 1 });
}

/* ---------------- statics cache ---------------- */
export function rebuildStatics() {
  caches.trees = [];
  caches.waterTiles = [];
  caches.wildlife = [];
  caches.naturePatches = [];
  const ducks: { kind: 'duck'; x: number; y: number; s: number }[] = [];
  const deer: { kind: 'deer'; x: number; y: number; s: number }[] = [];
  const rabbits: { kind: 'rabbit'; x: number; y: number; s: number }[] = [];
  const birds: { kind: 'bird'; x: number; y: number; s: number }[] = [];
  const squirrels: { kind: 'squirrel'; x: number; y: number; s: number }[] = [];
  const patches: { kind: 'dandelion' | 'divot'; x: number; y: number; s: number }[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = tileAt(x, y);
      if (t === Tile.TREE) caches.trees.push({ x: x + 0.5, y: y + 0.5, s: hash2(x, y) });
      if (t === Tile.WATER || t === Tile.BRIDGE_WATER) caches.waterTiles.push({ x, y });
      if (!ownedAt(x, y)) continue;
      const s = hash2(x * 23 + 17, y * 31 + 9);
      if (t === Tile.WATER) ducks.push({ kind: 'duck', x: x + 0.5, y: y + 0.5, s });
      if (t === Tile.TREE) deer.push({ kind: 'deer', x: x + 0.5, y: y + 0.5, s });
      if (t === Tile.TREE) squirrels.push({ kind: 'squirrel', x: x + 0.5, y: y + 0.5, s: hash2(x * 7 + 3, y * 13 + 5) });
      if (t === Tile.ROUGH || t === Tile.DEEP_ROUGH || t === Tile.BRUSH || t === Tile.FLOWER) rabbits.push({ kind: 'rabbit', x: x + 0.5, y: y + 0.5, s });
      if (t === Tile.ROUGH || t === Tile.DEEP_ROUGH || t === Tile.BRUSH || t === Tile.FAIR) birds.push({ kind: 'bird', x: x + 0.5, y: y + 0.5, s });
      if (t === Tile.ROUGH || t === Tile.DEEP_ROUGH || t === Tile.FAIR) {
        const maintenance = hash2(x * 41 + 3, y * 19 + 27);
        patches.push({ kind: maintenance > 0.5 ? 'dandelion' : 'divot', x: x + 0.5, y: y + 0.5, s: maintenance });
      }
    }
  const strongest = <T extends { s: number }>(items: T[], count: number) => items.sort((a, b) => b.s - a.s).slice(0, count);
  caches.wildlife = [...strongest(ducks, 5), ...strongest(deer, 3), ...strongest(rabbits, 6), ...strongest(birds, 3), ...strongest(squirrels, 5)];
  caches.naturePatches = strongest(patches, 20);
  recomputeConnectivity();
  // rebuildStatics() only runs after something tile/ownership-shaped changed
  // (painting, hole/building placement, land purchase) — never for a pure
  // elevation edit — so it's always safe to force the ortho layer to redraw too.
  caches.orthoDirty = true;
  caches.groundDirty = true;
}

/* ---------------- buildings ---------------- */
export function placeBuilding(kind: BuildingKind, tx: number, ty: number): Building | null {
  const def = themedDef(kind, S.theme);
  if (kind === 'landmark' && !S.specialVisitors.landmarkDonated) {
    setHint('Landmarks unlock when Ivana Richman enjoys a round and donates the first one.');
    sfx.err();
    return null;
  }
  // center the footprint on the tapped tile
  const x = tx - ((def.w / 2) | 0);
  const y = ty - ((def.h / 2) | 0);
  if (!canPlace(kind, x, y, lockedTiles(), occupiedTiles())) {
    setHint('Can’t build there — need clear, dry, unclaimed ground.');
    sfx.err();
    return null;
  }
  const giftedLandmark = kind === 'landmark' && S.specialVisitors.landmarkCredits > 0;
  if (!giftedLandmark && !spend(def.cost, 'facilities', `${def.name} construction`)) return null;
  const b: Building = { id: Date.now() + Math.random(), kind, x, y, w: def.w, h: def.h, open: false };
  if (isUpgradeableFacility(kind)) b.level = 1;
  if (kind === 'buildinglot') {
    b.stage = 0;
    b.stageT = 0;
  }
  S.buildings.push(b);
  if (giftedLandmark) S.specialVisitors.landmarkCredits--;
  if (kind === 'airstrip' || kind === 'marina') S.nextFacilityActivity = Math.min(S.nextFacilityActivity, 1.5);
  rebuildStatics();
  sfx.coin();
  floater(x + def.w / 2, y + def.h / 2, def.name + '!', '#fff');
  if (giftedLandmark) ticker('Ivana Richman', 'My donated Landmark has found its home. More Landmarks may now be purchased.', 'money');
  if (!b.open) setHint(def.name + ' built — connect it to the clubhouse with a pathway to open it.');
  else ticker('Pro shop', def.name + ' is open for business.', 'money');
  return b;
}
function removeBuildingAt(x: number, y: number): boolean {
  const k = x + ',' + y;
  const i = S.buildings.findIndex((b) => buildingTiles(b).includes(k));
  if (i < 0) return false;
  const b = S.buildings[i];
  S.buildings.splice(i, 1);
  const bdef = themedDef(b.kind, S.theme);
  const refund = Math.round(bdef.cost * 0.4 + facilityUpgradeInvestment(b) * 0.25);
  S.cash += refund;
  recordFinance(refund, 'refunds', `${bdef.name} salvage`);
  updateTopbar();
  floater(b.x + b.w / 2, b.y + b.h / 2, bdef.name + ' removed · +' + fmt$(refund), '#ffd856');
  rebuildStatics();
  return true;
}

/** Start a timed facility upgrade. Level II selects the permanent operating branch;
 * Level III deepens it. Construction temporarily takes the facility offline. */
export function upgradeFacility(id: number, branch: FacilityBranch): boolean {
  const b = S.buildings.find((building) => building.id === id);
  if (!b || !isUpgradeableFacility(b.kind)) {
    setHint('That building cannot be upgraded.');
    sfx.err();
    return false;
  }
  const option = facilityUpgradeOptions(b).find((candidate) => candidate.branch === branch);
  if (!option) {
    setHint(b.upgrade ? 'That facility is already under construction.' : 'That facility is already fully upgraded.');
    sfx.err();
    return false;
  }
  if (option.lockedReason) {
    setHint(option.lockedReason);
    sfx.err();
    return false;
  }
  if (!spend(option.cost, 'facilities', `${facilityDisplayName(b, S.theme)} level ${option.targetLevel} upgrade`)) return false;
  b.upgrade = { targetLevel: option.targetLevel, branch, remaining: option.duration, duration: option.duration };
  const name = facilityDisplayName(b, S.theme);
  ticker('Resort Development', `${name} level ${option.targetLevel} construction has begun.`, 'money');
  setHint(`${option.name} is under construction — ${option.duration} sim-seconds remaining.`);
  sfx.coin();
  ui.set({ simTick: ui.get().simTick + 1 });
  return true;
}

/* ---------------- map generation ---------------- */
function blob(cx: number, cy: number, rx: number, ry: number, t: Tile) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++)
      if (inb(x, y) && ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1) S.tiles[idx(x, y)] = t;
}
function hill(cx: number, cy: number, rx: number, ry: number, lift: number) {
  // smooth cosine mound on the corner grid
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      if (x < 0 || y < 0 || x > W || y > H) continue;
      const q = Math.sqrt(((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry));
      if (q < 1) S.elevC[idxC(x, y)] = clamp(S.elevC[idxC(x, y)] + Math.round(lift * (Math.cos(q * Math.PI) + 1) * 0.5), 0, MAXE);
    }
}
/** Enforce the ≤1-step slope constraint everywhere (used after bulk edits). */
function relaxTerrain() {
  let changed = true;
  let guard = 300;
  while (changed && guard-- > 0) {
    changed = false;
    for (let y = 0; y <= H; y++)
      for (let x = 0; x <= W; x++) {
        const i = idxC(x, y);
        for (const [nx, ny] of [
          [x + 1, y],
          [x, y + 1],
        ]) {
          if (nx > W || ny > H) continue;
          const ni = idxC(nx, ny);
          const d = S.elevC[i] - S.elevC[ni];
          if (d > 1) {
            S.elevC[ni] = S.elevC[i] - 1;
            changed = true;
          } else if (d < -1) {
            S.elevC[i] = S.elevC[ni] - 1;
            changed = true;
          }
        }
      }
  }
}
export function initMap() {
  const property = propertyById(S.propertyId);
  S.tiles.fill(Tile.ROUGH);
  S.elevC.fill(0);
  // Property deeds vary in size; every layout includes the starter northwest block.
  S.owned.fill(0);
  for (const parcel of property.ownedParcels) S.owned[parcel] = 1;
  // rolling landscape across the whole map (revealed as parcels are bought)
  const relief = .6 + property.terrain.relief * .75;
  hill(33, 25, 8, 6.5, 3 * relief);
  hill(36, 8, 6, 5, 2 * relief);
  hill(8, 21, 5.5, 4.5, 2 * relief);
  hill(22, 30, 5, 4, 1 * relief);
  hill(52, 14, 8, 6, 3 * relief);
  hill(46, 36, 9, 7, 4 * relief);
  hill(12, 40, 6, 5, 2 * relief);
  hill(58, 42, 5, 4, 2 * relief);
  hill(18 + (property.terrain.seed % 5), 16 + (property.terrain.seed % 3), 4.5, 3.8, property.terrain.relief * 2.4);
  relaxTerrain();
  const waterScale = .7 + property.terrain.water * .45;
  const waterCount = clamp(Math.round(1 + property.terrain.water * 4), 1, 5);
  const waterBasins = [[30, 11, 3.2, 2.3], [13, 26, 2.2, 1.6], [44, 24, 4, 2.8], [24, 42, 3, 2.2], [57, 30, 2.4, 1.8]] as const;
  for (const [cx, cy, rx, ry] of waterBasins.slice(0, waterCount)) blob(cx, cy, rx * waterScale, ry * waterScale, Tile.WATER);
  // ponds sit in level basins
  const waterKeys: string[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(x, y) === Tile.WATER) waterKeys.push(x + ',' + y);
  forceLevel(waterKeys, 0);
  const bundled = themePackCourse(S.themePackId, S.themeCourseId);
  const starterHoles = bundled?.holes ?? [{ tee: [7, 7] as [number, number], cup: [15, 10] as [number, number] }];
  const nearStarterRouting = (x: number, y: number) => starterHoles.some(({ tee: [tx, ty], cup: [cx, cy] }) => {
    const vx = cx - tx;
    const vy = cy - ty;
    const amount = clamp(((x - tx) * vx + (y - ty) * vy) / Math.max(1, vx * vx + vy * vy), 0, 1);
    return Math.hypot(x - (tx + vx * amount), y - (ty + vy * amount)) < 2.7;
  });
  const treeChance = .018 + property.terrain.woodland * .09;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (Math.hypot(x - CH.x, y - CH.y) < 4 || nearStarterRouting(x, y) || tileAt(x, y) !== Tile.ROUGH) continue;
    const growth = hash2(x * 19 + property.terrain.seed, y * 31 + property.terrain.seed * 3);
    if (growth > 1 - treeChance) {
      const bloom = hash2(x * 43 + property.terrain.seed, y * 17 + 7);
      S.tiles[idx(x, y)] = bloom > .88 ? Tile.FLOWER : Tile.TREE;
    }
  }
  for (const layout of starterHoles) {
    const [tx, ty] = layout.tee;
    const [cx, cy] = layout.cup;
    createHole(tx, ty, cx, cy, true);
    for (let t = 0; t <= 1; t += 0.06) {
      const x = Math.round(lerp(tx, cx, t));
      const y = Math.round(lerp(ty, cy, t));
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (inb(x + dx, y + dy) && Math.abs(dx) + Math.abs(dy) < 2) {
            const terrain = tileAt(x + dx, y + dy);
            if (terrain !== Tile.WATER && terrain !== Tile.TEE && terrain !== Tile.GREEN) S.tiles[idx(x + dx, y + dy)] = Tile.FAIR;
          }
    }
  }
  if (bundled) S.courseName = bundled.name;
  rebuildStatics();
  seedRegulars();
}

/* ---------------- regulars & sim-stories ---------------- */
/** Builds the club's named cast from `NAMES` once; a no-op after that (idempotent, safe to call from initMap/newCourse/loadGame). */
function seedRegulars() {
  if (S.regulars.length) return;
  for (const player of themePackPlayers(S.themePackId)) {
    const shirt = player.shirt ?? pick(SHIRTS);
    let cap = player.cap ?? pick(SHIRTS);
    if (cap === shirt) cap = pick(SHIRTS); // one reroll so cap+shirt rarely match
    S.regulars.push({
      name: player.name,
      shirt,
      skin: player.skin ?? pick(SKINS),
      cap,
      length: clamp(player.length ?? rand(0.3, 0.95), .2, 1),
      accuracy: clamp(player.accuracy ?? rand(0.3, 0.95), .2, 1),
      imagination: clamp(player.imagination ?? rand(0.3, 0.95), .2, 1),
      visits: 0,
      streak: 0,
      lastVisit: -1e9,
      holesPlayed: 0,
      lifetimeSpend: 0,
      training: createRegularTraining(),
      celebrity: player.celebrity || undefined,
    });
  }
  // a handful of relationships give the ticker something to talk about
  const used = new Set<string>();
  const others = () => S.regulars.filter((r) => !used.has(r.name));
  const link = (type: 'rival' | 'couple') => {
    const pool = others();
    if (pool.length < 2) return;
    const a = pick(pool);
    const b = pick(pool.filter((r) => r.name !== a.name));
    used.add(a.name);
    used.add(b.name);
    a.relation = { type, withName: b.name, cd: 0 };
  };
  link('rival');
  link('rival');
  link('couple');
  link('couple');
  if (!S.regulars.some((regular) => regular.celebrity)) pick(others()).celebrity = true;
}
/** A regular's persistent record for a golfer, if any (golfers are always regulars, but stay defensive for old saves). */
function regularFor(name: string) {
  return S.regulars.find((r) => r.name === name);
}
/** Rivalries/couples: when both halves of a pair are on course together, drop a ticker line. */
function checkStoryMoments() {
  for (const r of S.regulars) {
    if (!r.relation) continue;
    if (r.relation.cd > 0) {
      r.relation.cd -= 1;
      continue;
    }
    const gA = S.golfers.find((g) => g.name === r.name);
    const gB = S.golfers.find((g) => g.name === r.relation!.withName);
    if (!gA || !gB || Math.random() > 0.5) continue;
    r.relation.cd = 2 + ((Math.random() * 3) | 0); // ~2-4 story checks (roughly 1-3 min) before this pair can fire again
    if (r.relation.type === 'rival') {
      const leader = gA.holeIdx !== gB.holeIdx ? (gA.holeIdx > gB.holeIdx ? gA : gB) : gA.strokes <= gB.strokes ? gA : gB;
      const chaser = leader === gA ? gB : gA;
      const themed = themePackStories(S.themePackId, 'rivalry');
      const line = themed.length ? fillThemeStory(pick(themed), { leader: leader.name, chaser: chaser.name, a: gA.name, b: gB.name }) : `${leader.name} is out ahead of old rival ${chaser.name} today — bragging rights on the line.`;
      ticker(`${gA.name} vs ${gB.name}`, line, 'money');
      floater(leader.x, leader.y - 1.4, 'Rivalry!', '#ffd856', 'bub');
    } else {
      const themed = themePackStories(S.themePackId, 'couple');
      const line = themed.length ? fillThemeStory(pick(themed), { a: gA.name, b: gB.name }) : `${gA.name} and ${gB.name} are out playing together again — regular as clockwork.`;
      ticker(`${gA.name} & ${gB.name}`, line, 'money');
      floater(gA.x, gA.y - 1.4, '💛', '#ffd0e6', 'bub');
    }
  }
}

/* ---------------- terraforming (corner heightfield) ---------------- */
/** Tiles already modified during the current drag stroke (raise/lower fire once per tile per stroke). */
const strokeTiles = new Set<string>();
export function beginPaintStroke() {
  strokeTiles.clear();
}
const cornersOfTile = (x: number, y: number) => [idxC(x, y), idxC(x + 1, y), idxC(x, y + 1), idxC(x + 1, y + 1)];

/**
 * Set the given tiles' corners to height h and smooth the surroundings — but never
 * ripple into a pinned corner (another hole, a building, water, the clubhouse), so a
 * new hole's pad or a water basin can't tilt the ground under something else.
 */
function forceLevel(tileKeys: string[], h: number) {
  const hh = clamp(h, 0, MAXE);
  const seedCorners = new Set<number>();
  for (const k of tileKeys) {
    const [a, b] = k.split(',');
    for (const c of cornersOfTile(+a, +b)) seedCorners.add(c);
  }
  const pins = cornerPins(seedCorners); // this footprint's own corners are always settable
  const q: number[] = [];
  for (const c of seedCorners) {
    S.elevC[c] = hh;
    q.push(c);
  }
  while (q.length) {
    const i = q.pop()!;
    const cy = (i / (W + 1)) | 0;
    const cx = i % (W + 1);
    const hc = S.elevC[i];
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ])
      if (nx >= 0 && ny >= 0 && nx <= W && ny <= H) {
        const ni = idxC(nx, ny);
        if (pins.has(ni)) continue; // never bulldoze a building/other hole/water pad
        if (Math.abs(hc - S.elevC[ni]) > 1) {
          S.elevC[ni] = hc > S.elevC[ni] ? hc - 1 : hc + 1;
          q.push(ni);
        }
      }
  }
  caches.groundDirty = true;
}

/** Corners that terraforming must not move (unless explicitly excluded). */
function cornerPins(exclude?: Set<number>): Set<number> {
  const pins = new Set<number>();
  const pinTile = (x: number, y: number) => {
    for (const c of cornersOfTile(x, y)) pins.add(c);
  };
  for (const b of S.buildings) for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) pinTile(b.x + dx, b.y + dy);
  for (const [cx, cy] of CH_TILES) pinTile(cx, cy);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWaterBackedTile(S.tiles[idx(x, y)])) pinTile(x, y);
  for (const h of S.holes)
    for (const k of h.teeTiles.concat(h.greenTiles)) {
      const [a, b] = k.split(',');
      pinTile(+a, +b);
    }
  if (exclude) for (const c of exclude) pins.delete(c);
  return pins;
}

/**
 * Plan a height change: seed corners get their target, then the ≤1-step
 * slope constraint ripples outward. Returns the full change set, or null
 * if it would disturb a pinned corner (building, water, another hole).
 */
function planTerraform(seeds: Map<number, number>, pins: Set<number>): Map<number, number> | null {
  const pend = new Map<number, number>();
  const get = (i: number) => (pend.has(i) ? pend.get(i)! : S.elevC[i]);
  const q: number[] = [];
  for (const [i, t] of seeds) {
    if (t === S.elevC[i]) continue;
    if (pins.has(i)) return null;
    pend.set(i, t);
    q.push(i);
  }
  while (q.length) {
    const i = q.pop()!;
    const cy = (i / (W + 1)) | 0;
    const cx = i % (W + 1);
    const h = get(i);
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx > W || ny > H) continue;
      const ni = idxC(nx, ny);
      const nh = get(ni);
      if (Math.abs(h - nh) <= 1) continue;
      if (pins.has(ni)) return null;
      pend.set(ni, h > nh ? h - 1 : h + 1);
      q.push(ni);
    }
  }
  for (const [i, v] of pend) if (v === S.elevC[i]) pend.delete(i);
  return pend;
}

function featureTilesAt(x: number, y: number): string[] | null {
  const k = x + ',' + y;
  for (const h of S.holes) {
    if (h.teeTiles.includes(k)) return h.teeTiles;
    if (h.greenTiles.includes(k)) return h.greenTiles;
  }
  return null;
}

function terraform(x: number, y: number, dir: 1 | -1): void {
  const k = x + ',' + y;
  if (strokeTiles.has(k)) return;
  if (isWaterBackedTile(tileAt(x, y))) {
    setHint('Water finds its own level — drain it with the bulldozer first.');
    return;
  }
  if (occupiedTiles().has(k)) {
    setHint('A building sits there. Bulldoze it first.');
    return;
  }

  // tees & greens move as one level slab
  const feat = featureTilesAt(x, y);
  const seedCorners = new Set<number>();
  const tiles = feat ?? [k];
  for (const tk of tiles) {
    const [a, b] = tk.split(',');
    for (const c of cornersOfTile(+a, +b)) seedCorners.add(c);
  }
  let lo = MAXE;
  let hi = 0;
  for (const c of seedCorners) {
    lo = Math.min(lo, S.elevC[c]);
    hi = Math.max(hi, S.elevC[c]);
  }
  const target = clamp(dir > 0 ? lo + 1 : hi - 1, 0, MAXE);
  const seeds = new Map<number, number>();
  for (const c of seedCorners) {
    const cur = S.elevC[c];
    const t = dir > 0 ? Math.max(cur, target) : Math.min(cur, target);
    if (t !== cur) seeds.set(c, t);
  }
  if (!seeds.size) return;

  const plan = planTerraform(seeds, cornerPins(feat ? seedCorners : undefined));
  if (!plan) {
    setHint('No room — a building, pond or another hole is holding that slope in place.');
    sfx.err();
    return;
  }
  if (!plan.size) return;
  const cost = plan.size * ELEV_COST;
  if (!spend(cost, 'landscaping', dir > 0 ? 'Raise terrain' : 'Lower terrain')) return;
  for (const [i, v] of plan) S.elevC[i] = v;
  for (const tk of tiles) strokeTiles.add(tk);
  if (feat) floater(x + 0.5, y + 0.5, (dir > 0 ? 'Raised' : 'Lowered') + ' the ' + (S.tiles[idx(x, y)] === Tile.TEE ? 'tee' : 'green') + '!', '#fff');
  caches.groundDirty = true;
}
export function paintAt(wx: number, wy: number) {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (!inb(x, y)) return;
  const tool = S.tool;
  const cur = tileAt(x, y);
  if (!ownedAt(x, y)) {
    setHint('You don’t own that land yet — 🗺️ Buy land to expand.');
    return;
  }
  if (tool === 'raise' || tool === 'lower') {
    terraform(x, y, tool === 'raise' ? 1 : -1);
    return;
  }
  if (tool === 'dozer') {
    const k = x + ',' + y;
    if (occupiedTiles().has(k)) {
      removeBuildingAt(x, y);
      return;
    }
    if (lockedTiles().has(k)) {
      // a green tile (not under the flag) shrinks tile by tile; tees and the cup remove the hole
      const h = S.holes.find((hh) => hh.greenTiles.includes(k));
      if (h && !(Math.floor(h.cup.x) === x && Math.floor(h.cup.y) === y)) {
        if (h.greenTiles.length <= 3) {
          setHint('That green is as small as it gets — bulldoze the flag to remove the hole.');
          return;
        }
        if (!spend(10, 'landscaping', 'Reshape green')) return;
        h.greenTiles = h.greenTiles.filter((t2) => t2 !== k);
        S.tiles[idx(x, y)] = Tile.ROUGH;
        rebuildStatics();
        recomputeAllBeauty();
        return;
      }
      removeHoleAt(x, y);
      return;
    }
    if (cur === Tile.BRIDGE_WATER || cur === Tile.BRIDGE_STREAM) {
      if (!spend(10, 'landscaping', 'Remove bridge deck')) return;
      S.tiles[idx(x, y)] = cur === Tile.BRIDGE_WATER ? Tile.WATER : Tile.STREAM;
      rebuildStatics();
      recomputeAllBeauty();
      return;
    }
    if (cur === Tile.ROUGH) return;
    if (!spend(TINFO[Tile.ROUGH].cost + 10, 'landscaping', 'Clear terrain')) return;
    S.tiles[idx(x, y)] = Tile.ROUGH;
    rebuildStatics();
    recomputeAllBeauty();
    return;
  }
  if (tool === 'green') {
    // extend the green of the nearest flag
    if (cur === Tile.GREEN) return;
    const k = x + ',' + y;
    if (lockedTiles().has(k) || occupiedTiles().has(k)) {
      setHint('Something is in the way there.');
      return;
    }
    let best: Hole | null = null;
    let bd = 7.5;
    for (const h of S.holes) {
      const d = Math.hypot(h.cup.x - (x + 0.5), h.cup.y - (y + 0.5));
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    if (!best) {
      setHint('Paint green near an existing flag to grow that green.');
      return;
    }
    if (!spend(TINFO[Tile.GREEN].cost, 'landscaping', 'Green turf')) return;
    S.tiles[idx(x, y)] = Tile.GREEN;
    best.greenTiles.push(k);
    forceLevel([k], cornerH(Math.floor(best.cup.x), Math.floor(best.cup.y))); // greens stay one level pad
    rebuildStatics();
    recomputeAllBeauty();
    return;
  }
  const map: Partial<Record<ToolId, Tile>> = {
    fair: Tile.FAIR,
    firmfair: Tile.FIRM_FAIR,
    deeprough: Tile.DEEP_ROUGH,
    sand: Tile.SAND,
    waste: Tile.WASTE_BUNKER,
    pot: Tile.POT_BUNKER,
    water: Tile.WATER,
    stream: Tile.STREAM,
    brush: Tile.BRUSH,
    rocks: Tile.ROCK,
    tree: Tile.TREE,
    flower: Tile.FLOWER,
    path: Tile.PATH,
  };
  let t = map[tool];
  if (t === undefined) return;
  if (tool === 'path') {
    if (cur === Tile.BRIDGE_WATER || cur === Tile.BRIDGE_STREAM) return;
    if (cur === Tile.WATER) t = Tile.BRIDGE_WATER;
    else if (cur === Tile.STREAM) t = Tile.BRIDGE_STREAM;
  }
  if (cur === t) return;
  if (lockedTiles().has(x + ',' + y)) {
    setHint('That tile belongs to a hole. Bulldoze the hole to reclaim it.');
    return;
  }
  if (occupiedTiles().has(x + ',' + y)) {
    setHint('A building sits there. Bulldoze it first.');
    return;
  }
  if (!spend(TINFO[t].cost, 'landscaping', TINFO[t].name)) return;
  S.tiles[idx(x, y)] = t;
  if (t === Tile.WATER) forceLevel([x + ',' + y], Math.floor(elevAt(x + 0.5, y + 0.5))); // water digs itself a level basin
  rebuildStatics();
  recomputeAllBeauty();
}

/* ---------------- land purchase ---------------- */
export function buyLandTap(wx: number, wy: number) {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (!inb(x, y)) return;
  if (ownedAt(x, y)) {
    setHint('You already own this parcel. Tap land marked FOR SALE.');
    return;
  }
  const parcel = parcelIdx(x, y);
  if (!S.specialVisitors.landOffer?.parcelIndices.includes(parcel)) {
    setHint('That land is not currently for sale. Impress I.M. Picky when he visits to receive a selection of plots.');
    sfx.err();
    return;
  }
  acceptLandOffer(parcel);
}

export function acceptLandOffer(parcel: number): boolean {
  const offer = S.specialVisitors.landOffer;
  if (!offer || !offer.parcelIndices.includes(parcel) || S.owned[parcel]) return false;
  if (!spend(offer.price, 'land', 'County expansion parcel')) return false;
  S.owned[parcel] = 1;
  S.specialVisitors.landPurchased = true;
  offer.parcelIndices = offer.parcelIndices.filter((candidate) => candidate !== parcel);
  caches.orthoDirty = true; // ownership dimming/dashed borders live on the ortho layer
  caches.groundDirty = true;
  rebuildStatics();
  sfx.tada();
  const px = (parcel % PW) * PARCEL_W + PARCEL_W / 2;
  const py = Math.floor(parcel / PW) * PARCEL_H + PARCEL_H / 2;
  floater(px, py, 'New land!', '#ffd856');
  ticker('I.M. Picky', 'The county approves your purchase — ' + fmt$(offer.price) + '. Room to grow!', 'money');
  setHint('New land acquired. Sculpt it, plant it, build on it.');
  if (!offer.parcelIndices.length) {
    S.specialVisitors.landOffer = null;
    if (ui.get().modal?.kind === 'landOffer') ui.set({ modal: null });
  } else ui.set({ simTick: ui.get().simTick + 1 });
  return true;
}

export function declineLandOffer() {
  S.specialVisitors.landOffer = null;
  S.specialVisitors.pickyCooldown = 55;
  if (ui.get().modal?.kind === 'landOffer') ui.set({ modal: null });
  setHint('I.M. Picky withdrew this selection. He will inspect the course again later.');
}

export function showLandOffer(): boolean {
  if (!S.specialVisitors.landOffer?.parcelIndices.length) return false;
  ui.set({ modal: { kind: 'landOffer' } });
  return true;
}
export function holeToolTap(wx: number, wy: number) {
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (!inb(x, y)) return;
  if (!S.holeDraft) {
    const k = x + ',' + y;
    // tapping an existing green moves that hole's flag there
    const gh = S.holes.find((h) => h.greenTiles.includes(k));
    if (gh) {
      if (Math.floor(gh.cup.x) === x && Math.floor(gh.cup.y) === y) {
        setHint('The flag is already there — tap another spot on this green to move it.');
        return;
      }
      gh.cup = { x: x + 0.5, y: y + 0.5 };
      gh.par = parFor(dist(gh.tee, gh.cup));
      computeHoleStats(gh);
      classifyHoles();
      sfx.putt();
      floater(gh.cup.x, gh.cup.y, 'Flag moved · Par ' + gh.par, '#fff');
      setHint('Flag repositioned. Paint more green (⛳ Green tool) to reshape it.');
      return;
    }
    const problem = holePlacementProblem(x - 1, y - 1);
    if (problem) {
      setHint(problem);
      sfx.err();
      return;
    }
    S.holeDraft = { tee: { x, y } };
    setHint('Now tap where the FLAG should go (at least 6 tiles away).');
    return;
  }
  const d = Math.hypot(x - S.holeDraft.tee.x, y - S.holeDraft.tee.y);
  if (d < 6) {
    setHint('Too close! Flag must be at least 6 tiles from the tee.');
    sfx.err();
    return;
  }
  if (!ownedAt(x, y)) {
    setHint('The flag needs to be on land you own.');
    sfx.err();
    return;
  }
  if (tileAt(x, y) === Tile.WATER || lockedTiles().has(x + ',' + y)) {
    setHint('The flag needs dry, unclaimed land.');
    sfx.err();
    return;
  }
  const h = createHole(S.holeDraft.tee.x - 1, S.holeDraft.tee.y - 1, x, y, false);
  if (h) {
    S.holeDraft = null;
    sfx.tada();
    floater(h.cup.x, h.cup.y, 'Hole ' + S.holes.length + ' · Par ' + h.par + '!', '#fff');
    setHint('Hole ' + S.holes.length + ' open for play! Paint some fairway between tee and green.');
    ticker('Pro shop', 'Hole ' + S.holes.length + ' (par ' + h.par + ') is now on the card.', 'money');
  }
}

/* ---------------- shots: shared physics ---------------- */
interface ShotTraits {
  length: number;
  accuracy: number;
  imagination: number;
}
/**
 * `traits`, when given (regulars), replace the single-scalar `skill` with three
 * independent axes so golfers actually play differently: length widens the swing
 * range, accuracy tightens aim, imagination reads slopes better (less lost distance
 * on uphill lies). Omitting `traits` reproduces the original skill-only formula
 * exactly, so the player's own shots are unaffected.
 */
function aimShot(from: Vec, target: Vec, lie: LieKey, skill: number, angScale: number, traits?: ShotTraits, forcedDistance?: number) {
  const L = LIE[lie] || LIE.rough;
  const minD = lie === 'green' ? 0.15 : 0.6; // putts can be tap-ins
  const remaining = dist(from, target);
  const lengthS = traits?.length ?? skill;
  const accS = traits?.accuracy ?? skill;
  const imgS = traits?.imagination ?? skill;
  const lengthBase = traits ? 0.82 : 0.9;
  const lengthSpread = traits ? 0.34 : 0.15;
  const intend = forcedDistance === undefined ? Math.min(L.max * (lengthBase + lengthS * lengthSpread), remaining) : Math.max(minD, forcedDistance);
  let ang = Math.atan2(target.y - from.y, target.x - from.x);
  ang += gauss() * L.ang * (Math.PI / 180) * (1.35 - accS) * (angScale || 1);
  let d = Math.max(minD, intend * (1 + gauss() * (L.dst + (1 - accS) * 0.05)));
  // uphill shots land short, downhill shots carry long — imaginative golfers read the slope better
  const lx = clamp(from.x + Math.cos(ang) * d, 0.6, W - 0.6);
  const ly = clamp(from.y + Math.sin(ang) * d, 0.6, H - 0.6);
  const slopePenalty = traits ? clamp(0.35 - imgS * 0.18, 0.08, 0.35) : 0.35;
  d = Math.max(minD, d - (elevAt(lx, ly) - elevAt(from.x, from.y)) * slopePenalty);
  return { x: clamp(from.x + Math.cos(ang) * d, 0.6, W - 0.6), y: clamp(from.y + Math.sin(ang) * d, 0.6, H - 0.6), power: d };
}
type BallSpec = Pick<Ball, 'kind' | 'owner' | 'cup' | 'fx' | 'fy' | 'tx' | 'ty' | 'events' | 'holed' | 'noRoll' | 'lowFlight' | 'shotShape' | 'curvePerpX' | 'curvePerpY' | 'curveDistance' | 'rollMultiplier'>;
function startBall(spec: BallSpec, heightMul = 1, nominalFlightDistance?: number) {
  const d = dist({ x: spec.fx, y: spec.fy }, { x: spec.tx, y: spec.ty });
  const ball: Ball = {
    ...spec,
    t: 0,
    dur: spec.kind === 'fly' ? 0.45 + d * 0.055 : 0.25 + d * 0.1,
    h: spec.kind === 'fly' ? flightApexHeight(nominalFlightDistance ?? d, heightMul) : 0,
    x: spec.fx,
    y: spec.fy,
  };
  if (ball.kind === 'fly') {
    ball.canopyImpact = playerOnlyTreeCanopyImpact(ball, { theme: S.theme, tileAt, elevationAt: elevAt }) ?? undefined;
  }
  S.balls.push(ball);
}
/**
 * Player-only Fade/Draw curvature (manual p.22): a lateral offset perpendicular to the
 * aim line that grows through the flight, so the shot lands left/right of a straight
 * aim instead of following it exactly. `t` is 0 at the tee, 1 at landing — used both
 * here (t=1, for the actual landing point) and in `drawAim`'s preview (stepped 0..1).
 */
function elevGrad(x: number, y: number): Vec {
  return {
    x: (elevAt(x + 1, y) - elevAt(x - 1, y)) / 2,
    y: (elevAt(x, y + 1) - elevAt(x, y - 1)) / 2,
  };
}
const isUnrecoverableLie = (lie: LieKey): lie is 'water' | 'stream' => lie === 'water' || lie === 'stream';

function lostBallImpact(lie: 'water' | 'stream', pos: Vec) {
  if (lie === 'water' || S.theme !== 'desert') {
    splash(pos.x, pos.y);
    sfx.splash();
  } else {
    floater(pos.x, pos.y - 0.4, 'Lost in the ravine!', '#e6b879');
    sfx.thunk();
  }
}

function rollFrom(pos: Vec, dir: Vec, terrKey: string, rollMultiplier = 1): { pos: Vec; hazard: ({ x: number; y: number; lie: 'water' | 'stream' }) | null } {
  let len = (ROLL[terrKey] !== undefined ? ROLL[terrKey] : 0.3) * rollMultiplier * weatherRollMultiplier(S.weather) * rand(0.7, 1.3);
  let p = { x: pos.x, y: pos.y };
  const d = { x: dir.x, y: dir.y };
  let guard = 60; // slope feedback could otherwise keep a ball rolling forever
  while (len > 0 && guard-- > 0) {
    const step = Math.min(0.25, len);
    // gravity: curve the roll toward downhill, stretch/shrink remaining roll
    const g = elevGrad(p.x, p.y);
    d.x -= g.x * 0.55 * step;
    d.y -= g.y * 0.55 * step;
    const m = Math.hypot(d.x, d.y) || 1;
    d.x /= m;
    d.y /= m;
    const slope = d.x * g.x + d.y * g.y; // >0 uphill, <0 downhill
    const nx = p.x + d.x * step;
    const ny = p.y + d.y * step;
    const l = lieOf(nx, ny);
    if (isUnrecoverableLie(l)) return { pos: p, hazard: { x: nx, y: ny, lie: l } };
    p = { x: clamp(nx, 0.6, W - 0.6), y: clamp(ny, 0.6, H - 0.6) };
    const drag = l === 'sand' || l === 'waste' || l === 'rough' || l === 'deeprough' || l === 'brush' || l === 'pot' || l === 'tree' ? 2.5 : 1;
    len -= step * clamp(drag + slope * 1.6, 0.35, 4);
  }
  return { pos: p, hazard: null };
}
function resolveFly(b: Ball) {
  const from = { x: b.fx, y: b.fy };
  let pos = { x: b.tx, y: b.ty };
  const events: string[] = [];
  if (b.canopyImpact) {
    pos = treeDropPosition(b, b.canopyImpact);
    events.push('tree');
    sfx.thunk();
    // A canopy strike drops immediately: no ground release, no extra stroke penalty.
    settleShot(b, pos, events, false, 'tree');
    return;
  }
  if (usesLegacyEndpointTreeDeflection(b) && lieOf(pos.x, pos.y) === 'tree' && Math.random() < 0.5) {
    const back = rand(0.55, 0.75);
    pos = { x: lerp(from.x, b.tx, back), y: lerp(from.y, b.ty, back) };
    events.push('tree');
    sfx.thunk();
  }
  // Rocks don't merely produce a bad lie: the first impact kicks the ball in an
  // unpredictable direction, matching the manual's explicit random-deflection rule.
  if (lieOf(pos.x, pos.y) === 'rock') {
    const a = rand(0, Math.PI * 2);
    const kick = rand(0.65, 1.65);
    pos = { x: clamp(pos.x + Math.cos(a) * kick, 0.6, W - 0.6), y: clamp(pos.y + Math.sin(a) * kick, 0.6, H - 0.6) };
    events.push('rock');
    sfx.thunk();
  }
  const lostLie = lieOf(pos.x, pos.y);
  if (isUnrecoverableLie(lostLie)) {
    lostBallImpact(lostLie, pos);
    events.push(lostLie);
    let drop = from;
    for (let s = 0.95; s >= 0; s -= 0.05) {
      const px = lerp(from.x, pos.x, s);
      const py = lerp(from.y, pos.y, s);
      if (!isUnrecoverableLie(lieOf(px, py))) {
        drop = { x: px, y: py };
        break;
      }
    }
    settleShot(b, drop, events, false);
    return;
  }
  if (b.noRoll) {
    // High Backspin: stops dead where it lands instead of rolling out (manual p.22)
    settleShot(b, pos, events, false);
    return;
  }
  const dd = dist(from, pos);
  if (dd > 0.2) {
    const dir = { x: (pos.x - from.x) / dd, y: (pos.y - from.y) / dd };
    const r = rollFrom(pos, dir, lieOf(pos.x, pos.y), b.rollMultiplier);
    if (r.hazard) {
      lostBallImpact(r.hazard.lie, r.hazard);
      events.push(r.hazard.lie);
      settleShot(b, pos, events, false);
      return;
    }
    if (dist(pos, r.pos) > 0.12) {
      startBall({ kind: 'roll', owner: b.owner, cup: b.cup, fx: pos.x, fy: pos.y, tx: r.pos.x, ty: r.pos.y, events });
      return;
    }
  }
  settleShot(b, pos, events, false);
}
export function usesLegacyEndpointTreeDeflection(ball: Pick<Ball, 'owner' | 'lowFlight'>): boolean {
  return ball.owner !== 'P' && !ball.lowFlight;
}

function settleShot(b: Ball, pos: Vec, events: string[], holedFlag: boolean, forcedLie?: LieKey) {
  let holed = holedFlag;
  const resultLie = forcedLie ?? lieOf(pos.x, pos.y);
  if (!holed && b.cup && resultLie === 'green' && dist(pos, b.cup) < 0.45) {
    holed = true;
    events.push('chip');
  }
  if (holed && b.cup) pos = { x: b.cup.x, y: b.cup.y };
  if (b.owner === 'P') {
    onPlayerLand(pos, events, holed, forcedLie);
    return;
  }
  onGolferLand(b.owner, pos, events, holed);
}

/* ---------------- golfers ---------------- */
/** Sets a golfer's walk target and pre-computes an A* route around water/trees/steep ground. */
function setGolferTarget(g: Golfer, x: number, y: number) {
  g.tx = x;
  g.ty = y;
  g.path = findPath({ x: g.x, y: g.y }, { x, y }) ?? undefined;
  g.pathIdx = 0;
}
function golferCap(): number {
  // big courses need a real field of players, not 14 souls on 30 holes
  const base = Math.min(4 + S.holes.length * 2, 36);
  return S.tournament ? base + 12 : base; // a tournament weekend draws a bigger crowd
}
function spawnGolfer() {
  seedRegulars();
  // every golfer is one of the club's named regulars; skip names already on course
  // (falls back to allowing a repeat if the whole roster happens to be out playing)
  const onCourse = new Set(S.golfers.map((g) => g.name));
  const pool = S.regulars.filter((r) => !onCourse.has(r.name));
  const available = pool.length ? pool : S.regulars;
  const year = financialYearAt(S.time);
  const weighted = available.flatMap((regular) => Array.from({ length: membershipVisitWeight(regular.membership, year) }, () => regular));
  const r = pick(weighted);
  const g: Golfer = {
    name: r.name,
    skill: (r.length + r.accuracy + r.imagination) / 3,
    length: r.length,
    accuracy: r.accuracy,
    imagination: r.imagination,
    shirt: r.shirt,
    skin: r.skin,
    cap: r.cap,
    x: CH.x,
    y: CH.y,
    tx: CH.x,
    ty: CH.y,
    phase: Math.random() * 9,
    state: 'toTee',
    t: 0,
    holeIdx: 0,
    strokes: 0,
    mood: 0,
    ball: null,
    lie: 'tee',
    chatCd: 0,
    scenicSaid: false,
    energy: rand(0.85, 1),
    hunger: rand(0.85, 1),
    thirst: rand(0.85, 1),
  };
  const fair = 10 + S.rep * 6 + S.holes.length * 1.5;
  if (!S.tournament && S.fee > fair * 1.45 && Math.random() < 0.6) {
    S.lost++;
    floater(CH.x, CH.y - 1, pick(SAY.pricey), '#ffb0a6', 'bub');
    ticker(g.name, pick(SAY.pricey), 'bad', golferTickerCharacter(g, 'bad'));
    return;
  }
  if (S.fee > fair) changeMood(g, -(S.fee - fair) / 12);
  g.mood += spawnMoodBonus() + empSpawnMood();
  if (membershipActive(r.membership, year)) g.mood += 0.25;
  if (S.tournament) g.mood += 1; // tournament crowd energy
  const hole = S.holes[0];
  if (!hole) return;
  setGolferTarget(g, hole.tee.x + rand(-0.3, 0.3), hole.tee.y + rand(-0.3, 0.3));
  S.golfers.push(g);
  if (S.tournament) S.tournament.entrants++;
  r.streak = S.time - r.lastVisit < 260 ? r.streak + 1 : 1;
  r.visits++;
  r.lastVisit = S.time;
  if (r.visits === 3 || r.visits === 10 || (r.visits > 10 && r.visits % 25 === 0)) {
    const themed = themePackStories(S.themePackId, 'visitMilestone');
    const line = themed.length ? fillThemeStory(pick(themed), { name: r.name, visits: r.visits }) : `${r.name} is back for visit #${r.visits} — a real regular now.`;
    ticker(r.name, line, 'money', golferTickerCharacter(r, 'money'));
    S.rep = clamp(S.rep + 0.03, 0.3, 5);
  }
  if (r.celebrity) {
    g.mood += 1.5;
    confetti(CH.x, CH.y);
    const themed = themePackStories(S.themePackId, 'celebrityArrival');
    const line = themed.length ? fillThemeStory(pick(themed), { name: r.name }) : `Local celebrity ${r.name} has arrived — everyone's watching!`;
    ticker(r.name, line, 'money', golferTickerCharacter(r, 'money'));
    S.rep = clamp(S.rep + 0.05, 0.3, 5);
  }
  updateTopbar();
}

const SPECIAL_GUEST_STYLE: Record<SpecialGuestKind, { shirt: string; skin: string; cap: string; skill: number }> = {
  picky: { shirt: '#2f506f', skin: '#e0a878', cap: '#d8d2bd', skill: 0.58 },
  ivana: { shirt: '#9b3f72', skin: '#f1c6a0', cap: '#f0d36f', skill: 0.74 },
};

function spawnSpecialGuest(kind: SpecialGuestKind): boolean {
  const hole = S.holes[0];
  if (!hole || S.golfers.some((golfer) => golfer.specialGuest)) return false;
  const style = SPECIAL_GUEST_STYLE[kind];
  const guest = SPECIAL_GUESTS[kind];
  const golfer: Golfer = {
    name: guest.name,
    skill: style.skill,
    length: style.skill,
    accuracy: style.skill,
    imagination: style.skill,
    shirt: style.shirt,
    skin: style.skin,
    cap: style.cap,
    x: CH.x,
    y: CH.y,
    tx: CH.x,
    ty: CH.y,
    phase: Math.random() * 9,
    state: 'toTee',
    t: 0,
    holeIdx: 0,
    strokes: 0,
    mood: spawnMoodBonus() + empSpawnMood(),
    ball: null,
    lie: 'tee',
    chatCd: 0,
    scenicSaid: false,
    energy: 1,
    hunger: 1,
    thirst: 1,
    specialGuest: kind,
  };
  setGolferTarget(golfer, hole.tee.x, hole.tee.y);
  S.golfers.push(golfer);
  ticker(guest.name, `${guest.title} has arrived for an official round. Make an impression.`, 'money');
  floater(CH.x, CH.y - 1.2, `${guest.name} visits!`, '#ffd856', 'bub');
  updateTopbar();
  return true;
}

function createPickyOffer() {
  const candidates = adjacentUnownedParcels(S.owned, PW, PH);
  if (!candidates.length) {
    ticker('I.M. Picky', 'You already own every adjoining plot. The county has nothing left to offer.', 'money');
    return;
  }
  const start = S.specialVisitors.pickyVisits % candidates.length;
  const parcelIndices: number[] = [];
  for (let step = 0; step < candidates.length && parcelIndices.length < 3; step++) {
    parcelIndices.push(candidates[(start + step) % candidates.length]);
  }
  S.specialVisitors.landOffer = {
    id: Date.now(),
    parcelIndices,
    price: LAND_COST,
    remaining: 105,
  };
  ticker('I.M. Picky', `Impressive. The county is offering ${parcelIndices.length} adjoining plot${parcelIndices.length === 1 ? '' : 's'} for expansion.`, 'money');
  sfx.tada();
  if (!ui.get().modal) ui.set({ modal: { kind: 'landOffer' } });
}

function finishSpecialGuestVisit(golfer: Golfer) {
  const kind = golfer.specialGuest;
  if (!kind) return;
  const completed = golfer.holeIdx >= S.holes.length;
  const enjoyed = specialGuestEnjoyed(golfer.mood, completed);
  if (kind === 'picky') {
    S.specialVisitors.pickyVisits++;
    S.specialVisitors.pickyCooldown = enjoyed ? 80 : 48;
    if (enjoyed) createPickyOffer();
    else ticker('I.M. Picky', completed ? 'The course did not impress me enough to release more county land.' : 'I left early. No additional land will be offered.', 'bad');
    return;
  }
  S.specialVisitors.ivanaVisits++;
  S.specialVisitors.ivanaCooldown = 58;
  if (!enjoyed) {
    ticker('Ivana Richman', completed ? 'Lovely potential, but not yet worthy of my collection.' : 'I could not finish the round. Perhaps next time.', 'bad');
    return;
  }
  S.specialVisitors.landmarkDonated = true;
  S.specialVisitors.landmarkCredits++;
  ticker('Ivana Richman', 'I adored the course. Please accept a Landmark as my gift to the resort.', 'money');
  sfx.tada();
  if (!ui.get().modal) ui.set({ modal: { kind: 'landmarkGift' } });
}

function settleMembership(golfer: Golfer) {
  if (golfer.specialGuest) return;
  const regular = regularFor(golfer.name);
  if (!regular) return;
  const year = financialYearAt(S.time);
  const offer = membershipOfferFor(regular, golfer.holeIdx, S.holes.length, golfer.mood, year, S.fee);
  if (!offer) return;
  const previous = regular.membership;
  const paid = (previous?.paid ?? 0) + offer.price;
  if (offer.kind === 'lifetime') {
    regular.membership = {
      tier: 'lifetime',
      sinceYear: previous?.sinceYear ?? year,
      lastRenewedYear: year,
      paid,
    };
  } else {
    regular.membership = {
      tier: 'annual',
      sinceYear: previous?.sinceYear ?? year,
      lastRenewedYear: year,
      paid,
      expiresYear: year,
    };
  }
  regular.lifetimeSpend = (regular.lifetimeSpend ?? 0) + offer.price;
  const label = offer.kind === 'annual' ? 'annual membership' : offer.kind === 'renewal' ? 'membership renewal' : 'lifetime membership';
  earn(offer.price, CH.x, CH.y - 1, 'memberships', `${regular.name} · ${label}`);
  ticker('Membership Desk', `${regular.name} purchased a ${label} for ${fmt$(offer.price)}.`, 'money');
  floater(CH.x, CH.y - 1.5, offer.kind === 'lifetime' ? 'LIFETIME MEMBER!' : 'NEW MEMBER!', '#ffe27a', 'bub');
  if (offer.kind !== 'renewal') confetti(CH.x, CH.y);
}
function sendToNextHole(g: Golfer) {
  const h = S.holes[g.holeIdx];
  if (!h) {
    g.state = 'leave';
    setGolferTarget(g, CH.x, CH.y);
    return;
  }
  g.state = 'toTee';
  setGolferTarget(g, h.tee.x + rand(-0.3, 0.3), h.tee.y + rand(-0.3, 0.3));
}
function sayText(g: Golfer, txt: string, cls?: string) {
  if (g.chatCd > 0) return;
  g.chatCd = 4;
  floater(g.x, g.y - 1.2, txt, '#fff', 'bub');
  ticker(g.name, txt, cls, golferTickerCharacter(g, cls));
}

function golferTickerCharacter(golfer: Pick<Golfer, 'name' | 'shirt' | 'skin' | 'cap'> | Pick<Regular, 'name' | 'shirt' | 'skin' | 'cap'>, cls?: string): TickerCharacter {
  return {
    identity: golfer.name,
    shirt: golfer.shirt,
    skin: golfer.skin,
    cap: golfer.cap,
    expression: cls === 'bad' ? 'cross' : cls === 'money' ? 'triumphant' : 'pleased',
  };
}
function say(g: Golfer, key: string, cls?: string) {
  sayText(g, pick(SAY[key]), cls);
}
function faceGolferToward(g: Golfer, from: Vec, to: Vec) {
  const facing = golferFacingBetween(from, to);
  g.face = facing.face;
  g.facingAway = facing.facingAway;
}
/** Why a low-interest hole is dull, for anchored complaints ("Hole 3 is flat and hazard-free"). */
function boringReason(h: Hole): string {
  const b = h.funBreakdown;
  if (!b) return 'not much of a challenge';
  const flat = b.elev < 0.15;
  const safe = b.hazard < 0.15;
  if (flat && safe) return 'flat and hazard-free';
  if (safe) return 'hazard-free — nothing to think about';
  if (flat) return 'flat as a pancake';
  if (b.dogleg < 0.15) return 'a dead-straight shot with no character';
  return 'missing anything memorable';
}
function aiShot(g: Golfer) {
  const h = S.holes[g.holeIdx];
  if (!h) {
    sendToNextHole(g);
    return;
  }
  g.strokes++;
  const traits = g.accuracy !== undefined ? { length: g.length!, accuracy: g.accuracy!, imagination: g.imagination! } : undefined;
  const land = aimShot(g.ball!, h.cup, g.lie, g.skill, 1, traits);
  sfx.whoosh();
  sfx.hit();
  if (land.power > 9 && Math.random() < 0.35) say(g, 'drive');
  faceGolferToward(g, g.ball!, h.cup);
  startBall({ kind: 'fly', owner: g, cup: h.cup, fx: g.ball!.x, fy: g.ball!.y, tx: land.x, ty: land.y });
  g.state = 'watch';
  g.t = 0.55; // hold the follow-through pose briefly
}
function aiPutt(g: Golfer) {
  const h = S.holes[g.holeIdx];
  if (!h) {
    sendToNextHole(g);
    return;
  }
  g.strokes++;
  const d = dist(g.ball!, h.cup);
  let p = d <= 1.3 ? 0.97 : d <= 2.5 ? 0.72 : d <= 4.5 ? 0.42 : d <= 7 ? 0.22 : 0.08;
  // putting leans on a steady hand (accuracy) more than raw touch (imagination)
  const puttSkill = (g.accuracy ?? g.skill) * 0.65 + (g.imagination ?? g.skill) * 0.35;
  p = clamp(p * (0.7 + puttSkill * 0.5), 0, 0.96);
  sfx.putt();
  let end: Vec;
  const made = Math.random() < p;
  if (made) end = { x: h.cup.x, y: h.cup.y };
  else {
    const a = Math.atan2(h.cup.y - g.ball!.y, h.cup.x - g.ball!.x) + gauss() * 0.25;
    const nd = clamp(d * rand(0.12, 0.38) + 0.35, 0.4, d);
    end = { x: clamp(h.cup.x - Math.cos(a) * nd, 0.6, W - 0.6), y: clamp(h.cup.y - Math.sin(a) * nd, 0.6, H - 0.6) };
  }
  faceGolferToward(g, g.ball!, h.cup);
  startBall({ kind: 'putt', owner: g, cup: h.cup, fx: g.ball!.x, fy: g.ball!.y, tx: end.x, ty: end.y, holed: made });
  g.state = 'watch';
  g.t = 0.4;
}
function onGolferLand(g: Golfer, pos: Vec, events: string[], holed: boolean) {
  const h = S.holes[g.holeIdx];
  for (const e of events) {
    if (e === 'water' || e === 'stream') {
      g.strokes++;
      changeMood(g, -1);
      say(g, e, 'bad');
      floater(pos.x, pos.y - 0.8, '+1 penalty', '#ff9d94');
    }
    if (e === 'tree') {
      changeMood(g, -0.4);
      say(g, 'tree', 'bad');
    }
    if (e === 'rock') {
      changeMood(g, -0.5);
      say(g, 'rock', 'bad');
    }
    if (e === 'chip') {
      g.mood += 2;
      say(g, 'chip');
      confetti(pos.x, pos.y);
    }
  }
  g.ball = { x: pos.x, y: pos.y };
  g.lie = lieOf(pos.x, pos.y);
  if (g.lie === 'sand') {
    changeMood(g, -0.15);
    if (Math.random() < 0.4) say(g, 'sand');
  }
  if (g.lie === 'deeprough' || g.lie === 'waste' || g.lie === 'pot' || g.lie === 'brush') {
    changeMood(g, g.lie === 'pot' ? -0.45 : -0.25);
    if (Math.random() < 0.55) say(g, g.lie, 'bad');
  }
  if (!g.scenicSaid && h && h.beauty > 0.45 && Math.random() < 0.5) {
    g.scenicSaid = true;
    g.mood += h.beauty;
    say(g, 'scenic');
  }
  if (holed) {
    sfx.hole();
    finishHole(g, false);
    return;
  }
  if (h && g.strokes >= h.par + 5) {
    say(g, 'pickup', 'bad');
    changeMood(g, -2);
    finishHole(g, true);
    return;
  }
  g.state = 'toBall';
  setGolferTarget(g, g.ball.x, g.ball.y);
}
function finishHole(g: Golfer, pickedUp: boolean) {
  const h = S.holes[g.holeIdx];
  if (h && !pickedUp) {
    const diff = g.strokes - h.par;
    changeMood(g, diff <= -2 ? 2.6 : diff === -1 ? 1.9 : diff === 0 ? 0.9 : diff === 1 ? 0 : diff === 2 ? -0.8 : -1.6);
    if (diff <= -1) {
      say(g, 'birdie');
      celebrateScore(h.cup.x, h.cup.y, diff);
      S.rep = clamp(S.rep + (diff <= -2 ? 0.06 : 0.02), 0.3, 5);
      if (diff <= -2) ticker(g.name, `${g.name} carded ${diff <= -3 ? 'an albatross' : g.strokes === 1 ? 'a hole-in-one' : 'an eagle'} on hole ${g.holeIdx + 1}!`, 'money');
    } else if (h.interest < 0.3 && Math.random() < 0.45) {
      sayText(g, `Hole ${g.holeIdx + 1} is ${boringReason(h)}.`, 'bad');
      changeMood(g, -0.4);
    } else if (diff === 0 && Math.random() < 0.35) say(g, 'par');
    else if (diff >= 1 && Math.random() < 0.35) say(g, 'bogey', 'bad');
  }
  g.mood += amenityMood() + empMoodPerHole();

  // needs drain each hole; snack bars and rest stops satisfy them by proximity to this hole
  const pos = h ? h.cup : { x: CH.x, y: CH.y };
  g.hunger = clamp(g.hunger - 0.1 + facilityNeedBoost(pos, ['snackbar']) * 0.16, 0, 1);
  g.thirst = clamp(g.thirst - 0.13 + facilityNeedBoost(pos, ['snackbar']) * 0.18, 0, 1);
  g.energy = clamp(g.energy - 0.07 + facilityNeedBoost(pos, ['bench', 'hotel']) * 0.14, 0, 1);
  const unmet = (g.hunger < 0.25 ? 1 : 0) + (g.thirst < 0.25 ? 1 : 0) + (g.energy < 0.2 ? 1 : 0);
  if (unmet > 0) changeMood(g, -unmet * 0.6);
  let earlyLeave = false;
  if (!pickedUp && unmet > 0 && Math.random() < 0.2 + unmet * 0.15) {
    earlyLeave = true;
    const reason = g.hunger < 0.25 ? "starving" : g.thirst < 0.25 ? 'parched' : 'exhausted';
    sayText(g, `I'm ${reason}, I'm leaving after hole ${g.holeIdx + 1}.`, 'bad');
  }

  const mult = clamp(1 + g.mood * 0.09, 0.35, 1.9);
  const parPrem = h ? 0.5 + h.par * 0.25 : 1;
  const funMult = h ? 0.75 + h.interest * 0.6 : 1; // dull hole = 0.75x, thrilling hole = 1.35x
  const regular = regularFor(g.name);
  const celebMult = regular?.celebrity ? 1.3 : 1; // a celebrity round draws a crowd
  const memberMult = membershipActive(regular?.membership, financialYearAt(S.time)) ? MEMBER_GREEN_FEE_MULTIPLIER : 1;
  const holeFee = h?.fee ?? S.fee; // a signature hole can carry its own premium fee
  const pay = Math.round(holeFee * mult * parPrem * funMult * celebMult * memberMult * feeMultiplier() * (h ? sgaFeeMultiplier(h) : 1) * (pickedUp ? 0.4 : 1));
  if (h) {
    earn(pay, h.cup.x, h.cup.y, 'greenFees', `Hole ${g.holeIdx + 1} green fees`);
    if (regular) {
      regular.holesPlayed = (regular.holesPlayed ?? 0) + 1;
      regular.lifetimeSpend = (regular.lifetimeSpend ?? 0) + pay;
      const training = applyRegularTraining(regular, regularTrainingRates(S.buildings), pickedUp ? 0.5 : 1);
      g.length = regular.length;
      g.accuracy = regular.accuracy;
      g.imagination = regular.imagination;
      g.skill = (regular.length + regular.accuracy + regular.imagination) / 3;
      const improved = training.gains.filter((gain) => gain.levels > 0);
      if (improved.length) {
        const skillLabel = (skill: RegularSkill) => skill[0].toUpperCase() + skill.slice(1);
        const summary = improved.map((gain) => `${skillLabel(gain.skill)} +${gain.levels}%`).join(' · ');
        floater(h.cup.x, h.cup.y - 1.2, summary, '#ffe36e', 'bub');
        ticker('Golf Academy', `${regular.name} improved ${summary} after ${training.holes} practice ${training.holes === 1 ? 'hole' : 'holes'}.`, 'money', golferTickerCharacter(regular, 'money'));
      }
    }
  }
  S.served++;
  g.holeIdx++;
  g.strokes = 0;
  g.scenicSaid = false;
  if (earlyLeave || g.holeIdx >= S.holes.length) {
    g.state = 'leave';
    setGolferTarget(g, CH.x, CH.y);
  } else sendToNextHole(g);
}
function updateGolfers(dt: number) {
  for (let i = S.golfers.length - 1; i >= 0; i--) {
    const g = S.golfers[i];
    g.chatCd = Math.max(0, g.chatCd - dt);
    g.phase += dt * 9;
    if (g.state === 'toTee' || g.state === 'toBall' || g.state === 'leave') {
      // walk the A* waypoints (if any) before the final leg onto tx,ty itself
      const atFinalLeg = !g.path || (g.pathIdx ?? 0) >= g.path.length;
      const wx = atFinalLeg ? g.tx : g.path![g.pathIdx!].x;
      const wy = atFinalLeg ? g.ty : g.path![g.pathIdx!].y;
      const d = Math.hypot(wx - g.x, wy - g.y);
      const sp = 3.1 * dt * moveSpeedMul() * empMoveSpeedMul();
      if (d <= sp) {
        g.x = wx;
        g.y = wy;
        if (!atFinalLeg) {
          g.pathIdx = (g.pathIdx ?? 0) + 1;
          continue;
        }
        if (g.state === 'leave') {
          const stars = clamp(2.5 + g.mood * 0.35, 0.3, 5);
          S.rep = clamp(S.rep + (stars - S.rep) * 0.09, 0.3, 5);
          if (g.mood >= 2) ticker(g.name, pick(SAY.leaveHappy), 'money');
          else if (g.mood <= -2) ticker(g.name, pick(SAY.leaveMad), 'bad');
          finishSpecialGuestVisit(g);
          settleMembership(g);
          S.golfers.splice(i, 1);
          updateTopbar();
          continue;
        }
        if (g.state === 'toTee') {
          const h = S.holes[g.holeIdx];
          if (!h) {
            g.state = 'leave';
            setGolferTarget(g, CH.x, CH.y);
            continue;
          }
          g.ball = { x: h.tee.x + rand(-0.2, 0.2), y: h.tee.y + rand(-0.2, 0.2) };
          g.lie = 'tee';
          g.strokes = 0;
          g.state = 'preshot';
          g.t = rand(0.6, 1.5);
          faceGolferToward(g, g.ball, h.cup);
        } else {
          g.state = g.lie === 'green' ? 'prePutt' : 'preshot';
          g.t = rand(0.5, 1.2);
          const h = S.holes[g.holeIdx];
          if (h && g.ball) faceGolferToward(g, g.ball, h.cup);
        }
      } else {
        g.x += ((wx - g.x) / d) * sp;
        g.y += ((wy - g.y) / d) * sp;
        faceGolferToward(g, { x: g.x, y: g.y }, { x: wx, y: wy });
      }
    } else if (g.state === 'preshot') {
      g.t -= dt;
      if (g.t <= 0) aiShot(g);
    } else if (g.state === 'prePutt') {
      g.t -= dt;
      if (g.t <= 0) aiPutt(g);
    } else if (g.state === 'watch') {
      g.t -= dt; // follow-through timer for the renderer
    }
  }
}
function updateBalls(dt: number) {
  for (let i = S.balls.length - 1; i >= 0; i--) {
    const b = S.balls[i];
    const spd = b.owner === 'P' ? Math.max(1, S.speed) : S.speed;
    b.t += (dt * spd) / b.dur;
    const endT = b.kind === 'fly' ? b.canopyImpact?.t ?? 1 : 1;
    if (b.t >= endT) {
      b.t = endT;
      const finalPosition = b.kind === 'fly' ? ballFlightPosition(b, endT) : { x: b.tx, y: b.ty };
      b.x = finalPosition.x;
      b.y = finalPosition.y;
      S.balls.splice(i, 1);
      if (b.kind === 'fly') resolveFly(b);
      else settleShot(b, { x: b.tx, y: b.ty }, b.events || [], !!b.holed);
    } else {
      const position = b.kind === 'fly' ? ballFlightPosition(b, b.t) : { x: lerp(b.fx, b.tx, b.t), y: lerp(b.fy, b.ty, b.t) };
      b.x = position.x;
      b.y = position.y;
    }
  }
}
function updateSpawner(dt: number) {
  if (!S.holes.length) return;
  S.nextGolfer -= dt;
  if (S.nextGolfer <= 0 && S.golfers.length < golferCap()) {
    spawnGolfer();
    S.nextGolfer = clamp(12 - S.rep * 1.9, 3, 13) * rand(0.7, 1.3) * (S.tournament ? 0.35 : 1);
  }
  S.nextStoryCheck -= dt;
  if (S.nextStoryCheck <= 0) {
    S.nextStoryCheck = rand(25, 45);
    checkStoryMoments();
  }
}

function updateSpecialVisitors(dt: number) {
  const visitors = S.specialVisitors;
  if (visitors.landOffer) {
    visitors.landOffer.remaining -= dt;
    if (visitors.landOffer.remaining <= 0) {
      visitors.landOffer = null;
      visitors.pickyCooldown = 48;
      ticker('I.M. Picky', 'The county land offer has expired. I will inspect the course again later.', 'bad');
      if (ui.get().modal?.kind === 'landOffer') ui.set({ modal: null });
    }
  }
  if (!S.holes.length || S.golfers.some((golfer) => golfer.specialGuest)) return;
  if (!visitors.landOffer && S.owned.some((owned) => !owned)) visitors.pickyCooldown -= dt;
  if (!visitors.landmarkDonated) visitors.ivanaCooldown -= dt;
  if (visitors.pickyCooldown <= 0 && !visitors.landOffer) {
    if (spawnSpecialGuest('picky')) visitors.pickyCooldown = 9999;
  } else if (visitors.ivanaCooldown <= 0 && !visitors.landmarkDonated) {
    if (spawnSpecialGuest('ivana')) visitors.ivanaCooldown = 9999;
  }
}

function updateProChallengeOffer(dt: number) {
  if (S.activeProChallenge || S.player) return;
  if (S.proChallengeOffer) {
    S.proChallengeOffer.remaining -= dt;
    if (S.proChallengeOffer.remaining <= 0) {
      ticker('Pro Circuit', `${S.proChallengeOffer.opponent.name} withdrew the challenge.`, 'bad');
      S.proChallengeOffer = null;
      S.proChallengeCooldown = 75;
      bumpPro();
    }
    return;
  }
  if (S.holes.length < 3 || S.rep < 2.8) return;
  S.proChallengeCooldown -= dt;
  if (S.proChallengeCooldown > 0) return;
  S.proChallengeOffer = createProChallengeOffer(Date.now(), S.rep, themePackTouringPros(S.themePackId));
  S.proChallengeCooldown = 180;
  ticker(S.proChallengeOffer.opponent.name, `${S.proChallengeOffer.opponent.title} challenges ${S.proProfile.name}: ${fmt$(S.proChallengeOffer.wagerPerHole)} per hole.`, 'money');
  floater(CH.x, CH.y - 1.4, 'Pro Challenge!', '#ffd856', 'bub');
  sfx.tada();
  bumpPro();
}

export function acceptProChallenge(): boolean {
  const offer = S.proChallengeOffer;
  if (!offer || S.player || S.activeChampionship) return false;
  const exposure = offer.wagerPerHole * S.holes.length;
  if (!S.sandbox && S.cash < exposure) {
    setHint(`Keep ${fmt$(exposure)} in the bank to cover every hole of this wager.`);
    sfx.err();
    return false;
  }
  S.proChallengeOffer = null;
  S.activeProChallenge = offer;
  S.proChallengeCooldown = 210;
  startRound({ source: 'tournament', localEvent: 'proChallenge' });
  ticker('Pro Circuit', `${S.proProfile.name} vs ${offer.opponent.name} — ${fmt$(offer.wagerPerHole)} rides on every hole.`, 'money');
  bumpPro();
  return true;
}

export function declineProChallenge(): boolean {
  if (!S.proChallengeOffer) return false;
  ticker(S.proChallengeOffer.opponent.name, 'Challenge declined. Perhaps next time.', 'bad');
  S.proChallengeOffer = null;
  S.proChallengeCooldown = 90;
  bumpPro();
  return true;
}

/* ---------------- tournaments & goals ---------------- */
const TOURNAMENT_UNLOCK_REP = 3;
const TOURNAMENT_DURATION = 90; // sim-seconds
const TOURNAMENT_PURSE = 1500;
const TOURNAMENT_COOLDOWN = 180;

export function tournamentUnlocked(): boolean {
  return S.rep >= TOURNAMENT_UNLOCK_REP;
}
export function canHostTournament(): boolean {
  return tournamentUnlocked() && !S.tournament && S.tournamentCooldown <= 0 && S.holes.length >= 3 && S.cash >= TOURNAMENT_PURSE;
}
export function hostTournament(): boolean {
  if (!canHostTournament()) return false;
  if (!spend(TOURNAMENT_PURSE, 'tournament', 'Weekend tournament purse')) return false;
  S.tournament = { timeLeft: TOURNAMENT_DURATION, entrants: 0, purse: TOURNAMENT_PURSE };
  S.tournamentHostedEver = true;
  ticker('Tournament Committee', `Weekend tournament kicks off! $${TOURNAMENT_PURSE} purse on the line — the crowds are pouring in.`, 'money');
  setHint('Tournament weekend! Extra golfers are on the way, price no object.');
  sfx.tada();
  return true;
}
function updateTournament(dt: number) {
  if (!S.tournament) {
    S.tournamentCooldown = Math.max(0, S.tournamentCooldown - dt);
    return;
  }
  S.tournament.timeLeft -= dt;
  if (S.tournament.timeLeft <= 0) {
    const { entrants, purse } = S.tournament;
    const fameBonus = clamp(entrants * 0.03, 0.05, 0.6);
    S.rep = clamp(S.rep + fameBonus, 0.3, 5);
    const payout = Math.round(purse * 0.6 + entrants * 25);
    earn(payout, CH.x, CH.y - 1, 'tournament', 'Weekend sponsor payout');
    ticker('Tournament Committee', `Tournament wrapped: ${entrants} entrants, reputation up ${fameBonus.toFixed(2)}★, ${fmt$(payout)} in sponsor payouts.`, 'money');
    confetti(CH.x, CH.y);
    S.tournament = null;
    S.tournamentCooldown = TOURNAMENT_COOLDOWN;
  }
}
interface GoalDef {
  id: string;
  label: string;
  check: () => boolean;
}
export const GOAL_DEFS: GoalDef[] = [
  { id: 'holes1', label: 'Open your first hole', check: () => S.holes.length >= 1 },
  { id: 'holes3', label: 'Build 3 holes', check: () => S.holes.length >= 3 },
  { id: 'holes6', label: 'Build 6 holes', check: () => S.holes.length >= 6 },
  { id: 'holes9', label: 'Build 9 holes', check: () => S.holes.length >= 9 },
  { id: 'holes18', label: 'Complete an 18-hole course', check: () => S.holes.length >= 18 },
  { id: 'serve25', label: 'Serve 25 paid holes', check: () => S.served >= 25 },
  { id: 'serve100', label: 'Serve 100 paid holes', check: () => S.served >= 100 },
  { id: 'serve500', label: 'Serve 500 paid holes', check: () => S.served >= 500 },
  { id: 'rep3', label: 'Reach 3★ reputation', check: () => S.rep >= 3 },
  { id: 'rep4', label: 'Reach 4★ reputation', check: () => S.rep >= 4 },
  { id: 'tournament', label: 'Host a tournament', check: () => S.tournamentHostedEver },
  { id: 'ownAll', label: 'Own the whole map', check: () => S.owned.every((v) => v === 1) },
  { id: 'rep5', label: 'Reach 5★ reputation (SGA Top 100)', check: () => S.rep >= 5 },
  { id: 'cash50k', label: 'Bank $50,000', check: () => S.cash >= 50_000 },
  { id: 'facilities5', label: 'Open 5 resort facilities', check: () => S.buildings.filter((building) => isUpgradeableFacility(building.kind) && building.open).length >= 5 },
  { id: 'upgrade1', label: 'Complete a facility upgrade', check: () => upgradedFacilityCount() >= 1 },
  { id: 'facility3', label: 'Raise a facility to level III', check: () => S.buildings.some((building) => isUpgradeableFacility(building.kind) && facilityLevel(building) >= 3) },
  { id: 'pickyLand', label: 'Earn and buy county expansion land', check: () => S.specialVisitors.landPurchased === true },
  { id: 'ivanaLandmark', label: "Receive Ivana Richman's Landmark", check: () => S.specialVisitors.landmarkDonated },
  { id: 'ownerRound', label: 'Complete a resident-pro round', check: () => S.roundHistory.some((round) => round.source === 'exhibition') },
  { id: 'eagle', label: 'Card an eagle or better', check: () => S.roundHistory.some((round) => round.eagles > 0) },
  { id: 'circuitStart', label: 'Play a pro-circuit championship', check: () => S.championshipHistory.length > 0 },
  { id: 'circuitWin', label: 'Win a pro-circuit championship', check: () => S.championshipHistory.some((result) => result.rank === 1) },
];
function updateGoals() {
  for (const def of GOAL_DEFS) {
    if (S.goalsAchieved[def.id] || !def.check()) continue;
    S.goalsAchieved[def.id] = true;
    awardProAccomplishment(def.id);
    ticker('Course Ops', `🏆 Goal complete: ${def.label}!`, 'money');
    floater(CH.x, CH.y - 1.6, def.label + '!', '#ffd856', 'bub');
    confetti(CH.x, CH.y);
  }
}

function awardProAccomplishment(id: string) {
  if (S.proProfile.accomplishments.includes(id)) return;
  S.proProfile.accomplishments.push(id);
  S.proProfile.unspentSkillPoints++;
  saveRoundHistory();
  ticker(S.proProfile.name, 'Professional accomplishment earned: +1 golf-pro skill point.', 'money');
}

/* ---------------- particles ---------------- */
function splash(x: number, y: number) {
  for (let i = 0; i < 12; i++)
    S.parts.push({ x, y, vx: rand(-1.6, 1.6), vy: rand(-3.2, -1), g: 8, c: pick(['#bfe3ff', '#7dbcf0', '#ffffff']), age: 0, life: 0.7 });
}
function confetti(x: number, y: number) {
  for (let i = 0; i < 16; i++) S.parts.push({ x, y, vx: rand(-2, 2), vy: rand(-4, -1.4), g: 6, c: pick(SHIRTS), age: 0, life: 1 });
}
const FIREWORK_COLORS = ['#ff6b6b', '#ffd166', '#6bffb8', '#6bc5ff', '#d66bff', '#ffffff'];
/** Three staggered radial bursts — brighter and wider than confetti, for an eagle-or-better. */
function fireworks(x: number, y: number) {
  for (let burst = 0; burst < 3; burst++) {
    const bx = x + rand(-1.5, 1.5);
    const by = y + rand(-1, 0.4);
    setTimeout(() => {
      const c = pick(FIREWORK_COLORS);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const spd = rand(2, 4.2);
        S.parts.push({ x: bx, y: by, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1.5, g: 5, c, age: 0, life: 1.1 });
      }
    }, burst * 220);
  }
}
/** Shared celebration tier for both AI and player scoring — birdie gets confetti, eagle-or-better gets the full show. */
function celebrateScore(x: number, y: number, diff: number) {
  if (diff > -1) return;
  confetti(x, y);
  if (diff <= -2) {
    fireworks(x, y);
    shakeCamera(diff <= -3 ? 14 : 9);
    sfx.tada();
    sfx.applause();
  }
}
function updateParts(dt: number) {
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.age += dt;
    if (p.age > p.life) {
      S.parts.splice(i, 1);
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt * 0.5;
  }
  for (let i = S.floaters.length - 1; i >= 0; i--) {
    const f = S.floaters[i];
    f.age += dt;
    if (f.age > f.life) S.floaters.splice(i, 1);
  }
}

/* ---------------- camera glide ---------------- */
function centerCam(x: number, y: number) {
  S.camTarget = { x, y };
}
/** Nudges the camera-shake magnitude; overlapping shakes take the stronger one, not a sum. */
export function shakeCamera(mag: number) {
  S.camShake = Math.max(S.camShake, mag);
}
function updateCamGlide(dt: number) {
  S.camShake = Math.max(0, S.camShake - dt * 36);
  const t = S.camTarget;
  if (!t) return;
  const iso = isoOf(t.x, t.y);
  const wantX = S.view.w / 2 - iso.ix * S.cam.z;
  const wantY = S.view.h / 2 - (iso.iy - elevAt(t.x, t.y) * EH) * S.cam.z;
  const k = Math.min(1, dt * 5);
  S.cam.x += (wantX - S.cam.x) * k;
  S.cam.y += (wantY - S.cam.y) * k;
  if (Math.abs(wantX - S.cam.x) < 2 && Math.abs(wantY - S.cam.y) < 2) S.camTarget = null;
}

/* ---------------- play your own course / pro circuit ---------------- */
let isolatedReturnSave: ReturnType<typeof buildSaveData> | null = null;
let roundPropertyAccessAtStart: PropertyAvailabilityContext | null = null;
let propertyReleaseBaseline: PropertyAvailabilityContext | null = null;
let propertyReleaseAcknowledged = new Set<PropertyId>();

export function activePlayingPro(): ProProfile {
  return S.activeChampionship?.pro ?? S.proProfile;
}

const RECOVERY_LIES = new Set<LieKey>(['deeprough', 'sand', 'waste', 'pot', 'stream', 'brush', 'rock', 'tree']);

/** Resolves either a real pointer drag or a keyboard-generated drag into one shot intent. */
export function playerAimIntent(aim: Aim, lie: LieKey): { dirX: number; dirY: number; power: number; rawPower: number } | null {
  if (aim.kind === 'keyboard' && Number.isFinite(aim.worldDirX) && Number.isFinite(aim.worldDirY) && Number.isFinite(aim.worldPower)) {
    const magnitude = Math.hypot(aim.worldDirX!, aim.worldDirY!);
    if (magnitude < 0.001) return null;
    return {
      dirX: aim.worldDirX! / magnitude,
      dirY: aim.worldDirY! / magnitude,
      power: clamp(aim.worldPower!, lie === 'green' ? 0.02 : 0.08, 1),
      rawPower: aim.worldPower!,
    };
  }
  const start = screenToWorld(aim.sx, aim.sy);
  const current = screenToWorld(aim.cx, aim.cy);
  let dirX = start.x - current.x;
  let dirY = start.y - current.y;
  const drag = Math.hypot(dirX, dirY);
  if (drag < 0.001) return null;
  dirX /= drag;
  dirY /= drag;
  return { dirX, dirY, power: clamp(drag / 9, lie === 'green' ? 0.02 : 0.08, 1), rawPower: drag / 9 };
}

/** Shared by fire + renderer preview so pro skill changes never make the guide lie. */
export function playerIntendedDistance(lie: LieKey, clubId: ClubId, power: number): number {
  const pro = activePlayingPro();
  const lieInfo = LIE[lie] || LIE.rough;
  const club = CLUBS[clubId];
  const clubProfile = clubLieProfile(lie, clubId);
  const clubMul = lie === 'green' ? 1 : club.mul;
  const powerMul = 1 + pro.skills.powerHitter * 0.012;
  const driveMul = lie !== 'green' && clubId === 'driver' ? 1 + pro.skills.longDriver * 0.015 : 1;
  const recoveryMul = RECOVERY_LIES.has(lie) ? 1 + pro.skills.recovery * 0.018 : 1;
  return clamp(power, lie === 'green' ? 0.02 : 0.08, 1) * lieInfo.max * clubMul * clubProfile.carryMultiplier * powerMul * driveMul * recoveryMul;
}

export function playerShotSkill(lie: LieKey, clubId: ClubId, shape: ShotShape): number {
  const pro = activePlayingPro();
  const accuracyLevel = lie === 'green' ? pro.skills.accuratePutter : clubId === 'driver' ? pro.skills.accurateDriver : pro.skills.accurateIrons;
  let skill = 0.82 + accuracyLevel * 0.014 + pro.skills.luck * 0.004;
  // The last full-swing shape remains selected while putting controls are hidden. It
  // must not silently penalize an otherwise identical putt.
  if (lie === 'green') return clamp(skill, 0.58, 0.99);
  const shapeSkill: Partial<Record<ShotShape, ProSkillId>> = { draw: 'drawShot', hook: 'drawShot', fade: 'fadeShot', backspin: 'highBackspin' };
  const skillId = shapeSkill[shape];
  if (skillId) skill -= (10 - pro.skills[skillId]) * 0.009;
  if (shape === 'hook') skill -= 0.08; // intentionally dramatic and harder to control than a draw
  if (RECOVERY_LIES.has(lie)) skill += pro.skills.recovery * 0.006;
  return clamp(skill, 0.58, 0.99);
}

export interface PlayerShotDispersion {
  /** Effective accuracy skill used by aimShot; putting ignores hidden full-swing state. */
  skill: number;
  /** Multiplier passed directly to aimShot's angular Gaussian. */
  angularScale: number;
  /** One-standard-deviation forward/back distance in world tiles. */
  distance: number;
  /** One-standard-deviation lateral miss in world tiles. */
  lateral: number;
  /** Compact screen-space footprint used by the landing ellipse. */
  previewRadius: number;
}

/** Shared player dispersion model, used by both the real shot and the aim ellipse. */
export function playerShotDispersion(lie: LieKey, clubId: ClubId, shape: ShotShape, nominalTargetDistance: number, weather: WeatherState = S.weather): PlayerShotDispersion {
  const L = LIE[lie] || LIE.rough;
  const putting = lie === 'green';
  const skill = playerShotSkill(lie, putting ? 'iron' : clubId, putting ? 'straight' : shape);
  // Putter has one fixed control profile. The hidden full-swing club and shape remain
  // selected for the next tee, but cannot alter either the preview or actual putt.
  const angularScale = putting ? 0.8 : clubLieProfile(lie, clubId).dispersionMultiplier * (shape === 'punch' ? 0.55 : 1) * weatherDispersionMultiplier(weather);
  const angleStd = L.ang * (Math.PI / 180) * (1.35 - skill) * angularScale;
  const distance = nominalTargetDistance * (L.dst + (1 - skill) * 0.05);
  const lateral = nominalTargetDistance * Math.sin(angleStd);
  return { skill, angularScale, distance, lateral, previewRadius: distance + lateral * 0.6 + 0.22 };
}

export interface PlayerShotPlan {
  from: Vec;
  dirX: number;
  dirY: number;
  intend: number;
  windPush: number;
  windDx: number;
  windDy: number;
  perpX: number;
  perpY: number;
  shape: ShotShape;
  target: Vec;
  /** Complete ideal landing chord, including wind and final curve displacement. */
  targetDistance: number;
}

/** Shared ideal-flight plan used by both the guide and the launched ball. */
export function playerShotPlan(
  from: Vec,
  lie: LieKey,
  clubId: ClubId,
  shape: ShotShape,
  dirX: number,
  dirY: number,
  power: number,
  wind: { dx: number; dy: number; speed: number } = S.wind,
  weather: WeatherState = S.weather,
): PlayerShotPlan {
  const magnitude = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / magnitude;
  const ny = dirY / magnitude;
  const activeShape: ShotShape = lie === 'green' ? 'straight' : shape;
  const carryWeather = lie === 'green' ? 1 : weatherCarryMultiplier(weather);
  const intend = playerIntendedDistance(lie, clubId, power) * SHOT_SHAPES[activeShape].carryMul * carryWeather;
  const windPush = lie === 'green' ? 0 : wind.speed * intend * 0.35;
  const perpX = -ny;
  const perpY = nx;
  const curve = shapeCurveOffset(activeShape, intend, 1);
  const target = {
    x: from.x + nx * intend + wind.dx * windPush + perpX * curve,
    y: from.y + ny * intend + wind.dy * windPush + perpY * curve,
  };
  return {
    from: { ...from },
    dirX: nx,
    dirY: ny,
    intend,
    windPush,
    windDx: wind.dx,
    windDy: wind.dy,
    perpX,
    perpY,
    shape: activeShape,
    target,
    targetDistance: dist(from, target),
  };
}

export interface PlayerShotForecast {
  plan: PlayerShotPlan;
  path: FlightPath;
  canopyImpact: TreeCanopyImpact | null;
  /** Deterministic physical finish used by both preview and impact resolution. */
  restingPoint: Vec | null;
  canopyStatus: 'clear' | 'canopy' | 'trunk' | 'pine';
}

/** Pure ideal-flight forecast shared by pointer and keyboard UI paths. */
export function playerShotForecast(
  from: Vec,
  lie: LieKey,
  clubId: ClubId,
  shape: ShotShape,
  dirX: number,
  dirY: number,
  power: number,
  wind: { dx: number; dy: number; speed: number } = S.wind,
): PlayerShotForecast {
  const plan = playerShotPlan(from, lie, clubId, shape, dirX, dirY, power, wind);
  const heightMultiplier = lie === 'green' ? 0 : SHOT_SHAPES[plan.shape].heightMul * clubLieProfile(lie, clubId).launchMultiplier;
  const path: FlightPath = {
    fx: from.x,
    fy: from.y,
    tx: plan.target.x,
    ty: plan.target.y,
    h: lie === 'green' ? 0 : flightApexHeight(plan.targetDistance, heightMultiplier),
    shotShape: plan.shape,
    curvePerpX: plan.perpX,
    curvePerpY: plan.perpY,
    curveDistance: plan.intend,
    lowFlight: plan.shape === 'punch',
  };
  const canopyImpact = lie === 'green' ? null : firstTreeCanopyImpact(path, { theme: S.theme, tileAt, elevationAt: elevAt });
  return {
    plan,
    path,
    canopyImpact,
    restingPoint: canopyImpact ? treeDropPosition(path, canopyImpact) : null,
    canopyStatus: canopyImpact?.kind ?? 'clear',
  };
}

export interface PlayerShotIntent {
  dirX: number;
  dirY: number;
  power: number;
}

let nextTreeCacheIdentity = 1;
const treeCacheIdentities = new WeakMap<object, number>();
let sharedPlayerForecastCache: { key: string; forecast: PlayerShotForecast } | null = null;

function treeCacheIdentity(): number {
  let identity = treeCacheIdentities.get(caches.trees);
  if (!identity) {
    identity = nextTreeCacheIdentity++;
    treeCacheIdentities.set(caches.trees, identity);
  }
  return identity;
}

function elevationStateSignature(): number {
  // Elevation arrays are mutable, so object identity alone can make a cached arc
  // stale after landscaping. This compact hash keeps the cache terrain-safe.
  let signature = 2166136261;
  for (const height of S.elevC) signature = Math.imul(signature ^ height, 16777619);
  return signature >>> 0;
}

function activeProSkillSignature(): string {
  const skills = activePlayingPro().skills;
  return Object.keys(skills).sort().map((skill) => skills[skill as ProSkillId]).join(',');
}

/** Cached shared forecast for a supplied current player state and normalized intent. */
export function cachedPlayerShotForecast(player: PlayerRound, intent: PlayerShotIntent): PlayerShotForecast | null {
  if (!player.ball) return null;
  const key = [
    treeCacheIdentity(), caches.trees.length,
    player.ball.x, player.ball.y, player.lie, player.club, player.shape,
    intent.dirX, intent.dirY, intent.power,
    S.wind.dx, S.wind.dy, S.wind.speed, S.theme,
    S.weather.condition, S.weather.intensity, S.weather.wetness,
    elevationStateSignature(), activeProSkillSignature(),
  ].join('|');
  if (sharedPlayerForecastCache?.key === key) return sharedPlayerForecastCache.forecast;
  const forecast = playerShotForecast(
    player.ball,
    player.lie,
    player.club,
    player.shape,
    intent.dirX,
    intent.dirY,
    intent.power,
  );
  sharedPlayerForecastCache = { key, forecast };
  return forecast;
}

/** Cached forecast for the active player; render and HUD can share this object. */
export function currentPlayerShotForecast(intent?: PlayerShotIntent | null): PlayerShotForecast | null {
  const player = S.player;
  if (!player) return null;
  const resolved = intent ?? (player.aim?.on ? playerAimIntent(player.aim, player.lie) : null);
  return resolved ? cachedPlayerShotForecast(player, resolved) : null;
}

export function playerShotPlanPosition(plan: PlayerShotPlan, t: number): Vec {
  const progress = clamp(t, 0, 1);
  const curve = shapeCurveOffset(plan.shape, plan.intend, progress);
  return {
    x: plan.from.x + plan.dirX * plan.intend * progress + plan.windDx * plan.windPush * progress + plan.perpX * curve,
    y: plan.from.y + plan.dirY * plan.intend * progress + plan.windDy * plan.windPush * progress + plan.perpY * curve,
  };
}

export function startRound(options?: { source: RoundSource; competitionId?: string; challengeId?: string; localEvent?: 'championship' | 'proChallenge' }) {
  if (!S.holes.length) {
    setHint('Build a hole first, boss.');
    sfx.err();
    return;
  }
  if (S.speed === 0) setSpeed(1);
  if (!roundPropertyAccessAtStart) roundPropertyAccessAtStart = currentPropertyAccessContext();
  const startedAt = Date.now();
  S.mode = 'play';
  S.player = {
    id: `round-${crypto.randomUUID()}`,
    startedAt,
    courseHash: courseFingerprint(S),
    source: options?.source ?? (S.tournament ? 'tournament' : 'exhibition'),
    ...(options?.localEvent ? { localEvent: options.localEvent } : {}),
    ...(options?.competitionId ? { competitionId: options.competitionId } : {}),
    ...(options?.challengeId ? { challengeId: options.challengeId } : {}),
    holeIdx: 0,
    strokes: 0,
    card: [],
    currentHole: null,
    pendingShot: null,
    ball: null,
    lie: 'tee',
    state: 'aim',
    aim: null,
    club: 'iron',
    shape: 'straight',
  };
  ui.set({ mode: 'play', buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false });
  setupPlayerHole(0);
  setHint(`${activePlayingPro().name} is on the tee. Pick a club, drag back from the ball, release to swing.`);
}

/** Load a published layout for an isolated online round. The home course is restored
 * after completion or abandonment, so joining an event never overwrites local work. */
function startIsolatedOnlineRound(snapshot: unknown, options: { source: 'daily' | 'weekly' | 'tournament'; competitionId: string } | { source: 'challenge'; challengeId: string }): boolean {
  if (S.player || isolatedReturnSave) return false;
  const homeCourse = buildSaveData();
  roundPropertyAccessAtStart = currentPropertyAccessContext();
  saveGame();
  if (!applySaveData(snapshot)) {
    roundPropertyAccessAtStart = null;
    setHint('That competition course is incompatible with this version.');
    return false;
  }
  isolatedReturnSave = homeCourse;
  startRound(options);
  return true;
}

export function startCompetitionRound(snapshot: unknown, source: 'daily' | 'weekly' | 'tournament', competitionId: string): boolean {
  return startIsolatedOnlineRound(snapshot, { source, competitionId });
}

export function startChallengeRound(snapshot: unknown, challengeId: string): boolean {
  return startIsolatedOnlineRound(snapshot, { source: 'challenge', challengeId });
}

export function startChampionshipRound(courseId: string, difficulty: Difficulty, useResidentPro = true): boolean {
  if (S.player || isolatedReturnSave) return false;
  const retired = S.retiredCourses.find((course) => course.id === courseId);
  if (!retired) {
    setHint('Select a course retired for championship play first.');
    sfx.err();
    return false;
  }
  const homeCourse = buildSaveData();
  roundPropertyAccessAtStart = currentPropertyAccessContext();
  saveGame();
  if (!applySaveData(retired.snapshot)) {
    roundPropertyAccessAtStart = null;
    setHint('That retired course is incompatible with this version. Retire it again from a current save.');
    sfx.err();
    return false;
  }
  const pro = sanitizeProProfile(useResidentPro ? S.proProfile : createDefaultTourPro(themePackTouringPros(S.themePackId)?.[0]));
  const id = `champ-${crypto.randomUUID()}`;
  isolatedReturnSave = homeCourse;
  S.difficulty = difficulty;
  S.activeChampionship = {
    id,
    title: championshipTitle(retired.name, S.proProfile.starts),
    courseId: retired.id,
    courseName: retired.name,
    difficulty,
    pro,
    usesResidentPro: useResidentPro,
  };
  startRound({ source: 'tournament', localEvent: 'championship' });
  ticker('Pro Circuit', `${S.activeChampionship.title} begins on ${retired.name}.`, 'money');
  return true;
}
/** Player-only club pick for the next non-putt shot (putts always use the green-lie path). */
export function setClub(id: ClubId) {
  if (!S.player) return;
  const profile = clubLieProfile(S.player.lie, id);
  if (!profile.available) {
    setHint(profile.reason ?? 'That club is unavailable from this lie.');
    sfx.err();
    return false;
  }
  S.player.club = id;
  updatePlayHud();
  return true;
}
/** Player-only shot technique pick for the next non-putt swing (manual p.21-22). */
export function setShape(id: ShotShape) {
  if (!S.player) return;
  S.player.shape = id;
  updatePlayHud();
}
export function playerEstimatedRoll(landingLie: LieKey, shape: ShotShape, clubId: ClubId = 'iron', weather: WeatherState = S.weather): number {
  return shape === 'backspin' ? 0 : Math.max(0, ROLL[landingLie] ?? 0.3) * clubLieProfile(landingLie, clubId).rolloutMultiplier * weatherRollMultiplier(weather);
}
function setupPlayerHole(i: number) {
  const p = S.player!;
  const h = S.holes[i];
  p.holeIdx = i;
  p.strokes = 0;
  p.lie = 'tee';
  p.state = 'aim';
  p.aim = null;
  p.ball = { x: h.tee.x, y: h.tee.y };
  const conditions = generateHoleConditions(S.theme);
  S.wind = conditions.wind;
  S.weather = conditions.weather;
  p.currentHole = {
    hole: i + 1,
    holeId: h.id,
    par: h.par,
    distance: dist(h.tee, h.cup),
    strokes: 0,
    relative: 0,
    penalties: 0,
    putts: 0,
    fairwayHit: h.par >= 4 ? false : null,
    greenInRegulation: false,
    hazards: [],
    wind: { ...S.wind },
    weather: { ...S.weather },
    shots: [],
  };
  p.pendingShot = null;
  centerCam(h.tee.x, h.tee.y); // walk the camera to the next tee
  updatePlayHud();
}
export function playerFire(dirX: number, dirY: number, power: number) {
  const p = S.player;
  const h = p ? S.holes[p.holeIdx] : null;
  if (!p || !h) return;
  const clubProfile = p.lie === 'green' ? null : clubLieProfile(p.lie, p.club);
  if (clubProfile && !clubProfile.available) {
    p.club = fallbackClubForLie(p.lie, p.club);
    p.aim = null;
    setHint(clubProfile.reason ?? 'Choose a recovery club for this lie.');
    updatePlayHud();
    sfx.err();
    return;
  }
  const start = { ...p.ball! };
  const fromLie = p.lie;
  p.strokes++;
  const plan = playerShotPlan(p.ball!, p.lie, p.club, p.shape, dirX, dirY, power);
  const intend = plan.intend;
  const tgt = plan.target;
  const dispersion = playerShotDispersion(p.lie, p.club, p.shape, plan.targetDistance);
  const shot: PlayerShotRecord = {
    stroke: p.strokes,
    club: p.lie === 'green' ? 'putter' : p.club,
    shape: p.lie === 'green' ? 'putt' : p.shape,
    fromLie,
    resultLie: fromLie,
    power: clamp(power, 0, 1),
    intendedDistance: intend,
    distance: 0,
    start,
    end: { ...start },
    events: [],
    penalty: 0,
    holed: false,
  };
  p.currentHole?.shots.push(shot);
  if (p.lie === 'green' && p.currentHole) p.currentHole.putts++;
  p.pendingShot = shot;
  if (p.lie === 'green') {
    sfx.putt();
    const land = aimShot(p.ball!, tgt, 'green', dispersion.skill, dispersion.angularScale, undefined, plan.targetDistance);
    const holed = dist(land, h.cup) < 0.42;
    startBall({ kind: 'putt', owner: 'P', cup: h.cup, fx: p.ball!.x, fy: p.ball!.y, tx: holed ? h.cup.x : land.x, ty: holed ? h.cup.y : land.y, holed });
  } else {
    sfx.whoosh();
    sfx.hit();
    // Low Punch flies flatter and more controlled — tighter aim wobble, under branch cover.
    // Preserve the guide's complete wind/shape displacement. Forcing only the raw
    // club carry would normalize the target and erase head/tail wind effects.
    const land = aimShot(p.ball!, tgt, p.lie, dispersion.skill, dispersion.angularScale, undefined, plan.targetDistance);
    startBall(
      {
        kind: 'fly', owner: 'P', cup: h.cup, fx: p.ball!.x, fy: p.ball!.y, tx: land.x, ty: land.y,
        noRoll: p.shape === 'backspin', lowFlight: p.shape === 'punch', shotShape: p.shape,
        curvePerpX: plan.perpX, curvePerpY: plan.perpY, curveDistance: intend, rollMultiplier: clubProfile!.rolloutMultiplier,
      },
      SHOT_SHAPES[p.shape].heightMul * clubProfile!.launchMultiplier,
      plan.targetDistance,
    );
  }
  p.state = 'wait';
  p.aim = null;
  updatePlayHud();
}
function scoreName(diff: number): string {
  return diff <= -3 ? 'ALBATROSS?!' : diff === -2 ? 'EAGLE!' : diff === -1 ? 'BIRDIE!' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : diff === 2 ? 'Double bogey' : '+' + diff;
}
function onPlayerLand(pos: Vec, events: string[], holed: boolean, forcedResultLie?: LieKey) {
  const p = S.player;
  if (!p) return;
  const h = S.holes[p.holeIdx];
  let penalties = 0;
  for (const e of events) {
    if (e === 'water' || e === 'stream') {
      p.strokes++;
      penalties++;
      floater(pos.x, pos.y - 0.8, (e === 'stream' && S.theme === 'desert' ? 'Lost ball' : 'Splash') + ' · +1 penalty', '#ff9d94');
    }
    if (e === 'tree') floater(pos.x, pos.y - 0.8, 'Off the timber!', '#ffd2a6');
    if (e === 'rock') floater(pos.x, pos.y - 0.8, 'Wild ricochet!', '#ffd2a6');
    if (e === 'chip') confetti(pos.x, pos.y);
  }
  const resultLie = forcedResultLie ?? lieOf(pos.x, pos.y);
  const pending = p.pendingShot;
  const holeCard = p.currentHole;
  if (pending) {
    pending.end = { ...pos };
    pending.resultLie = resultLie;
    pending.distance = dist(pending.start, pos);
    pending.events = [...events];
    pending.penalty = penalties;
    pending.holed = holed;
    if (holeCard) {
      holeCard.penalties += penalties;
      if (holeCard.fairwayHit !== null && pending.stroke === 1) holeCard.fairwayHit = resultLie === 'fair' || resultLie === 'firmfair';
      if ((resultLie === 'green' || holed) && h && p.strokes <= h.par - 2) holeCard.greenInRegulation = true;
      const hazardLies: LieKey[] = ['deeprough', 'sand', 'waste', 'pot', 'stream', 'brush', 'rock', 'tree', 'water'];
      const hazards = [...events.filter((event) => hazardLies.includes(event as LieKey)), ...(hazardLies.includes(resultLie) ? [resultLie] : [])];
      for (const hazard of hazards) if (!holeCard.hazards.includes(hazard)) holeCard.hazards.push(hazard);
    }
    p.pendingShot = null;
  }
  p.ball = { x: pos.x, y: pos.y };
  p.lie = resultLie;
  p.club = fallbackClubForLie(resultLie, p.club);
  centerCam(pos.x, pos.y); // follow the ball
  if (holed && h) {
    const diff = p.strokes - h.par;
    if (holeCard) {
      holeCard.strokes = p.strokes;
      holeCard.relative = diff;
      p.card.push(holeCard);
      p.currentHole = null;
    }
    sfx.hole();
    floater(h.cup.x, h.cup.y - 0.6, scoreName(diff), diff < 0 ? '#ffe27a' : '#fff');
    if (diff < 0) {
      celebrateScore(h.cup.x, h.cup.y, diff);
      S.rep = clamp(S.rep + (diff <= -2 ? 0.1 : 0.06), 0.3, 5);
      ticker('The gallery', 'The boss just made ' + scoreName(diff).toLowerCase().replace('!', '') + ' on hole ' + (p.holeIdx + 1) + '!', 'money');
    }
    if (p.holeIdx + 1 >= S.holes.length) {
      endRound();
      return;
    }
    setTimeout(() => {
      if (S.player) setupPlayerHole(p.holeIdx + 1);
    }, 700);
    p.state = 'between';
    return;
  }
  p.state = 'aim';
  updatePlayHud();
}
function endRound() {
  const p = S.player;
  if (!p) return;
  const onlineCompetition = !!p.competitionId || !!p.challengeId;
  const championship = S.activeChampionship;
  const proChallenge = S.activeProChallenge;
  let cashOut = 0;
  let birdies = 0;
  p.card.forEach((c) => {
    const d = c.strokes - c.par;
    if (d <= -1) {
      cashOut += 150;
      birdies++;
    } else if (d === 0) cashOut += 60;
    else cashOut += 20;
  });
  cashOut = onlineCompetition || championship || proChallenge ? 0 : cashOut + 100;
  const record = buildRoundRecord({
    player: p,
    playerName: activePlayingPro().name,
    courseName: S.courseName,
    courseTheme: S.theme,
    completedAt: Date.now(),
    payout: cashOut,
  });
  const residentParticipated = !championship || championship.usesResidentPro;
  const practiceSession = residentParticipated ? createProPracticeSession(record, {
    drivingRange: S.buildings.some((building) => building.kind === 'drivingrange' && building.open),
    puttingGreen: S.buildings.some((building) => building.kind === 'puttinggreen' && building.open),
    proShop: S.buildings.some((building) => building.kind === 'proshop' && building.open),
  }) : null;
  let championshipResult: ChampionshipResult | null = null;
  let proChallengeResult: ProChallengeResult | null = null;
  if (championship) {
    championshipResult = simulateChampionshipResult(record, {
      id: championship.id,
      title: championship.title,
      courseId: championship.courseId,
      difficulty: championship.difficulty,
      proName: championship.pro.name,
      fieldNames: [
        ...(themePackTouringPros(S.themePackId)?.map((pro) => pro.name) ?? []),
        ...themePackPlayers(S.themePackId).map((player) => player.name),
      ],
    });
    record.payout = championshipResult.prize;
  }
  if (proChallenge) {
    proChallengeResult = resolveProChallenge(record, proChallenge, S.holes);
    record.payout = Math.max(0, proChallengeResult.net);
  }
  const priorHistory = [...S.roundHistory];
  const courseRecord = isCourseRecord(record, priorHistory);
  const personalBest = isPersonalBest(record, priorHistory);
  if (!onlineCompetition && !championship && !proChallenge) {
    S.cash += cashOut;
    recordFinance(cashOut, 'roundBonuses', `${S.proProfile.name} owner round`);
    S.rep = clamp(S.rep + birdies * 0.03, 0.3, 5);
  }
  const restoredHome = !!isolatedReturnSave;
  if (isolatedReturnSave) {
    const homeCourse = isolatedReturnSave;
    isolatedReturnSave = null;
    applySaveData(homeCourse);
  }
  const practice = practiceSession ? applyProPracticeSession(S.proProfile, practiceSession) : undefined;
  // Apply event rewards only after an isolated retired/online course has restored the
  // live resort. Otherwise the advertised prize, career progress and ledger entry are
  // immediately overwritten by the home snapshot.
  if (championshipResult && championship) {
    S.championshipHistory.unshift(championshipResult);
    if (S.championshipHistory.length > 30) S.championshipHistory.length = 30;
    if (championship.usesResidentPro) applyChampionshipCareer(S.proProfile, championshipResult);
    S.cash += championshipResult.prize;
    recordFinance(championshipResult.prize, 'tournament', `${championshipResult.title} prize`);
  }
  if (proChallengeResult) {
    S.proChallengeHistory.unshift(proChallengeResult);
    if (S.proChallengeHistory.length > 30) S.proChallengeHistory.length = 30;
    const before = S.cash;
    S.cash = Math.max(0, S.cash + proChallengeResult.net);
    recordFinance(S.cash - before, 'proChallenge', `${S.proProfile.name} vs ${proChallengeResult.opponent.name}`);
    S.proProfile.fame += proChallengeResult.outcome === 'won' ? 25 : proChallengeResult.outcome === 'tied' ? 6 : 0;
  }
  S.roundHistory.push(record);
  if (S.roundHistory.length > ROUND_HISTORY_LIMIT) S.roundHistory.splice(0, S.roundHistory.length - ROUND_HISTORY_LIMIT);
  saveRoundHistory();
  const unlockedProperties = roundPropertyAccessAtStart ? checkDestinationReleases(roundPropertyAccessAtStart, true) : [];
  roundPropertyAccessAtStart = null;
  if (restoredHome) saveGame();
  if (practice?.gains.length) {
    const improved = practice.gains.filter((gain) => gain.levels > 0);
    if (improved.length) {
      const labels = improved.map((gain) => `${PRO_SKILLS.find((skill) => skill.id === gain.id)!.label} ${gain.level * 10}%`);
      ticker(S.proProfile.name, `Practice paid off: ${labels.join(' · ')}.`, 'money');
    } else {
      const lead = practice.gains[0];
      const label = PRO_SKILLS.find((skill) => skill.id === lead.id)!.label;
      ticker(S.proProfile.name, `Practice complete: +${lead.earned} ${label} progress (${lead.progress}%).`, 'money');
    }
  }
  S.mode = 'build';
  S.player = null;
  S.activeChampionship = null;
  S.activeProChallenge = null;
  S.camTarget = null;
  updateTopbar();
  ui.set({
    mode: 'build',
    playHud: null,
    roundsVersion: ui.get().roundsVersion + 1,
    ...(practice ? { proVersion: ui.get().proVersion + 1 } : {}),
    modal: championshipResult
      ? { kind: 'championshipResult', record, result: championshipResult, courseRecord, personalBest, unlockedProperties, practice }
      : proChallengeResult
        ? { kind: 'proChallengeResult', record, result: proChallengeResult, courseRecord, personalBest, unlockedProperties, practice }
      : { kind: 'round', record, courseRecord, personalBest, unlockedProperties, practice },
  });
  sfx.tada();
}
export function quitRound(msg?: string) {
  if (!S.player) return;
  S.mode = 'build';
  S.player = null;
  if (isolatedReturnSave) {
    const homeCourse = isolatedReturnSave;
    isolatedReturnSave = null;
    applySaveData(homeCourse);
    saveGame();
  }
  S.activeChampionship = null;
  S.activeProChallenge = null;
  roundPropertyAccessAtStart = null;
  S.camTarget = null;
  S.balls = S.balls.filter((b) => b.owner !== 'P');
  ui.set({ mode: 'build', playHud: null });
  setHint(msg || 'Round abandoned. The course won’t judge. Much.');
}

/* ---------------- tools + speed + fee ---------------- */
const HINTS: Record<string, string> = {
  pan: 'Drag to pan · pinch or scroll to zoom · hold SPACE to pan with any tool.',
  hole: 'Tap the map to place a TEE · tap an existing green to move its flag.',
  fair: 'Drag to paint fairway. Golfers love a good lie.',
  firmfair: 'Firm fairway: baked turf that bounces balls higher and rolls them farther.',
  deeprough: 'Deep rough: thick grass severely limits club and ball contact.',
  green: 'Paint near a flag to grow or reshape that green.',
  land: 'Tap a parcel marked FOR SALE to buy it.',
  sand: 'Bunkers: cheap, cruel, classic.',
  waste: 'Waste bunker: long turf, a poor stance and almost no roll.',
  pot: 'Pot bunker: a deep, severe trap that demands a short recovery shot.',
  water: 'Water hazards eat golf balls and break hearts.',
  stream: 'Paint a connected stream. Links courses call it a Burn; Desert courses carve a Ravine.',
  brush: 'Dense brush is very hard to recover from — Gorse on Links courses.',
  rocks: 'Rocks cause a hard, random ricochet when struck.',
  tree: 'Trees add beauty and bounce shots into next week.',
  flower: 'Flower beds. Pure beauty, zero mercy required.',
  path: `Drag to lay pathway (${fmt$(TINFO[Tile.PATH].cost)} on land). Water and streams automatically become ${fmt$(TINFO[Tile.BRIDGE_WATER].cost)} and ${fmt$(TINFO[Tile.BRIDGE_STREAM].cost)} bridges.`,
  raise: 'Click repeatedly or hold to raise several levels. Drag to sculpt larger slopes.',
  lower: 'Click repeatedly or hold to lower several levels. Drag to carve valleys and bowls.',
  build: 'Pick a facility, then tap the course to place it.',
  dozer: 'Tap to clear terrain, a hole, or a building. Refunds some cash.',
};
export function setTool(id: ToolId) {
  S.tool = id;
  S.holeDraft = null;
  if (id !== 'build') S.buildKind = null;
  const hint = id === 'land'
    ? S.specialVisitors.landOffer?.parcelIndices.length
      ? `I.M. Picky has ${S.specialVisitors.landOffer.parcelIndices.length} highlighted plot${S.specialVisitors.landOffer.parcelIndices.length === 1 ? '' : 's'} available — tap one to buy it.`
      : 'No county land is for sale. Impress I.M. Picky when he next plays the course.'
    : HINTS[id] || '';
  ui.set({ tool: id, hint });
}
export function selectBuilding(kind: BuildingKind) {
  S.tool = 'build';
  S.buildKind = kind;
  S.holeDraft = null;
  const tdef = themedDef(kind, S.theme);
  const cost = kind === 'landmark' && S.specialVisitors.landmarkCredits > 0 ? "Ivana's gift" : fmt$(tdef.cost);
  ui.set({ tool: 'build', hint: 'Placing ' + tdef.name + ' — tap the course. Cost ' + cost + '.' });
}
export function buildTap(wx: number, wy: number) {
  if (!S.buildKind) return;
  placeBuilding(S.buildKind, Math.floor(wx), Math.floor(wy));
}

/* ---------------- staff ---------------- */
function bumpStaff() {
  ui.set({ staffVersion: ui.get().staffVersion + 1 });
}
export function hireEmployee(kind: EmployeeKind) {
  const def = EMP_CATALOG[kind];
  if (def.skilled && !skilledUnlocked()) {
    setHint('Skilled staff unlock once your course has 6 holes.');
    sfx.err();
    return;
  }
  if (!spend(hireCost(kind), 'staff', `${def.name} recruitment`)) return;
  addEmployee(kind);
  sfx.coin();
  ticker('Front office', def.name + ' joined the crew ($' + def.wage.toFixed(1) + '/s).', 'money');
  bumpStaff();
}
export function fireEmployee(kind: EmployeeKind) {
  if (fireOne(kind)) {
    setHint(EMP_CATALOG[kind].name + ' has been let go.');
    bumpStaff();
  }
}
export function setSpeed(n: number) {
  if (S.mode === 'play' && n === 0) n = 1;
  S.speed = n;
  ui.set({ speed: n });
}
export function setFee(delta: number) {
  S.fee = clamp(S.fee + delta, 5, 100);
  updateTopbar();
}
export function setMuted(m: boolean) {
  S.muted = m;
  ui.set({ muted: m });
}

/* ---------------- save / load ---------------- */
const SAVE_KEY = 'fairway-mogul-save-v1';
const SLOTS_KEY = 'fairway-mogul-slots-v1';
const PROFILE_KEY = 'fairway-mogul-profile-v1';
const slotDataKey = (id: string) => 'fairway-mogul-slot-' + id + '-v1';

function snapshotHasSgaFlag(snapshot: unknown, flag: 'top100' | 'top18'): boolean {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const holes = (snapshot as { holes?: unknown }).holes;
  return Array.isArray(holes) && holes.some((hole) => !!hole && typeof hole === 'object' && (hole as Record<string, unknown>)[flag] === true);
}

/** Current sticky portfolio milestones, including achievements earned since the last autosave. */
export function careerProgressSnapshot(): CareerProgress {
  const existing = sanitizeCareerProgress(S.careerProgress, S.proProfile.accomplishments);
  const historyBest = S.history.reduce((best, entry) => Math.max(best, Number.isFinite(entry.rep) ? entry.rep : 0), 0);
  const currentTop100 = S.holes.some((hole) => hole.top100 || hole.top18);
  const currentTop18 = S.holes.some((hole) => hole.top18);
  const retiredTop100 = S.retiredCourses.some((course) => snapshotHasSgaFlag(course.snapshot, 'top100') || snapshotHasSgaFlag(course.snapshot, 'top18'));
  const retiredTop18 = S.retiredCourses.some((course) => snapshotHasSgaFlag(course.snapshot, 'top18'));
  const releasedProperties = sanitizePropertyHistory(existing.releasedProperties);
  return {
    version: 1,
    bestReputation: clamp(Math.max(existing.bestReputation, Number.isFinite(S.rep) ? S.rep : 0, historyBest), 0, 5),
    tournamentHosted: existing.tournamentHosted || S.tournamentHostedEver || S.goalsAchieved.tournament === true,
    sgaTop100Earned: existing.sgaTop100Earned || currentTop100 || retiredTop100,
    sgaTop18Earned: existing.sgaTop18Earned || currentTop18 || retiredTop18,
    ...(releasedProperties.length ? { releasedProperties: [...releasedProperties] } : {}),
  };
}

function currentPropertyAccessContext(): PropertyAvailabilityContext {
  return {
    funds: S.cash,
    progress: { ...careerProgressSnapshot() },
    proProfile: {
      fame: S.proProfile.fame,
      starts: S.proProfile.starts,
      podiums: S.proProfile.podiums,
      wins: S.proProfile.wins,
    },
    purchased: [...S.propertiesPurchased],
    currentPropertyId: S.propertyId,
    sandbox: S.sandbox,
  };
}

/**
 * Establish a silent baseline after loading/travelling. Legacy profiles adopt
 * deeds already reachable in that snapshot, so only genuinely new crossings
 * produce the original-style worldwide release announcement.
 */
export function resetDestinationReleaseTracking() {
  const context = currentPropertyAccessContext();
  propertyReleaseBaseline = context;
  const released = new Set(sanitizePropertyHistory(S.careerProgress.releasedProperties));
  if (!context.sandbox) {
    for (const property of WORLD_PROPERTIES) {
      if (propertyAvailability(property, context).status === 'available') released.add(property.id);
    }
  }
  propertyReleaseAcknowledged = released;
}

/**
 * Central destination watcher. Cash, best reputation, tournament/SGA flags,
 * pro fame and championship results all flow through the same comparison, and
 * profile-level acknowledgement prevents a cash dip from replaying a release.
 */
export function checkDestinationReleases(before?: PropertyAvailabilityContext, suppressSound = false): PropertyId[] {
  if (isolatedReturnSave && !before) return [];
  const after = currentPropertyAccessContext();
  const previous = before ?? propertyReleaseBaseline;
  propertyReleaseBaseline = after;
  if (!previous) {
    resetDestinationReleaseTracking();
    return [];
  }
  const acknowledged = new Set([
    ...propertyReleaseAcknowledged,
    ...sanitizePropertyHistory(S.careerProgress.releasedProperties),
  ]);
  const fresh = newlyAvailableProperties(previous, after).filter((property) => !acknowledged.has(property.id));
  if (!fresh.length) return [];

  const propertyIds = fresh.map((property) => property.id);
  for (const propertyId of propertyIds) acknowledged.add(propertyId);
  propertyReleaseAcknowledged = acknowledged;
  S.careerProgress = { ...careerProgressSnapshot(), releasedProperties: [...acknowledged] };
  saveRoundHistory();
  const names = fresh.map((property) => property.name);
  ticker('World Screen', `${names.join(' · ')} ${names.length === 1 ? 'is' : 'are'} now released for development.`, 'money');
  setHint(`New worldwide ${names.length === 1 ? 'destination' : 'destinations'}: ${names.join(' · ')}. Open the World Screen to develop ${names.length === 1 ? 'it' : 'them'}.`);
  ui.set({ destinationRelease: [...new Set([...ui.get().destinationRelease, ...propertyIds])] });
  if (!suppressSound) sfx.tada();
  return propertyIds;
}

function captureCareerProgress() {
  S.careerProgress = careerProgressSnapshot();
}

function saveRoundHistory(): boolean {
  if (!isolatedReturnSave) captureCareerProgress();
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      version: 3,
      rounds: S.roundHistory,
      proProfile: S.proProfile,
      retiredCourses: S.retiredCourses,
      championshipHistory: S.championshipHistory,
      proChallengeHistory: S.proChallengeHistory,
      propertiesPurchased: S.propertiesPurchased,
      careerProgress: S.careerProgress,
    }));
    return true;
  } catch {
    /* profile history is non-critical when storage is unavailable */
    return false;
  }
}

function sanitizeRetiredCourses(value: unknown): RetiredCourse[] {
  if (!Array.isArray(value)) return [];
  const themes: CourseTheme[] = ['parklands', 'links', 'desert', 'tropical'];
  return value.filter((raw): raw is RetiredCourse => {
    if (!raw || typeof raw !== 'object') return false;
    const course = raw as Partial<RetiredCourse>;
    return typeof course.id === 'string' && typeof course.name === 'string' && typeof course.courseHash === 'string' &&
      typeof course.retiredAt === 'number' && Number.isFinite(course.retiredAt) && themes.includes(course.theme as CourseTheme) &&
      typeof course.holes === 'number' && course.holes > 0 && course.snapshot !== null && typeof course.snapshot === 'object';
  }).slice(0, 8);
}

function sanitizeChampionshipHistory(value: unknown): ChampionshipResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter((raw): raw is ChampionshipResult => {
    if (!raw || typeof raw !== 'object') return false;
    const result = raw as Partial<ChampionshipResult>;
    return typeof result.id === 'string' && typeof result.title === 'string' && typeof result.recordId === 'string' &&
      typeof result.rank === 'number' && result.rank > 0 && typeof result.prize === 'number' && Array.isArray(result.standings);
  }).slice(0, 30);
}

function sanitizeProChallengeHistory(value: unknown): ProChallengeResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter((raw): raw is ProChallengeResult => {
    if (!raw || typeof raw !== 'object') return false;
    const result = raw as Partial<ProChallengeResult>;
    return typeof result.id === 'string' && typeof result.proName === 'string' && typeof result.recordId === 'string' &&
      typeof result.net === 'number' && Number.isFinite(result.net) && Array.isArray(result.holes) &&
      (result.outcome === 'won' || result.outcome === 'lost' || result.outcome === 'tied');
  }).slice(0, 30);
}

export function loadRoundHistory() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    S.roundHistory = sanitizeRoundHistory(parsed?.rounds);
    S.proProfile = sanitizeProProfile(parsed?.proProfile);
    S.retiredCourses = sanitizeRetiredCourses(parsed?.retiredCourses);
    S.championshipHistory = sanitizeChampionshipHistory(parsed?.championshipHistory);
    S.proChallengeHistory = sanitizeProChallengeHistory(parsed?.proChallengeHistory);
    S.propertiesPurchased = sanitizePropertyHistory(parsed?.propertiesPurchased);
    S.careerProgress = sanitizeCareerProgress(parsed?.careerProgress, S.proProfile.accomplishments);
  } catch {
    S.roundHistory = [];
    S.proProfile = createResidentPro();
    S.retiredCourses = [];
    S.championshipHistory = [];
    S.proChallengeHistory = [];
    S.propertiesPurchased = [];
    S.careerProgress = sanitizeCareerProgress(null);
  }
}

export function currentCourseHash(): string {
  return courseFingerprint(S);
}

function bumpPro() {
  ui.set({ proVersion: ui.get().proVersion + 1 });
}

export function updateResidentPro(patch: Partial<Pick<ProProfile, 'name' | 'shirt' | 'skin' | 'cap'>>) {
  S.proProfile = sanitizeProProfile({ ...S.proProfile, ...patch });
  saveRoundHistory();
  bumpPro();
}

export function changeResidentProSkill(id: ProSkillId, delta: -1 | 1): boolean {
  if (!adjustProSkill(S.proProfile, id, delta)) return false;
  saveRoundHistory();
  bumpPro();
  return true;
}

export function exportResidentProText(): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), pro: S.proProfile }, null, 2);
}

export function importResidentProText(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.version !== 1 || !parsed?.pro || typeof parsed.pro !== 'object') throw new Error('invalid pro');
    S.proProfile = sanitizeProProfile(parsed.pro);
    saveRoundHistory();
    bumpPro();
    setHint(`${S.proProfile.name} joined the resort as resident golf pro.`);
    return true;
  } catch {
    setHint('That file is not a compatible Fairway Mogul golf pro.');
    sfx.err();
    return false;
  }
}

export function retireCourseForChampionship(name = S.courseName): RetiredCourse | null {
  if (!S.holes.length) {
    setHint('Build at least one hole before retiring a course for championship play.');
    sfx.err();
    return null;
  }
  const snapshot = JSON.parse(JSON.stringify(buildSaveData()));
  snapshot.golfers = [];
  const courseHash = currentCourseHash();
  const prior = S.retiredCourses.find((course) => course.courseHash === courseHash);
  const retired: RetiredCourse = {
    id: prior?.id ?? `retired-${crypto.randomUUID()}`,
    name: name.trim().slice(0, 40) || S.courseName,
    retiredAt: Date.now(),
    courseHash,
    theme: S.theme,
    holes: S.holes.length,
    par: S.holes.reduce((sum, hole) => sum + hole.par, 0),
    snapshot,
  };
  const before = [...S.retiredCourses];
  S.retiredCourses = [retired, ...S.retiredCourses.filter((course) => course.id !== retired.id)].slice(0, 8);
  if (!saveRoundHistory()) {
    S.retiredCourses = before;
    setHint('The browser could not store another championship course. Export or remove an older one first.');
    sfx.err();
    return null;
  }
  bumpPro();
  ticker('Pro Circuit', `${retired.name} has been retired for Championship Mode.`, 'money');
  return retired;
}

export function deleteRetiredCourse(id: string): boolean {
  const next = S.retiredCourses.filter((course) => course.id !== id);
  if (next.length === S.retiredCourses.length) return false;
  S.retiredCourses = next;
  saveRoundHistory();
  bumpPro();
  return true;
}

export function exportRoundHistoryText(): string {
  return roundHistoryToJson(S.roundHistory);
}

export function importRoundHistoryText(text: string): number {
  try {
    const parsed = JSON.parse(text);
    const incoming = sanitizeRoundHistory(parsed?.rounds);
    const byId = new Map<string, RoundRecord>(S.roundHistory.map((record) => [record.id, record]));
    for (const record of incoming) byId.set(record.id, record);
    S.roundHistory = [...byId.values()].sort((a, b) => a.completedAt - b.completedAt).slice(-ROUND_HISTORY_LIMIT);
    saveRoundHistory();
    ui.set({ roundsVersion: ui.get().roundsVersion + 1 });
    setHint(`${incoming.length} scorecard${incoming.length === 1 ? '' : 's'} imported.`);
    return incoming.length;
  } catch {
    setHint('That file is not a compatible Fairway Mogul scorecard archive.');
    return 0;
  }
}

function buildSaveData() {
  return {
    v: 2 as const,
    savedAt: Date.now(),
    courseName: S.courseName,
    theme: S.theme,
    propertyId: S.propertyId,
    themePackId: S.themePackId,
    themeCourseId: S.themeCourseId,
    difficulty: S.difficulty,
    sandbox: S.sandbox,
    cash: S.cash,
    fee: S.fee,
    rep: S.rep,
    time: S.time,
    rot: S.rot,
    served: S.served,
    lost: S.lost,
    tiles: Array.from(S.tiles),
    elevC: Array.from(S.elevC),
    owned: Array.from(S.owned),
    holes: S.holes,
    buildings: S.buildings,
    employees: S.employees,
    golfers: S.golfers,
    regulars: S.regulars,
    financeLedger: S.financeLedger,
    specialVisitors: S.specialVisitors,
    proChallengeOffer: S.proChallengeOffer,
    proChallengeCooldown: S.proChallengeCooldown,
    tournamentHostedEver: S.tournamentHostedEver,
    goalsAchieved: S.goalsAchieved,
    comments: S.comments,
    history: S.history,
  };
}
/** Applies a parsed save object to `S`. Returns false (and leaves `S` untouched) if it's incompatible. */
function applySaveData(d: any): boolean {
  if ((d.v !== 1 && d.v !== 2) || !Array.isArray(d.tiles) || d.tiles.length !== W * H) return false;
  S.courseName = typeof d.courseName === 'string' && d.courseName.trim() ? d.courseName.slice(0, 40) : 'Fairway Mogul';
  const THEMES: CourseTheme[] = ['parklands', 'links', 'desert', 'tropical'];
  S.theme = THEMES.includes(d.theme) ? d.theme : 'parklands';
  S.propertyId = isPropertyId(d.propertyId) ? d.propertyId : starterPropertyForTheme(S.theme).id;
  S.themePackId = isThemePackId(d.themePackId) ? d.themePackId : 'standard';
  S.themeCourseId = typeof d.themeCourseId === 'string' && themePackCourse(S.themePackId, d.themeCourseId) ? d.themeCourseId : null;
  S.difficulty = isDifficulty(d.difficulty) ? d.difficulty : 'moderate';
  S.sandbox = !!d.sandbox;
  caches.orthoDirty = true;
  caches.groundDirty = true;
  S.cash = d.cash;
  S.fee = d.fee;
  S.rep = d.rep;
  S.time = Number.isFinite(d.time) ? Math.max(0, d.time) : 0;
  S.rot = Number.isFinite(d.rot) ? clamp(Math.trunc(d.rot), 0, 3) : 0;
  S.served = d.served || 0;
  S.lost = d.lost || 0;
  S.tiles = Uint8Array.from(d.tiles);
  S.owned = Array.isArray(d.owned) && d.owned.length === PW * PH ? Uint8Array.from(d.owned) : (() => {
    const o = new Uint8Array(PW * PH);
    o.fill(1); // saves from before land parcels owned everything they had
    return o;
  })();
  if (d.v === 2 && Array.isArray(d.elevC) && d.elevC.length === (W + 1) * (H + 1)) {
    S.elevC = Uint8Array.from(d.elevC);
  } else {
    // v1 stored per-tile steps; approximate as corner heights and smooth
    S.elevC = new Uint8Array((W + 1) * (H + 1));
    if (Array.isArray(d.elev) && d.elev.length === W * H) {
      const tileE = (x: number, y: number) => (inb(x, y) ? d.elev[idx(x, y)] : 0);
      for (let y = 0; y <= H; y++)
        for (let x = 0; x <= W; x++)
          S.elevC[idxC(x, y)] = Math.max(tileE(x, y), tileE(x - 1, y), tileE(x, y - 1), tileE(x - 1, y - 1));
    }
    relaxTerrain();
  }
  S.holes = d.holes || [];
  S.buildings = (Array.isArray(d.buildings) ? d.buildings : []).map((raw: Building) => {
    const b = { ...raw } as Building;
    if (!isUpgradeableFacility(b.kind)) {
      delete b.level;
      delete b.branch;
      delete b.upgrade;
      return b;
    }
    b.level = clamp(Math.trunc(b.level ?? 1), 1, 3) as 1 | 2 | 3;
    if (b.level > 1 && b.branch !== 'service' && b.branch !== 'prestige') b.branch = 'service';
    if (b.level === 1) b.branch = undefined;
    const work = b.upgrade;
    const validWork =
      work &&
      (work.targetLevel === 2 || work.targetLevel === 3) &&
      work.targetLevel > b.level &&
      (work.branch === 'service' || work.branch === 'prestige') &&
      Number.isFinite(work.duration) &&
      work.duration > 0 &&
      Number.isFinite(work.remaining);
    if (validWork) {
      work.duration = clamp(work.duration, 1, 120);
      work.remaining = clamp(work.remaining, 0, work.duration);
    } else delete b.upgrade;
    return b;
  });
  S.facilityActivities = [];
  S.nextFacilityActivity = 3;
  S.employees = d.employees || [];
  S.regulars = (Array.isArray(d.regulars) ? d.regulars : [])
    .filter((raw: unknown): raw is Regular => !!raw && typeof raw === 'object' && typeof (raw as Regular).name === 'string')
    .map((regular: Regular) => ({
      ...regular,
      visits: Math.max(0, Math.trunc(Number(regular.visits) || 0)),
      streak: Math.max(0, Math.trunc(Number(regular.streak) || 0)),
      lastVisit: Number.isFinite(regular.lastVisit) ? regular.lastVisit : -1e9,
      length: clamp(Number(regular.length) || 0.2, 0.2, 1),
      accuracy: clamp(Number(regular.accuracy) || 0.2, 0.2, 1),
      imagination: clamp(Number(regular.imagination) || 0.2, 0.2, 1),
      holesPlayed: Math.max(0, Math.trunc(Number(regular.holesPlayed) || 0)),
      lifetimeSpend: Math.max(0, Math.trunc(Number(regular.lifetimeSpend) || 0)),
      training: sanitizeRegularTraining(regular.training),
      membership: sanitizeMembership(regular.membership),
    }));
  seedRegulars(); // backfills the roster on saves from before this feature
  S.financeLedger = sanitizeFinanceLedger(d.financeLedger);
  if (!S.financeLedger.length) {
    S.financeLedger = [{ id: 1, time: S.time, year: financialYearAt(S.time), amount: Math.trunc(S.cash), category: 'capital', detail: 'Balance brought forward' }];
  }
  financeSeq = S.financeLedger.reduce((max, entry) => Math.max(max, entry.id), 0);
  resetOperatingAccruals();
  S.nextStoryCheck = 20;
  const freshVisitors = freshSpecialVisitors();
  const savedVisitors = d.specialVisitors && typeof d.specialVisitors === 'object' ? d.specialVisitors : {};
  S.specialVisitors = {
    pickyCooldown: Number.isFinite(savedVisitors.pickyCooldown) ? clamp(savedVisitors.pickyCooldown, 0, 10000) : freshVisitors.pickyCooldown,
    ivanaCooldown: Number.isFinite(savedVisitors.ivanaCooldown) ? clamp(savedVisitors.ivanaCooldown, 0, 10000) : freshVisitors.ivanaCooldown,
    pickyVisits: Math.max(0, Math.trunc(savedVisitors.pickyVisits ?? 0)),
    ivanaVisits: Math.max(0, Math.trunc(savedVisitors.ivanaVisits ?? 0)),
    landmarkDonated: !!savedVisitors.landmarkDonated,
    landmarkCredits: clamp(Math.trunc(savedVisitors.landmarkCredits ?? 0), 0, 1),
    landPurchased: !!savedVisitors.landPurchased || !!d.goalsAchieved?.pickyLand,
    landOffer: savedVisitors.landOffer && Array.isArray(savedVisitors.landOffer.parcelIndices) ? {
      id: Number(savedVisitors.landOffer.id) || Date.now(),
      parcelIndices: savedVisitors.landOffer.parcelIndices.filter((parcel: unknown) => Number.isInteger(parcel) && Number(parcel) >= 0 && Number(parcel) < PW * PH && !S.owned[Number(parcel)]),
      price: clamp(Number(savedVisitors.landOffer.price) || LAND_COST, 1, 100000),
      remaining: clamp(Number(savedVisitors.landOffer.remaining) || 60, 1, 300),
    } : null,
  };
  if (!S.specialVisitors.landOffer?.parcelIndices.length) S.specialVisitors.landOffer = null;
  S.proChallengeOffer = sanitizeProChallengeOffer(d.proChallengeOffer);
  S.proChallengeCooldown = Number.isFinite(d.proChallengeCooldown) ? clamp(d.proChallengeCooldown, 0, 10000) : 75;
  S.activeProChallenge = null;
  S.tournament = null; // an in-progress tournament doesn't survive a reload
  S.tournamentCooldown = 0;
  S.tournamentHostedEver = !!d.tournamentHostedEver;
  S.goalsAchieved = d.goalsAchieved && typeof d.goalsAchieved === 'object' ? d.goalsAchieved : {};
  let recoveredPoints = 0;
  for (const id of Object.keys(S.goalsAchieved)) {
    if (!S.goalsAchieved[id] || S.proProfile.accomplishments.includes(id)) continue;
    S.proProfile.accomplishments.push(id);
    S.proProfile.unspentSkillPoints++;
    recoveredPoints++;
  }
  if (recoveredPoints) saveRoundHistory();
  S.comments = Array.isArray(d.comments) ? d.comments : [];
  commentSeq = S.comments.reduce((max, c) => Math.max(max, c.id ?? 0), 0);
  S.history = Array.isArray(d.history) ? d.history : [];
  // restore golfers mid-round; balls in flight aren't saved, so coerce
  // anyone who was watching/swinging back into a walking state
  S.golfers = [];
  if (Array.isArray(d.golfers)) {
    for (const g of d.golfers as Golfer[]) {
      if (typeof g?.x !== 'number' || typeof g?.holeIdx !== 'number') continue;
      if (g.holeIdx >= S.holes.length) continue; // their hole is gone
      g.chatCd = 0;
      if (typeof g.hunger !== 'number') g.hunger = 1;
      if (typeof g.thirst !== 'number') g.thirst = 1;
      if (typeof g.energy !== 'number') g.energy = 1;
      if (g.state !== 'leave') {
        if (g.ball) {
          g.state = 'toBall';
          setGolferTarget(g, g.ball.x, g.ball.y);
        } else {
          const h = S.holes[g.holeIdx];
          g.state = 'toTee';
          setGolferTarget(g, h.tee.x, h.tee.y);
        }
      } else {
        g.path = undefined;
        g.pathIdx = 0;
      }
      S.golfers.push(g);
    }
  }
  const activeSpecials = new Set(S.golfers.map((golfer) => golfer.specialGuest).filter(Boolean));
  if (!activeSpecials.has('picky') && !S.specialVisitors.landOffer && S.specialVisitors.pickyCooldown > 600) S.specialVisitors.pickyCooldown = 30;
  if (!activeSpecials.has('ivana') && !S.specialVisitors.landmarkDonated && S.specialVisitors.ivanaCooldown > 600) S.specialVisitors.ivanaCooldown = 45;
  recomputeAllBeauty();
  captureCareerProgress();
  resetDestinationReleaseTracking();
  rebuildStatics();
  updateTopbar();
  return true;
}
function persistCourseSave(data: ReturnType<typeof buildSaveData>): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
let portfolioReady = false;
function setPortfolioStatus(status: 'idle' | 'saving' | 'saved' | 'error', bump = false) {
  ui.set({
    portfolioStatus: status,
    ...(bump ? { portfolioVersion: ui.get().portfolioVersion + 1 } : {}),
  });
}
export function saveGame() {
  // Event play is a temporary guest course. Autosave must keep protecting the
  // owner's captured home course even if the browser reloads mid-round.
  const snapshot = isolatedReturnSave ?? buildSaveData();
  if (persistCourseSave(snapshot)) associateActivePortfolioMirror(snapshot);
  saveRoundHistory();
  if (portfolioReady && portfolioSupported()) {
    setPortfolioStatus('saving');
    void saveActivePortfolioResort(snapshot)
      .then((saved) => setPortfolioStatus(saved ? 'saved' : 'error', saved))
      .catch(() => setPortfolioStatus('error'));
  }
}
export function loadGame(): boolean {
  loadRoundHistory();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    if (!applySaveData(JSON.parse(raw))) {
      ticker('Course Ops', "Your saved course is incompatible with this version and couldn't be loaded — starting fresh.", 'bad');
      return false;
    }
    if (!S.sandbox && !S.propertiesPurchased.includes(S.propertyId)) {
      S.propertiesPurchased.push(S.propertyId);
      saveRoundHistory();
    }
    return true;
  } catch {
    return false;
  }
}

/** Browser boot path: migrate the legacy autosave once, then prefer the active portfolio resort. */
export async function loadPortfolioGame(): Promise<boolean> {
  const legacyResumed = loadGame();
  if (!portfolioSupported()) return legacyResumed;
  try {
    const active = await bootstrapPortfolio(legacyResumed ? buildSaveData() : null);
    portfolioReady = true;
    if (!active) {
      setPortfolioStatus('idle', true);
      return legacyResumed;
    }
    if (!applySaveData(active.snapshot)) throw new Error('Active resort is incompatible');
    if (!S.sandbox && !S.propertiesPurchased.includes(S.propertyId)) S.propertiesPurchased.push(S.propertyId);
    persistCourseSave(buildSaveData()); // compatibility mirror + emergency recovery
    saveRoundHistory();
    setPortfolioStatus('saved', true);
    return true;
  } catch {
    setPortfolioStatus('error');
    return legacyResumed;
  }
}

export async function portfolioResorts(): Promise<ResortRecord[]> {
  try {
    return await listPortfolioResorts();
  } catch {
    setPortfolioStatus('error');
    return [];
  }
}
export function setCourseName(name: string) {
  const trimmed = name.trim().slice(0, 40);
  if (trimmed) {
    S.courseName = trimmed;
    updateTopbar();
  }
}

/* ---------------- named save slots (export/import + a picker) ---------------- */
export interface SlotInfo {
  id: string;
  name: string;
  savedAt: number;
  cash: number;
  holes: number;
  rep: number;
}
function readSlots(): SlotInfo[] {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
export function listSlots(): SlotInfo[] {
  return readSlots();
}
export function saveToSlot(id: string, name: string) {
  try {
    const data = buildSaveData();
    localStorage.setItem(slotDataKey(id), JSON.stringify(data));
    const slots = readSlots().filter((s) => s.id !== id);
    slots.push({ id, name: name.trim().slice(0, 40) || 'Untitled course', savedAt: Date.now(), cash: S.cash, holes: S.holes.length, rep: S.rep });
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
    setHint(`Saved to slot "${name}".`);
  } catch {
    setHint('Could not save — storage full or unavailable.');
  }
}
export function loadFromSlot(id: string): boolean {
  if (S.player || isolatedReturnSave) {
    setHint('Finish or quit the current round before loading another course.');
    return false;
  }
  try {
    const raw = localStorage.getItem(slotDataKey(id));
    if (!raw || !applySaveData(JSON.parse(raw))) {
      setHint('That save slot is empty or incompatible.');
      return false;
    }
    if (!S.sandbox && !S.propertiesPurchased.includes(S.propertyId)) S.propertiesPurchased.push(S.propertyId);
    saveGame();
    setHint('Course loaded and saved as the active resort.');
    return true;
  } catch {
    return false;
  }
}
export function deleteSlot(id: string) {
  try {
    localStorage.removeItem(slotDataKey(id));
    localStorage.setItem(SLOTS_KEY, JSON.stringify(readSlots().filter((s) => s.id !== id)));
  } catch {
    /* ignore */
  }
}
/** Plain JSON text for a browser download — the UI layer owns the actual file-save mechanics. */
export function exportSaveText(): string {
  return JSON.stringify(buildSaveData(), null, 2);
}
/** Loads a save from arbitrary JSON text (e.g. an imported file). */
export function importSaveText(text: string): boolean {
  if (S.player || isolatedReturnSave) {
    setHint('Finish or quit the current round before importing another course.');
    return false;
  }
  try {
    if (!applySaveData(JSON.parse(text))) {
      setHint('That file is not a compatible Fairway Mogul save.');
      return false;
    }
    if (!S.sandbox && !S.propertiesPurchased.includes(S.propertyId)) S.propertiesPurchased.push(S.propertyId);
    saveGame();
    setHint('Course imported and saved as the active resort.');
    return true;
  } catch {
    setHint('That file is not a compatible Fairway Mogul save.');
    return false;
  }
}
/** `sandbox`: manual's separate "Sandbox Mode" menu item — unlimited funds, every parcel pre-owned. */
export function newCourse(
  sandbox = false,
  difficulty: Difficulty = 'moderate',
  theme: CourseTheme = S.theme,
  themePackId: ThemePackId = 'standard',
  themeCourseId: string | null = null,
  propertyId?: PropertyId,
  availableFunds = PROPERTY_INHERITANCE,
): boolean {
  const property = propertyId ? propertyById(propertyId) : starterPropertyForTheme(theme);
  const funds = Math.max(0, Math.trunc(!sandbox && S.sandbox ? PROPERTY_INHERITANCE : availableFunds));
  captureCareerProgress();
  if (!sandbox && propertyId && S.propertiesPurchased.includes(property.id)) {
    setHint(`${property.name} is already developed. Choose an undeveloped property or open it in Sandbox Mode.`);
    sfx.err();
    return false;
  }
  const availability = propertyAvailability(property, {
    funds,
    progress: S.careerProgress,
    proProfile: S.proProfile,
    purchased: S.propertiesPurchased,
    sandbox,
  });
  if (!sandbox && !availability.canPurchase) {
    const prestigeMissing = availability.missing.filter((requirement) => requirement.id !== 'cash');
    setHint(prestigeMissing.length
      ? `${property.name} is still locked: ${prestigeMissing.map((requirement) => requirement.label).join(' · ')}.`
      : `${property.name} costs ${fmt$(property.price)}; only ${fmt$(funds)} is available.`);
    sfx.err();
    return false;
  }
  S.courseName = property.name;
  S.theme = property.theme;
  S.propertyId = property.id;
  S.themePackId = isThemePackId(themePackId) ? themePackId : 'standard';
  S.themeCourseId = themePackCourse(S.themePackId, themeCourseId) ? themeCourseId : null;
  S.difficulty = difficulty;
  S.sandbox = sandbox;
  S.cash = sandbox ? 9999999 : funds - property.price;
  S.fee = 20;
  S.rep = 2.5;
  S.time = 0;
  S.speed = 1;
  S.rot = 0;
  S.nextGolfer = 2.5;
  S.camTarget = null;
  S.served = 0;
  S.lost = 0;
  S.holes = [];
  S.buildings = [];
  S.facilityActivities = [];
  S.nextFacilityActivity = 4;
  S.employees = [];
  S.golfers = [];
  S.regulars = [];
  S.financeLedger = [{ id: 1, time: 0, year: 1, amount: sandbox ? S.cash : funds, category: 'capital', detail: sandbox ? 'Sandbox treasury' : 'Available development funds' }];
  if (!sandbox && property.price > 0) S.financeLedger.push({ id: 2, time: 0, year: 1, amount: -property.price, category: 'land', detail: `${property.name} property deed` });
  financeSeq = 1;
  if (S.financeLedger.length > 1) financeSeq = 2;
  resetOperatingAccruals();
  S.nextStoryCheck = 20;
  S.specialVisitors = freshSpecialVisitors();
  S.proChallengeOffer = null;
  S.proChallengeCooldown = 75;
  S.activeProChallenge = null;
  S.tournament = null;
  S.tournamentCooldown = 0;
  S.tournamentHostedEver = false;
  S.goalsAchieved = {};
  S.comments = [];
  commentSeq = 0;
  S.history = [];
  S.balls = [];
  S.floaters = [];
  S.parts = [];
  S.player = null;
  S.mode = 'build';
  initMap();
  if (sandbox) {
    S.owned.fill(1);
    caches.orthoDirty = true;
    caches.groundDirty = true;
  }
  centerCam(S.holes[0]?.tee.x ?? CH.x, S.holes[0]?.tee.y ?? CH.y);
  const purchasedProperty = !sandbox && !S.propertiesPurchased.includes(property.id);
  if (purchasedProperty) S.propertiesPurchased.push(property.id);
  resetDestinationReleaseTracking();
  const courseSaved = persistCourseSave(buildSaveData());
  if (purchasedProperty && courseSaved) saveRoundHistory();
  updateTopbar();
  ui.set({ mode: 'build', speed: 1, playHud: null, modal: null, destinationRelease: [], buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, sandbox, difficulty, courseTheme: S.theme, propertyId: S.propertyId, themePackId: S.themePackId });
  setTool('hole');
  const pack = themePackById(S.themePackId);
  const course = themePackCourse(S.themePackId, S.themeCourseId);
  setHint(sandbox
    ? `${property.name} · ${pack.name} Sandbox: unlimited funds and every parcel owned.`
    : course ? `${property.name} purchased — ${pack.name}'s ${course.name} is open for development.` : `${property.name} purchased with ${fmt$(S.cash)} left to build. ${pack.name} is enabled.`);
  return true;
}

/**
 * Portfolio-aware course creation. The legacy synchronous `newCourse` remains the
 * deterministic course factory; this wrapper adds transactional source/target saves
 * and rolls the live course/profile back if the portfolio commit fails.
 */
export async function createPortfolioCourse(
  sandbox = false,
  difficulty: Difficulty = 'moderate',
  theme: CourseTheme = S.theme,
  themePackId: ThemePackId = 'standard',
  themeCourseId: string | null = null,
  propertyId?: PropertyId,
  availableFunds = PROPERTY_INHERITANCE,
  preserveCurrent = true,
): Promise<boolean> {
  if (S.player || isolatedReturnSave) {
    setHint('Finish or quit the current round before travelling to another property.');
    sfx.err();
    return false;
  }
  const source = preserveCurrent ? buildSaveData() : null;
  const originalProperties = [...S.propertiesPurchased];
  const originalProgress = { ...S.careerProgress };
  const legacyBefore = (() => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } })();
  const profileBefore = (() => { try { return localStorage.getItem(PROFILE_KEY); } catch { return null; } })();
  const property = propertyById(propertyId);

  if (!newCourse(sandbox, difficulty, theme, themePackId, themeCourseId, propertyId, availableFunds)) return false;
  const target = buildSaveData();
  if (!portfolioSupported()) {
    setHint(`${property.name} is open. This browser cannot keep a switchable resort portfolio.`);
    return true;
  }

  try {
    setPortfolioStatus('saving');
    const persistedSource = source ? sourceForPortfolioExpansion(source, property.name, sandbox ? 'sandbox' : 'career') : source;
    await createPortfolioResort(persistedSource, target, sandbox ? 'sandbox' : 'career');
    portfolioReady = true;
    saveRoundHistory();
    setPortfolioStatus('saved', true);
    ticker('World Office', `${property.name} joined your resort portfolio.`, 'money');
    return true;
  } catch {
    S.propertiesPurchased = originalProperties;
    S.careerProgress = originalProgress;
    if (source) applySaveData(source);
    try {
      if (legacyBefore === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, legacyBefore);
      if (profileBefore === null) localStorage.removeItem(PROFILE_KEY); else localStorage.setItem(PROFILE_KEY, profileBefore);
    } catch { /* storage rollback is best effort */ }
    setPortfolioStatus('error');
    setHint('The new resort could not be saved safely. Your current course was restored.');
    sfx.err();
    return false;
  }
}

export async function switchPortfolioResort(id: ResortId): Promise<boolean> {
  if (S.player || isolatedReturnSave) {
    setHint('Finish or quit the current round before travelling.');
    sfx.err();
    return false;
  }
  try {
    setPortfolioStatus('saving');
    const target = await switchPortfolioResortSnapshot(buildSaveData(), id);
    if (!applySaveData(target.snapshot)) throw new Error('The target resort is incompatible');
    persistCourseSave(buildSaveData());
    saveRoundHistory();
    S.mode = 'build';
    S.player = null;
    S.camTarget = null;
    updateTopbar();
    ui.set({ mode: 'build', speed: 1, playHud: null, modal: null, buildPanel: false, staffPanel: false, reportsPanel: false, regularsPanel: false, scorecardsPanel: false, onlinePanel: false, proPanel: false });
    setPortfolioStatus('saved', true);
    setHint(`Welcome back to ${target.summary.courseName}.`);
    ticker('World Office', `Arrived at ${target.summary.courseName} · ${propertyById(target.propertyId).region}.`, 'money');
    return true;
  } catch {
    setPortfolioStatus('error');
    setHint('That resort could not be opened safely. The current course is unchanged.');
    sfx.err();
    return false;
  }
}

/* ---------------- building lots develop into homes ---------------- */
function updateLots(dtw: number) {
  for (const b of S.buildings) {
    if (b.kind !== 'buildinglot' || !b.open || (b.stage ?? 0) >= 2) continue;
    b.stageT = (b.stageT ?? 0) + dtw;
    const need = b.stage === 0 ? 25 : 55;
    if (b.stageT >= need) {
      b.stage = (b.stage ?? 0) + 1;
      b.stageT = 0;
      floater(b.x + b.w / 2, b.y + b.h / 2, b.stage === 1 ? 'Cottage built!' : 'Estate finished!', '#ffd856');
      ticker('Realtor', b.stage === 1 ? 'A cottage went up on your building lot.' : 'The lot upgraded to a luxury estate. Income up!', 'money');
      sfx.tada();
    }
  }
}

/** Advance visible facility construction and atomically activate the new tier. */
export function updateFacilityUpgrades(dtw: number) {
  for (const b of S.buildings) {
    const work = b.upgrade;
    if (!work) continue;
    work.remaining = Math.max(0, work.remaining - dtw);
    if (work.remaining > 0) continue;
    b.level = work.targetLevel;
    b.branch = work.branch;
    delete b.upgrade;
    const name = facilityDisplayName(b, S.theme);
    floater(b.x + b.w / 2, b.y + b.h / 2, `LEVEL ${b.level} OPEN!`, '#ffe27a');
    ticker('Resort Development', `${name} is open for guests.`, 'money');
    sfx.tada();
    ui.set({ simTick: ui.get().simTick + 1 });
  }
}

/* ---------------- ambient facility traffic ---------------- */
let facilityActivitySeq = 0;

function spawnFacilityActivity() {
  const activeIds = new Set(S.facilityActivities.map((activity) => activity.facilityId));
  const candidates = S.buildings.filter(
    (building) => (building.kind === 'airstrip' || building.kind === 'marina') && facilityOperational(building) && !activeIds.has(building.id)
  );
  if (!candidates.length) {
    S.nextFacilityActivity = 2.5;
    return;
  }
  const facility = pick(candidates);
  const direction: 1 | -1 = facility.x + facility.w / 2 >= W / 2 ? 1 : -1;
  const sequence = ++facilityActivitySeq;
  const kind: FacilityActivity['kind'] = facility.kind === 'marina' ? 'marina-boat' : sequence & 1 ? 'plane-arrival' : 'plane-departure';
  S.facilityActivities.push({
    id: sequence,
    facilityId: facility.id,
    kind,
    age: 0,
    duration: kind === 'marina-boat' ? 13 : kind === 'plane-arrival' ? 15 : 13,
    direction,
  });
  S.nextFacilityActivity = facility.kind === 'airstrip' ? rand(8, 14) : rand(5, 10);
}

function updateFacilityActivities(dtw: number) {
  const facilityIds = new Set(S.buildings.filter(facilityOperational).map((building) => building.id));
  for (let i = S.facilityActivities.length - 1; i >= 0; i--) {
    const activity = S.facilityActivities[i];
    activity.age += dtw;
    if (activity.age >= activity.duration || !facilityIds.has(activity.facilityId)) S.facilityActivities.splice(i, 1);
  }
  S.nextFacilityActivity -= dtw;
  if (S.nextFacilityActivity <= 0 && S.facilityActivities.length < 3) spawnFacilityActivity();
}

/* ---------------- per-frame update (no draw) ---------------- */
let propertyIncomeAcc = 0;
let wagesAcc = 0;
let upkeepAcc = 0;
function resetOperatingAccruals() {
  propertyIncomeAcc = 0;
  wagesAcc = 0;
  upkeepAcc = 0;
}
function accrueIncome(dtw: number) {
  // Keep each stream separate so the Financial Report shows actual revenue and
  // expenses while retaining the game's integer-dollar bank accounting.
  propertyIncomeAcc += passiveIncomePerSec() * dtw;
  wagesAcc += empWagesPerSec() * dtw;
  upkeepAcc += facilityMaintenancePerSec() * dtw;
  let changed = false;
  const property = Math.floor(propertyIncomeAcc);
  if (property > 0) {
    propertyIncomeAcc -= property;
    S.cash += property;
    recordFinance(property, 'property', 'Homes and resort property');
    changed = true;
  }
  const payExpense = (amount: number, category: 'wages' | 'upkeep', detail: string) => {
    if (amount <= 0) return;
    const paid = Math.min(S.cash, amount);
    if (paid <= 0) return;
    S.cash -= paid;
    recordFinance(-paid, category, detail);
    changed = true;
  };
  const wages = Math.floor(wagesAcc);
  if (wages > 0) {
    wagesAcc -= wages;
    payExpense(wages, 'wages', 'Staff payroll');
  }
  const upkeep = Math.floor(upkeepAcc);
  if (upkeep > 0) {
    upkeepAcc -= upkeep;
    payExpense(upkeep, 'upkeep', 'Facility maintenance');
  }
  if (changed) updateTopbar();
}
let saveAcc = 0;
let tickAcc = 0;
let historyAcc = 0;
let nextBird = rand(8, 20);
export function update(dt: number) {
  const currentModal = ui.get().modal;
  const initialSetup = currentModal?.kind === 'newCourse' && !!currentModal.initial;
  const dtw = initialSetup ? 0 : dt * S.speed;
  S.time += dt;
  if (dtw > 0) {
    updateSpawner(dtw);
    updateSpecialVisitors(dtw);
    updateProChallengeOffer(dtw);
    updateGolfers(dtw);
    updateLots(dtw);
    updateFacilityUpgrades(dtw);
    updateFacilityActivities(dtw);
    accrueIncome(dtw);
    updateTournament(dtw);
    nextBird -= dtw;
    if (nextBird <= 0 && S.holes.length) {
      nextBird = rand(14, 34);
      sfx.bird();
    }
  }
  updateGoals();
  updateBalls(dt);
  updateParts(dt);
  updateCamGlide(dt);
  tickAcc += dt;
  if (tickAcc >= 1) {
    tickAcc = 0;
    checkDestinationReleases();
    ui.set({ simTick: ui.get().simTick + 1 });
  }
  historyAcc += dt;
  if (historyAcc >= 20) {
    historyAcc = 0;
    S.history.push({ time: S.time, rep: S.rep, cash: S.cash, golfers: S.golfers.length });
    if (S.history.length > 80) S.history.shift();
  }
  saveAcc += dt;
  if (saveAcc >= 10 && !initialSetup) {
    saveAcc = 0;
    saveGame();
  }
}
