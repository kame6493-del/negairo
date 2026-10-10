import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, newLeakSeed, type Settings } from './domain/settings';
import { loadBilling, type BillingState } from './platform/billing';
import { loadGuideSeen, loadSettings, saveGuideSeen, saveSettings } from './platform/storage';
import { CameraScreen } from './ui/CameraScreen';
import { Editor, type Shot } from './ui/Editor';
import { LookList } from './ui/LookList';
import { Onboarding } from './ui/Onboarding';
import { Paywall } from './ui/Paywall';
import { PrivacyPage } from './ui/PrivacyPage';
import { SettingsPage } from './ui/SettingsPage';
import iconUrl from './assets/icon_192.png';

type Screen = 'camera' | 'editor' | 'paywall' | 'settings' | 'looks' | 'privacy' | 'guide';

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '読み込み中…' });
  const [guideSeen, setGuideSeen] = useState<boolean | null>(null);
  /** 画面の積み重ね(最後が今の画面)。戻るで1つ前へ */
  const [stack, setStack] = useState<Screen[]>(['camera']);
  const [shot, setShot] = useState<Shot | null>(null);
  const screen = stack[stack.length - 1];

  useEffect(() => {
    void loadSettings().then(setSettings);
    void loadBilling().then(setBilling);
    void loadGuideSeen().then(setGuideSeen);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...(s ?? DEFAULT_SETTINGS), ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const premium = billing.status === 'ready' && billing.premium;
  const open = (to: Screen) => setStack((st) => [...st, to]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const reset = (to: Screen) => setStack(to === 'camera' ? ['camera'] : ['camera', to]);

  if (!settings || guideSeen === null) return <div className="boot"><img src={iconUrl} alt="" /><span>ネガイロ</span></div>;

  if (!guideSeen) {
    return <div className="app"><Onboarding onDone={() => { void saveGuideSeen(); setGuideSeen(true); }} /></div>;
  }

  return (
    <div className="app">
      {screen === 'camera' && (
        <CameraScreen
          settings={settings} update={update} premium={premium}
          onShot={(s) => { setShot({ ...s, leakSeed: newLeakSeed(), grainSeed: (Math.random() * 2 ** 31) | 0 }); reset('editor'); }}
          onSettings={() => open('settings')} onPaywall={() => open('paywall')} onLooks={() => open('looks')}
        />
      )}
      {screen === 'editor' && shot && (
        <Editor
          shot={shot} setShot={setShot} settings={settings} update={update} premium={premium}
          onClose={() => { setShot(null); reset('camera'); }} onPaywall={() => open('paywall')} onLooks={() => open('looks')}
        />
      )}
      {screen === 'looks' && (
        <LookList value={settings.lookId} premium={premium} onClose={back} onPaywall={() => open('paywall')}
          onPick={(id) => { update({ lookId: id }); back(); }} />
      )}
      {screen === 'paywall' && (
        <Paywall billing={billing} setBilling={setBilling} onClose={back} onPrivacy={() => open('privacy')}
          onBought={() => { setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b)); back(); }} />
      )}
      {screen === 'settings' && (
        <SettingsPage settings={settings} update={update} billing={billing} setBilling={setBilling}
          onClose={back} onPaywall={() => open('paywall')} onGuide={() => open('guide')} onPrivacy={() => open('privacy')} />
      )}
      {screen === 'privacy' && <PrivacyPage onClose={back} />}
      {screen === 'guide' && <Onboarding onDone={back} />}
    </div>
  );
}
