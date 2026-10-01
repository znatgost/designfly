#!/usr/bin/env python3
"""Render favicons, the Apple touch icon, PWA icons and the social preview image.

  python3 -m http.server 8080 &
  python3 tools/make_icons.py        # icons/*.png, favicon.ico, icons/og-image.png
"""
import base64, os, io
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
svg = open(os.path.join(ROOT, 'icons/icon.svg')).read()
uri = 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode()).decode()
shot = base64.b64encode(open(os.path.join(ROOT, 'docs/screenshot.png'), 'rb').read()).decode()

with sync_playwright() as p:
    b = p.chromium.launch()
    for size, name in [(16, 'favicon-16.png'), (32, 'favicon-32.png'), (48, 'favicon-48.png'), (180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
        pg = b.new_page(viewport={'width': size, 'height': size})
        # the Apple icon is square (iOS rounds it); the others keep the rounded square
        bg = '#171412' if name == 'apple-touch-icon.png' else 'transparent'
        pg.set_content(f'<html><body style="margin:0;background:{bg}"><img src="{uri}" style="width:{size}px;height:{size}px;display:block"></body></html>')
        pg.screenshot(path=os.path.join(ROOT, 'icons', name), omit_background=bg == 'transparent')
        pg.close()
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.goto('http://localhost:8080/fonts/fonts.css')
    css = pg.content()
    pg.set_content(f'''<html><head><link rel="stylesheet" href="http://localhost:8080/fonts/fonts.css"></head>
<body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 78% 40%,#3a2418,#0e0c0b 62%);font-family:'Space Grotesk';color:#f1ece6;overflow:hidden;position:relative">
  <img src="data:image/png;base64,{shot}" style="position:absolute;left:470px;top:70px;width:820px;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.6);transform:rotate(-2deg)">
  <div style="position:absolute;left:64px;top:96px;width:430px">
    <img src="{uri}" style="width:96px;height:96px">
    <div style="font-weight:700;font-size:74px;letter-spacing:.01em;margin-top:22px">DESIGNFLY</div>
    <div style="font-size:30px;line-height:1.25;color:#e8ddd2;margin-top:10px">an AI fruit fly<br>who designs</div>
    <div style="font-family:'Caveat';font-size:34px;color:#ffd166;margin-top:30px;line-height:1.15">logos · identities · posters<br>floor plans · fashion · UI</div>
  </div>
</body></html>''')
    pg.wait_for_timeout(800)
    pg.screenshot(path=os.path.join(ROOT, 'icons/og-image.png'))
    b.close()

ims = [Image.open(os.path.join(ROOT, 'icons', f)).convert('RGBA') for f in ('favicon-16.png', 'favicon-32.png', 'favicon-48.png')]
ims[2].save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ims[:2])
for f in ('favicon-48.png',): os.remove(os.path.join(ROOT, 'icons', f))
print('icons ok')
