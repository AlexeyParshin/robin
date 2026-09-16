// Shared admin helpers + tab routing.
import { loadLayers } from '../content/repo.js';
import { renderItems } from './items.js';
import { renderSpots } from './spots.js';
import { renderRounds } from './rounds.js';
import { renderPack } from './pack.js';

export const state = { layers: null };

export function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('err', isError);
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2500);
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function slug(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `x${Date.now()}`;
}

/** Validates an uploaded image: PNG, ≤ 256px, ≤ 200 KB. Resolves to the file. */
export function validateImage(file, { maxSize = 256, maxBytes = 200 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected'));
    if (file.type !== 'image/png') return reject(new Error('Only PNG images are allowed'));
    if (file.size > maxBytes) return reject(new Error(`Image is too big (${Math.round(file.size / 1024)} KB, max ${maxBytes / 1024} KB)`));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > maxSize || img.height > maxSize) return reject(new Error(`Image is ${img.width}×${img.height}px, max ${maxSize}×${maxSize}`));
      resolve(file);
    };
    img.onerror = () => reject(new Error('Cannot read the image'));
    img.src = url;
  });
}

/** Builds a drag-and-drop PNG zone. onFile(file) is called after validation. */
export function dropZone({ label = 'Drop a PNG here or click', maxSize, preview } = {}, onFile) {
  const zone = el(`<div class="drop"><input type="file" accept="image/png"><div class="drop-body">${preview ? `<img src="${preview}" alt="">` : ''}<div>${label}</div></div></div>`);
  const input = zone.querySelector('input');
  const body = zone.querySelector('.drop-body');
  const handle = async (file) => {
    try {
      await validateImage(file, { maxSize });
      body.innerHTML = `<img src="${URL.createObjectURL(file)}" alt=""><div>${file.name}</div>`;
      onFile(file);
    } catch (e) { toast(e.message, true); }
  };
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => handle(input.files[0]));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); handle(e.dataTransfer.files[0]); });
  return zone;
}

/** Layer merge that also tells where each record came from. */
export function mergedWithSource(kind) {
  const { defaults, pack, user } = state.layers;
  const map = new Map();
  for (const rec of defaults[kind]) map.set(rec.id, { ...rec, _source: 'default' });
  for (const rec of pack?.[kind] || []) map.set(rec.id, { ...map.get(rec.id), ...rec, _source: 'pack' });
  for (const rec of user[kind]) {
    const prev = map.get(rec.id);
    map.set(rec.id, { ...prev, ...rec, _source: 'user', _base: prev?._source, deleted: !!rec.deleted });
  }
  return [...map.values()];
}

export async function refresh() {
  state.layers = await loadLayers();
  renderItems();
  renderSpots();
  renderRounds();
  renderPack();
}

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab-page').forEach((p) => p.classList.toggle('active', p.id === `tab-${b.dataset.tab}`));
  if (b.dataset.tab === 'spots') window.dispatchEvent(new Event('resize'));
}));

// ---------- Grown-up gate ----------
// Not real security: nothing sensitive lives in the browser, it's just friction for kids.
const ADMIN_PASSWORD = 'asd123';
{
  const input = document.getElementById('gate-a');
  const enter = () => {
    if (input.value === ADMIN_PASSWORD || sessionStorage.getItem('robin-admin') === '1') {
      sessionStorage.setItem('robin-admin', '1');
      document.getElementById('gate').remove();
      document.getElementById('admin').hidden = false;
      refresh();
    } else { toast('Wrong password — try again', true); input.select(); }
  };
  document.getElementById('gate-btn').addEventListener('click', enter);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && enter());
  if (sessionStorage.getItem('robin-admin') === '1') enter();
}
