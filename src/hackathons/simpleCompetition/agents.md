# Simple Competition

**Goal**: A "make something with a built-in challenge, then race to beat the score"
competition between Val and Bryce. Each person builds a game; you get N attempts to set a
bar, the opponent gets N+2 to beat it. Uses the shared CompetitionToggle (Val / Bryce,
iterations v1–v3). We only use v1 for now (ignore v2/v3 placeholders).

## Bryce v1 — APEX (fastest-lap racer)
- `BryceLapRacer.tsx` — the game. Rendered by `BryceSimpleCompetitionV1`.
- **Style**: Pole Position / OutRun pseudo-3D — curved road to a sunset horizon, sprite
  car, radial tach. Single self-contained canvas + rAF component; all state in one
  `useEffect`; fast HUD written to DOM via `data-el` refs; CSS scoped under `.lap`.
- **Feel (locked)**: *arcade + real shifting*, tuned faster-than-real and deliberately
  loose. Gears, RPM, torque curve, shift-light, redline fuel-cut. NO clutch / stalling.
  - **Corners throw you outward HARD** (`CENTRIFUGAL`): the car does NOT auto-follow the
    road — do nothing and you fly straight off. You must brake + steer for every corner.
  - **Slidey steering**: input eases into a lateral velocity (`steerVel`, `STEER_SLIDE`),
    so it feels loose, not on-rails.
  - **Off-road is dangerous** (`OFFROAD_MAX_KMH` 45, high `OFFROAD_DECEL`): leave the road
    and speed is ripped away to a crawl + the whole view judders.
  - **Trees** line the grass (deterministic, `treesBySeg`) and **~5 slow traffic cars**
    (`traffic`, `TUNING.TRAFFIC`) circulate. Traffic collides anywhere; **trees collide
    only when off-road** (drift out to the treeline and one nearly stops you). Both are
    billboards collected during road projection, drawn far→near (no true depth pass-by —
    close sprites shrink out at the bottom, a known limitation of the flat-road renderer).
  - **Speed** is arcade-crazy: taller gearing → ~200 mph top, `POS_K` 84 for the rush.
  - **Car sprite** banks into corners (`steerVel`) and slides toward the screen edge as you
    drift, so cornering reads as *you* sliding wide rather than the camera moving you.
- **One car** (`CAR` const, "MX-5 APEX" — arcade-fast, planted). No car picker.
- **Track is a closed circuit** — `buildTrack()` nets one full right-hand rotation so the
  minimap draws a proper loop (heading scale in `buildMapPath` auto-closes it).
- **Start screen**: retro-California / OutRun overlay (`.start-screen`) — sunset gradient,
  scanline sun, neon perspective grid, chrome "APEX" title. Enter / click / Space starts.
- **Win condition**: fastest single flying lap. Best lap + per-segment splits persist to
  `localStorage["lapracer.best.apex"]`; live delta shows green (ahead) / red (behind).
- **Grew out of** the old `manualDriving` "Shift School" trainer (now deleted). Lifted its
  torque/gear model, `torqueAt`/`speedToRPM`, tach renderer, sunset road, engine audio.

### Tuning surfaces (for Thursday iteration)
- `TUNING` block (top of file): SEG_LEN, ROAD_WIDTH, CAMERA_*, DRAW_DISTANCE, POS_K
  (speed→world/feel of speed), STEER, CENTRIFUGAL, OFFROAD_MAX_KMH.
- `buildTrack()`: the level design — edit the addRoad(enter, hold, leave, curve) sequence
  to make the lap harder/more interesting. This is where the fun-tuning happens.

### Controls
←/→ steer · ↑ gas · ↓ brake · `.`/E up-shift · `,`/Q down-shift · 1–6 direct gear ·
Enter start/restart · M mute.

### Not built yet (deliberately deferred)
- Screen-only Playwright bot to beat the lap (that's a *later week* — not for the first
  working-game session). Road + tach are big flat-color regions, so it'll be botable.
- Ghost car replay (splits already recorded → the data hook exists).
- Hills (road Y is flat; the projector already handles Y, so elevation is additive).

## Val — TBD (placeholder components still in ValSimpleCompetition.tsx).
