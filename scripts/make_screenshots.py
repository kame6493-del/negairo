# ストア用の画面写真(iPhone 1290x2796 / Play 1080x1920)を作る。実際のアプリ画面を撮って、上に一言を載せる。
# 開発サーバー(npx vite --port 5181)を開いた状態で: python scripts/make_screenshots.py
# 見本写真は samples/SOURCES.md の CC0・パブリックドメインのものだけを使う。
import json, os
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'http://localhost:5181/'
RAW = os.path.join(APP, 'research', 'shots_raw')
os.makedirs(RAW, exist_ok=True)
FONT_B = 'C:/Windows/Fonts/meiryob.ttc'
FONT = 'C:/Windows/Fonts/meiryo.ttc'

SHOTS = [
    # (名前, 見本, 味, 設定の上書き, 見出し, 小見出し, 課金済み, 画面)
    ('1', 'portrait.jpg', 'sutekame', {}, '使い捨てカメラの写り', '日付の写し込みも、あの頃の色で', False, 'editor'),
    ('2', 'night_tower.jpg', 'yorunohikari', {}, '夜の光が、赤くにじむ', '映画フィルムのハレーション', True, 'editor'),
    ('3', 'cat_cafe.jpg', 'instant', {}, '白い枠のプリントも', '撮ってすぐ、端末の中で仕上げる', True, 'editor'),
    ('4', 'tokyo_building.jpg', 'heiseidigi', {}, '平成のデジカメ風', 'くっきり濃い色とオレンジの日付', True, 'editor'),
    # 5枚目(購入画面・「無料で3種」)は外した。App Store は写真に値段・「無料」を書くと 2.3.7 で却下する(2026-10-07 ニガテ帳)。
]


def settings(look, extra):
    s = {'v': 1, 'lookId': look, 'strength': 100, 'dateByLook': {}, 'dateStyle': 'auto', 'customDate': '2026-10-03',
         'leakOn': False, 'grainOn': True, 'facing': 'environment'}
    s.update(extra)
    return json.dumps(s)


def capture(pw, w, h, tag):
    b = pw.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
                                 '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    out = {}
    for name, sample, look, extra, *_rest, premium, screen in SHOTS:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=3)
        ctx.grant_permissions(['camera'])
        pg = ctx.new_page()
        pg.add_init_script(f"""localStorage.setItem('CapacitorStorage.negairo.settings.v1', {json.dumps(settings(look, extra))});
          localStorage.setItem('negairo.mockFull', '{'1' if premium else '0'}');""")
        pg.goto(URL)
        pg.wait_for_selector('[data-testid=viewfinder], [data-testid=camera-error]')
        if screen == 'paywall':
            pg.click('[data-testid=open-settings]')
            pg.click('[data-testid=settings-paywall]')
            pg.wait_for_selector('[data-testid=paywall]')
        else:
            pg.set_input_files('[data-testid=file-input]', os.path.join(APP, 'samples', sample))
            pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]')?.width > 100")
            pg.wait_for_timeout(400)
        p = os.path.join(RAW, f'{tag}_{name}.png')
        pg.screenshot(path=p)
        out[name] = p
        ctx.close()
    b.close()
    return out


def compose(raw, W, H, title, sub, path):
    bg = Image.new('RGB', (W, H), (20, 17, 15))
    d = ImageDraw.Draw(bg)
    cap = int(H * 0.15)
    ft = ImageFont.truetype(FONT_B, int(W * 0.068))
    fs = ImageFont.truetype(FONT, int(W * 0.036))
    tw = d.textlength(title, font=ft)
    d.text(((W - tw) / 2, cap * 0.28), title, font=ft, fill=(255, 179, 107))
    sw = d.textlength(sub, font=fs)
    d.text(((W - sw) / 2, cap * 0.28 + W * 0.095), sub, font=fs, fill=(232, 222, 205))
    im = Image.open(raw).convert('RGB')
    avail_h = H - cap - int(H * 0.03)
    s = min(avail_h / im.height, (W * 0.86) / im.width)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    x = (W - im.width) // 2
    y = cap + int(H * 0.01)
    # 画面の縁(角を丸めて、うすい枠)
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=int(W * 0.04), fill=255)
    d.rounded_rectangle([x - 6, y - 6, x + im.width + 5, y + im.height + 5], radius=int(W * 0.045), fill=(58, 50, 44))
    bg.paste(im, (x, y), m)
    bg.save(path)


if __name__ == '__main__':
    store = os.path.join(APP, 'store')
    os.makedirs(os.path.join(store, 'play'), exist_ok=True)
    with sync_playwright() as pw:
        ios = capture(pw, 430, 932, 'ios')
        play = capture(pw, 390, 800, 'play')
    for name, _s, _l, _e, title, sub, _p, _sc in SHOTS:
        compose(ios[name], 1290, 2796, title, sub, os.path.join(store, f'ios_shot_{name}.png'))
        compose(play[name], 1080, 1920, title, sub, os.path.join(store, 'play', f'play_shot_{name}.png'))
    print('ok')
