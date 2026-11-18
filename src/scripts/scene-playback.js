/** One countdown, with persistent user intent separate from temporary blockers. */
export function createScenePlayback({
  count,
  interval = 6000,
  reducedMotion = false,
  onChange = () => {},
  now = () => performance.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = id => clearTimeout(id),
}) {
  const total = Math.max(1, Math.floor(count) || 1);
  let index = 0, wantsPlay = !reducedMotion, inView = false, pageVisible = true;
  let hovered = false, focused = false, interacting = false, disposed = false;
  let remaining = interval, deadline = 0, timer = null, generation = 0;
  const allowed = () => !disposed && total > 1 && wantsPlay && !reducedMotion && inView && pageVisible && !hovered && !focused && !interacting;
  const timeLeft = () => timer === null ? remaining : Math.max(0, deadline - now());
  const snapshot = () => ({ index, count: total, interval, remaining: timeLeft(), wantsPlay, inView, pageVisible, hovered, focused, interacting, reducedMotion, running: timer !== null });

  function stop() {
    if (timer !== null) {
      remaining = timeLeft();
      clearTimer(timer);
      timer = null;
    }
    generation++;
  }

  function reconcile() {
    if (disposed) return;
    if (!allowed()) stop();
    else if (timer === null) {
      const token = ++generation;
      deadline = now() + remaining;
      timer = setTimer(() => {
        // A cleared callback already queued by the browser cannot advance us.
        if (disposed || token !== generation) return;
        timer = null;
        remaining = interval;
        if (allowed()) index = (index + 1) % total;
        reconcile();
      }, remaining);
    }
    onChange(snapshot());
  }

  function setGate(key, value) {
    value = Boolean(value);
    if (key === 'inView') { if (inView === value) return; inView = value; }
    if (key === 'pageVisible') { if (pageVisible === value) return; pageVisible = value; }
    if (key === 'hovered') { if (hovered === value) return; hovered = value; }
    if (key === 'focused') { if (focused === value) return; focused = value; }
    if (key === 'interacting') { if (interacting === value) return; interacting = value; }
    reconcile();
  }

  const api = {
    getState: snapshot,
    setInView: value => setGate('inView', value),
    setPageVisible: value => setGate('pageVisible', value),
    setHovered: value => setGate('hovered', value),
    setFocused: value => setGate('focused', value),
    setInteracting: value => setGate('interacting', value),
    setReducedMotion(value) {
      value = Boolean(value);
      if (reducedMotion === value) return;
      reducedMotion = value;
      if (value) wantsPlay = false;
      reconcile();
    },
    select(value) {
      if (disposed || !Number.isInteger(value)) return;
      stop();
      index = ((value % total) + total) % total;
      wantsPlay = false;
      remaining = interval;
      reconcile();
    },
    pause() { wantsPlay = false; reconcile(); },
    play() {
      if (disposed || reducedMotion) return;
      stop();
      wantsPlay = true;
      remaining = interval;
      reconcile();
    },
    dispose() { stop(); disposed = true; },
  };
  reconcile();
  return api;
}
