// Original difficulty menu 0x439a70, stored at 0x820344 by 0x4209ce.
// Special internal values (e.g. 5/6) are not normal menu difficulties.
export const ORIGINAL_DIFFICULTIES = Object.freeze([
  "Easy",
  "Moderate",
  "Difficult",
  "Impossible",
]);
export function originalDifficulty(name) {
  const code = ORIGINAL_DIFFICULTIES.indexOf(name);
  if (code < 0)
    throw Error(
      "Choose an original difficulty: Easy, Moderate, Difficult or Impossible.",
    );
  return {
    code,
    name,
    minimumGeneratedHeight: code === 0 ? 3 : 4,
    featureOverrideBound: code < 2 ? null : Math.trunc(8 / (code - 1)),
  };
}
