import { exportPack, importPack, resetUserContent, markPackSaved } from '../content/repo.js';
import { el, toast, refresh, state } from './admin.js';
import { getToken, setToken, commitFile, repoName } from './github.js';

const page = document.getElementById('tab-pack');
const saveBtn = document.getElementById('save-btn');

function localEditCount() {
  const { user } = state.layers;
  return user.items.length + user.spots.length + user.rounds.length;
}

function updateSaveBadge() {
  const n = localEditCount();
  const badge = document.getElementById('save-badge');
  badge.hidden = n === 0;
  badge.textContent = `${n} unsaved`;
}

function openPackTab() { document.querySelector('.tab[data-tab="pack"]').click(); }

async function saveToGitHub() {
  if (!getToken()) {
    openPackTab();
    toast('Add a GitHub token first (Save / Export tab)', true);
    return;
  }
  const n = localEditCount();
  if (n === 0 && !confirm('No local changes since the last save. Save anyway?')) return;
  saveBtn.disabled = true;
  const label = saveBtn.firstChild.textContent;
  saveBtn.firstChild.textContent = 'Saving… ';
  try {
    const pack = await exportPack();
    await commitFile('assets/content-pack.json', JSON.stringify(pack, null, 2) + '\n',
      `Admin: update content pack (${pack.items.filter((i) => !i.deleted).length} items, ${pack.spots.filter((s) => !s.deleted).length} places)`);
    await markPackSaved(pack);
    toast('Saved to GitHub — the game updates in about a minute');
    refresh();
  } catch (e) {
    toast(`Save failed: ${e.message}`, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.firstChild.textContent = label;
  }
}
saveBtn.addEventListener('click', saveToGitHub);
window.addEventListener('beforeunload', (e) => {
  if (state.layers && localEditCount() > 0) { e.preventDefault(); e.returnValue = ''; }
});

export function renderPack() {
  const { pack } = state.layers;
  const edits = localEditCount();
  updateSaveBadge();
  page.innerHTML = '';
  const card = el(`<div><div class="card">
    <h2>Save to GitHub</h2>
    <p class="hint">
      Your edits live only in <b>this browser</b> until you save (${edits} local change${edits === 1 ? '' : 's'}).
      <b>💾 Save to GitHub</b> (top right) commits them as <code>assets/content-pack.json</code> to ${repoName};
      every player gets them about a minute later. Images are embedded in the pack.<br>
      Needs a GitHub fine-grained token with <b>Contents: Read and write</b> on the ${repoName} repo only
      (github.com → Settings → Developer settings → Fine-grained tokens). It is stored only in this browser.
    </p>
    <div class="row" style="margin-top:12px">
      <input type="password" class="token" placeholder="github_pat_..." autocomplete="off" style="flex:1;min-width:220px">
      <button class="btn store-token">Save token</button>
      <button class="btn danger forget-token">Forget token</button>
    </div>
    <p class="hint token-status" style="margin-top:8px">${getToken() ? '✅ Token is set in this browser.' : '⚠ No token yet — paste one above to enable saving.'}</p>
  </div>
  <div class="card">
    <h2>Export / Import content pack</h2>
    <p class="hint">
      Manual alternative: <b>Export</b> downloads <code>content-pack.json</code>; <b>Import</b> loads one into this browser.<br>
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

  card.querySelector('.store-token').addEventListener('click', () => {
    const v = card.querySelector('.token').value.trim();
    if (!v) return;
    setToken(v);
    toast('Token saved in this browser');
    renderPack();
  });
  card.querySelector('.forget-token').addEventListener('click', () => { setToken(''); toast('Token removed'); renderPack(); });
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
