import { RULES } from "./rules.js";
export function staffUpgrade(s) {
  if (s?.role === "ranger")
    return {
      role: "marshall",
      title: "Marshall",
      cost: RULES.marshallHireCost - RULES.rangerHireCost,
    };
  if (s?.role === "groundskeeper")
    return {
      role: "technician",
      title: "Turf Technician",
      cost: RULES.technicianHireCost - RULES.hireCost,
    };
  if (s?.role === "club-pro")
    return {
      role: "celebrity",
      title: "Celebrity",
      cost: RULES.celebrityHireCost - RULES.clubProHireCost,
    };
  if (s?.role === "vendor")
    return {
      role: "consultant",
      title: "Refreshment Consultant",
      cost: RULES.consultantHireCost - RULES.vendorHireCost,
    };
  return null;
}
