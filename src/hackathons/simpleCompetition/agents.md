# Simple Competition

**Goal**: A "make something with a built-in challenge, then race to beat the score"
competition between Val and Bryce. Each person builds a game; you get N attempts to set a
bar, the opponent gets N+2 to beat it. Uses the shared CompetitionToggle (Val / Bryce,
iterations v1–v3). We only use v1 for now (ignore v2/v3 placeholders).

## Bryce v1 — APEX (arcade racer vs AI rivals)
- Lives in `lapRacer/` (rendered by `BryceSimpleCompetitionV1`):
  - `BryceLapRacer.tsx` — the component: game loop, physics, world update, rendering
    orchestration, HUD, pickers. Still one imperative canvas + rAF in a single
    `useEffect`; fast HUD written to DOM via `data-el` refs.
  - `tuning.ts` — TUNING (+defaults & dev-panel KNOBS), the CAR, SOUND constants.
  - `tracks.ts` — Segment/Theme/Track types, `makeRoad`, the 3 TRACKS, `tracePath`.
  - `sprites.ts` — player roadster, 4 traffic/rival silhouettes, trees, road-quad helpers.
  - `ai.ts` — rival racers: DIFFS, grid, braking-zone map, per-frame update.
  - `audio.ts` — engine synth manager. `styles.ts` — all CSS (scoped under `.lap`).
  - `util.ts` — Col/clamp/lerp/fmtTime/FONT_LABEL.
- **Style**: Pole Position / OutRun pseudo-3D — curved road to a sunset horizon, sprite
  car, radial tach. `ROAD_WIDTH` 2400 = three comfortable lanes (`LANES` ±0.55/0).
- **AI rivals** (`ai.ts`): 3 racers (VIPER/GHOST/FANG, wedge sprites w/ high wing +
  stripe, dots on the minimap) start staggered ahead — you launch P4. Their speed comes
  from a **precomputed per-segment braking map** (`buildAllowedSpeeds`: corner limits
  spread backward at v²=u²+C·d rates — the same braking zones the player judges by eye),
  plus a racing line that hugs the inside, hazard dodging/pace-matching, and door-to-door
  collisions with the player. HARD corners near a skilled player's pace (hairpin ≈105,
  sweeper ≈219 km/h) so corners aren't free passes. **Mode picker** on the start screen
  (▲▾ or click, persisted to `localStorage["lapracer.diff"]`): **TIME TRIAL** (no rivals,
  endless laps, "TT" badge, no finish card — pure record chasing) or **EASY/MED/HARD**
  (`DIFFS` scale top speed, corner limits, accel, rubber-banding — off on HARD). Dev-panel
  fine-tunes: `AI_PACE` (everything) and `AI_CORNER` (corner limits only, rebuilds the
  braking map live). Live position (P1–P4) shows in the map box and on the FINISH card
  ("★ YOU WIN ★" for P1).
  - Sprite sizing gotcha: the player car is drawn SMALLER than true near-plane scale (the
    OutRun trick, else it fills the screen), so other cars' size cap must stay below the
    player sprite's — matching "true" scale reads as comically huge (`sprites.ts`).
- **Feel (locked)**: *arcade + real shifting*, tuned faster-than-real and deliberately
  loose. Gears, RPM, torque curve, shift-light, redline fuel-cut. NO clutch / stalling.
  - **Corners pump outward drift MOMENTUM** (`S.driftVel`): the car does NOT auto-follow
    the road. A curve builds lateral drift scaled by `CENTRIFUGAL * speed²` (v²/r), and
    `GRIP_RECOVER` bleeds it off once the road straightens — so exits carry a slide you
    counter-steer, instead of the old scripted position-drag that started/stopped with the
    segment under you. Do nothing in a corner and you still fly straight off.
  - **Slidey steering**: input eases into a lateral velocity (`steerVel`, `STEER_SLIDE`),
    so it feels loose, not on-rails. Collisions knock `driftVel` (a slide), not `steerVel`.
  - **Off-road is dangerous** (`OFFROAD_MAX_KMH` 45, high `OFFROAD_DECEL`): leave the road
    and speed is ripped away to a crawl + the whole view judders.
  - **Renderer**: road is painted **back-to-front** (far→near) so nearer road correctly
    occludes distant trees/cars. Trees only spawn beside near-straight segments, fade out
    in fog before the vanishing point, and their lateral offset is **clamped ≥2.4 at draw
    time** so a tree can never render on the road. Per-segment `curve` is clamped to ±7
    (a single-vanishing-point projection folds above that — make tight turns by holding a
    curve LONGER, not by raising it). Known limit: billboards shrink out at the very bottom
    (no true depth pass-by).
  - **Trees** line the grass (deterministic, `treesBySeg`) and **7–10 slow traffic cars**
    (`traffic`, per-track count) circulate, **periodically drifting to a new lane** (never
    while near the player's plane — no cheap sideswipes). Three sprite variants: wedge
    coupe w/ spoiler, surf van, round bug. **Trees collide only when off-road**.
  - **Impacts have NO text popup** (Bryce hates them): a red vignette blooms from the
    screen edges + extra judder (`impactFlash`), and the player's brake lights glow.
  - **Collision happens on the player-sprite plane** (`PLAYER_Z ≈ CAMERA_DEPTH ×
    CAMERA_HEIGHT × 1.15` ahead of the camera — where the near plane meets the screen
    bottom, i.e. where the player car visually sits). Traffic sprites are drawn at their
    TRUE positions (interpolated within their segment, far→near) and slide off the bottom
    edge right at that plane, so what you see is exactly what you can hit. Window: +150
    ahead / −70 behind (asymmetric — the nose extends up-screen past the sprite), swept
    per frame so high closing speeds can't tunnel. **Lateral thresholds are calibrated to
    DRAWN separation, not road units** (steering slides the world under the camera while
    the player sprite barely moves — sprites visually touch at ~0.21 offset): cars 0.22,
    trees 0.16. Don't widen them; wider boxes hit through visible air.
  - **Speed** is arcade-crazy: taller gearing → ~200 mph top, `POS_K` 84 for the rush.
  - **Car sprite** banks into corners (`steerVel`) and slides toward the screen edge as you
    drift, so cornering reads as *you* sliding wide rather than the camera moving you.
- **One car** (`CAR` const, "MX-5 APEX" — arcade-fast, planted). No car picker.
- **Three tracks** (`TRACKS`: layout via `makeRoad` + a color theme — sky/ground/grass/
  fog/tree): LAGUNA (the original sunset circuit), SIDEWINDER (desert hairpin fest),
  EL DORADO (flat-out dusk speedway) — all ~2100–2500 segments (3× the originals; a hot
  lap is tens of seconds, not 6). Each nets one full right-hand rotation so the map traces
  a loop. `tracePath` (minimap + start-screen previews) distributes the loop-closure error
  across all points so the player dot never "teleports" at the finish line.
- **Start screen**: retro-California / OutRun overlay (`.start-screen`) — sunset gradient,
  scanline sun, neon grid, chrome "APEX" title, plus a **track picker** (cards with canvas
  loop previews; ←/→ or click to choose). Enter / click / Space starts.
- **Race format**: `TUNING.RACE_LAPS` (default 4) laps, then a retro FINISH card (race
  time, best lap, "NEW TRACK RECORD"); Enter re-races, Esc back to circuit select.
  Scoring is still fastest single lap: best lap + per-segment splits persist per-track to
  `localStorage["lapracer.best.apex.<trackId>"]` (legacy `lapracer.best.apex` still read
  as LAGUNA's best); live delta shows green/red.
- **Dev tuning panel** (backtick or the "Tune" button): sliders defined in `KNOBS`
  live-mutate `TUNING` mid-game, persist to `localStorage["lapracer.tuning"]`, and
  "reset defaults" restores `TUNING_DEFAULTS`. This is Bryce's feel-tuning surface —
  when he settles on values he likes, bake them into `TUNING`.
- **Grew out of** the old `manualDriving` "Shift School" trainer (now deleted). Lifted its
  torque/gear model, `torqueAt`/`speedToRPM`, tach renderer, sunset road, engine audio.

### Tuning surfaces (for Thursday iteration)
- `TUNING` block (top of file): SEG_LEN, ROAD_WIDTH, CAMERA_*, DRAW_DISTANCE, POS_K
  (speed→world/feel of speed), STEER, CENTRIFUGAL + GRIP_RECOVER (the drift pair),
  OFFROAD_MAX_KMH.
- `TRACKS`: the level design — each track's addRoad(enter, hold, leave, curve) sequence
  plus its theme colors and traffic count. This is where the fun-tuning happens.

### Controls
←/→ steer (or pick circuit on the start screen) · ↑ gas · ↓ brake · `.`/E up-shift ·
`,`/Q down-shift · 1–6 direct gear · Enter start/restart · Esc circuit select ·
backtick tuning panel · M mute.

### Not built yet (deliberately deferred)
- Screen-only Playwright bot to beat the lap (that's a *later week* — not for the first
  working-game session). Road + tach are big flat-color regions, so it'll be botable.
- Ghost car replay (splits already recorded → the data hook exists).
- Hills (road Y is flat; the projector already handles Y, so elevation is additive).

## Val — TBD (placeholder components still in ValSimpleCompetition.tsx).
