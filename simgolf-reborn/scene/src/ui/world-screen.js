import catalog from "../content/original-properties.json" with { type: "json" };
import { createOriginalWorldOffers } from "../simulation/world-offers.js";
import "./world-screen.css";

export function createWorldScreen() {
  const dialog = document.createElement("dialog");
  dialog.id = "world-dialog";
  dialog.setAttribute("aria-labelledby", "world-title");
  dialog.innerHTML = `<form method="dialog"><button class="close" aria-label="Close World Screen">×</button></form>
    <small>WORLD SCREEN · PREVIEW</small><h2 id="world-title">A world of golf</h2>
    <p>Explore the original sixteen properties. Property purchases and travel are not available yet.</p>
    <div class="world-layout"><nav class="world-properties" aria-label="World properties"></nav>
    <section class="world-detail" aria-live="polite"></section></div>`;
  document.body.append(dialog);
  const list = dialog.querySelector("nav");
  const detail = dialog.querySelector("section");
  // Stable preview, isolated from the resort's RNG and future career ownership.
  const world = createOriginalWorldOffers(1);
  const money = (value) => "§" + value.toLocaleString("en-US");
  const select = (offer) => {
    const property = catalog.properties[offer.tableIndex];
    list
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          Number(button.dataset.slot) === offer.slot,
        ),
      );
    detail.replaceChildren();
    const add = (tag, text, className) => {
      const node = document.createElement(tag);
      node.textContent = text;
      if (className) node.className = className;
      detail.append(node);
      return node;
    };
    add("small", property.location);
    add("h3", property.name);
    add("p", money(offer.priceSimoleons), "world-price");
    add("p", offer.acres + " acres · " + property.relief + " terrain");
    const descriptions = document.createElement("dl");
    for (const [label, value] of [
      ["Environment", property.environment],
      ["Setting", property.geography],
      ["Property bonus", property.bonusLabel],
    ]) {
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      descriptions.append(term, description);
    }
    detail.append(descriptions);
    add(
      "p",
      "Preview world: property order and acreage vary between worlds.",
      "world-note",
    );
  };
  for (const offer of world.offers) {
    const property = catalog.properties[offer.tableIndex];
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.slot = offer.slot;
    button.setAttribute("aria-label", property.name);
    const name = document.createElement("strong");
    name.textContent = property.name;
    const caption = document.createElement("span");
    caption.textContent =
      property.location + " · " + money(offer.priceSimoleons);
    button.append(name, caption);
    button.onclick = () => select(offer);
    list.append(button);
  }
  select(world.offers[0]);
  return dialog;
}
