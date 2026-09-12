// Deep links enter their requested game directly; the hosted home page opens
// the menu. Local development can preview it with ?start=1.
export function shouldShowStartMenu(search, development) {
  const params = new URLSearchParams(search);
  if ([...params.keys()].some(key => key !== 'start')) return false;
  return !development || params.get('start') === '1';
}

export function showStartMenu({hasSave, signedIn}) {
  const screen = document.getElementById('boot-screen');
  screen.setAttribute('aria-label', 'Fairway Baron start menu');
  const status = screen.querySelector('.boot-status');
  status.textContent = hasSave ? 'Your resort awaits.' : 'Create your first golf resort.';
  const menu = document.createElement('nav');
  menu.className = 'start-actions';
  menu.setAttribute('aria-label', 'Start game');
  return new Promise(resolve => {
    for (const [action, label] of [['continue','Continue'],['new','New Game'],['multiplayer','Multiplayer'],['club','Club & saves']]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.disabled = (action === 'continue' && !hasSave) || (action === 'multiplayer' && !signedIn);
      if(action === 'multiplayer' && !signedIn) button.title = 'Sign in on the hosted game to use multiplayer.';
      button.onclick = () => { menu.remove(); resolve(action); };
      menu.append(button);
    }
    screen.querySelector('.boot-content').append(menu);
    menu.querySelector('button:not(:disabled)').focus();
  });
}

export function openStartDestination(action) {
  if(action === 'new') document.querySelector('#new')?.click();
  if(action === 'multiplayer') document.querySelector('#player-account')?.click();
  if(action === 'club') document.querySelector('#menu-button')?.click();
}
