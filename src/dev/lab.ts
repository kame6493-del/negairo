// 開発用: 見本写真に各効果をかけて PNG を返す(Playwright から呼ぶ)。製品には入らない。
import { FxRenderer, outputSize } from '../fx/renderer';
import { findLook } from '../fx/presets';
import { formatDate, type DateStyle } from '../fx/datestamp';

async function load(url: string): Promise<HTMLImageElement> {
  const im = new Image();
  im.src = url;
  await im.decode();
  return im;
}

declare global { interface Window { renderLook: (url: string, id: string, opt?: Record<string, unknown>) => Promise<string>; labReady: boolean } }

window.renderLook = async (url, id, opt = {}) => {
  const im = await load(url);
  const look = findLook(id);
  const cv = document.createElement('canvas');
  const r = new FxRenderer(cv);
  r.setSource(im, im.naturalWidth, im.naturalHeight);
  const sz = outputSize(im.naturalWidth, im.naturalHeight, look, (opt.maxLong as number) ?? 4032);
  const style = (opt.dateStyle as DateStyle) ?? look.date.style;
  const dateOn = (opt.date as boolean) ?? look.date.defaultOn;
  r.render({
    look, strength: (opt.strength as number) ?? 1,
    leakOn: (opt.leak as boolean) ?? look.leak.defaultOn, leakSeed: (opt.leakSeed as [number, number, number, number]) ?? [0.2, 0.45, 0.5, 0.5],
    grainOn: true, grainSeed: 12345,
    dateText: dateOn ? formatDate({ y: 2026, m: 10, d: 3 }, style) : null, dateStyle: style, mirror: false,
  }, sz.w, sz.h, sz.lowW, sz.lowH);
  const out = (opt.outLong as number) ?? 0;
  let res: HTMLCanvasElement = cv;
  if (out) {
    const s = out / Math.max(cv.width, cv.height);
    res = document.createElement('canvas');
    res.width = Math.round(cv.width * s); res.height = Math.round(cv.height * s);
    const c = res.getContext('2d')!;
    c.imageSmoothingQuality = 'high';
    c.drawImage(cv, 0, 0, res.width, res.height);
  }
  const data = res.toDataURL('image/png');
  r.dispose();
  return data;
};
window.labReady = true;
