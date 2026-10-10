"""見本(ChatGPT に作らせた UI 参考画像。持ち主が「切り出してそのまま使ってよい」と指示)から、
飾りの絵だけを切り出して src/assets/art/ に置く。文字が焼き込まれている所は消して、文字はアプリ側で描く。
python scripts/make_art.py  (見本は Downloads/negairo_ref_*.png)"""
import os
import cv2
import numpy as np
from PIL import Image, ImageFilter

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(os.path.expanduser('~'), 'Downloads', 'negairo_ref_{}_941x1672.png')
OUT = os.path.join(APP, 'src', 'assets', 'art')
os.makedirs(OUT, exist_ok=True)


def crop(n, box):
    return np.asarray(Image.open(REF.format(n)).convert('RGB').crop(box)).copy()


def erase(a, boxes, thr=170):
    """箱の中の明るい文字(白〜クリーム)を消す。箱は切り出し後の座標"""
    m = np.zeros(a.shape[:2], np.uint8)
    for (x0, y0, x1, y1, *t) in boxes:
        sub = a[y0:y1, x0:x1].astype(int)
        th = t[0] if t else thr
        # 文字は白〜クリーム(青も明るい)。夕焼けの空は青が暗いので、青の明るさで見分ける
        m[y0:y1, x0:x1] = np.where((sub[..., 2] > th) & (sub.mean(2) > th + 10), 255, 0)
    m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=3)
    return cv2.inpaint(a, m, 4, cv2.INPAINT_TELEA)


def erase_all(a, boxes):
    """箱の中をまるごと埋める(手の絵・札など)"""
    m = np.zeros(a.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in boxes:
        m[y0:y1, x0:x1] = 255
    return cv2.inpaint(a, m, 6, cv2.INPAINT_TELEA)


def save(a, name, scale=2.6, q=80):
    im = Image.fromarray(a).resize((int(a.shape[1] * scale), int(a.shape[0] * scale)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    # 拡大でのっぺりしないよう、ごく弱い粒子を足す(フィルムの質感に合わせる)
    arr = np.asarray(im).astype(np.float32)
    arr += np.random.default_rng(3).normal(0, 3.0, arr.shape[:2])[..., None]
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=q, optimize=True, progressive=True)
    print(name, im.size)


# 完全版の画面の上の夕景(見本6・左)。手書きの文と ✕ を消す
a = crop(6, (22, 438, 308, 722))
a = erase(a, [(8, 0, 40, 26, 150), (10, 24, 205, 135, 150)])
a = erase_all(a, [(204, 94, 226, 114)])
save(a, 'paywall_sunset.jpg')

# プライバシーの絵(見本8・右、窓辺の猫)。文を消す
a = crop(8, (642, 482, 918, 736))
a = erase(a, [(10, 30, 180, 105, 160)])
save(a, 'privacy_cat.jpg')

# カメラが使えないときの絵(見本8・中央、窓辺のカメラ)
a = crop(8, (342, 482, 604, 812))
save(a, 'empty_camera.jpg')

# はじめての案内 1(見本7・左、夕方の路地の写真)
a = crop(7, (56, 622, 268, 850))
a = erase_all(a, [(118, 192, 212, 228)])  # 焼き込みの日付(アプリ側で重ねる)
save(a, 'onb_street.jpg')

# はじめての案内 2(見本2・左、撮影画面の映像)
a = crop(2, (22, 470, 304, 934))
save(a, 'onb_cafe.jpg')

# はじめての案内 3(見本4・中央、加工前と加工後)。札と手の絵を消す(アプリ側で描く)
a = crop(4, (338, 501, 600, 946))
a = erase_all(a, [(4, 4, 90, 44), (176, 0, 262, 44)])
a = erase(a, [(115, 300, 262, 392, 140)])
save(a, 'onb_compare.jpg')
