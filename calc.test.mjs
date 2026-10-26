import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, calc, normalize, formatRub } from './calc.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} ≈ ${b}`);

test('значения по умолчанию совпадают с роликом', () => {
  const r = calc(DEFAULTS);
  near(r.losses.noAnswer, 180000);
  near(r.losses.late, 252000);
  near(r.losses.noTouch, 108000);
  near(r.month, 540000);
  near(r.year, 6480000);
  near(r.recoverable, 180000);
  near(r.adWaste, 45000);
  assert.equal(r.biggest, 'late');
  assert.equal(r.smallFlow, false);
});

test('пустой CPL скрывает рекламу', () => {
  assert.equal(calc({ ...DEFAULTS, CPL: null }).adWaste, null);
});

test('самая большая потеря меняется', () => {
  assert.equal(calc({ ...DEFAULTS, p1: 0.4 }).biggest, 'noAnswer');
  assert.equal(calc({ ...DEFAULTS, p2: 0.05, p3: 0.9, r: 0.5 }).biggest, 'noTouch');
});

test('N < 50 включает честный блок', () => {
  assert.equal(calc({ ...DEFAULTS, N: 49 }).smallFlow, true);
  assert.equal(calc({ ...DEFAULTS, N: 50 }).smallFlow, false);
});

test('валидация', () => {
  assert.equal(normalize({ ...DEFAULTS, c2: 0.2 }, 'c2').c2, 0.15);
  assert.equal(normalize({ ...DEFAULTS, c: 0.05 }, 'c').c2, 0.05);
  const a = normalize({ ...DEFAULTS, p1: 0.8 }, 'p1');
  assert.equal(a.p1 + a.p2, 1);
  assert.equal(a.p1, 0.8);
  const b = normalize({ ...DEFAULTS, p2: 0.95 }, 'p2');
  assert.equal(b.p2, 0.95);
  assert.ok(b.p1 + b.p2 <= 1);
});

test('формат суммы', () => {
  assert.equal(formatRub(540000).replace(/ /g, ' '), '540 000 ₽');
});
