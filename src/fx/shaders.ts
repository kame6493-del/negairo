// すべて WebGL2 (GLSL ES 3.00)。全画面の三角形1枚に描く。

export const VERT = `#version 300 es
precision highp float;
uniform float u_flipX;
out vec2 v_uv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = p;
  if (u_flipX > 0.5) v_uv.x = 1.0 - v_uv.x;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** そのまま写す(縮小は mipmap に任せる) */
export const COPY = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 o;
void main() { o = vec4(texture(u_tex, v_uv).rgb, 1.0); }`;

/** 明るい所だけを取り出す(ハレーション・にじみの元) */
export const HIGHLIGHT = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_threshold;
uniform vec2 u_srcTexel;
in vec2 v_uv;
out vec4 o;
vec3 pick(vec2 uv) {
  vec3 c = textureLod(u_tex, uv, 0.0).rgb;
  float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), max(max(c.r, c.g), c.b) * 0.9);
  return c * smoothstep(u_threshold, min(u_threshold + 0.1, 1.0), l);
}
void main() {
  // 縮小する前に明るさで切る(小さな街灯も消さない)。4x4 画素を4回の補間読みで平均する
  vec2 d = u_srcTexel;
  vec3 c = pick(v_uv + vec2(-d.x, -d.y)) + pick(v_uv + vec2(d.x, -d.y)) + pick(v_uv + vec2(-d.x, d.y)) + pick(v_uv + vec2(d.x, d.y));
  o = vec4(c * 0.25, 1.0);
}`;

/** 9タップのガウスぼかし(線形補間で5回の読み出し) */
export const BLUR = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_step;
in vec2 v_uv;
out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb * 0.2270270270;
  c += texture(u_tex, v_uv + u_step * 1.3846153846).rgb * 0.3162162162;
  c += texture(u_tex, v_uv - u_step * 1.3846153846).rgb * 0.3162162162;
  c += texture(u_tex, v_uv + u_step * 3.2307692308).rgb * 0.0702702703;
  c += texture(u_tex, v_uv - u_step * 3.2307692308).rgb * 0.0702702703;
  o = vec4(c, 1.0);
}`;

/** 現像: レンズの癖(色ずれ・四隅の甘さ・輪郭強調)→ 色の転がし */
export const DEVELOP = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler2D u_base;
uniform sampler2D u_blur;
uniform sampler3D u_lut;
uniform float u_lutSize;
uniform float u_strength;
uniform float u_sharpen;
uniform float u_soft;
uniform float u_ab;
uniform vec2 u_texel;
uniform float u_aspect;
uniform vec2 u_pixel;
in vec2 v_uv;
out vec4 o;
void main() {
  vec2 uv = v_uv;
  // 低画素の味: 画素の角を少し残して拡大する(昔の小さな画面の写真を引き伸ばした感じ)
  if (u_pixel.x > 0.0) uv = mix(uv, (floor(uv * u_pixel) + 0.5) / u_pixel, 0.55);
  vec2 c = (uv - 0.5) * vec2(u_aspect, 1.0);
  float r = length(c) / length(vec2(u_aspect, 1.0) * 0.5);
  vec3 col;
  if (u_ab > 0.0) {
    vec2 off = (uv - 0.5) * u_ab * u_strength * r;
    col = vec3(texture(u_base, uv - off).r, texture(u_base, uv).g, texture(u_base, uv + off).b);
  } else {
    col = texture(u_base, uv).rgb;
  }
  if (u_sharpen != 0.0) {
    vec2 d = u_texel * 1.25;
    vec3 nb = (texture(u_base, uv + vec2(d.x, 0.0)).rgb + texture(u_base, uv - vec2(d.x, 0.0)).rgb
             + texture(u_base, uv + vec2(0.0, d.y)).rgb + texture(u_base, uv - vec2(0.0, d.y)).rgb) * 0.25;
    col += (col - nb) * u_sharpen * 1.6 * u_strength;
  }
  if (u_soft > 0.0) {
    vec3 bl = texture(u_blur, uv).rgb;
    col = mix(col, bl, u_soft * u_strength * smoothstep(0.35, 1.05, r));
  }
  col = clamp(col, 0.0, 1.0);
  vec3 lc = col * ((u_lutSize - 1.0) / u_lutSize) + 0.5 / u_lutSize;
  vec3 graded = texture(u_lut, lc).rgb;
  o = vec4(mix(col, graded, u_strength), 1.0);
}`;

/** 仕上げ: ハレーション・にじみ・光もれ・周辺減光・日付・粒子 */
export const FINAL = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_dev;
uniform sampler2D u_haloA;
uniform sampler2D u_haloB;
uniform vec2 u_size;
uniform float u_strength;
uniform vec3 u_halTint;
uniform float u_halAmount;
uniform float u_threshold;
uniform float u_bloom;
uniform float u_vigAmount;
uniform float u_vigFlash;
uniform float u_leak;
uniform vec4 u_leakSeed;
uniform float u_grain;
uniform float u_grainSize;
uniform float u_grainColor;
uniform float u_grainShadow;
uniform uint u_seed;
uniform int u_dateCount;
uniform int u_glyph[12];
uniform float u_gx[12];
uniform vec2 u_dateAnchor;
uniform float u_dateH;
uniform float u_dateWidth;
uniform int u_dateStyle;
in vec2 v_uv;
out vec4 o;

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hash(ivec2 p, uint seed) {
  return float(pcg(uint(p.x) ^ pcg(uint(p.y) ^ seed))) / 4294967295.0;
}
float vnoise(vec2 p, uint seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  ivec2 ii = ivec2(i);
  float a = hash(ii, seed), b = hash(ii + ivec2(1, 0), seed);
  float c = hash(ii + ivec2(0, 1), seed), d = hash(ii + ivec2(1, 1), seed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) - 0.5;
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float glyphDist(vec2 p, int code) {
  float d = 1e3;
  if ((code & 1) != 0) d = min(d, sdSeg(p, vec2(0.1, 1.0), vec2(0.5, 1.0)));
  if ((code & 2) != 0) d = min(d, sdSeg(p, vec2(0.6, 0.9), vec2(0.6, 0.6)));
  if ((code & 4) != 0) d = min(d, sdSeg(p, vec2(0.6, 0.4), vec2(0.6, 0.1)));
  if ((code & 8) != 0) d = min(d, sdSeg(p, vec2(0.1, 0.0), vec2(0.5, 0.0)));
  if ((code & 16) != 0) d = min(d, sdSeg(p, vec2(0.0, 0.4), vec2(0.0, 0.1)));
  if ((code & 32) != 0) d = min(d, sdSeg(p, vec2(0.0, 0.9), vec2(0.0, 0.6)));
  if ((code & 64) != 0) d = min(d, sdSeg(p, vec2(0.1, 0.5), vec2(0.5, 0.5)));
  if ((code & 128) != 0) d = min(d, sdSeg(p, vec2(0.12, 1.0), vec2(0.04, 0.78)));
  if ((code & 256) != 0) d = min(d, length(p - vec2(0.08, 0.0)) - 0.02);
  if ((code & 512) != 0) d = min(d, sdSeg(p, vec2(0.0, 0.0), vec2(0.45, 1.0)));
  return d;
}
vec3 screen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - clamp(b, 0.0, 1.0)); }

void main() {
  vec2 uv = v_uv;
  vec2 px = uv * u_size;
  float shortE = min(u_size.x, u_size.y);
  float aspect = u_size.x / u_size.y;
  vec3 col = texture(u_dev, uv).rgb;
  float k = u_strength;

  // ハレーションとにじみ
  vec3 hA = texture(u_haloA, uv).rgb;
  vec3 hB = texture(u_haloB, uv).rgb;
  // ハレーション: 明るい所のまわりへ赤くにじむ。すでに明るい所にはほとんど乗せない
  float L0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float hl = dot(hA, vec3(0.2126, 0.7152, 0.0722)) * 0.4 + dot(hB, vec3(0.2126, 0.7152, 0.0722)) * 0.6;
  float hv = 1.0 - exp(-hl * 9.0 * u_halAmount * k);
  // 周囲の平均の明るさで弱める(明るい壁の中の窓枠が赤い線にならないように)
  float localL = dot(textureLod(u_dev, uv, log2(shortE / 120.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
  col = screen(col, u_halTint * hv * 0.8 * clamp(1.0 - 1.1 * localL, 0.0, 1.0) * (1.0 - 0.4 * L0));
  col = screen(col, (hA * 0.4 + hB * 0.6) * u_bloom * k * 1.5);

  // 光もれ(端から入る赤〜橙〜黄の光)
  if (u_leak > 0.0) {
    float side = u_leakSeed.x < 0.5 ? uv.x : 1.0 - uv.x;
    float along = uv.y;
    float c1 = u_leakSeed.y, c2 = fract(u_leakSeed.y + 0.37 + u_leakSeed.z * 0.3);
    float band = exp(-pow((along - c1) / (0.22 + 0.2 * u_leakSeed.z), 2.0))
               + 0.7 * exp(-pow((along - c2) / (0.12 + 0.12 * u_leakSeed.w), 2.0));
    float wob = vnoise(vec2(uv.y * 3.0, u_leakSeed.w * 10.0), 77u) * 0.25;
    float depth = (0.16 + 0.22 * u_leakSeed.z) * aspect / max(aspect, 1.0);
    float inten = exp(-max(side + wob * 0.15, 0.0) / depth) * band;
    inten = clamp(inten * 1.15, 0.0, 1.2);
    vec3 hot = vec3(1.0, 0.74, 0.4), mid = vec3(1.0, 0.3, 0.06), low = vec3(0.7, 0.04, 0.03);
    vec3 lc = mix(low, mid, smoothstep(0.05, 0.45, inten));
    lc = mix(lc, hot, smoothstep(0.75, 1.2, inten));
    col = screen(col, lc * smoothstep(0.0, 0.9, inten) * u_leak * k);
  }

  // 周辺減光(光学的な落ち方+フラッシュの中央集中)
  vec2 cc = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(cc) / length(vec2(aspect, 1.0) * 0.5);
  float v = 1.0 - u_vigAmount * k * pow(r, 2.4) * 0.95;
  v *= 1.0 + u_vigFlash * k * (0.18 * exp(-r * r * 2.5) - 0.32 * r * r);
  col *= max(v, 0.0);

  // 日付の写し込み
  if (u_dateCount > 0) {
    float h = u_dateH;
    vec2 org = vec2(u_dateAnchor.x - u_dateWidth * h, u_dateAnchor.y);
    vec2 lp = (px - org) / h;
    if (lp.x > -0.6 && lp.x < u_dateWidth + 0.6 && lp.y > -0.6 && lp.y < 1.6) {
      float d = 1e3;
      for (int i = 0; i < 12; i++) {
        if (i >= u_dateCount) break;
        int code = u_glyph[i];
        if (code == 0) continue;
        vec2 gp = lp - vec2(u_gx[i], 0.0);
        gp.x -= gp.y * 0.12;
        d = min(d, glyphDist(gp, code));
      }
      float t = 0.072;
      float aa = 1.2 / h;
      vec3 light;
      if (u_dateStyle == 1) {
        float core = 1.0 - smoothstep(t - aa, t + aa, d);
        float glow = exp(-max(d - t, 0.0) * 22.0) * 0.18;
        light = vec3(1.0, 0.58, 0.16) * core * 0.95 + vec3(1.0, 0.35, 0.05) * glow;
      } else {
        float core = 1.0 - smoothstep(t * 0.55, t + aa * 2.0, d);
        float glow = exp(-max(d - t * 0.5, 0.0) * 9.0);
        light = vec3(1.0, 0.72, 0.36) * core * 0.9 + vec3(1.0, 0.33, 0.06) * glow * 0.55;
      }
      col = screen(col, light);
    }
  }

  // 粒子(大きさは写真の短辺に比例させ、プレビューと保存で見た目を揃える)
  if (u_grain > 0.0) {
    float gs = max(1.0, shortE / 1500.0 * u_grainSize);
    float n = vnoise(px / gs, u_seed) * 0.62 + vnoise(px / (gs * 0.5), u_seed + 11u) * 0.38
            + (hash(ivec2(px), u_seed + 23u) - 0.5) * 0.3;
    float cs = gs * mix(1.4, 2.6, u_grainShadow);
    vec3 cn = vec3(vnoise(px / cs, u_seed + 101u), vnoise(px / cs, u_seed + 202u), vnoise(px / cs, u_seed + 303u));
    cn -= dot(cn, vec3(0.333));
    float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float mid = 0.3 + 0.7 * pow(clamp(4.0 * L * (1.0 - L), 0.0, 1.0), 0.6);
    float shadow = pow(1.0 - L, 1.6) * 1.2;
    float m = mix(mid, shadow, u_grainShadow);
    vec3 g = vec3(n) * (1.0 - 0.6 * u_grainColor) + cn * 1.5 * u_grainColor;
    col += g * u_grain * k * 0.32 * m;
  }

  // 階調の段差を消す微小なゆらぎ
  col += (hash(ivec2(px), 999u) - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
