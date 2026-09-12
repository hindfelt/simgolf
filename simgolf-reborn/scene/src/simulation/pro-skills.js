import { courseCategory } from "./course-category.js";
// Original skill names and ten initial points; response coefficients are provisional.
export const PRO_SKILLS = {
  power: "Power Hitter",
  longDrive: "Long Driver",
  driver: "Accurate Driver",
  irons: "Accurate Irons",
  putter: "Accurate Putter",
  draw: "Draw Shot",
  fade: "Fade Shot",
  backspin: "High Backspin Shot",
  recovery: "Recovery Skill",
  luck: "Luck",
};
export const newProProfile = () => ({
  points: 10,
  skills: Object.fromEntries(Object.keys(PRO_SKILLS).map((k) => [k, 0])),
});
export function validateProProfile(p) {
  if (
    !p ||
    !Number.isSafeInteger(p.points) ||
    p.points < 10 ||
    (p.points - 10) % 3 !== 0 ||
    !p.skills ||
    Object.keys(p.skills).length !== 10 ||
    Object.keys(PRO_SKILLS).some(
      (k) =>
        !Number.isInteger(p.skills[k]) || p.skills[k] < 0 || p.skills[k] > 10,
    ) ||
    Object.values(p.skills).reduce((a, b) => a + b, 0) > p.points
  )
    throw Error("Invalid professional skill allocation.");
}
export function allocateProSkill(g, skill, delta) {
  if (!Object.hasOwn(PRO_SKILLS, skill) || ![-1, 1].includes(delta))
    return { ok: false, message: "Invalid skill change." };
  if (g.pro && g.pro.phase !== "finished")
    return {
      ok: false,
      message: "Finish the practice round before changing skills.",
    };
  const cap = courseCategory(g).skillCap;
  if (delta > 0 && g.proProfile.skills[skill] >= cap)
    return {
      ok: false,
      message: `${courseCategory(g).name}: ${cap * 10}% maximum per skill. Expand the course to raise the limit.`,
    };
  const p = g.proProfile,
    value = p.skills[skill] + delta;
  if (
    value < 0 ||
    value > 10 ||
    Object.values(p.skills).reduce((a, b) => a + b, 0) + delta > p.points
  )
    return { ok: false, message: "No skill points available for that change." };
  p.skills[skill] = value;
  return { ok: true, message: `${PRO_SKILLS[skill]}: ${value * 10}%.` };
}
export const proSkill = (v, k) => (v.proSkills?.[k] || 0) / 10;
