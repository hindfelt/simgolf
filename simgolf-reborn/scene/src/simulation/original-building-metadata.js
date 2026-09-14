import catalog from "../content/original-buildings.json" with { type: "json" };

// Startup names/cost units; regional renames and size extensions are separate.
export function originalBuildingMetadata(type) {
  if (!Number.isInteger(type) || type < 0 || type >= catalog.buildings.length)
    throw Error("Unknown original building type.");
  return { ...catalog.buildings[type] };
}
