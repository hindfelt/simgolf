// Small isometric illustrations stay sharp at phone and desktop sizes.
export function constructionIcon(type) {
  const tile =
    '<path d="M5 31 36 14 67 31 36 49Z" fill="#4c643a" stroke="#42523e" stroke-width="2"/><path d="M7 28 36 12 65 28 36 44Z" fill="#86a94e" stroke="#b2c87c"/>';
  const flag =
    '<path d="M39 29V8" stroke="#eee9d7" stroke-width="2"/><path d="M40 8 52 12 40 16" fill="#ec695d"/>';
  const building =
    '<path d="m19 23 17-9 18 9v15l-18 9-17-10Z" fill="#ded8b8" stroke="#657052"/><path d="m16 23 19-14 23 13-20 11Z" fill="#945c43" stroke="#604734"/><path d="M38 32v13m7-17v8m7-12v8m-27-8v9" stroke="#45645b" stroke-width="3"/>';
  const art = {
    lighthouse: '<path d="M29 37 31 9h10l3 28Z" fill="#e9dfbe"/><path d="m30 17 12 4v5l-12-4Z" fill="#a44839"/><path d="m29 29 14 4v5l-14-4Z" fill="#a44839"/><path d="M29 9h14v6H29Z" fill="#627c80"/><path d="m27 9 9-7 9 7Z" fill="#9b4739"/>',
    fairway:
      '<path d="m13 28 24-12 21 12-24 12Z" fill="#a5bd5c"/><path d="m20 25 20 11m-12-15 20 11m-12-15 20 11" stroke="#779746" stroke-width="4"/>',
    firm: '<path d="m13 28 24-12 21 12-24 12Z" fill="#c4c57b"/><path d="m20 25 20 11m-12-15 20 11m-12-15 20 11" stroke="#9cac58" stroke-width="4"/>',
    tee:
      '<ellipse cx="36" cy="28" rx="17" ry="9" fill="#aaca6b"/><circle cx="26" cy="30" r="2" fill="white"/><circle cx="42" cy="23" r="2" fill="white"/>' +
      flag,
    green:
      '<ellipse cx="36" cy="28" rx="23" ry="12" fill="#b2ce60" stroke="#486936" stroke-width="3"/>' +
      flag,
    sand: '<path d="M18 29c-8-6 4-13 13-9s14-7 23 2-3 15-16 14-15 1-20-7Z" fill="#ede0b4" stroke="#4d713c" stroke-width="3"/>',
    water:
      '<path d="M15 27c-4-9 22-14 36-7s6 17-15 19-26-4-21-12Z" fill="#5fa9bb" stroke="#547341" stroke-width="3"/><path d="m23 27 10-2m4 7 12-2" stroke="#bbe0d2" stroke-width="2"/>',
    path: '<path d="m11 32 18-9 14 8 15-8" fill="none" stroke="#4b6738" stroke-width="10"/><path d="m11 32 18-9 14 8 15-8" fill="none" stroke="#d0c29a" stroke-width="6"/>',
    bridge:
      '<path d="m10 34 48-20" stroke="#75b2bd" stroke-width="12"/><path d="M21 36Q31 10 53 23L47 29Q32 20 27 40Z" fill="#c4ac7b" stroke="#5b4c39" stroke-width="2"/><path d="m24 32 9 1m-5-7 10 2m-3-6 10 3" stroke="#776142"/>',
    bench:
      '<path d="m20 27 29-14v8L20 36Z" fill="#a57b46" stroke="#654a30"/><path d="m18 34 31-15 7 5-30 16Z" fill="#c19c61"/><path d="M24 37v6m24-18v7" stroke="#554735" stroke-width="3"/>',
    tree: '<path d="M36 37V15" stroke="#785633" stroke-width="4"/><path d="M18 24 27 11 24 10 36 0 48 12 44 14 55 26Z" fill="#365c35" stroke="#234c34"/><path d="m23 20 13-15 11 14" fill="#68904a"/>',
    rocks:
      '<path d="m18 31 5-14 14-2 10 11-5 11Z" fill="#9c9c86" stroke="#666f5b"/><path d="m37 31 7-11 10 3 7 12-13 4Z" fill="#c1b9a2" stroke="#767962"/>',
    "out-of-bounds":
      '<path d="m15 35 39-23" stroke="#d6d9a2" stroke-dasharray="3 3"/><path d="M18 34V15m17 10V6m17 10V1" stroke="#fbf8e7" stroke-width="4"/>',
    raise:
      '<path d="m17 32 19-25 21 25-21 10Z" fill="#789641" stroke="#486333"/><path d="M36 27V6m-7 8 7-8 7 8" fill="none" stroke="#f0e6a1" stroke-width="3"/>',
    lower:
      '<path d="m15 24 21 13 22-13-22 19Z" fill="#52763c"/><path d="M36 5v22m-7-8 7 8 7-8" fill="none" stroke="#f0e6a1" stroke-width="3"/>',
    "rotate-tee":
      '<path d="M20 20a17 13 0 1 1-1 15M20 20l-1-9m1 9 10-2" fill="none" stroke="#e9dd8c" stroke-width="4"/>' +
      flag,
    flowerbed:
      '<path d="m16 30 21-12 21 12-21 12Z" fill="#6d4f32" stroke="#b5935e"/><path d="M26 30v-9m10 14V19m10 8v-9" stroke="#456733" stroke-width="3"/><circle cx="26" cy="20" r="5" fill="#d483b1"/><circle cx="36" cy="19" r="5" fill="#e8d7ad"/><circle cx="46" cy="17" r="5" fill="#d87961"/>',
    ballwasher:
      '<path d="M35 39V18" stroke="#d6d2b6" stroke-width="3"/><rect x="28" y="12" width="15" height="13" rx="3" fill="#45614c" stroke="#c4cba7"/><path d="M36 12V7m-5 0h10" stroke="#d6d2b6" stroke-width="2"/><path d="M43 23v10" stroke="#eee9d7" stroke-width="5"/>',
    "building-lot": '<path d="M18 37V16h35v18H18m18 0v9" fill="#eee3bd" stroke="#795e40" stroke-width="3"/><text x="24" y="29" font-size="12" fill="#45633b">LOT</text>',
    marina:
      '<path d="m13 27 23-12 25 12-25 14Z" fill="#72aab0"/><path d="m14 26 23-12 4 2-23 12m8-4 15 8m-7-12 15 8" fill="none" stroke="#b99562" stroke-width="4"/>',
    church: '<path d="m18 27 19-10 17 10v12L36 47 18 38Z" fill="#b7b299"/><path d="m17 26 19-16 19 16-19 9Z" fill="#596563"/><path d="M39 15h12v23l-12 6Z" fill="#c2bca3"/><path d="M45 16V5m-4 4h8" stroke="#e5dbb6" stroke-width="2"/>',
    helipad:
      '<path d="m13 27 23-12 25 12-25 14Z" fill="#828e7c"/><ellipse cx="37" cy="27" rx="14" ry="8" fill="none" stroke="#f0e7c1"/><text x="31" y="31" font-size="14" fill="#f0e7c1">H</text>',
    airstrip:
      '<path d="m9 32 46-22 8 8-46 23Z" fill="#737b71"/><path d="m17 33 38-18" stroke="#e7dfc0" stroke-width="2" stroke-dasharray="5 3"/>',
    stable:
      '<path d="m19 23 19-9 19 9v14L38 46 19 36Z" fill="#b5ae91"/><path d="m14 23 24-17 24 17-24 10Z" fill="#616859"/><path d="M31 30v12l11-5V25Z" fill="#674e37"/>',
    spa: '<path d="m14 23 25-11 22 11v10L37 44 14 33Z" fill="#d3ad7d"/><ellipse cx="35" cy="31" rx="13" ry="7" fill="#eae0b5"/><ellipse cx="35" cy="31" rx="10" ry="5" fill="#6ab5b8"/>',
    "swim-club":
      '<path d="m12 27 25-13 24 13-25 14Z" fill="#d9c08b"/><path d="m20 27 17-9 16 9-17 10Z" fill="#67bbc0" stroke="#fff0bb" stroke-width="2"/><path d="m23 27 9 5m-3-8 9 5" stroke="#c5edda"/>',
    "tennis-court":
      '<path d="m12 27 25-13 24 13-25 14Z" fill="#c17553"/><path d="m20 27 17-9 16 9-17 10Z" fill="#47775e" stroke="#eee9ce"/><path d="m27 20 19 11" stroke="#e9e1c8" stroke-width="2"/>',
    inspect:
      '<path d="m28 8 2 28 7-8 11 3Z" fill="#f4e9b9" stroke="#5c5749" stroke-width="2"/>',
    demolish:
      '<path d="m23 14 28 22m-1-22L24 36" stroke="#883e33" stroke-width="7"/>',
  };
  art["cart-garage"] =
    building +
    '<rect x="26" y="29" width="21" height="8" rx="2" fill="#47785b"/><circle cx="29" cy="39" r="3" fill="#303832"/><circle cx="44" cy="39" r="3" fill="#303832"/>';
  art.hotel = `<g transform="translate(0,-8)">${building}</g>${building}`;
  art["pro-shop"] = art.snack = building;
  art["driving-range"] =
    art.fairway +
    '<path d="m16 25 6-16 17 9-4 15Z" fill="#dedcc0" stroke="#738366"/>' +
    flag;
  art["putting-green"] = art.green;
  art.cup = flag;
  art["trim-green"] = art.green;
  art["pot-bunker"] = art.sand;
  art["waste-bunker"] = art.sand;
  art["clear-boundary"] = art["out-of-bounds"] + art.demolish;
  const grass =
    '<path d="m20 31-2-10m2 10 5-9m4 3 1-12m0 12 5-6m7 12-1-12m0 12 7-9" stroke="#355e30" stroke-width="3"/>';
  art.rough = art["deep-rough"] = art.brush = grass;
  return `<svg viewBox="0 0 72 52" aria-hidden="true" focusable="false">${tile}${art[type] || grass}</svg>`;
}
