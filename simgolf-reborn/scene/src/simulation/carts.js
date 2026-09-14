export const cartSurface = (surface) =>
  ["path", "fairway", "firm"].includes(surface);

export const ridesCart = (v, surface) =>
  !!v.hasCart &&
  !v.pro &&
  !!v.cartPosition &&
  Math.hypot(v.pos.x - v.cartPosition.x, v.pos.z - v.cartPosition.z) <= 0.3 &&
  v.phase === "walking" &&
  cartSurface(surface);
