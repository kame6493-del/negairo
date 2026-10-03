import { useState } from 'react';
import { DATE_STYLES } from '../fx/datestamp';
import type { Settings } from '../domain/settings';
import { isDevMock, loadBilling, resetMock, restore, type BillingState } from '../platform/billing';

export function SettingsPage(p: {
  settings: Settings; update: (s: Partial<Settings>) => void; billing: BillingState; setBilling: (b: BillingState) => void;
  onClose: () => void; onPaywall: () => void;
}) {
  const [msg, setMsg] = useState('');
  const premium = p.billing.status === 'ready' && p.billing.premium;
  const s = p.settings;
  return (
    <div className="page settings" data-testid="settings">
      <header className="sub-top">
        <button className="text-btn" data-testid="settings-close" onClick={p.onClose}>戻る</button>
        <span>設定</span><span />
      </header>

      <section className="card">
        <h3>完全版</h3>
        {premium ? <p>購入済みです。全部の効果を使えます。</p> : (
          <>
            <p>全10種の効果と、名前の入らない保存。買い切りです。</p>
            <button className="btn primary wide" data-testid="settings-paywall" onClick={p.onPaywall}>完全版について</button>
          </>
        )}
        <button className="link" onClick={async () => {
          try { setMsg((await restore()) ? '購入を復元しました' : '購入は見つかりませんでした'); p.setBilling(await loadBilling()); }
          catch { setMsg('復元できませんでした'); }
        }}>購入の復元</button>
        {msg && <p className="muted small">{msg}</p>}
      </section>

      <section className="card">
        <h3>日付の形</h3>
        <div className="seg">
          <button className={s.dateStyle === 'auto' ? 'on' : ''} onClick={() => p.update({ dateStyle: 'auto' })}>効果に合わせる</button>
          {DATE_STYLES.map((d) => (
            <button key={d.id} className={s.dateStyle === d.id ? 'on' : ''} onClick={() => p.update({ dateStyle: d.id })}>
              {d.label}<small>{d.sample}</small>
            </button>
          ))}
        </div>
        <p className="muted small">日付は、撮った日(選んだ写真は写真の日付)を入れます。加工画面で好きな日付に変えられます。</p>
      </section>

      <section className="card">
        <h3>写真とプライバシー</h3>
        <p className="small">写真の加工はすべてこの端末の中で行います。写真・設定をサーバーへ送ることはありません。アカウントも不要です。保存すると新しい写真として加わり、元の写真は書き換えません。</p>
      </section>

      <p className="muted small center">ネガイロ 1.0.0</p>
      {isDevMock && (
        <button className="link" onClick={async () => { resetMock(); p.setBilling(await loadBilling()); }}>(開発用)疑似購入を消す</button>
      )}
    </div>
  );
}
