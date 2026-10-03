import { buildLut, LUT_SIZE, toHalfArray } from './color';
import { encodeGlyphs, glyphAdvance, type DateStyle } from './datestamp';
import type { Look } from './presets';
import { BLUR, COPY, DEVELOP, FINAL, HIGHLIGHT, VERT } from './shaders';

export interface RenderOptions {
  look: Look;
  /** 効果の強さ 0〜1 */
  strength: number;
  leakOn: boolean;
  leakSeed: [number, number, number, number];
  grainOn: boolean;
  grainSeed: number;
  /** 写し込む文字列。null で入れない */
  dateText: string | null;
  dateStyle: DateStyle;
  /** 左右反転(前面カメラ) */
  mirror: boolean;
}

interface Target { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; mips: boolean }

/** 出力の長辺を決める。低画素の味は小さく作って拡大する */
export function outputSize(srcW: number, srcH: number, look: Look, maxLong: number): { w: number; h: number; lowW: number; lowH: number } {
  const long = Math.max(srcW, srcH);
  let outLong = Math.min(long, maxLong);
  let lowLong = 0;
  if (look.lowRes && look.lowRes < long) {
    lowLong = look.lowRes;
    outLong = Math.min(outLong, look.lowRes < 1000 ? look.lowRes * 2 : look.lowRes);
  }
  const s = outLong / long;
  const w = Math.max(1, Math.round(srcW * s)), h = Math.max(1, Math.round(srcH * s));
  const ls = lowLong / long;
  return { w, h, lowW: lowLong ? Math.max(1, Math.round(srcW * ls)) : 0, lowH: lowLong ? Math.max(1, Math.round(srcH * ls)) : 0 };
}

/** 日付の並び: 文字ごとの左端(文字の高さを1とした単位)と全体の幅 */
export function layoutDate(text: string): { gx: Float32Array; width: number } {
  const gx = new Float32Array(12);
  let x = 0;
  [...text].slice(0, 12).forEach((ch, i) => {
    gx[i] = x;
    x += glyphAdvance(ch) * 0.92;
  });
  return { gx, width: Math.max(0, x - 0.32) };
}

export class FxRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly maxSize: number;
  private progs: Record<string, { p: WebGLProgram; u: Map<string, WebGLUniformLocation | null> }> = {};
  private src: WebGLTexture;
  private srcW = 0;
  private srcH = 0;
  private lut: WebGLTexture;
  private lutId = '';
  private targets = new Map<string, Target>();
  private vao: WebGLVertexArrayObject;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: false });
    if (!gl) throw new Error('この端末では WebGL2 が使えません');
    this.gl = gl;
    this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number);
    for (const [k, fs] of Object.entries({ COPY, HIGHLIGHT, BLUR, DEVELOP, FINAL })) this.progs[k] = { p: this.program(VERT, fs), u: new Map() };
    this.src = gl.createTexture()!;
    this.lut = gl.createTexture()!;
    this.vao = gl.createVertexArray()!;
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const sh = (type: number, s: string) => {
      const o = gl.createShader(type)!;
      gl.shaderSource(o, s);
      gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(o));
      return o;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    return p;
  }

  private use(name: string) {
    const pr = this.progs[name];
    this.gl.useProgram(pr.p);
    const loc = (n: string) => {
      if (!pr.u.has(n)) pr.u.set(n, this.gl.getUniformLocation(pr.p, n));
      return pr.u.get(n)!;
    };
    return loc;
  }

  /** 元の写真・映像を読み込む(書き換えはしない) */
  setSource(source: TexImageSource, w: number, h: number) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.params(gl.LINEAR_MIPMAP_LINEAR);
    this.srcW = w;
    this.srcH = h;
  }

  get sourceSize() { return { w: this.srcW, h: this.srcH }; }

  private params(min: number) {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private ensureLut(look: Look) {
    if (this.lutId === look.id) return;
    const gl = this.gl;
    const data = toHalfArray(buildLut(look.grade));
    gl.bindTexture(gl.TEXTURE_3D, this.lut);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, LUT_SIZE, LUT_SIZE, LUT_SIZE, 0, gl.RGBA, gl.HALF_FLOAT, data);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.CLAMP_TO_EDGE);
    this.lutId = look.id;
  }

  private target(key: string, w: number, h: number, mips: boolean): Target {
    const gl = this.gl;
    const old = this.targets.get(key);
    if (old && old.w === w && old.h === h) return old;
    if (old) { gl.deleteTexture(old.tex); gl.deleteFramebuffer(old.fbo); }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.params(mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const t = { tex, fbo, w, h, mips };
    this.targets.set(key, t);
    return t;
  }

  private draw(to: Target | null, w: number, h: number) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, to ? to.fbo : null);
    gl.viewport(0, 0, w, h);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (to?.mips) {
      gl.bindTexture(gl.TEXTURE_2D, to.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  private bind(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null, target: number = this.gl.TEXTURE_2D) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, tex);
    gl.uniform1i(loc, unit);
  }

  private blur(from: Target, tmp: Target, to: Target, stepShort: number, short: number) {
    const gl = this.gl;
    const u = this.use('BLUR');
    gl.uniform1f(u('u_flipX'), 0);
    const sx = (stepShort * short) / from.w, sy = (stepShort * short) / from.h;
    this.bind(0, from.tex, u('u_tex'));
    gl.uniform2f(u('u_step'), sx, 0);
    this.draw(tmp, tmp.w, tmp.h);
    this.bind(0, tmp.tex, u('u_tex'));
    gl.uniform2f(u('u_step'), 0, sy);
    this.draw(to, to.w, to.h);
  }

  /** 効果をかけて canvas に描く。描いた大きさを返す */
  render(o: RenderOptions, outW: number, outH: number, lowW = 0, lowH = 0): { w: number; h: number } {
    const gl = this.gl;
    if (!this.srcW) throw new Error('写真が読み込まれていません');
    const W = Math.min(outW, this.maxSize), H = Math.min(outH, this.maxSize);
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;
    const look = o.look;
    const k = Math.max(0, Math.min(1, o.strength));
    this.ensureLut(look);
    const short = Math.min(W, H);
    const flip = o.mirror ? 1 : 0;

    // 1) 低画素の味: 小さく描いてから拡大して使う
    let base: WebGLTexture = this.src;
    let baseFlip = flip;
    if (lowW && lowH) {
      const low = this.target('low', lowW, lowH, true);
      const u = this.use('COPY');
      gl.uniform1f(u('u_flipX'), flip);
      this.bind(0, this.src, u('u_tex'));
      this.draw(low, lowW, lowH);
      base = low.tex;
      baseFlip = 0;
    }

    // 2) 四隅の甘さ用のぼかし(1/4)
    const qW = Math.max(1, Math.round(W / 4)), qH = Math.max(1, Math.round(H / 4));
    const q0 = this.target('q0', qW, qH, false), q1 = this.target('q1', qW, qH, false), qb = this.target('qb', qW, qH, false);
    if (look.softCorners > 0) {
      // develop と同じ uv で読むので、ここでは反転しない(base の向きのまま)
      const u = this.use('COPY');
      gl.uniform1f(u('u_flipX'), 0);
      this.bind(0, base, u('u_tex'));
      this.draw(q0, qW, qH);
      this.blur(q0, q1, qb, 0.0022, Math.min(qW, qH));
    }

    // 3) 現像
    const dev = this.target('dev', W, H, true);
    {
      const u = this.use('DEVELOP');
      gl.uniform1f(u('u_flipX'), baseFlip);
      this.bind(0, base, u('u_base'));
      this.bind(1, qb.tex, u('u_blur'));
      this.bind(2, this.lut, u('u_lut'), gl.TEXTURE_3D);
      gl.uniform1f(u('u_lutSize'), LUT_SIZE);
      gl.uniform1f(u('u_strength'), k);
      gl.uniform1f(u('u_sharpen'), look.sharpen);
      gl.uniform1f(u('u_soft'), look.softCorners);
      gl.uniform1f(u('u_ab'), look.aberration * 0.004);
      gl.uniform2f(u('u_texel'), 1 / W, 1 / H);
      gl.uniform1f(u('u_aspect'), W / H);
      gl.uniform2f(u('u_pixel'), lowW && lowH && look.lowRes && look.lowRes < 1000 ? lowW : 0, lowW && lowH && look.lowRes && look.lowRes < 1000 ? lowH : 0);
      this.draw(dev, W, H);
    }

    // 4) 明るい所のにじみ(1/4 と 1/16)
    const haloOn = look.halation.amount > 0 || look.bloom > 0;
    const hA = this.target('hA', qW, qH, true);
    const eW = Math.max(1, Math.round(W / 16)), eH = Math.max(1, Math.round(H / 16));
    const e0 = this.target('e0', eW, eH, false), e1 = this.target('e1', eW, eH, false), hB = this.target('hB', eW, eH, false);
    if (haloOn) {
      const u = this.use('HIGHLIGHT');
      gl.uniform1f(u('u_flipX'), 0);
      gl.uniform1f(u('u_threshold'), look.halation.amount > 0 ? look.halation.threshold : 0.8);
      gl.uniform2f(u('u_srcTexel'), 1 / W, 1 / H);
      this.bind(0, dev.tex, u('u_tex'));
      this.draw(q0, qW, qH);
      this.blur(q0, q1, hA, 0.0016, Math.min(qW, qH));
      this.blur(hA, q1, q0, 0.0016, Math.min(qW, qH));
      const c = this.use('COPY');
      gl.uniform1f(c('u_flipX'), 0);
      this.bind(0, q0.tex, c('u_tex'));
      this.draw(hA, qW, qH);
      this.bind(0, hA.tex, c('u_tex'));
      this.draw(e0, eW, eH);
      this.blur(e0, e1, hB, 0.006, Math.min(eW, eH));
      this.blur(hB, e1, e0, 0.006, Math.min(eW, eH));
      const c2 = this.use('COPY');
      gl.uniform1f(c2('u_flipX'), 0);
      this.bind(0, e0.tex, c2('u_tex'));
      this.draw(hB, eW, eH);
    }

    // 5) 仕上げ
    {
      const u = this.use('FINAL');
      gl.uniform1f(u('u_flipX'), 0);
      this.bind(0, dev.tex, u('u_dev'));
      this.bind(1, hA.tex, u('u_haloA'));
      this.bind(2, hB.tex, u('u_haloB'));
      gl.uniform2f(u('u_size'), W, H);
      gl.uniform1f(u('u_strength'), k);
      gl.uniform3fv(u('u_halTint'), look.halation.tint);
      gl.uniform1f(u('u_halAmount'), haloOn ? look.halation.amount : 0);
      gl.uniform1f(u('u_threshold'), look.halation.amount > 0 ? look.halation.threshold : 0.8);
      gl.uniform1f(u('u_bloom'), haloOn ? look.bloom : 0);
      gl.uniform1f(u('u_vigAmount'), look.vignette.amount);
      gl.uniform1f(u('u_vigFlash'), look.vignette.flash);
      gl.uniform1f(u('u_leak'), o.leakOn ? look.leak.amount : 0);
      gl.uniform4fv(u('u_leakSeed'), o.leakSeed);
      gl.uniform1f(u('u_grain'), o.grainOn ? look.grain.amount : 0);
      gl.uniform1f(u('u_grainSize'), look.grain.size);
      gl.uniform1f(u('u_grainColor'), look.grain.color);
      gl.uniform1f(u('u_grainShadow'), look.grain.color > 0.6 ? 1 : 0);
      gl.uniform1ui(u('u_seed'), (o.grainSeed >>> 0) || 1);
      const text = o.dateText ?? '';
      const { codes, count } = encodeGlyphs(text);
      const { gx, width } = layoutDate(text);
      gl.uniform1i(u('u_dateCount'), o.dateText ? count : 0);
      gl.uniform1iv(u('u_glyph'), codes);
      gl.uniform1fv(u('u_gx'), gx);
      const dh = short * (o.dateStyle === 'digital' ? 0.03 : 0.036);
      const margin = short * 0.06;
      gl.uniform2f(u('u_dateAnchor'), W - margin, margin);
      gl.uniform1f(u('u_dateH'), dh);
      gl.uniform1f(u('u_dateWidth'), width);
      gl.uniform1i(u('u_dateStyle'), o.dateStyle === 'digital' ? 1 : 0);
      this.draw(null, W, H);
    }
    return { w: W, h: H };
  }

  dispose() {
    const gl = this.gl;
    for (const t of this.targets.values()) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
    this.targets.clear();
    gl.deleteTexture(this.src);
    gl.deleteTexture(this.lut);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
