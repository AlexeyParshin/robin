import { exportPack, resetUserContent, markPackSaved } from '../content/repo.js';
import { el, toast, refresh, state, unsavedForms } from './admin.js';
import { flushRounds } from './rounds.js';
import { getToken, setToken, commitFile, repoName } from './github.js';

const page = document.getElementById('tab-pack');
const saveBtn = document.getElementById('save-btn');

function localEditCount() {
  const { user } = state.layers;
  return user.items.length + user.spots.length + (user.rounds.length ? 1 : 0); // rounds are stored as one list
}

export function updateSaveBadge() {
  const n = localEditCount();
  const badge = document.getElementById('save-badge');
  badge.hidden = n === 0;
  badge.textContent = `${n} unsaved`;
}

function openPackTab() { document.querySelector('.tab[data-tab="pack"]').click(); }

async function saveToGitHub() {
  if (!getToken()) {
    openPackTab();
    toast('Add a GitHub token first (GitHub tab)', true);
    return;
  }
  await flushRounds();
  const pending = [...unsavedForms].filter(([, isDirty]) => isDirty()).map(([name]) => name);
  if (pending.length && !confirm(`These changes are NOT stored yet and won't be saved:\n\n• ${pending.join('\n• ')}\n\nPress Cancel to go back and finish them (Add / Save changes), or OK to save the rest anyway.`)) return;
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
  const edits = localEditCount();
  updateSaveBadge();
  page.innerHTML = '';
  const card = el(`<div><div class="card">
    <h2>Save to GitHub</h2>
    <p class="hint">
      Your edits live only in <b>this browser</b> until you save (${edits} local change${edits === 1 ? '' : 's'}).
      <b>💾 Save to GitHub</b> (top right) commits them as <code>assets/content-pack.json</code> to ${repoName};
      every player gets them about a minute later. Images are embedded in the pack.<br>
      ${state.layers.pack?.exportedAt ? `Last saved: ${new Date(state.layers.pack.exportedAt).toLocaleString()}.<br>` : ''}
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
    <h2>Danger zone</h2>
    <p class="hint">Discards unsaved edits in this browser. Content already saved to GitHub is not affected.</p>
    <button class="btn danger reset">Discard unsaved changes</button>
  </div></div>`);

  card.querySelector('.store-token').addEventListener('click', () => {
    const v = card.querySelector('.token').value.trim();
    if (!v) return;
    setToken(v);
    toast('Token saved in this browser');
    renderPack();
  });
  card.querySelector('.forget-token').addEventListener('click', () => { setToken(''); toast('Token removed'); renderPack(); });
  card.querySelector('.reset').addEventListener('click', async () => {
    if (!confirm('Discard ALL unsaved changes in this browser?')) return;
    await resetUserContent();
    toast('Unsaved changes discarded');
    refresh();
  });
  page.appendChild(card);
}
