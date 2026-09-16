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
// `noun` is used in clues ("the fridge"); `nouns` may override the noun per preposition.
export const SPOTS = [
  {
    id: 'fridge', noun: 'fridge', sprite: 'assets/sprites/fridge.png',
    x: 250, y: 180, w: 110, h: 220,
    prepositions: ['in', 'on', 'next to'],
  },
  {
    id: 'bed', noun: 'bed', sprite: 'assets/sprites/bed.png',
    x: 715, y: 280, w: 240, h: 130,
    prepositions: ['under', 'on', 'next to'],
  },
  {
    id: 'table', noun: 'table', sprite: 'assets/sprites/table.png',
    x: 400, y: 290, w: 200, h: 120,
    prepositions: ['on', 'under', 'next to'],
  },
  {
    id: 'bag', noun: 'bag', sprite: 'assets/sprites/bag.png',
    x: 620, y: 320, w: 90, h: 90,
    prepositions: ['in', 'next to', 'behind'],
  },
  {
    id: 'shelf', noun: 'shelf', sprite: 'assets/sprites/shelf.png',
    x: 400, y: 90, w: 220, h: 150,
    prepositions: ['on', 'behind', 'between'],
    nouns: { behind: 'books', between: 'books' },
  },
];

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
  { items: 5, spots: 3, timer: 60, putbackBonus: 30, penalty: 2 },
  { items: 6, spots: 4, timer: 75, putbackBonus: 30, penalty: 2 },
  { items: 7, spots: 5, timer: 90, putbackBonus: 30, penalty: 2 },
];

export const DEFAULT_CONTENT = { spots: SPOTS, items: ITEMS, rounds: ROUNDS };
