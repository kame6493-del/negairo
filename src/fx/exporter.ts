import { compose } from './compose';
import { FxRenderer, outputSize, type RenderOptions } from './renderer';

/** 保存の最大の長辺(12MP 相当)。iOS の canvas の上限(約1,670万画素)を枠つきでも超えない */
export const MAX_LONG = 4032;

/** 読み込んだ写真を、処理できる大きさの canvas にする(元の写真は書き換えない) */
export function prepareSource(src: CanvasImageSource, w: number, h: number, maxLong = MAX_LONG): HTMLCanvasElement {
  const s = Math.min(1, maxLong / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * s));
  cv.height = Math.max(1, Math.round(h * s));
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}

/** 原寸で効果をかけて JPEG にする。描画用の WebGL は使い終わったら捨てる */
export async function exportJpeg(src: HTMLCanvasElement, o: RenderOptions, watermark: boolean, quality = 0.95): Promise<Blob> {
  const glCanvas = document.createElement('canvas');
  const r = new FxRenderer(glCanvas);
  try {
    r.setSource(src, src.width, src.height);
    const frameExtra = o.look.frame === 'instant' ? 0.8 : 1;
    const sz = outputSize(src.width, src.height, o.look, Math.min(r.maxSize, Math.round(MAX_LONG * frameExtra)));
    r.render(o, sz.w, sz.h, sz.lowW, sz.lowH);
    const out = compose(glCanvas, o.look.frame, watermark);
    return await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('画像を作れませんでした'))), 'image/jpeg', quality));
  } finally {
    r.dispose();
  }
}

/** 画面用: 小さく描いて枠・名前まで重ねる */
export function renderPreview(r: FxRenderer, target: HTMLCanvasElement, o: RenderOptions, watermark: boolean, maxLong: number) {
  const { w, h } = r.sourceSize;
  const sz = outputSize(w, h, o.look, maxLong);
  r.render(o, sz.w, sz.h, sz.lowW, sz.lowH);
  const out = compose(r.canvas, o.look.frame, watermark);
  target.width = out.width;
  target.height = out.height;
  target.getContext('2d')!.drawImage(out, 0, 0);
}

export async function loadImageFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    return im;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
