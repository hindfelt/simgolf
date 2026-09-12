import './boot-screen.css';

export function showBootScreen() {
  const screen = document.createElement('section');
  screen.id = 'boot-screen';
  screen.setAttribute('aria-label', 'Fairway Baron loading');
  screen.innerHTML = `<div class="boot-content"><img src="/brand/fairway-baron-logo-v1.png" alt="Fairway Baron" width="1672" height="941"><p class="boot-tagline">Build Your Golfing Empire!</p><p class="boot-status" role="status" aria-live="polite">Checking your player account…</p><button type="button" hidden>Retry loading</button></div>`;
  document.body.append(screen);
  const status = screen.querySelector('.boot-status');
  screen.querySelector('button').onclick = () => location.reload();
  return {
    preparing() { status.textContent = 'Preparing your resort…'; },
    ready() { screen.remove(); },
    fail(error) {
      // Initialization may have replaced the page before failing.
      if (!screen.isConnected) document.body.append(screen);
      status.textContent = error?.message || 'The resort could not finish loading.';
      const retry = screen.querySelector('button');
      retry.hidden = false;
      retry.focus();
    },
  };
}
