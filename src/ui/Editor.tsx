import { useEffect, useMemo, useRef, useState } from 'react';
import { currentLook, dateOn, dateStyleFor, dateText, newLeakSeed, type Settings } from '../domain/settings';
import { DATE_STYLES, toIso, todayParts } from '../fx/datestamp';
import { exportJpeg, renderPreview } from '../fx/exporter';
import { canSave, needsWatermark } from '../fx/presets';
import { FxRenderer, type RenderOptions } from '../fx/renderer';
import { photoFileName, savePhoto } from '../platform/photos';
import type { RawShot } from './CameraScreen';
import { LookStrip } from './LookStrip';
import { IcBack, IcCalendar, IcCheck, IcEye, IcFilter, IcGrain, IcReset, IcShuffle, IcStrength, IcSun } from './icons';

export interface Shot extends RawShot { leakSeed: [number, number, number, number]; grainSeed: number }

type Tab = 'look' | 'leak' | 'grain' | 'date';

function Switch(p: { on: boolean; onChange: () => void; testid?: string; label: string }) {
  return (
    <button className={'switch-row' + (p.on ? ' on' : '')} role="switch" aria-checked={p.on} data-testid={p.testid} onClick={p.onChange}>
      <span>{p.label}</span><span className="sw-state">{p.on ? 'あり' : 'なし'}</span><span className="switch"><i /></span>
    </button>
  );
}

export function Editor(p: {
  shot: Shot; setShot: (s: Shot) => void; settings: Settings; update: (s: Partial<Settings>) => void; premium: boolean;
  onClose: () => void; onPaywall: () => void; onLooks: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<FxRenderer | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ msg: string; url: string } | null>(null);
  const [tab, setTab] = useState<Tab>('look');
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

  // 保存した写真の見本(画面を離れたら捨てる)
  const savedUrl = saved?.url;
  useEffect(() => () => { if (savedUrl) URL.revokeObjectURL(savedUrl); }, [savedUrl]);

  const save = async () => {
    if (!canSave(look, p.premium)) { p.onPaywall(); return; }
    setSaving(true); setError('');
    try {
      const blob = await exportJpeg(p.shot.src, opts, watermark);
      const where = await savePhoto(blob, photoFileName());
      setSaved({ msg: where === 'photos' ? '写真に保存しました' : '画像を書き出しました', url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(`保存できませんでした(${(e as Error).message ?? e})`);
    } finally {
      setSaving(false);
    }
  };

  const closeSaved = () => setSaved(null);
  const resetAdjust = () => p.update({ strength: 100, leakOn: false, grainOn: true });
  const hold = {
    onPointerDown: () => setShowOriginal(true), onPointerUp: () => setShowOriginal(false),
    onPointerLeave: () => setShowOriginal(false), onPointerCancel: () => setShowOriginal(false),
  };

  const dOn = dateOn(s, look);
  const dateValue = s.customDate ?? toIso(todayParts(p.shot.takenAt));
  const tabs = [['look', '効果', IcFilter], ['leak', '光もれ', IcSun], ['grain', '粒子', IcGrain], ['date', '日付', IcCalendar]] as const;

  return (
    <div className="page editor">
      <header className="ed-top">
        <button className="back-btn" data-testid="editor-back" onClick={p.onClose}><IcBack size={20} />{p.shot.from === 'camera' ? '撮り直す' : '戻る'}</button>
        <span className="ed-title">{look.name}</span>
        <button className="btn primary pill" data-testid="save" disabled={saving || !!error} onClick={() => void save()}>
          {saving ? '保存中…' : canSave(look, p.premium) ? '保存' : '保存(完全版)'}
        </button>
      </header>

      <div className="ed-stage" {...hold}>
        <canvas ref={canvasRef} className="ed-canvas" data-testid="editor-canvas" />
        <span className={'badge-l' + (showOriginal ? ' on' : '')}>{showOriginal ? '元の写真' : '長押しで元の写真'}</span>
        {!showOriginal && <span className="badge-r">{look.name}</span>}
      </div>
      {error && <p className="err" data-testid="editor-error">{error}</p>}

      <div className="ed-panel">
        {tab === 'look' && (
          <>
            <LookStrip value={look.id} premium={p.premium} onChange={(id) => p.update({ lookId: id })} onAll={p.onLooks} />
            <div className="adj-head"><span>フィルターの調整</span>
              <button className="mini-btn" data-testid="adj-reset" onClick={resetAdjust}><IcReset size={15} />リセット</button></div>
            <label className="slider">
              <IcStrength size={19} /><span>効果の強さ</span>
              <input type="range" min={0} max={100} step={5} value={s.strength} data-testid="strength"
                style={{ ['--v' as string]: `${s.strength}%` }}
                onChange={(e) => p.update({ strength: Number(e.target.value) })} />
              <b>{s.strength}%</b>
            </label>
            <button className="hold-row" data-testid="hold-original" {...hold}><IcEye size={19} /><span>長押しで元の写真を見る</span></button>
            <div className="credit">
              <span className="credit-h">保存時のクレジット</span>
              <div className="credit-opts">
                <span className={'radio' + (watermark ? ' on' : '')}><i />名前入り<small>(左下に小さく)</small></span>
                <button className={'radio' + (watermark ? '' : ' on')} data-testid="credit-full" onClick={() => { if (watermark) p.onPaywall(); }}><i />名前なし<small>(完全版)</small></button>
              </div>
            </div>
          </>
        )}
        {tab === 'leak' && (
          <>
            <Switch on={s.leakOn} testid="ed-leak" label="光もれ" onChange={() => p.update({ leakOn: !s.leakOn })} />
            {s.leakOn && <button className="btn wide ghost" data-testid="ed-reroll" onClick={() => p.setShot({ ...p.shot, leakSeed: newLeakSeed() })}><IcShuffle size={19} />光もれの形を変える</button>}
            <p className="note">フィルムに光が入ったような赤〜橙のにじみ。写真ごとに形が変わります。</p>
          </>
        )}
        {tab === 'grain' && (
          <>
            <Switch on={s.grainOn} testid="ed-grain" label="粒子" onChange={() => p.update({ grainOn: !s.grainOn })} />
            <p className="note">フィルムの粒の質感。写真の大きさと明るさに合わせて出方が変わります。</p>
          </>
        )}
        {tab === 'date' && (
          <>
            <Switch on={dOn} testid="ed-date" label="日付を入れる" onChange={() => p.update({ dateByLook: { ...s.dateByLook, [look.id]: !dOn } })} />
            <div className="sec-h">スタンプのスタイル</div>
            <div className="stamp-styles">
              <button className={s.dateStyle === 'auto' ? 'on' : ''} onClick={() => p.update({ dateStyle: 'auto' })}><span className="seg7 auto">自動</span><small>効果に合わせる</small></button>
              {DATE_STYLES.map((d) => (
                <button key={d.id} className={s.dateStyle === d.id ? 'on' : ''} data-style={d.id} onClick={() => p.update({ dateStyle: d.id })}>
                  <span className="seg7">{d.sample}</span><small>{d.label}</small>
                </button>
              ))}
            </div>
            <div className="sec-h">日付の設定
              {s.customDate && <button className="mini-btn" onClick={() => p.update({ customDate: null })}><IcReset size={15} />撮った日に戻す</button>}
            </div>
            <label className="date-field">
              <IcCalendar size={20} />
              <input type="date" value={dateValue} data-testid="date-input" onChange={(e) => p.update({ customDate: e.target.value || null })} />
            </label>
            <p className="note">日付は自由に変更できます(過去・未来の日付も設定できます)。{!dOn && '今は日付を入れない設定です。'}</p>
          </>
        )}
        {watermark && tab !== 'look' && <p className="note small">無料版で保存した写真には、左下に小さく「ネガイロ」と入ります。</p>}
      </div>

      <nav className="ed-tabs" role="tablist">
        {tabs.map(([id, label, Ic]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} data-testid={'tab-' + id} onClick={() => setTab(id)}>
            <Ic size={22} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {saved && (
        <div className="sheet-back" onClick={closeSaved}>
          <div className="sheet" role="dialog" aria-label={saved.msg} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-h"><span data-testid="toast" role="status">{saved.msg}</span></div>
            <img className="sheet-img" src={saved.url} alt="保存した写真" />
            <div className="kept">
              <span className="kept-ic"><IcCheck size={20} /></span>
              <div><b>元の写真はそのまま</b><p>編集しても、元の写真は書き換えません。新しい写真として保存されます。</p></div>
            </div>
            {watermark && (
              <p className="note small">無料版の保存には、左下に小さく「ネガイロ」が入ります。
                <button className="link inline" onClick={() => { closeSaved(); p.onPaywall(); }}>完全版をみる</button></p>
            )}
            <div className="sheet-btns">
              <button className="btn wide" data-testid="saved-edit" onClick={closeSaved}>続けて編集する</button>
              <button className="btn primary wide" data-testid="saved-done" onClick={() => { closeSaved(); p.onClose(); }}>{p.shot.from === 'camera' ? '撮影に戻る' : '閉じる'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
