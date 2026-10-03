# 主な流れを押して回る E2E。偽のカメラ映像(Chromium の fake device)で撮影から保存、課金画面まで。
# 使い方:
#   製品ビルド: npm run build → npx vite preview --port 5182 → python scripts/e2e.py http://localhost:5182/ dist
#   開発(疑似購入あり): npx vite --port 5181 → python scripts/e2e.py http://localhost:5181/ dev
import os, sys, io
from PIL import Image
from playwright.sync_api import sync_playwright, expect

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5182/'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'dist'
OUT = os.path.join(APP, 'scripts', 'e2e_out', MODE)
os.makedirs(OUT, exist_ok=True)
SAMPLE = os.path.join(APP, 'samples', 'portrait.jpg')
results = []


def ok(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('OK  ' if cond else 'NG  ') + name + (f'  ({detail})' if detail else ''))


def jpeg_info(path):
    im = Image.open(path)
    return im.format, im.size


with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
                                '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, accept_downloads=True)
    ctx.grant_permissions(['camera'])
    pg = ctx.new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL)

    # 1) 撮影画面: カメラの映像に効果がかかって描かれる
    pg.wait_for_selector('[data-testid=viewfinder]')
    pg.wait_for_function("() => { const c = document.querySelector('[data-testid=viewfinder]'); return c && c.width >= 640; }", timeout=20000)
    w = pg.evaluate("document.querySelector('[data-testid=viewfinder]').width")
    mean = pg.evaluate("""() => { const c = document.querySelector('[data-testid=viewfinder]'); const t = document.createElement('canvas'); t.width = 64; t.height = 48;
      const x = t.getContext('2d'); x.drawImage(c, 0, 0, 64, 48); const d = x.getImageData(0, 0, 64, 48).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i+1] + d[i+2]; return s / (d.length / 4) / 3; }""")
    ok('撮影画面に効果つきの映像が出る(真っ黒でない)', w >= 640 and mean > 10, f'canvas {w}px 平均の明るさ {mean:.0f}')
    ok('カメラのエラーが出ない', pg.locator('[data-testid=camera-error]').count() == 0)
    pg.screenshot(path=os.path.join(OUT, '01_camera.png'))

    # 2) 味を選ぶ → 日付の切り替え
    pg.click('[data-look=sutekame]')
    expect(pg.locator('[data-testid=date-toggle]')).to_contain_text('あり')
    ok('ステカメは日付ありが既定', True)
    pg.click('[data-testid=date-toggle]')
    expect(pg.locator('[data-testid=date-toggle]')).to_contain_text('なし')
    pg.click('[data-testid=date-toggle]')
    ok('日付の切り替え', 'あり' in pg.inner_text('[data-testid=date-toggle]'))

    # 3) 撮る → 加工画面 → 保存(ブラウザではダウンロード)
    pg.click('[data-testid=shutter]')
    pg.wait_for_selector('[data-testid=editor-canvas]')
    pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]').width > 100")
    ok('撮ると加工画面に移る', True)
    with pg.expect_download() as dl:
        pg.click('[data-testid=save]')
    path = os.path.join(OUT, 'shot_camera.jpg')
    dl.value.save_as(path)
    fmt, size = jpeg_info(path)
    ok('撮った写真を JPEG で保存できる', fmt == 'JPEG' and size[0] > 100, f'{fmt} {size}')
    expect(pg.locator('[data-testid=toast]')).to_be_visible()
    pg.screenshot(path=os.path.join(OUT, '02_editor_camera.png'))
    pg.click('[data-testid=editor-back]')
    pg.wait_for_selector('[data-testid=viewfinder]')

    # 4) 写真を選ぶ → 強さ・光もれ・日付の指定 → 保存。元の写真は変わらない
    before = open(SAMPLE, 'rb').read()
    pg.set_input_files('[data-testid=file-input]', SAMPLE)
    pg.wait_for_selector('[data-testid=editor-canvas]')
    pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]').width > 100")
    pg.fill('[data-testid=strength]', '60')
    ok('強さを変えられる', '60%' in pg.inner_text('.slider'))
    pg.click('[data-testid=ed-leak]')
    pg.click('[data-testid=ed-reroll]')
    pg.fill('[data-testid=date-input]', '1999-07-21')
    pg.wait_for_timeout(300)
    with pg.expect_download() as dl:
        pg.click('[data-testid=save]')
    path2 = os.path.join(OUT, 'shot_library.jpg')
    dl.value.save_as(path2)
    fmt, size = jpeg_info(path2)
    src_size = Image.open(SAMPLE).size
    ok('選んだ写真は原寸のまま保存される', size == src_size, f'{size} / 元 {src_size}')
    ok('元の写真は書き換えない', open(SAMPLE, 'rb').read() == before)
    pg.screenshot(path=os.path.join(OUT, '03_editor_library.png'))

    # 5) 完全版の味 → 保存しようとすると課金画面
    pg.click('[data-look=instant]')
    premium = 'on' not in (pg.get_attribute('[data-look=instant] .lock', 'class') or 'on') and pg.locator('[data-look=instant] .lock').count() == 0
    label = pg.inner_text('[data-testid=save]')
    if MODE == 'dist':
        ok('完全版の味は「保存(完全版)」になる', '完全版' in label, label)
        pg.click('[data-testid=save]')
        pg.wait_for_selector('[data-testid=paywall]')
        buy = pg.inner_text('[data-testid=buy]')
        ok('課金画面に行く', True)
        ok('キーが無い製品ビルドでは「購入は準備中」と出て押せない', '準備中' in buy and pg.is_disabled('[data-testid=buy]'), buy)
        pg.screenshot(path=os.path.join(OUT, '04_paywall.png'), full_page=True)
        pg.click('[data-testid=paywall-close]')
        pg.wait_for_selector('[data-testid=editor-canvas]')
        ok('課金画面を閉じると加工画面に戻る(写真はそのまま)', True)
    else:
        pg.click('[data-testid=save]')
        pg.wait_for_selector('[data-testid=paywall]')
        pg.click('[data-testid=buy]')
        pg.wait_for_selector('[data-testid=editor-canvas]')
        ok('疑似購入で完全版になり、加工画面へ戻る', '完全版' not in pg.inner_text('[data-testid=save]'))
        with pg.expect_download() as dl:
            pg.click('[data-testid=save]')
        path3 = os.path.join(OUT, 'shot_instant.jpg')
        dl.value.save_as(path3)
        fmt, size = jpeg_info(path3)
        ok('インスタントは白枠つき(下が厚い)で保存される', size[0] > src_size[0] and size[1] > src_size[1], f'{size}')
        pg.screenshot(path=os.path.join(OUT, '04_editor_instant_premium.png'))

    # 6) 設定画面
    pg.click('[data-testid=editor-back]')
    pg.click('[data-testid=open-settings]')
    pg.wait_for_selector('[data-testid=settings]')
    pg.click('text=デジカメ')
    pg.screenshot(path=os.path.join(OUT, '05_settings.png'), full_page=True)
    pg.click('[data-testid=settings-close]')
    pg.wait_for_selector('[data-testid=viewfinder]')

    # 7) 開き直しても設定が残る
    pg.reload()
    pg.wait_for_selector('[data-testid=viewfinder]')
    sel = pg.get_attribute('.look.on', 'data-look')
    ok('開き直しても最後の味が残る', sel == 'instant', sel)

    ok('console error 0', len(errors) == 0, '; '.join(errors[:3]))
    b.close()

ng = [r for r in results if not r[1]]
print(f'\n{len(results) - len(ng)}/{len(results)} OK')
sys.exit(1 if ng else 0)
