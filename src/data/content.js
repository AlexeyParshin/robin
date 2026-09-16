// Built-in default content. User content from the admin panel is merged on top (see src/content/repo.js).
// All coordinates are in 960x540 stage pixels.

export const STAGE = { width: 960, height: 540 };

export const PREPOSITIONS = {
  in:        { color: '#4da3ff', label: 'in' },
  on:        { color: '#5ad45a', label: 'on' },
  under:     { color: '#ff9f43', label: 'under' },
  behind:    { color: '#b57bff', label: 'behind' },
  'next to': { color: '#ff6fb5', label: 'next to' },
  between:   { color: '#2fd4c8', label: 'between' },
};

export const PREPOSITION_ORDER = Object.keys(PREPOSITIONS);

// A spot is a clickable hiding place in the room.
export const ROOMS = [
  { id: 'kitchen', name: 'Kitchen',     background: 'assets/sprites/room-kitchen.png' },
  { id: 'living',  name: 'Living room', background: 'assets/sprites/room-living.png' },
  { id: 'bedroom', name: 'Bedroom',     background: 'assets/sprites/room-bedroom.png' },
];

// `noun` is used in clues ("the fridge"); `nouns` may override the noun per preposition.
// `zones` are the clickable targets, one per preposition (absolute stage coordinates).
// A spot without a zone for some preposition gets an automatic one (see defaultZone).
export const SPOTS = [
  // ---- Kitchen ----
  {
    id: 'fridge', room: 'kitchen', noun: 'fridge', sprite: 'assets/sprites/fridge.png',
    x: 250, y: 180, w: 110, h: 220, prepositions: ['in', 'on', 'next to'],
    zones: { in: { x: 275, y: 250, w: 60, h: 60 }, on: { x: 275, y: 134, w: 60, h: 44 }, 'next to': { x: 362, y: 412, w: 44, h: 44 } },
  },
  {
    id: 'table', room: 'kitchen', noun: 'table', sprite: 'assets/sprites/table.png',
    x: 400, y: 290, w: 200, h: 120, prepositions: ['on', 'under', 'next to'],
    zones: { on: { x: 440, y: 262, w: 70, h: 44 }, under: { x: 450, y: 346, w: 60, h: 50 }, 'next to': { x: 598, y: 412, w: 44, h: 44 } },
  },
  {
    id: 'cupboard', room: 'kitchen', noun: 'cupboard', sprite: 'assets/sprites/cupboard.png',
    x: 420, y: 100, w: 200, h: 130, prepositions: ['in', 'on', 'under'],
    zones: { in: { x: 490, y: 140, w: 60, h: 50 }, on: { x: 490, y: 64, w: 70, h: 34 }, under: { x: 490, y: 232, w: 60, h: 28 } },
  },
  {
    id: 'bin', room: 'kitchen', noun: 'bin', sprite: 'assets/sprites/bin.png',
    x: 700, y: 320, w: 70, h: 80, prepositions: ['in', 'behind', 'next to'],
    zones: { in: { x: 715, y: 346, w: 40, h: 40 }, behind: { x: 744, y: 282, w: 40, h: 36 }, 'next to': { x: 776, y: 412, w: 44, h: 44 } },
  },
  // ---- Living room ----
  {
    id: 'sofa', room: 'living', noun: 'sofa', sprite: 'assets/sprites/sofa.png',
    x: 250, y: 290, w: 220, h: 120, prepositions: ['on', 'under', 'behind'],
    zones: { on: { x: 300, y: 262, w: 80, h: 40 }, under: { x: 320, y: 372, w: 80, h: 34 }, behind: { x: 428, y: 254, w: 40, h: 40 } },
  },
  {
    id: 'shelf', room: 'living', noun: 'shelf', sprite: 'assets/sprites/shelf.png',
    x: 500, y: 110, w: 220, h: 150, prepositions: ['on', 'behind', 'between'],
    nouns: { behind: 'books', between: 'books' },
    zones: { on: { x: 570, y: 68, w: 80, h: 40 }, behind: { x: 660, y: 92, w: 40, h: 50 }, between: { x: 594, y: 196, w: 32, h: 52 } },
  },
  {
    id: 'tv', room: 'living', noun: 'TV', sprite: 'assets/sprites/tv.png',
    x: 520, y: 300, w: 160, h: 110, prepositions: ['on', 'behind', 'under'],
    zones: { on: { x: 560, y: 266, w: 60, h: 34 }, behind: { x: 648, y: 262, w: 40, h: 38 }, under: { x: 580, y: 374, w: 60, h: 34 } },
  },
  {
    id: 'bag', room: 'living', noun: 'bag', sprite: 'assets/sprites/bag.png',
    x: 740, y: 320, w: 90, h: 90, prepositions: ['in', 'behind', 'next to'],
    zones: { in: { x: 762, y: 354, w: 44, h: 40 }, behind: { x: 796, y: 284, w: 40, h: 40 }, 'next to': { x: 834, y: 412, w: 44, h: 44 } },
  },
  // ---- Bedroom ----
  {
    id: 'bed', room: 'bedroom', noun: 'bed', sprite: 'assets/sprites/bed.png',
    x: 250, y: 280, w: 240, h: 130, prepositions: ['on', 'under', 'behind'],
    zones: { on: { x: 335, y: 296, w: 80, h: 44 }, under: { x: 325, y: 384, w: 90, h: 28 }, behind: { x: 431, y: 258, w: 50, h: 40 } },
  },
  {
    id: 'wardrobe', room: 'bedroom', noun: 'wardrobe', sprite: 'assets/sprites/wardrobe.png',
    x: 520, y: 120, w: 120, h: 280, prepositions: ['in', 'on', 'next to'],
    zones: { in: { x: 545, y: 220, w: 70, h: 70 }, on: { x: 545, y: 74, w: 70, h: 42 }, 'next to': { x: 644, y: 412, w: 44, h: 44 } },
  },
  {
    id: 'nightstand', room: 'bedroom', noun: 'nightstand', sprite: 'assets/sprites/nightstand.png',
    x: 660, y: 320, w: 90, h: 80, prepositions: ['on', 'in', 'under'],
    zones: { on: { x: 675, y: 286, w: 60, h: 32 }, in: { x: 680, y: 326, w: 50, h: 30 }, under: { x: 675, y: 366, w: 60, h: 32 } },
  },
  {
    id: 'chair', room: 'bedroom', noun: 'chair', sprite: 'assets/sprites/chair.png',
    x: 780, y: 290, w: 80, h: 110, prepositions: ['on', 'under', 'behind'],
    zones: { on: { x: 795, y: 322, w: 50, h: 30 }, under: { x: 795, y: 362, w: 50, h: 34 }, behind: { x: 826, y: 256, w: 40, h: 34 } },
  },
  {
    id: 'box', room: 'bedroom', noun: 'box', sprite: 'assets/sprites/box.png',
    x: 880, y: 340, w: 70, h: 60, prepositions: ['in', 'on', 'next to'],
    zones: { in: { x: 895, y: 358, w: 40, h: 36 }, on: { x: 890, y: 300, w: 50, h: 36 }, 'next to': { x: 866, y: 412, w: 44, h: 44 } },
  },
];

/** Automatic zone for a spot that has none defined for `prep`. */
/** Prepositions whose marker is drawn BEHIND the furniture sprite (only the part sticking out is visible). */
export const BEHIND_PREPS = new Set(['behind', 'between']);

export function defaultZone(spot, prep) {
  const { x, y, w, h } = spot;
  const cw = Math.max(30, Math.round(w * 0.4));
  switch (prep) {
    case 'on':      return { x: x + Math.round((w - cw) / 2), y: y - 44, w: cw, h: 44 };
    case 'under':   return { x: x + Math.round((w - cw) / 2), y: y + h - 40, w: cw, h: 40 };
    case 'behind':  return { x: x + w - 44, y: y - 30, w: 44, h: 40 };
    case 'next to': return { x: x + w + 4, y: y + h - 48, w: 44, h: 44 };
    case 'between': return { x: x + Math.round(w * 0.4), y: y + Math.round(h * 0.4), w: 30, h: 48 };
    default:        return { x: x + Math.round((w - cw) / 2), y: y + Math.round(h * 0.35), w: cw, h: Math.max(30, Math.round(h * 0.3)) };
  }
}

export function zoneOf(spot, prep) {
  return spot.zones?.[prep] || defaultZone(spot, prep);
}

export const ITEMS = [
  { id: 'apple',    word: 'apple',    article: 'an', sprite: 'assets/sprites/items/apple.png' },
  { id: 'cheese',   word: 'cheese',   article: '',   sprite: 'assets/sprites/items/cheese.png' },
  { id: 'bread',    word: 'bread',    article: '',   sprite: 'assets/sprites/items/bread.png' },
  { id: 'milk',     word: 'milk',     article: '',   sprite: 'assets/sprites/items/milk.png' },
  { id: 'coin',     word: 'coin',     article: 'a',  sprite: 'assets/sprites/items/coin.png' },
  { id: 'ring',     word: 'ring',     article: 'a',  sprite: 'assets/sprites/items/ring.png' },
  { id: 'key',      word: 'key',      article: 'a',  sprite: 'assets/sprites/items/key.png' },
  { id: 'book',     word: 'book',     article: 'a',  sprite: 'assets/sprites/items/book.png' },
  { id: 'candle',   word: 'candle',   article: 'a',  sprite: 'assets/sprites/items/candle.png' },
  { id: 'hat',      word: 'hat',      article: 'a',  sprite: 'assets/sprites/items/hat.png' },
  { id: 'sock',     word: 'sock',     article: 'a',  sprite: 'assets/sprites/items/sock.png' },
  { id: 'cup',      word: 'cup',      article: 'a',  sprite: 'assets/sprites/items/cup.png' },
  { id: 'egg',      word: 'egg',      article: 'an', sprite: 'assets/sprites/items/egg.png' },
  { id: 'carrot',   word: 'carrot',   article: 'a',  sprite: 'assets/sprites/items/carrot.png' },
  { id: 'clock',    word: 'clock',    article: 'a',  sprite: 'assets/sprites/items/clock.png' },
  { id: 'ball',     word: 'ball',     article: 'a',  sprite: 'assets/sprites/items/ball.png' },
  { id: 'pen',      word: 'pen',      article: 'a',  sprite: 'assets/sprites/items/pen.png' },
  { id: 'spoon',    word: 'spoon',    article: 'a',  sprite: 'assets/sprites/items/spoon.png' },
  { id: 'lamp',     word: 'lamp',     article: 'a',  sprite: 'assets/sprites/items/lamp.png' },
  { id: 'necklace', word: 'necklace', article: 'a',  sprite: 'assets/sprites/items/necklace.png' },
];

export const ROUNDS = [
  { room: 'kitchen', items: 3, spots: 3, timer: 60, putbackBonus: 30, penalty: 2 },
  { room: 'living',  items: 4, spots: 4, timer: 75, putbackBonus: 30, penalty: 2 },
  { room: 'bedroom', items: 5, spots: 5, timer: 90, putbackBonus: 30, penalty: 2 },
];

export const DEFAULT_CONTENT = { rooms: ROOMS, spots: SPOTS, items: ITEMS, rounds: ROUNDS };
