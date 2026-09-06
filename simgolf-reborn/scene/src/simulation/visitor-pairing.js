import { eligibleVisitors } from "./visitor-pool.js";
export function setVisitorPair(g, firstId, secondId) {
  if (
    firstId === secondId ||
    ![firstId, secondId].every((id) => g.visitorPool.some((p) => p.id === id))
  )
    return {
      ok: false,
      message: "Choose two different golfers from your visitor pool.",
    };
  g.visitorPairs = g.visitorPairs.filter(
    (pair) => !pair.includes(firstId) && !pair.includes(secondId),
  );
  g.visitorPairs.push([firstId, secondId]);
  g.revision++;
  return {
    ok: true,
    message: "Playing partners saved for their next available round.",
  };
}
export function clearVisitorPair(g, golferId) {
  if (!g.visitorPairs.some((pair) => pair.includes(golferId)))
    return { ok: false, message: "This golfer has no chosen playing partner." };
  g.visitorPairs = g.visitorPairs.filter((pair) => !pair.includes(golferId));
  g.revision++;
  return { ok: true, message: "Automatic pairing restored." };
}
export function nextVisitorPair(g) {
  const available = eligibleVisitors(g);
  for (const pair of g.visitorPairs) {
    const players = pair.map((id) => available.find((p) => p.id === id));
    if (players.every(Boolean)) return players;
  }
  const reserved = new Set(g.visitorPairs.flat());
  const players = available.filter((p) => !reserved.has(p.id)).slice(0, 2);
  return players.length === 2 ? players : [];
}
export function validateVisitorPairs(g) {
  if (
    !Array.isArray(g.visitorPairs) ||
    g.visitorPairs.length > Math.floor(g.visitorPool.length / 2)
  )
    throw Error("Invalid visitor pairs.");
  const seen = new Set();
  for (const pair of g.visitorPairs) {
    if (!Array.isArray(pair) || pair.length !== 2)
      throw Error("Invalid visitor pairs.");
    for (const id of pair) {
      if (seen.has(id) || !g.visitorPool.some((p) => p.id === id))
        throw Error("Invalid visitor pairs.");
      seen.add(id);
    }
  }
}
