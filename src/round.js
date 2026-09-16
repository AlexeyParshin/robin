import { PREPOSITIONS } from './data/content.js';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function nounFor(spot, prep) {
  return spot.nouns?.[prep] || spot.noun;
}

export function clueText(task) {
  return `The ${task.item.word} is ${task.prep} the ${nounFor(task.spot, task.prep)}.`;
}

export function putbackText(task) {
  return `Put the ${task.item.word} ${task.prep} the ${nounFor(task.spot, task.prep)}!`;
}

/** Splits a clue into parts so the preposition can be coloured. */
export function clueParts(task, verb = 'is') {
  const noun = nounFor(task.spot, task.prep);
  return {
    before: verb === 'is' ? `The ${task.item.word} is ` : `Put the ${task.item.word} `,
    prep: task.prep,
    after: ` the ${noun}${verb === 'is' ? '.' : '!'}`,
    color: PREPOSITIONS[task.prep]?.color || '#fff',
  };
}

/**
 * Builds a round: picks spots and items, assigns each item a spot + preposition.
 * @param {object} content { items, spots }
 * @param {object} cfg { items, spots, timer }
 * @param {object[]} [keepItems] reuse these items (retry after defeat)
 */
export function buildRound(content, cfg, keepItems = null) {
  let pool = cfg.room ? content.spots.filter((s) => s.room === cfg.room) : content.spots;
  if (pool.length < Math.min(cfg.spots, 1)) pool = content.spots;
  const spotCount = Math.min(cfg.spots, pool.length);
  const spots = shuffle(pool).slice(0, spotCount);
  const itemCount = Math.min(cfg.items, content.items.length);
  const items = keepItems ? shuffle(keepItems) : shuffle(content.items).slice(0, itemCount);

  // Spread items across spots, cycling prepositions per spot for variety.
  const prepCursor = new Map(spots.map((s) => [s.id, shuffle(s.prepositions || ['in'])]));
  const spotCycle = shuffle(spots);
  const tasks = items.map((item, i) => {
    const spot = spotCycle[i % spotCycle.length];
    const preps = prepCursor.get(spot.id);
    const prep = preps[Math.floor(i / spotCycle.length) % preps.length];
    return { id: `${item.id}@${spot.id}`, item, spot, prep, found: false, wrong: 0 };
  });

  const room = content.rooms?.find((r) => r.id === cfg.room) || content.rooms?.[0] || null;
  return { cfg, room, spots, items, tasks: shuffle(tasks), timer: cfg.timer };
}

export function evaluate(round) {
  const found = round.tasks.filter((t) => t.found).length;
  if (found === round.tasks.length) return 'win';
  if (found === 0) return 'lose';
  return 'partial';
}
