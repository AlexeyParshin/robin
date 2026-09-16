import { db } from '../content/repo.js';
import { el, toast, refresh, mergedWithSource, state } from './admin.js';

const page = document.getElementById('tab-rounds');

function currentRounds() {
  const { defaults, pack, user } = state.layers;
  if (user.rounds.length) return user.rounds.sort((a, b) => a.index - b.index).map(({ id, index, ...r }) => r);
  if (pack?.rounds?.length) return pack.rounds;
  return defaults.rounds;
}

export function renderRounds() {
  const rounds = currentRounds().map((r) => ({ ...r }));
  const enabledItems = mergedWithSource('items').filter((i) => !i.deleted && i.enabled !== false).length;
  const enabledSpots = mergedWithSource('spots').filter((s) => !s.deleted && s.enabled !== false).length;
  page.innerHTML = '';
  const card = el(`<div class="card"><h2>Rounds (heists)</h2>
    <p class="hint">You have <b>${enabledItems}</b> enabled items and <b>${enabledSpots}</b> enabled places. A round cannot ask for more than that.</p>
    <table><thead><tr><th>#</th><th>Items to find</th><th>Places used</th><th>Timer (s)</th><th>Put-back bonus (s)</th><th>Wrong click penalty (s)</th><th></th></tr></thead><tbody></tbody></table>
    <div class="error"></div>
    <div class="row" style="margin-top:12px">
      <button class="btn save">Save rounds</button>
      <button class="btn secondary add">+ Add round</button>
      <button class="btn secondary reset">Reset to defaults</button>
    </div></div>`);
  const tbody = card.querySelector('tbody');
  const err = card.querySelector('.error');

  const draw = () => {
    tbody.innerHTML = '';
    rounds.forEach((r, i) => {
      const tr = el(`<tr><td>${i + 1}</td>
        <td><input type="number" min="1" max="12" name="items" value="${r.items}"></td>
        <td><input type="number" min="1" max="10" name="spots" value="${r.spots}"></td>
        <td><input type="number" min="10" max="600" name="timer" value="${r.timer}"></td>
        <td><input type="number" min="5" max="300" name="putbackBonus" value="${r.putbackBonus ?? 30}"></td>
        <td><input type="number" min="0" max="30" name="penalty" value="${r.penalty ?? 2}"></td>
        <td>${rounds.length > 1 ? '<button class="mini danger">✕</button>' : ''}</td></tr>`);
      tr.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { r[inp.name] = Number(inp.value); }));
      tr.querySelector('button')?.addEventListener('click', () => { rounds.splice(i, 1); draw(); });
      tbody.appendChild(tr);
    });
  };
  draw();

  card.querySelector('.add').addEventListener('click', () => { rounds.push({ ...rounds[rounds.length - 1] }); draw(); });
  card.querySelector('.reset').addEventListener('click', async () => { await db.clear('rounds'); toast('Rounds reset'); refresh(); });
  card.querySelector('.save').addEventListener('click', async () => {
    err.textContent = '';
    for (const [i, r] of rounds.entries()) {
      if (r.items > enabledItems) return (err.textContent = `Round ${i + 1} asks for ${r.items} items but only ${enabledItems} are enabled.`);
      if (r.spots > enabledSpots) return (err.textContent = `Round ${i + 1} asks for ${r.spots} places but only ${enabledSpots} are enabled.`);
      if (r.items < 1 || r.spots < 1 || r.timer < 10) return (err.textContent = `Round ${i + 1} has invalid numbers.`);
    }
    await db.clear('rounds');
    for (let i = 0; i < rounds.length; i++) await db.put('rounds', { id: `r${i}`, index: i, ...rounds[i] });
    toast('Rounds saved');
    refresh();
  });
  page.appendChild(card);
}
