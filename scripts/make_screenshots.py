# Play のストア用の画面写真(1080x1920)を作る。実際のアプリ画面を撮り、見本と同じクリーム色の紙に題字・手書きの一言を載せる。
# 2026-10-10 見た目の作り直しに合わせて作り直し(前の版は store/_old_2026-10-10/play/)。iOS は出し直さないので作らない。
# 値段と「無料」は写さない(完全版を買った状態=開発ビルドの疑似購入で撮る。購入画面は撮らない)。
# 開発サーバー(npx vite --port 5181)を開いた状態で: python scripts/make_screenshots.py
# 見本写真は samples/SOURCES.md の CC0・パブリックドメインのものだけを使う。
import json, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'http://localhost:5181/'
RAW = os.path.join(APP, 'research', 'shots_raw')
os.makedirs(RAW, exist_ok=True)
FONTS = os.path.join(os.environ['LOCALAPPDATA'], 'NegairoBuild', 'fonts')
LOGO = os.path.join(FONTS, 'ZenOldMincho-Black.ttf')
HAND = os.path.join(FONTS, 'KleeOne-SemiBold.ttf')
CAM = None  # e2e.py が作る偽のカメラ映像

SHOTS = [
    # (名前, 画面, 味, 見本, 設定の上書き, 題, 手書きの一言)
    ('1', 'camera', 'natsuiro', None, {}, '撮影画面で仕上がりを確認', '効果を見ながら、その場で撮れる。'),
    ('2', 'editor', 'yorunohikari', 'night_tower.jpg', {}, '夜の光が、赤くにじむ', '映画フィルムのような、ヨルノヒカリ。'),
    ('3', 'looks', 'sutekame', None, {}, '全10種の、写りの味', '使い捨てカメラから、平成のデジカメまで。'),
    ('4', 'date', 'sutekame', 'portrait.jpg', {'customDate': '2026-04-05'}, '日付は自由に変えられる', 'スタイル3形・好きな日付で写し込み。'),
    ('5', 'saved', 'instant', 'cat_cafe.jpg', {}, '元の写真はそのまま', '新しい写真として保存。書き換えません。'),
    ('6', 'privacy', 'natsuiro', None, {}, '端末の中だけで加工', '登録なし・広告なし。写真は外へ送りません。'),
]


def settings(look, extra):
    s = {'v': 1, 'lookId': look, 'strength': 100, 'dateByLook': {}, 'dateStyle': 'auto', 'customDate': None,
         'leakOn': False, 'grainOn': True, 'facing': 'environment'}
    s.update(extra)
    return json.dumps(s)


def capture(pw):
    cam = os.path.join(APP, 'scripts', 'e2e_out', 'fake_cam.y4m')
    b = pw.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={cam}',
                                 '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    out = {}
    for name, screen, look, sample, extra, *_ in SHOTS:
        ctx = b.new_context(viewport={'width': 390, 'height': 800}, device_scale_factor=3, accept_downloads=True)
        ctx.grant_permissions(['camera'])
        pg = ctx.new_page()
        pg.add_init_script(f"""localStorage.setItem('CapacitorStorage.negairo.settings.v1', {json.dumps(settings(look, extra))});
          localStorage.setItem('CapacitorStorage.negairo.guideSeen.v1', '1');
          localStorage.setItem('negairo.mockFull', '1');""")
        pg.goto(URL)
        pg.wait_for_selector('[data-testid=viewfinder]')
        pg.wait_for_function('document.fonts.status === "loaded"')
        if screen == 'camera':
            pg.wait_for_function("() => document.querySelector('[data-testid=viewfinder]').width >= 640")
            pg.wait_for_timeout(800)
        elif screen == 'looks':
            pg.click('[data-testid=open-looks]'); pg.wait_for_selector('[data-testid=looklist]')
        elif screen == 'privacy':
            pg.click('[data-testid=open-settings]'); pg.click('[data-testid=open-privacy]'); pg.wait_for_selector('[data-testid=privacy]')
        else:
            pg.set_input_files('[data-testid=file-input]', os.path.join(APP, 'samples', sample))
            pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]')?.width > 100")
            if screen == 'date':
                pg.click('[data-testid=tab-date]')
            if screen == 'saved':
                with pg.expect_download():
                    pg.click('[data-testid=save]')
                pg.wait_for_function("() => { const i = document.querySelector('.sheet-img'); return i && i.complete && i.naturalWidth > 0; }")
        pg.wait_for_timeout(500)
        p = os.path.join(RAW, f'play_{name}.png')
        pg.screenshot(path=p)
        out[name] = p
        ctx.close()
    b.close()
    return out


def paper(W, H):
    """見本の背景のようなクリーム色の紙(上が明るく、うっすら斑)"""
    import numpy as np
    y = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array([250, 245, 236]), np.array([238, 228, 212])
    arr = top * (1 - y) + bot * y
    arr = np.broadcast_to(arr, (H, W, 3)).copy()
    rng = np.random.default_rng(5)
    blot = Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype('uint8')).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
    arr += (np.asarray(blot)[..., None] / 255 - 0.5) * 10
    arr += rng.normal(0, 2.2, (H, W, 1))
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'))


def compose(raw, W, H, title, sub, path):
    bg = paper(W, H)
    d = ImageDraw.Draw(bg)
    ft = ImageFont.truetype(LOGO, int(W * 0.068))
    fh = ImageFont.truetype(HAND, int(W * 0.041))
    tw = d.textlength(title, font=ft)
    d.text(((W - tw) / 2, 92), title, font=ft, fill=(59, 36, 23))
    d.line([(W / 2 - 40, 205), (W / 2 + 40, 205)], fill=(214, 120, 70), width=3)
    sw = d.textlength(sub, font=fh)
    d.text(((W - sw) / 2, 232), sub, font=fh, fill=(226, 98, 32))
    im = Image.open(raw).convert('RGB')
    top = 340
    ph = H - top - 60
    s = ph / im.height
    im = im.resize((int(im.width * s), ph), Image.LANCZOS)
    x = (W - im.width) // 2
    bz = 16
    # 影と黒いふち(スマホの形)
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle([x - bz + 10, top - bz + 24, x + im.width + bz + 10, top + ph + bz + 24], radius=70, fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    bg.paste(Image.new('RGB', (W, H), (90, 60, 40)), (0, 0), sh)
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle([x - bz, top - bz, x + im.width + bz, top + ph + bz], radius=66, fill=(20, 17, 15))
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=52, fill=255)
    bg.paste(im, (x, top), m)
    bg.save(path)


if __name__ == '__main__':
    store = os.path.join(APP, 'store', 'play')
    os.makedirs(store, exist_ok=True)
    with sync_playwright() as pw:
        play = capture(pw)
    for name, *_rest, title, sub in SHOTS:
        compose(play[name], 1080, 1920, title, sub, os.path.join(store, f'play_shot_{name}.png'))
    print('ok')
