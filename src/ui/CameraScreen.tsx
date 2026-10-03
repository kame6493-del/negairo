import { useEffect, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { currentLook, dateOn, dateStyleFor, dateText, type Settings } from '../domain/settings';
import { loadImageFile, prepareSource } from '../fx/exporter';
import { FxRenderer, outputSize } from '../fx/renderer';
import { cameraErrorMessage, openCamera, stopCamera } from '../platform/camera';
import { LookStrip } from './LookStrip';

export interface RawShot { src: HTMLCanvasElement; mirror: boolean; takenAt: Date; from: 'camera' | 'library' }

export function CameraScreen(p: {
  settings: Settings; update: (s: Partial<Settings>) => void; premium: boolean;
  onShot: (s: RawShot) => void; onSettings: () => void; onPaywall: () => void;
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
        <span className="brand">ネガイロ</span>
        <button className={'chip' + (dOn ? ' on' : '')} data-testid="date-toggle"
          onClick={() => p.update({ dateByLook: { ...p.settings.dateByLook, [look.id]: !dOn } })}>
          日付 {dOn ? 'あり' : 'なし'}
        </button>
        <button className={'chip' + (p.settings.leakOn ? ' on' : '')} onClick={() => p.update({ leakOn: !p.settings.leakOn })}>
          光もれ {p.settings.leakOn ? 'あり' : 'なし'}
        </button>
        <button className="icon-btn" aria-label="設定" data-testid="open-settings" onClick={p.onSettings}>
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.6 4.6-1.9-.4a6.9 6.9 0 0 1-.6 1.5l1.1 1.6-1.6 1.6-1.6-1.1c-.5.3-1 .5-1.5.6l-.4 1.9h-2.2l-.4-1.9a6.9 6.9 0 0 1-1.5-.6l-1.6 1.1-1.6-1.6 1.1-1.6c-.3-.5-.5-1-.6-1.5l-1.9-.4v-2.2l1.9-.4c.1-.5.3-1 .6-1.5L4.7 6.3l1.6-1.6 1.6 1.1c.5-.3 1-.5 1.5-.6l.4-1.9h2.2l.4 1.9c.5.1 1 .3 1.5.6l1.6-1.1 1.6 1.6-1.1 1.6c.3.5.5 1 .6 1.5l1.9.4v2.2Z" /></svg>
        </button>
      </header>

      <div className={'viewfinder' + (look.frame === 'instant' ? ' instant' : '')}>
        <video ref={videoRef} playsInline muted className="hidden-video" />
        {!error && <canvas ref={canvasRef} className="vf-canvas" data-testid="viewfinder" />}
        {!live && !error && <p className="vf-msg">カメラを準備しています…</p>}
        {error && (
          <div className="vf-msg err-box" data-testid="camera-error">
            <p>{error}</p>
            <button className="btn primary" onClick={() => fileRef.current?.click()}>写真を選んで加工する</button>
          </div>
        )}
        {flash && <div className="vf-flash" />}
        {!look.free && !p.premium && (
          <button className="trial" onClick={p.onPaywall}>完全版の効果です。撮って試せます(保存は完全版)</button>
        )}
      </div>

      <LookStrip value={look.id} premium={p.premium} onChange={(id) => p.update({ lookId: id })} />

      <div className="cam-controls">
        <button className="round-btn" aria-label="写真を選ぶ" data-testid="pick" disabled={busy} onClick={() => fileRef.current?.click()}>
          <svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9.6l3.5-3.5 3 3 4.5-4.5 3 3V6H5Zm3.5 1.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z" /></svg>
          <span>写真</span>
        </button>
        <button className="shutter" aria-label="撮る" data-testid="shutter" disabled={!live} onClick={shoot}><span /></button>
        <button className="round-btn" aria-label="カメラの切り替え" data-testid="flip" onClick={() => p.update({ facing: facing === 'user' ? 'environment' : 'user' })}>
          <svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M9 4h6l1.5 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.5L9 4Zm3 4.5a4.5 4.5 0 0 0-4.3 3.2l-1.2-.4.9 2.7 2.4-1.4-1-.4A3 3 0 0 1 15 12h1.5A4.5 4.5 0 0 0 12 8.5Zm4.4 3.4-2.4 1.4 1 .4A3 3 0 0 1 9 14H7.5a4.5 4.5 0 0 0 8.8.8l1.2.4-.9-2.7Z" /></svg>
          <span>{facing === 'user' ? '前' : '後ろ'}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden data-testid="file-input" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
