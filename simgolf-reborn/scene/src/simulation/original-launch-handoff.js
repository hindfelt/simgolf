// State written by shared preparation before the automatic-only middle.
// Return an update for the existing context, retaining unrelated golfer fields.
export function originalLaunchHandoff(inputHeading,prepared) {
 const a=prepared.assessment;
 return {distance:prepared.strength,heading:prepared.heading,
  referenceSpeed:prepared.referenceSpeed,modifier:prepared.modifier,curveArgument:prepared.curve,
  aimHeading:((((inputHeading|0)>>28)+1)>>1)&7,
  pathHeading:a.dominantDirection,cueValue:a.dominantCode,
  state:{seed:prepared.seed,cache:structuredClone(prepared.cache),speed:prepared.speed,
   verticalSpeed:prepared.verticalSpeed,heading:prepared.heading,
   scannedTile:0,namedReference:0,sceneryTile:a.markedTerrain,pathHeading:a.sampleX,
   actor:{club:prepared.club,actorFlags:prepared.actorFlags,angularOffset:prepared.angularOffset,
    stateCode:prepared.shotType,elevationCounter:a.rating}}};
}
