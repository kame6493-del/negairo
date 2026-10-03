/** 描いた写真に枠と(無料版だけ)小さな名前を重ねて、保存用の画像を作る */

export interface FrameGeom { W: number; H: number; x: number; y: number }

/** インスタント写真の白枠。左右上は短辺の 6%、下は 22%(書き込み用の余白) */
export function instantFrame(w: number, h: number): FrameGeom {
  const s = Math.min(w, h);
  const side = Math.round(s * 0.06), bottom = Math.round(s * 0.22);
  return { W: w + side * 2, H: h + side + bottom, x: side, y: side };
}

export function noFrame(w: number, h: number): FrameGeom {
  return { W: w, H: h, x: 0, y: 0 };
}

/** 無料版の名前の大きさと位置(短辺の 2.4%、左下) */
export function watermarkGeom(W: number, H: number) {
  const s = Math.min(W, H);
  const size = Math.max(10, Math.round(s * 0.024));
  return { size, x: Math.round(s * 0.035), y: H - Math.round(s * 0.035) };
}

export const WATERMARK_TEXT = 'ネガイロ';

export function compose(src: HTMLCanvasElement, frame: 'none' | 'instant', watermark: boolean): HTMLCanvasElement {
  const g = frame === 'instant' ? instantFrame(src.width, src.height) : noFrame(src.width, src.height);
  const out = document.createElement('canvas');
  out.width = g.W;
  out.height = g.H;
  const c = out.getContext('2d')!;
  if (frame === 'instant') {
    // 紙: わずかに黄みの白に、ごく弱い紙のむら
    c.fillStyle = '#f4f1ea';
    c.fillRect(0, 0, g.W, g.H);
    const grad = c.createLinearGradient(0, 0, g.W, g.H);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(210,200,185,0.25)');
    c.fillStyle = grad;
    c.fillRect(0, 0, g.W, g.H);
    // 写真の縁のわずかな影(紙に埋まっている感じ)
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(g.x - 1, g.y - 1, src.width + 2, src.height + 2);
  }
  c.drawImage(src, g.x, g.y);
  if (watermark) {
    const wm = watermarkGeom(g.W, g.H);
    c.font = `600 ${wm.size}px "Hiragino Sans", "Noto Sans JP", sans-serif`;
    c.textBaseline = 'alphabetic';
    c.fillStyle = frame === 'instant' ? 'rgba(60,50,40,0.55)' : 'rgba(255,255,255,0.72)';
    if (frame !== 'instant') { c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = wm.size * 0.3; }
    c.fillText(WATERMARK_TEXT, wm.x, wm.y);
  }
  return out;
}
