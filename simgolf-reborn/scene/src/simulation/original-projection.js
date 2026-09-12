import {originalSine} from './original-ball-position.js';
// Both route sampling and ball movement use the original integer projection.
// z is the cosine component: map callers subtract it from their z origin.
export function originalProjection(heading,radius) {
 return {x:originalSine(heading,radius),z:originalSine((heading+0x40000000)>>>0,radius)};
}
