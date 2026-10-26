import { DEFAULTS, calc, normalize, formatRub } from './calc.js';

const START_TIPS = {
  noAnswer: '<b>Без ответа.</b> Регламент и контроль в CRM: каждая заявка получает ответственного и срок ответа. Почти бесплатно.',
  late: '<b>Поздний ответ.</b> ИИ на первой линии в нерабочее время: отвечает за минуту вечером и в выходные, утром менеджер продолжает.',
  noTouch: '<b>Никто не поговорил.</b> Второе касание: задачи в CRM или ИИ, который сам пишет замолчавшим через день.',
};

const PERCENT_KEYS = ['c', 'p1', 'p2', 'c2', 'p3', 'r'];

const $ = (id) => document.getElementById(id);
const form = $('form');
let state = { ...DEFAULTS };

function parseNumber(str) {
  const digits = String(str).replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

function formatInput(n) {
  return n == null ? '' : n.toLocaleString('ru-RU').replace(/\s/g, ' ');
}

function fillForm() {
  for (const el of form.querySelectorAll('input.money')) {
    if (document.activeElement !== el) el.value = formatInput(state[el.name]);
  }
  for (const k of PERCENT_KEYS) {
    const pct = Math.round(state[k] * 100);
    form.elements[k].value = pct;
    form.querySelector(`.slider[data-name="${k}"] output`).textContent = pct + '%';
    form.elements[k].style.setProperty('--fill', pct + '%');
  }
}

// --- анимация чисел ---
const shown = new Map();
function animateTo(el, target, prefix = '') {
  const from = shown.get(el) ?? 0;
  shown.set(el, target);
  cancelAnimationFrame(el._raf);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || from === target) {
    el.textContent = prefix + formatRub(target);
    return;
  }
  const t0 = performance.now();
  const dur = 450;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = prefix + formatRub(from + (target - from) * e);
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
  // Если кадры не идут (фоновая вкладка), всё равно показать точное значение
  clearTimeout(el._done);
  el._done = setTimeout(() => {
    cancelAnimationFrame(el._raf);
    el.textContent = prefix + formatRub(target);
  }, dur + 50);
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
}

function render() {
  const res = calc(state);

  animateTo($('month'), res.month, '~');
  animateTo($('year'), res.year);
  animateTo($('recover'), res.recoverable, '~');

  const max = Math.max(...Object.values(res.losses), 1);
  for (const li of $('bars').children) {
    const key = li.dataset.key;
    const value = res.losses[key];
    li.querySelector('b').textContent = formatRub(value);
    li.querySelector('i').style.width = (value / max) * 100 + '%';
    li.classList.toggle('top', key === res.biggest && res.month > 0);
  }

  $('ad').hidden = res.adWaste == null;
  if (res.adWaste != null) animateTo($('adValue'), res.adWaste);

  $('startText').innerHTML = res.month > 0
    ? START_TIPS[res.biggest]
    : 'С такими цифрами потерь почти нет. Проверьте, что данные реальные.';
  $('honest').hidden = !res.smallFlow;

  $('cta').href = chatLink(res);
}

function chatLink(res) {
  const sum = Math.round(res.month).toLocaleString('ru-RU').replace(/\s/g, ' ');
  const text = `Ренат, посчитал в калькуляторе, получилось ~${sum} ₽ в месяц. Хочу точный аудит по моей компании`;
  return `https://t.me/reeenoooo?text=${encodeURIComponent(text)}`;
}

function showNote(text) {
  const note = $('note');
  note.textContent = text;
  note.hidden = !text;
}

form.addEventListener('input', (e) => {
  const el = e.target;
  const name = el.name;
  if (!name) return;

  if (el.classList.contains('money')) {
    const n = parseNumber(el.value);
    state[name] = name === 'CPL' ? n : (n ?? 0);
    // Переформатировать с пробелами, сохранив позицию курсора относительно конца строки
    const tail = el.value.length - el.selectionEnd;
    el.value = formatInput(n);
    const pos = Math.max(0, el.value.length - tail);
    el.setSelectionRange(pos, pos);
    render();
    return;
  }

  const before = { ...state, [name]: Number(el.value) / 100 };
  state = normalize(before, name);
  const notes = [];
  if (before.c2 !== state.c2) notes.push('Конверсия при позднем ответе не может быть выше обычной.');
  if (before.p1 !== state.p1 || before.p2 !== state.p2) notes.push('Без ответа и вечерние вместе не больше 100%, поправили соседний ползунок.');
  showNote(notes.join(' '));
  fillForm();
  render();
});

form.addEventListener('focusout', (e) => {
  if (e.target.classList?.contains('money')) fillForm();
});

form.addEventListener('submit', (e) => e.preventDefault());

$('cta').addEventListener('click', (e) => {
  e.preventDefault();
  window.open(chatLink(calc(state)));
});

fillForm();
render();
