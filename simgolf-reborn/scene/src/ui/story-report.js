export function renderStoryReport(root, game, onPlace) {
  root.replaceChildren();
  const story = game.openingStory;
  const add = (tag, text) => {
    const node = document.createElement(tag);
    node.textContent = text;
    root.append(node);
    return node;
  };
  if (!story) {
    add(
      "p",
      "No story has started. Open a hole and welcome your first visiting pair.",
    );
    return;
  }
  add("h3", "Opening Day");
  add("p", story.names.join(" and "));
  const status =
    story.status === "happy-ending"
      ? "Happy ending"
      : story.status === "unfinished"
        ? story.progress.attempts < 128
          ? "Paused — waiting for these golfers to return together"
          : "Unfinished — the conversation reached its attempt limit"
        : `Chapter ${story.progress.chapter + 1} of 4`;
  const summary = add("p", status);
  summary.className = "story-status";
  add(
    "p",
    `${story.progress.chapter} chapters completed · ${story.progress.attempts} replies`,
  );
  if (story.status === "happy-ending")
    add("p", "The conversation reached its happy ending!");
  if (story.status === "happy-ending") {
    if (story.rewardFacilityId !== undefined)
      add("p", "Commemorative garden already claimed.");
    else if (onPlace) {
      const button = add("button", "Place commemorative garden · Free");
      button.id = "place-story-reward";
      button.onclick = onPlace;
    }
  }
  const list = add("ol", "");
  list.className = "story-transcript";
  for (const line of story.lines) {
    const item = document.createElement("li"),
      name = document.createElement("strong"),
      text = document.createElement("p");
    name.textContent = story.names[story.partners.indexOf(line.speaker)];
    text.textContent = line.text;
    item.append(name, text);
    list.append(item);
  }
  if (!story.lines.length) add("p", "The golfers have not spoken yet.");
}
