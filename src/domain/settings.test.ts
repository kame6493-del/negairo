import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, dateOn, dateStyleFor, dateText, newLeakSeed, normalizeSettings } from './settings';
import { findLook } from '../fx/presets';

describe('設定の読み直し', () => {
  it('空や壊れた値は既定へ', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    const s = normalizeSettings({ lookId: 'nope', strength: 500, dateStyle: 'weird', customDate: '2026-13-01', facing: 'up', leakOn: 'yes' });
    expect(s.lookId).toBe(DEFAULT_SETTINGS.lookId);
    expect(s.strength).toBe(100);
    expect(s.dateStyle).toBe('auto');
    expect(s.customDate).toBeNull();
    expect(s.facing).toBe('environment');
    expect(s.leakOn).toBe(false);
  });
  it('正しい値は残る(往復しても同じ)', () => {
    const s = { ...DEFAULT_SETTINGS, lookId: 'aseta', strength: 40, dateByLook: { aseta: true }, dateStyle: 'digital' as const, customDate: '1999-07-21', leakOn: true, grainOn: false, facing: 'user' as const };
    expect(normalizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('知らない味の日付設定は捨てる', () => {
    expect(normalizeSettings({ dateByLook: { aseta: true, ghost: true, mono400: 'y' } }).dateByLook).toEqual({ aseta: true });
  });
});

describe('日付の決め方', () => {
  const taken = new Date(2026, 9, 3, 12);
  it('使い捨ては既定で日付あり、ナツイロはなし', () => {
    expect(dateOn(DEFAULT_SETTINGS, findLook('sutekame'))).toBe(true);
    expect(dateOn(DEFAULT_SETTINGS, findLook('natsuiro'))).toBe(false);
    expect(dateText(DEFAULT_SETTINGS, findLook('sutekame'), taken)).toBe("'26 10  3");
    expect(dateText(DEFAULT_SETTINGS, findLook('natsuiro'), taken)).toBeNull();
  });
  it('指定した日付と形が優先される', () => {
    const s = { ...DEFAULT_SETTINGS, customDate: '1998-08-15', dateStyle: 'dots' as const };
    expect(dateStyleFor(s, findLook('heiseidigi'))).toBe('dots');
    expect(dateText(s, findLook('sutekame'), taken)).toBe('98.08.15');
  });
  it('デジカメの味は自動でデジカメの形', () => {
    expect(dateText(DEFAULT_SETTINGS, findLook('heiseidigi'), taken)).toBe('2026/10/03');
  });
  it('光もれの乱数は範囲内', () => {
    let i = 0;
    const seq = [0, 1, 0.5, 0.25];
    const s = newLeakSeed(() => seq[i++]);
    expect(s[1]).toBeCloseTo(0.85);
    expect(s[0]).toBe(0);
  });
});
