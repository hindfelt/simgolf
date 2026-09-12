import {signOutAccount} from './account.js';
// Deep links enter their requested game directly; the hosted home page opens
// the menu. Local development can preview it with ?start=1.
export function shouldShowStartMenu(search, development) {
  const params = new URLSearchParams(search);
  if ([...params.keys()].some(key => key !== 'start')) return false;
  return !development || params.get('start') === '1';
}

export function showStartMenu({hasSave, signedIn, playerName}) {
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
      button.onclick = () => { menu.remove(); screen.querySelector('.start-identity')?.remove(); resolve(action); };
      menu.append(button);
    }
    const identity=document.createElement('p');identity.className='start-identity';
    identity.textContent=signedIn?`Signed in as ${playerName || 'Player'}`:'Local preview · not signed in';
    if(signedIn){
      const logout=document.createElement('button');logout.id='start-sign-out';logout.textContent='Sign out';
      logout.onclick=async()=>{
        const buttons=[...menu.querySelectorAll('button'),logout],previous=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
        try{await signOutAccount();}catch(error){status.textContent=error.message;buttons.forEach((b,i)=>b.disabled=previous[i]);}
      };
      identity.append(document.createElement('br'),logout);
    }
    screen.querySelector('.boot-content').append(menu,identity);
    menu.querySelector('button:not(:disabled)').focus();
  });
}

export function openStartDestination(action) {
  if(action === 'new') document.querySelector('#new')?.click();
  if(action === 'multiplayer') document.querySelector('#player-account')?.click();
  if(action === 'club') document.querySelector('#menu-button')?.click();
}
