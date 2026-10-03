import { useState } from 'react';
import { LOOKS } from '../fx/presets';
import { BILLING } from '../config';
import { purchase, restore, type BillingState } from '../platform/billing';

export function Paywall(p: { billing: BillingState; setBilling: (b: BillingState) => void; onClose: () => void; onBought: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const free = LOOKS.filter((l) => l.free);
  const price = p.billing.status === 'ready' ? p.billing.price ?? BILLING.fallbackPrice : BILLING.fallbackPrice;

  const buy = async () => {
    setBusy(true); setMsg('');
    try { if (await purchase(p.billing)) p.onBought(); }
    catch (e) { setMsg(`購入できませんでした(${(e as Error).message ?? e})`); }
    finally { setBusy(false); }
  };
  const doRestore = async () => {
    setBusy(true); setMsg('');
    try {
      if (await restore()) p.onBought();
      else setMsg('このアカウントでの購入は見つかりませんでした');
    } catch (e) { setMsg(`復元できませんでした(${(e as Error).message ?? e})`); }
    finally { setBusy(false); }
  };

  return (
    <div className="page paywall" data-testid="paywall">
      <header className="sub-top">
        <button className="text-btn" data-testid="paywall-close" onClick={p.onClose}>閉じる</button>
        <span>完全版</span><span />
      </header>
      <section className="pw-hero">
        <p className="pw-kicker">買い切り・月額なし・広告なし</p>
        <h2>全{LOOKS.length}種の味を、<br />ずっと使える。</h2>
      </section>
      <div className="pw-grid">
        {LOOKS.map((l) => (
          <div key={l.id} className="pw-look"><span className={'swatch sw-' + l.id} /><span>{l.name}</span>{l.free && <em>無料</em>}</div>
        ))}
      </div>
      <table className="pw-table">
        <thead><tr><th></th><th>無料</th><th>完全版</th></tr></thead>
        <tbody>
          <tr><td>効果</td><td>{free.length}種</td><td>{LOOKS.length}種すべて</td></tr>
          <tr><td>日付の写し込み・光もれ</td><td>○</td><td>○</td></tr>
          <tr><td>保存した写真の名前入り</td><td>入る</td><td>入らない</td></tr>
          <tr><td>広告</td><td>なし</td><td>なし</td></tr>
          <tr><td>追加の課金</td><td>—</td><td>なし</td></tr>
        </tbody>
      </table>
      <div className="pw-cta">
        {p.billing.status === 'ready' ? (
          <button className="btn primary wide big" data-testid="buy" disabled={busy || (!p.billing.pkg && !import.meta.env.DEV)} onClick={() => void buy()}>
            {busy ? '処理中…' : `${price} で買う(1回だけ)`}
          </button>
        ) : (
          <button className="btn wide big" data-testid="buy" disabled>{p.billing.reason}</button>
        )}
        <button className="link" disabled={busy} onClick={() => void doRestore()}>以前に買った方はこちら(購入の復元)</button>
        {msg && <p className="err">{msg}</p>}
      </div>
      <p className="muted small">一度買えば、同じストアのアカウントなら機種変更後も「購入の復元」で使えます。写真はこの端末の中で加工し、外へ送りません。</p>
    </div>
  );
}
