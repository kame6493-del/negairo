# Play のフィーチャーグラフィック 1024x500(2026-10-10 作り直し。前の版は store/_old_2026-10-10/play/)。
# 黒と夕焼けの橙の地(夕焼けの写真をぼかして沈めた物・2026-10-10 クリーム色の紙から変更)に、アイコン・題字・一言と、
# 見本から切り出したポラロイド風の写真2枚。値段と「無料」は入れない。前の版は store/_cream_backup_2026-10-10/play/。
# python scripts/make_feature.py
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from make_screenshots import dusk, sprockets, LOGO, HAND, TITLE, ORANGE

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(APP, 'src', 'assets', 'art')
W, H = 1024, 500
bg = dusk(W, H, glow_y=0.55, dark_top=0.86, dark_bot=0.5, blur=6)
# 左は黒く沈めて文字を読みやすく、右に夕焼けを残す
_sh = Image.new('L', (W, H), 0)
for _x in range(W):
    ImageDraw.Draw(_sh).line([(_x, 0), (_x, H)], fill=max(0, int(200 - _x * 200 / 640)))
bg.paste(Image.new('RGB', (W, H), (10, 8, 8)), (0, 0), _sh)
sprockets(bg, 12, 18)
sprockets(bg, H - 30, 18)
bg = bg.convert('RGBA')


def polaroid(src, w, angle, date=None):
    im = Image.open(os.path.join(ART, src)).convert('RGB')
    s = min(im.width, im.height)
    im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width - s) // 2 + s, (im.height - s) // 2 + s)).resize((w, w), Image.LANCZOS)
    pad, bottom = int(w * 0.06), int(w * 0.2)
    card = Image.new('RGB', (w + pad * 2, w + pad + bottom), (255, 253, 248))
    card.paste(im, (pad, pad))
    if date:
        d = ImageDraw.Draw(card)
        f = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', int(w * 0.085))
        tw = d.textlength(date, font=f)
        glow = Image.new('RGBA', card.size, (0, 0, 0, 0))
        ImageDraw.Draw(glow).text((pad + w - tw - 12, pad + w - int(w * 0.13)), date, font=f, fill=(255, 100, 30, 200))
        card.paste(glow.filter(ImageFilter.GaussianBlur(4)), (0, 0), glow.filter(ImageFilter.GaussianBlur(4)))
        d.text((pad + w - tw - 12, pad + w - int(w * 0.13)), date, font=f, fill=(255, 150, 70))
    card = card.convert('RGBA').rotate(angle, resample=Image.BICUBIC, expand=True)
    return card


def drop(img, pos):
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sh.putalpha(img.getchannel('A').point(lambda a: 70 if a else 0))
    sh = Image.composite(Image.new('RGBA', img.size, (0, 0, 0, 255)), Image.new('RGBA', img.size, (0, 0, 0, 0)), sh.getchannel('A'))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    bg.alpha_composite(sh, (pos[0] + 6, pos[1] + 12))
    bg.alpha_composite(img, pos)


drop(polaroid('paywall_sunset.jpg', 196, 5), (806, 62))
drop(polaroid('onb_street.jpg', 190, -6, "'26 10 10"), (662, 168))

icon = Image.open(os.path.join(APP, 'store', 'icon_1024.png')).convert('RGB').resize((176, 176), Image.LANCZOS)
m = Image.new('L', icon.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 175, 175], radius=40, fill=255)
ic = Image.new('RGBA', icon.size, (0, 0, 0, 0)); ic.paste(icon, (0, 0), m)
sh = Image.new('RGBA', (196, 196), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([10, 14, 186, 190], radius=40, fill=(80, 50, 30, 110))
bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)), (46, 64))
bg.alpha_composite(ic, (56, 64))

d = ImageDraw.Draw(bg)
d.text((256, 70), 'ネガイロ', font=ImageFont.truetype(TITLE, 84), fill=(255, 255, 255))
d.text((262, 196), 'あの日の、あの色を、いまの毎日に。', font=ImageFont.truetype(TITLE, 22), fill=(236, 226, 214))
d.line([(262, 244), (318, 244)], fill=ORANGE, width=3)
fh = ImageFont.truetype(HAND, 30)
d.text((60, 300), 'フィルムカメラ風・日付入り', font=fh, fill=ORANGE)
d.text((60, 352), '光もれ・粒子・効果の強さ。', font=ImageFont.truetype(HAND, 24), fill=(232, 222, 210))
d.text((60, 392), '加工は端末の中だけ。元の写真は書き換えません。', font=ImageFont.truetype(HAND, 22), fill=(232, 222, 210))
bg.convert('RGB').save(os.path.join(APP, 'store', 'play', 'feature_1024x500.png'))
print('ok')
