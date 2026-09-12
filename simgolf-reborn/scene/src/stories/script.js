// Source format: supplied Themes/*/*.txt files. Filename pairing codes are
// preserved, not interpreted until their full original mapping is established.
export function parseStory(filename, source) {
  if (
    typeof filename !== "string" ||
    !/^[A-Za-z]{8}.+\.txt$/i.test(filename) ||
    typeof source !== "string" ||
    source.length > 64000 ||
    source.includes("\0")
  )
    throw Error("Invalid story source.");
  const lines = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const titleIndex = lines.findIndex((line) => line.trim());
  if (titleIndex < 0) throw Error("Story has no title.");
  const title = lines[titleIndex].trim(),
    stages = [];
  let block = [];
  function flush() {
    if (!block.length) return;
    if (block.length < 2) throw Error("Story stage needs at least one reply.");
    stages.push({
      prompt: block[0].trim(),
      replies: block.slice(1).map((line) => line.trim()),
    });
    block = [];
  }
  let bodyIndex = titleIndex + 1;
  const credits = [];
  if (
    lines[bodyIndex]?.trim() &&
    (/^\s/.test(lines[bodyIndex]) || /^(by |[-–])/i.test(lines[bodyIndex]))
  )
    credits.push(lines[bodyIndex++].trim());
  for (const line of lines.slice(bodyIndex)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      flush();
      block.push(line);
    } else {
      if (!block.length) throw Error("Reply has no chapter prompt.");
      block.push(line);
    }
  }
  flush();
  if (
    !stages.length ||
    stages.length > 32 ||
    title.length > 100 ||
    stages.some(
      (s) =>
        s.replies.length > 32 ||
        [s.prompt, ...s.replies].some((t) => t.length > 1000),
    )
  )
    throw Error("Invalid story structure.");
  return {
    id: filename.slice(0, -4),
    pairingCode: filename.slice(0, 8),
    title,
    credits,
    stages,
  };
}
export function storyLine(script, stage, reply, partnerName) {
  if (
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage >= script.stages.length ||
    typeof partnerName !== "string" ||
    partnerName.length > 80
  )
    throw Error("Invalid story line request.");
  const part = script.stages[stage];
  const line =
    reply === null
      ? part.prompt
      : Number.isInteger(reply) && reply >= 0 && reply < part.replies.length
        ? part.replies[reply]
        : null;
  if (line === null) throw Error("Invalid story reply.");
  return line.replace(/\bPARTNER\b/g, () => partnerName);
}
