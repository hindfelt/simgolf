// golf.exe 0x45ba70 / 0x45bab0. State at entry must be supplied explicitly.
export function originalRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw Error("Original RNG seed must be an unsigned 32-bit integer.");
  let state = seed;
  let draws = 0;
  return {
    next(bound) {
      if (!Number.isInteger(bound) || bound < 1 || bound > 0xffff)
        throw Error("Original RNG bound must be between 1 and 65535.");
      state = (Math.imul(state, 0x41c64e6d) + 0x3039) >>> 0;
      draws++;
      return Math.floor((((state >>> 16) & 0x7fff) * bound) / 32768);
    },
    get state() {
      return state;
    },
    get draws() {
      return draws;
    },
  };
}
