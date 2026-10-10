# App Store(iPhone 6.9インチ枠 1290x2796)の画面写真を作る。見た目は Play 用(make_screenshots.py)と同じ
# 夕焼けを黒に沈めた地・游明朝の題字・Klee One の一言。値段と「無料」は写さない(完全版の疑似購入で撮る。購入画面は撮らない)。
# iPhone の縦長に合わせて 390x844 で撮り直す。保存後のシートは iOS で実際に出る文言「写真に保存しました」にする
# (ブラウザでは「画像を書き出しました」になるため)。Android だけの物(アルバム名など)は写さない。
# 開発サーバー(npx vite --port 5181)を開いた状態で: python scripts/make_ios_screenshots.py
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_screenshots as M

OUT = os.path.join(M.APP, 'store', 'ios')
VW, VH = 390, 844


def capture(pw):
    import json
    cam = os.path.join(M.APP, 'scripts', 'e2e_out', 'fake_cam.y4m')
    b = pw.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={cam}',
                                 '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    out = {}
    for name, screen, look, sample, extra, *_ in M.SHOTS:
        ctx = b.new_context(viewport={'width': VW, 'height': VH}, device_scale_factor=3, accept_downloads=True)
        ctx.grant_permissions(['camera'])
        pg = ctx.new_page()
        pg.add_init_script(f"""localStorage.setItem('CapacitorStorage.negairo.settings.v1', {json.dumps(M.settings(look, extra))});
          localStorage.setItem('CapacitorStorage.negairo.guideSeen.v1', '1');
          localStorage.setItem('negairo.mockFull', '1');""")
        pg.goto(M.URL)
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
            pg.set_input_files('[data-testid=file-input]', os.path.join(M.APP, 'samples', sample))
            pg.wait_for_function("() => document.querySelector('[data-testid=editor-canvas]')?.width > 100")
            if screen == 'date':
                pg.click('[data-testid=tab-date]')
            if screen == 'saved':
                with pg.expect_download():
                    pg.click('[data-testid=save]')
                pg.wait_for_function("() => { const i = document.querySelector('.sheet-img'); return i && i.complete && i.naturalWidth > 0; }")
                n = pg.evaluate("""() => { let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                  while (w.nextNode()) { const t = w.currentNode; if (t.nodeValue.includes('画像を書き出しました')) { t.nodeValue = t.nodeValue.replace('画像を書き出しました', '写真に保存しました'); n++; } } return n; }""")
                assert n == 1, n
        pg.wait_for_timeout(500)
        body = pg.inner_text('body')
        for bad in ('¥', '円', '無料', 'アルバム', 'Android', 'Google'):
            assert bad not in body, (name, bad)
        p = os.path.join(M.RAW, f'ios_{name}.png')
        pg.screenshot(path=p)
        out[name] = p
        ctx.close()
    b.close()
    return out


def compose(raw, W, H, title, sub, path):
    k = W / 1080
    bg = M.dusk(W, H)
    M.sprockets(bg, int(30 * k), int(34 * k))
    d = ImageDraw.Draw(bg)
    ft = ImageFont.truetype(M.TITLE, int(W * 0.066))
    fh = ImageFont.truetype(M.HAND, int(W * 0.040))
    tw = d.textlength(title, font=ft)
    d.text(((W - tw) / 2, 130 * k), title, font=ft, fill=(255, 255, 255))
    d.line([(W / 2 - 40 * k, 250 * k), (W / 2 + 40 * k, 250 * k)], fill=M.ORANGE, width=max(3, int(3 * k)))
    sw = d.textlength(sub, font=fh)
    d.text(((W - sw) / 2, 276 * k), sub, font=fh, fill=M.ORANGE)
    im = Image.open(raw).convert('RGB')
    top = int(390 * k)
    ph = H - top - int(70 * k)
    s = ph / im.height
    im = im.resize((int(im.width * s), ph), Image.LANCZOS)
    x = (W - im.width) // 2
    bz = int(16 * k)
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle([x - bz + 10, top - bz + 24, x + im.width + bz + 10, top + ph + bz + 24], radius=int(80 * k), fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    bg.paste(Image.new('RGB', (W, H), (0, 0, 0)), (0, 0), sh)
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle([x - bz, top - bz, x + im.width + bz, top + ph + bz], radius=int(78 * k), fill=(20, 17, 15), outline=(86, 70, 60), width=3)
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=int(62 * k), fill=255)
    bg.paste(im, (x, top), m)
    bg.save(path)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    if '--compose-only' in sys.argv:
        raws = {n: os.path.join(M.RAW, f'ios_{n}.png') for n, *_ in M.SHOTS}
    else:
        with sync_playwright() as pw:
            raws = capture(pw)
    for name, *_rest, title, sub in M.SHOTS:
        compose(raws[name], 1290, 2796, title, sub, os.path.join(OUT, f'ios_69_{name}.png'))
    print('ok')
