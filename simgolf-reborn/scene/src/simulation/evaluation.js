import {originalHoleObservations} from "./original-hole-observations.js";
export const EVALUATION_SKILLS = ["length", "accuracy", "imagination"];
export const newEvaluation = () => ({ cohorts: {} });
export function beginObservation(g, v) {
  if (v.pro || v.holeObservation || v.strokes !== 0) return;
  const mask = EVALUATION_SKILLS.reduce(
    (m, k, i) =>
      m | (v.skills[k] ? 1 << i : 0) | (v.trained?.[k] ? 1 << (i + 3) : 0),
    0,
  );
  v.holeObservation = { mask, startedAt: g.time, mood: v.mood };
}
// Counts actual shot events, including rounds that have not finished.
// Original first-shot gate: 0x42cb01; non-putter gate: 0x4249a6.
export function recordEvaluationShot(g, v, putt) {
  if (v.pro) return;
  const hole = g.holes.find(h => h.id === v.holeId);
  if (!hole) return;
  const activity = (hole.stats.evaluation.activity ??= {starts: 0, nonPuttShots: 0});
  if (v.strokes === 0) activity.starts++;
  if (!putt) activity.nonPuttShots++;
}
export function recordObservation(g, v, hole) {
  const sample = v.holeObservation;
  if (v.pro || !sample) return;
  const group = (hole.stats.evaluation.cohorts[sample.mask] ??= {
    count: 0,
    strokes: 0,
    seconds: 0,
    mood: 0,
  });
  const scores = (group.scoreCounts ??= {});
  scores[v.strokes] = (scores[v.strokes] ?? 0) + 1;
  group.count++;
  group.strokes += v.strokes;
  group.seconds += g.time - sample.startedAt;
  group.mood += v.mood;
  if (v.holeReactions?.holeId === v.holeId && v.holeReactions.shots > 0) {
    const fun = (group.fun ??= {
      count: 0,
      ratioSum: 0,
      positive: 0,
      negative: 0,
    });
    fun.count++;
    fun.positive += v.holeReactions.positive;
    fun.negative += v.holeReactions.negative;
    fun.ratioSum +=
      (v.holeReactions.positive - v.holeReactions.negative) /
      v.holeReactions.shots;
  }
}
export function validateEvaluation(stats) {
  const e = stats.evaluation;
  if (
    !e ||
    !e.cohorts ||
    typeof e.cohorts !== "object" ||
    Array.isArray(e.cohorts) ||
    Object.keys(e.cohorts).length > 27
  )
    throw Error("Invalid hole observations.");
  if (e.activity !== undefined && (!e.activity || typeof e.activity !== 'object' ||
      Array.isArray(e.activity) ||
      ![e.activity.starts, e.activity.nonPuttShots].every(n => Number.isSafeInteger(n) && n >= 0)))
    throw Error('Invalid hole activity.');
  let count = 0,
    strokes = 0;
  for (const [key, v] of Object.entries(e.cohorts)) {
    const mask = Number(key),
      base = mask & 7,
      trained = mask >> 3;
    if (
      !Number.isInteger(mask) ||
      String(mask) !== key ||
      mask < 0 ||
      mask > 63 ||
      (trained & ~base) !== 0 ||
      !v ||
      (v.fun !== undefined &&
        (!v.fun ||
          !Number.isSafeInteger(v.fun.count) ||
          v.fun.count < 1 ||
          v.fun.count > v.count ||
          !Number.isFinite(v.fun.ratioSum) ||
          Math.abs(v.fun.ratioSum) > v.fun.count * 1024 ||
          ![v.fun.positive, v.fun.negative].every(
            (n) => Number.isSafeInteger(n) && n >= 0 && n <= v.fun.count * 1024,
          ))) ||
      !Number.isSafeInteger(v.count) ||
      v.count < 1 ||
      !Number.isSafeInteger(v.strokes) ||
      v.strokes < v.count ||
      !Number.isFinite(v.seconds) ||
      v.seconds < 0 ||
      !Number.isFinite(v.mood) ||
      v.mood < 0 ||
      v.mood > v.count * 100
    )
      throw Error("Invalid skill cohort.");
    if (v.scoreCounts !== undefined) {
      if (!v.scoreCounts || typeof v.scoreCounts !== 'object' || Array.isArray(v.scoreCounts))
        throw Error('Invalid score distribution.');
      let samples = 0, total = 0;
      for (const [score, n] of Object.entries(v.scoreCounts)) {
        const value = Number(score);
        if (!Number.isSafeInteger(value) || value < 1 || String(value) !== score ||
            !Number.isSafeInteger(n) || n < 1)
          throw Error('Invalid score distribution.');
        samples += n; total += value * n;
      }
      if (!Number.isSafeInteger(samples) || !Number.isSafeInteger(total) ||
          samples > v.count || total > v.strokes ||
          v.strokes - total < v.count - samples || (samples === v.count && total !== v.strokes))
        throw Error('Score distribution exceeds cohort observations.');
    }
    count += v.count;
    strokes += v.strokes;
  }
  if (count > stats.completed || strokes > stats.strokes)
    throw Error("Hole observations exceed completed play.");
}
export function evaluationReport(hole, originalOptions) {
  const all = Object.entries(hole.stats.evaluation?.cohorts || {}).map(
    ([mask, v]) => ({ mask: Number(mask), ...v }),
  );
  const summarize = (rows) => {
    const n = rows.reduce((n, r) => n + r.count, 0),
      funCount = rows.reduce((n, r) => n + (r.fun?.count || 0), 0);
    return {
      count: n,
      funCount,
      fun: funCount
        ? rows.reduce((n, r) => n + (r.fun?.ratioSum || 0), 0) / funCount
        : null,
      score: n ? rows.reduce((s, r) => s + r.strokes, 0) / n : null,
      seconds: n ? rows.reduce((s, r) => s + r.seconds, 0) / n : null,
      mood: n ? rows.reduce((s, r) => s + r.mood, 0) / n : null,
    };
  };
  let original = null;
  if (originalOptions) {
    const histogram = Array.from({length:8}, () => Array(9).fill(0));
    for (const group of all) {
      for (const [score, count] of Object.entries(group.scoreCounts || {}))
        histogram[group.mask & 7][Math.min(9, Number(score)) - 1] += count;
    }
    original = originalHoleObservations({...originalOptions, histogram});
  }
  return {
    original,
    ...summarize(all),
    cohorts: all,
    skills: EVALUATION_SKILLS.map((skill, i) => {
      const withSkill = summarize(all.filter((r) => r.mask & (1 << i))),
        without = summarize(all.filter((r) => !(r.mask & (1 << i))));
      return {
        skill,
        withSkill,
        without,
        advantage: original ? original.advantages[i] / 100 :
          withSkill.count && without.count
            ? without.score - withSkill.score
            : null,
      };
    }),
  };
}
