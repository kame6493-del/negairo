import { DEFAULT_LOOK, findLook, LOOKS, type Look } from '../fx/presets';
import { formatDate, parseIsoDate, todayParts, type DateStyle } from '../fx/datestamp';

export interface Settings {
  v: 1;
  lookId: string;
  /** 効果の強さ 0〜100 */
  strength: number;
  /** 味ごとに日付を入れるか(入れていなければ味の既定) */
  dateByLook: Record<string, boolean>;
  /** 日付の形。auto なら味の既定 */
  dateStyle: DateStyle | 'auto';
  /** 写し込む日付。null なら撮った日(選んだ写真は今日) */
  customDate: string | null;
  leakOn: boolean;
  grainOn: boolean;
  facing: 'environment' | 'user';
}

export const DEFAULT_SETTINGS: Settings = {
  v: 1, lookId: DEFAULT_LOOK, strength: 100, dateByLook: {}, dateStyle: 'auto', customDate: null,
  leakOn: false, grainOn: true, facing: 'environment',
};

const STYLES = ['auto', 'film', 'digital', 'dots'];

/** 保存してあった値を検査して、壊れた所は既定へ戻す */
export function normalizeSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (typeof r.lookId === 'string' && LOOKS.some((l) => l.id === r.lookId)) s.lookId = r.lookId;
  if (typeof r.strength === 'number' && Number.isFinite(r.strength)) s.strength = Math.round(Math.min(100, Math.max(0, r.strength)));
  if (r.dateByLook && typeof r.dateByLook === 'object') {
    const d: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(r.dateByLook as Record<string, unknown>)) if (typeof v === 'boolean' && LOOKS.some((l) => l.id === k)) d[k] = v;
    s.dateByLook = d;
  }
  if (typeof r.dateStyle === 'string' && STYLES.includes(r.dateStyle)) s.dateStyle = r.dateStyle as Settings['dateStyle'];
  if (typeof r.customDate === 'string' && parseIsoDate(r.customDate)) s.customDate = r.customDate;
  if (typeof r.leakOn === 'boolean') s.leakOn = r.leakOn;
  if (typeof r.grainOn === 'boolean') s.grainOn = r.grainOn;
  if (r.facing === 'user' || r.facing === 'environment') s.facing = r.facing;
  return s;
}

export function dateOn(s: Settings, look: Look): boolean {
  return s.dateByLook[look.id] ?? look.date.defaultOn;
}

export function dateStyleFor(s: Settings, look: Look): DateStyle {
  return s.dateStyle === 'auto' ? look.date.style : s.dateStyle;
}

export function currentLook(s: Settings): Look {
  return findLook(s.lookId);
}

/** 光もれの形を決める乱数(写真ごとに振り直す) */
export function newLeakSeed(rand: () => number = Math.random): [number, number, number, number] {
  return [rand(), 0.15 + rand() * 0.7, rand(), rand()];
}

/** 写し込む文字列。日付を入れない味・設定なら null */
export function dateText(s: Settings, look: Look, taken: Date): string | null {
  if (!dateOn(s, look)) return null;
  const p = (s.customDate && parseIsoDate(s.customDate)) || todayParts(taken);
  return formatDate(p, dateStyleFor(s, look));
}
