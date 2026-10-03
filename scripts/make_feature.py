# Play のフィーチャーグラフィック 1024x500(開発サーバーの lab.html で見本写真に効果をかける)
import base64, io
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(); pg.goto('http://localhost:5181/lab.html'); pg.wait_for_function('window.labReady===true')
    d = pg.evaluate("([u,l,o])=>window.renderLook(u,l,o)", ['/samples/portrait.jpg', 'sutekame', {'leak': True, 'date': False, 'outLong': 1400}])
    b.close()
im = Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGB')
W, H = 1024, 500
bg = Image.new('RGB', (W, H), (20, 17, 15))
ph = im.resize((int(H * im.width / im.height), H), Image.LANCZOS).crop((0, 0, 600, H))
bg.paste(ph, (0, 0))
g = Image.new('L', (140, H))
for x in range(140): ImageDraw.Draw(g).line([(x, 0), (x, H)], fill=int(255 * x / 139))
bg.paste(Image.new('RGB', (140, H), (20, 17, 15)), (460, 0), g)
dr = ImageDraw.Draw(bg)
f1 = ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc', 74); f2 = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 27)
dr.text((620, 150), 'ネガイロ', font=f1, fill=(255, 179, 107))
dr.text((624, 265), 'フィルム風・昔のカメラ風', font=f2, fill=(243, 236, 226))
dr.text((624, 310), '広告なし・買い切り', font=f2, fill=(243, 236, 226))
bg.save('store/play/feature_1024x500.png')
print(bg.size)
