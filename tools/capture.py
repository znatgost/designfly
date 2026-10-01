#!/usr/bin/env python3
"""Record deterministic media of DESIGNFLY (frame-by-frame, independent of machine speed).

  python3 -m http.server 8080 &              # from the repo root
  pip install playwright && playwright install chromium
  python3 tools/capture.py --what demo       # docs/demo.gif + docs/demo.mp4 (the fly draws a logo by hand, stroke by stroke)
  python3 tools/capture.py --what muse       # docs/muse.gif (the fly looks for inspiration)
  python3 tools/capture.py --what shot       # docs/screenshot.png
  python3 tools/capture.py --what gallery    # docs/gallery.png (a grid of generated designs)
"""
import argparse, os, shutil, subprocess, tempfile, json
from playwright.sync_api import sync_playwright

ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
GALLERY = [
    {'kind': 'logo', 'name': 'Blue Bean', 'industry': 'coffee', 'seed': 100, 'hand': {'layout': 'stack', 'fill': 'riso', 'skill': 0.3}},
    {'kind': 'drawing', 'subject': ['cat', 'moon'], 'seed': 7, 'hand': {'layout': 'scene', 'skill': 0.3}},
    {'kind': 'poster', 'name': 'Jazz Night', 'industry': 'music', 'date': '12 June', 'seed': 9, 'hand': {'layout': 'hero', 'skill': 0.3}},
    {'kind': 'logo', 'name': 'Swell', 'industry': 'surf', 'seed': 3, 'hand': {'layout': 'badge', 'skill': 0.4}},
    {'kind': 'identity', 'name': 'Swell', 'industry': 'surf', 'seed': 11},
    {'kind': 'logo', 'name': 'Blue Bean', 'industry': 'coffee', 'seed': 3, 'style': 'combination'},
    {'kind': 'poster', 'name': 'Form & Void', 'style': 'swiss', 'seed': 8},
    {'kind': 'floorplan', 'planType': 'apartment', 'bedrooms': 2, 'style': 'blueprint', 'seed': 2},
    {'kind': 'facade', 'style': 'scandinavian', 'seed': 2},
    {'kind': 'fashion', 'garment': 'dress', 'print': 'leaves', 'seed': 3},
    {'kind': 'product', 'product': 'bottle', 'name': 'Aqua', 'seed': 2},
    {'kind': 'ui', 'screen': 'landing', 'name': 'Nimbus', 'industry': 'ai', 'tagline': 'Think in clouds, ship in minutes', 'seed': 2},
    {'kind': 'palette', 'moods': ['ocean'], 'seed': 1},
    {'kind': 'moodboard', 'industry': 'interior', 'moods': ['japandi'], 'seed': 1},
    {'kind': 'typography', 'industry': 'fashion', 'seed': 1},
    {'kind': 'pattern', 'style': 'arcs', 'moods': ['retro'], 'seed': 9},
]


def encode(frames, fps, gif, width, mp4=None):
    pat = os.path.join(frames, 'f%04d.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', pat, '-vf',
                    f'scale={width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];'
                    '[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', gif], check=True)
    if mp4:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', pat, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', mp4], check=True)


def run(url, what, out):
    tmp = tempfile.mkdtemp()
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        vp = {'width': 1280, 'height': 800} if what != 'muse' else {'width': 1500, 'height': 900}
        pg = b.new_page(viewport=vp, device_scale_factor=1)
        pg.goto(url)
        pg.wait_for_selector('#loading.done', timeout=120000)
        pg.evaluate("localStorage.clear(); 1")
        pg.wait_for_timeout(800)
        pg.evaluate("designfly.manual(true); window._t = performance.now(); designfly.render(window._t, 0.001); 1")
        step = "(dt) => { const s = designfly.studio; window._t += dt; s._update(dt, window._t); s.draw(window._t, 0.0001); return s.mode; }"
        if what == 'gallery':
            pg.set_viewport_size({'width': 1600, 'height': 1000})
            html = pg.evaluate("""async (specs) => {
              const { generate } = await import('./src/design/index.js'); const { embedFonts } = await import('./src/export.js');
              const out = []; for (const s of specs) { const d = generate(s); out.push(await embedFonts(d.svg)); } return out; }""", GALLERY)
            page = '<html><body style="margin:0;background:#0e0c0b;columns:3;column-gap:14px;padding:14px">' + ''.join(
                f'<img style="width:100%;border-radius:10px;background:#fff;margin-bottom:14px;display:block;break-inside:avoid" src="data:image/svg+xml;base64,{__import__("base64").b64encode(s.encode()).decode()}">' for s in html) + '</body></html>'
            g = b.new_page(viewport={'width': 1500, 'height': 800})
            g.set_content(page); g.wait_for_timeout(1500)
            g.screenshot(path=out or 'docs/gallery.png', full_page=True)
            return
        if what == 'shot':
            pg.evaluate("() => { designfly.say('Brand identity for a surf school called Swell'); return 1; }")
            pg.wait_for_timeout(2500)
            for _ in range(330): pg.evaluate(step, 33) if _ % 30 == 29 else pg.evaluate("(dt) => { const s = designfly.studio; window._t += dt; s._update(dt, window._t); return 1; }", 33)
            pg.evaluate(step, 1)
            pg.screenshot(path=out or 'docs/screenshot.png')
            return
        if what == 'evolve':
            pg.evaluate("designfly.manual(false); 1")
            pg.fill('#input', 'Evolve a logo for Swell, a surf school'); pg.press('#input', 'Enter')
            pg.wait_for_selector('.evo .cell', timeout=60000); pg.wait_for_timeout(600)
            for k in range(2):
                pg.locator('.evo .cell').nth(k).click(position={'x': 18, 'y': 30})
            pg.locator('.evo .cell').nth(5).hover(); pg.locator('.evo .cell').nth(5).locator('.no').click()
            pg.locator('.evo .cell').nth(1).hover(); pg.wait_for_timeout(400)
            pg.screenshot(path=out or 'docs/evolve.png')
            return
        fps = 12
        if what == 'brain':
            pg.set_viewport_size({'width': 1280, 'height': 800})
            pg.evaluate("designfly.manual(false); designfly.setView('brain'); 1")
            pg.evaluate("async () => { const m = designfly.mind; await m.dream(3000); const s = await m.propose(8, 80); m.learn(s, new Set([s[0].id, s[2].id]), new Set([s[7].id])); return 1; }")
            pg.wait_for_timeout(1500)
            pg.evaluate("designfly.manual(true); window._bt = performance.now(); designfly.brain.fakeNow = window._bt; 1")
            n = int(9 * fps)
            for i in range(n):
                if i % 14 == 0:
                    pg.evaluate("() => { const m = designfly.mind; const s = m.best.length ? m.best[(Math.random() * m.best.length) | 0].genome : m.elites[0]?.genome; if (s) m.think(s); return 1; }")
                if i == 60:
                    pg.evaluate("() => { const m = designfly.mind; if (m.replay.length) m.train(10); else m.emit('learn', {}); return 1; }")
                pg.evaluate("(dt) => { window._bt += dt; designfly.brain.fakeNow = window._bt; designfly.brain.orbit.yaw = Math.sin(window._bt * 0.00035) * 0.7; designfly.brain.draw(window._bt); return 1; }", 1000 / fps)
                pg.locator('#studio').locator('xpath=..').screenshot(path=os.path.join(tmp, f'f{i:04d}.png'))
            b.close()
            encode(tmp, fps, out or 'docs/brain.gif', 720)
            shutil.rmtree(tmp)
            return
        if what == 'demo':
            pg.evaluate("localStorage.setItem('designfly.hand', JSON.stringify({ n: 6, w: { fill: { riso: 6 }, nib: { pen: 6 }, letter: { bold: 6 }, colour: { natural: 6 }, layout: { logo: { stack: 6 } } } })); designfly.taste.constructor && Object.assign(designfly.taste, new designfly.taste.constructor(localStorage)); 1")
            pg.fill('#input', 'Make a logo for a coffee shop called Blue Bean')
            pg.evaluate("() => { designfly.say(document.querySelector('#input').value); return 1; }")
            pg.wait_for_timeout(2500)
            n = int(24 * fps)
        else:
            pg.evaluate("() => { designfly.say('Inspire me'); return 1; }")
            pg.wait_for_timeout(800)
            n = int(15 * fps)
        for i in range(n):
            mode = pg.evaluate(step, 1000 / fps)
            if what == 'demo' and mode == 'idle' and i > 60: break
            if what == 'muse':
                pg.locator('#studio').screenshot(path=os.path.join(tmp, f'f{i:04d}.png'))
            else:
                pg.screenshot(path=os.path.join(tmp, f'f{i:04d}.png'))
        b.close()
    if what == 'demo': encode(tmp, fps, out or 'docs/demo.gif', 960, 'docs/demo.mp4')
    else: encode(tmp, fps, out or 'docs/muse.gif', 640)
    shutil.rmtree(tmp)


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--what', default='demo', choices=['demo', 'muse', 'shot', 'gallery', 'brain', 'evolve'])
    a.add_argument('--url', default='http://localhost:8080/')
    a.add_argument('--out')
    x = a.parse_args()
    run(x.url, x.what, x.out)
