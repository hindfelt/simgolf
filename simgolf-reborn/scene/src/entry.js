import {requireAccount, playerStorage} from "./account.js";
import {showBootScreen} from './boot-screen.js';
import {shouldShowStartMenu, showStartMenu, openStartDestination} from './start-menu.js';
const boot = showBootScreen();
try {
  const account = await requireAccount();
  let action;
  if (shouldShowStartMenu(location.search, import.meta.env.DEV)) {
    action = await showStartMenu({hasSave:!!playerStorage().getItem('simgolf-reborn.course.v1'), signedIn:!!account});
  }
  boot.preparing();
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("mode") === "art") {
    await import("./main.js");
  } else {
    await import("./play.js");
  }
  boot.ready();
  openStartDestination(action);
} catch(error) {
  boot.fail(error);
  console.error(error);
}
