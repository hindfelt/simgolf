import {playerStorage,mountAccount,signedInAccount,accountRequest} from "./account.js";
import {createSharedClient} from "./shared-client.js";
import {coastalPreview} from './rendering/coastal-preview.js';
import {testingStorage,testingHref,mountTestingFeedback} from './ui/testing-mode.js';
import { settleCareerChallenge } from "./simulation/challenge-career.js";
import { originalChallengeOfferStakes } from "./simulation/pro-challenge.js";
import { inspectFacility } from "./ui/facility-inspector.js";
import { facilityContains } from "./simulation/facilities.js";
import { helicopterView } from "./rendering/helicopter.js";
import { shotPreview } from "./simulation/shot-preview.js";
import { greenFee, airstripFeeBonus } from "./simulation/happiness.js";
import { happinessSummary } from "./ui/happiness-summary.js";
import { buildOcean } from "./rendering/ocean.js";
import { renderHousingReport } from "./ui/housing-report.js";
import { facilityExtents } from "./simulation/facilities.js";
import {
  ENVIRONMENTS,
  availableInEnvironment,
} from "./simulation/environments.js";
import {
  LANDSCAPES,
  generateLandscape,
} from "./simulation/generated-landscape.js";
import { LAND_PRICES, ownedRows } from "./simulation/land-purchase.js";
import { staffUpgrade } from "./simulation/staff-upgrades.js";
import { staffCoverage } from "./rendering/staff-coverage.js";
import { isMotivated } from "./simulation/rangers.js";
import { ACCOMPLISHMENTS } from "./simulation/accomplishments.js";
import {
  ROSTER_OPPONENT_NAMES,
  originalProfessionalSkills,
  rosterOpponent,
} from "./simulation/roster-opponent.js";
import { analyzeShots } from "./simulation/shot-analysis.js";
import { analysisOverlay, ANALYSIS_COLORS } from "./rendering/shot-analysis.js";
import { classifyHole } from "./simulation/hole-classification.js";
import {
  courseCategory,
  effectiveProSkills,
} from "./simulation/course-category.js";
import { renderGuestRoster } from "./ui/guest-roster.js";
import { renderStoryReport } from "./ui/story-report.js";
import { storyGolfers } from "./stories/live.js";
import { golferRemarks } from "./ui/golfer-remarks.js";
import {
  createProChallenge,
  restoreProChallenge,
} from "./simulation/pro-challenge.js";
import { planShot } from "./simulation/shot-planner.js";
import {
  createCompetition,
  restoreCompetition,
} from "./simulation/competition.js";
import { exportGolfer, importGolfer } from "./simulation/golfer-package.js";
import { PALETTE_GROUPS, inPaletteGroup } from "./ui/construction-palette.js";
import { constructionIcon } from "./ui/construction-icons.js";
import {
  evaluationReport,
  EVALUATION_SKILLS,
} from "./simulation/evaluation.js";
import {
  exportCourse,
  importCourse,
  coursePractice,
} from "./simulation/course-package.js";
import {
  FACILITIES,
  isFacility,
  facilityRadius,
} from "./simulation/facilities.js";
import { skilledStaffUnlocked } from "./simulation/maintenance.js";
import { PRO_SKILLS } from "./simulation/pro-skills.js";
import { demolitionCheck, removalCheck } from "./simulation/course-edit.js";
import { TERRAIN, EXTRA_TERRAIN } from "./simulation/terrain.js";
import { createSession } from "./simulation/session.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildLandscape, height, setLandscapeState } from "./landscape.js";
import { buildClubhouse, buildBridge } from "./architecture.js";
import { buildFlora } from "./flora.js";
import { buildCourseView } from "./rendering/course.js";
import {
  createGame,
  getHole,
  canBuild,
  tile,
  serialize,
  restore,
  par,
  connected,
  shotLimit,
  isPutting,
} from "./simulation/game.js";
import { GRID, cellAt, center } from "./simulation/world.js";
import { RULES, TOOLS } from "./simulation/rules.js";
import "./play.css";

document.title = "Willow Brook · Golf Club";
document.body.innerHTML = `<main id="game">
<div id="world"></div>
<header class="club"><span class="crest">⚑</span><div><h1>Willow Brook <i>GC</i></h1><p id="club-detail">Your first hole</p></div></header>
<div class="accounts"><span id="cash"></span><span id="fun"></span></div>
<div class="top-actions"><button id="menu-button" aria-label="Club menu">☰ <span>Club menu</span></button><button id="home" aria-label="Show whole property">⌂</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button></div>
<div id="toast" role="status" aria-live="polite"></div>
<div id="person-label"></div>
<section class="console" aria-label="Course controls">
<nav id="modes" aria-label="Game modes">${[
  ["build", "⚑", "Build"],
  ["guests", "♙", "Golfers"],
  ["staff", "⚒", "Staff"],
  ["play", "⛳", "Play"],
  ["reports", "▤", "Reports"],
]
  .map(
    ([id, icon, label]) =>
      `<button data-mode="${id}"><b>${icon}</b>${label}</button>`,
  )
  .join("")}</nav>
<div class="control-body"><div class="headline"><div><small id="eyebrow">BUILD YOUR FIRST HOLE</small><h2 id="title">Start with a tee</h2></div><div class="time-controls"><button id="pause" aria-label="Pause simulation">Ⅱ</button><button id="speed" aria-label="Simulation speed">1×</button><button id="open-hole">Open hole · H</button></div></div><div class="hole-controls"><label>Hole <select id="hole-select" aria-label="Selected hole"></select></label><button id="add-hole">＋ Add hole</button><button id="scorecard">Scorecards</button><button id="edit-holes">Edit holes</button></div><div id="panel"></div><p id="hint"></p></div>
</section>
<dialog id="menu"><form method="dialog"><button class="close" aria-label="Close menu">×</button></form><h2>Willow Brook Golf Club</h2><p>Your course is saved automatically in this browser.</p><div class="menu-actions"><button id="new">New game</button><button id="save">Save now</button><button id="export">Export save</button><label class="button">Import save<input id="import" type="file" accept="application/json,.json" hidden></label><button id="world-screen">World properties</button><label>Course title <input id="course-title" maxlength="80" value="Willow Brook"></label><button id="export-course">Export course layout</button><button id="championship">Local championship</button><button id="pro-challenge">Pro challenge exhibition</button><button id="career-challenge" hidden>Challenge invitation</button><a id="resume-championship" hidden>Resume championship</a><label class="button">Import championship<input id="import-championship" type="file" accept=".json,application/json" hidden></label><label class="button">Practise an exported course<input id="import-course" type="file" accept="application/json,.json" hidden></label><a id="return-resort" href="./" hidden>Return to my resort</a></div><p id="save-status"></p><p class="muted">Course building, ordered rounds, maintenance and practice. Local championships are available. Invited pro challenges are available; SGA tournaments and full resort progression are still to come.</p></dialog>
<dialog id="new-dialog"><h2>Start a new game?</h2><p>Choose a landscape and preview its terrain before starting.</p><label>Environment <select id="new-environment" aria-label="Course environment"></select></label><p id="environment-summary"></p><label>Landscape <select id="new-landscape" aria-label="New course landscape"></select></label><label>Terrain seed <input id="new-seed" aria-label="Terrain seed" type="number" min="0" max="4294967295" step="1"></label><button id="reroll-landscape">New terrain</button><canvas id="landscape-preview" width="360" height="336" aria-label="New property terrain preview"></canvas><p id="landscape-summary"></p><p>Start fresh with an empty course, starting funds and a new career. Your current game is backed up in this browser; export it to keep a separate copy.</p><button id="cancel-new">Keep playing</button><button id="confirm-new">Start new game</button><button id="restore-previous" hidden>Restore previous course</button></dialog>
<dialog id="housing-dialog"><form method="dialog"><button class="close" aria-label="Close housing report">×</button></form><h2>Homes and building lots</h2><div id="housing-content"></div></dialog><dialog id="evaluation-dialog"><form method="dialog"><button class="close" aria-label="Close course report">×</button></form><h2>Course report</h2><p>Ratings and provisional classifications reflect completed visitor rounds. Practice is excluded. SGA accreditation is not yet available.</p><div id="evaluation-content"></div></dialog><dialog id="score-dialog"><form method="dialog"><button class="close" aria-label="Close scorecards">×</button></form><h2>Course scorecards</h2><div id="score-content"></div></dialog><dialog id="hole-editor"><form method="dialog"><button class="close" aria-label="Close hole editor">×</button></form><h2>Hole order</h2><p>New rounds follow this order. Booked rounds keep their route.</p><div id="hole-list"></div></dialog>
<dialog id="accomplishments-dialog"><form method="dialog"><button class="close" aria-label="Close accomplishments">×</button></form><h2>Professional accomplishments</h2><div id="accomplishments-content"></div></dialog><dialog id="skills-dialog"><form method="dialog"><button class="close" aria-label="Close pro skills">×</button></form><h2>Gary Golf · Skills</h2><p id="skill-points"></p><p id="course-skill-limit"></p><div id="skill-list"></div><div class="actions"><button id="export-golfer">Save golfer</button><label>Load golfer <input id="import-golfer" type="file" accept=".json,application/json"></label></div><p>Each point adds 10%. Finish practice before reallocating points.</p></dialog><dialog id="remove-dialog"><h2>Confirm removal</h2><p id="remove-description"></p><button id="cancel-removal">Keep it</button><button id="confirm-removal">Remove</button></dialog>
<dialog id="championship-setup"><form method="dialog"><button class="close" aria-label="Close championship setup">×</button></form><h2>Local championship</h2><p>Play this course against a simulated club professional. Your current golfer skills and course layout are fixed for the event. Your resort is saved separately.</p><label>Opponent <select id="championship-opponent" style="min-height:44px;max-width:100%"><option value="">Club professional</option></select></label><p id="opponent-profile"></p><label>Rounds <select id="championship-rounds"><option value="1">1 round</option><option value="2">2 rounds</option><option value="4">4 rounds</option></select></label><div id="challenge-terms" hidden><p>Exhibition stakes are recorded for this match; your resort balance stays unchanged. Original challenge invitations are not yet implemented.</p><label>Per hole $ <input id="challenge-hole-stake" type="number" min="0" max="1000000" step="1" value="${originalChallengeOfferStakes().perHole}"></label><label>Match $ <input id="challenge-match-stake" type="number" min="0" max="1000000" step="1" value="${originalChallengeOfferStakes().match}"></label></div><button id="start-championship">Start championship</button><p id="championship-error" role="status"></p></dialog><dialog id="standings-dialog"><form method="dialog"><button class="close" aria-label="Close standings">×</button></form><h2>Championship standings</h2><div id="standings-content"></div></dialog><dialog id="story-dialog"><form method="dialog"><button class="close" aria-label="Close stories">×</button></form><h2>Golfer stories</h2><div id="story-report-content"></div></dialog><dialog id="roster-dialog"><form method="dialog"><button class="close" aria-label="Close membership roster">×</button></form><h2>Membership roster</h2><div id="roster-content"></div></dialog><dialog id="shot-analysis-dialog"><form method="dialog"><button class="close" aria-label="Close shot analysis">×</button></form><h2>Shot analysis</h2><p>Three simulated outcomes per golfer, aimed toward the selected hole. Lines show one sample each. No money or strokes are spent.</p><div id="shot-analysis-content"></div></dialog><div id="loading">Preparing Willow Brook…</div></main>`;
const $ = (s) => document.querySelector(s);
async function restoreEvent(raw) {
  if (typeof raw !== "string" || raw.length > 64000000)
    throw Error("Invalid event save.");
  return JSON.parse(raw).format === "simgolf-reborn-pro-challenge"
    ? restoreProChallenge(raw)
    : restoreCompetition(raw);
}
const testing=new URLSearchParams(location.search).get('testing')==='1';
const playStorage=testingStorage(playerStorage(),testing);
if(testing&&!playStorage.getItem('simgolf-reborn.course.v1')){
 const original=playerStorage().getItem('simgolf-reborn.course.v1');
 if(original)playStorage.setItem('simgolf-reborn.course.v1',original);
}
const practiceId = new URLSearchParams(location.search).get("practice");
const championshipId = new URLSearchParams(location.search).get("championship");
let competition = null;
let coursePackage = null;
if (championshipId) {
  try {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(championshipId))
      throw Error("Invalid event reference.");
    competition = await restoreEvent(
      playStorage.getItem(`simgolf-reborn.championship.${championshipId}`),
    );
    if (competition.snapshot().id !== championshipId)
      throw Error("Event reference mismatch.");
    const ids = competition
      .snapshot()
      .standings.map((p) => p.id)
      .sort()
      .join(",");
    if (ids !== "club-rival,local-owner")
      throw Error(
        "This local screen requires a resident golfer and club rival.",
      );
    const record = JSON.parse(competition.save());
    coursePackage = (record.event ? JSON.parse(record.event) : record).config
      .course;
  } catch (error) {
    document.body.replaceChildren();
    const p = document.createElement("p"),
      a = document.createElement("a");
    p.textContent = `Could not resume championship: ${error.message}`;
    a.href = "./";
    a.textContent = "Return to resort";
    document.body.append(p, a);
    throw error;
  }
}
if (practiceId) {
  try {
    if (!/^[a-f0-9]{64}$/.test(practiceId))
      throw Error("Invalid course reference.");
    coursePackage = await importCourse(
      playStorage.getItem(`simgolf-reborn.package.${practiceId}`),
    );
    if (coursePackage.digest !== practiceId)
      throw Error("The saved course reference does not match.");
  } catch (error) {
    document.body.replaceChildren();
    const message = document.createElement("p"),
      back = document.createElement("a");
    message.textContent = `Could not open this practice course: ${error.message}`;
    back.href = "./";
    back.textContent = "Return to my resort";
    document.body.append(message, back);
    throw error;
  }
}
const sharedId=new URLSearchParams(location.search).get('shared');
let sharedSnapshot=null;
if(sharedId){
 try{
  if(testing||competition||coursePackage||!/^[-a-f0-9]{36}$/.test(sharedId))throw Error('Open shared courses separately from local practice and playtesting.');
  sharedSnapshot=await accountRequest('/api/courses/'+sharedId);
 }catch(error){document.body.textContent=error.message;throw error;}
}
const saveKey = competition
  ? `simgolf-reborn.championship.${championshipId}`
  : coursePackage
    ? `simgolf-reborn.practice.${practiceId}`
    : "simgolf-reborn.course.v1";
let game = competition
    ? competition.roundSnapshot("local-owner")
    : coursePackage
      ? coursePractice(coursePackage)
      : createGame(),
  saveAllowed = !sharedId,
  loadWarning = "";
try {
  const saved = sharedSnapshot ? JSON.stringify(sharedSnapshot.state) : competition ? null : playStorage.getItem(saveKey);
  if (saved) {
    const candidate = restore(saved);
    if (coursePackage) {
      const design = await exportCourse(candidate, coursePackage.content.title);
      if (
        candidate.courseDigest !== practiceId ||
        design.digest !== practiceId ||
        candidate.guests.length ||
        candidate.staff.length ||
        candidate.holes.some((h) => h.open)
      )
        throw Error("Practice state does not match the published layout.");
    }
    game = candidate;
  }
} catch (error) {
  if(sharedId){document.body.textContent='The shared course could not be read. Your server save has not been changed.';throw error;}
  saveAllowed = false;
  loadWarning =
    "The saved course could not be read. It has been kept intact. Import a valid save or start a new course from the club menu.";
}
let sharedRole=sharedSnapshot?.role;
const remote=sharedSnapshot?createSharedClient({snapshot:sharedSnapshot,actorId:signedInAccount().user.id,request:accountRequest,
 onSnapshot:course=>{
  game=restore(JSON.stringify(course.state));
  if(!getHole(game,selectedHoleId))selectedHoleId=game.holes[0].id;
  if(course.role!==sharedRole){
   sharedRole=course.role;
   if(course.role==='spectator'){
    pendingRemoval=null;landDialog.close();$('#hole-editor').close();$('#remove-dialog').close();
    setMode('guests');
   }else renderPanel();
  }
  refresh();
 },
 onStatus:message=>{$('#save-status').textContent=message;$('#shared-status').textContent=message;},
 onResult:(result,action)=>{
  toast(result.message||'Course updated.');
  if(result.ok&&action.type==='add-hole'){selectedHoleId=result.holeId;tool='tee';setMode('build');}
  if(result.ok&&action.type==='buy-land')purchaseHighlightUntil=performance.now()+10000;
  renderPanel();syncControls();refresh();
  if($('#hole-editor').open)renderHoleEditor();
 }
}):null;
const session = remote || createSession(game, { courseLocked: !!coursePackage });
if(testing){
 mountTestingFeedback({getSave:()=>competition?competition.save():serialize(game),storage:playStorage,
  startScenario:async()=>{
   const {createPlaytestCourse}=await import('./simulation/playtest-course.js');
   const raw=serialize(createPlaytestCourse());
   const key='simgolf-reborn.course.v1';
   const prior=playStorage.getItem(key);
   if(prior)playStorage.setItem(`${key}.previous`,prior);
   playStorage.setItem(key,raw);
   saveAllowed=false; // Do not let pagehide overwrite the newly prepared course.
   location.href='?testing=1';
  }});
 document.addEventListener('click',event=>{
  const a=event.target.closest?.('a');
  if(a&&a.id!=='testing-return'&&!a.download&&a.origin===location.origin&&!new URL(a.href).searchParams.has('shared'))a.href=testingHref(a.href,true);
 },true);
}else if(!sharedId){
 const link=document.createElement('a');link.href='?testing=1';link.textContent='Open playtesting copy';
 document.querySelector('.menu-actions').append(link);
}
let selectedHoleId = game.holes[0].id;
let selectedStaffId = null,
  movingStaff = false;
const selectedHole = () => getHole(game, selectedHoleId);
const localPlayer = Object.freeze(sharedSnapshot?{id:signedInAccount().user.id,role:sharedSnapshot.role}:{ id: "local-owner", role: "owner" });
function command(type, payload = {}) {
  if (competition) {
    const result = competition.execute(
      competition.nextCommand(localPlayer.id, type, payload),
      localPlayer,
    );
    game = competition.roundSnapshot(localPlayer.id);
    return result;
  }

  if (["build", "open-hole", "close-hole", "start-practice"].includes(type))
    payload = { ...payload, holeId: selectedHoleId };
  return session.execute(
    session.nextCommand(localPlayer.id, type, payload),
    localPlayer,
  );
}
let boundaryCorners = null;
let mode = coursePackage ? "play" : "build",
  tool = "inspect",
  paletteGroup = "all",
  brush = 1,
  buildingRotation = 0,
  placingStoryReward = false,
  pickingAnalysis = false,
  technique = "straight",
  paused = false,
  speed = 1,
  selected = null,
  toastUntil = 0;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x83917a);
scene.fog = new THREE.Fog(0x83917a, 185, 285);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  $("#loading").textContent =
    "This game needs WebGL. Open it in a browser with hardware acceleration enabled.";
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.domElement.setAttribute(
  "aria-label",
  "Golf course. Select a tool and click to build; drag in Inspect mode to pan.",
);
renderer.domElement.tabIndex = 0;
$("#world").append(renderer.domElement);
const camera = new THREE.OrthographicCamera(-65, 65, 45, -45, 0.1, 340);
camera.position.set(-52, 105, 124);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-2, 0, 1);
controls.enableRotate = false;
controls.screenSpacePanning = false;
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.panSpeed = 0.85;
controls.minZoom = 0.7;
controls.maxZoom = 3.8;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
scene.add(new THREE.HemisphereLight(0xe2ebdf, 0x6f7552, 1.65));
const sun = new THREE.DirectionalLight(0xffe4b2, 2.3);
sun.position.set(-48, 80, -38);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, {
  left: -88,
  right: 88,
  top: 88,
  bottom: -88,
  near: 1,
  far: 210,
});
sun.shadow.normalBias = 0.045;
sun.shadow.bias = -0.00006;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xc8d9e5, 0.4);
fill.position.set(50, 35, 80);
scene.add(fill);
setLandscapeState(coastalPreview(game));
const landscape = buildLandscape(scene, () => {});
buildClubhouse(scene).scale.setScalar(0.65);
const startingBridge = buildBridge(scene);
const flora = buildFlora(scene, { editableWater: true, coastal: game.landscapeStyle === "coast", environment: game.environment });
const ocean = buildOcean(scene);
ocean.update(coastalPreview(game));
const view = buildCourseView(scene);
const helicopter = helicopterView(scene, height);
const coverage = staffCoverage(scene, height);
let staffRangePreview = null;
const cursor = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({
    color: 0xffffb3,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  }),
);
cursor.renderOrder = 9;
cursor.visible = false;
scene.add(cursor);
const aiming = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineDashedMaterial({
    color: 0xffffdd,
    dashSize: 1.5,
    gapSize: 0.15,
    depthTest: false,
    depthWrite: false,
  }),
);
aiming.visible = false;
aiming.renderOrder = 8;
scene.add(aiming);
const aimTargetLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineDashedMaterial({
    color: 0x8be8bf,
    dashSize: 0.5,
    gapSize: 0.25,
    depthTest: false,
    depthWrite: false,
  }),
);
aimTargetLine.renderOrder = 10;
aimTargetLine.visible = false;
scene.add(aimTargetLine);
const shotOverlay = analysisOverlay(scene, height);
function propertyBoundaryPoints(startRow = 0) {
  const boundaryPoints = [];
  for (let x = GRID.minX; x <= GRID.minX + GRID.width * 2; x += 2)
    for (const z of [GRID.minZ + startRow * GRID.size, GRID.minZ + ownedRows(game) * 2])
      boundaryPoints.push(
        new THREE.Vector3(x, height(x, z) + 0.1, z),
        new THREE.Vector3(x + 1.2, height(x, z) + 0.1, z),
      );
  for (let z = GRID.minZ + startRow * GRID.size; z <= GRID.minZ + ownedRows(game) * 2; z += 2)
    for (const x of [GRID.minX, GRID.minX + GRID.width * 2])
      boundaryPoints.push(
        new THREE.Vector3(x, height(x, z) + 0.1, z),
        new THREE.Vector3(x, height(x, z) + 0.1, z + 1.2),
      );
  return boundaryPoints;
}
const boundary = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(propertyBoundaryPoints()),
  new THREE.LineBasicMaterial({
    color: 0xffed9b,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false,
  }),
);
boundary.renderOrder = 7;
scene.add(boundary);
const purchasedBoundary = new THREE.LineSegments(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0x73ff8b, depthTest: false, depthWrite: false }),
);
purchasedBoundary.renderOrder = 8;
purchasedBoundary.visible = false;
scene.add(purchasedBoundary);
let purchaseHighlightUntil = 0;
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  const width = innerWidth < 650 ? 67 : 118;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = (width * innerHeight) / innerWidth / 2;
  camera.bottom = -camera.top;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();
controls.update();
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastUntil = performance.now() + 5000;
}
function save() {
  if(remote){$("#save-status").textContent="Shared edits are saved by the server.";return false;}
  if (!saveAllowed) {
    toast(
      loadWarning || "Start a new course or import a valid save before saving.",
    );
    return false;
  }
  try {
    playStorage.setItem(
      saveKey,
      competition ? competition.save() : serialize(game),
    );
    $("#save-status").textContent =
      `Saved at ${new Date().toLocaleTimeString()}.`;
    return true;
  } catch (error) {
    $("#save-status").textContent =
      "Saving failed. Export your course to keep a copy.";
    toast(
      "This browser could not save the course. Use Export save in the club menu.",
    );
    return false;
  }
}
const names = {
  raise: "Raise land",
  lower: "Lower land",
  "rotate-tee": "Rotate tee",
  bridge: "Bridge",
  "out-of-bounds": "Out of bounds",
  "clear-boundary": "Clear stakes",
  "tennis-court": "Tennis Court",
  "swim-club": "Swim Club",
  "building-lot": "Building Lot",
  marina: "Marina",
  church: "Church",
  lighthouse: "Lighthouse",
  helipad: "Helipad",
  airstrip: "Airstrip",
  stable: "Stable",
  spa: "Spa",
  ballwasher: "Ballwasher",
  flowerbed: "Flowerbed",
  hotel: "Resort Hotel",
  "cart-garage": "Cart Garage",
  tree: "Tree",
  ...Object.fromEntries(EXTRA_TERRAIN.map((t) => [t, TERRAIN[t].name])),
  inspect: "Inspect / pan",
  tee: "Tee",
  demolish: "Remove",
  green: "Green",
  cup: "Move cup",
  "trim-green": "Trim green",
  fairway: "Fairway",
  firm: "Firm fairway",
  sand: "Bunker",
  water: "Water",
  path: "Path",
  rough: "Restore rough",
  bench: "Bench",
  snack: "Snack bar",
  "pro-shop": "Pro Shop",
  "driving-range": "Driving Range",
  "putting-green": "Putting Green",
};
function setMode(next) {
  if(remote?.role==='spectator'&&['build','staff','play'].includes(next))next='guests';
  if(remote&&next==="play"){toast("Shared golf rounds are not available yet.");return;}
  mode = next;
  boundaryCorners = null;
  pickingAnalysis = false;
  shotOverlay.clear();
  movingStaff = false;
  tool = "inspect";
  cursor.visible = aiming.visible = aimTargetLine.visible = false;
  syncControls();
  renderPanel();
}
let spacePanning = false;
function syncControls() {
  staffRangePreview = null;
  $("#panel").classList.toggle(
    "staff-placing",
    mode === "staff" && movingStaff,
  );
  const placing =
    pickingAnalysis ||
    (mode === "build" && tool !== "inspect") ||
    mode === "play" ||
    (mode === "staff" && movingStaff);
  controls.mouseButtons.LEFT = placing && !spacePanning ? null : THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = mode === "build" && remote?.role!=='spectator' ? null : THREE.MOUSE.PAN;
  controls.touches.ONE = placing ? null : THREE.TOUCH.PAN;
  renderer.domElement.style.cursor = placing && !spacePanning ? "crosshair" : "grab";
  boundary.visible = mode === "build";
}
let pendingRemoval = null;
function confirmRemoval(type, payload, message) {
  pendingRemoval = session.nextCommand(localPlayer.id, type, payload);
  $("#remove-description").textContent = message + " No refund is applied.";
  $("#remove-dialog").showModal();
}
$("#cancel-removal").onclick = () => {
  pendingRemoval = null;
  $("#remove-dialog").close();
};
$("#confirm-removal").onclick = () => {
  if (!pendingRemoval) return;
  const result = session.execute(pendingRemoval, localPlayer);
  pendingRemoval = null;
  $("#remove-dialog").close();
  toast(result.message);
  if (!getHole(game, selectedHoleId)) selectedHoleId = game.holes[0].id;
  refresh();
  if ($("#hole-editor").open) renderHoleEditor();
  save();
};
function renderHoleEditor() {
  const list = $("#hole-list");
  list.replaceChildren();
  game.holes.forEach((hole, index) => {
    const row = document.createElement("div");
    row.className = "hole-row";
    const label = document.createElement("span");
    label.textContent = `Hole ${index + 1} · ${hole.open ? "Open" : "Closed"}`;
    row.append(label);
    for (const [text, direction] of [
      ["↑", -1],
      ["↓", 1],
    ]) {
      const button = document.createElement("button");
      button.textContent = text;
      button.setAttribute(
        "aria-label",
        `Move hole ${index + 1} ${direction < 0 ? "earlier" : "later"}`,
      );
      button.disabled =
        index + direction < 0 || index + direction >= game.holes.length;
      button.onclick = () => {
        const ids = game.holes.map((h) => h.id);
        [ids[index], ids[index + direction]] = [
          ids[index + direction],
          ids[index],
        ];
        toast(command("reorder-holes", { holeIds: ids }).message);
        refresh();
        renderHoleEditor();
        save();
      };
      row.append(button);
    }
    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove hole ${index + 1}`);
    remove.onclick = () => {
      const check = removalCheck(game, hole.id);
      if (check.ok)
        confirmRemoval("remove-hole", { holeId: hole.id }, check.message);
      else toast(check.message);
    };
    row.append(remove);
    list.append(row);
  });
}
$("#edit-holes").onclick = () => {
  renderHoleEditor();
  $("#hole-editor").showModal();
};
$("#hole-select").onchange = (e) => {
  selectedHoleId = e.target.value;
  renderPanel();
  const h = selectedHole();
  if (h.tee) focus(h.tee, 1);
};
$("#add-hole").onclick = () => {
  const result = command("add-hole");
  toast(result.message);
  if (result.ok) {
    selectedHoleId = result.holeId;
    setMode("build");
    tool = "tee";
    syncControls();
    renderPanel();
    save();
  }
};
$("#scorecard").onclick = () => {
  const content = $("#score-content");
  content.replaceChildren();
  const summaries = [
    ...game.guests,
    ...(game.pro ? [game.pro] : []),
    ...game.rounds.filter(
      (r) =>
        !game.guests.some((v) => v.roundId === r.id) &&
        game.pro?.roundId !== r.id,
    ),
  ];
  if (!summaries.length) {
    const p = document.createElement("p");
    p.textContent = "No rounds yet. Open your course or play a practice round.";
    content.append(p);
  }
  for (const round of summaries) {
    const heading = document.createElement("h3");
    heading.textContent = `${round.name}${round.pro ? " · Practice" : ""} · ${round.totalStrokes} strokes`;
    content.append(heading);
    const table = document.createElement("table"),
      header = document.createElement("tr");
    for (const label of ["Hole", "Par", "Strokes", "Fee"]) {
      const th = document.createElement("th");
      th.textContent = label;
      header.append(th);
    }
    table.append(header);
    const rowIds = round.itinerary || round.scorecard.map((s) => s.holeId);
    for (const [index, id] of rowIds.entries()) {
      const score = round.scorecard.find((s) => s.holeId === id);
      const h = getHole(game, id);
      const row = document.createElement("tr");
      for (const value of [
        score?.number ?? round.holeNumbers[index],
        score?.par ?? par(game, id),
        score?.strokes ?? "—",
        score
          ? `$${score.fee}${score.airstripBonus ? ` (includes $${score.airstripBonus} Airstrip bonus)` : ""}`
          : "—",
      ]) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      }
      table.append(row);
    }
    content.append(table);
  }
  $("#score-dialog").showModal();
};

function renderProSkills() {
  const profile = game.proProfile,
    category = courseCategory(game),
    effective = effectiveProSkills(game, profile);
  const remaining =
    profile.points - Object.values(profile.skills).reduce((a, b) => a + b, 0);
  const locked = !!competition || (game.pro && game.pro.phase !== "finished");
  $("#import-golfer").disabled = !!locked;
  $("#export-golfer").onclick = () => {
    const a = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(exportGolfer(game), null, 2)], {
          type: "application/json",
        }),
      );
    a.href = url;
    a.download = "gary-golf.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $("#import-golfer").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 8192) throw Error("Golfer file is too large.");
      const golfer = importGolfer(await file.text());
      toast(command("load-golfer", { golfer }).message);
      save();
      renderProSkills();
    } catch (error) {
      toast(error.message);
    } finally {
      e.target.value = "";
    }
  };
  $("#skill-points").textContent = `${remaining} skill points available`;
  $("#course-skill-limit").textContent =
    `${category.name} · ${category.holes} completed holes · ${Number.isFinite(category.skillCap) ? `${category.skillCap * 10}% maximum per skill` : "No course skill cap"}.`;

  $("#skill-list").innerHTML = Object.entries(PRO_SKILLS)
    .map(
      ([id, name]) =>
        `<div class="pro-skill-row"><span>${name}</span><button data-skill="${id}" data-delta="-1" aria-label="Decrease ${name}" ${locked || !profile.skills[id] ? "disabled" : ""}>−</button><output>${effective[id] * 10}%${effective[id] < profile.skills[id] ? ` (${profile.skills[id] * 10}% saved)` : ""}</output><button data-skill="${id}" data-delta="1" aria-label="Increase ${name}" ${locked || !remaining || profile.skills[id] >= Math.min(10, category.skillCap) ? "disabled" : ""}>+</button></div>`,
    )
    .join("");
  $("#skill-list")
    .querySelectorAll("button")
    .forEach(
      (button) =>
        (button.onclick = () => {
          toast(
            command("allocate-pro-skill", {
              skill: button.dataset.skill,
              delta: Number(button.dataset.delta),
            }).message,
          );
          renderProSkills();
          save();
        }),
    );
}
function renderPanel() {
  if(remote?.role==='spectator'&&['build','staff','play'].includes(mode))mode='guests';
  view.previewFacility(null);
  $("#modes")
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  const panel = $("#panel");
  if (mode === "build") {
    panel.innerHTML = `<div class="palette-header"><div class="palette-groups" role="group" aria-label="Construction category">${Object.entries(
      PALETTE_GROUPS,
    )
      .map(
        ([id, label]) =>
          `<button data-palette="${id}" aria-pressed="${paletteGroup === id}" class="${paletteGroup === id ? "active" : ""}">${label}</button>`,
      )
      .join(
        "",
      )}</div><div class="construction-settings"><button id="boundary-outline">Outline OB region</button><button id="finish-boundary" ${boundaryCorners ? "" : "hidden"}>Finish region</button><button id="cancel-boundary" ${boundaryCorners ? "" : "hidden"}>Cancel region</button><button id="buy-land">Buy land</button><span id="land-status" role="status"></span><label class="brush">Brush<select id="brush"><option value="1">1 tile</option><option value="3">3 × 3</option><option value="5">5 × 5</option></select></label><label class="brush">Building direction<select id="building-rotation"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label></div></div><div class="tools" role="group" aria-label="Construction tools">${[
      ...TOOLS,
      "demolish",
    ]
      .filter(
        (t) =>
          inPaletteGroup(t, paletteGroup) && availableInEnvironment(game, t),
      )
      .map(
        (t) =>
          `<button data-tool="${t}" aria-pressed="${tool === t}" class="${tool === t ? "active" : ""}"><b class="construction-icon">${constructionIcon(t)}</b><span>${names[t]}</span></button>`,
      )
      .join("")}</div>`;
    panel.querySelectorAll("[data-palette]").forEach(
      (button) =>
        (button.onclick = () => {
          paletteGroup = button.dataset.palette;
          if (!inPaletteGroup(tool, paletteGroup)) {
            tool = "inspect";
            syncControls();
            cursor.visible = false;
          }
          renderPanel();
          refresh();
          panel.querySelector(`[data-palette="${paletteGroup}"]`).focus();
        }),
    );
    $("#boundary-outline").onclick = () => { boundaryCorners = []; tool = "out-of-bounds"; syncControls(); renderPanel(); toast("Click corners around the excluded area, then Finish region. $5 per newly marked tile."); };
    $("#finish-boundary").onclick = () => {
      const result = command("build-boundary-region", { points: boundaryCorners, holeId: selectedHoleId });
      toast(result.message);
      if(result.ok){boundaryCorners=null;tool="inspect";syncControls();renderPanel();save();}
    };
    $("#cancel-boundary").onclick = () => {boundaryCorners=null;tool="inspect";syncControls();renderPanel();};
    $("#buy-land").onclick = showLandPurchase;
    $("#building-rotation").value = String(buildingRotation);
    $("#building-rotation").onchange = (e) => {
      buildingRotation = Number(e.target.value);
    };
    $("#brush").value = String(brush);
    $("#brush").onchange = (e) => {
      brush = Number(e.target.value);
    };
    panel.querySelectorAll("[data-tool]").forEach(
      (b) =>
        (b.onclick = () => {
          boundaryCorners = null;
          placingStoryReward = false;
          pickingAnalysis = false;
          shotOverlay.clear();
          if (b.dataset.tool === "tee" && selectedHole().open) {
            const unfinished = game.holes.find((hole) => !hole.tee || !hole.green);
            if (unfinished) {
              selectedHoleId = unfinished.id;
              toast(`Continue hole ${game.holes.indexOf(unfinished) + 1}: place its tee and green.`);
            } else {
              const result = command("add-hole");
              toast(result.message);
              if (!result.ok) return;
              selectedHoleId = result.holeId;
              save();
            }
          }
          tool = b.dataset.tool;
          syncControls();
          renderPanel();
        }),
    );
  } else if (mode === "play") {
    panel.innerHTML = `<div class="actions"><button id="standings" ${competition ? "" : "hidden"}>Standings</button><button id="find-rival" ${competition ? "" : "hidden"}>Find opponent</button><button id="pro-skills">Pro skills</button><button id="wash-ball">Clean ball</button><button id="practice">${game.pro && game.pro.phase !== "finished" ? "Follow Gary" : "Play a practice hole"}</button>${["straight", "draw", "fade", "backspin", "punch"].map((t) => `<button data-shot="${t}" class="${technique === t ? "active" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div><p id="live-details"></p>`;
    $("#standings").onclick = showStandings;
    $("#find-rival").onclick = () => {
      const rival = competition?.roundSnapshot("club-rival").pro;
      if (rival) {
        focus(rival.pos, 1.6);
        toast(`${rival.name} has the yellow ball. You still control Gary.`);
      }
    };
    $("#wash-ball").onclick = () => {
      toast(command("use-ballwasher").message);
      save();
      refresh();
    };
    $("#pro-skills").onclick = () => {
      renderProSkills();
      $("#skills-dialog").showModal();
    };
    $("#practice").onclick = () => {
      if (!game.pro || game.pro.phase === "finished")
        toast(command("start-practice").message);
      if (game.pro) focus(game.pro.pos, 1.6);
    };
    panel.querySelectorAll("[data-shot]").forEach(
      (b) =>
        (b.onclick = () => {
          technique = b.dataset.shot;
          renderPanel();
        }),
    );
  } else if (mode === "staff") {
    panel.innerHTML = `<div class="actions"><button id="hire">Hire groundskeeper · $${RULES.hireCost}</button><button id="hire-technician" ${skilledStaffUnlocked(game) ? "" : "disabled"}>Hire Turf Technician · $${RULES.technicianHireCost}</button><button id="hire-marshall" ${skilledStaffUnlocked(game) ? "" : "disabled"}>Hire Marshall · $${RULES.marshallHireCost}</button><button id="hire-consultant" ${skilledStaffUnlocked(game) ? "" : "disabled"}>Hire Refreshment Consultant · $${RULES.consultantHireCost}</button><button id="hire-celebrity" ${skilledStaffUnlocked(game) ? "" : "disabled"}>Hire Celebrity · $${RULES.celebrityHireCost}</button><button id="hire-club-pro">Hire Club Pro · $${RULES.clubProHireCost}</button><button id="hire-ranger">Hire Ranger · $${RULES.rangerHireCost}</button><button id="hire-vendor">Hire Soda Vendor · $${RULES.vendorHireCost}</button><span>Wages: Marshall $${RULES.marshallWage} · consultant $${RULES.consultantWage} · celebrity $${RULES.celebrityWage} · club pro $${RULES.clubProWage} · ranger $${RULES.rangerWage} · vendor $${RULES.vendorWage} · groundskeeper $${RULES.wage} · technician $${RULES.technicianWage} per minute. Skilled employees unlock at six completed holes. Send Rangers near busy tees to speed up play. Club Pros welcome nearby golfers; Celebrities give a stronger welcome.</span></div><div class="actions"><label>Employee <select id="staff-select" aria-label="Selected employee"></select></label><button id="staff-follow">Find employee</button><button id="staff-move">Send to area</button><button id="staff-upgrade">Upgrade</button><button id="staff-dismiss">Dismiss</button><form id="staff-rename-form"><input id="staff-name" aria-label="Employee name" maxlength="40" required><button>Rename</button></form></div><div id="live-details"></div>`;
    $("#staff-select").onchange = (e) => {
      selectedStaffId = Number(e.target.value);
      movingStaff = false;
      syncControls();
      updateStaffControls(true);
    };
    $("#staff-follow").onclick = () => {
      const s = game.staff.find((s) => s.id === selectedStaffId);
      if (s) focus(s.pos, 1.8);
    };
    $("#staff-move").onclick = () => {
      movingStaff = !movingStaff;
      syncControls();
      refresh();
    };
    $("#staff-upgrade").onclick = () => {
      toast(command("upgrade-staff", { staffId: selectedStaffId }).message);
      updateStaffControls(true);
      save();
    };
    $("#staff-dismiss").onclick = () => {
      const s = game.staff.find((s) => s.id === selectedStaffId);
      if (s)
        confirmRemoval(
          "dismiss-staff",
          { staffId: s.id },
          `Dismiss ${s.name}? Their unfinished job will be released and future wages will stop.`,
        );
    };
    $("#staff-rename-form").onsubmit = (e) => {
      e.preventDefault();
      toast(
        command("rename-staff", {
          staffId: selectedStaffId,
          name: $("#staff-name").value,
        }).message,
      );
      updateStaffControls(true);
      save();
    };
    $("#hire-marshall").onclick = () => {
      toast(command("hire-marshall").message);
      save();
    };
    $("#hire-consultant").onclick = () => {
      toast(command("hire-consultant").message);
      save();
    };
    $("#hire-celebrity").onclick = () => {
      toast(command("hire-celebrity").message);
      save();
    };
    $("#hire-club-pro").onclick = () => {
      toast(command("hire-club-pro").message);
      save();
    };
    $("#hire-ranger").onclick = () => {
      toast(command("hire-ranger").message);
      save();
    };
    $("#hire-vendor").onclick = () => {
      toast(command("hire-vendor").message);
      save();
    };
    $("#hire-technician").onclick = () => {
      toast(command("hire-technician").message);
      save();
    };
    $("#hire").onclick = () => {
      toast(command("hire").message);
      save();
    };
  } else if (mode === "guests") {
    panel.innerHTML =
      '<div id="guest-list" class="guest-list"></div><div id="live-details"></div>';
  } else {
    panel.innerHTML =
      '<div class="actions"><button id="course-report">Course report</button><button id="housing-report">Homes and building lots</button><button id="accomplishments-report">Professional accomplishments · F10</button><button id="story-report">Golfer stories</button><button id="roster-report">Membership roster · F9</button><button id="shot-analysis">Shot analysis · /</button></div><div id="live-details"></div>';
    $("#housing-report").onclick = () => {
      renderHousingReport($("#housing-content"), game);
      $("#housing-dialog").showModal();
    };
    $("#roster-report").onclick = showRoster;
    $("#accomplishments-report").onclick = showAccomplishments;
    $("#shot-analysis").onclick = beginShotAnalysis;
    $("#story-report").onclick = () => {
      renderStoryReport($("#story-report-content"), game, () => {
        $("#story-dialog").close();
        setMode("build");
        tool = "flowerbed";
        placingStoryReward = true;
        syncControls();
        renderPanel();
        toast(
          "Choose a location for your free commemorative garden. Escape cancels.",
        );
      });
      $("#story-dialog").showModal();
    };
    $("#course-report").onclick = () => {
      renderEvaluation();
      $("#evaluation-dialog").showModal();
    };
  }
  refresh();
}
function renderEvaluation() {
  const root = $("#evaluation-content");
  root.replaceChildren();
  const number = (v) => (v === null ? "—" : v.toFixed(2));
  const addTable = (parent, heads, rows) => {
    const table = document.createElement("table"),
      head = document.createElement("tr");
    for (const label of heads) {
      const th = document.createElement("th");
      th.textContent = label;
      head.append(th);
    }
    table.append(head);
    for (const values of rows) {
      const tr = document.createElement("tr");
      for (const value of values) {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      table.append(tr);
    }
    parent.append(table);
  };
  const funReports = game.holes
    .map(evaluationReport)
    .filter((r) => r.fun !== null);
  const funSummary = document.createElement("p");
  funSummary.id = "course-fun-rating";
  funSummary.textContent = funReports.length
    ? `Course fun: ${Math.round(funReports.reduce((sum, r) => sum + r.fun, 0) * 100)}% · ${funReports.length} of ${game.holes.length} holes observed`
    : "Course fun: awaiting completed visitor holes";
  $("#evaluation-content").append(funSummary);
  for (const [index, hole] of game.holes.entries()) {
    const report = evaluationReport(hole, {par: par(game, hole.id), difficulty: 1, combineContrasts: false}),
      section = document.createElement("section"),
      heading = document.createElement("h3"),
      summary = document.createElement("p");
    const classification = classifyHole(report);
    heading.textContent = `Hole ${index + 1} · Par ${par(game, hole.id)} · ${classification.name || "Unclassified"}`;
    const classificationNote = document.createElement("p");
    classificationNote.className = "classification-note";
    classificationNote.textContent = classification.reason;
    summary.textContent = `Fun ${report.fun === null ? "not yet observed" : `${Math.round(report.fun * 100)}% (${report.funCount} samples)`} · ${hole.stats.completed} completed · ${number(hole.stats.completed ? hole.stats.strokes / hole.stats.completed : null)} average strokes · $${hole.stats.fees} fees. ${report.count} observed rounds${report.seconds === null ? "" : ` · ${Math.round(report.seconds)}s average first shot to completion · ${Math.round(report.mood)} average finishing mood`}.`;
    section.append(heading, classificationNote, summary);
    addTable(
      section,
      ["Skill", "With: avg / n", "Without: avg / n", "Rating"],
      report.skills.map((r) => [
        r.skill[0].toUpperCase() + r.skill.slice(1),
        `${number(r.withSkill.score)} / ${r.withSkill.count}`,
        `${number(r.without.score)} / ${r.without.count}`,
        number(r.advantage),
      ]),
    );
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent =
      "Ratings compare golfers missing one skill against golfers with all three. Each group starts with eight par scores; scores above nine count as nine. Older rounds without individual scores are excluded from ratings. With/without averages show all recorded rounds.";
    section.append(note);
    const detail = document.createElement("details"),
      label = document.createElement("summary");
    label.textContent = "Inspect golfer groups";
    detail.append(label);
    addTable(
      detail,
      ["Skills", "Training", "n", "Avg strokes"],
      report.cohorts.map((r) => [
        EVALUATION_SKILLS.filter((k, i) => r.mask & (1 << i)).join(", ") ||
          "None",
        EVALUATION_SKILLS.filter((k, i) => r.mask & (1 << (i + 3))).join(
          ", ",
        ) || "None",
        r.count,
        number(r.strokes / r.count),
      ]),
    );
    section.append(detail);
    root.append(section);
  }
}
function updateStaffControls(force = false) {
  const select = $("#staff-select");
  if (!select) return;
  const signature = JSON.stringify(game.staff.map((s) => [s.id, s.name]));
  const changed = signature !== select.dataset.signature;
  if (changed) {
    select.dataset.signature = signature;
    select.replaceChildren(
      ...game.staff.map((s) => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.name;
        return o;
      }),
    );
  }
  if (!game.staff.some((s) => s.id === selectedStaffId)) {
    selectedStaffId = game.staff[0]?.id ?? null;
    movingStaff = false;
    syncControls();
  }
  select.value = selectedStaffId ?? "";
  const employee = game.staff.find((s) => s.id === selectedStaffId);
  for (const id of [
    "#staff-follow",
    "#staff-move",
    "#staff-dismiss",
    "#staff-name",
  ])
    $(id).disabled = !employee;
  const upgrade = staffUpgrade(employee);
  $("#staff-upgrade").disabled =
    !upgrade || !skilledStaffUnlocked(game) || game.cash < upgrade.cost;
  $("#staff-upgrade").textContent = upgrade
    ? `Upgrade to ${upgrade.title} · $${upgrade.cost}`
    : "No upgrade available";
  $("#staff-rename-form button").disabled = !employee;
  if (force || changed) $("#staff-name").value = employee?.name || "";
  $("#staff-move").textContent = movingStaff
    ? "Cancel destination"
    : "Send to area";
}
function refresh() {
  const invitation=game.challengeCareer?.offer;
  $("#career-challenge").hidden=!!coursePackage || !invitation;
  $("#career-challenge").textContent=invitation?.status === "playing" ? "Resume invited challenge" : "Challenge invitation";
  $("#menu-button").classList.toggle("has-invitation",!coursePackage && invitation?.status === "offered");
  const landButton = $("#buy-land");
  if (landButton) {
    const parcels = game.landParcels || 0;
    const cost = LAND_PRICES[parcels];
    landButton.textContent = cost === undefined ? "All land owned" : `Buy land · $${cost.toLocaleString()}`;
    $("#land-status").textContent = cost === undefined
      ? "3 of 3 parcels purchased"
      : game.cash < cost
        ? `${parcels} of 3 parcels · Need $${Math.ceil(cost - game.cash).toLocaleString()} more`
        : `${parcels} of 3 parcels · 450 tiles available`;
  }

  for (const id of ["#open-hole", "#add-hole", "#edit-holes"])
    $(id).hidden = mode !== "build" || !!coursePackage || remote?.role==='spectator';
  if(remote)for(const id of ['build','staff'])$(`[data-mode="${id}"]`).hidden=remote.role==='spectator';
  if (coursePackage) {
    $("#cash").textContent = "Course practice";
    for (const id of [
      "#open-hole",
      "#add-hole",
      "#edit-holes",
      "#new",
      "#import",
      "#export",
    ]) {
      const el = $(id);
      (id === "#import" ? el.parentElement : el).hidden = true;
    }
    $("#return-resort").hidden = false;
    for (const id of ["build", "staff", "guests"])
      $(`[data-mode="${id}"]`).hidden = true;
  }
  const holeOptions = $("#hole-select");
  const signature = game.holes.map((h) => h.id + ":" + h.open).join(",");
  if (holeOptions.dataset.signature !== signature) {
    holeOptions.dataset.signature = signature;
    holeOptions.replaceChildren(
      ...game.holes.map((h, i) => {
        const o = document.createElement("option");
        o.value = h.id;
        o.textContent = `${i + 1}${h.open ? " · Open" : ""}`;
        return o;
      }),
    );
  }
  holeOptions.value = selectedHoleId;
  $("#add-hole").disabled = game.holes.length >= 18;

  $("#cash").textContent = coursePackage
    ? "Course practice"
    : `$${game.cash.toLocaleString()}  ◉`;
  $("#fun").textContent = coursePackage
    ? `Revision ${(practiceId || coursePackage.digest).slice(0, 8)}`
    : `${game.stats.rounds} rounds  ·  ${game.guests.length} guests`;
  if (!coursePackage)
    $(".club h1").textContent =
      sharedSnapshot?sharedSnapshot.name:`Willow Brook ${courseCategory(game).abbreviation}`;
  $("#club-detail").textContent =
    `${selectedHole().open ? `Hole ${game.holes.indexOf(selectedHole()) + 1} open` : selectedHole().tee && selectedHole().green ? `Hole ${game.holes.indexOf(selectedHole()) + 1} under construction` : "Your first hole"}${par(game, selectedHoleId) ? ` · Par ${par(game, selectedHoleId)}` : ""}`;
  if (coursePackage)
    $("#club-detail").textContent =
      `Practice · Hole ${game.holes.indexOf(selectedHole()) + 1} · Par ${par(game, selectedHoleId)}`;
  if (competition) {
    const state = competition.snapshot(),
      p = state.standings.find((p) => p.id === localPlayer.id);
    $("#cash").textContent =
      state.kind === "pro-challenge" ? "Pro challenge" : "Local championship";
    $("#fun").textContent =
      state.status === "complete"
        ? "Event complete"
        : `Round ${Math.min(state.rounds, p.roundsCompleted + 1)} / ${state.rounds}`;
    $("#club-detail").textContent =
      `${state.kind === "pro-challenge" ? "Challenge" : "Championship"} · Hole ${game.pro.holeNumbers[game.pro.holeIndex]}`;
    $("#championship").hidden = true;
    $("#pro-challenge").hidden = true;
    $("#export").hidden = false;
    $("#export").textContent = "Export championship";
    const practice = $("#practice");
    if (practice) practice.disabled = game.pro.phase === "finished";
  }
  $("#open-hole").textContent = selectedHole().open
    ? "Close hole · H"
    : "Open hole · H";
  $("#pause").textContent = paused ? "▶" : "Ⅱ";
  $("#pause").setAttribute(
    "aria-label",
    paused ? "Resume simulation" : "Pause simulation",
  );
  $("#speed").textContent = `${speed}×`;
  const titles = {
    build: !selectedHole().tee
      ? "Start with a tee"
      : !selectedHole().green
        ? "Give them a green to aim for"
        : selectedHole().open
          ? "Your course is open"
          : "Shape the journey to the cup",
    guests: "A course with character",
    staff: "Your course staff",
    play: competition
      ? competition.snapshot().status === "complete"
        ? competition.snapshot().kind === "pro-challenge"
          ? "Challenge complete"
          : "Championship complete"
        : competition.snapshot().kind === "pro-challenge"
          ? "Gary Golf plays the challenge"
          : "Gary Golf plays the championship"
      : game.pro?.phase === "finished"
        ? "Practice round complete"
        : game.pro && isPutting(game, game.pro)
          ? `${game.pro.name} reads the green`
          : `${game.pro?.name || "Gary Golf"} plays the course`,
    reports: "Life at Willow Brook",
  };
  $("#eyebrow").textContent = {
    build: "COURSE DESIGN",
    guests: "YOUR GOLFERS",
    staff: "STAFF",
    play: competition
      ? competition.snapshot().kind === "pro-challenge"
        ? "PRO CHALLENGE EXHIBITION"
        : "LOCAL CHAMPIONSHIP"
      : "PRACTICE ROUND",
    reports: "CLUB REPORT",
  }[mode];
  $("#title").textContent = titles[mode];
  $("#hint").textContent =
    mode === "build"
      ? tool === "inspect"
        ? "Inspect / pan: click a building for status. Space + drag to pan · right-click to remove · scroll or pinch to zoom · H opens the hole."
        : `${names[tool]} · ${RULES.costs[tool] ? `$${RULES.costs[tool]}${["tee", "green"].includes(tool) || isFacility(tool) ? " each" : " per tile"}` : "Free"} · Click to place${["fairway", "firm", "sand", "water", "path", "rough", ...EXTRA_TERRAIN].includes(tool) ? " or drag to paint" : ""}. Right-drag to pan; two fingers on touch.`
      : mode === "play"
        ? "Click a landing target when Gary is ready. Balls bounce and roll; putting is automatic on the green."
        : mode === "staff"
          ? "Groundskeepers clear weeds; Turf Technicians repair turf. Soda Vendors walk to thirsty golfers and serve drinks."
          : mode === "guests"
            ? "Select a golfer to follow their round. Fees are paid after finishing the hole."
            : "Progress saves in this browser. Export a copy from the club menu.";
  if (mode === "build" && tool === "green" && selectedHole().green)
    $("#hint").textContent =
      `Extend this green · $${RULES.costs.greenTile} per new tile · Choose a brush and paint adjoining turf. Move cup relocates the flag; Trim green cuts back the edge.`;
  if (mode === "build" && tool === "cup")
    $("#hint").textContent =
      "Move the cup within the selected hole’s green. Close the hole and let booked rounds finish first.";
  if (mode === "build" && tool === "trim-green")
    $("#hint").textContent =
      "Trim the selected green back to rough. The cup and one connected putting surface must remain.";
  if (mode === "build" && tool === "demolish")
    $("#hint").textContent =
      "Click a facility or painted tile to remove it. Tee/green removal removes that hole; confirmation is required. No refund.";
  if (
    mode === "build" &&
    [
      "raise",
      "lower",
      "rotate-tee",
      "bridge",
      "out-of-bounds",
      "clear-boundary",
    ].includes(tool)
  )
    $("#hint").textContent = {
      raise: "Raise land · Free · Click or brush to raise by half a level.",
      lower: "Lower land · Free · Click or brush to lower by half a level.",
      "rotate-tee":
        "Rotate tee · Click to turn the selected tee 45°. Close the hole first.",
      bridge:
        "Bridge · Place over water. Join the deck to paths on both banks.",
      "out-of-bounds":
        "White stakes · Drag to mark a continuous out-of-bounds area. White edges show its limits. One penalty stroke and a drop just outside the marked area.",
      "clear-boundary": "Clear stakes · Brush to return marked land to play.",
    }[tool];
  if (mode === "build" && tool === "path")
    $("#hint").textContent =
      "Path · $12 per tile · Connect to the clubhouse. Disconnected sections appear muddy; crossing water builds bridge decks.";
  if (mode === "build" && tool === "cart-garage")
    $("#hint").textContent =
      "Cart Garage · $2,000 · Connect to the clubhouse path. New visitors ride faster on paths and fairways.";
  if (mode === "build" && tool === "church")
    $("#hint").textContent = "Church · $4,500 · Links home-sale benefit. Connect to the clubhouse path for a 25% bonus; does not stack with Marina or Helipad.";
  if (mode === "build" && tool === "hotel")
    $("#hint").textContent =
      "Resort Hotel · $5,000 · Connect to the clubhouse path. New visitors arrive well rested and tire more slowly.";
  if (mode === "build" && tool === "flowerbed")
    $("#hint").textContent = placingStoryReward
      ? "Commemorative garden · Free story reward · Click to place beside a walking route. Escape or choose another tool to cancel."
      : "Flowerbed · $75 · Place beside walking routes to lift passing golfers’ spirits. No path connection needed.";
  if (mode === "build" && tool === "ballwasher")
    $("#hint").textContent =
      `Ballwasher · $${RULES.costs[tool]} · Connect to the clubhouse path. Visitors stop to clean their ball before teeing off; better accuracy lasts this hole.`;
  if (mode === "build" && tool === "building-lot")
    $("#hint").textContent = "Building Lot · $500 · Connect to the clubhouse path. Golfers who have completed a round can buy a home. Nearby water, trees and fun holes improve its value.";
  if (mode === "build" && ["marina", "helipad", "airstrip"].includes(tool))
    $("#hint").textContent =
      `${FACILITIES[tool].name} · $${RULES.costs[tool]} · ${tool === "marina" ? "7 × 5 tiles: landward building on dry land, docks over water. Rotate to match the shore." : tool === "airstrip" ? "31 × 7 tiles: runway, apron and hangar. A clubhouse path connection adds 25% to green fees." : "5 × 5 tiles: occasional helicopter visits, $200 per landing. One helicopter parks while its pair plays; visits are at least 10 simulation minutes apart after departure."} Connect a path to the landward entrance. ${tool === "airstrip" ? "" : "Connected buildings improve home-sale prices by 25%."}`;
  if (mode === "build" && FACILITIES[tool]?.recreation)
    $("#hint").textContent =
      `${FACILITIES[tool].name} · $${RULES.costs[tool]} · Connect an adjacent path to the clubhouse to improve incoming golfers’ starting attitude.`;
  if (mode === "build" && FACILITIES[tool]?.skill)
    $("#hint").textContent =
      `${FACILITIES[tool].name} · $${RULES.costs[tool]} · Connect an adjacent path to the clubhouse. Visitors improve existing ${FACILITIES[tool].skill} through a training visit.`;
  if (pickingAnalysis)
    $("#hint").textContent =
      "Shot analysis · Click playable ground to compare skills. Escape cancels.";
  const live = $("#live-details");
  if (!live) return;
  if (mode === "play") {
    const p = game.pro;
    const putting = p && p.phase !== "finished" && (p.shot ? p.shot.putt : isPutting(game, p));
    if (!p || p.phase !== "address" || putting)
      aiming.visible = aimTargetLine.visible = false;
    document.querySelectorAll("[data-shot]").forEach(button => {
      button.disabled = !!putting;
      button.title = putting ? "Putting is automatic" : "";
    });
    if (putting) $("#hint").textContent = "Putting is automatic. Gary reads the green and plays the putt.";
    live.textContent = p
      ? `${p.name} · Hole ${p.holeNumbers[p.holeIndex]} · ${TERRAIN[tile(game, cellAt(p.ball.x, p.ball.z).c, cellAt(p.ball.x, p.ball.z).r)]?.name || "Trouble"} · ${p.strokes} strokes · ${p.phase === "finished" ? "Finished!" : p.phase === "address" ? putting ? "Lining up an automatic putt" : `Ready — ${Math.round(shotLimit(game, p) * 4)} yd maximum carry` : p.phase === "shot" ? (p.ballHeight > 0.1 ? "Ball in flight" : "Ball rolling") : p.phase} · ${p.comment}`
      : "Practise the hole you built. Choose a shot shape, then aim on the course.";
  }
  if (mode === "staff") {
    updateStaffControls();
    if (movingStaff)
      $("#hint").textContent =
        "Click reachable ground to send this employee there. Their current job will be released; work resumes on arrival.";
    live.textContent = `${game.weeds.length} dandelion patches · ${game.stats.removed} cleared · ${Object.values(game.tiles).filter((t) => t.crabgrass).length} crabgrass patches · ${game.staff.length}/${RULES.staffLimit} employees. ${game.staff
      .filter((s) => s.id === selectedStaffId)
      .map(
        (s) =>
          `${s.name}: ${s.phase}${s.role === "marshall" ? ` · ${s.ejected || 0} golfers ejected` : ""} (${["club-pro", "celebrity"].includes(s.role) ? `${s.served} golfers welcomed` : ["ranger", "marshall"].includes(s.role) ? `${s.served} golfers motivated` : ["vendor", "consultant"].includes(s.role) ? `${s.served} drinks served` : `${s.removed} weeds cleared, ${s.repaired} divots repaired, ${s.crabgrassRemoved} crabgrass cleared`})`,
      )
      .join(" · ")}`;
  }
  if (mode === "guests") {
    const list = $("#guest-list"),
      signature = JSON.stringify(
        game.guests.map((p) => [p.id, p.name, isMotivated(game, p)]),
      );
    if (list.dataset.ids !== signature) {
      list.dataset.ids = signature;
      list.replaceChildren(
        ...game.guests.map((p) => {
          const b = document.createElement("button");
          b.textContent = p.name + (isMotivated(game, p) ? " !" : "");
          b.onclick = () => {
            selected = p.id;
            focus(p.pos, 1.8);
          };
          return b;
        }),
      );
    }
    const p = game.guests.find((p) => p.id === selected) || game.guests[0];
    live.textContent = p
      ? `${p.name} · Hole ${p.holeNumbers[p.holeIndex]} · ${TERRAIN[tile(game, cellAt(p.ball.x, p.ball.z).c, cellAt(p.ball.x, p.ball.z).r)]?.name || "Trouble"} · ${p.strokes} strokes · ${p.phase} · Happiness ${p.happiness} · Current green fee $${greenFee(p) + airstripFeeBonus(p, game.facilities.some(f => f.type === "airstrip" && connected(game,f)))} · Energy ${Math.round(p.energy)} · Hunger ${Math.round(p.hunger)} · Thirst ${Math.round(p.thirst)}. Training: ${
          Object.keys(p.trained || {})
            .filter((k) => p.trained[k])
            .join(", ") || "none"
        }. “${p.comment}” ${happinessSummary(p)}`
      : "No visitors yet. Open your completed hole to welcome the first pair.";
  }
  if (mode === "reports")
    live.textContent = `${game.stats.rounds} completed rounds · $${game.stats.fees} green fees · ${game.stats.holesCompleted ? (game.stats.strokes / game.stats.holesCompleted).toFixed(1) : "—"} average strokes per hole · ${game.stats.services} completed services. ${game.facilities.map((f) => `${FACILITIES[f.type]?.name || names[f.type]}: ${f.type === "home" ? "residential home" : f.type === "building-lot" ? (connected(game,f) ? "available home site" : "home site needs a clubhouse path") : FACILITIES[f.type]?.scenery ? "scenery for passing golfers" : `${connected(game, f) ? "connected" : "needs a path to the clubhouse"}, ${f.served} visits`}`).join(" · ")} ${game.events[0]?.text || ""}`;
}
function focus(p, zoom) {
  const delta = new THREE.Vector3(p.x, 0, p.z).sub(controls.target);
  camera.position.add(delta);
  controls.target.add(delta);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  controls.update();
}
$("#modes")
  .querySelectorAll("button")
  .forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
$("#pause").onclick = () => {
  paused = !paused;
  refresh();
};
$("#speed").onclick = () => {
  speed = speed === 1 ? 3 : 1;
  refresh();
};
$("#open-hole").onclick = () => {
  if (selectedHole().open) {
    toast(command("close-hole").message);
  } else toast(command("open-hole").message);
  refresh();
  save();
};
$("#home").onclick = () => focus({ x: -2, z: 1 }, 1);
$("#zoom-in").onclick = () => {
  camera.zoom = Math.min(3.8, camera.zoom * 1.25);
  camera.updateProjectionMatrix();
};
$("#zoom-out").onclick = () => {
  camera.zoom = Math.max(controls.minZoom, camera.zoom / 1.25);
  camera.updateProjectionMatrix();
};
$("#menu-button").onclick = () => $("#menu").showModal();
let worldScreen;
const landDialog = document.createElement("dialog");
landDialog.id = "land-purchase";
document.body.append(landDialog);
function showLandPurchase() {
  const parcel = game.landParcels || 0,
    cost = LAND_PRICES[parcel];
  if (cost !== undefined && game.cash < cost) {
    toast(`Not enough funds: this parcel costs $${cost.toLocaleString()}. You need $${Math.ceil(cost - game.cash).toLocaleString()} more.`);
    return;
  }
  landDialog.innerHTML = `<form method="dialog"><button class="close" aria-label="Close land purchase">×</button></form><h2>Expand your property</h2><p>${parcel} of 3 adjoining parcels purchased · ${ownedRows(game) * GRID.width} tiles owned</p><p>Each parcel adds 450 tiles along the southern boundary, with rolling hills, hollows and a pond. Extend your paths into the new land to reach your next holes.</p><p>${cost === undefined ? "You own all the adjoining land." : `Next parcel: $${cost.toLocaleString()} · Funds: $${Math.floor(game.cash).toLocaleString()}`}</p><button id="confirm-land" ${cost === undefined || game.cash < cost || competition || coursePackage ? "disabled" : ""}>Buy southern parcel${cost === undefined ? "" : ` · $${cost.toLocaleString()}`}</button>`;
  landDialog.querySelector("#confirm-land").onclick = () => {
    const start = ownedRows(game),
      result = command("buy-land");
    toast(result.message);
    if (result.ok) {
      const destination = new THREE.Vector3(
        1,
        0,
        GRID.minZ + (start + 5) * GRID.size,
      );
      focus(destination, 1);
      camera.updateMatrixWorld();
      let extent = 1;
      for (const x of [GRID.minX, GRID.minX + GRID.width * GRID.size]) {
        for (const z of [GRID.minZ + start * GRID.size, GRID.minZ + ownedRows(game) * GRID.size]) {
          const corner = new THREE.Vector3(x, height(x, z), z).project(camera);
          extent = Math.max(extent, Math.abs(corner.x), Math.abs(corner.y));
        }
      }
      camera.zoom = 0.65 / extent;
      controls.minZoom = Math.min(controls.minZoom, camera.zoom);
      camera.updateProjectionMatrix();
      purchasedBoundary.geometry.dispose();
      purchasedBoundary.geometry = new THREE.BufferGeometry().setFromPoints(propertyBoundaryPoints(start));
      purchaseHighlightUntil = performance.now() + 15000;
      purchasedBoundary.visible = true;
      toast("450 tiles purchased — new parcel outlined in green. Gold marks your property boundary.");
      toastUntil = purchaseHighlightUntil;
      save();
      landDialog.close();
    }
  };
  if (!landDialog.open) landDialog.showModal();
}
$("#world-screen").onclick = async () => {
  const { createWorldScreen } = await import("./ui/world-screen.js");
  worldScreen ??= createWorldScreen();
  $("#menu").close();
  if (!worldScreen.open) worldScreen.showModal();
};
$("#save").onclick = () => {
  if (save()) toast(competition ? "Championship saved." : "Course saved.");
};
$("#export").onclick = () => {
  const url = URL.createObjectURL(
      new Blob([competition ? competition.save() : serialize(game)], {
        type: "application/json",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = competition ? "championship.json" : "willow-brook-course.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function showStandings() {
  if (!competition) return;
  const state = competition.snapshot(),
    root = $("#standings-content");
  root.replaceChildren();
  const note = document.createElement("p");
  note.textContent =
    state.status === "complete"
      ? "Final results · Equal totals share a place."
      : "In progress · Totals cover completed holes only.";
  root.append(note);
  const table = document.createElement("table");
  const header = document.createElement("tr");
  for (const label of [
    "Place",
    "Golfer",
    "Rounds",
    "Holes",
    "Strokes",
    "To par",
  ]) {
    const th = document.createElement("th");
    th.textContent = label;
    header.append(th);
  }
  table.append(header);
  for (const p of state.standings) {
    const tr = document.createElement("tr");
    for (const value of [
      p.rank ?? "—",
      p.name,
      `${p.roundsCompleted}/${state.rounds}`,
      p.holesCompleted,
      p.strokes,
      p.relativeToPar > 0 ? `+${p.relativeToPar}` : p.relativeToPar,
    ]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.append(td);
    }
    table.append(tr);
  }
  root.append(table);
  $("#standings-dialog h2").textContent =
    state.kind === "pro-challenge"
      ? "Pro challenge results"
      : "Championship standings";
  if (state.kind === "pro-challenge") {
    const details = document.createElement("section");
    details.id = "challenge-results";
    const money = (n) =>
      (n < 0 ? "−" : n > 0 ? "+" : "") + "$" + Math.abs(n).toLocaleString();
    for (const h of state.holes) {
      const p = document.createElement("p");
      p.textContent = `Hole ${h.number}: Gary ${h.residentStrokes} · Rival ${h.challengerStrokes} · ${money(h.residentAmount)}`;
      details.append(p);
    }
    const total = document.createElement("p");
    total.textContent = `Match wager: ${state.matchAmount === null ? "pending" : money(state.matchAmount)} · Gary’s net: ${money(state.residentNet)}`;
    const note = document.createElement("p");
    let invited=false;
    try { const career=JSON.parse(playStorage.getItem("simgolf-reborn.course.v1"))?.challengeCareer;
      invited=career?.offer?.eventId===state.id || career?.results?.some(r=>r.eventId===state.id);
    } catch {}
    note.id="challenge-accounting";
    note.textContent = invited ? "Invited match. Completed wagers are recorded in your resort account; the match wager settles when the round is finished." : "Exhibition result. Resort balance unchanged.";
    if (invited) {
      const back=document.createElement("a");back.href="./";back.textContent="Return to resort";details.append(back);
    }
    details.append(total, note);
    root.append(details);
  }
  $("#standings-dialog").showModal();
}
const opponentSelect = $("#championship-opponent");
for (const name of ROSTER_OPPONENT_NAMES) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  opponentSelect.append(option);
}
opponentSelect.onchange = () => {
  if (!opponentSelect.value) {
    $("#opponent-profile").textContent = "";
    return;
  }
  const chosen = rosterOpponent(opponentSelect.value);
  $("#opponent-profile").textContent =
    "Professional skills · " +
    Object.entries(originalProfessionalSkills(chosen.professional))
      .filter(([, n]) => n > 0)
      .map(([key, n]) => PRO_SKILLS[key] + " " + n * 10 + "%")
      .join(" · ");
};
let eventKind = "championship";
function openEventSetup(kind) {
  eventKind = kind;
  const challenge = kind !== "championship";
  const invited = kind === "career-challenge";
  opponentSelect.disabled = invited;
  $("#challenge-hole-stake").disabled = invited;
  $("#challenge-match-stake").disabled = invited;
  $("#challenge-terms p").textContent = invited ? "An invited match: completed hole wagers update your resort account as you play. Finish the round to settle the match wager; win to advance the challenge ladder." : "Exhibition stakes are recorded for this match; your resort balance stays unchanged.";
  if (invited) {
    const offer=game.challengeCareer.offer;
    opponentSelect.value=offer.professional; opponentSelect.onchange();
    $("#challenge-hole-stake").value=offer.stakes.perHole;
    $("#challenge-match-stake").value=offer.stakes.match;
  }
  $("#challenge-terms").hidden = !challenge;
  $("#championship-rounds").disabled = challenge;
  if (challenge) $("#championship-rounds").value = "1";
  $("#championship-setup h2").textContent = challenge
    ? invited ? "Invited pro challenge" : "Pro challenge exhibition"
    : "Local championship";
  $("#start-championship").textContent = challenge
    ? "Start challenge"
    : "Start championship";
  $("#championship-error").textContent = "";
  $("#menu").close();
  $("#championship-setup").showModal();
}
$("#championship").onclick = () => openEventSetup("championship");
$("#pro-challenge").onclick = () => openEventSetup("pro-challenge");
$("#start-championship").onclick = async () => {
  const button = $("#start-championship");
  button.disabled = true;
  try {
    const course =
        coursePackage || (await exportCourse(game, $("#course-title").value)),
      golfer = exportGolfer(game),
      rival = exportGolfer(createGame());
    Object.assign(rival.profile.skills, {
      power: 3,
      longDrive: 3,
      irons: 2,
      putter: 2,
    });
    const invitation=eventKind === "career-challenge" ? game.challengeCareer?.offer : null;
    if (eventKind === "career-challenge" && invitation?.status!=="offered") throw Error("This invitation is no longer available.");
    const selectedOpponent = invitation ? rosterOpponent(invitation.professional) : opponentSelect.value
      ? rosterOpponent(opponentSelect.value)
      : { name: "Club professional", golfer: rival };
    const entrants = [
      { id: "local-owner", name: "Gary Golf", golfer },
      { id: "club-rival", ...selectedOpponent },
    ];
    const idForEvent = crypto.randomUUID();
    const host =
      eventKind !== "championship"
        ? await createProChallenge({
            id: idForEvent,
            course,
            resident: entrants[0],
            challenger: entrants[1],
            stakes: invitation ? invitation.stakes : {
              perHole: Number($("#challenge-hole-stake").value),
              match: Number($("#challenge-match-stake").value),
            },
          })
        : await createCompetition({
            id: idForEvent,
            course,
            rounds: Number($("#championship-rounds").value),
            entrants,
          });
    const id = host.snapshot().id;
    playStorage.setItem(`simgolf-reborn.championship.${id}`, host.save());
    if (invitation) {
      const accepted=command("accept-challenge",{id:invitation.id,eventId:id,courseDigest:course.digest});
      if (!accepted.ok) throw Error(accepted.message);
    }
    if (!save())
      throw Error("Save your resort before starting the championship.");
    playStorage.setItem("simgolf-reborn.last-championship", id);
    location.href = testingHref(`?championship=${id}`,testing);
  } catch (error) {
    $("#championship-error").textContent = error.message;
    button.disabled = false;
  }
};
const invitationDialog=document.createElement("dialog");
invitationDialog.id="invitation-dialog";
document.body.append(invitationDialog);
$("#career-challenge").onclick=()=>{
  const o=game.challengeCareer?.offer;
  if (!o) return;
  if (o.status==='playing') { location.href=testingHref(`?championship=${o.eventId}`,testing); return; }
  invitationDialog.replaceChildren();
  const add=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;invitationDialog.append(n);return n;};
  add('h2',`${o.professional} challenges Gary`);
  add('p',`$${o.stakes.perHole.toLocaleString()} per hole and $${o.stakes.match.toLocaleString()} for the match. Winnings and losses affect your resort.`);
  const accept=add('button','Review and accept');accept.onclick=()=>{invitationDialog.close();openEventSetup('career-challenge');};
  const decline=add('button','Decline');decline.onclick=()=>{const r=command('decline-challenge',{id:o.id});toast(r.message);save();invitationDialog.close();refresh();};
  add('button','Later').onclick=()=>invitationDialog.close();
  $('#menu').close();invitationDialog.showModal();
};
async function collectInvitedChallenge() {
  const o=game.challengeCareer?.offer;
  if (coursePackage || o?.status!=='playing') return;
  const raw=playStorage.getItem(`simgolf-reborn.championship.${o.eventId}`);
  if (!raw) return;
  try { const result=await settleCareerChallenge(game,raw); if (result.ok) {save();toast(result.message);refresh();} }
  catch(error) {toast(`Challenge result kept pending: ${error.message}`);}
}
await collectInvitedChallenge();
const lastChampionship = playStorage.getItem(
  "simgolf-reborn.last-championship",
);
if (lastChampionship && /^[a-zA-Z0-9_-]{1,64}$/.test(lastChampionship)) {
  $("#resume-championship").hidden = false;
  $("#resume-championship").href = testingHref(`?championship=${lastChampionship}`,testing);
}
$("#import-championship").onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 64000000) throw Error("Event file is too large.");
    const host = await restoreEvent(await file.text());
    if (
      host
        .snapshot()
        .standings.map((p) => p.id)
        .sort()
        .join(",") !== "club-rival,local-owner"
    )
      throw Error("This file is not a local championship.");
    if (!save())
      throw Error("Save your current game before importing a championship.");
    const id = host.snapshot().id;
    playStorage.setItem(`simgolf-reborn.championship.${id}`, host.save());
    playStorage.setItem("simgolf-reborn.last-championship", id);
    saveAllowed = false;
    location.href = testingHref(`?championship=${id}`,testing);
  } catch (error) {
    toast(error.message);
  } finally {
    e.target.value = "";
  }
};
$("#export-course").onclick = async () => {
  try {
    const pkg =
      coursePackage || (await exportCourse(game, $("#course-title").value));
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `course-${pkg.digest.slice(0, 12)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Course layout exported. Resort finances and career are excluded.");
  } catch (error) {
    toast(error.message);
  }
};
$("#import-course").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const pkg = await importCourse(await file.text());
    playStorage.setItem(
      `simgolf-reborn.package.${pkg.digest}`,
      JSON.stringify(pkg),
    );
    location.assign(testingHref(`?practice=${pkg.digest}`,testing));
  } catch (error) {
    toast(`Could not open course: ${error.message}`);
  }
  e.target.value = "";
};
$("#import").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const next = restore(await file.text());
    playStorage.setItem(saveKey, serialize(next));
    // Page-exit autosave must not replace the imported state with this old game.
    saveAllowed = false;
    location.reload();
  } catch (error) {
    toast(`Could not import: ${error.message}`);
  }
  e.target.value = "";
};
$("#new-environment").innerHTML = Object.entries(ENVIRONMENTS)
  .map(([id, e]) => `<option value="${id}">${e.name}</option>`)
  .join("");
function describeEnvironment() {
  const selected = ENVIRONMENTS[$("#new-environment").value];
  $("#environment-summary").textContent =
    `${FACILITIES[selected.recreation].name} is this environment’s recreation building. Ground colors match the environment; regional trees and architecture are still to come.`;
}
$("#new-environment").onchange = describeEnvironment;
describeEnvironment();
$("#new-landscape").innerHTML = Object.entries(LANDSCAPES)
  .map(([id, label]) => `<option value="${id}">${label}</option>`)
  .join("");
$("#new-landscape").value = "river";
function previewLandscape() {
  const seed = Number($("#new-seed").value),
    style = $("#new-landscape").value;
  if (
    !$("#new-seed").value ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  ) {
    $("#confirm-new").disabled = true;
    $("#landscape-summary").textContent =
      "Enter a whole-number seed from 0 to 4294967295.";
    return;
  }
  $("#confirm-new").disabled = false;
  const map =
    style === "classic" ? createGame(seed) : generateLandscape(seed, style);
  const canvas = $("#landscape-preview"),
    ctx = canvas.getContext("2d");
  for (let r = 0; r < 42; r++)
    for (let c = 0; c < 45; c++) {
      const k = r * 45 + c,
        type = map.tiles[k]?.type,
        h = map.elevation?.[k] || 0;
      ctx.fillStyle =
        type === "water"
          ? "#6db5b5"
          : type === "path"
            ? "#c7bd94"
            : `hsl(83 34% ${43 + h * 4}%)`;
      ctx.fillRect(c * 8, r * 8, 8, 8);
    }
  ctx.fillStyle = "#e9d5b0";
  ctx.fillRect(3 * 8, 2 * 8, 9 * 8, 7 * 8);
  ctx.fillStyle = "#302c3f";
  ctx.font = "11px sans-serif";
  ctx.fillText("Clubhouse", 25, 47);
  $("#landscape-summary").textContent =
    `${Object.values(map.tiles).filter((t) => t.type === "water").length} water tiles · ${Math.min(0, ...Object.values(map.elevation || {}))} to ${Math.max(0, ...Object.values(map.elevation || {}))} elevation · light green is higher ground. All terrain is editable.`;
}
$("#new-landscape").onchange = previewLandscape;
$("#new-seed").oninput = previewLandscape;
$("#reroll-landscape").onclick = () => {
  $("#new-seed").value = crypto.getRandomValues(new Uint32Array(1))[0];
  previewLandscape();
};
$("#new").onclick = () => {
  $("#reroll-landscape").click();
  $("#restore-previous").hidden = !playStorage.getItem(`${saveKey}.previous`);
  $("#new-dialog").showModal();
};
$("#restore-previous").onclick = () => {
  try {
    const previous = restore(playStorage.getItem(`${saveKey}.previous`));
    playStorage.setItem(`${saveKey}.previous`, serialize(game));
    playStorage.setItem(saveKey, serialize(previous));
    saveAllowed = false;
    location.reload();
  } catch (error) {
    toast("The previous course could not be restored.");
  }
};
$("#cancel-new").onclick = () => $("#new-dialog").close();
$("#confirm-new").onclick = () => {
  try {
    const seed = Number($("#new-seed").value);
    if (
      !$("#new-seed").value ||
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > 0xffffffff
    )
      return;
    const next = createGame(
      seed,
      $("#new-landscape").value,
      $("#new-environment").value,
    );
    playStorage.setItem(`${saveKey}.previous`, serialize(game));
    playStorage.setItem(saveKey, serialize(next));
    saveAllowed = false;
    location.reload();
  } catch (error) {
    toast("This browser cannot save a new game.");
  }
};
function beginShotAnalysis() {
  setMode("build");
  pickingAnalysis = true;
  syncControls();
  toast("Click a starting spot to compare golfer skills. Escape cancels.");
}
function showShotAnalysis(point) {
  try {
    const rows = analyzeShots(game, selectedHoleId, { x: point.x, z: point.z });
    shotOverlay.show(rows);
    const root = $("#shot-analysis-content");
    root.replaceChildren();
    for (const [index, row] of rows.entries()) {
      const p = document.createElement("p");
      p.style.borderLeft = `5px solid ${ANALYSIS_COLORS[index]}`;
      p.style.paddingLeft = "10px";
      p.textContent = `${row.label}: ${row.technique} · ${Math.round(row.carry)} yd carry · ${Math.round(row.remaining)} yd left · ${row.hazards}/3 samples hit water or trees`;
      root.append(p);
    }
    pickingAnalysis = false;
    syncControls();
    $("#shot-analysis-dialog").showModal();
  } catch (error) {
    toast(error.message);
  }
}
function showAccomplishments() {
  const root = $("#accomplishments-content");
  root.replaceChildren();
  const summary = document.createElement("p");
  summary.textContent = `${game.accomplishments.length} course accomplishments earned · ${game.proProfile.points - Object.values(game.proProfile.skills).reduce((a, b) => a + b, 0)} skill points available. Allocate them in Play → Pro skills.`;
  root.append(summary);
  for (const a of ACCOMPLISHMENTS) {
    const row = document.createElement("p");
    row.textContent = `${game.accomplishments.some((r) => r.id === a.id) ? "✓" : "○"} ${a.name} · 3 skill points`;
    root.append(row);
  }
  const note = document.createElement("p");
  note.textContent =
    "More professional accomplishments and the original trophy presentation are still being built.";
  root.append(note);
  $("#accomplishments-dialog").showModal();
}
function showRoster() {
  const render = () =>
    renderGuestRoster($("#roster-content"), game, {
      membership: (golferId, accept) =>
        apply("decide-membership", { golferId, accept }),
      rename: (golferId, name) => apply("rename-visitor", { golferId, name }),
      appearance: (golferId, appearance) =>
        apply("set-visitor-appearance", { golferId, appearance }),
      pair: (firstId, secondId) =>
        apply("set-visitor-pair", { firstId, secondId }),
      clear: (golferId) => apply("clear-visitor-pair", { golferId }),
    });
  const apply = (type, payload) => {
    const selection = [
      ...$("#roster-content").querySelectorAll(
        'select[aria-label="First golfer"],select[aria-label="Second golfer"]',
      ),
    ].map((s) => s.value);
    toast(command(type, payload).message);
    save();
    render();
    [
      ...$("#roster-content").querySelectorAll(
        'select[aria-label="First golfer"],select[aria-label="Second golfer"]',
      ),
    ].forEach((s, i) => {
      s.value = selection[i];
      s.dispatchEvent(new Event("change"));
    });
  };
  render();
  $("#roster-dialog").showModal();
}
addEventListener("keydown", (e) => {
  if (e.target.matches("input,select") || $("dialog[open]")) return;
  if (e.key === "/") {
    e.preventDefault();
    beginShotAnalysis();
    return;
  }
  if (e.key === "F10") {
    e.preventDefault();
    showAccomplishments();
    return;
  }
  if (e.key === "F9") {
    e.preventDefault();
    showRoster();
    return;
  }
  if (e.key === "Tab" && mode === "build" && isFacility(tool) && lastHover) {
    e.preventDefault();
    buildingRotation = (buildingRotation + 1) % 4;
    $("#building-rotation").value = String(buildingRotation);
    hover(lastHover);
    return;
  }
  if (e.code === "Space") {
    e.preventDefault();
    spacePanning = true;
    stroke = false;
    syncControls();
    return;
  }
  if (e.target.matches("button")) return;
  if (e.key.toLowerCase() === "h" && mode === "build" && !coursePackage)
    $("#open-hole").click();
  if (e.key === "Escape") {
    boundaryCorners = null;
    movingStaff = false;
    pickingAnalysis = false;
    shotOverlay.clear();
    placingStoryReward = false;
    tool = "inspect";
    syncControls();
    renderPanel();
  }
});
const raycaster = new THREE.Raycaster();
function groundAt(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    ),
    camera,
  );
  if (mode === "build" && ["demolish", "raise", "lower"].includes(tool)) {
    const hits = [flora.pick(raycaster), view.pickTree(raycaster)].filter(Boolean).sort((a,b)=>a.distance-b.distance);
    if(hits.length) return hits[0];
  }
  return raycaster.intersectObject(landscape.terrain)[0]?.point;
}
let lastCell = "",
  stroke = false,
  start = null,
  moved = false,
  multi = false;
const pointers = new Set();
function effectiveBrush() {
  return ["tee", "cup", "demolish"].includes(tool) ||
    isFacility(tool) ||
    (tool === "green" && !selectedHole().green)
    ? 1
    : brush;
}
let lastHover = null;
function hover(e) {
  lastHover = { clientX: e.clientX, clientY: e.clientY };
  view.previewFacility(null);
  const p = groundAt(e);
  cursor.visible = aiming.visible = aimTargetLine.visible = false;
  staffRangePreview = null;
  if (!p) return;
  if (mode === "staff" && movingStaff) {
    const cell = cellAt(p.x, p.z);
    if (!["water", "blocked"].includes(tile(game, cell.c, cell.r)))
      staffRangePreview = center(cell.c, cell.r);
  }
  if (mode === "build" && tool !== "inspect") {
    if (boundaryCorners) {
      const vertices = [...boundaryCorners, cellAt(p.x,p.z), boundaryCorners[0]].filter(Boolean).map(c=>center(c.c,c.r));
      aiming.geometry.dispose();
      aiming.geometry = new THREE.BufferGeometry().setFromPoints(vertices.map(v=>new THREE.Vector3(v.x,height(v.x,v.z)+.2,v.z)));
      aiming.computeLineDistances();aiming.visible=true;return;
    }
    const c = cellAt(p.x, p.z),
      check =
        tool === "demolish"
          ? demolitionCheck(game, c.c, c.r)
          : canBuild(
              placingStoryReward
                ? { ...game, cash: Number.MAX_SAFE_INTEGER }
                : game,
              tool,
              c.c,
              c.r,
              effectiveBrush(),
              selectedHoleId,
              buildingRotation,
            );
    const radius = isFacility(tool)
        ? facilityRadius(tool)
        : tool === "tee"
          ? 1
          : tool === "green" && !selectedHole().green
            ? 2
            : Math.floor(effectiveBrush() / 2),
      mid = center(c.c, c.r),
      extent = isFacility(tool)
        ? facilityExtents(tool, buildingRotation)
        : { x: radius, z: radius },
      halfX = (extent.x + 0.5) * 2,
      halfZ = (extent.z + 0.5) * 2,
      points = [];
    const corners = [
      [-halfX, -halfZ],
      [halfX, -halfZ],
      [halfX, halfZ],
      [-halfX, halfZ],
    ];
    for (let i = 0; i < 4; i++) {
      for (const [dx, dz] of [corners[i], corners[(i + 1) % 4]])
        points.push(
          new THREE.Vector3(
            mid.x + dx,
            height(mid.x + dx, mid.z + dz) + 0.15,
            mid.z + dz,
          ),
        );
    }
    cursor.geometry.dispose();
    cursor.geometry = new THREE.BufferGeometry().setFromPoints(points);
    cursor.material.color.set(check.ok ? 0xffffb3 : 0xf47e68);
    cursor.visible = true;
    if (isFacility(tool))
      view.previewFacility(
        { type: tool, c: c.c, r: c.r, rotation: buildingRotation },
        check.ok,
      );
  } else if (mode === "play" && game.pro?.phase === "address" && !isPutting(game, game.pro)) {
    const preview = shotPreview(game, p, technique);
    if (!preview) return;
    const project = (points) => points.map(({ x, z, lift }) =>
      new THREE.Vector3(x, height(x, z) + 0.2 + lift, z));
    aiming.geometry.dispose();
    aiming.geometry = new THREE.BufferGeometry().setFromPoints(project(preview.flight));
    aiming.computeLineDistances();
    aiming.visible = true;
    aimTargetLine.geometry.dispose();
    aimTargetLine.geometry = new THREE.BufferGeometry().setFromPoints(project(preview.roll));
    aimTargetLine.computeLineDistances();
    aimTargetLine.visible = preview.roll.length > 0;
  }
}
const facilityDialog = document.createElement("dialog");
facilityDialog.id = "facility-inspector";
facilityDialog.setAttribute("aria-label", "Building status");
document.body.append(facilityDialog);
function act(e) {
  if (spacePanning) return;
  const p = groundAt(e);
  if (!p) return;
  if (pickingAnalysis) {
    showShotAnalysis(p);
    return;
  }
  shotOverlay.clear();
  if(mode === "build" && boundaryCorners){
    if(boundaryCorners.length>=32){toast("Maximum 32 corners. Finish or cancel this region.");return;}
    boundaryCorners.push(cellAt(p.x,p.z));toast(`${boundaryCorners.length} corners selected. Finish region when the outline is complete.`);return;
  }
  if (mode === "build" && tool === "inspect") {
    const cell = cellAt(p.x, p.z);
    const facility = game.facilities.find(f => facilityContains(f, cell.c, cell.r));
    if (facility) { inspectFacility(facilityDialog, game, facility); return; }
  }
  if (mode === "staff" && movingStaff) {
    const c = cellAt(p.x, p.z);
    const result = command("reposition-staff", {
      staffId: selectedStaffId,
      c: c.c,
      r: c.r,
    });
    toast(result.message);
    if (result.ok) {
      movingStaff = false;
      syncControls();
      refresh();
      save();
    }
    return;
  }
  if (mode === "build" && tool !== "inspect") {
    if (placingStoryReward) {
      const c = cellAt(p.x, p.z),
        result = command("place-story-reward", c);
      toast(result.message);
      if (result.ok) {
        placingStoryReward = false;
        tool = "inspect";
        syncControls();
        renderPanel();
        save();
      }
      return;
    }
    if (tool === "demolish") {
      const c = cellAt(p.x, p.z);
      const check = demolitionCheck(game, c.c, c.r);
      if (check.ok) confirmRemoval("demolish", c, check.message);
      else toast(check.message);
      return;
    }
    const c = cellAt(p.x, p.z),
      k = `${c.c},${c.r}`;
    if (k === lastCell) return;
    const cells = [];
    // Fill skipped pointer samples with adjoining tiles, including square path corners.
    if (stroke && lastCell) {
      let [pc, pr] = lastCell.split(",").map(Number);
      while (pc !== c.c || pr !== c.r) {
        if (Math.abs(c.c - pc) >= Math.abs(c.r - pr) && pc !== c.c)
          pc += Math.sign(c.c - pc);
        else pr += Math.sign(c.r - pr);
        cells.push({ c: pc, r: pr });
      }
    } else cells.push(c);
    lastCell = k;
    let result;
    for (const cell of cells)
      result = command("build", {
        tool,
        c: cell.c,
        r: cell.r,
        brush: effectiveBrush(),
        ...(isFacility(tool) ? { rotation: buildingRotation } : {}),
      });
    if (
      result &&
      (!result.ok || ["tee", "green"].includes(tool) || isFacility(tool))
    )
      toast(result.message);
    refresh();
  } else if (mode === "play" && game.pro) {
    if (isPutting(game, game.pro)) toast("Putting is automatic. Let Gary finish the putt.");
    else toast(command("shot", { x: p.x, z: p.z, technique }).message);
  }
  else {
    const employee = game.staff.find(
      (s) => Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < 2,
    );
    if (employee) {
      selectedStaffId = employee.id;
      setMode("staff");
      return;
    }
    const near = game.guests.find(
      (v) => Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 3,
    );
    if (near) {
      selected = near.id;
      setMode("guests");
    } else {
      const flagHole = game.holes.find(
        (h) => h.green && Math.hypot(h.green.x - p.x, h.green.z - p.z) < 2,
      );
      if (flagHole) {
        selectedHoleId = flagHole.id;
        $("#open-hole").click();
      }
    }
  }
}
addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spacePanning = false;
    moved = true;
    syncControls();
  }
});
addEventListener("blur", () => {
  spacePanning = false;
  stroke = false;
  syncControls();
});
renderer.domElement.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (mode !== "build" || coursePackage || competition || $("dialog[open]")) return;
  const point = groundAt(e);
  if (!point) return;
  const cell = cellAt(point.x, point.z);
  const check = demolitionCheck(game, cell.c, cell.r);
  if (check.ok) confirmRemoval("demolish", cell, check.message);
  else toast(check.message);
});
renderer.domElement.addEventListener("pointerdown", (e) => {
  pointers.add(e.pointerId);
  if (pointers.size > 1) {
    multi = true;
    stroke = false;
    return;
  }
  multi = false;
  start = { x: e.clientX, y: e.clientY };
  moved = false;
  lastCell = "";
  stroke =
    !boundaryCorners && !spacePanning && e.button === 0 &&
    e.pointerType !== "touch" &&
    mode === "build" &&
    ([
      "fairway",
      "firm",
      "sand",
      "water",
      "path",
      "rough",
      "trim-green",
      "out-of-bounds",
      "clear-boundary",
      ...EXTRA_TERRAIN,
    ].includes(tool) ||
      (tool === "green" && !!selectedHole().green));
  if (stroke) act(e);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6)
    moved = true;
  if (stroke && !multi) act(e);
  hover(e);
});
renderer.domElement.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  if (!multi && !moved && !stroke && e.button === 0) act(e);
  stroke = false;
  start = null;
  if (!pointers.size) {
    multi = false;
    save();
  }
});
renderer.domElement.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);
  stroke = false;
  start = null;
  multi = true;
});
renderer.domElement.addEventListener("pointerleave", () => {
  lastHover = null;
  staffRangePreview = null;
  view.previewFacility(null);
  cursor.visible = aiming.visible = aimTargetLine.visible = false;
  stroke = false;
});
window.__gameTest = Object.freeze({
  getCameraTarget: () => controls.target.toArray(),
  getState: () => JSON.parse(serialize(game)),
  getPropertyBoundary: () => ({
    visible: boundary.visible,
    highlighted: purchasedBoundary.visible,
    points: Array.from(boundary.geometry.attributes.position.array),
  }),
  getCompetition: () => competition?.snapshot() ?? null,
  getVisibleActors: () => view.visibleActors(),
  getStaffCoverage: () => coverage.snapshot(),
  getAimPreview: () => ({ flight: aiming.visible, target: aimTargetLine.visible }),
  project: (x, z, aboveGround = 0) => {
    const v = new THREE.Vector3(x, height(x, z) + aboveGround, z).project(camera);
    return {
      x: ((v.x + 1) * innerWidth) / 2,
      y: ((1 - v.y) * innerHeight) / 2,
    };
  },
});
let careerSettlementBusy=false,careerSettlementCursor="";
async function syncLiveChallengeWagers() {
  if (!competition || careerSettlementBusy) return;
  const state=competition.snapshot();
  if (state.kind!=="pro-challenge" || !state.holes.length) return;
  const cursor=`${state.id}:${state.holes.length}:${state.status}`;
  if (cursor===careerSettlementCursor) return;
  careerSettlementBusy=true;
  const resortKey="simgolf-reborn.course.v1";
  try {
    const before=playStorage.getItem(resortKey);
    if (!before) {careerSettlementCursor=cursor;return;}
    const resort=restore(before);
    if (resort.challengeCareer?.offer?.eventId!==state.id) {careerSettlementCursor=cursor;return;}
    const event=competition.save();
    // Persist the replay before its receipts so an interrupted tab can recover.
    playStorage.setItem(saveKey,event);
    const result=await settleCareerChallenge(resort,event);
    // Another local action may have saved the resort during replay. Retry from
    // that newer state instead of overwriting it with this snapshot.
    if (playStorage.getItem(resortKey)!==before) return;
    if (result.ok) {
      playStorage.setItem(resortKey,serialize(resort));
      toast(result.message);
      const note=$("#challenge-accounting");
      if (note) note.textContent="Invited match. Completed wagers have been recorded in your resort account.";
    }
    careerSettlementCursor=cursor;
  } catch(error) {
    // Keep the event playable; return-to-resort recovery can retry its replay.
    careerSettlementCursor=cursor;
    toast(`Wagers remain pending: ${error.message}`);
  } finally {careerSettlementBusy=false;}
}
let rivalView = competition?.roundSnapshot("club-rival").pro ?? null;
const opponentViews = () =>
  rivalView
    ? [{ ...rivalView, visualId: "opponent:club-rival", visualColor: 0x326eae }]
    : [];
const remarks = golferRemarks($("#game"));
let remarksBottom = innerHeight;
let completionShown = false;
let landscapeRevision = -1;
let last = performance.now(),
  accumulator = 0,
  lastUI = 0,
  lastSave = last;
function frame(now) {
  if(!remote)void syncLiveChallengeWagers();
  const dt = Math.min((now - last) / 1000, 0.15);
  last = now;
  if (!remote && !paused && !document.hidden && !$("dialog[open]")) {
    accumulator += dt * speed;
    while (accumulator >= 0.05) {
      if (competition) {
        const rival = competition.roundSnapshot("club-rival");
        if (rival.pro.phase === "address" && rival.pro.wait >= 1) {
          const target = planShot(rival, rival.pro);
          if (target)
            competition.execute(
              competition.nextCommand("club-rival", "shot", target),
              { id: "club-rival", role: "golfer" },
            );
        }
        competition.stepTicks();
        rivalView = competition.roundSnapshot("club-rival").pro;
        game = competition.roundSnapshot(localPlayer.id);
        selectedHoleId = game.pro.holeId;
      } else session.stepTicks();
      accumulator -= 0.05;
    }
  }
  controls.update();
  purchasedBoundary.visible = mode === "build" && now < purchaseHighlightUntil;
  if (landscapeRevision !== game.revision) {
    setLandscapeState(coastalPreview(game));
    landscape.reshape();
    flora.update(coastalPreview(game));
    ocean.update(coastalPreview(game));
    boundary.geometry.dispose();
    boundary.geometry = new THREE.BufferGeometry().setFromPoints(
      propertyBoundaryPoints(),
    );
    landscapeRevision = game.revision;
  }
  startingBridge.visible = !game.starterBridgeRemoved;
  landscape.animate(game.time);
  view.update(game, game.time, opponentViews());
  helicopter.update(game);
  coverage.update(
    game,
    mode === "staff" ? game.staff.find((s) => s.id === selectedStaffId) : null,
    staffRangePreview,
  );
  renderer.render(scene, camera);
  remarks.update(
    [
      ...storyGolfers(game),
      ...(game.pro ? [game.pro] : []),
      ...opponentViews(),
    ],
    game.time,
    (p) => {
      const v = new THREE.Vector3(p.x, height(p.x, p.z) + 2.6, p.z).project(
        camera,
      );
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
        depth: v.z,
      };
    },
    { width: innerWidth, bottom: remarksBottom },
  );
  if (now - lastUI > 300) {
    refresh();
    remarksBottom = $(".console").getBoundingClientRect().top;
    if (competition?.snapshot().status === "complete" && !completionShown) {
      completionShown = true;
      save();
      showStandings();
    }
    lastUI = now;
  }
  if (now - lastSave > 5000) {
    if (saveAllowed) save();
    lastSave = now;
  }
  if (now > toastUntil) $("#toast").classList.remove("show");
  requestAnimationFrame(frame);
}
addEventListener("pagehide", () => {
  if (saveAllowed) save();
});
if (coursePackage) {
  $(".club h1").textContent = coursePackage.content.title;
  $("#course-title").value = coursePackage.content.title;
}
renderPanel();
syncControls();
view.update(game, 0, opponentViews());
$("#loading").remove();
if (loadWarning) toast(loadWarning);
requestAnimationFrame(frame);

mountAccount({storage:playStorage,testing,shared:!!remote});
if(remote){
 const status=document.createElement('p');status.id='shared-status';status.setAttribute('role','status');status.style.cssText='position:fixed;top:145px;left:18px;background:#263d30;color:#fff9df;padding:8px 12px;border-radius:12px;z-index:5;max-width:calc(100vw - 60px)';document.body.append(status);
 $('#menu h2').textContent=sharedSnapshot.name;$('#menu p').textContent='Edits and simulation are saved and run by the server.';
 $('.menu-actions').hidden=true;
 const back=document.createElement('a');back.href='/';back.textContent='Return to my resort';$('#menu').append(back);
 for(const id of ['pause','speed'])$("#"+id).hidden=true;
 $('[data-mode="play"]').hidden=true;
 remote.start();addEventListener('pagehide',()=>remote.stop());
 addEventListener('pageshow',event=>{if(event.persisted)remote.start();});
}
