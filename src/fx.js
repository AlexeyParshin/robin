import { imageURL } from './content/repo.js';

const fx = document.getElementById('fx');
const stage = document.getElementById('stage');

/** Converts a viewport rect into stage coordinates (the stage is CSS-scaled). */
function toStage(rect) {
  const s = stage.getBoundingClientRect();
  const k = s.width / stage.offsetWidth;
  return { x: (rect.left - s.left) / k, y: (rect.top - s.top) / k, w: rect.width / k, h: rect.height / k };
}

function sparkle(x, y, color = '#ffd166', n = 14) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'fx-spark';
    const a = (i / n) * Math.PI * 2;
    const r = 30 + Math.random() * 40;
    s.style.cssText = `left:${x}px; top:${y}px; background:${color}; --dx:${Math.cos(a) * r}px; --dy:${Math.sin(a) * r}px;`;
    fx.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}

function wordLabel(x, y, text) {
  const w = document.createElement('div');
  w.className = 'fx-word';
  w.style.cssText = `left:${x}px; top:${y}px;`;
  w.textContent = text;
  fx.appendChild(w);
  setTimeout(() => w.remove(), 1300);
}

/**
 * Item pops out of the spot, spins, then flies in an arc into the loot slot.
 * Returns a promise that resolves when the item lands.
 */
export async function collectAnimation(task, spot, slotRect, { color = '#ffd166' } = {}) {
  const sx = spot.x + spot.w / 2 - 24;
  const sy = spot.y + spot.h / 2 - 24;
  const img = document.createElement('img');
  img.className = 'fx-item pop';
  img.src = imageURL(task.item);
  img.style.cssText = `left:${sx}px; top:${sy}px;`;
  fx.appendChild(img);
  sparkle(sx + 24, sy + 24, color);
  wordLabel(sx + 24, sy - 30, task.item.word);

  await new Promise((r) => setTimeout(r, 450));
  img.classList.remove('pop');

  const target = slotRect ? toStage(slotRect) : { x: 460, y: 10, w: 44, h: 44 };
  const tx = target.x + target.w / 2 - 24;
  const ty = target.y + target.h / 2 - 24;
  const dx = tx - sx;
  const dy = ty - sy;
  const anim = img.animate([
    { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 0 },
    { transform: `translate(${dx * 0.5}px, ${Math.min(dy, 0) - 120}px) scale(1.2) rotate(180deg)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.7) rotate(360deg)`, offset: 1 },
  ], { duration: 650, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
  await anim.finished;
  sparkle(tx + 24, ty + 24, color, 8);
  img.remove();
}

/** Reverse: item flies from the loot bar back to the spot. */
export async function returnAnimation(task, spot, slotRect) {
  const from = slotRect ? toStage(slotRect) : { x: 460, y: 10, w: 44, h: 44 };
  const sx = from.x + from.w / 2 - 24;
  const sy = from.y + from.h / 2 - 24;
  const tx = spot.x + spot.w / 2 - 24;
  const ty = spot.y + spot.h / 2 - 24;
  const img = document.createElement('img');
  img.className = 'fx-item';
  img.src = imageURL(task.item);
  img.style.cssText = `left:${sx}px; top:${sy}px;`;
  fx.appendChild(img);
  const anim = img.animate([
    { transform: 'translate(0,0) scale(0.7)' },
    { transform: `translate(${(tx - sx) * 0.5}px, ${(ty - sy) * 0.5 - 80}px) scale(1.2)` },
    { transform: `translate(${tx - sx}px, ${ty - sy}px) scale(0)` },
  ], { duration: 600, easing: 'ease-in-out', fill: 'forwards' });
  await anim.finished;
  sparkle(tx + 24, ty + 24, '#4da3ff', 8);
  img.remove();
}

export function redFlash() {
  const f = document.createElement('div');
  f.className = 'fx-flash go';
  fx.appendChild(f);
  setTimeout(() => f.remove(), 450);
}

export function robinHop() {
  const r = document.getElementById('robin');
  r.classList.remove('happy');
  void r.offsetWidth;
  r.classList.add('happy');
  setTimeout(() => r.classList.remove('happy'), 600);
}
