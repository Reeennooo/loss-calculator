// Формулы из ТЗ. Проценты передаются долями (0.15 = 15%).
export const DEFAULTS = {
  N: 300,
  A: 40000,
  c: 0.15,
  CPL: 1500,
  p1: 0.1,
  p2: 0.3,
  c2: 0.08,
  p3: 0.5,
  r: 0.2,
};

export const LOSS_KEYS = ['noAnswer', 'late', 'noTouch'];

export function calc({ N, A, c, CPL, p1, p2, c2, p3, r }) {
  const losses = {
    noAnswer: N * p1 * c * A,
    late: N * p2 * (c - c2) * A,
    noTouch: N * (1 - p1 - p2) * p3 * r * c * A,
  };
  const month = losses.noAnswer + losses.late + losses.noTouch;
  const biggest = LOSS_KEYS.reduce((a, b) => (losses[b] > losses[a] ? b : a));
  return {
    losses,
    month,
    year: month * 12,
    recoverable: month / 3,
    adWaste: CPL == null ? null : N * p1 * CPL,
    biggest,
    smallFlow: N < 50,
  };
}

// Правила валидации: c2 ≤ c, p1 + p2 ≤ 1, всё в [0, 1].
// changed — имя поля, которое человек только что двигал: его значение сохраняем, соседнее поджимаем.
export function normalize(values, changed) {
  const v = { ...values };
  for (const k of ['c', 'p1', 'p2', 'c2', 'p3', 'r']) v[k] = clamp(v[k], 0, 1);
  // c2 не может обогнать c: двигаем c2 вниз в любом случае
  if (v.c2 > v.c) v.c2 = v.c;
  if (v.p1 + v.p2 > 1) {
    if (changed === 'p2') v.p1 = round2(1 - v.p2);
    else v.p2 = round2(1 - v.p1);
  }
  return v;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round2 = (x) => Math.round(x * 100) / 100;

export function formatRub(x) {
  return Math.round(x).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
}
