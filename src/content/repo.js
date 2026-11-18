// Content repository: merges built-in defaults, an optional committed pack (assets/content-pack.json)
// and user edits stored in IndexedDB. Images uploaded in the admin are stored as Blobs.

import { DEFAULT_CONTENT } from '../data/content.js';

const DB_NAME = 'robin-content';
const DB_VERSION = 1;
const STORES = ['items', 'spots', 'rounds', 'meta'];
const PACK_URL = 'assets/content-pack.json';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),
  get: (store, id) => tx(store, 'readonly', (s) => s.get(id)),
  put: (store, value) => tx(store, 'readwrite', (s) => s.put(value)),
  del: (store, id) => tx(store, 'readwrite', (s) => s.delete(id)),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
};

// ---------- Pack (JSON with base64 images) ----------
async function fetchRemotePack() {
  try {
    const res = await fetch(PACK_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** The committed pack, or the one this browser just saved to GitHub if the site hasn't redeployed yet. */
async function fetchPack() {
  const [remote, saved] = await Promise.all([fetchRemotePack(), db.get('meta', 'savedPack').catch(() => null)]);
  const local = saved?.pack;
  if (local && (!remote || (remote.exportedAt || '') < (local.exportedAt || ''))) return local;
  if (local) db.del('meta', 'savedPack').catch(() => {}); // site caught up
  return remote;
}

/** After a successful commit: remember the saved pack and drop local edits (they're in the pack now). */
export async function markPackSaved(pack) {
  await db.put('meta', { id: 'savedPack', pack });
  await resetUserContent();
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Resolves the image URL of a record: Blob → object URL, string → as is. */
export function imageURL(rec) {
  if (!rec) return '';
  if (rec.image instanceof Blob) {
    if (!rec._url) rec._url = URL.createObjectURL(rec.image);
    return rec._url;
  }
  return rec.image || rec.sprite || '';
}

function mergeById(...lists) {
  return mergeAll(...lists).filter((rec) => !rec.deleted);
}

/** Merge that keeps deletion markers (needed for export). */
function mergeAll(...lists) {
  const map = new Map();
  for (const list of lists) for (const rec of list || []) {
    if (rec.deleted) map.set(rec.id, { id: rec.id, deleted: true });
    else map.set(rec.id, { ...map.get(rec.id), ...rec });
  }
  return [...map.values()];
}

/** Full effective content = defaults ← pack ← IndexedDB. */
export async function loadContent() {
  const [pack, userItems, userSpots, userRounds] = await Promise.all([
    fetchPack(), db.all('items'), db.all('spots'), db.all('rounds'),
  ]);
  const items = mergeById(DEFAULT_CONTENT.items, pack?.items, userItems).filter((i) => i.enabled !== false);
  const spots = mergeById(DEFAULT_CONTENT.spots, pack?.spots, userSpots).filter((s) => s.enabled !== false);
  const rooms = mergeById(DEFAULT_CONTENT.rooms, pack?.rooms);
  let rounds = DEFAULT_CONTENT.rounds;
  if (pack?.rounds?.length) rounds = pack.rounds;
  if (userRounds.length) rounds = userRounds.sort((a, b) => a.index - b.index).map(({ id, index, ...r }) => r);
  return { rooms, items, spots, rounds };
}

/** Raw layers for the admin (so it can show what is default vs. user-edited). */
export async function loadLayers() {
  const [pack, userItems, userSpots, userRounds] = await Promise.all([
    fetchPack(), db.all('items'), db.all('spots'), db.all('rounds'),
  ]);
  return { defaults: DEFAULT_CONTENT, pack, user: { items: userItems, spots: userSpots, rounds: userRounds } };
}

// ---------- Export / import ----------
export async function exportPack() {
  const [pack, userItems, userSpots] = await Promise.all([fetchPack(), db.all('items'), db.all('spots')]);
  const { rounds, rooms } = await loadContent();
  const content = {
    rooms,
    items: mergeAll(DEFAULT_CONTENT.items, pack?.items, userItems),
    spots: mergeAll(DEFAULT_CONTENT.spots, pack?.spots, userSpots),
    rounds,
  };
  const serialise = async (rec) => {
    const { _url, ...clean } = rec;
    if (clean.image instanceof Blob) clean.image = await blobToDataURL(clean.image);
    return clean;
  };
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rooms: content.rooms,
    items: await Promise.all(content.items.map(serialise)),
    spots: await Promise.all(content.spots.map(serialise)),
    rounds: content.rounds,
  };
}

export async function importPack(pack, { replace = false } = {}) {
  if (!pack || typeof pack !== 'object') throw new Error('Not a content pack');
  if (replace) await Promise.all(['items', 'spots', 'rounds'].map((s) => db.clear(s)));
  for (const it of pack.items || []) await db.put('items', it);
  for (const sp of pack.spots || []) await db.put('spots', sp);
  if (Array.isArray(pack.rounds)) {
    await db.clear('rounds');
    for (let i = 0; i < pack.rounds.length; i++) await db.put('rounds', { id: `r${i}`, index: i, ...pack.rounds[i] });
  }
}

export async function resetUserContent() {
  await Promise.all(['items', 'spots', 'rounds'].map((s) => db.clear(s)));
}
