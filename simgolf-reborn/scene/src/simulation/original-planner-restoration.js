// 0x425ab9 and 0x425ac3: unconditional shared metadata writes at planner exit.
// These are writes to apply, not a replacement for the complete terrain table.
export function originalPlannerRestoration() {
 return [{code:17,shotClass:8},{code:20,shotClass:8}];
}
