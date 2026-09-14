// Exact integer approximation from golf.exe 0x466ba0–0x466cad.
// Full turn = 2^32. Zero points toward negative z; east = 0x40000000.
export function originalHeading(dx, dz) {
  if (![dx,dz].every(n => Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff))
    throw Error('Invalid original heading vector.');
  const x = dx | 0, z = -dz | 0;
  if (x === 0) return z > 0 ? 0 : 0x80000000;
  if (z === 0) return x > 0 ? 0x40000000 : 0xc0000000;
  const ax = Math.abs(x) | 0, az = Math.abs(z) | 0;
  const wide = ax > az;
  const numerator = (wide ? az : ax) << 14;
  const denominator = wide ? ax : az;
  const ratio = Math.trunc(numerator / denominator) | 0;
  const distance = Math.abs((0x1333 - ratio) | 0) | 0;
  const adjustment = (Math.imul(distance, 11) << 8) >> 14;
  const curve = Math.imul((0x2800 - adjustment) | 0, ratio) >> 14;
  const angle = x > 0
    ? z > 0 ? (wide ? 0x4000 - curve : curve) : (wide ? curve + 0x4000 : 0x8000 - curve)
    : z > 0 ? (wide ? curve + 0xc000 : -curve) : (wide ? 0xc000 - curve : curve + 0x8000);
  return (angle << 16) >>> 0;
}
