import { Preferences } from '@capacitor/preferences';
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../domain/settings';

const KEY = 'negairo.settings.v1';

/** 設定は端末の中だけ(Preferences = UserDefaults / SharedPreferences)。写真はどこにも送らない */
export async function loadSettings(): Promise<Settings> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    return value ? normalizeSettings(JSON.parse(value)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let chain: Promise<void> = Promise.resolve();
export function saveSettings(s: Settings): Promise<void> {
  const json = JSON.stringify(s);
  chain = chain.then(() => Preferences.set({ key: KEY, value: json })).catch((e) => console.error('[negairo] save settings', e));
  return chain;
}

export async function clearSettings() {
  await Preferences.remove({ key: KEY });
}

const GUIDE_KEY = 'negairo.guideSeen.v1';
/** はじめての案内を見たか(端末の中だけ) */
export async function loadGuideSeen(): Promise<boolean> {
  try {
    return (await Preferences.get({ key: GUIDE_KEY })).value === '1';
  } catch {
    return true;
  }
}
export function saveGuideSeen(): Promise<void> {
  return Preferences.set({ key: GUIDE_KEY, value: '1' }).catch((e) => console.error('[negairo] save guide', e));
}
