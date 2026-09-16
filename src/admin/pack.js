import { exportPack, importPack, resetUserContent } from '../content/repo.js';
import { el, toast, refresh, state } from './admin.js';

const page = document.getElementById('tab-pack');

export function renderPack() {
  const { user, pack } = state.layers;
  const edits = user.items.length + user.spots.length + user.rounds.length;
  page.innerHTML = '';
  const card = el(`<div><div class="card">
    <h2>Export / Import content pack</h2>
    <p class="hint">
      Your edits live only in <b>this browser</b> (${edits} local change${edits === 1 ? '' : 's'}).
      To share them with everyone who plays the game:<br>
      1. <b>Export</b> — downloads <code>content-pack.json</code> (images are embedded as base64).<br>
      2. Put it into the game folder as <code>assets/content-pack.json</code>, commit and push.<br>
      3. The game loads that file on start, so every player gets your words and pictures.<br>
      ${pack ? `<span class="tag pack">A committed pack is currently loaded (${pack.items?.length ?? 0} items, ${pack.spots?.length ?? 0} places${pack.exportedAt ? ', ' + new Date(pack.exportedAt).toLocaleString() : ''}).</span>` : '<span class="tag">No committed pack found at assets/content-pack.json.</span>'}
    </p>
    <div class="row" style="margin-top:12px">
      <button class="btn export">⬇ Export pack</button>
      <label class="btn secondary" style="cursor:pointer">⬆ Import pack <input type="file" accept="application/json" hidden></label>
      <label class="row" style="gap:6px;font-size:13px"><input type="checkbox" class="replace"> Replace everything (instead of merging)</label>
    </div>
  </div>
  <div class="card">
    <h2>Danger zone</h2>
    <p class="hint">Removes all local edits in this browser. Built-in content and a committed pack are not affected.</p>
    <button class="btn danger reset">Delete all local changes</button>
  </div></div>`);

  card.querySelector('.export').addEventListener('click', async () => {
    const pack = await exportPack();
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content-pack.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Exported ${pack.items.length} items, ${pack.spots.length} places`);
  });
  card.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const pack = JSON.parse(await file.text());
      await importPack(pack, { replace: card.querySelector('.replace').checked });
      toast(`Imported ${pack.items?.length ?? 0} items, ${pack.spots?.length ?? 0} places`);
      refresh();
    } catch (err) { toast(`Import failed: ${err.message}`, true); }
  });
  card.querySelector('.reset').addEventListener('click', async () => {
    if (!confirm('Delete ALL local changes in this browser?')) return;
    await resetUserContent();
    toast('Local changes deleted');
    refresh();
  });
  page.appendChild(card);
}
