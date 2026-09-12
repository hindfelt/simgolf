// Names are display data; relationships and membership use stable golfer IDs.
export function renameVisitor(g, golferId, value) {
  const person = g.visitorPool.find((p) => p.id === golferId);
  if (!person)
    return { ok: false, message: "Choose a golfer from your visitor pool." };
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value))
    return { ok: false, message: "Enter a name without control characters." };
  const name = value.trim();
  if (!name || name.length > 80)
    return { ok: false, message: "Use a name between 1 and 80 characters." };
  person.name = name;
  for (const p of [...g.guests, ...g.guestRoster])
    if (p.id === golferId) p.name = name;
  // Completed scorecards, dialogue and ledger entries retain their recorded names.
  g.revision++;
  return { ok: true, message: name + "’s name saved." };
}
