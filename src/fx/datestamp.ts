/**
 * 日付の写し込み。7セグメントの数字をシェーダーで描くので、ここでは文字列と区画の符号だけを作る。
 * 書体ファイルは使わない(自作の線)。
 */
export type DateStyle = 'film' | 'digital' | 'dots';

export const DATE_STYLES: { id: DateStyle; label: string; sample: string }[] = [
  { id: 'film', label: 'フィルム', sample: "'26 10 3" },
  { id: 'digital', label: 'デジカメ', sample: '2026/10/03' },
  { id: 'dots', label: 'ドット', sample: '26.10.03' },
];

/** 年月日を写し込む文字列にする */
export function formatDate(d: { y: number; m: number; d: number }, style: DateStyle): string {
  const yy = String(d.y % 100).padStart(2, '0');
  const mm = String(d.m).padStart(2, '0');
  const dd = String(d.d).padStart(2, '0');
  if (style === 'film') return `'${yy} ${String(d.m).padStart(2, ' ')} ${String(d.d).padStart(2, ' ')}`;
  if (style === 'digital') return `${d.y}/${mm}/${dd}`;
  return `${yy}.${mm}.${dd}`;
}

/** "2026-10-03" を年月日に。壊れていたら null */
export function parseIsoDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

export function todayParts(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export function toIso(p: { y: number; m: number; d: number }): string {
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/**
 * 7セグメントの点灯。bit0=上 1=右上 2=右下 3=下 4=左下 5=左上 6=中央。
 * 記号は bit7=アポストロフィ bit8=点 bit9=斜線。0 は空白。
 */
const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
export const MAX_GLYPHS = 12;

export function glyphCode(ch: string): number {
  if (ch >= '0' && ch <= '9') return DIGITS[ch.charCodeAt(0) - 48];
  if (ch === "'") return 1 << 7;
  if (ch === '.') return 1 << 8;
  if (ch === '/') return 1 << 9;
  return 0;
}

/** シェーダーへ渡す符号の列(長さ MAX_GLYPHS に詰める)と実際の文字数 */
export function encodeGlyphs(text: string): { codes: Int32Array; count: number } {
  const chars = [...text].slice(0, MAX_GLYPHS);
  const codes = new Int32Array(MAX_GLYPHS);
  chars.forEach((c, i) => (codes[i] = glyphCode(c)));
  return { codes, count: chars.length };
}

/** 記号は数字より幅を詰める。各文字の送り幅(数字1つ=1) */
export function glyphAdvance(ch: string): number {
  if (ch === "'" || ch === '.') return 0.45;
  if (ch === ' ') return 0.55;
  if (ch === '/') return 0.62;
  return 1;
}
