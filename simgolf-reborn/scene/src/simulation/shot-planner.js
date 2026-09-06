import { golferHole, lie, shotLimit, takeShot } from "./game.js";
import { planShotWith } from "./shot-planning-core.js";
export function planShot(game, golfer) {
  return planShotWith(game, golfer, { golferHole, lie, shotLimit, takeShot });
}
