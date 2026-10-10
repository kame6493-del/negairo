# 見本(ChatGPT の UI 参考画像)と、作り直した実際の画面(E2E の画面写真)を並べた比較画像を docs/ に作る。
# 先に E2E を流しておく: python scripts/e2e.py http://localhost:5182/ dist 375 812 / dev 375 812
# python scripts/make_compare.py
import os
from PIL import Image, ImageDraw, ImageFont

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(os.path.expanduser('~'), 'Downloads', 'negairo_ref_{}_941x1672.png')
E2E = os.path.join(APP, 'scripts', 'e2e_out')
DOCS = os.path.join(APP, 'docs')
os.makedirs(DOCS, exist_ok=True)
FB = ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc', 30)
FS = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 22)

# 見本のスマホ1台の範囲(左・中・右)
PH = {
    2: [(12, 382, 316, 1192), (328, 382, 614, 1192), (628, 382, 934, 1192)],
    3: [(10, 380, 332, 1246), (344, 380, 640, 1246), (652, 380, 934, 1246)],
    4: [(12, 386, 316, 1192), (327, 386, 618, 1192), (632, 386, 934, 1192)],
    5: [(12, 382, 316, 1214), (327, 382, 614, 1214), (628, 382, 934, 1214)],
    6: [(12, 382, 316, 1190), (327, 382, 614, 1190), (628, 382, 934, 1190)],
    7: [(10, 404, 316, 1226), (325, 404, 620, 1256), (628, 404, 934, 1256)],
    8: [(10, 386, 316, 1244), (325, 386, 618, 1244), (628, 386, 934, 1244)],
}

# (番号, 名前, 見本(図, 何台目), 実際の画面, 説明)
PAIRS = [
    ('01', '撮影画面', (2, 0), 'dist_375/01_camera.png', '上の帯・効果の写真つき帯・橙のシャッターを見本どおりに。フラッシュは無い機能なので出さず、日付と光もれの切り替えに。'),
    ('02', 'フィルター調整', (2, 1), 'dist_375/03_editor.png', '保存は橙の丸ボタン。調整は今ある「効果の強さ」だけ(粒子・光もれは あり/なし の機能なのでタブの切り替えに)。'),
    ('03', '日付スタンプ', (2, 2), 'dist_375/07_editor_date.png', 'スタイル3形と日付の変更は今ある機能。表示位置・サイズ・不透明度は無い機能なので出さない。'),
    ('04', '効果一覧', (3, 0), 'dist_375/02_looks.png', 'すべて/無料/完全版のタブと3列のカード。見本の写真は本物の効果を CC0 の写真にかけた物。'),
    ('05', 'プレビューで比較', (3, 1), 'dist_375/03b_editor_hold.png', '左右に分ける比較は無い機能。今ある「長押しで元の写真」を札つきで見せる。'),
    ('06', '加工(タブ)', (4, 1), 'dist_375/05_editor_leak.png', '下のタブは 効果/光もれ/粒子/日付(切り抜き・回転は無い機能なので外した)。'),
    ('07', '保存した後', (4, 2), 'dist_375/04_saved.png', '「元の写真はそのまま」と無料版の名前入りの説明。共有は無い機能なので出さない。'),
    ('08', '完全版', (6, 0), 'dist_375/08_paywall.png', '夕景と手書きの一文は見本から。無料版の欄に「広告あり」は書かない(実際どちらも広告なし)。'),
    ('09', '完全版(下)', (6, 2), 'dist_375/08_paywall_full.png', '6つの特長と購入・復元。値段はストアの値段をそのまま出す(製品ビルドのブラウザでは準備中)。'),
    ('10', '案内1', (7, 0), 'dist_375/00a_onboarding1.png', '題字・ポラロイド・手書きの一文を見本どおりに。'),
    ('11', '案内2', (7, 1), 'dist_375/00b_onboarding2.png', '見本の撮影画面の写真に紙の札。ありもしない効果名(ノスタル等)は写さない。'),
    ('12', '案内3', (7, 2), 'dist_375/00c_onboarding3.png', '加工前と加工後の写真に、長押し比較と保存の札。'),
    ('13', '設定', (8, 0), 'dist_375/09_settings.png', '日付スタンプの既定・完全版・使い方ガイド・プライバシー・版。位置・サイズ・アルバムの切り替えは無い機能。'),
    ('14', '空の状態', (8, 1), 'dist_375/11_camera_error.png', '写真の一覧は無いので、カメラが使えないときの表示にこの絵を使う。'),
    ('15', 'プライバシー', (8, 2), 'dist_375/10_privacy.png', '4つの項目と鍵の札。中身は実際の扱いどおり。'),
]
SKIPPED = [
    ((3, 2), 'お気に入り・最近使った効果', 'アプリに無い機能(最後に使った効果から始まる機能はある)'),
    ((4, 0), 'アプリ内の写真一覧', '写真は OS の写真選びで選ぶ。アプリ内アルバムは無い'),
    ((5, 0), '保存した写真の一覧', 'アプリ内アルバムは無い'),
    ((5, 1), '写真の詳細・再編集', '同上'),
    ((5, 2), '書き出し・共有', '共有・余白つき保存は無い(インスタントの白枠は効果としてある)'),
    ((6, 1), '機能の違いの表', '完全版画面の2つの欄(無料版/完全版)にまとめた'),
]
HH = 1100


def ref_img(n, k):
    return Image.open(REF.format(n)).convert('RGB').crop(PH[n][k])


def fit(im, h):
    return im.resize((int(im.width * h / im.height), h), Image.LANCZOS)


def wrap(d, text, font, width):
    lines, cur = [], ''
    for ch in text:
        if d.textlength(cur + ch, font=font) > width:
            lines.append(cur); cur = ch
        else:
            cur += ch
    return lines + ([cur] if cur else [])


def pair_image(no, name, ref, mine, note):
    a = fit(ref_img(*ref), HH)
    m = Image.open(os.path.join(E2E, mine)).convert('RGB')
    if m.height / m.width > 2.4:  # 縦に長いページは上から画面2枚ぶん
        m = m.crop((0, 0, m.width, int(m.width * 2.4)))
    b = fit(m, HH)
    W = a.width + b.width + 90
    head = 70
    tmp = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    lines = wrap(tmp, note, FS, W - 60)
    H = head + 44 + HH + 30 + len(lines) * 34 + 20
    im = Image.new('RGB', (W, H), (246, 239, 228))
    d = ImageDraw.Draw(im)
    d.text((30, 18), f'{no}  {name}', font=FB, fill=(59, 36, 23))
    d.text((30, head + 6), '見本', font=FS, fill=(140, 90, 60))
    d.text((a.width + 60, head + 6), '作り直した画面(375幅・実機と同じ描画)', font=FS, fill=(200, 90, 30))
    im.paste(a, (30, head + 44)); im.paste(b, (a.width + 60, head + 44))
    y = head + 44 + HH + 24
    for ln in lines:
        d.text((30, y), ln, font=FS, fill=(70, 50, 40)); y += 34
    return im


if __name__ == '__main__':
    tiles = []
    for no, name, ref, mine, note in PAIRS:
        im = pair_image(no, name, ref, mine, note)
        im.save(os.path.join(DOCS, f'compare_redesign_{no}.png'), optimize=True)
        tiles.append(im)
    # 作らなかった見本
    sk = []
    for ref, name, why in SKIPPED:
        a = fit(ref_img(*ref), 560)
        t = Image.new('RGB', (a.width + 20, 560 + 130), (246, 239, 228))
        t.paste(a, (10, 10))
        d = ImageDraw.Draw(t)
        y = 580
        for ln in wrap(d, name, FS, a.width):
            d.text((10, y), ln, font=FS, fill=(59, 36, 23)); y += 30
        for ln in wrap(d, why, ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 18), a.width):
            d.text((10, y), ln, font=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 18), fill=(150, 80, 40)); y += 24
        sk.append(t)
    skw = sum(t.width for t in sk) + 20 * len(sk) + 40
    skim = Image.new('RGB', (skw, 560 + 130 + 90), (236, 226, 210))
    ImageDraw.Draw(skim).text((30, 20), '見本にあるが作らなかった画面(アプリに無い機能なので見せない)', font=FB, fill=(59, 36, 23))
    x = 30
    for t in sk:
        skim.paste(t, (x, 80)); x += t.width + 20
    skim.save(os.path.join(DOCS, 'compare_redesign_16_skipped.png'), optimize=True)

    # 一覧: 3列に並べる(縮小)
    cols, sc = 3, 0.42
    small = [t.resize((int(t.width * sc), int(t.height * sc)), Image.LANCZOS) for t in tiles]
    cw = max(t.width for t in small)
    rows = [small[i:i + cols] for i in range(0, len(small), cols)]
    rh = [max(t.height for t in r) for r in rows]
    sks = skim.resize((int(skim.width * 0.5), int(skim.height * 0.5)), Image.LANCZOS)
    TW = max(cols * (cw + 20) + 20, sks.width + 40)
    TH = 90 + sum(h + 20 for h in rh) + sks.height + 40
    out = Image.new('RGB', (TW, TH), (230, 220, 204))
    ImageDraw.Draw(out).text((24, 22), 'ネガイロ 見た目の作り直し: 見本と実際の画面(2026-10-10)', font=FB, fill=(59, 36, 23))
    y = 90
    for r, h in zip(rows, rh):
        x = 20
        for t in r:
            out.paste(t, (x, y)); x += cw + 20
        y += h + 20
    out.paste(sks, (20, y))
    out.save(os.path.join(DOCS, 'compare_redesign_all.png'), optimize=True)
    print('ok', out.size)
