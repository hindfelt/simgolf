import {originalRouteLandingReview} from './original-route-landing-review.js';
import {originalRouteFollowup} from './original-route-followup.js';
// 0x422c34–0x423098: review a landing, then evaluate its original follow-up shots.
export function originalRouteScoredLanding(q) {
 const review=originalRouteLandingReview(q);
 const landingClass=q.terrainAt({x:q.landing.x>>10,z:q.landing.z>>10}).shotClass;
 const followup=originalRouteFollowup({...q,...review,landingClass});
 return {...review,...followup};
}
