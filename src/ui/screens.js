import { PREPOSITIONS, PREPOSITION_ORDER } from '../data/content.js';
import { imageURL } from '../content/repo.js';
import { nounFor } from '../round.js';

const screenEl = document.getElementById('screen');

function show(html) {
  screenEl.innerHTML = `<div class="card">${html}</div>`;
  screenEl.classList.add('show');
  return screenEl;
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
       click the right place and steal them for the poor!</p>
    <div class="row">
      ${button('start', canContinue ? `Continue: Heist ${round + 1}/${total}` : 'Start Heist 1')}
      ${canContinue ? button('reset', 'Start over', 'secondary') : ''}
    </div>
    <p class="small">Keys 1–5 pick a place · Space repeats the clue</p>
  `);
  screenEl.insertAdjacentHTML('beforeend', '<a class="gear" href="admin.html">⚙ grown-ups</a>');
  onAction({ start: onStart, reset: onReset });
}

export function roundIntro({ round, total, cfg, onGo }) {
  show(`
    <h2>Heist ${round + 1} of ${total}</h2>
    <h1>${cfg.items} things<br>${cfg.timer} seconds</h1>
    <p>Find every item before the timer runs out.<br>Read the clue, then click where the thing is.</p>
    ${button('go', 'Sneak in ▶')}
  `);
  onAction({ go: onGo });
}

export function victory({ round, total, tasks, timeLeft, onNext }) {
  const last = round + 1 >= total;
  show(`
    <h1>You robbed the rich!</h1>
    <h2>Heist ${round + 1} done · ${timeLeft}s left</h2>
    ${lootGrid(tasks)}
    ${button('next', last ? 'See the loot ▶' : 'Next Heist ▶')}
  `);
  onAction({ next: onNext });
}

export function putbackIntro({ found, total, bonus, onGo }) {
  show(`
    <h1>Time's up!</h1>
    <h2>You found ${found} of ${total}. The family is waking up!</h2>
    <p>Quick! Put everything back where it was before they notice.<br>
       You have <b>${bonus} seconds</b>.</p>
    ${button('go', 'Put it back! ▶')}
  `);
  onAction({ go: onGo });
}

export function escaped({ onRetry }) {
  show(`
    <h1>You escaped unseen</h1>
    <p>Everything is back in place. Nobody noticed a thing.<br>Let's try that heist again — faster this time!</p>
    ${button('retry', 'Retry Heist ▶')}
  `);
  onAction({ retry: onRetry });
}

export function caught({ onRetry }) {
  show(`
    <h1 style="color:var(--danger)">Caught!</h1>
    <p>The family noticed the missing things. Robin ran away empty-handed.</p>
    ${button('retry', 'Try again ▶')}
  `);
  onAction({ retry: onRetry });
}

export function defeat({ onRetry }) {
  show(`
    <h1 style="color:var(--danger)">The dogs woke up!</h1>
    <p>You didn't find anything. Robin had to run!<br>Try again — the same things are hidden, just read carefully.</p>
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
