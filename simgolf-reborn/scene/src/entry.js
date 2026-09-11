import {requireAccount} from "./account.js";
try {await requireAccount();} catch(error) {document.body.textContent=error.message;throw error;}
if (import.meta.env.DEV && new URLSearchParams(location.search).get("mode") === "art") {
  await import("./main.js");
} else {
  await import("./play.js");
}
