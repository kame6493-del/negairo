import { describe, expect, it } from 'vitest';
import { applyGrade, buildLut, grade, halfToFloat, luma, NEUTRAL, rolloff, sCurve, srgbToLinear, linearToSrgb, toHalf, LUT_SIZE } from './color';
import { encodeGlyphs, formatDate, glyphCode, parseIsoDate, toIso } from './datestamp';
import { canSave, findLook, LOOKS, needsWatermark } from './presets';
import { layoutDate, outputSize } from './renderer';
import { instantFrame, watermarkGeom } from './compose';

describe('色の転がし', () => {
  it('S字は端点を動かさず単調に増える', () => {
    for (const k of [0.7, 1, 1.4]) {
      expect(sCurve(0, k, 0.45)).toBeCloseTo(0, 6);
      expect(sCurve(1, k, 0.45)).toBeCloseTo(1, 6);
      let prev = -1;
      for (let i = 0; i <= 100; i++) { const y = sCurve(i / 100, k, 0.45); expect(y).toBeGreaterThanOrEqual(prev); prev = y; }
    }
  });
  it('sRGB と線形の往復', () => {
    for (const v of [0, 0.02, 0.2, 0.5, 0.9, 1]) expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 5);
  });
  it('肩は 1 を超えない', () => {
    for (const x of [0.5, 1, 2, 10]) expect(rolloff(x, 1)).toBeLessThanOrEqual(1);
    expect(rolloff(3, 0)).toBe(1);
  });
  it('何もしない設定なら色は変わらない', () => {
    for (const c of [[0.1, 0.5, 0.9], [1, 0, 0], [0.3, 0.3, 0.3]] as [number, number, number][]) {
      const o = applyGrade(NEUTRAL, c);
      o.forEach((v, i) => expect(v).toBeCloseTo(c[i], 4));
    }
  });
  it('LUT の大きさと値の範囲', () => {
    const lut = buildLut(grade({ contrast: 1.3, saturation: 1.4, exposure: 1 }));
    expect(lut.length).toBe(LUT_SIZE ** 3 * 4);
    for (const v of lut) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
  it('半精度への変換は 1/1000 以内', () => {
    for (const v of [0, 0.001, 0.25, 0.5, 0.7777, 1]) expect(Math.abs(halfToFloat(toHalf(v)) - v)).toBeLessThan(1e-3);
  });
  it('全部の味で、灰色の明るさの順序が保たれる(階調が反転しない)', () => {
    for (const l of LOOKS) {
      let prev = -1;
      for (let i = 0; i <= 32; i++) {
        const v = i / 32;
        const o = applyGrade(l.grade, [v, v, v]);
        const y = luma(o[0], o[1], o[2]);
        expect(y, l.id).toBeGreaterThanOrEqual(prev - 1e-6);
        prev = y;
      }
    }
  });
  it('白黒の味は彩度がほぼ 0(紙のわずかな色だけ)', () => {
    const o = applyGrade(findLook('mono400').grade, [0.9, 0.2, 0.1]);
    expect(Math.abs(o[0] - o[1])).toBeLessThan(1e-6);
    expect(Math.abs(o[1] - o[2])).toBeLessThan(0.01);
  });
});

describe('日付', () => {
  const d = { y: 2026, m: 10, d: 3 };
  it('形ごとの文字列', () => {
    expect(formatDate(d, 'film')).toBe("'26 10  3");
    expect(formatDate(d, 'digital')).toBe('2026/10/03');
    expect(formatDate(d, 'dots')).toBe('26.10.03');
    expect(formatDate({ y: 2005, m: 1, d: 9 }, 'film')).toBe("'05  1  9");
  });
  it('日付の読み取りは存在しない日を断る', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('abc')).toBeNull();
    expect(parseIsoDate('2026-10-03')).toEqual(d);
    expect(toIso(d)).toBe('2026-10-03');
  });
  it('7セグメントの符号', () => {
    expect(glyphCode('8')).toBe(0x7f);
    expect(glyphCode('1')).toBe(0x06);
    expect(glyphCode(' ')).toBe(0);
    const { codes, count } = encodeGlyphs('2026/10/03');
    expect(count).toBe(10);
    expect(codes[4]).toBe(1 << 9);
  });
  it('並びの幅は文字が増えるほど広い', () => {
    expect(layoutDate("'26 10  3").width).toBeGreaterThan(layoutDate('26').width);
    expect(layoutDate('').width).toBe(0);
  });
});

describe('大きさ', () => {
  it('長辺を上限に収め、縦横比を保つ', () => {
    const s = outputSize(8000, 6000, findLook('natsuiro'), 4032);
    expect(s.w).toBe(4032); expect(s.h).toBe(3024); expect(s.lowW).toBe(0);
  });
  it('小さい写真は拡大しない', () => {
    const s = outputSize(800, 600, findLook('natsuiro'), 4032);
    expect([s.w, s.h]).toEqual([800, 600]);
  });
  it('ガラケーは 640 で作って 1280 で出す', () => {
    const s = outputSize(4032, 3024, findLook('garake'), 4032);
    expect([s.lowW, s.lowH]).toEqual([640, 480]);
    expect([s.w, s.h]).toEqual([1280, 960]);
  });
  it('インスタントの枠は下が厚い', () => {
    const g = instantFrame(1000, 1000);
    expect(g.W).toBe(1120); expect(g.H).toBe(1280); expect(g.x).toBe(60);
  });
  it('名前は写真の内側に入る', () => {
    const w = watermarkGeom(4032, 3024);
    expect(w.y).toBeLessThan(3024); expect(w.x).toBeGreaterThan(0); expect(w.size).toBeGreaterThan(40);
  });
});

describe('無料と完全版', () => {
  it('無料は3種で、完全版は全部', () => {
    expect(LOOKS.filter((l) => l.free).map((l) => l.id)).toEqual(['natsuiro', 'sutekame', 'mono400']);
    expect(LOOKS.length).toBe(10);
    for (const l of LOOKS) expect(canSave(l, true)).toBe(true);
    expect(canSave(findLook('instant'), false)).toBe(false);
    expect(canSave(findLook('sutekame'), false)).toBe(true);
    expect(needsWatermark(false)).toBe(true);
    expect(needsWatermark(true)).toBe(false);
  });
  it('id は重ならない', () => {
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length);
  });
});
