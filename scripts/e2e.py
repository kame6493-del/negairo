# 全画面を押して回る E2E。偽のカメラ映像(Chromium の fake device に CC0 の見本 samples/portrait.jpg を流す)で、
# はじめての案内 → 撮影 → 効果一覧 → 加工(効果・光もれ・粒子・日付のタブ)→ 保存 → 完全版 → 設定 → プライバシー → 使い方ガイド、
# カメラが使えないときの表示まで。各画面の写真を scripts/e2e_out/<mode>_<幅>/ に残す。
# 使い方:
#   製品ビルド: npm run build → npx vite preview --port 5182 → python scripts/e2e.py http://localhost:5182/ dist 375 812
#   開発(疑似購入あり): npx vite --port 5181 → python scripts/e2e.py http://localhost:5181/ dev 430 932
import os, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright, expect

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5182/'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'dist'
W = int(sys.argv[3]) if len(sys.argv) > 3 else 390
H = int(sys.argv[4]) if len(sys.argv) > 4 else 844
OUT = os.path.join(APP, 'scripts', 'e2e_out', f'{MODE}_{W}')
os.makedirs(OUT, exist_ok=True)
SAMPLE = os.path.join(APP, 'samples', 'portrait.jpg')
results = []


def ok(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('OK  ' if cond else 'NG  ') + name + (f'  ({detail})' if detail else ''))


def jpeg_info(path):
    im = Image.open(path)
    return im.format, im.size


def fake_video():
    """縦 3:4 の偽のカメラ映像(y4m・数コマ)。見本写真を切り抜いて流す"""
    path = os.path.join(OUT, '..', 'fake_cam.y4m')
    if os.path.exists(path):
        return os.path.abspath(path)
    im = Image.open(SAMPLE).convert('RGB')
    w, h = im.size
    cw = int(h * 3 / 4)
    im = im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h)).resize((960, 1280), Image.LANCZOS)
    ycc = np.asarray(im.convert('YCbCr'))
    y = ycc[..., 0]
    u = np.asarray(Image.fromarray(ycc[..., 1]).resize((480, 640), Image.BILINEAR))
    v = np.asarray(Image.fromarray(ycc[..., 2]).resize((480, 640), Image.BILINEAR))
    with open(path, 'wb') as f:
        f.write(b'YUV4MPEG2 W960 H1280 F15:1 Ip A1:1 C420jpeg\n')
        for _ in range(4):
            f.write(b'FRAME\n'); f.write(y.tobytes()); f.write(u.tobytes()); f.write(v.tobytes())
    return os.path.abspath(path)


def shot(pg, name, full=False):
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(OUT, name + '.png'), full_page=full)


def no_hscroll(pg, where):
    sw = pg.evaluate('document.documentElement.scrollWidth')
    ok(f'{where}: 横にはみ出さない', sw <= W, f'scrollWidth {sw} / {W}')


with sync_playwright() as p:
    gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
                                f'--use-file-for-fake-video-capture={fake_video()}'] + gl)
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=3, accept_downloads=True)
    ctx.grant_permissions(['camera'])
    pg = ctx.new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL)

    # 0) はじめての案内(初回だけ)
    pg.wait_for_selector('[data-testid=onboarding]')
    ok('初回は「はじめての案内」が出る', True)
    pg.wait_for_function('document.fonts.status === "loaded"')
    shot(pg, '00a_onboarding1'); no_hscroll(pg, '案内1')
    pg.click('[data-testid=onb-next]'); shot(pg, '00b_onboarding2')
    pg.click('[data-testid=onb-next]'); shot(pg, '00c_onboarding3')
    ok('3枚目は「はじめる」', 'はじめる' in pg.inner_text('[data-testid=onb-next]'))
    pg.click('[data-testid=onb-next]')

    # 1) 撮影画面: カメラの映像に効果がかかって描かれる
    pg.wait_for_selector('[data-testid=viewfinder]')
    pg.wait_for_function("() => { const c = document.querySelector('[data-testid=viewfinder]'); return c && c.width >= 640; }", timeout=20000)
    w = pg.evaluate("document.querySelector('[data-testid=viewfinder]').width")
    mean = pg.evaluate("""() => { const c = document.querySelector('[data-testid=viewfinder]'); const t = document.createElement('canvas'); t.width = 64; t.height = 48;
      const x = t.getContext('2d'); x.drawImage(c, 0, 0, 64, 48); const d = x.getImageData(0, 0, 64, 48).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i+1] + d[i+2]; return s / (d.length / 4) / 3; }""")
    ok('撮影画面に効果つきの映像が出る(真っ黒でない)', w >= 640 and mean > 10, f'canvas {w}px 平均の明るさ {mean:.0f}')
    ok('カメラのエラーが出ない', pg.locator('[data-testid=camera-error]').count() == 0)
    ok('効果の見本写真が10枚出る', pg.locator('.looks .look-thumb img').count() == 10)
    shot(pg, '01_camera'); no_hscroll(pg, '撮影画面')

    # 2) 味を選ぶ → 日付・光もれの切り替え
    pg.click('[data-look=sutekame]')
    expect(pg.locator('[data-testid=date-toggle]')).to_contain_text('あり')
    ok('ステカメは日付ありが既定', True)
    pg.click('[data-testid=date-toggle]')
    expect(pg.locator('[data-testid=date-toggle]')).to_contain_text('なし')
    pg.click('[data-testid=date-toggle]')
    ok('日付の切り替え', 'あり' in pg.inner_text('[data-testid=date-toggle]'))
    pg.click('[data-testid=leak-toggle]'); pg.click('[data-testid=leak-toggle]')
    ok('光もれの切り替え(元に戻す)', 'なし' in pg.inner_text('[data-testid=leak-toggle]'))

    # 3) 効果の一覧から選ぶ
    pg.click('[data-testid=open-looks]')
    pg.wait_for_selector('[data-testid=looklist]')
    ok('一覧に10種のカード', pg.locator('.lcard[data-card]').count() == 10)
    shot(pg, '02_looks'); no_hscroll(pg, '効果一覧')
    pg.click('[data-card=manatsu]')
    pg.wait_for_selector('[data-testid=viewfinder]')
    ok('一覧で選ぶと撮影画面に戻り、その効果になる', pg.get_attribute('.look.on', 'data-look') == 'manatsu')
    shot(pg, '01b_camera_fulllook')
    pg.click('[data-look=sutekame]')

    # 4) 撮る → 加工画面 → 保存(ブラウザではダウンロード)→ 保存した後のシート
    pg.click('[data-testid=shutter]')
    pg.wait_for_selector('[data-testid=editor-canvas]')
    pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]').width > 100")
    ok('撮ると加工画面に移る', True)
    shot(pg, '03_editor'); no_hscroll(pg, '加工画面')
    # 長押しで元の写真
    box = pg.locator('.ed-stage').bounding_box()
    pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    pg.mouse.down(); pg.wait_for_timeout(200)
    ok('長押しで元の写真になる', '元の写真' == pg.inner_text('.badge-l').strip())
    shot(pg, '03b_editor_hold')
    pg.mouse.up(); pg.wait_for_timeout(100)
    ok('離すと効果に戻る', '長押し' in pg.inner_text('.badge-l'))
    with pg.expect_download() as dl:
        pg.click('[data-testid=save]')
    path = os.path.join(OUT, 'shot_camera.jpg')
    dl.value.save_as(path)
    fmt, size = jpeg_info(path)
    ok('撮った写真を JPEG で保存できる', fmt == 'JPEG' and size[0] > 100, f'{fmt} {size}')
    expect(pg.locator('[data-testid=toast]')).to_be_visible()
    pg.wait_for_function("() => { const i = document.querySelector('.sheet-img'); return i && i.complete && i.naturalWidth > 0; }")
    shot(pg, '04_saved')
    pg.click('[data-testid=saved-done]')
    pg.wait_for_selector('[data-testid=viewfinder]')
    ok('「撮影に戻る」で撮影画面へ', True)

    # 5) 写真を選ぶ → 強さ・光もれ・粒子・日付 → 保存。元の写真は変わらない
    before = open(SAMPLE, 'rb').read()
    pg.set_input_files('[data-testid=file-input]', SAMPLE)
    pg.wait_for_selector('[data-testid=editor-canvas]')
    pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]').width > 100")
    pg.fill('[data-testid=strength]', '60')
    ok('強さを変えられる', '60%' in pg.inner_text('.slider'))
    pg.click('[data-testid=tab-leak]')
    pg.click('[data-testid=ed-leak]')
    pg.click('[data-testid=ed-reroll]')
    ok('光もれを入れて形を変えられる', pg.get_attribute('[data-testid=ed-leak]', 'aria-checked') == 'true')
    shot(pg, '05_editor_leak'); no_hscroll(pg, '光もれタブ')
    pg.click('[data-testid=tab-grain]')
    pg.click('[data-testid=ed-grain]'); pg.click('[data-testid=ed-grain]')
    ok('粒子の切り替え', pg.get_attribute('[data-testid=ed-grain]', 'aria-checked') == 'true')
    shot(pg, '06_editor_grain'); no_hscroll(pg, '粒子タブ')
    pg.click('[data-testid=tab-date]')
    if pg.get_attribute('[data-testid=ed-date]', 'aria-checked') != 'true':
        pg.click('[data-testid=ed-date]')
    pg.fill('[data-testid=date-input]', '1999-07-21')
    pg.click('[data-style=film]')
    pg.wait_for_timeout(300)
    ok('日付を変えると「撮った日に戻す」が出る', pg.locator('text=撮った日に戻す').count() == 1)
    shot(pg, '07_editor_date'); no_hscroll(pg, '日付タブ')
    with pg.expect_download() as dl:
        pg.click('[data-testid=save]')
    path2 = os.path.join(OUT, 'shot_library.jpg')
    dl.value.save_as(path2)
    fmt, size = jpeg_info(path2)
    src_size = Image.open(SAMPLE).size
    ok('選んだ写真は原寸のまま保存される', size == src_size, f'{size} / 元 {src_size}')
    ok('元の写真は書き換えない', open(SAMPLE, 'rb').read() == before)
    pg.click('[data-testid=saved-edit]')
    pg.click('[data-testid=tab-look]')
    pg.click('[data-testid=adj-reset]')
    ok('リセットで強さ100%に戻る', '100%' in pg.inner_text('.slider'))

    # 6) 完全版の味 → 保存しようとすると課金画面
    pg.click('[data-look=instant]')
    label = pg.inner_text('[data-testid=save]')
    if MODE == 'dist':
        ok('完全版の味は「保存(完全版)」になる', '完全版' in label, label)
        pg.click('[data-testid=save]')
        pg.wait_for_selector('[data-testid=paywall]')
        buy = pg.inner_text('[data-testid=buy]')
        ok('課金画面に行く', True)
        ok('キーが無い製品ビルドでは「購入は準備中」と出て押せない', '準備中' in buy and pg.is_disabled('[data-testid=buy]'), buy)
        shot(pg, '08_paywall'); shot(pg, '08_paywall_full', full=True); no_hscroll(pg, '完全版')
        pg.click('[data-testid=paywall-close]')
        pg.wait_for_selector('[data-testid=editor-canvas]')
        ok('課金画面を閉じると加工画面に戻る(写真はそのまま)', True)
    else:
        pg.click('[data-testid=save]')
        pg.wait_for_selector('[data-testid=paywall]')
        shot(pg, '08_paywall'); shot(pg, '08_paywall_full', full=True)
        pg.click('[data-testid=buy]')
        pg.wait_for_selector('[data-testid=editor-canvas]')
        ok('疑似購入で完全版になり、加工画面へ戻る', '完全版' not in pg.inner_text('[data-testid=save]'))
        with pg.expect_download() as dl:
            pg.click('[data-testid=save]')
        path3 = os.path.join(OUT, 'shot_instant.jpg')
        dl.value.save_as(path3)
        fmt, size = jpeg_info(path3)
        ok('インスタントは白枠つき(下が厚い)で保存される', size[0] > src_size[0] and size[1] > src_size[1], f'{size}')
        shot(pg, '04b_saved_premium')
        pg.click('[data-testid=saved-edit]')

    # 7) 設定 → プライバシー → 使い方ガイド
    pg.click('[data-testid=editor-back]')
    pg.click('[data-testid=open-settings]')
    pg.wait_for_selector('[data-testid=settings]')
    pg.click('.stamp-styles >> text=デジカメ')
    shot(pg, '09_settings'); shot(pg, '09_settings_full', full=True); no_hscroll(pg, '設定')
    pg.click('[data-testid=open-privacy]')
    pg.wait_for_selector('[data-testid=privacy]')
    no_hscroll(pg, 'プライバシー'); shot(pg, '10_privacy'); shot(pg, '10_privacy_full', full=True)
    pg.click('[data-testid=privacy-close]')
    pg.click('[data-testid=open-guide]')
    pg.wait_for_selector('[data-testid=onboarding]')
    ok('設定から使い方ガイドを開ける', True)
    pg.click('[data-testid=onb-skip]')
    pg.wait_for_selector('[data-testid=settings]')
    pg.click('[data-testid=settings-close]')
    pg.wait_for_selector('[data-testid=viewfinder]')

    # 8) 開き直しても設定が残る・案内は2回目は出ない
    pg.reload()
    pg.wait_for_selector('[data-testid=viewfinder]')
    ok('2回目は案内が出ない', pg.locator('[data-testid=onboarding]').count() == 0)
    sel = pg.get_attribute('.look.on', 'data-look')
    ok('開き直しても最後の味が残る', sel == 'instant', sel)
    ok('console error 0', len(errors) == 0, '; '.join(errors[:3]))
    b.close()

    # 9) カメラが使えないとき(許可なし)
    b2 = p.chromium.launch(args=gl)
    c2 = b2.new_context(viewport={'width': W, 'height': H}, device_scale_factor=3)
    pg2 = c2.new_page()
    pg2.add_init_script("localStorage.setItem('CapacitorStorage.negairo.guideSeen.v1', '1')")
    pg2.goto(URL)
    pg2.wait_for_selector('[data-testid=camera-error]', timeout=20000)
    ok('カメラが使えないときは絵と「写真を選んで加工する」が出る', pg2.locator('[data-testid=camera-error] button').count() == 1)
    pg2.wait_for_function("() => [...document.images].every(i => i.complete)")
    shot(pg2, '11_camera_error'); no_hscroll(pg2, 'カメラなし')
    pg2.set_input_files('[data-testid=file-input]', SAMPLE)
    pg2.wait_for_selector('[data-testid=editor-canvas]')
    ok('カメラが無くても写真を選んで加工できる', True)
    b2.close()

ng = [r for r in results if not r[1]]
print(f'\n{len(results) - len(ng)}/{len(results)} OK  ({MODE} {W}x{H})')
sys.exit(1 if ng else 0)
