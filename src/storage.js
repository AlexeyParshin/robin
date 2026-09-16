const KEY = 'robin-progress';

const defaults = { round: 0, bestTimes: [null, null, null], muted: false, dyslexic: false, wordsMet: [] };

export function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaults }; }
}

export function save(patch) {
  const next = { ...load(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function reset() { localStorage.removeItem(KEY); }
