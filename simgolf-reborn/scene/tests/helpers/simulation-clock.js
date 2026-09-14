// Advance the same fixed ticks as the live loop, independently of GPU speed.
// The opt-in hook exists only in development builds and rejects shared games.
export async function useSimulationClock(page) {
 await page.addInitScript(() => {globalThis.__manualSimulationClock = true;});
}
export async function advanceTicks(page, ticks) {
 return page.evaluate(ticks => window.__gameTest.advanceTicks(ticks), ticks);
}
export async function advanceUntil(page, predicate, maxTicks = 12000) {
 let state = await advanceTicks(page, 0);
 for (let ticks = 0; !predicate(state) && ticks < maxTicks; ticks += 20) {
  state = await advanceTicks(page, Math.min(20, maxTicks - ticks));
 }
 if (!predicate(state)) throw new Error(`Condition not reached within ${maxTicks} simulation ticks; game time ${state.time}`);
 return state;
}
