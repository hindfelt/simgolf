import { lotValue } from "../simulation/housing.js";
import { connected, tile } from "../simulation/game.js";

export function renderHousingReport(root, g) {
  root.replaceChildren();
  const text = (tag, value, parent = root) => {
    const node = document.createElement(tag);
    node.textContent = value;
    parent.append(node);
    return node;
  };
  const cash = (value) => `$${value.toLocaleString("en-US")}`;
  const sales = g.housingSales || [];
  const lots = g.facilities.filter((f) => f.type === "building-lot");
  text(
    "p",
    `${lots.length} vacant lots · ${sales.length} recorded home sales · ${cash(sales.reduce((sum, s) => sum + s.amount, 0))} total sale income`,
  );
  text(
    "p",
    "Prices and buyer eligibility are provisional. Connect lots to the clubhouse path; golfers who have completed a round can buy one home.",
  );
  text("h3", "Available lots");
  if (!lots.length)
    text(
      "p",
      "Build a Building Lot from the Resort palette to offer a home site.",
    );
  for (const lot of lots) {
    const section = document.createElement("section");
    root.append(section);
    const value = lotValue(g, lot, connected, tile);
    text("h4", `Lot ${lot.id} · tile ${lot.c + 1}, ${lot.r + 1}`, section);
    text(
      "p",
      `${connected(g, lot) ? "Connected — available for purchase" : "Needs a clubhouse path connection"} · Estimated sale ${cash(value.amount)}`,
      section,
    );
    text(
      "p",
      `Site value including scenery: ${cash(value.base)} · Marina / Helipad / Church bonus: ${cash(value.bonus)}`,
      section,
    );
  }
  text("h3", "Home sale history");
  if (!sales.length) text("p", "No homes sold yet.");
  for (const sale of [...sales].reverse()) {
    const buyer = g.guestRoster.find((p) => p.id === sale.buyerId);
    const exists = g.facilities.some(
      (f) => f.id === sale.facilityId && f.type === "home",
    );
    const section = document.createElement("section");
    root.append(section);
    text(
      "h4",
      `${buyer?.name || "Former golfer"} · Home ${sale.facilityId}`,
      section,
    );
    text(
      "p",
      `${exists ? "Home on course" : "Home removed"} · Sold for ${cash(sale.amount)}`,
      section,
    );
    text(
      "p",
      `Site value at sale: ${cash(sale.base)} · Marina / Helipad / Church bonus at sale: ${cash(sale.bonus)} · Ledger receipt ${sale.ledgerId}`,
      section,
    );
  }
  const imported = g.facilities.filter(
    (f) => f.type === "home" && !sales.some((s) => s.facilityId === f.id),
  );
  if (imported.length)
    text(
      "p",
      `${imported.length} homes belong to this imported course layout. Buyer identities and sale income are not included in course sharing.`,
    );
}
