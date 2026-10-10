# アイコン(2026-10-10 から): 見本の絵 store/icon_source_1024.png(夕景が映る黒いカメラのレンズと縦書き「ネガイロ」)から、
# ストア用・iOS AppIcon・Android(従来・丸・適応アイコンの前景と背景)・起動画面を作る。前の版は store/_old_2026-10-10/ に退避。
# python scripts/make_icon.py
import os, glob
from PIL import Image, ImageDraw

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(APP, 'store')
SRC = Image.open(os.path.join(STORE, 'icon_source_1024.png')).convert('RGB')
LENS = (555, 455)      # 見本の絵でのレンズの中心
LENS_R = 340           # レンズ(外側の金属の輪)の半径
BG = (24, 21, 19)      # 適応アイコンの背景(カメラの黒い胴になじむ色)
FULL_ZOOM = 1.08        # 角の丸い縁を外して、四角いっぱいに胴が来るように少し寄る
ADAPT_SCALE = 0.9     # 適応アイコン: 108dp の画面に対する絵の大きさ(レンズを中央へ寄せる)


def small_png(img, path):
    """アプリに入れる PNG は 256 色にして軽くする(AAB を 10MB 未満に保つ)"""
    img.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)


def full_bleed(size):
    """四角いっぱいの絵(角の丸めは OS・ストアがする)"""
    W = SRC.width
    z = FULL_ZOOM
    cx, cy = W / 2 - 4, W / 2 - 22
    half = W / 2 / z
    return SRC.crop((int(cx - half), int(cy - half), int(cx + half), int(cy + half))).resize((size, size), Image.LANCZOS)


def adaptive_fg(size, transparent=True):
    """適応アイコンの前景(108dp 相当の正方形)。レンズを中心に置く"""
    s = size * ADAPT_SCALE / SRC.width
    art = SRC.resize((round(SRC.width * s), round(SRC.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0) if transparent else BG + (255,))
    x = round(size / 2 - LENS[0] * s)
    y = round(size / 2 - LENS[1] * s)
    canvas.paste(art, (x, y))
    return canvas


def save_sizes():
    icon = full_bleed(1024)
    icon.save(os.path.join(STORE, 'icon_1024.png'))
    icon.resize((512, 512), Image.LANCZOS).save(os.path.join(STORE, 'play', 'icon_512.png'))
    ios = os.path.join(APP, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
    if os.path.exists(os.path.dirname(ios)):
        icon.save(ios)  # RGB(不透明)
    res = os.path.join(APP, 'android/app/src/main/res')
    dens = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for k, px in dens.items():
        dd = os.path.join(res, f'mipmap-{k}')
        if not os.path.isdir(dd):
            continue
        # 従来の四角いアイコン(角は少し丸める)
        sq = full_bleed(px * 4)
        m = Image.new('L', sq.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, sq.width - 1, sq.height - 1], radius=int(sq.width * 0.18), fill=255)
        out = Image.new('RGBA', sq.size, (0, 0, 0, 0)); out.paste(sq, (0, 0), m)
        small_png(out.resize((px, px), Image.LANCZOS), os.path.join(dd, 'ic_launcher.png'))
        # 丸いアイコン: 適応アイコンを丸で切った物(見える 72dp の範囲)
        fg = adaptive_fg(px * 4 * 108 // 72, transparent=False)
        c = (fg.width - px * 4) // 2
        vis = fg.crop((c, c, c + px * 4, c + px * 4))
        m = Image.new('L', vis.size, 0); ImageDraw.Draw(m).ellipse([0, 0, vis.width - 1, vis.height - 1], fill=255)
        rnd = Image.new('RGBA', vis.size, (0, 0, 0, 0)); rnd.paste(vis, (0, 0), m)
        small_png(rnd.resize((px, px), Image.LANCZOS), os.path.join(dd, 'ic_launcher_round.png'))
        fpx = int(px * 108 / 48)
        small_png(adaptive_fg(fpx * 2).resize((fpx, fpx), Image.LANCZOS), os.path.join(dd, 'ic_launcher_foreground.png'))
    bg = os.path.join(res, 'values/ic_launcher_background.xml')
    if os.path.exists(bg):
        open(bg, 'w', encoding='utf-8').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % BG)
    # 起動画面: 暗い地に角丸のアイコン
    small = full_bleed(720)
    m = Image.new('L', small.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 719, 719], radius=150, fill=255)
    small_rgba = Image.new('RGBA', small.size, (0, 0, 0, 0)); small_rgba.paste(small, (0, 0), m)
    for p in glob.glob(os.path.join(res, 'drawable*', 'splash.png')):
        w, h = Image.open(p).size
        sp = Image.new('RGB', (w, h), (14, 11, 9))
        k = max(1, int(min(w, h) * 0.3))
        ic = small_rgba.resize((k, k), Image.LANCZOS)
        sp.paste(ic, ((w - k) // 2, (h - k) // 2), ic)
        small_png(sp, p)
    for p in glob.glob(os.path.join(APP, 'ios/App/App/Assets.xcassets/Splash.imageset/*.png')):
        w, h = Image.open(p).size
        sp = Image.new('RGB', (w, h), (14, 11, 9))
        k = int(w * 0.18)
        ic = small_rgba.resize((k, k), Image.LANCZOS)
        sp.paste(ic, ((w - k) // 2, (h - k) // 2), ic)
        sp.save(p)
    # アプリの中で出すアイコン(設定の「アプリについて」・起動中の表示)
    full_bleed(192).save(os.path.join(APP, 'src', 'assets', 'icon_192.png'), optimize=True)
    print('ok')


def mask_check(path):
    """適応アイコンを 丸・角丸・しずく・四角 で切って、安全域(66dp の円)を線で描いた確認画像"""
    S = 432  # 108dp = 432px
    fg = adaptive_fg(S, transparent=False)
    vis_c = (S - S * 72 // 108) // 2
    tiles = []
    full = fg.copy(); d = ImageDraw.Draw(full)
    r66 = S * 66 / 108 / 2
    d.rectangle([vis_c, vis_c, S - vis_c, S - vis_c], outline=(80, 200, 255), width=2)
    d.ellipse([S / 2 - r66, S / 2 - r66, S / 2 + r66, S / 2 + r66], outline=(255, 60, 60), width=2)
    tiles.append(full)
    vis = fg.crop((vis_c, vis_c, S - vis_c, S - vis_c))
    V = vis.width
    shapes = {
        'circle': lambda dr: dr.ellipse([0, 0, V - 1, V - 1], fill=255),
        'squircle': lambda dr: dr.rounded_rectangle([0, 0, V - 1, V - 1], radius=int(V * 0.32), fill=255),
        'rounded': lambda dr: dr.rounded_rectangle([0, 0, V - 1, V - 1], radius=int(V * 0.12), fill=255),
        'teardrop': lambda dr: (dr.ellipse([0, 0, V - 1, V - 1], fill=255), dr.rectangle([V // 2, V // 2, V - 1, V - 1], fill=255)),
    }
    for fn in shapes.values():
        m = Image.new('L', (V, V), 0); fn(ImageDraw.Draw(m))
        t = Image.new('RGB', (V, V), (235, 235, 235)); t.paste(vis, (0, 0), m)
        tiles.append(t)
    W = sum(t.width for t in tiles) + 20 * (len(tiles) + 1)
    board = Image.new('RGB', (W, S + 40), (235, 235, 235))
    x = 20
    for t in tiles:
        board.paste(t, (x, 20)); x += t.width + 20
    board.save(path)


if __name__ == '__main__':
    os.makedirs(os.path.join(STORE, 'play'), exist_ok=True)
    save_sizes()
    mask_check(os.path.join(APP, 'docs', 'icon_adaptive_check.png'))
