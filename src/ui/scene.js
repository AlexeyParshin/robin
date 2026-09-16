import { imageURL } from '../content/repo.js';

const container = document.getElementById('spots');
let onSpotClick = null;

export function renderSpots(spots, handler) {
  onSpotClick = handler;
  container.innerHTML = '';
  spots.forEach((spot, i) => {
    const btn = document.createElement('button');
    btn.className = 'spot';
    btn.dataset.id = spot.id;
    btn.style.cssText = `left:${spot.x}px; top:${spot.y}px; width:${spot.w}px; height:${spot.h}px;`;
    btn.setAttribute('aria-label', spot.noun);
    btn.innerHTML = `<img src="${imageURL(spot)}" alt="" draggable="false"><span class="key">${i + 1}</span><span class="label">the ${spot.noun}</span>`;
    btn.addEventListener('click', () => onSpotClick?.(spot, btn));
    container.appendChild(btn);
  });
}

export function spotEl(id) {
  return container.querySelector(`.spot[data-id="${id}"]`);
}

export function spotByIndex(i) {
  return container.querySelectorAll('.spot')[i];
}

export function shakeSpot(id) {
  const el = spotEl(id);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

export function hintSpot(id, on) {
  spotEl(id)?.classList.toggle('hint', on);
}

export function clearHints() {
  container.querySelectorAll('.spot.hint').forEach((el) => el.classList.remove('hint'));
}

export function setSpotsEnabled(on) {
  container.querySelectorAll('.spot').forEach((el) => el.classList.toggle('disabled', !on));
}
