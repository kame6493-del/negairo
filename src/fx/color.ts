/**
 * 色の転がし(LUT)を自前の式から作る。他社の LUT ファイルは使わない。
 * 入力・出力は sRGB の 0〜1。WebGL の 3D テクスチャ(RGBA16F)に載せる。
 */
export type RGB = [number, number, number];

export interface Grade {
  /** 露出(段)。+1 で倍の明るさ */
  exposure: number;
  /** 色温度のずれ。+ で黄み、- で青み(-1〜1) */
  temp: number;
  /** + でマゼンタ、- で緑(-1〜1) */
  tint: number;
  /** 3x3 の色の混ざり(フィルムの色素のにじみ)。行ごとの和は 1 に正規化する */
  mix: [RGB, RGB, RGB];
  /** S字の強さ。1 で変化なし、>1 で硬調 */
  contrast: number;
  /** S字の中心(0〜1) */
  pivot: number;
  /** 明部の肩。0=ハードに飛ぶ(デジカメ)、1=なだらかに丸める(フィルム) */
  shoulder: number;
  /** 暗部・明部にのせる色(足し算、0.05 程度まで) */
  shadowTint: RGB;
  highlightTint: RGB;
  saturation: number;
  /** 緑の色相を動かす(度。+ で黄寄り、- で青寄り)と彩度倍率 */
  greenHue: number;
  greenSat: number;
  /** 青の色相(度。+ でシアン寄り)と彩度倍率 */
  blueHue: number;
  blueSat: number;
  /** 肌色(橙)の彩度倍率 */
  skinSat: number;
  /** 黒の浮き(色つき)と白の天井(紙の色) */
  black: RGB;
  white: RGB;
  /** 白黒にするなら各色の重み(フィルター効果) */
  mono: RGB | null;
}

export const NEUTRAL: Grade = {
  exposure: 0, temp: 0, tint: 0,
  mix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  contrast: 1, pivot: 0.5, shoulder: 0,
  shadowTint: [0, 0, 0], highlightTint: [0, 0, 0],
  saturation: 1, greenHue: 0, greenSat: 1, blueHue: 0, blueSat: 1, skinSat: 1,
  black: [0, 0, 0], white: [1, 1, 1], mono: null,
};

export function grade(base: Partial<Grade>): Grade {
  return { ...NEUTRAL, ...base };
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function linearToSrgb(c: number): number {
  if (c <= 0) return 0;
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 端点(0,0)(1,1)を動かさない対称のS字。k>1 で硬く、k<1 で軟らかく。単調増加 */
export function sCurve(x: number, k: number, pivot: number): number {
  const t = clamp01(x);
  const p = Math.min(0.95, Math.max(0.05, pivot));
  if (t < p) return p * Math.pow(t / p, k);
  return 1 - (1 - p) * Math.pow((1 - t) / (1 - p), k);
}

/** 線形の明るさが 1 を超えた分を丸める。shoulder=0 なら単純に切る */
export function rolloff(lin: number, shoulder: number): number {
  if (shoulder <= 0) return Math.min(lin, 1);
  const knee = 1 - 0.45 * shoulder;
  if (lin <= knee) return lin;
  const span = 1 - knee;
  return knee + span * Math.tanh((lin - knee) / span);
}

function rgbToHsv(r: number, g: number, b: number): RGB {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 1e-9) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max <= 0 ? 0 : d / max, max];
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m];
}

/** 色相 h が center から width 度の範囲にどれだけ入っているか(0〜1、なめらか) */
function hueWeight(h: number, center: number, width: number): number {
  let d = Math.abs(h - center) % 360;
  if (d > 180) d = 360 - d;
  if (d >= width) return 0;
  const t = 1 - d / width;
  return t * t * (3 - 2 * t);
}

/** 1 色を転がす。入力・出力とも sRGB 0〜1 */
export function applyGrade(g: Grade, input: RGB): RGB {
  // 1) 線形にして露出・色温度・色の混ざり
  let r = srgbToLinear(input[0]), gg = srgbToLinear(input[1]), b = srgbToLinear(input[2]);
  const gain = Math.pow(2, g.exposure);
  const wr = 1 + 0.12 * g.temp + 0.03 * g.tint, wg = 1 - 0.06 * g.tint, wb = 1 - 0.14 * g.temp + 0.03 * g.tint;
  r *= gain * wr; gg *= gain * wg; b *= gain * wb;
  const m = g.mix.map((row) => {
    const s = row[0] + row[1] + row[2];
    return row.map((v) => v / (s || 1)) as RGB;
  });
  let lr = m[0][0] * r + m[0][1] * gg + m[0][2] * b;
  let lg = m[1][0] * r + m[1][1] * gg + m[1][2] * b;
  let lb = m[2][0] * r + m[2][1] * gg + m[2][2] * b;

  if (g.mono) {
    const w = g.mono, s = w[0] + w[1] + w[2];
    const y = (w[0] * lr + w[1] * lg + w[2] * lb) / s;
    lr = lg = lb = y;
  }

  // 2) 明部の肩 → 表示の明るさへ → S字
  let x: RGB = [lr, lg, lb].map((c) => sCurve(linearToSrgb(rolloff(Math.max(c, 0), g.shoulder)), g.contrast, g.pivot)) as RGB;

  // 3) 色相ごとの調整と彩度(白黒では飛ばす)
  if (!g.mono) {
    let [h, s, v] = rgbToHsv(x[0], x[1], x[2]);
    const wG = hueWeight(h, 115, 50), wB = hueWeight(h, 215, 45), wS = hueWeight(h, 28, 28);
    h += g.greenHue * wG + g.blueHue * wB;
    s *= (1 + (g.greenSat - 1) * wG) * (1 + (g.blueSat - 1) * wB) * (1 + (g.skinSat - 1) * wS);
    x = hsvToRgb(h, clamp01(s), v);
    const L = luma(x[0], x[1], x[2]);
    x = x.map((c) => L + (c - L) * g.saturation) as RGB;
  }

  // 4) 暗部・明部の色のせ
  const L = clamp01(luma(x[0], x[1], x[2]));
  const ws = (1 - L) * (1 - L), wh = L * L;
  x = x.map((c, i) => c + ws * g.shadowTint[i] + wh * g.highlightTint[i]) as RGB;

  // 5) 黒の浮き・白の天井(プリントの紙)
  return x.map((c, i) => clamp01(g.black[i] + clamp01(c) * (g.white[i] - g.black[i]))) as RGB;
}

export const LUT_SIZE = 33;

/** 3D LUT を作る。並びは r が最も速く、次に g、最後に b(texImage3D の width/height/depth) */
export function buildLut(g: Grade, n = LUT_SIZE): Float32Array {
  const out = new Float32Array(n * n * n * 4);
  let i = 0;
  for (let bi = 0; bi < n; bi++) {
    for (let gi = 0; gi < n; gi++) {
      for (let ri = 0; ri < n; ri++) {
        const c = applyGrade(g, [ri / (n - 1), gi / (n - 1), bi / (n - 1)]);
        out[i++] = c[0]; out[i++] = c[1]; out[i++] = c[2]; out[i++] = 1;
      }
    }
  }
  return out;
}

/** float32 → IEEE 半精度(RGBA16F 用) */
export function toHalf(v: number): number {
  const f = new Float32Array(1);
  const u = new Uint32Array(f.buffer);
  f[0] = v;
  const x = u[0];
  const sign = (x >>> 16) & 0x8000;
  let exp = ((x >>> 23) & 0xff) - 127 + 15;
  let mant = x & 0x7fffff;
  if (exp <= 0) {
    if (exp < -10) return sign;
    mant = (mant | 0x800000) >> (1 - exp);
    return sign | ((mant + 0x1000) >> 13);
  }
  if (exp >= 31) return sign | 0x7c00;
  const h = sign | (exp << 10) | ((mant + 0x1000) >> 13);
  // 丸めで仮数が溢れても指数に繰り上がるので正しい値になる
  return h;
}

export function toHalfArray(a: Float32Array): Uint16Array {
  const out = new Uint16Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = toHalf(a[i]);
  return out;
}

export function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
  if (e === 0) return s * Math.pow(2, -14) * (m / 1024);
  if (e === 31) return m ? NaN : s * Infinity;
  return s * Math.pow(2, e - 15) * (1 + m / 1024);
}
