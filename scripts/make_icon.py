# アイコン(1024)と、Android の mipmap・起動画面、iOS の AppIcon・起動画面を作る。素材は全部ここで描く。
# python scripts/make_icon.py
import os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(APP, 'store')
os.makedirs(STORE, exist_ok=True)
S = 4096  # 4倍で描いて縮める


def leak_gradient(w, h):
    """フィルムの1コマ: 深い青緑の上に、左上から赤〜橙〜黄の光もれ"""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = x / w, y / h
    base = np.stack([0.10 + 0.05 * v, 0.20 + 0.06 * v, 0.24 + 0.04 * v], -1)
    d = np.sqrt((u * 0.9) ** 2 + (v * 1.1) ** 2)
    inten = np.exp(-d / 0.62)
    hot = np.array([1.0, 0.86, 0.55]); mid = np.array([1.0, 0.42, 0.1]); low = np.array([0.72, 0.08, 0.05])
    t = np.clip((inten - 0.08) / 0.45, 0, 1)[..., None]
    col = low * (1 - t) + mid * t
    t2 = np.clip((inten - 0.55) / 0.4, 0, 1)[..., None]
    col = col * (1 - t2) + hot * t2
    a = np.clip(inten * 1.25, 0, 1)[..., None]
    out = 1 - (1 - base) * (1 - col * a)
    # 右下に小さな太陽(にじみ)
    ds = np.sqrt((u - 0.7) ** 2 + (v - 0.62) ** 2)
    sun = np.exp(-(ds / 0.07) ** 2)[..., None] * np.array([1.0, 0.93, 0.8]) + np.exp(-(ds / 0.2) ** 2)[..., None] * np.array([0.9, 0.3, 0.12]) * 0.55
    out = 1 - (1 - out) * (1 - np.clip(sun, 0, 1))
    rng = np.random.default_rng(7)
    out += (rng.standard_normal((h, w, 1)) * 0.025)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def draw_icon(size=S, transparent_bg=False, scale=1.0):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0) if transparent_bg else (27, 21, 18, 255))
    d = ImageDraw.Draw(img)
    c = size / 2
    fw, fh = size * 0.74 * scale, size * 0.74 * scale  # フィルムの帯
    x0, y0 = c - fw / 2, c - fh / 2
    d.rounded_rectangle([x0, y0, x0 + fw, y0 + fh], radius=size * 0.05 * scale, fill=(14, 11, 9, 255))
    # 穴(上下に5つずつ)
    hw, hh = fw * 0.085, fh * 0.07
    for i in range(5):
        hx = x0 + fw * (0.1 + i * 0.2) - hw / 2
        for hy in (y0 + fh * 0.045, y0 + fh - fh * 0.045 - hh):
            d.rounded_rectangle([hx, hy, hx + hw, hy + hh], radius=hw * 0.25, fill=(232, 222, 205, 255))
    # 1コマ
    pw, ph = fw * 0.86, fh * 0.62
    px, py = c - pw / 2, c - ph / 2
    frame = leak_gradient(int(pw), int(ph)).convert('RGBA')
    mask = Image.new('L', frame.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, frame.size[0] - 1, frame.size[1] - 1], radius=size * 0.02 * scale, fill=255)
    img.paste(frame, (int(px), int(py)), mask)
    return img


def save_sizes():
    big = draw_icon()
    icon = big.resize((1024, 1024), Image.LANCZOS).convert('RGB')
    icon.save(os.path.join(STORE, 'icon_1024.png'))
    icon.resize((512, 512), Image.LANCZOS).save(os.path.join(STORE, 'play', 'icon_512.png'))
    # iOS
    ios = os.path.join(APP, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
    if os.path.exists(os.path.dirname(ios)):
        icon.save(ios)
    # Android(従来アイコンと丸アイコン、アダプティブの前景)
    dens = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    fg_big = draw_icon(transparent_bg=True, scale=0.66)
    res = os.path.join(APP, 'android/app/src/main/res')
    for k, px in dens.items():
        dd = os.path.join(res, f'mipmap-{k}')
        if not os.path.isdir(dd):
            continue
        sq = big.resize((px, px), Image.LANCZOS)
        sq.save(os.path.join(dd, 'ic_launcher.png'))
        m = Image.new('L', (px * 4, px * 4), 0)
        ImageDraw.Draw(m).ellipse([0, 0, px * 4 - 1, px * 4 - 1], fill=255)
        rnd = Image.new('RGBA', (px, px), (0, 0, 0, 0))
        rnd.paste(sq, (0, 0), m.resize((px, px), Image.LANCZOS))
        rnd.save(os.path.join(dd, 'ic_launcher_round.png'))
        fpx = int(px * 108 / 48)
        fg_big.resize((fpx, fpx), Image.LANCZOS).save(os.path.join(dd, 'ic_launcher_foreground.png'))
    bg = os.path.join(res, 'values/ic_launcher_background.xml')
    if os.path.exists(bg):
        open(bg, 'w', encoding='utf-8').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1B1512</color>\n</resources>\n')
    # 起動画面: 暗い地に小さなアイコン(Capacitor の既定の絵を置き換える)
    small = big.resize((360, 360), Image.LANCZOS)
    for p in glob.glob(os.path.join(res, 'drawable*', 'splash.png')):
        w, h = Image.open(p).size
        sp = Image.new('RGB', (w, h), (20, 17, 15))
        k = min(w, h) * 0.28 / 360
        ic = small.resize((max(1, int(360 * k)), max(1, int(360 * k))), Image.LANCZOS)
        sp.paste(ic, ((w - ic.size[0]) // 2, (h - ic.size[1]) // 2), ic)
        sp.save(p)
    for p in glob.glob(os.path.join(APP, 'ios/App/App/Assets.xcassets/Splash.imageset/*.png')):
        w, h = Image.open(p).size
        sp = Image.new('RGB', (w, h), (20, 17, 15))
        ic = small.resize((int(w * 0.18), int(w * 0.18)), Image.LANCZOS)
        sp.paste(ic, ((w - ic.size[0]) // 2, (h - ic.size[1]) // 2), ic)
        sp.save(p)
    # 確認用: 大小を並べる
    board = Image.new('RGB', (1024 + 512 + 192 + 96 + 80, 1060), (60, 60, 60))
    x = 10
    for sz in (1024, 512, 192, 96):
        board.paste(icon.resize((sz, sz), Image.LANCZOS), (x, 10)); x += sz + 20
    board.save(os.path.join(APP, 'research', 'icon_preview.png'))
    print('ok')


if __name__ == '__main__':
    os.makedirs(os.path.join(STORE, 'play'), exist_ok=True)
    save_sizes()
