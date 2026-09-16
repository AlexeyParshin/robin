import { PREPOSITIONS, PREPOSITION_ORDER } from '../data/content.js';
import { imageURL } from '../content/repo.js';
import { nounFor } from '../round.js';

const screenEl = document.getElementById('screen');

function show(html) {
  screenEl.innerHTML = `<div class="card">${html}</div>`;
  screenEl.classList.add('show');
  return screenEl;
}

export function isShown() { return screenEl.classList.contains('show'); }

export function pause({ onResume, onQuit }) {
  show(`
    <h1>Paused</h1>
    <img class="title-robin pixel" src="assets/sprites/robin.png" alt="">
    <div class="row">
      ${button('resume', '▶ Resume')}
      ${button('quit', 'Main menu', 'secondary')}
    </div>
    <p class="small">Quitting ends this heist — you can start it again from the menu.</p>
  `);
  onAction({ resume: onResume, quit: onQuit });
}

export function hide() {
  screenEl.classList.remove('show');
  screenEl.innerHTML = '';
}

function button(id, label, cls = '') {
  return `<button class="btn ${cls}" data-action="${id}">${label}</button>`;
}

function onAction(handlers) {
  screenEl.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', () => handlers[b.dataset.action]?.());
  });
}

function lootGrid(tasks) {
  return `<div class="loot-grid">${tasks.map((t) => `
    <div class="loot-card">
      <img src="${imageURL(t.item)}" alt="">
      <div>${t.item.word}</div>
      <div class="prep" style="color:${PREPOSITIONS[t.prep]?.color}">${t.prep}</div>
      <div>the ${nounFor(t.spot, t.prep)}</div>
    </div>`).join('')}</div>`;
}

export function title({ round, total, onStart, onReset, canContinue }) {
  show(`
    <img class="title-robin pixel" src="assets/sprites/robin.png" alt="">
    <h1>Robin Hood<br>Hidden Loot</h1>
    <p>The rich family is asleep. Read where the things are hidden,
       click the numbered zone — <b>on</b>, <b>under</b>, <b>in</b>… — and steal them for the poor!</p>
    <div class="row">
      ${button('start', canContinue ? `Continue: Heist ${round + 1}/${total}` : 'Start Heist 1')}
      ${canContinue ? button('reset', 'Start over', 'secondary') : ''}
    </div>
    <p class="small">Keys 1–9 pick a numbered zone · Space repeats the clue</p>
  `);
  screenEl.insertAdjacentHTML('beforeend', '<a class="gear" href="admin.html">⚙ grown-ups</a>');
  onAction({ start: onStart, reset: onReset });
}

function sceneImg(name) {
  return `<img class="scene-img pixel" src="assets/sprites/scenes/${name}.png" alt="">`;
}

export function roundIntro({ round, total, cfg, room, onGo }) {
  show(`
    <h2>Heist ${round + 1} of ${total}${room ? ` · ${room.name}` : ''}</h2>
    <h1>${cfg.items} things<br>${cfg.timer} seconds</h1>
    <p>Read the clue, then click the numbered zone where the thing is.</p>
    ${button('go', 'Sneak in ▶')}
  `);
  onAction({ go: onGo });
}

export function victory({ round, total, tasks, timeLeft, onNext }) {
  const last = round + 1 >= total;
  show(`
    <h1>You robbed the rich!</h1>
    ${sceneImg('victory')}
    <h2>Heist ${round + 1} done · ${timeLeft}s left</h2>
    ${lootGrid(tasks)}
    ${button('next', last ? 'See the loot ▶' : 'Next Heist ▶')}
  `);
  onAction({ next: onNext });
}

export function putbackIntro({ found, total, bonus, onGo }) {
  show(`
    <h1>Time's up!</h1>
    <h2>${found} of ${total} found. Put them back — ${bonus} seconds!</h2>
    ${button('go', 'Put it back! ▶')}
  `);
  onAction({ go: onGo });
}

export function escaped({ onRetry }) {
  show(`
    <h1>You escaped unseen</h1>
    ${sceneImg('escaped')}
    ${button('retry', 'Retry Heist ▶')}
  `);
  onAction({ retry: onRetry });
}

export function caught({ onRetry }) {
  show(`
    <h1 style="color:var(--danger)">Caught!</h1>
    ${sceneImg('caught')}
    ${button('retry', 'Try again ▶')}
  `);
  onAction({ retry: onRetry });
}

export function defeat({ onRetry }) {
  show(`
    <h1 style="color:var(--danger)">Nothing found!</h1>
    ${sceneImg('defeat')}
    ${button('retry', 'Try again ▶')}
  `);
  onAction({ retry: onRetry });
}

export function finale({ wordsMet, bestTimes, onRestart }) {
  const groups = PREPOSITION_ORDER.map((p) => {
    const words = wordsMet.filter((w) => w.prep === p);
    if (!words.length) return '';
    return `<div class="group" style="--c:${PREPOSITIONS[p].color}"><h3>${p}</h3>${[...new Set(words.map((w) => w.text))].map((t) => `<div>${t}</div>`).join('')}</div>`;
  }).join('');
  show(`
    <h1>All heists done!</h1>
    <h2>The poor have food and warmth tonight.</h2>
    <p class="small">Best times left: ${bestTimes.map((t, i) => `H${i + 1}: ${t ?? '—'}s`).join(' · ')}</p>
    <h2>Words you met</h2>
    <div class="wordbank">${groups}</div>
    ${button('restart', 'Play again ▶')}
  `);
  onAction({ restart: onRestart });
}
