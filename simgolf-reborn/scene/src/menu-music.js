import './menu-music.css';

// A single player spans loading and the opening menus. Never attached to the
// game clock, so simulation speed cannot affect the soundtrack.
export function createMenuMusic(host) {
 const audio = new Audio('/audio/pristine-fairway.mp3');
 audio.loop = true;
 audio.preload = 'none';
 audio.volume = 0.28;
 const key = 'fairway-baron.menu-music-muted';
 let muted = false, stopped = false;
 try { muted = localStorage.getItem(key) === '1'; } catch {}
 const button = document.createElement('button');
 button.type = 'button'; button.className = 'menu-music';
 function render() {
  button.textContent = muted ? '♫ Music off' : '♫ Music on';
  button.setAttribute('aria-label', muted ? 'Turn menu music on' : 'Turn menu music off');
  button.setAttribute('aria-pressed', String(!muted));
 }
 function play() {
  if(stopped || muted || document.hidden) return;
  // Autoplay rejection is expected until a trusted user interaction.
  audio.play()?.catch(() => {});
 }
 function gesture(event) { if(!button.contains(event.target)) play(); }
 function visibility() { if(document.hidden) audio.pause(); else play(); }
 button.onclick = () => {
  muted = !muted;
  try {localStorage.setItem(key, muted ? '1' : '0');} catch {}
  if(muted) audio.pause(); else play();
  render();
 };
 document.addEventListener('pointerdown', gesture);
 document.addEventListener('keydown', gesture);
 document.addEventListener('visibilitychange', visibility);
 render(); host.append(button); play();
 return {
  mount(nextHost) { if(!stopped) nextHost.append(button); },
  stop() {
   if(stopped) return;
   stopped = true; audio.pause(); audio.currentTime = 0; button.remove();
   document.removeEventListener('pointerdown', gesture);
   document.removeEventListener('keydown', gesture);
   document.removeEventListener('visibilitychange', visibility);
  },
 };
}
