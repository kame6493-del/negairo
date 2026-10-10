import { useState } from 'react';
import { LOOKS } from '../fx/presets';
import { IcBack, IcLock } from './icons';
import { LOOK_DESC, lookThumb } from './lookInfo';

/** 効果を一覧から選ぶ(見本の写真・名前・一言)。選ぶと元の画面へ戻る */
export function LookList(p: { value: string; premium: boolean; onPick: (id: string) => void; onClose: () => void; onPaywall: () => void }) {
  const [tab, setTab] = useState<'all' | 'free' | 'full'>('all');
  const freeN = LOOKS.filter((l) => l.free).length;
  const list = LOOKS.filter((l) => tab === 'all' || (tab === 'free' ? l.free : !l.free));
  return (
    <div className="page sub looklist" data-testid="looklist">
      <header className="sub-top">
        <button className="icon-btn" aria-label="戻る" data-testid="looklist-close" onClick={p.onClose}><IcBack /></button>
        <span className="sub-title">効果を選ぶ</span><span className="icon-btn-sp" />
      </header>
      {!p.premium && (
        <div className="tabs3" role="tablist">
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>すべて</button>
          <button className={tab === 'free' ? 'on' : ''} onClick={() => setTab('free')}>無料 ({freeN})</button>
          <button className={tab === 'full' ? 'on' : ''} onClick={() => setTab('full')}>完全版 ({LOOKS.length - freeN})</button>
        </div>
      )}
      <div className="lgrid">
        {list.map((l) => (
          <button key={l.id} className={'lcard' + (l.id === p.value ? ' on' : '')} data-card={l.id} onClick={() => p.onPick(l.id)}>
            <span className={'lcard-img sw-' + l.id}>{lookThumb(l.id) && <img src={lookThumb(l.id)} alt="" draggable={false} />}</span>
            <span className="lcard-body">
              <span className="lcard-name">
                <b>{l.name}</b>
                {!p.premium && <em className={l.free ? 'free' : 'full'}>{l.free ? '無料' : '完全版'}</em>}
              </span>
              <span className="lcard-desc">{LOOK_DESC[l.id] ?? l.note}</span>
            </span>
          </button>
        ))}
        {!p.premium && tab !== 'free' && (
          <div className="lcard upsell">
            <IcLock size={26} className="up-ic" />
            <p>もっと特別な思い出を<br />完全版で楽しもう。</p>
            <button className="btn primary small" data-testid="looklist-paywall" onClick={p.onPaywall}>完全版をみる</button>
          </div>
        )}
      </div>
    </div>
  );
}
