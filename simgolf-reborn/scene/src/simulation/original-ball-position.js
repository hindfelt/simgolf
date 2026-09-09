const int32 = n => Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff;
// 0x491380 creates 256 entries with x87 sin and truncation. Constants are
// the doubles at 0x4baa50/0x4baa48. The following BSS word starts at zero;
// a different runtime table can be supplied when comparing original captures.
export const ORIGINAL_SINE_TABLE = Object.freeze([
  ...Array.from({ length: 256 }, (_, i) => Math.trunc(Math.sin(i * 0.006159985596078431) * 65535)),
  0,
]);

// 0x466b40 folds the angle before calling 0x4913e0. All multiply/shift
// operations below deliberately retain the original signed 32-bit behavior.
export function originalSine(heading, magnitude, table = ORIGINAL_SINE_TABLE) {
  if (!Number.isInteger(heading) || heading < 0 || heading > 0xffffffff || !int32(magnitude) ||
      table.length !== 257 || !table.every(int32))
    throw Error("Invalid original direction inputs.");
  let angle = heading;
  if (angle & 0x80000000) {
    magnitude = -magnitude | 0;
    angle &= 0x7fffffff;
  }
  if (angle & 0x40000000) angle = 0x7fffffff - angle;
  const index = angle >>> 22, fraction = angle & 0x3fffff;
  const interpolated = (table[index] + (Math.imul(table[index + 1] - table[index], fraction) >> 22)) | 0;
  if (magnitude < 0xffff) return Math.imul(interpolated, magnitude) >> 16;
  if (magnitude < 0xffffff) return Math.imul(interpolated, magnitude >> 8) >> 8;
  return Math.imul(interpolated, magnitude >> 16);
}

// Position block 0x42bddd–0x42be5b, before ground response or collisions.
// Fixed-point coordinates use 1024 units per original tile. Heading zero
// moves toward decreasing z. Height uses verticalSpeed/32 independently.
export function originalBallPositionStep({ x, z, height, speed, verticalSpeed, heading }, table = ORIGINAL_SINE_TABLE) {
  if (![x, z, height, speed, verticalSpeed].every(int32))
    throw Error("Invalid original position state.");
  const distance = Math.trunc(speed / 16);
  const dx = originalSine(heading, distance, table);
  const dz = originalSine((heading + 0x40000000) >>> 0, distance, table);
  return {
    x: (x + dx) | 0,
    z: (z - dz) | 0,
    height: (height + Math.trunc(verticalSpeed / 32)) | 0,
  };
}
