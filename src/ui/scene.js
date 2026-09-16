import { imageURL } from '../content/repo.js';
import { zoneOf, BEHIND_PREPS } from '../data/content.js';
import { nounFor } from '../round.js';

const container = document.getElementById('spots');
let onZoneClick = null;

/** Renders furniture sprites plus one numbered clickable zone per (spot, preposition). */
export function renderSpots(spots, handler) {
  onZoneClick = handler;
  container.innerHTML = '';
  for (const spot of spots) {
    const img = document.createElement('img');
    img.className = 'furniture';
    img.src = imageURL(spot);
    img.alt = spot.noun;
    img.draggable = false;
    img.style.cssText = `left:${spot.x}px; top:${spot.y}px; width:${spot.w}px; height:${spot.h}px;`;
    container.appendChild(img);
  }
  let n = 0;
  for (const spot of spots) {
    for (const prep of spot.prepositions || []) {
      n++;
      const z = zoneOf(spot, prep);
      const btn = document.createElement('button');
      btn.className = BEHIND_PREPS.has(prep) ? 'zone behind-layer' : 'zone';
      btn.dataset.spot = spot.id;
      btn.dataset.prep = prep;
      btn.dataset.n = n;
      btn.style.cssText = `left:${z.x}px; top:${z.y}px; width:${z.w}px; height:${z.h}px;`;
      btn.setAttribute('aria-label', `${prep} the ${nounFor(spot, prep)}`);
      btn.innerHTML = `<span class="key">${n}</span><span class="label">${prep} the ${nounFor(spot, prep)}</span>`;
      btn.addEventListener('click', () => onZoneClick?.(spot, prep, btn));
      container.appendChild(btn);
    }
  }
}

export function zoneEl(spotId, prep) {
  return [...container.querySelectorAll('.zone')].find((z) => z.dataset.spot === spotId && z.dataset.prep === prep);
}

export function zoneByIndex(i) {
  return container.querySelectorAll('.zone')[i];
}

export function shakeZone(spotId, prep) {
  const el = zoneEl(spotId, prep);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

export function hintZone(spotId, prep, on) {
  zoneEl(spotId, prep)?.classList.toggle('hint', on);
}

export function clearHints() {
  container.querySelectorAll('.zone.hint').forEach((el) => el.classList.remove('hint'));
}

export function setSpotsEnabled(on) {
  container.querySelectorAll('.zone').forEach((el) => el.classList.toggle('disabled', !on));
}

/** Shows an item sitting in a zone (used after put-back). */
export function placeItemInZone(spot, prep, item) {
  const z = zoneOf(spot, prep);
  const img = document.createElement('img');
  img.className = 'placed-item';
  img.src = imageURL(item);
  img.alt = item.word;
  img.style.cssText = `left:${z.x + z.w / 2 - 16}px; top:${z.y + z.h / 2 - 16}px;`;
  container.appendChild(img);
}
