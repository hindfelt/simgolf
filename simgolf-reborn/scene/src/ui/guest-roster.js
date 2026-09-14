import { MEMBERSHIP_TIERS } from "../simulation/membership.js";
import { APPEARANCE_OPTIONS } from "../simulation/appearance.js";
import {
  PERSONALITY_TRAITS,
  compatibilityHappiness,
} from "../simulation/personality.js";
export function renderGuestRoster(root, game, actions) {
  root.replaceChildren();
  const summary = document.createElement("p");
  summary.textContent = `${game.visitorPool.length} golfers in your visitor pool · ${game.guestRoster.length} have visited. ${game.memberships.filter((m) => m.tier > 0).length} members · ${game.memberships.filter((m) => m.application).length} pending applications.`;
  root.append(summary);
  for (const m of game.memberships.filter((m) => m.application)) {
    const section = document.createElement("section");
    section.setAttribute("aria-label", "Membership application");
    const text = document.createElement("p");
    text.textContent =
      game.visitorPool.find((p) => p.id === m.golferId).name +
      " applies for " +
      MEMBERSHIP_TIERS[m.application.tier] +
      " membership.";
    section.append(text);
    if (actions?.membership)
      for (const [label, accept] of [
        ["Accept membership", true],
        ["Decline membership", false],
      ]) {
        const button = document.createElement("button");
        button.textContent = label;
        button.style.minHeight = "44px";
        button.onclick = () => actions.membership(m.golferId, accept);
        section.append(button);
      }
    root.append(section);
  }
  const records = [
    ...game.guestRoster,
    ...game.visitorPool
      .filter((p) => !game.guestRoster.some((r) => r.id === p.id))
      .map((p) => ({ ...p, rounds: 0, best: null })),
  ];
  if (!records.length) {
    const empty = document.createElement("p");
    empty.textContent = "Open a hole to welcome your first visitors.";
    root.append(empty);
    return;
  }
  if (actions) {
    const controls = document.createElement("div");
    controls.className = "actions";
    Object.assign(controls.style, {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
    });
    const selects = ["First golfer", "Second golfer"].map((name, index) => {
      const select = document.createElement("select");
      select.setAttribute("aria-label", name);
      select.style.maxWidth = "100%";
      select.style.minHeight = "44px";
      for (const p of game.visitorPool) {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        select.append(option);
      }
      select.selectedIndex = index;
      controls.append(select);
      return select;
    });
    const personalities = document.createElement("div");
    personalities.setAttribute("aria-label", "Partner personalities");
    const describe = () => {
      personalities.replaceChildren();
      const people = selects.map((select) =>
        game.visitorPool.find((p) => p.id === Number(select.value)),
      );
      for (const person of people) {
        const p = document.createElement("p");
        p.textContent =
          person.name +
          ": " +
          PERSONALITY_TRAITS.map(
            (trait) =>
              trait[0].toUpperCase() +
              trait.slice(1) +
              " " +
              person.personality[trait] +
              "/10",
          ).join(" · ");
        personalities.append(p);
      }
      const note = document.createElement("p");
      const delta = compatibilityHappiness(
        people[0].personality,
        people[1].personality,
      );
      note.textContent =
        people[0].id === people[1].id
          ? "Choose two different golfers."
          : delta > 0
            ? "Similar personalities — a happier start together."
            : delta < 0
              ? "Very different personalities — a less happy start together."
              : "Mixed personalities — no starting happiness adjustment.";
      personalities.append(note);
    };
    selects.forEach((select) => (select.onchange = describe));
    describe();
    const pair = document.createElement("button");
    pair.textContent = "Pair golfers";
    pair.style.minHeight = "44px";
    pair.onclick = () =>
      actions.pair(Number(selects[0].value), Number(selects[1].value));
    controls.append(pair);
    root.append(controls, personalities);
    if (actions.appearance) {
      const editor = document.createElement("details");
      const heading = document.createElement("summary");
      heading.textContent = "Customize first golfer";
      heading.style.cssText =
        "cursor:pointer;min-height:44px;align-content:center";
      editor.append(heading);
      const nameInput = document.createElement("input");
      if (actions.rename) {
        const label = document.createElement("label");
        label.textContent = "Name";
        nameInput.setAttribute("aria-label", "Visitor name");
        nameInput.maxLength = 80;
        nameInput.style.cssText =
          "display:block;width:100%;box-sizing:border-box;min-height:44px;margin:4px 0 8px";
        label.append(nameInput);
        const rename = document.createElement("button");
        rename.textContent = "Save name";
        rename.style.minHeight = "44px";
        rename.onclick = () =>
          actions.rename(Number(selects[0].value), nameInput.value);
        editor.append(label, rename);
      }
      const fields = {};
      for (const [key, options] of Object.entries(APPEARANCE_OPTIONS)) {
        const label = document.createElement("label");
        label.textContent =
          key === "body"
            ? "Clothing style"
            : key[0].toUpperCase() + key.slice(1);
        label.style.display = "block";
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Visitor " + key);
        select.style.cssText =
          "display:block;width:100%;min-height:44px;margin:4px 0 8px";
        options.forEach((name, value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = name;
          select.append(option);
        });
        fields[key] = select;
        label.append(select);
        editor.append(label);
      }
      const fill = () => {
        const p = game.visitorPool.find(
          (p) => p.id === Number(selects[0].value),
        );
        nameInput.value = p.name;
        for (const [key, select] of Object.entries(fields))
          select.value = String(p.appearance[key]);
      };
      fill();
      selects[0].addEventListener("change", fill);
      const save = document.createElement("button");
      save.textContent = "Save appearance";
      save.style.minHeight = "44px";
      save.onclick = () =>
        actions.appearance(
          Number(selects[0].value),
          Object.fromEntries(
            Object.entries(fields).map(([key, select]) => [
              key,
              Number(select.value),
            ]),
          ),
        );
      editor.append(save);
      root.append(editor);
    }
    const explanation = document.createElement("p");
    explanation.textContent =
      "Chosen partners wait for each other before starting a new round. Rounds already underway keep their current partners.";
    root.append(explanation);
    for (const pair of game.visitorPairs) {
      const row = document.createElement("p");
      row.textContent =
        pair
          .map((id) => game.visitorPool.find((p) => p.id === id).name)
          .join(" + ") + " ";
      const clear = document.createElement("button");
      clear.textContent = "Unpair";
      clear.style.minHeight = "44px";
      clear.setAttribute(
        "aria-label",
        "Unpair " +
          pair
            .map((id) => game.visitorPool.find((p) => p.id === id).name)
            .join(" and "),
      );
      clear.onclick = () => actions.clear(pair[0]);
      row.append(clear);
      root.append(row);
    }
  }
  const scroll = document.createElement("div");
  scroll.style.overflowX = "auto";
  const table = document.createElement("table");
  table.setAttribute("aria-label", "Membership roster");
  const head = document.createElement("thead"),
    header = document.createElement("tr");
  for (const title of [
    "Golfer",
    "Status",
    "Rounds",
    "Interrupted",
    "Best round",
    "Visit",
  ]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = title;
    header.append(th);
  }
  head.append(header);
  table.append(head);
  const body = document.createElement("tbody");
  for (const p of records) {
    const row = document.createElement("tr");
    const active = game.guests.find(
      (v) => v.id === p.id && v.phase !== "departed",
    );
    const relative = p.best ? p.best.strokes - p.best.par : null;
    for (const value of [
      p.name,
      MEMBERSHIP_TIERS[
        game.memberships.find((m) => m.golferId === p.id)?.tier ?? 0
      ],
      p.rounds,
      p.interruptedVisits || 0,
      p.best
        ? `${p.best.strokes} (${relative === 0 ? "E" : relative > 0 ? `+${relative}` : relative}) · ${p.best.holes} holes`
        : "—",
      active
        ? active.paid
          ? "Leaving"
          : "On course"
        : p.rounds || p.interruptedVisits
          ? "Departed"
          : "Yet to visit",
    ]) {
      const td = document.createElement("td");
      td.textContent = String(value);
      row.append(td);
    }
    body.append(row);
  }
  table.append(body);
  scroll.append(table);
  root.append(scroll);
  for (const visit of (game.interruptedRounds || []).slice(0, 10)) {
    const line = document.createElement("p");
    line.textContent = `${visit.name}: interrupted (${visit.reason}) after ${visit.scorecard.length} completed holes. Unfinished hole: ${visit.strokes} strokes played.`;
    root.append(line);
  }
}
