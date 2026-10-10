import { useState } from 'react';
import { LOOKS } from '../fx/presets';
import { BILLING } from '../config';
import { purchase, restore, type BillingState } from '../platform/billing';
import heroArt from '../assets/art/paywall_sunset.jpg';
import { IcCheckCircle, IcClose, IcCrown, IcImage, IcNoAds, IcNoName, IcSliders, IcUser } from './icons';
import { lookThumb } from './lookInfo';

export function Paywall(p: { billing: BillingState; setBilling: (b: BillingState) => void; onClose: () => void; onBought: () => void; onPrivacy?: () => void }) {
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
      <section className="pw-hero" style={{ backgroundImage: `url(${heroArt})` }}>
        <button className="pw-close" aria-label="閉じる" data-testid="paywall-close" onClick={p.onClose}><IcClose size={24} /></button>
        <h2 className="hand">あの頃のように、<br />世界が少しだけ<br />あたたかく見える。</h2>
        <p className="pw-lead">ネガイロ 完全版で、<br />もっとたくさんの「好きな色」に出会えます。</p>
      </section>

      <div className="pw-body">
        <div className="pw-compare">
          <div className="pw-plan">
            <h3>無料版</h3><p className="pw-plan-sub">まずは気軽に</p>
            <ul>
              <li><IcCheckCircle size={17} />効果 {free.length}種</li>
              <li><IcCheckCircle size={17} />日付・光もれ・粒子</li>
              <li><IcCheckCircle size={17} />広告なし・登録なし</li>
              <li className="minus"><IcNoName size={17} />保存に小さく名前が入る</li>
            </ul>
          </div>
          <div className="pw-plan full">
            <IcCrown size={22} className="crown" />
            <h3>完全版</h3><p className="pw-plan-sub">すべての効果を解放</p>
            <ul>
              <li><IcCheckCircle size={17} />効果 全{LOOKS.length}種</li>
              <li><IcCheckCircle size={17} />インスタントの白枠</li>
              <li><IcCheckCircle size={17} />平成デジカメ・ガラケー</li>
              <li><IcCheckCircle size={17} />保存時に名前なし</li>
              <li><IcCheckCircle size={17} />買い切り・追加課金なし</li>
            </ul>
          </div>
        </div>

        <div className="pw-looks">
          {LOOKS.map((l) => (
            <div key={l.id} className="pw-look">
              <span className={'pw-thumb sw-' + l.id}>{lookThumb(l.id) && <img src={lookThumb(l.id)} alt="" draggable={false} />}</span>
              <span>{l.name}</span>
            </div>
          ))}
        </div>

        <div className="pw-feats">
          <div><IcCrown size={26} /><span>買い切りで<br />ずっと使える</span></div>
          <div><IcImage size={26} /><span>全{LOOKS.length}種の<br />フィルム効果</span></div>
          <div><IcNoAds size={26} /><span>広告なし</span></div>
          <div><IcUser size={26} /><span>登録なし</span></div>
          <div><IcNoName size={26} /><span>保存時に<br />名前なし</span></div>
          <div><IcSliders size={26} /><span>強さを細かく<br />0〜100%で</span></div>
        </div>

        <div className="pw-cta">
          {p.billing.status === 'ready' ? (
            <button className="btn primary wide big" data-testid="buy" disabled={busy || (!p.billing.pkg && !import.meta.env.DEV)} onClick={() => void buy()}>
              {busy ? '処理中…' : <>{price} で完全版を購入<small>買い切り・追加の課金なし</small></>}
            </button>
          ) : (
            <button className="btn wide big" data-testid="buy" disabled>{p.billing.reason}</button>
          )}
          <button className="btn wide outline" disabled={busy} onClick={() => void doRestore()}>購入を復元</button>
          {msg && <p className="err">{msg}</p>}
        </div>
        <p className="pw-foot">一度買えば、同じストアのアカウントなら機種変更後も「購入を復元」で使えます。写真はこの端末の中で加工し、外へ送りません。</p>
        {p.onPrivacy && <p className="pw-links"><button className="link" onClick={p.onPrivacy}>プライバシー</button></p>}
      </div>
    </div>
  );
}
