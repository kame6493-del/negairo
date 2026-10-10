# 効果の一覧に出す見本(CC0 の samples/portrait.jpg に、本物の描画処理で各効果をかけた物)を src/assets/looks/ に作る。
# 開発サーバー(npx vite --port 5181)を開いた状態で: python scripts/make_look_thumbs.py
import base64, io, os
from PIL import Image
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, 'src', 'assets', 'looks')
os.makedirs(OUT, exist_ok=True)
IDS = ['natsuiro', 'sutekame', 'mono400', 'sukitoori', 'manatsu', 'yorunohikari', 'aseta', 'instant', 'heiseidigi', 'garake']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(); pg.goto('http://localhost:5181/lab.html'); pg.wait_for_function('window.labReady===true')
    for i in IDS:
        d = pg.evaluate("([u,l,o])=>window.renderLook(u,l,o)", ['/samples/portrait.jpg', i, {'date': False, 'outLong': 900}])
        im = Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGB')
        w, h = im.size
        s = min(w, h)
        # 枠つき(インスタント)は枠ごと見せる。ほかは中央を正方形に
        c = im.crop(((w - s) // 2 + int(s * 0.06), (h - s) // 2, (w - s) // 2 + int(s * 0.06) + s, (h - s) // 2 + s)).resize((300, 300), Image.LANCZOS)
        if i == 'instant':  # 白い枠(下が厚い)は保存時に重ねる物なので、ここでも同じ形に重ねる
            sq = Image.new('RGB', (300, 300), (244, 241, 234)); sq.paste(c.resize((236, 236), Image.LANCZOS), (32, 20)); c = sq
        c.save(os.path.join(OUT, f'{i}.jpg'), quality=82, optimize=True)
        print(i, im.size)
    b.close()
