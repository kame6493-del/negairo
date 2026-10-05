"""録画用の自動操作(src/dev/reviewTour.ts)が最後まで進むかを手元のブラウザで確かめる。
シミュレーターと同じく「カメラが無い」状態で開く(偽のカメラ映像は使わない)。
先に録画用ビルドを作る: VITE_REVIEW_TOUR=1 npx vite build --outDir <一時フォルダ>
python scripts/check_review_tour.py <一時フォルダ> [録画の置き場所]
→ 通った画面の見出しを秒ごとに出し、購入画面に着いた秒数を出す。録画(webm)は指定した場所に残す(リポジトリには入れない)"""
import os
import socket
import sys
import time
from playwright.sync_api import sync_playwright

DIST = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get("TEMP", "/tmp"), "negairo_review_tour")
os.makedirs(OUT, exist_ok=True)

with socket.socket() as so:
    so.bind(("127.0.0.1", 0))
    PORT = so.getsockname()[1]
# Windows の http.server は .js を text/plain で返すことがあり、モジュールが読めない。型を決めて返す小さなサーバーにする
import functools, http.server, threading
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg"}
    def log_message(self, *a): pass
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(H, directory=DIST))
threading.Thread(target=httpd.serve_forever, daemon=True).start()
errors = []
reached = None
dst = ""
try:
    time.sleep(1.2)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ja-JP", accept_downloads=True,
                            record_video_dir=OUT, record_video_size={"width": 393, "height": 852})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(f"http://127.0.0.1:{PORT}/")
        seen = []
        t0 = time.time()
        while time.time() - t0 < 150:
            txt = pg.evaluate("document.body.innerText.slice(0,70).replace(/\\s+/g,' ')")
            if not seen or seen[-1] != txt:
                seen.append(txt)
                print(round(time.time() - t0), txt)
            if reached is None and pg.locator("[data-testid=paywall]").count():
                reached = round(time.time() - t0)
            if reached is not None and time.time() - t0 > reached + 20:
                break
            time.sleep(1)
        path = pg.video.path()
        ctx.close()
        b.close()
        dst = os.path.join(OUT, "review_tour_check.webm")
        os.replace(path, dst)
finally:
    httpd.shutdown()
print("errors:", errors)
print("paywall reached at", reached, "s / video", dst)
sys.exit(0 if reached else 1)
