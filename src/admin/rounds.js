import { db, loadLayers } from '../content/repo.js';
import { el, toast, refresh, mergedWithSource, state, unsavedForms } from './admin.js';
import { updateSaveBadge } from './pack.js';

const page = document.getElementById('tab-rounds');

// Rounds are stored as you edit (no separate "Save rounds" step). Writes are queued so they never interleave.
let writeQueue = Promise.resolve();
let roundsInvalid = false;

/** Resolves once every queued rounds write has reached IndexedDB. */
export function flushRounds() { return writeQueue; }

function currentRounds() {
  const { defaults, pack, user } = state.layers;
  if (user.rounds.length) return user.rounds.sort((a, b) => a.index - b.index).map(({ id, index, ...r }) => r);
  if (pack?.rounds?.length) return pack.rounds;
  return defaults.rounds;
}

export function renderRounds() {
  const rounds = currentRounds().map((r) => ({ ...r }));
  const enabledItems = mergedWithSource('items').filter((i) => !i.deleted && i.enabled !== false).length;
  const liveSpots = mergedWithSource('spots').filter((s) => !s.deleted && s.enabled !== false);
  const roomList = state.layers.pack?.rooms?.length ? state.layers.pack.rooms : state.layers.defaults.rooms;
  const spotsInRoom = (roomId) => liveSpots.filter((s) => !roomId || s.room === roomId).length;
  const enabledSpots = liveSpots.length;
  page.innerHTML = '';
  const card = el(`<div class="card"><h2>Rounds (heists)</h2>
    <p class="hint">You have <b>${enabledItems}</b> enabled items and <b>${enabledSpots}</b> enabled places (${roomList.map((r) => `${r.name}: ${spotsInRoom(r.id)}`).join(', ')}). A round cannot ask for more than its room has.</p>
    <table><thead><tr><th>#</th><th>Room</th><th>Items to find</th><th>Places used</th><th>Timer (s)</th><th>Put-back bonus (s)</th><th>Wrong click penalty (s)</th><th></th></tr></thead><tbody></tbody></table>
    <div class="error"></div>
    <p class="hint">Changes are kept automatically — press 💾 Save to GitHub when you're done.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn secondary add">+ Add round</button>
      <button class="btn secondary reset">Reset to defaults</button>
    </div></div>`);
  const tbody = card.querySelector('tbody');
  const err = card.querySelector('.error');

  const draw = () => {
    tbody.innerHTML = '';
    rounds.forEach((r, i) => {
      const tr = el(`<tr><td>${i + 1}</td>
        <td><select name="room">${roomList.map((rm) => `<option value="${rm.id}" ${r.room === rm.id ? 'selected' : ''}>${rm.name}</option>`).join('')}</select></td>
        <td><input type="number" min="1" max="12" name="items" value="${r.items}"></td>
        <td><input type="number" min="1" max="10" name="spots" value="${r.spots}"></td>
        <td><input type="number" min="10" max="600" name="timer" value="${r.timer}"></td>
        <td><input type="number" min="5" max="300" name="putbackBonus" value="${r.putbackBonus ?? 30}"></td>
        <td><input type="number" min="0" max="30" name="penalty" value="${r.penalty ?? 2}"></td>
        <td>${rounds.length > 1 ? '<button class="mini danger">✕</button>' : ''}</td></tr>`);
      tr.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { r[inp.name] = Number(inp.value); store(); }));
      tr.querySelector('select').addEventListener('change', (e) => { r.room = e.target.value; store(); });
      if (!r.room) r.room = roomList[0]?.id;
      tr.querySelector('button')?.addEventListener('click', () => { rounds.splice(i, 1); draw(); store(); });
      tbody.appendChild(tr);
    });
  };
  draw();

  const validate = () => {
    for (const [i, r] of rounds.entries()) {
      if (r.items > enabledItems) return `Round ${i + 1} asks for ${r.items} items but only ${enabledItems} are enabled.`;
      if (r.spots > spotsInRoom(r.room)) return `Round ${i + 1} asks for ${r.spots} places but the ${roomList.find((x) => x.id === r.room)?.name || 'room'} only has ${spotsInRoom(r.room)}.`;
      if (!(r.items >= 1 && r.spots >= 1 && r.timer >= 10)) return `Round ${i + 1} has invalid numbers.`;
    }
    return '';
  };
  // Store the whole list after every valid change; the page isn't re-rendered so typing keeps focus.
  const store = () => {
    const problem = validate();
    err.textContent = problem ? `${problem} (not kept until fixed)` : '';
    roundsInvalid = !!problem;
    if (problem) return;
    const snapshot = rounds.map((r) => ({ ...r }));
    writeQueue = writeQueue.then(async () => {
      await db.clear('rounds');
      for (let i = 0; i < snapshot.length; i++) await db.put('rounds', { id: `r${i}`, index: i, ...snapshot[i] });
      state.layers = await loadLayers();
      updateSaveBadge();
    }).catch((e) => toast(`Could not store rounds: ${e.message}`, true));
  };

  card.querySelector('.add').addEventListener('click', () => { rounds.push({ ...rounds[rounds.length - 1] }); draw(); store(); });
  card.querySelector('.reset').addEventListener('click', async () => {
    await flushRounds();
    await db.clear('rounds'); roundsInvalid = false; toast('Rounds reset'); refresh();
  });
  roundsInvalid = false;
  unsavedForms.set('Rounds (invalid values, fix them first)', () => roundsInvalid);
  page.appendChild(card);
}
