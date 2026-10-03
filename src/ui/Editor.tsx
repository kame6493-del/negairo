import { useEffect, useMemo, useRef, useState } from 'react';
import { currentLook, dateOn, dateStyleFor, dateText, newLeakSeed, type Settings } from '../domain/settings';
import { toIso, todayParts } from '../fx/datestamp';
import { exportJpeg, renderPreview } from '../fx/exporter';
import { canSave, needsWatermark } from '../fx/presets';
import { FxRenderer, type RenderOptions } from '../fx/renderer';
import { photoFileName, savePhoto } from '../platform/photos';
import type { RawShot } from './CameraScreen';
import { LookStrip } from './LookStrip';

export interface Shot extends RawShot { leakSeed: [number, number, number, number]; grainSeed: number }

export function Editor(p: {
  shot: Shot; setShot: (s: Shot) => void; settings: Settings; update: (s: Partial<Settings>) => void; premium: boolean;
  onClose: () => void; onPaywall: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<FxRenderer | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const s = p.settings;
  const look = currentLook(s);
  const watermark = needsWatermark(p.premium);

  const opts: RenderOptions = useMemo(() => ({
    look, strength: s.strength / 100, leakOn: s.leakOn, leakSeed: p.shot.leakSeed, grainOn: s.grainOn, grainSeed: p.shot.grainSeed,
    dateText: dateText(s, look, p.shot.takenAt), dateStyle: dateStyleFor(s, look), mirror: p.shot.mirror,
  }), [look, s, p.shot]);

  // 画面用の描画器(写真1枚につき1つ)
  useEffect(() => {
    try {
      const r = new FxRenderer(document.createElement('canvas'));
      r.setSource(p.shot.src, p.shot.src.width, p.shot.src.height);
      glRef.current = r;
    } catch (e) {
      setError((e as Error).message);
    }
    return () => { glRef.current?.dispose(); glRef.current = null; };
  }, [p.shot.src]);

  useEffect(() => {
    const r = glRef.current, cv = canvasRef.current;
    if (!r || !cv) return;
    if (showOriginal) {
      const src = p.shot.src;
      cv.width = src.width; cv.height = src.height;
      const c = cv.getContext('2d')!;
      c.save();
      if (p.shot.mirror) { c.translate(src.width, 0); c.scale(-1, 1); }
      c.drawImage(src, 0, 0);
      c.restore();
      return;
    }
    const long = Math.min(1600, Math.round(Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2)));
    renderPreview(r, cv, opts, watermark, long);
  }, [opts, watermark, showOriginal, p.shot]);

  const save = async () => {
    if (!canSave(look, p.premium)) { p.onPaywall(); return; }
    setSaving(true); setError('');
    try {
      const blob = await exportJpeg(p.shot.src, opts, watermark);
      const where = await savePhoto(blob, photoFileName());
      setToast(where === 'photos' ? '写真に保存しました' : '画像を書き出しました');
      setTimeout(() => setToast(''), 2200);
    } catch (e) {
      setError(`保存できませんでした(${(e as Error).message ?? e})`);
    } finally {
      setSaving(false);
    }
  };

  const dOn = dateOn(s, look);
  const dateValue = s.customDate ?? toIso(todayParts(p.shot.takenAt));

  return (
    <div className="page editor">
      <header className="ed-top">
        <button className="text-btn" data-testid="editor-back" onClick={p.onClose}>{p.shot.from === 'camera' ? '撮り直す' : '戻る'}</button>
        <span className="ed-title">{look.name}</span>
        <button className="btn primary small" data-testid="save" disabled={saving || !!error} onClick={() => void save()}>
          {saving ? '保存中…' : canSave(look, p.premium) ? '保存' : '保存(完全版)'}
        </button>
      </header>

      <div className="ed-stage"
        onPointerDown={() => setShowOriginal(true)} onPointerUp={() => setShowOriginal(false)}
        onPointerLeave={() => setShowOriginal(false)} onPointerCancel={() => setShowOriginal(false)}>
        <canvas ref={canvasRef} className="ed-canvas" data-testid="editor-canvas" />
        <span className="hint">{showOriginal ? '元の写真' : '長押しで元の写真'}</span>
      </div>
      {error && <p className="err" data-testid="editor-error">{error}</p>}

      <LookStrip value={look.id} premium={p.premium} onChange={(id) => p.update({ lookId: id })} />

      <div className="ed-panel">
        <label className="slider">
          <span>効果の強さ</span>
          <input type="range" min={0} max={100} step={5} value={s.strength} data-testid="strength"
            onChange={(e) => p.update({ strength: Number(e.target.value) })} />
          <b>{s.strength}%</b>
        </label>
        <div className="toggles">
          <button className={'chip' + (dOn ? ' on' : '')} data-testid="ed-date" onClick={() => p.update({ dateByLook: { ...s.dateByLook, [look.id]: !dOn } })}>日付 {dOn ? 'あり' : 'なし'}</button>
          <button className={'chip' + (s.leakOn ? ' on' : '')} data-testid="ed-leak" onClick={() => p.update({ leakOn: !s.leakOn })}>光もれ {s.leakOn ? 'あり' : 'なし'}</button>
          {s.leakOn && <button className="chip" data-testid="ed-reroll" onClick={() => p.setShot({ ...p.shot, leakSeed: newLeakSeed() })}>光もれを変える</button>}
          <button className={'chip' + (s.grainOn ? ' on' : '')} onClick={() => p.update({ grainOn: !s.grainOn })}>粒子 {s.grainOn ? 'あり' : 'なし'}</button>
        </div>
        {dOn && (
          <label className="date-row">
            <span>写し込む日付</span>
            <input type="date" value={dateValue} data-testid="date-input"
              onChange={(e) => p.update({ customDate: e.target.value || null })} />
            {s.customDate && <button className="text-btn" onClick={() => p.update({ customDate: null })}>撮った日に戻す</button>}
          </label>
        )}
        {watermark && <p className="muted small">無料版で保存した写真には、左下に小さく「ネガイロ」と入ります。</p>}
      </div>
      {toast && <div className="toast" role="status" data-testid="toast">{toast}</div>}
    </div>
  );
}
