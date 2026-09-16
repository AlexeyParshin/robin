import { PREPOSITIONS, PREPOSITION_ORDER } from '../data/content.js';
import { imageURL } from '../content/repo.js';

const timerEl = document.getElementById('timer');
const lootEl = document.getElementById('loot');
const legendEl = document.getElementById('legend');

// ---------- Timer ----------
export function renderTimer(seconds, { bonus = false } = {}) {
  timerEl.textContent = String(Math.max(0, Math.ceil(seconds))).padStart(2, '0');
  timerEl.classList.toggle('bonus', bonus);
  timerEl.classList.toggle('warn', !bonus && seconds <= 20 && seconds > 10);
  timerEl.classList.toggle('danger', seconds <= 10);
}

// ---------- Loot bar ----------
export function renderLootSlots(count) {
  lootEl.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const slot = document.createElement('div');
    slot.className = 'loot-slot';
    slot.dataset.index = i;
    lootEl.appendChild(slot);
  }
}

export function fillLootSlot(index, task) {
  const slot = lootEl.children[index];
  if (!slot) return null;
  slot.classList.add('filled', 'bounce');
  slot.dataset.taskId = task.id;
  slot.innerHTML = `<img src="${imageURL(task.item)}" alt="${task.item.word}"><span class="tip">${task.item.word}</span>`;
  setTimeout(() => slot.classList.remove('bounce'), 400);
  return slot;
}

export function lootSlotRect(index) {
  const slot = lootEl.children[index];
  return slot ? slot.getBoundingClientRect() : null;
}

export function markSlotReturned(taskId) {
  const slot = lootEl.querySelector(`[data-task-id="${taskId}"]`);
  slot?.classList.remove('putback-target');
  slot?.classList.add('returned');
}

export function markSlotTarget(taskId) {
  lootEl.querySelectorAll('.putback-target').forEach((s) => s.classList.remove('putback-target'));
  lootEl.querySelector(`[data-task-id="${taskId}"]`)?.classList.add('putback-target');
}

// ---------- Preposition legend ----------
const DIAGRAMS = {
  in:        '<rect x="4" y="6" width="20" height="14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="13" r="3" fill="currentColor"/>',
  on:        '<rect x="4" y="12" width="20" height="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="8" r="3" fill="currentColor"/>',
  under:     '<rect x="4" y="2" width="20" height="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="16" r="3" fill="currentColor"/>',
  behind:    '<circle cx="14" cy="8" r="3" fill="currentColor"/><rect x="4" y="9" width="20" height="11" fill="#1b1b2f" stroke="currentColor" stroke-width="2"/>',
  'next to': '<rect x="2" y="6" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="22" cy="14" r="3" fill="currentColor"/>',
  between:   '<rect x="1" y="6" width="8" height="14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="13" r="3" fill="currentColor"/><rect x="19" y="6" width="8" height="14" fill="none" stroke="currentColor" stroke-width="2"/>',
};

export function renderLegend() {
  legendEl.innerHTML = '';
  for (const key of PREPOSITION_ORDER) {
    const card = document.createElement('div');
    card.className = 'legend-card';
    card.dataset.prep = key;
    card.style.setProperty('--c', PREPOSITIONS[key].color);
    card.innerHTML = `<svg viewBox="0 0 28 22">${DIAGRAMS[key] || ''}</svg><span>${key}</span>`;
    legendEl.appendChild(card);
  }
}

export function lightLegend(prep) {
  legendEl.querySelectorAll('.legend-card').forEach((c) => c.classList.toggle('lit', c.dataset.prep === prep));
}
