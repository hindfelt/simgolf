import { isFacility } from "../simulation/facilities.js";
export const PALETTE_GROUPS = {
  all: "All",
  course: "Course",
  landscape: "Landscape",
  resort: "Resort",
};
const course = new Set([
  "tee",
  "rotate-tee",
  "green",
  "cup",
  "trim-green",
  "fairway",
  "firm",
  "sand",
  "pot-bunker",
  "waste-bunker",
]);
export function inPaletteGroup(tool, group) {
  if (group === "all" || tool === "inspect" || tool === "demolish") return true;
  if (group === "resort") return isFacility(tool);
  if (group === "course") return course.has(tool);
  return group === "landscape" && !isFacility(tool) && !course.has(tool);
}
