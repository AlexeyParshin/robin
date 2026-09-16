import { clueParts } from '../round.js';

const activeEl = document.getElementById('active-clue');
const listEl = document.getElementById('clue-list');

function clueHTML(task, verb) {
  const p = clueParts(task, verb);
  return `${p.before}<span class="prep" style="color:${p.color}">${p.prep}</span>${p.after}`;
}

export function renderClueList(tasks, verb = 'is') {
  listEl.innerHTML = '';
  for (const t of tasks) {
    const li = document.createElement('li');
    li.dataset.id = t.id;
    li.innerHTML = clueHTML(t, verb);
    listEl.appendChild(li);
  }
}

export function setActiveTask(task, verb = 'is') {
  listEl.querySelectorAll('li').forEach((li) => li.classList.toggle('active', li.dataset.id === task?.id));
  activeEl.innerHTML = task ? clueHTML(task, verb) : '';
  if (task) {
    activeEl.style.animation = 'none';
    void activeEl.offsetWidth;
    activeEl.style.animation = 'slot-bounce 0.3s ease-out';
  }
}

export function markFound(task) {
  listEl.querySelector(`li[data-id="${task.id}"]`)?.classList.add('found');
}

export function setPanelTitle(html) {
  activeEl.innerHTML = html;
}
