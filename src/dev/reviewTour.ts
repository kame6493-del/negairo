/**
 * App Review 用の画面録画で流す自動操作。VITE_REVIEW_TOUR=1 で作ったビルドだけで動く(製品版には入らない)。
 * 持ち主が iPhone を持っていないので、CI のシミュレーターでこれを流しながら録画する(.github/workflows/ios-review-video.yml)。
 * シミュレーターにはカメラが無い。撮影画面は「カメラが見つからない」の表示になるので、アプリにある「写真を選んで加工する」の流れを見せる。
 * 写真を選ぶ OS の画面は自動では押せないため、選ばれた写真(CC0 の見本 samples/night_tower.jpg)を、選んだときと同じ入口(ファイルの入力欄)へ渡す。
 * 起動 → 写真 → 効果を3つ試す → 強さ・光もれ・日付 → 保存 → 完全版の効果 → 完全版の購入画面。押した所に丸を出す。
 */
import sampleUrl from '../../samples/night_tower.jpg';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tapMark(el: Element) {
  const r = el.getBoundingClientRect();
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    position: 'fixed', left: `${r.left + r.width / 2 - 22}px`, top: `${r.top + r.height / 2 - 22}px`,
    width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(210,64,42,0.35)',
    border: '2px solid rgba(210,64,42,0.8)', zIndex: '99999', pointerEvents: 'none', transition: 'opacity .6s, transform .6s',
  });
  document.body.appendChild(dot);
  requestAnimationFrame(() => { dot.style.transform = 'scale(1.4)'; dot.style.opacity = '0'; });
  setTimeout(() => dot.remove(), 700);
}

async function find(selector: string, wait = 6000): Promise<HTMLElement | null> {
  const end = Date.now() + wait;
  while (Date.now() < end) {
    const el = [...document.querySelectorAll<HTMLElement>(selector)].find((b) => b.getClientRects().length > 0 && !(b as HTMLButtonElement).disabled);
    if (el) return el;
    await sleep(200);
  }
  return null;
}

async function tap(selector: string, pause = 1800, wait = 6000) {
  const el = await find(selector, wait);
  if (!el) return false;
  el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  await sleep(600);
  tapMark(el);
  await sleep(250);
  el.click();
  await sleep(pause);
  return true;
}

/** 写真の入口(ファイルの入力欄)に見本の写真を渡す。OS の写真選びの画面で1枚選んだのと同じ結果になる */
async function pickSample() {
  const btn = await find('[data-testid=pick]');
  const input = document.querySelector<HTMLInputElement>('[data-testid=file-input]');
  if (!btn || !input) return false;
  tapMark(btn);
  await sleep(900);
  const blob = await (await fetch(sampleUrl)).blob();
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'night_tower.jpg', { type: 'image/jpeg', lastModified: new Date(2026, 6, 21, 20, 30).getTime() }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return !!(await find('[data-testid=editor-canvas]', 10000));
}

/** 効果の強さの つまみを、指で動かしたように少しずつ動かす */
async function slide(to: number) {
  const el = await find('[data-testid=strength]');
  if (!el) return;
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  tapMark(input);
  const from = Number(input.value);
  for (let k = 1; k <= 8; k++) {
    setter.call(input, String(Math.round((from + ((to - from) * k) / 8) / 5) * 5));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(150);
  }
  await sleep(1500);
}

export async function runReviewTour() {
  // はじめての案内(初回だけ)を3枚めくる
  for (let k = 0; k < 3; k++) if (!(await tap('[data-testid=onb-next]', 2200, 3000))) break;
  await sleep(4000); // 起動した撮影画面(シミュレーターではカメラが無い旨の表示)を見せる
  if (!(await pickSample())) return;
  await sleep(2500);
  // 無料の効果を順に試す
  for (const id of ['natsuiro', 'sutekame', 'mono400', 'natsuiro']) await tap(`[data-look=${id}]`, 2200);
  // 強さ・光もれ・日付
  await slide(60);
  await tap('[data-testid=tab-leak]', 1200);
  await tap('[data-testid=ed-leak]', 2000);
  await tap('[data-testid=ed-reroll]', 2000);
  await tap('[data-testid=tab-date]', 1200);
  await tap('[data-testid=ed-date]', 2200);
  await tap('[data-testid=tab-look]', 1200);
  await slide(100);
  // 保存(新しい写真として「写真」に加わる。元の写真は書き換えない)
  await tap('[data-testid=save]', 3500);
  await tap('[data-testid=saved-edit]', 1500);
  // 完全版の効果(鍵の印)を試す → 保存しようとすると購入画面
  for (const id of ['yorunohikari', 'instant', 'heiseidigi']) await tap(`[data-look=${id}]`, 2500);
  await tap('[data-look=yorunohikari]', 2500);
  await tap('[data-testid=save]', 3500);
  const pw = document.querySelector('[data-testid=paywall]');
  if (pw) {
    const box = pw.closest('.app') ?? document.scrollingElement!;
    for (let k = 1; k <= 30; k++) { (box as HTMLElement).scrollTop = (pw.scrollHeight * k) / 30; window.scrollTo(0, (document.body.scrollHeight * k) / 30); await sleep(80); }
  }
  await sleep(2500);
  // 購入ボタン(シミュレーターでストアの商品が取れたときだけ押せる)
  await tap('.pw-cta .btn.primary[data-testid=buy]', 1000, 10000);
  await sleep(6000);
}
