import { grade, type Grade, type RGB } from './color';
import type { DateStyle } from './datestamp';

/** 1つの「味」。色の転がしと、光・粒子・レンズの癖の組み合わせ */
export interface Look {
  id: string;
  name: string;
  /** 一覧の下に出す一言 */
  note: string;
  free: boolean;
  grade: Grade;
  /** 粒子: 量・大きさ(1=標準)・色の粒の割合(0〜1) */
  grain: { amount: number; size: number; color: number };
  /** 周辺減光: 量と形(0=光学的な落ち方、1=フラッシュのように中央だけ明るい) */
  vignette: { amount: number; flash: number };
  /** ハレーション(明るい所のまわりの赤いにじみ) */
  halation: { amount: number; threshold: number; tint: RGB };
  /** やわらかい光のにじみ(白) */
  bloom: number;
  /** 光もれ: 既定で入れるか・量 */
  leak: { defaultOn: boolean; amount: number };
  /** 輪郭の強調(昔のデジカメ)。負なら甘く */
  sharpen: number;
  /** 四隅の甘さ(安いレンズ)0〜1 */
  softCorners: number;
  /** 色ずれ(短辺に対する割合 ×1000) */
  aberration: number;
  /** 画素数を落とす(長辺の画素)。null で落とさない */
  lowRes: number | null;
  date: { defaultOn: boolean; style: DateStyle };
  frame: 'none' | 'instant';
}


const base = (o: Partial<Look> & Pick<Look, 'id' | 'name' | 'note' | 'free' | 'grade'>): Look => ({
  grain: { amount: 0.3, size: 1, color: 0.15 },
  vignette: { amount: 0.25, flash: 0 },
  halation: { amount: 0, threshold: 0.8, tint: [1, 0.32, 0.12] },
  bloom: 0,
  leak: { defaultOn: false, amount: 0.7 },
  sharpen: 0,
  softCorners: 0,
  aberration: 0,
  lowRes: null,
  date: { defaultOn: false, style: 'film' },
  frame: 'none',
  ...o,
});

export const LOOKS: Look[] = [
  base({
    id: 'natsuiro', name: 'ナツイロ', note: 'やさしい色', free: true,
    grade: grade({
      exposure: 0.15, temp: 0.36, tint: 0.05,
      mix: [[0.92, 0.07, 0.01], [0.04, 0.9, 0.06], [0.0, 0.1, 0.9]],
      contrast: 1.06, pivot: 0.42, shoulder: 0.9,
      shadowTint: [0.0, 0.012, 0.018], highlightTint: [0.025, 0.008, -0.03],
      saturation: 0.92, greenHue: 14, greenSat: 0.78, blueHue: 6, blueSat: 0.9, skinSat: 1.05,
      black: [0.045, 0.04, 0.045], white: [0.985, 0.97, 0.93],
    }),
    grain: { amount: 0.32, size: 1, color: 0.18 },
    vignette: { amount: 0.22, flash: 0 },
    halation: { amount: 0.35, threshold: 0.8, tint: [1, 0.36, 0.14] },
    bloom: 0.08,
  }),
  base({
    id: 'sutekame', name: 'ステカメ', note: '使い捨てカメラ', free: true,
    grade: grade({
      exposure: 0.05, temp: 0.18, tint: -0.08,
      mix: [[0.9, 0.1, 0.0], [0.06, 0.88, 0.06], [0.0, 0.14, 0.86]],
      contrast: 1.32, pivot: 0.45, shoulder: 0.7,
      shadowTint: [-0.01, 0.025, 0.005], highlightTint: [0.03, 0.015, -0.035],
      saturation: 1.12, greenHue: 10, greenSat: 0.95, blueHue: 4, blueSat: 1.05, skinSat: 1.08,
      black: [0.03, 0.035, 0.03], white: [1, 0.98, 0.94],
    }),
    grain: { amount: 0.5, size: 1.3, color: 0.22 },
    vignette: { amount: 0.55, flash: 0.55 },
    halation: { amount: 0.25, threshold: 0.82, tint: [1, 0.4, 0.15] },
    bloom: 0.06,
    leak: { defaultOn: false, amount: 0.75 },
    softCorners: 0.6,
    aberration: 0.9,
    date: { defaultOn: true, style: 'film' },
  }),
  base({
    id: 'mono400', name: 'モノクロ400', note: '粒の立つ白黒', free: true,
    grade: grade({
      exposure: 0.05, contrast: 1.28, pivot: 0.45, shoulder: 0.8,
      mono: [0.36, 0.52, 0.12],
      black: [0.03, 0.03, 0.03], white: [0.985, 0.985, 0.98],
    }),
    grain: { amount: 0.55, size: 1.15, color: 0 },
    vignette: { amount: 0.3, flash: 0 },
    halation: { amount: 0, threshold: 0.85, tint: [1, 1, 1] },
    bloom: 0.1,
  }),
  base({
    id: 'sukitoori', name: 'スキトオリ', note: '淡い透明感', free: false,
    grade: grade({
      exposure: 0.55, temp: -0.08, tint: -0.06,
      mix: [[0.9, 0.08, 0.02], [0.03, 0.92, 0.05], [0.02, 0.08, 0.9]],
      contrast: 0.8, pivot: 0.38, shoulder: 1,
      shadowTint: [0.0, 0.02, 0.03], highlightTint: [0.01, 0.01, 0.0],
      saturation: 0.74, greenHue: -8, greenSat: 0.7, blueHue: 8, blueSat: 0.85, skinSat: 0.95,
      black: [0.13, 0.14, 0.15], white: [1, 0.995, 0.98],
    }),
    grain: { amount: 0.18, size: 0.9, color: 0.12 },
    vignette: { amount: 0.08, flash: 0 },
    bloom: 0.26,
    halation: { amount: 0.15, threshold: 0.78, tint: [1, 0.55, 0.4] },
  }),
  base({
    id: 'manatsu', name: 'マナツ', note: '濃い青空', free: false,
    grade: grade({
      exposure: -0.12, temp: 0.04,
      mix: [[1.06, -0.04, -0.02], [-0.03, 1.06, -0.03], [-0.02, -0.05, 1.07]],
      contrast: 1.38, pivot: 0.47, shoulder: 0.6,
      shadowTint: [-0.01, 0.0, 0.025], highlightTint: [0.015, 0.01, -0.01],
      saturation: 1.22, greenHue: -6, greenSat: 1.0, blueHue: -4, blueSat: 1.2, skinSat: 1.0,
      black: [0.0, 0.0, 0.012], white: [1, 1, 0.99],
    }),
    grain: { amount: 0.2, size: 0.85, color: 0.1 },
    vignette: { amount: 0.4, flash: 0 },
    halation: { amount: 0.1, threshold: 0.85, tint: [1, 0.4, 0.2] },
  }),
  base({
    id: 'yorunohikari', name: 'ヨルノヒカリ', note: '赤くにじむ光', free: false,
    grade: grade({
      exposure: 0.05, temp: -0.22, tint: 0.02,
      mix: [[0.9, 0.08, 0.02], [0.04, 0.9, 0.06], [0.0, 0.08, 0.92]],
      contrast: 1.18, pivot: 0.42, shoulder: 1,
      shadowTint: [-0.015, 0.012, 0.03], highlightTint: [0.03, 0.012, -0.02],
      saturation: 0.95, greenHue: 8, greenSat: 0.8, blueHue: 10, blueSat: 0.95, skinSat: 1.05,
      black: [0.035, 0.045, 0.055], white: [0.98, 0.97, 0.95],
    }),
    grain: { amount: 0.38, size: 1.05, color: 0.2 },
    vignette: { amount: 0.3, flash: 0 },
    halation: { amount: 1.0, threshold: 0.78, tint: [1, 0.24, 0.08] },
    bloom: 0.12,
  }),
  base({
    id: 'aseta', name: 'アセタ', note: '色あせた写真', free: false,
    grade: grade({
      exposure: 0.08, temp: 0.4, tint: 0.12,
      mix: [[0.86, 0.12, 0.02], [0.08, 0.84, 0.08], [0.04, 0.16, 0.8]],
      contrast: 0.9, pivot: 0.45, shoulder: 1,
      shadowTint: [0.035, 0.0, 0.01], highlightTint: [0.02, 0.01, -0.06],
      saturation: 0.72, greenHue: 18, greenSat: 0.6, blueHue: 10, blueSat: 0.6, skinSat: 1.0,
      black: [0.12, 0.08, 0.08], white: [0.97, 0.93, 0.82],
    }),
    grain: { amount: 0.3, size: 1.2, color: 0.25 },
    vignette: { amount: 0.25, flash: 0 },
    halation: { amount: 0.2, threshold: 0.8, tint: [1, 0.4, 0.2] },
    bloom: 0.05,
    softCorners: 0.35,
  }),
  base({
    id: 'instant', name: 'インスタント', note: '白い枠つき', free: false,
    grade: grade({
      exposure: 0.15, temp: 0.08, tint: -0.06,
      mix: [[0.9, 0.08, 0.02], [0.05, 0.88, 0.07], [0.0, 0.12, 0.88]],
      contrast: 1.1, pivot: 0.42, shoulder: 1,
      shadowTint: [-0.02, 0.02, 0.035], highlightTint: [0.025, 0.02, -0.02],
      saturation: 0.86, greenHue: -10, greenSat: 0.8, blueHue: 12, blueSat: 0.85, skinSat: 1.0,
      black: [0.07, 0.085, 0.1], white: [0.98, 0.97, 0.92],
    }),
    grain: { amount: 0.16, size: 0.9, color: 0.1 },
    vignette: { amount: 0.35, flash: 0.3 },
    bloom: 0.12,
    softCorners: 0.5,
    frame: 'instant',
  }),
  base({
    id: 'heiseidigi', name: '平成デジカメ', note: '2000年代の色', free: false,
    grade: grade({
      exposure: 0.2, temp: -0.12, tint: 0.06,
      mix: [[1.04, -0.02, -0.02], [-0.02, 1.04, -0.02], [-0.02, -0.02, 1.04]],
      contrast: 1.22, pivot: 0.5, shoulder: 0,
      shadowTint: [0.0, -0.005, 0.02], highlightTint: [-0.01, 0.0, 0.015],
      saturation: 1.18, greenHue: 0, greenSat: 1.1, blueHue: -8, blueSat: 1.15, skinSat: 1.05,
      black: [0.0, 0.0, 0.01], white: [1, 1, 1],
    }),
    grain: { amount: 0.1, size: 1.6, color: 0.7 },
    vignette: { amount: 0.06, flash: 0 },
    sharpen: 0.6,
    aberration: 0.3,
    lowRes: 2048,
    date: { defaultOn: true, style: 'digital' },
  }),
  base({
    id: 'garake', name: 'ガラケー', note: '昔のケータイ', free: false,
    grade: grade({
      exposure: 0.35, temp: 0.2, tint: -0.32,
      mix: [[0.95, 0.05, 0.0], [0.05, 0.95, 0.0], [0.02, 0.08, 0.9]],
      contrast: 1.38, pivot: 0.5, shoulder: 0,
      shadowTint: [-0.02, 0.04, 0.05], highlightTint: [0.03, 0.03, -0.07],
      saturation: 1.05, greenHue: 6, greenSat: 0.95, blueHue: 0, blueSat: 0.9, skinSat: 1.0,
      black: [0.03, 0.035, 0.03], white: [1, 1, 0.97],
    }),
    grain: { amount: 0.4, size: 1.8, color: 0.75 },
    vignette: { amount: 0.3, flash: 0 },
    sharpen: 0.45,
    softCorners: 0.5,
    aberration: 1.2,
    lowRes: 640,
  }),
];

export const DEFAULT_LOOK = LOOKS[0].id;

export function findLook(id: string | null | undefined): Look {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0];
}

/** 無料で使える(保存できる)か */
export function canSave(look: Look, premium: boolean): boolean {
  return premium || look.free;
}

/** 保存した写真に小さな名前を入れるか(無料の間だけ) */
export function needsWatermark(premium: boolean): boolean {
  return !premium;
}
