import { useState } from 'react';
import street from '../assets/art/onb_street.jpg';
import cafe from '../assets/art/onb_cafe.jpg';
import compare from '../assets/art/onb_compare.jpg';
import { formatDate, todayParts } from '../fx/datestamp';

/** はじめての案内(3枚)。設定の「使い方ガイド」からも開ける */
export function Onboarding(p: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === 2;
  const next = () => (last ? p.onDone() : setI(i + 1));
  const today = formatDate(todayParts(), 'film').replace(/^'/, '').replace(/\s+/g, ' ');
  return (
    <div className="page onb" data-testid="onboarding" data-step={i}>
      <header className="onb-top">
        {!last ? <button className="onb-skip" data-testid="onb-skip" onClick={p.onDone}>スキップ</button> : <span />}
      </header>

      {i === 0 && (
        <div className="onb-page">
          <h1 className="logo">ネガイロ</h1>
          <p className="onb-tag">あの日の、あの色を、いまの毎日に。</p>
          <figure className="polaroid tilt-l">
            <span className="pol-img" style={{ backgroundImage: `url(${street})` }}><span className="pol-date">{today}</span></span>
          </figure>
          <p className="hand onb-hand">いつもの景色が、<br />あの頃のように輝きはじめる。</p>
          <p className="onb-text">ネガイロは、フィルムカメラのようなあたたかい色合いと質感で、日常をノスタルジックに残せるカメラアプリです。</p>
        </div>
      )}
      {i === 1 && (
        <div className="onb-page">
          <h2 className="onb-h"><span className="num">01</span>撮ってみよう</h2>
          <p className="onb-text center">効果を選ぶと、カメラの映像にそのままかかります。<br />仕上がりを見ながら撮れます。</p>
          <figure className="onb-shot">
            <span className="onb-shot-img" style={{ backgroundImage: `url(${cafe})` }} />
            <span className="paper-note n1">撮影画面で<br />仕上がりを確認!</span>
          </figure>
          <p className="onb-text center small">撮った後の写真も、アルバムから選んで加工できます。</p>
        </div>
      )}
      {i === 2 && (
        <div className="onb-page">
          <h2 className="onb-h"><span className="num">02</span>編集して仕上げよう</h2>
          <p className="onb-text center">効果の強さ・光もれ・粒子・日付で、<br />あなただけの一枚に。</p>
          <figure className="onb-shot">
            <span className="onb-shot-img" style={{ backgroundImage: `url(${compare})` }} />
            <span className="cmp-badge l">元の写真</span><span className="cmp-badge r">ネガイロの仕上がり</span>
            <span className="paper-note n2">長押しで<br />元の写真と比較</span>
            <span className="paper-note n3">元の写真はそのまま。<br />新しい写真として保存できます</span>
          </figure>
        </div>
      )}

      <div className="onb-foot">
        <div className="dots">{[0, 1, 2].map((k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <button className="btn primary wide big" data-testid="onb-next" onClick={next}>{last ? 'はじめる' : '次へ'}</button>
      </div>
    </div>
  );
}
