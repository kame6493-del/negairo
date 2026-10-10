import art from '../assets/art/privacy_cat.jpg';
import { IcBack, IcImage, IcLock, IcNoAds, IcPhone, IcUser } from './icons';

/** 写真とプライバシー(アプリの中で読める要約) */
export function PrivacyPage(p: { onClose: () => void }) {
  return (
    <div className="page sub privacy" data-testid="privacy">
      <header className="sub-top">
        <button className="icon-btn" aria-label="戻る" data-testid="privacy-close" onClick={p.onClose}><IcBack /></button>
        <span className="sub-title">プライバシー</span><span className="icon-btn-sp" />
      </header>
      <section className="pv-hero" style={{ backgroundImage: `url(${art})` }}>
        <h2 className="hand">大切な思い出を、<br />安心して、ずっと。</h2>
      </section>
      <div className="sub-body">
        <ul className="pv-list">
          <li><span className="pv-ic"><IcPhone size={22} /></span><div><b>端末の中だけで加工</b><p>写真の加工はすべてお使いの端末の中で行います。写真が外部のサーバーへ送られることはありません。</p></div></li>
          <li><span className="pv-ic"><IcUser size={22} /></span><div><b>登録なしで使えます</b><p>アカウント登録や個人情報の入力は不要です。入れたらすぐに使えます。</p></div></li>
          <li><span className="pv-ic"><IcNoAds size={22} /></span><div><b>広告はありません</b><p>集中して写真を楽しめるよう、アプリ内に広告は表示されません。</p></div></li>
          <li><span className="pv-ic"><IcImage size={22} /></span><div><b>元の写真は書き換えない</b><p>保存すると新しい写真として加わります。元の写真が変更・削除されることはありません。</p></div></li>
        </ul>
        <div className="pv-note"><IcLock size={24} /><p>あなたの大切な写真を、これからも安心して楽しんでいただけるように、ネガイロはプライバシーを大切にしています。</p></div>
      </div>
    </div>
  );
}
