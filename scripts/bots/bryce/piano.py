"""
Bot for the Piano Tiles game.

Game: https://www.primarygames.com/arcade/music/pianotiles/
  - Four columns. Black tiles fall from the top; tap each one before it reaches
    the bottom. A tile that hits the bottom untapped turns RED -> game over.
  - The game speeds up the longer you survive.

How this bot wins:
  Piano Tiles here is a Construct 2 WebGL <canvas>, so there are no DOM tiles to
  click -- the tiles are just pixels. Two tricks make it trivial anyway:

  1. We force the WebGL context to keep its drawing buffer (preserveDrawingBuffer)
     with an init script, so the page can snapshot its OWN canvas via drawImage +
     getImageData. Reading the canvas that way costs ~2ms; a Playwright screenshot
     round-trip costs ~55ms. That 25x gap is the whole ballgame.

  2. The entire detect-and-tap loop runs INSIDE the page on requestAnimationFrame
     (like our reaction-time bot). Every frame it scans the 4 columns for a fresh
     black tile (brightness ~0; already-tapped tiles fade to grey ~90 and are
     ignored) and dispatches a synthetic tap the instant one appears -- near the
     top of the screen, long before it could fall. Because tiles are cleared as
     fast as they spawn, none ever reaches the bottom: the bot basically can't die.
     It just keeps scoring until you stop it. (Observed: 120s / ~1100 tiles and
     climbing, no game over.)

  Python only handles the one-time launch (the "Play Now!" splash + the START
  button, which sits behind an ad-reload and needs a *real* trusted click) and
  then watches the score tick up. All the fast stuff happens in the browser.

Run it:
  cd /Users/bryce/aurp/scripts/bots
  .venv/bin/python bryce/piano.py                 # watch it play for 60s
  .venv/bin/python bryce/piano.py --time 180       # play for 3 minutes
  .venv/bin/python bryce/piano.py --target 500     # stop after clearing 500 tiles
  .venv/bin/python bryce/piano.py --headless       # no visible window
"""

import argparse
import io
import time

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

URL = "https://www.primarygames.com/arcade/music/pianotiles/"

# Runs before any page script. Forces every WebGL context to preserve its drawing
# buffer so we can drawImage() the game canvas onto our own and read the pixels.
PRESERVE_BUFFER_JS = """
(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type && /webgl/i.test(type)) {
      attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
    }
    return orig.call(this, type, attrs);
  };
})();
"""

# The whole game loop, installed once and left running on requestAnimationFrame.
# Each frame: snapshot canvas -> for each of 4 columns find the lowest run of
# near-black pixels (a fresh tile) -> synth-tap it. Also flips window.__gameover
# when a red "you missed it" tile is resting at the bottom.
GAME_LOOP_JS = """
() => {
  const c = document.getElementById('c2canvas');
  const off = document.createElement('canvas');
  off.width = c.width; off.height = c.height;
  const octx = off.getContext('2d');
  const W = c.width, H = c.height, NC = 4, colW = W / NC;

  window.__taps = 0;
  window.__run = true;
  window.__gameover = false;
  const lastY = [-999, -999, -999, -999];

  // Fire the full menagerie of pointer/mouse/touch events C2 might be listening
  // for, at a canvas-relative point. clientX/Y must account for CSS scaling
  // (internal buffer is 720x1280, displayed smaller).
  function tap(px, py) {
    const r = c.getBoundingClientRect();
    const clientX = r.left + px * (r.width / W);
    const clientY = r.top + py * (r.height / H);
    const base = { bubbles: true, cancelable: true, clientX, clientY };
    c.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerId: 1, pointerType: 'touch', isPrimary: true }));
    c.dispatchEvent(new MouseEvent('mousedown', { ...base, button: 0 }));
    try {
      const t = new Touch({ identifier: 1, target: c, clientX, clientY });
      c.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
      c.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t] }));
    } catch (e) { /* Touch ctor not everywhere; mouse/pointer already fired */ }
    c.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerId: 1, pointerType: 'touch', isPrimary: true }));
    c.dispatchEvent(new MouseEvent('mouseup', { ...base, button: 0 }));
    c.dispatchEvent(new MouseEvent('click', { ...base, button: 0 }));
    window.__taps++;
  }

  function frame() {
    if (!window.__run) return;
    try { octx.drawImage(c, 0, 0); }
    catch (e) { requestAnimationFrame(frame); return; }
    const d = octx.getImageData(0, 0, W, H).data;

    // game over? a red tile ( ~ (255,0,0) ) parked along the bottom band
    let redHits = 0, redSamples = 0;
    for (let y = Math.floor(H * 0.85); y < H; y += 8) {
      for (let x = 0; x < W; x += 12) {
        const i = (y * W + x) * 4;
        redSamples++;
        if (d[i] > 150 && d[i + 1] < 80 && d[i + 2] < 80) redHits++;
      }
    }
    if (redSamples && redHits / redSamples > 0.15) { window.__gameover = true; }

    // one tap per column: the lowest fresh-black tile (grey = already tapped)
    for (let ci = 0; ci < NC; ci++) {
      const xc = Math.floor((ci + 0.5) * colW);
      let found = -1, run = 0;
      for (let y = H - 1; y >= 0; y--) {
        const i = (y * W + xc) * 4;
        const b = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (b < 45) { run++; if (run >= 25) { found = y + Math.floor(run / 2); break; } }
        else run = 0;
      }
      if (found >= 0 && Math.abs(found - lastY[ci]) > 40) {
        tap(xc, found);
        lastY[ci] = found;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { W, H };
}
"""


def game_frame(page):
    """The cross-origin iframe that actually hosts the Construct 2 game."""
    for f in page.frames:
        if "PianoTiles" in f.url:
            return f
    return None


def grab(page, box):
    """Screenshot just the game canvas as an RGB numpy array (launch phase only)."""
    png = page.screenshot(clip=box)
    return np.asarray(Image.open(io.BytesIO(png)).convert("RGB"))


def _center_is_white(img):
    """Fraction of near-white pixels in the middle -> the big white START button."""
    h, w, _ = img.shape
    r = img[int(h * 0.44):int(h * 0.58), int(w * 0.40):int(w * 0.60)]
    return (r.min(axis=2) > 200).mean()


def _lower_all_dark(img):
    """Fraction of near-black pixels low on screen -> the black 'loading' screen."""
    h, w, _ = img.shape
    r = img[int(h * 0.60):int(h * 0.95)]
    return (r.max(axis=2) < 40).mean()


def launch(page):
    """Get from a fresh page all the way into live gameplay. Returns the canvas box.

    Flow: dismiss the 'Play Now!' splash -> click START. The first START triggers
    an ad-reload back to the START screen, so we keep clicking START (a *real*
    trusted mouse click -- synthetic ones don't satisfy the ad gate) until neither
    the START button nor the loading screen is showing, i.e. tiles are falling.
    """
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    page.locator("text=Play Now!").first.click()

    gf = None
    for _ in range(30):
        page.wait_for_timeout(1000)
        gf = game_frame(page)
        if gf and gf.evaluate("() => !!document.getElementById('c2canvas')"):
            break
    if not gf:
        raise RuntimeError("game frame never loaded")
    page.wait_for_timeout(1500)

    box = gf.locator("#c2canvas").bounding_box()
    w, h = box["width"], box["height"]

    for _ in range(25):
        img = grab(page, box)
        if _center_is_white(img) > 0.3:          # START screen -> click START
            page.mouse.click(box["x"] + w * 0.5, box["y"] + h * 0.51)
            page.wait_for_timeout(900)
        elif _lower_all_dark(img) > 0.7:          # ad / loading -> wait it out
            page.wait_for_timeout(500)
        else:                                     # tiles falling -> we're in
            return gf, box
    raise RuntimeError("could not get the game to start")


def main():
    parser = argparse.ArgumentParser(description="Piano Tiles game bot")
    parser.add_argument("--time", type=float, default=60.0,
                        help="max seconds to play (default: 60)")
    parser.add_argument("--target", type=int, default=None,
                        help="stop once this many tiles have been cleared")
    parser.add_argument("--headless", action="store_true",
                        help="hide the browser window")
    args = parser.parse_args()

    print(f"Loading game: {URL}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.add_init_script(PRESERVE_BUFFER_JS)

        gf, box = launch(page)
        gf.evaluate(GAME_LOOP_JS)
        print("In game -- bot is playing. Tiles cleared:")

        start = time.time()
        taps = 0
        while True:
            time.sleep(1.0)
            taps = gf.evaluate("() => window.__taps") or 0
            over = gf.evaluate("() => window.__gameover")
            elapsed = time.time() - start
            print(f"  {elapsed:5.0f}s   {taps} tiles")
            if over:
                print("  -> game over (a tile got past the bot)")
                break
            if args.target is not None and taps >= args.target:
                print(f"  -> reached target of {args.target}")
                break
            if elapsed >= args.time:
                print(f"  -> stopping after {args.time:.0f}s")
                break

        gf.evaluate("() => { window.__run = false; }")
        print(f"\n--- Result ---\nTiles cleared (score): {taps}")
        browser.close()


if __name__ == "__main__":
    main()
