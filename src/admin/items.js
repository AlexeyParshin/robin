import { db, imageURL } from '../content/repo.js';
import { el, slug, dropZone, toast, refresh, mergedWithSource, unsavedForms } from './admin.js';

const page = document.getElementById('tab-items');
let editing = null; // record being edited, or null for "new"
let pendingFile = null;

function sourceTag(rec) {
  if (rec.deleted) return '<span class="tag del">deleted</span>';
  if (rec._source === 'user') return `<span class="tag user">${rec._base ? 'edited' : 'custom'}</span>`;
  if (rec._source === 'pack') return '<span class="tag pack">pack</span>';
  return '<span class="tag">default</span>';
}

export function renderItems() {
  const items = mergedWithSource('items').sort((a, b) => a.word.localeCompare(b.word));
  page.innerHTML = '';
  page.appendChild(renderForm(items));

  const card = el(`<div class="card"><h2>All items (${items.filter((i) => !i.deleted && i.enabled !== false).length} enabled)</h2>
    <table><thead><tr><th></th><th>Word</th><th>Article</th><th>Source</th><th>Enabled</th><th></th></tr></thead><tbody></tbody></table></div>`);
  const tbody = card.querySelector('tbody');
  for (const it of items) {
    const tr = el(`<tr class="${it.deleted || it.enabled === false ? 'disabled' : ''}">
      <td><img class="thumb" src="${imageURL(it)}" alt=""></td>
      <td><b>${it.word}</b></td>
      <td>${it.article || '—'}</td>
      <td>${sourceTag(it)}</td>
      <td><input type="checkbox" ${it.enabled !== false && !it.deleted ? 'checked' : ''} ${it.deleted ? 'disabled' : ''}></td>
      <td class="actions"></td>
    </tr>`);
    tr.querySelector('input[type=checkbox]').addEventListener('change', async (e) => {
      await db.put('items', { ...stripMeta(it), enabled: e.target.checked });
      toast(`${it.word} ${e.target.checked ? 'enabled' : 'disabled'}`);
      refresh();
    });
    const actions = tr.querySelector('.actions');
    if (!it.deleted) {
      actions.appendChild(el('<button class="mini">Edit</button>')).addEventListener('click', () => { editing = it; pendingFile = null; renderItems(); window.scrollTo(0, 0); });
      actions.appendChild(el('<button class="mini danger">Delete</button>')).addEventListener('click', () => deleteItem(it));
    }
    if (it._source === 'user') {
      actions.appendChild(el(`<button class="mini ok">${it._base ? 'Restore default' : 'Undo delete'}</button>`)).addEventListener('click', async () => {
        await db.del('items', it.id); toast(`${it.word} restored`); refresh();
      });
    }
    tbody.appendChild(tr);
  }
  page.appendChild(card);
}

function stripMeta(rec) {
  const { _source, _base, _url, ...clean } = rec;
  return clean;
}

async function deleteItem(it) {
  if (!confirm(`Delete "${it.word}"?`)) return;
  if (it._source === 'user' && !it._base) await db.del('items', it.id);
  else await db.put('items', { id: it.id, deleted: true });
  toast(`${it.word} deleted`);
  refresh();
}

function renderForm(items) {
  const isEdit = !!editing;
  const card = el(`<div class="card">
    <h2>${isEdit ? `Edit item: ${editing.word}` : 'Add a new item'}</h2>
    <div class="grid-form">
      <label class="field">English word <input type="text" name="word" placeholder="e.g. banana" value="${isEdit ? editing.word : ''}"></label>
      <label class="field">Article
        <select name="article">
          <option value="a">a</option><option value="an">an</option><option value="">— (none: milk, bread…)</option>
        </select>
      </label>
      <div class="field"><span>Picture (PNG, max 256×256, 200 KB)</span><div class="zone"></div></div>
    </div>
    <p class="hint">Clue preview: <b class="preview"></b></p>
    <div class="error"></div>
    <div class="row">
      <button class="btn save">${isEdit ? 'Save changes' : 'Add item'}</button>
      ${isEdit ? '<button class="btn secondary cancel">Cancel</button>' : ''}
    </div>
  </div>`);
  const word = card.querySelector('[name=word]');
  const article = card.querySelector('[name=article]');
  const err = card.querySelector('.error');
  const preview = card.querySelector('.preview');
  article.value = isEdit ? (editing.article ?? 'a') : 'a';

  const zone = dropZone({ preview: isEdit ? imageURL(editing) : null }, (file) => { pendingFile = file; });
  card.querySelector('.zone').appendChild(zone);

  const updatePreview = () => { preview.textContent = word.value ? `The ${word.value.trim()} is in the fridge.` : '…'; };
  word.addEventListener('input', () => {
    updatePreview();
    const w = word.value.trim().toLowerCase();
    if (!w) return;
    if (!isEdit && !article.dataset.touched) article.value = /^[aeiou]/.test(w) ? 'an' : 'a';
  });
  article.addEventListener('change', () => { article.dataset.touched = '1'; });
  updatePreview();

  const initialWord = word.value.trim().toLowerCase();
  const initialArticle = article.value;
  unsavedForms.set(isEdit ? `Items: edit of "${editing.word}"` : 'Items: new item form', () =>
    word.isConnected && (word.value.trim().toLowerCase() !== initialWord || !!pendingFile || (isEdit && article.value !== initialArticle)));

  card.querySelector('.cancel')?.addEventListener('click', () => { editing = null; pendingFile = null; renderItems(); });
  card.querySelector('.save').addEventListener('click', async () => {
    err.textContent = '';
    const w = word.value.trim().toLowerCase();
    if (!w) return (err.textContent = 'Please type the word.');
    if (!/^[a-z][a-z '-]*$/.test(w)) return (err.textContent = 'Use English letters only.');
    const dup = items.find((i) => i.word === w && !i.deleted && i.id !== editing?.id);
    if (dup) return (err.textContent = `"${w}" already exists.`);
    if (!isEdit && !pendingFile) return (err.textContent = 'Please add a PNG picture.');

    const rec = isEdit ? stripMeta(editing) : { id: slug(w), enabled: true };
    if (items.some((i) => i.id === rec.id) && !isEdit) rec.id = `${rec.id}-${Date.now().toString(36)}`;
    rec.word = w;
    rec.article = article.value;
    if (pendingFile) { rec.image = pendingFile; delete rec.sprite; }
    await db.put('items', rec);
    toast(isEdit ? 'Saved' : `Added "${w}"`);
    editing = null; pendingFile = null;
    refresh();
  });
  return card;
}
