import { useState } from 'react';
import { DATE_STYLES } from '../fx/datestamp';
import type { Settings } from '../domain/settings';
import { isDevMock, loadBilling, resetMock, restore, type BillingState } from '../platform/billing';
import iconUrl from '../assets/icon_192.png';
import { APP_VERSION } from '../config';
import { IcBack, IcCalendar, IcCrown, IcHelp, IcNext, IcRestore, IcShield } from './icons';

export function SettingsPage(p: {
  settings: Settings; update: (s: Partial<Settings>) => void; billing: BillingState; setBilling: (b: BillingState) => void;
  onClose: () => void; onPaywall: () => void; onGuide: () => void; onPrivacy: () => void;
}) {
  const [msg, setMsg] = useState('');
  const premium = p.billing.status === 'ready' && p.billing.premium;
  const s = p.settings;
  return (
    <div className="page sub settings" data-testid="settings">
      <header className="sub-top">
        <button className="icon-btn" aria-label="戻る" data-testid="settings-close" onClick={p.onClose}><IcBack /></button>
        <span className="sub-title">設定</span><span className="icon-btn-sp" />
      </header>

      <div className="sub-body">
        <h4 className="grp">日付スタンプの既定値</h4>
        <section className="group">
          <div className="row static"><IcCalendar size={21} /><span>既定のスタンプスタイル</span></div>
          <div className="stamp-styles in-group">
            <button className={s.dateStyle === 'auto' ? 'on' : ''} onClick={() => p.update({ dateStyle: 'auto' })}><span className="seg7 auto">自動</span><small>効果に合わせる</small></button>
            {DATE_STYLES.map((d) => (
              <button key={d.id} className={s.dateStyle === d.id ? 'on' : ''} onClick={() => p.update({ dateStyle: d.id })}>
                <span className="seg7">{d.sample}</span><small>{d.label}</small>
              </button>
            ))}
          </div>
          <p className="row-note">日付は、撮った日(選んだ写真は写真の日付)を入れます。加工画面で好きな日付に変えられます。</p>
        </section>

        <h4 className="grp">完全版</h4>
        <section className="group">
          {premium ? (
            <div className="row static"><IcCrown size={21} className="gold" /><span>完全版</span><em className="row-val">購入済み</em></div>
          ) : (
            <button className="row" data-testid="settings-paywall" onClick={p.onPaywall}><IcCrown size={21} className="gold" /><span>無料版 / 完全版</span><IcNext size={18} className="chev" /></button>
          )}
          <button className="row" onClick={async () => {
            try { setMsg((await restore()) ? '購入を復元しました' : '購入は見つかりませんでした'); p.setBilling(await loadBilling()); }
            catch { setMsg('復元できませんでした'); }
          }}><IcRestore size={21} /><span>購入の復元</span><IcNext size={18} className="chev" /></button>
          {msg && <p className="row-note">{msg}</p>}
        </section>

        <h4 className="grp">アプリ情報</h4>
        <section className="group">
          <button className="row" data-testid="open-guide" onClick={p.onGuide}><IcHelp size={21} /><span>使い方ガイド</span><IcNext size={18} className="chev" /></button>
          <button className="row" data-testid="open-privacy" onClick={p.onPrivacy}><IcShield size={21} /><span>プライバシー</span><IcNext size={18} className="chev" /></button>
          <div className="row static about"><img src={iconUrl} alt="" className="about-icon" /><span>ネガイロ<small>フィルムカメラ風・日付入り</small></span><em className="row-val">{APP_VERSION}</em></div>
        </section>

        {isDevMock && (
          <button className="link" onClick={async () => { resetMock(); p.setBilling(await loadBilling()); }}>(開発用)疑似購入を消す</button>
        )}
      </div>
    </div>
  );
}
