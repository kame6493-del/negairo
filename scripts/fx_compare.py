# 見本写真に全効果をかけた比較画像を作る(開発サーバーの lab.html を Playwright で開いて、本物の描画処理を通す)
# 使い方: npx vite --port 5181 を起動してから python scripts/fx_compare.py [出力名] [look,look,...]
import base64, io, os, sys
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'research', 'compare')
os.makedirs(OUT, exist_ok=True)
URL = 'http://localhost:5181/lab.html'
SAMPLES = ['portrait.jpg', 'night_tower.jpg', 'cat_cafe.jpg', 'sunset_beach.jpg', 'tokyo_building.jpg', 'flowers.jpg']
LOOKS = ['original', 'natsuiro', 'sutekame', 'mono400', 'sukitoori', 'manatsu', 'yorunohikari', 'aseta', 'instant', 'heiseidigi', 'garake']
NAMES = {'original': '元の写真', 'natsuiro': 'ナツイロ', 'sutekame': 'ステカメ', 'mono400': 'モノクロ400', 'sukitoori': 'スキトオリ', 'manatsu': 'マナツ',
         'yorunohikari': 'ヨルノヒカリ', 'aseta': 'アセタ', 'instant': 'インスタント', 'heiseidigi': '平成デジカメ', 'garake': 'ガラケー'}
FONT = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 26)
CELL = 520

def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'all'
    looks = sys.argv[2].split(',') if len(sys.argv) > 2 else LOOKS
    samples = sys.argv[3].split(',') if len(sys.argv) > 3 else SAMPLES
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(URL)
        pg.wait_for_function('window.labReady === true')
        rows = []
        for s in samples:
            row = []
            for lk in looks:
                if lk == 'original':
                    im = Image.open(os.path.join(ROOT, 'samples', s)).convert('RGB')
                    im.thumbnail((CELL, CELL), Image.LANCZOS)
                else:
                    opt = {'outLong': CELL}
                    if lk == 'sutekame' and s == 'portrait.jpg':
                        opt['leak'] = True
                    data = pg.evaluate('([u,l,o]) => window.renderLook(u,l,o)', [f'/samples/{s}', lk, opt])
                    im = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')
                row.append(im)
            rows.append(row)
        b.close()
        if errs:
            print('console errors:', errs[:5])
    cols = len(looks)
    W = CELL * cols + 10 * (cols + 1)
    rh = [max(im.height for im in r) for r in rows]
    H = 50 + sum(rh) + 10 * (len(rows) + 1)
    sheet = Image.new('RGB', (W, H), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    for i, lk in enumerate(looks):
        d.text((10 + i * (CELL + 10), 10), NAMES.get(lk, lk), font=FONT, fill=(240, 235, 225))
    y = 50
    for r, h in zip(rows, rh):
        for i, im in enumerate(r):
            sheet.paste(im, (10 + i * (CELL + 10), y))
        y += h + 10
    path = os.path.join(OUT, f'{name}.jpg')
    sheet.save(path, quality=90)
    print(path, sheet.size)

if __name__ == '__main__':
    main()
