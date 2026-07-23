"""
Bot for the Chrome Dinosaur game (fan remake).

Game: https://dinosaurgame-free.io/
  - Press space to start; the T-Rex auto-runs and speeds up over time.
  - Jump (space/up) over cactuses; duck (down) under high-flying pterodactyls.
  - Hit anything = game over. Higher distance = higher score.

How this bot works (pixel vision, no game-internals access):
  The game's engine is locked inside a closure, so we can't read obstacle objects
  directly. Instead the bot reads the CANVAS PIXELS ~60x/second from inside the page:
    1. Scan a rectangle in front of the dino for dark obstacle pixels
       (cactuses/birds are dark #535353; clouds are light and ignored by color;
        the ground-texture dashes are excluded by staying above y=122).
    2. Find the nearest obstacle: its distance, width, and whether it's grounded
       (reaches the ground = cactus/low bird) or floating high (= bird).
    3. Estimate the game speed from how fast obstacles move (px/millisecond) and
       compute time-to-impact. All timing is in wall-clock ms so it's stable.
    4. Decide:
         - grounded obstacle or low/mid bird -> JUMP (the jump apex clears them)
         - high-flying bird -> DUCK (jumping would hit it)
  The brain runs entirely in-page (via one injected loop) and presses keys with
  synthetic events, so there's zero Python<->browser latency in the control loop.

  (Note: this clone has a fixed-height jump and no reliably-usable short hop, and
  mid-air "fast-fall" to recover quicker proved too fragile to time safely -- it
  clips the cactus you just cleared -- so every jump is a full jump. See git log
  if you want to revisit that. What matters for the contest is BEST score, and a
  full-jump run banks 300-500+ over enough attempts.)

Run it:
  cd /Users/bryce/aurp/scripts/bots
  .venv/bin/python bryce/dino.py                 # watch it play 5 attempts, keep the best
  .venv/bin/python bryce/dino.py --attempts 10
  .venv/bin/python bryce/dino.py --headless      # no window, same behavior

Each attempt uses a fresh browser session (the site rate-limits rapid repeat games in
one session, which broke score reporting). Scores still post to the leaderboard.
"""

import argparse
import time

from playwright.sync_api import sync_playwright

URL = "https://dinosaurgame-free.io/"

# ---- The in-page "brain". Runs every animation frame. See module docstring. ----
CONTROLLER = r"""
(cfg) => {
  const c = document.querySelector('canvas.runner-canvas') || document.querySelector('canvas');
  const ctx = c.getContext('2d');
  const fire = (type, code) => {                       // synthetic key with a real keyCode
    const e = new KeyboardEvent(type, {bubbles:true, cancelable:true});
    Object.defineProperty(e,'keyCode',{get:()=>code});
    Object.defineProperty(e,'which',{get:()=>code});
    document.dispatchEvent(e);
  };
  const JUMP = 32, DUCK = 40;
  const S = { alive:true, jumps:0, ducks:0, pxSpeed:0.36, pxMeas:0.36,
    xPrev:null, tPrev:null, sameX:0, jumpDown:false, jumpAt:-1e9,
    downHeld:false, lastBird:-1e9, night:false };
  window.__bot = S;
  const X0=cfg.scanX0, Y0=cfg.scanY0, W=cfg.scanW, H=cfg.scanH;
  const idxR=(x,y)=>((y-Y0)*W+(x-X0))*4;               // red-channel index into the rect

  function loop(){
    if(!S.alive) return;
    const now = performance.now();
    const img = ctx.getImageData(X0,Y0,W,H).data;

    // Night mode fills the whole canvas dark -> most pixels opaque. Day bg is transparent.
    let litN=0, tot=0;
    for(let i=3;i<img.length;i+=68){ tot++; if(img[i]>0) litN++; }
    S.night = litN > tot*0.5;
    const isObs = (i)=> img[i+3]>0 && (S.night ? img[i]>150 : img[i]<150);

    // Dino top (topmost row in its x-band with >=4 dark px). Standing ~95, airborne lower.
    let dinoTop=999;
    for(let y=Y0;y<126 && dinoTop===999;y++){
      let n=0; for(let x=cfg.dinoX0;x<cfg.dinoX1;x++) if(isObs(idxR(x,y))) n++;
      if(n>=4) dinoTop=y;
    }
    const onGround = dinoTop>=cfg.onGroundY || dinoTop===999;

    // Nearest obstacle ahead + its vertical extent and contiguous width.
    let nearX=null;
    for(let x=cfg.obsX0;x<X0+W;x++){
      let hit=false;
      for(let y=cfg.obsYTop;y<=cfg.obsYBot;y++) if(isObs(idxR(x,y))){hit=true;break;}
      if(hit){nearX=x;break;}
    }
    let nearest=null;
    if(nearX!==null){
      let top=999,bot=-1,rightX=nearX;
      for(let x=nearX;x<Math.min(X0+W,nearX+90);x++){
        let colHit=false;
        for(let y=cfg.obsYTop;y<=cfg.obsYBot;y++) if(isObs(idxR(x,y))){colHit=true; if(y<top)top=y; if(y>bot)bot=y;}
        if(colHit) rightX=x; else if(x-rightX>12) break;   // gap -> end of this cluster
      }
      nearest={x:nearX, top, bot, width:rightX-nearX, grounded:bot>=cfg.groundedY, dist:nearX-cfg.dinoRight};
    }

    // Speed (px/ms) from nearest movement. Reject outliers, smooth heavily, clamp.
    // Crash = an obstacle whose x is frozen for several frames.
    if(nearest && S.xPrev!==null){
      const dx=S.xPrev-nearest.x, dt=now-S.tPrev;
      if(dx===0) S.sameX++; else S.sameX=0;
      if(dx>0 && dx<70 && dt>0){ const ps=dx/dt; if(ps>0.32 && ps<0.82) S.pxMeas=S.pxMeas*0.9+ps*0.1; }
    } else S.sameX=0;
    if(S.sameX>=cfg.freezeFrames){ S.alive=false; return; }
    S.xPrev = nearest?nearest.x:null; S.tPrev=now;
    S.pxSpeed = Math.max(0.34, Math.min(0.80, S.pxMeas));

    // Decide. Full jump clears cacti + low/mid birds; a HIGH bird must be ducked (jumping hits it).
    const ttiMs = nearest ? nearest.dist / Math.max(0.05,S.pxSpeed) : 1e9;
    const highBird = nearest && !nearest.grounded && nearest.bot < cfg.duckBelow;

    // JUMP (short hold -> full height but lands sooner)
    if(nearest && !highBird && ttiMs<=cfg.jumpLeadMs && onGround && !S.jumpDown && now-S.jumpAt>cfg.jumpCdMs){
      fire('keydown',JUMP); S.jumpDown=true; S.jumpAt=now; S.jumps++;
    }
    if(S.jumpDown && now-S.jumpAt>=cfg.jumpHoldMs){ fire('keyup',JUMP); S.jumpDown=false; }

    // DUCK a HIGH bird (jumping would hit it). Hold the duck through the bird's pass.
    if(highBird && ttiMs<=cfg.duckLeadMs){ if(now-S.lastBird>500) S.ducks++; S.lastBird=now; }
    const wantDown = (now - S.lastBird < cfg.duckHoldMs);
    if(wantDown && !S.downHeld){ fire('keydown',DUCK); S.downHeld=true; }
    else if(!wantDown && S.downHeld){ fire('keyup',DUCK); S.downHeld=false; }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return 'installed';
}
"""

# Timing constants (ms), found by measuring the jump arc + sweeping. Geometry fields are
# filled in per-session by calibrate() -- the dino box and ground line render at different
# pixel positions depending on window size / headed vs headless, so we MUST measure them live.
BASE_CFG = dict(
    scanX0=2, scanY0=44, scanW=470, scanH=90,
    dinoX0=8, dinoX1=46, dinoRight=48, obsX0=68,
    obsYTop=44, obsYBot=126, groundedY=120, onGroundY=92, duckBelow=92,
    jumpLeadMs=200, duckLeadMs=150, jumpHoldMs=100, jumpCdMs=50, duckHoldMs=350,
    freezeFrames=12,
)

# Measure the dino's bounding box and the ground line from a clear running frame.
CALIBRATE_JS = r"""
() => {
  const c=document.querySelector('canvas.runner-canvas')||document.querySelector('canvas');
  const ctx=c.getContext('2d'); const W=c.width,H=c.height;
  const d=ctx.getImageData(0,0,W,H).data;
  const dark=(x,y)=>{const i=(y*W+x)*4; return d[i+3]>0 && d[i]<150;};
  let xmin=999,xmax=-1,ymin=999,ymax=-1;                 // dino lives in the left region
  for(let x=0;x<150;x++) for(let y=40;y<126;y++) if(dark(x,y)){
    if(x<xmin)xmin=x; if(x>xmax)xmax=x; if(y<ymin)ymin=y; if(y>ymax)ymax=y; }
  let bestY=-1,bestN=8;                                   // ground line = the fullest dark row
  for(let y=108;y<148;y++){ let n=0; for(let x=200;x<W-60;x+=2) if(dark(x,y)) n++; if(n>bestN){bestN=n;bestY=y;} }
  return {W,H, xmin,xmax,ymin,ymax, groundY:bestY, ok:(xmax>0 && bestY>100)};
}
"""


def calibrate(page):
    """Measure real geometry this session and return a cfg the controller can trust."""
    m = None
    for _ in range(12):
        m = page.evaluate(CALIBRATE_JS)
        if m["ok"] and m["xmax"] > 10:
            break
        page.wait_for_timeout(120)
    cfg = dict(BASE_CFG)
    if m and m["ok"]:
        W, H, gy, dxmax, dymin, dxmin = m["W"], m["H"], m["groundY"], m["xmax"], m["ymin"], m["xmin"]
        cfg.update(
            scanX0=2, scanY0=44, scanH=min(H - 44, gy - 44 + 3), scanW=min(W - 4, 470),
            dinoX0=max(4, dxmin + 1), dinoX1=max(dxmin + 6, dxmax - 1), dinoRight=dxmax,
            obsX0=dxmax + 22,             # clear the (wider) ducking dino so it can't self-trigger
            obsYTop=44, obsYBot=gy - 5, groundedY=gy - 11, onGroundY=dymin - 3, duckBelow=dymin - 3,
        )
    return cfg

MODAL_VISIBLE = """() => { const el=document.getElementById('score-modal');
  if(!el) return false; const s=getComputedStyle(el); return s.display!=='none' && el.offsetHeight>0; }"""


def read_score(page):
    """After game over, read the score from the site's game-over modal (polls up to 4s)."""
    for _ in range(40):
        v = page.evaluate("() => { const e=document.getElementById('modal-score'); return e?e.textContent.trim():null; }")
        if v and v.isdigit() and int(v) > 0:
            return int(v)
        page.wait_for_timeout(100)
    return 0


def play_once(page, max_seconds=600):
    """Play one game to game-over. Returns (score, jumps, ducks)."""
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2500)
    page.keyboard.press("Space")   # start running
    page.wait_for_timeout(800)     # let the dino run clear (first obstacle is ~3s in)
    cfg = calibrate(page)          # measure this session's real pixel geometry
    page.evaluate(CONTROLLER, cfg)
    t0 = time.time()
    while time.time() - t0 < max_seconds:
        st = page.evaluate("() => window.__bot && {alive:__bot.alive, jumps:__bot.jumps, ducks:__bot.ducks}")
        if st and not st["alive"]:
            break
        if page.evaluate(MODAL_VISIBLE):
            page.evaluate("() => { if(window.__bot) window.__bot.alive=false; }")
            break
        time.sleep(0.05)
    alive_s = time.time() - t0
    page.wait_for_timeout(400)
    score = read_score(page)
    st = page.evaluate("() => window.__bot ? {jumps:__bot.jumps, ducks:__bot.ducks} : {jumps:0,ducks:0}")
    return score, st["jumps"], st["ducks"], alive_s


def main():
    parser = argparse.ArgumentParser(description="Chrome Dinosaur game bot")
    parser.add_argument("--attempts", type=int, default=8, help="how many games to play (keeps the best)")
    parser.add_argument("--headless", action="store_true", help="hide the browser window")
    args = parser.parse_args()

    best = 0
    # Chrome throttles requestAnimationFrame in unfocused/background windows, which would
    # starve the control loop. These flags keep it running full-speed even in the background.
    launch_args = [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
    ]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless, args=launch_args)
        for i in range(1, args.attempts + 1):
            ctx = browser.new_context(viewport={"width": 1400, "height": 800})  # fresh session
            page = ctx.new_page()
            score, jumps, ducks, alive_s = play_once(page)
            best = max(best, score)
            star = "  <-- new best!" if score >= best and score > 0 else ""
            print(f"Attempt {i:>2}: score {score:>5}  ({alive_s:4.0f}s, jumps {jumps}, ducks {ducks}){star}")
            page.wait_for_timeout(600)
            ctx.close()
        browser.close()

    print(f"\nBest score across {args.attempts} attempts: {best}")


if __name__ == "__main__":
    main()
