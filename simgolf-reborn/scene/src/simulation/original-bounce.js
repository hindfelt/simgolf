const int32 = n => Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff;

// 0x42be61–0x42be95, after integrating height. Visual object callbacks
// around the apex are omitted; gravity is independent of that callback.
export function originalGravityStep({ height, verticalSpeed }) {
  if (![height, verticalSpeed].every(int32)) throw Error('Invalid original vertical state.');
  return height !== 0 || verticalSpeed !== 0 ? (verticalSpeed - 64) | 0 : 0;
}

// 0x42c527–0x42c5e8. Called after motion and other collision handling.
// The following apparently unreachable tricky-green deflection is excluded.
export function originalBounce({ height, verticalSpeed, bounceCoefficient, boundaryFlags }) {
  if (![height, verticalSpeed, boundaryFlags].every(int32) ||
      !Number.isInteger(bounceCoefficient) || bounceCoefficient < -128 || bounceCoefficient > 127)
    throw Error('Invalid original bounce state.');
  if (height > 0 || verticalSpeed >= 0)
    return { height, verticalSpeed, landed: false, impactEffect: false };
  const coefficient = bounceCoefficient < 2 && boundaryFlags !== 0 ? 2 : bounceCoefficient;
  const product = Math.imul(coefficient, verticalSpeed);
  const rebound = Math.max(0, Math.min(9999, -64 - Math.trunc(product / 12)));
  return { height: 0, verticalSpeed: rebound < 128 ? 0 : rebound,
    landed: true, impactEffect: verticalSpeed < -256 };
}
