import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, newLeakSeed, type Settings } from './domain/settings';
import { loadBilling, type BillingState } from './platform/billing';
import { loadSettings, saveSettings } from './platform/storage';
import { CameraScreen } from './ui/CameraScreen';
import { Editor, type Shot } from './ui/Editor';
import { Paywall } from './ui/Paywall';
import { SettingsPage } from './ui/SettingsPage';

type Screen = 'camera' | 'editor' | 'paywall' | 'settings';

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [billing, setBilling] = useState<BillingState>({ status: 'unavailable', reason: '読み込み中…' });
  const [screen, setScreen] = useState<Screen>('camera');
  const [back, setBack] = useState<Screen>('camera');
  const [shot, setShot] = useState<Shot | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void loadBilling().then(setBilling);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...(s ?? DEFAULT_SETTINGS), ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const premium = billing.status === 'ready' && billing.premium;
  const open = (to: Screen) => { setBack(screen); setScreen(to); };

  if (!settings) return <div className="boot">ネガイロ</div>;

  return (
    <div className="app">
      {screen === 'camera' && (
        <CameraScreen
          settings={settings} update={update} premium={premium}
          onShot={(s) => { setShot({ ...s, leakSeed: newLeakSeed(), grainSeed: (Math.random() * 2 ** 31) | 0 }); setScreen('editor'); }}
          onSettings={() => open('settings')} onPaywall={() => open('paywall')}
        />
      )}
      {screen === 'editor' && shot && (
        <Editor
          shot={shot} setShot={setShot} settings={settings} update={update} premium={premium}
          onClose={() => { setShot(null); setScreen('camera'); }} onPaywall={() => open('paywall')}
        />
      )}
      {screen === 'paywall' && (
        <Paywall billing={billing} setBilling={setBilling} onClose={() => setScreen(back)}
          onBought={() => { setBilling((b) => (b.status === 'ready' ? { ...b, premium: true } : b)); setScreen(back); }} />
      )}
      {screen === 'settings' && (
        <SettingsPage settings={settings} update={update} billing={billing} setBilling={setBilling}
          onClose={() => setScreen('camera')} onPaywall={() => open('paywall')} />
      )}
    </div>
  );
}
