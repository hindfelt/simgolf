import { originalBuildingPaint } from "./original-building-paint.js";
import { originalBuildingRegistration } from "./original-building-registration.js";
import { originalDerivedMap } from "./original-derived-map.js";

// Composes 0x40dcf0. Call after feasibility succeeds, as the original caller
// does. Height mode and runtime metadata are caller-owned, not guessed here.
export function originalBuildingPlacement(options) {
  if (
    typeof options.createHeightReader !== "function" ||
    typeof options.metadata !== "function"
  )
    throw Error(
      "Original placement requires explicit height and metadata readers.",
    );
  const painted = originalBuildingPaint(options);
  const registered = originalBuildingRegistration({ ...options, ...painted });
  const state = {
    ...painted,
    ...registered,
    originalFlags: options.originalFlags,
  };
  if (!registered.needsMapRebuild) return { ...state, derivedMap: null };
  const derivedMap = originalDerivedMap({
    terrain: state.terrain,
    ownership: state.ownership,
    readHeight: options.createHeightReader(state),
    metadata: options.metadata,
    originalFlags: options.originalFlags,
  });
  return {
    ...state,
    originalFlags: derivedMap.originalFlags,
    needsMapRebuild: false,
    derivedMap,
  };
}
