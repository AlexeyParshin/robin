import { db, imageURL } from '../content/repo.js';
import { PREPOSITIONS, PREPOSITION_ORDER } from '../data/content.js';
import { el, slug, dropZone, toast, refresh, mergedWithSource } from './admin.js';

const page = document.getElementById('tab-spots');
let selectedId = null;
let pendingFile = null;

function strip(rec) { const { _source, _base, _url, ...c } = rec; return c; }

export function renderSpots() {
  const spots = mergedWithSource('spots');
  const live = spots.filter((s) => !s.deleted);
  page.innerHTML = '';
  if (selectedId && !live.some((s) => s.id === selectedId)) selectedId = null;

  // ---- Room editor ----
  const editorCard = el(`<div class="card"><h2>Places in the room — drag to move, corner to resize</h2>
    <div class="room-editor-wrap"><div class="room-editor"></div></div>
    <p class="hint">Click a place to edit it below. Positions are in a 960×540 room.</p></div>`);
  const editor = editorCard.querySelector('.room-editor');
  const wrap = editorCard.querySelector('.room-editor-wrap');
  for (const s of live) editor.appendChild(makeBox(s, editor));
  page.appendChild(editorCard);
  const fit = () => {
    const k = Math.min(1, (wrap.clientWidth || 960) / 960);
    editor.style.transform = `scale(${k})`;
    wrap.style.height = `${540 * k + 6}px`;
    editor.dataset.k = k;
  };
  requestAnimationFrame(fit);
  window.addEventListener('resize', fit, { once: true });

  // ---- Form ----
  const sel = live.find((s) => s.id === selectedId);
  page.appendChild(renderForm(sel, spots));

  // ---- Table ----
  const card = el(`<div class="card"><h2>All places</h2><table><thead><tr><th></th><th>Name</th><th>Prepositions</th><th>Source</th><th>Enabled</th><th></th></tr></thead><tbody></tbody></table></div>`);
  const tbody = card.querySelector('tbody');
  for (const s of spots) {
    const tr = el(`<tr class="${s.deleted || s.enabled === false ? 'disabled' : ''}">
      <td><img class="thumb" src="${imageURL(s)}" alt=""></td>
      <td><b>the ${s.noun}</b></td>
      <td>${(s.prepositions || []).map((p) => `<span class="tag" style="color:${PREPOSITIONS[p]?.color};border-color:${PREPOSITIONS[p]?.color}">${p}</span>`).join(' ')}</td>
      <td>${s.deleted ? '<span class="tag del">deleted</span>' : s._source === 'user' ? `<span class="tag user">${s._base ? 'edited' : 'custom'}</span>` : s._source === 'pack' ? '<span class="tag pack">pack</span>' : '<span class="tag">default</span>'}</td>
      <td><input type="checkbox" ${s.enabled !== false && !s.deleted ? 'checked' : ''} ${s.deleted ? 'disabled' : ''}></td>
      <td class="actions"></td></tr>`);
    tr.querySelector('input').addEventListener('change', async (e) => {
      await db.put('spots', { ...strip(s), enabled: e.target.checked }); refresh();
    });
    const a = tr.querySelector('.actions');
    if (!s.deleted) {
      a.appendChild(el('<button class="mini">Edit</button>')).addEventListener('click', () => { selectedId = s.id; pendingFile = null; renderSpots(); });
      a.appendChild(el('<button class="mini danger">Delete</button>')).addEventListener('click', async () => {
        if (!confirm(`Delete "the ${s.noun}"?`)) return;
        if (s._source === 'user' && !s._base) await db.del('spots', s.id); else await db.put('spots', { id: s.id, deleted: true });
        refresh();
      });
    }
    if (s._source === 'user') a.appendChild(el(`<button class="mini ok">${s._base ? 'Restore default' : 'Undo delete'}</button>`)).addEventListener('click', async () => { await db.del('spots', s.id); refresh(); });
    tbody.appendChild(tr);
  }
  page.appendChild(card);
}

function makeBox(s, editor) {
  const box = el(`<div class="box ${s.id === selectedId ? 'selected' : ''} ${s.enabled === false ? 'disabled' : ''}" style="left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px">
    <img src="${imageURL(s)}" alt=""><span class="name">the ${s.noun}</span><span class="handle"></span></div>`);
  let drag = null;
  const onDown = (e, mode) => {
    e.preventDefault(); e.stopPropagation();
    const k = Number(editor.dataset.k || 1);
    drag = { mode, k, sx: e.clientX, sy: e.clientY, x: s.x, y: s.y, w: s.w, h: s.h };
    box.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / drag.k;
    const dy = (e.clientY - drag.sy) / drag.k;
    if (drag.mode === 'move') {
      s.x = Math.round(Math.max(0, Math.min(960 - s.w, drag.x + dx)));
      s.y = Math.round(Math.max(0, Math.min(540 - s.h, drag.y + dy)));
    } else {
      s.w = Math.round(Math.max(24, Math.min(960 - s.x, drag.w + dx)));
      s.h = Math.round(Math.max(24, Math.min(540 - s.y, drag.h + dy)));
    }
    box.style.cssText = `left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px`;
  };
  const onUp = async () => {
    if (!drag) return;
    drag = null;
    await db.put('spots', strip(s));
    selectedId = s.id;
    toast(`Saved position of the ${s.noun}`);
    refresh();
  };
  box.addEventListener('pointerdown', (e) => onDown(e, e.target.classList.contains('handle') ? 'resize' : 'move'));
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
  box.addEventListener('pointercancel', onUp);
  return box;
}

function renderForm(sel, spots) {
  const isEdit = !!sel;
  const card = el(`<div class="card">
    <h2>${isEdit ? `Edit place: the ${sel.noun}` : 'Add a new place'}</h2>
    <div class="grid-form">
      <label class="field">Name (noun) <input type="text" name="noun" placeholder="e.g. sofa" value="${isEdit ? sel.noun : ''}"></label>
      <label class="field">X <input type="number" name="x" value="${sel?.x ?? 100}"></label>
      <label class="field">Y <input type="number" name="y" value="${sel?.y ?? 200}"></label>
      <label class="field">Width <input type="number" name="w" value="${sel?.w ?? 120}"></label>
      <label class="field">Height <input type="number" name="h" value="${sel?.h ?? 120}"></label>
      <div class="field"><span>Picture (PNG, max 256×256)</span><div class="zone"></div></div>
    </div>
    <div class="field" style="margin-top:12px"><span>Prepositions that make sense for this place</span><div class="chips"></div></div>
    <div class="nouns" style="margin-top:10px"></div>
    <div class="error"></div>
    <div class="row" style="margin-top:10px">
      <button class="btn save">${isEdit ? 'Save changes' : 'Add place'}</button>
      ${isEdit ? '<button class="btn secondary cancel">New place instead</button>' : ''}
    </div>
  </div>`);
  const chips = card.querySelector('.chips');
  const nounsBox = card.querySelector('.nouns');
  const chosen = new Set(sel?.prepositions || ['in']);
  const nouns = { ...(sel?.nouns || {}) };

  const renderNouns = () => {
    nounsBox.innerHTML = '';
    for (const p of PREPOSITION_ORDER) if (chosen.has(p)) {
      const row = el(`<label class="field" style="flex-direction:row;align-items:center;gap:8px">
        <span style="min-width:120px;color:${PREPOSITIONS[p].color}">…${p} the</span>
        <input type="text" placeholder="${card.querySelector('[name=noun]').value || 'noun'}" value="${nouns[p] || ''}" style="max-width:200px">
        <span class="hint">(override, e.g. "books" for "between the books")</span></label>`);
      row.querySelector('input').addEventListener('input', (e) => { if (e.target.value.trim()) nouns[p] = e.target.value.trim().toLowerCase(); else delete nouns[p]; });
      nounsBox.appendChild(row);
    }
  };
  for (const p of PREPOSITION_ORDER) {
    const chip = el(`<label class="chip ${chosen.has(p) ? 'on' : ''}" style="--c:${PREPOSITIONS[p].color}"><input type="checkbox" ${chosen.has(p) ? 'checked' : ''}> ${p}</label>`);
    chip.querySelector('input').addEventListener('change', (e) => {
      e.target.checked ? chosen.add(p) : chosen.delete(p);
      chip.classList.toggle('on', e.target.checked);
      renderNouns();
    });
    chips.appendChild(chip);
  }
  renderNouns();

  card.querySelector('.zone').appendChild(dropZone({ preview: isEdit ? imageURL(sel) : null }, (f) => { pendingFile = f; }));
  card.querySelector('.cancel')?.addEventListener('click', () => { selectedId = null; pendingFile = null; renderSpots(); });

  card.querySelector('.save').addEventListener('click', async () => {
    const err = card.querySelector('.error');
    err.textContent = '';
    const noun = card.querySelector('[name=noun]').value.trim().toLowerCase();
    if (!noun) return (err.textContent = 'Please type the name of the place.');
    if (!chosen.size) return (err.textContent = 'Pick at least one preposition.');
    if (!isEdit && !pendingFile) return (err.textContent = 'Please add a PNG picture.');
    const num = (n) => Number(card.querySelector(`[name=${n}]`).value) || 0;
    const rec = isEdit ? strip(sel) : { id: slug(noun), enabled: true };
    if (!isEdit && spots.some((s) => s.id === rec.id)) rec.id = `${rec.id}-${Date.now().toString(36)}`;
    Object.assign(rec, { noun, x: num('x'), y: num('y'), w: num('w'), h: num('h'), prepositions: PREPOSITION_ORDER.filter((p) => chosen.has(p)), nouns });
    if (!Object.keys(nouns).length) delete rec.nouns;
    if (pendingFile) { rec.image = pendingFile; delete rec.sprite; }
    await db.put('spots', rec);
    toast(isEdit ? 'Saved' : `Added "the ${noun}"`);
    selectedId = rec.id; pendingFile = null;
    refresh();
  });
  return card;
}
