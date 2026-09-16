import { loadContent } from './content/repo.js';
import { buildRound, evaluate, shuffle } from './round.js';
import * as storage from './storage.js';
import * as audio from './audio.js';
import * as scene from './ui/scene.js';
import * as panel from './ui/panel.js';
import * as hud from './ui/hud.js';
import * as screens from './ui/screens.js';
import * as fx from './fx.js';
import { PREPOSITIONS, STAGE } from './data/content.js';

const game = {
  content: null,
  progress: storage.load(),
  roundIndex: 0,
  round: null,
  active: null,       // current task
  mode: 'idle',       // idle | steal | putback
  timeLeft: 0,
  timerId: null,
  busy: false,
  lastTick: 0,
};

// ---------- Stage scaling ----------
function fitStage() {
  const k = Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height);
  document.getElementById('stage').style.transform = `scale(${k})`;
}
window.addEventListener('resize', fitStage);
fitStage();

// ---------- Timer ----------
function startTimer(seconds, onEnd) {
  stopTimer();
  game.timeLeft = seconds;
  hud.renderTimer(seconds, { bonus: game.mode === 'putback' });
  let last = performance.now();
  game.timerId = setInterval(() => {
    const now = performance.now();
    game.timeLeft -= (now - last) / 1000;
    last = now;
    hud.renderTimer(game.timeLeft, { bonus: game.mode === 'putback' });
    const whole = Math.ceil(game.timeLeft);
    if (whole <= 10 && whole !== game.lastTick && whole > 0) { audio.sfx.tick(); game.lastTick = whole; }
    if (game.timeLeft <= 0) { stopTimer(); onEnd(); }
  }, 100);
}
function stopTimer() { clearInterval(game.timerId); game.timerId = null; }
function addTime(delta) {
  game.timeLeft = Math.max(0, game.timeLeft + delta);
  hud.renderTimer(game.timeLeft, { bonus: game.mode === 'putback' });
}

// ---------- Flow ----------
function showTitle() {
  game.mode = 'idle';
  stopTimer();
  audio.stopMusic();
  game.roundIndex = Math.min(game.progress.round, game.content.rounds.length - 1);
  screens.title({
    round: game.roundIndex,
    total: game.content.rounds.length,
    canContinue: game.progress.round > 0,
    onStart: () => { audio.unlock(); audio.sfx.click(); startRound(game.roundIndex); },
    onReset: () => { storage.reset(); game.progress = storage.load(); showTitle(); },
  });
}

function startRound(index, keepItems = null) {
  game.roundIndex = index;
  const cfg = game.content.rounds[index];
  game.round = buildRound(game.content, cfg, keepItems);
  screens.roundIntro({ round: index, total: game.content.rounds.length, cfg, onGo: beginSteal });
}

function beginSteal() {
  audio.unlock();
  audio.sfx.click();
  audio.startMusic();
  screens.hide();
  game.mode = 'steal';
  game.lastTick = 0;
  const r = game.round;
  scene.renderSpots(r.spots, onSpotClick);
  scene.setSpotsEnabled(true);
  hud.renderLootSlots(r.tasks.length);
  panel.renderClueList(r.tasks, 'is');
  pickNextTaskFor(r.tasks);
  startTimer(r.timer, onStealTimeUp);
}

async function onSpotClick(spot) {
  if (game.busy || !game.active || game.mode === 'idle') return;
  const task = game.active;
  if (spot.id !== task.spot.id) return wrongPick(task, spot);

  game.busy = true;
  audio.sfx.pickup();
  fx.robinHop();
  const color = PREPOSITIONS[task.prep]?.color;
  if (game.mode === 'steal') {
    task.found = true;
    const index = game.round.tasks.filter((t) => t.found).length - 1;
    task.slot = index;
    panel.markFound(task);
    await fx.collectAnimation(task, spot, hud.lootSlotRect(index), { color });
    hud.fillLootSlot(index, task);
    rememberWord(task);
  } else {
    task.returned = true;
    panel.markFound(task);
    await fx.returnAnimation(task, spot, hud.lootSlotRect(task.slot));
    hud.markSlotReturned(task.id);
  }
  game.busy = false;

  const remaining = game.round.tasks.filter((t) => game.mode === 'steal' ? !t.found : (t.found && !t.returned));
  if (!remaining.length) return game.mode === 'steal' ? finishSteal() : finishPutback(true);
  pickNextTaskFor(remaining);
}

function pickNextTaskFor(remaining) {
  game.active = remaining[0];
  panel.setActiveTask(game.active, game.mode === 'putback' ? 'put' : 'is');
  hud.lightLegend(game.active.prep);
  if (game.mode === 'putback') hud.markSlotTarget(game.active.id);
  scene.clearHints();
}

function wrongPick(task, spot) {
  audio.sfx.wrong();
  scene.shakeSpot(spot.id);
  fx.redFlash();
  addTime(-(game.round.cfg.penalty ?? 2));
  task.wrong = (task.wrong || 0) + 1;
  if (task.wrong >= 2) scene.hintSpot(task.spot.id, true);
}

function rememberWord(task) {
  const wordsMet = game.progress.wordsMet || [];
  const text = `${task.item.word} · the ${task.spot.nouns?.[task.prep] || task.spot.noun}`;
  if (!wordsMet.some((w) => w.text === text && w.prep === task.prep)) wordsMet.push({ text, prep: task.prep });
  game.progress = storage.save({ wordsMet });
}

function onStealTimeUp() {
  scene.setSpotsEnabled(false);
  audio.stopMusic();
  const result = evaluate(game.round);
  if (result === 'win') return finishSteal();
  if (result === 'lose') {
    audio.sfx.lose();
    return screens.defeat({ onRetry: () => { audio.sfx.click(); startRound(game.roundIndex, game.round.items); } });
  }
  audio.sfx.alarm();
  const found = game.round.tasks.filter((t) => t.found).length;
  screens.putbackIntro({
    found, total: game.round.tasks.length, bonus: game.round.cfg.putbackBonus ?? 30, onGo: beginPutback,
  });
}

function finishSteal() {
  stopTimer();
  audio.stopMusic();
  audio.sfx.win();
  scene.setSpotsEnabled(false);
  const timeLeft = Math.max(0, Math.ceil(game.timeLeft));
  const best = [...(game.progress.bestTimes || [])];
  best[game.roundIndex] = Math.max(best[game.roundIndex] ?? 0, timeLeft);
  const nextRound = game.roundIndex + 1;
  game.progress = storage.save({ bestTimes: best, round: Math.min(nextRound, game.content.rounds.length) });
  screens.victory({
    round: game.roundIndex, total: game.content.rounds.length, tasks: game.round.tasks, timeLeft,
    onNext: () => {
      audio.sfx.click();
      if (nextRound >= game.content.rounds.length) return showFinale();
      startRound(nextRound);
    },
  });
}

function beginPutback() {
  audio.sfx.click();
  audio.startMusic();
  screens.hide();
  game.mode = 'putback';
  game.lastTick = 0;
  const toReturn = shuffle(game.round.tasks.filter((t) => t.found));
  for (const t of toReturn) { t.returned = false; t.wrong = 0; }
  scene.setSpotsEnabled(true);
  panel.renderClueList(toReturn, 'put');
  pickNextTaskFor(toReturn);
  startTimer(game.round.cfg.putbackBonus ?? 30, () => finishPutback(false));
}

function finishPutback(success) {
  stopTimer();
  audio.stopMusic();
  scene.setSpotsEnabled(false);
  const retry = () => { audio.sfx.click(); startRound(game.roundIndex, game.round.items); };
  if (success) { audio.sfx.win(); screens.escaped({ onRetry: retry }); }
  else { audio.sfx.lose(); screens.caught({ onRetry: retry }); }
}

function showFinale() {
  game.progress = storage.save({ round: 0 });
  screens.finale({
    wordsMet: game.progress.wordsMet || [],
    bestTimes: game.progress.bestTimes || [],
    onRestart: () => { audio.sfx.click(); startRound(0); },
  });
}

// ---------- Global controls ----------
document.getElementById('btn-mute').addEventListener('click', (e) => {
  audio.unlock();
  const m = !audio.isMuted();
  audio.setMuted(m);
  e.currentTarget.classList.toggle('off', m);
  game.progress = storage.save({ muted: m });
});
document.getElementById('btn-font').addEventListener('click', (e) => {
  const on = document.body.classList.toggle('easy-font');
  e.currentTarget.classList.toggle('off', !on);
  game.progress = storage.save({ dyslexic: on });
});
document.addEventListener('keydown', (e) => {
  if (game.mode === 'idle' || game.busy) return;
  if (e.key >= '1' && e.key <= '9') scene.spotByIndex(Number(e.key) - 1)?.click();
  if (e.key === ' ') { e.preventDefault(); if (game.active) panel.setActiveTask(game.active, game.mode === 'putback' ? 'put' : 'is'); }
});

// ---------- Boot ----------
async function boot() {
  game.content = await loadContent();
  if (game.progress.muted) { audio.setMuted(true); document.getElementById('btn-mute').classList.add('off'); }
  if (game.progress.dyslexic) document.body.classList.add('easy-font'); else document.getElementById('btn-font').classList.add('off');
  hud.renderLegend();
  hud.renderLootSlots(5);
  scene.renderSpots(game.content.spots, () => {});
  hud.renderTimer(game.content.rounds[0]?.timer ?? 60);
  showTitle();
}
boot();
