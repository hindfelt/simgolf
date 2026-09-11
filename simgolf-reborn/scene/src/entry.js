if (import.meta.env.DEV && new URLSearchParams(location.search).get("mode") === "art") {
  await import("./main.js");
} else {
  await import("./play.js");
}
