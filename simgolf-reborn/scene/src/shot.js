// An art-test trajectory, independent of frame rate. Full lie/skill physics comes later.
export function sampleShot(time) {
  const t = ((time % 14) + 14) % 14;
  const stages = [
    {
      start: 1,
      duration: 3.3,
      from: [-31, 8],
      to: [26, -21],
      lift: 10,
      phase: "flight",
    },
    {
      start: 4.3,
      duration: 0.65,
      from: [26, -21],
      to: [28, -22],
      lift: 0.55,
      phase: "bounce",
    },
    {
      start: 4.95,
      duration: 0.4,
      from: [28, -22],
      to: [28.8, -22.4],
      lift: 0.16,
      phase: "bounce",
    },
    {
      start: 5.35,
      duration: 2.8,
      from: [28.8, -22.4],
      to: [31.6, -23.8],
      lift: 0,
      phase: "roll",
    },
  ];
  if (t < 1) return { x: -31, z: 8, lift: 0, phase: "address" };
  for (const stage of stages) {
    if (t > stage.start + stage.duration) continue;
    const u = Math.max(0, (t - stage.start) / stage.duration);
    // Constant deceleration on the ground brings the ball smoothly to rest.
    const progress = stage.phase === "roll" ? 1 - (1 - u) ** 2 : u;
    return {
      x: stage.from[0] + (stage.to[0] - stage.from[0]) * progress,
      z: stage.from[1] + (stage.to[1] - stage.from[1]) * progress,
      lift: 4 * stage.lift * u * (1 - u),
      phase: stage.phase,
    };
  }
  return { x: 31.6, z: -23.8, lift: 0, phase: "rest" };
}
