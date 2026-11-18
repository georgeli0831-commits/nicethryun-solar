import { createScenePlayback } from './scene-playback.js';

const root = document.querySelector('[data-global-markets]');

if (root instanceof HTMLElement) {
  const buttons = [...root.querySelectorAll('[data-map-select]')];
  const play = root.querySelector('[data-map-play]');
  const playLabel = root.querySelector('[data-map-play-label]');
  const pauseIcon = root.querySelector('[data-map-pause-icon]');
  const resumeIcon = root.querySelector('[data-map-resume-icon]');
  const announcement = root.querySelector('[data-map-announcement]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const render = state => {
    const selected = buttons[state.index];
    if (!(selected instanceof HTMLButtonElement)) return;
    root.dataset.activeMarket = selected.dataset.mapSelect;
    root.dataset.mapRunning = String(state.running);
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === state.index)));
    if (play instanceof HTMLButtonElement) {
      play.hidden = false;
      play.disabled = state.reducedMotion;
      play.setAttribute('aria-label', state.reducedMotion ? 'Map animation is off for reduced motion' : state.wantsPlay ? 'Pause market tour' : 'Resume market tour');
    }
    if (playLabel) playLabel.textContent = state.reducedMotion ? 'Motion off' : state.wantsPlay ? 'Pause tour' : 'Resume tour';
    pauseIcon?.setAttribute('display', !state.wantsPlay || state.reducedMotion ? 'none' : 'inline');
    resumeIcon?.setAttribute('display', state.wantsPlay && !state.reducedMotion ? 'none' : 'inline');
  };

  const playback = createScenePlayback({ count: buttons.length, interval: 5000, reducedMotion: motion.matches, onChange: render });
  const selectMarket = index => {
    playback.select(index);
    const label = buttons[index]?.querySelector('strong')?.textContent || '';
    if (announcement) announcement.textContent = `${label} selected. Market tour paused.`;
  };
  buttons.forEach((button, index) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = false;
    button.addEventListener('click', () => selectMarket(index));
    button.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      selectMarket(next);
      if (buttons[next] instanceof HTMLElement) buttons[next].focus();
    });
  });
  play?.addEventListener('click', () => {
    if (playback.getState().wantsPlay) playback.pause();
    else playback.play();
  });

  // The full region stays still while a person is reading or using its controls.
  root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') playback.setHovered(true); });
  root.addEventListener('pointerleave', () => playback.setHovered(false));
  const updateFocus = () => {
    // Resume is an explicit playback choice, even while its button keeps focus.
    const active = document.activeElement;
    playback.setFocused(root.contains(active) && !(play?.contains(active)));
  };
  root.addEventListener('focusin', updateFocus);
  root.addEventListener('focusout', () => queueMicrotask(updateFocus));
  const updateVisibility = () => playback.setPageVisible(document.visibilityState !== 'hidden');
  const updateMotion = event => playback.setReducedMotion(event.matches);
  document.addEventListener('visibilitychange', updateVisibility);
  motion.addEventListener('change', updateMotion);
  updateVisibility();

  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => playback.setInView(entries.some(entry => entry.isIntersecting)), { threshold: .2 });
    observer.observe(root);
  } else playback.setInView(true);

  window.addEventListener('pagehide', event => {
    playback.setPageVisible(false);
    if (!event.persisted) {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
      motion.removeEventListener('change', updateMotion);
      playback.dispose();
    }
  });
  window.addEventListener('pageshow', updateVisibility);
}
