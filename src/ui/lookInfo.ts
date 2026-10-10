/**
 * 一覧で見せる「味」の説明と見本(見本は CC0 の写真 samples/portrait.jpg に、本物の描画処理で各効果をかけた物。
 * scripts/make_look_thumbs.py で作る)。効果そのものの定義は fx/presets.ts。
 */
const thumbs = import.meta.glob('../assets/looks/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;

export function lookThumb(id: string): string | undefined {
  return thumbs[`../assets/looks/${id}.jpg`];
}

export const LOOK_DESC: Record<string, string> = {
  natsuiro: 'あたたかく、やさしいカラーネガの色。',
  sutekame: '使い捨てカメラのフラッシュと日付。',
  mono400: '粒の立つ、味わい深い白黒。',
  sukitoori: '明るく淡い、透明感のある色。',
  manatsu: '真夏の濃い青空とくっきりした色。',
  yorunohikari: '夜の街の光が、赤くにじむ。',
  aseta: '少し色あせた、昔のプリント。',
  instant: '白い枠つきのインスタント写真。',
  heiseidigi: '2000年代のデジカメの質感。',
  garake: '昔のケータイの粗い画質。',
};
