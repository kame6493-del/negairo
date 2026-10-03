# 1枚を原寸で描いて、全体の縮小と原寸の切り抜き(粒子・日付・光もれ)を並べる
# 使い方: python scripts/fx_detail.py <look> <sample> [leak=1] [date=1] [strength=1]
import base64, io, os, sys, json
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'research', 'compare')
look, sample = sys.argv[1], sys.argv[2]
opt = {}
for a in sys.argv[3:]:
    k, v = a.split('=')
    opt[k] = float(v) if k == 'strength' else v == '1'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page()
    pg.goto('http://localhost:5181/lab.html')
    pg.wait_for_function('window.labReady === true')
    data = pg.evaluate('([u,l,o]) => window.renderLook(u,l,o)', [f'/samples/{sample}', look, opt])
    b.close()
im = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')
W, H = im.size
small = im.copy(); small.thumbnail((900, 900), Image.LANCZOS)
# 右下(日付)と中央の原寸切り抜き
c1 = im.crop((W - 700, H - 450, W, H))
c2 = im.crop((W // 2 - 350, H // 2 - 225, W // 2 + 350, H // 2 + 225))
sheet = Image.new('RGB', (900 + 710, max(small.height, 910)), (20, 20, 20))
sheet.paste(small, (0, 0)); sheet.paste(c1, (910, 0)); sheet.paste(c2, (910, 460))
path = os.path.join(OUT, f'detail_{look}_{sample.split(".")[0]}.jpg')
sheet.save(path, quality=92)
print(path, (W, H))
