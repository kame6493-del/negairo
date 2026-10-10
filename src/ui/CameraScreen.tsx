import { useEffect, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { currentLook, dateOn, dateStyleFor, dateText, type Settings } from '../domain/settings';
import { loadImageFile, prepareSource } from '../fx/exporter';
import { FxRenderer, outputSize } from '../fx/renderer';
import { cameraErrorMessage, openCamera, stopCamera } from '../platform/camera';
import { LookStrip } from './LookStrip';
import { IcCalendar, IcFlip, IcGear, IcImage, IcSun } from './icons';
import emptyArt from '../assets/art/empty_camera.jpg';

export interface RawShot { src: HTMLCanvasElement; mirror: boolean; takenAt: Date; from: 'camera' | 'library' }

export function CameraScreen(p: {
  settings: Settings; update: (s: Partial<Settings>) => void; premium: boolean;
  onShot: (s: RawShot) => void; onSettings: () => void; onPaywall: () => void; onLooks: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<FxRenderer | null>(null);
  const settingsRef = useRef(p.settings);
  settingsRef.current = p.settings;
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const look = currentLook(p.settings);
  const facing = p.settings.facing;

  // カメラを開く(向きが変わったら開き直す)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setLive(false);
    setError('');
    openCamera(facing).then(async (s) => {
      if (cancelled) { stopCamera(s); return; }
      stream = s;
      const v = videoRef.current!;
      v.srcObject = s;
      await v.play().catch(() => undefined);
      setLive(true);
    }).catch((e) => { if (!cancelled) setError(cameraErrorMessage(e)); });
    return () => { cancelled = true; stopCamera(stream); };
  }, [facing]);

  // 映像に効果をかけて描き続ける
  useEffect(() => {
    if (!live) return;
    let r: FxRenderer;
    try {
      r = new FxRenderer(canvasRef.current!);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    rendererRef.current = r;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const s = settingsRef.current;
      const lk = currentLook(s);
      r.setSource(v, v.videoWidth, v.videoHeight);
      const sz = outputSize(v.videoWidth, v.videoHeight, lk, 1280);
      r.render({
        look: lk, strength: s.strength / 100, leakOn: s.leakOn, leakSeed: [0.2, 0.45, 0.5, 0.5],
        grainOn: s.grainOn, grainSeed: (Math.random() * 2 ** 31) | 0,
        dateText: dateText(s, lk, new Date()), dateStyle: dateStyleFor(s, lk), mirror: s.facing === 'user',
      }, sz.w, sz.h, sz.lowW, sz.lowH);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); r.dispose(); rendererRef.current = null; };
  }, [live]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    const src = prepareSource(v, v.videoWidth, v.videoHeight);
    p.onShot({ src, mirror: facing === 'user', takenAt: new Date(), from: 'camera' });
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const im = await loadImageFile(f);
      const src = prepareSource(im, im.naturalWidth, im.naturalHeight);
      const taken = f.lastModified ? new Date(f.lastModified) : new Date();
      p.onShot({ src, mirror: false, takenAt: taken, from: 'library' });
    } catch {
      setError('この写真は読み込めませんでした。別の写真を選んでください。');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const dOn = dateOn(p.settings, look);

  return (
    <div className="page camera">
      <header className="cam-top">
        <button className={'top-tg' + (dOn ? ' on' : '')} data-testid="date-toggle"
          onClick={() => p.update({ dateByLook: { ...p.settings.dateByLook, [look.id]: !dOn } })}>
          <IcCalendar size={20} /><span>日付 {dOn ? 'あり' : 'なし'}</span>
        </button>
        <button className={'top-tg' + (p.settings.leakOn ? ' on' : '')} data-testid="leak-toggle" onClick={() => p.update({ leakOn: !p.settings.leakOn })}>
          <IcSun size={20} /><span>光もれ {p.settings.leakOn ? 'あり' : 'なし'}</span>
        </button>
        <button className="top-tg" aria-label="設定" data-testid="open-settings" onClick={p.onSettings}>
          <IcGear size={20} /><span>設定</span>
        </button>
      </header>

      <div className={'viewfinder' + (look.frame === 'instant' ? ' instant' : '') + (error ? ' has-error' : '')}>
        <video ref={videoRef} playsInline muted className="hidden-video" />
        {!error && <canvas ref={canvasRef} className="vf-canvas" data-testid="viewfinder" />}
        {!live && !error && <p className="vf-msg">カメラを準備しています…</p>}
        {error && (
          <div className="empty" data-testid="camera-error">
            <img className="empty-art" src={emptyArt} alt="" draggable={false} />
            <div className="empty-body">
              <h2>カメラを使えません</h2>
              <p>{error}</p>
              <button className="btn primary wide big" onClick={() => fileRef.current?.click()}><IcImage size={22} />写真を選んで加工する</button>
            </div>
          </div>
        )}
        {flash && <div className="vf-flash" />}
        {!error && <span className="vf-look">{look.name}</span>}
        {!look.free && !p.premium && !error && (
          <button className="trial" onClick={p.onPaywall}>完全版の効果です。撮って試せます(保存は完全版)</button>
        )}
      </div>

      <LookStrip value={look.id} premium={p.premium} onChange={(id) => p.update({ lookId: id })} onAll={p.onLooks} />

      <div className="cam-controls">
        <button className="side-btn" aria-label="写真を選ぶ" data-testid="pick" disabled={busy} onClick={() => fileRef.current?.click()}>
          <span className="side-ic pick"><IcImage size={26} /></span>
          <span>写真</span>
        </button>
        <button className="shutter" aria-label="撮る" data-testid="shutter" disabled={!live} onClick={shoot}><span /></button>
        <button className="side-btn" aria-label="カメラの切り替え" data-testid="flip" onClick={() => p.update({ facing: facing === 'user' ? 'environment' : 'user' })}>
          <span className="side-ic"><IcFlip size={28} /></span>
          <span>{facing === 'user' ? '前のカメラ' : 'カメラ切替'}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden data-testid="file-input" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
