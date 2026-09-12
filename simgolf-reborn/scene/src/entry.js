import {requireAccount, playerStorage} from "./account.js";
import {showBootScreen} from './boot-screen.js';
import {shouldShowStartMenu, showStartMenu, openStartDestination} from './start-menu.js';
import {createMenuMusic} from './menu-music.js';
const boot = showBootScreen();
const music = createMenuMusic(document.querySelector('#boot-screen'));
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
  const openingDialog = document.querySelector('dialog[open]');
  if(action && action !== 'continue' && openingDialog) {
    music.mount(openingDialog);
    openingDialog.addEventListener('close', () => music.stop(), {once:true});
  } else music.stop();
} catch(error) {
  boot.fail(error);
  console.error(error);
}
