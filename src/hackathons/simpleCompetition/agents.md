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
  - `missions.ts` — per-track missions + gold/silver/bronze medals (pure logic).
  - `audio.ts` — engine synth manager. `styles.ts` — all CSS (scoped under `.lap`).
  - `util.ts` — Col/clamp/lerp/fmtTime/FONT_LABEL.
- **Style**: Pole Position / OutRun pseudo-3D — curved road to a sunset horizon, sprite
  car, radial tach. `ROAD_WIDTH` 2400 = three comfortable lanes (`LANES` ±0.55/0).
- **AI rivals** (`ai.ts`): 3 racers (wedge sprites w/ high wing + stripe, dots on the
  minimap) start on a **staggered two-column grid with the CENTER clear** (a perfect
  launch threads the pack; rivals hold their grid lane for the first ~8000 units before
  blending onto the racing line — no instant funnel into the player's path). You launch
  P4. Corner pace is deliberately hot (hairpin ≈137 km/h on HARD, late braking ~71
  km/h/s) — corners are where THEY'RE strong; straights are the player's (see AI_TOP).
  `brakeLook` must stay small: the map is already brake-aware, big lookahead
  double-brakes every zone. Each has a **driving personality**
  (`RivalTraits`, keyed to their color so you learn who's dangerous where):
  🟡 VIPER — straight-line missile, soft corners; ⚪ GHOST — brakes early, murders the
  apex; 🩵 FANG — huge wide lines, brakes at the last moment. AI top speed (`AI_TOP`
  280, trait-capped at 288×diff) sits UNDER the player's ~285 km/h terminal ON PURPOSE:
  the salt-flats drag race must be winnable by launch + shifts + NOS. Their speed comes
  from a **precomputed per-segment braking map** (`buildAllowedSpeeds`: corner limits
  spread backward at v²=u²+C·d rates — the same braking zones the player judges by eye),
  plus an **out-in-out racing line** (local curvature pulls to the apex while curvature
  smoothed over a ±window pushes wide — the phase difference sweeps entry-wide → apex →
  exit-wide), hazard dodging/pace-matching, and door-to-door collisions with the player.
  HARD corners near a skilled player's pace (hairpin ≈105, sweeper ≈219 km/h) so corners
  aren't free passes. **Mode picker** on the start screen (▲▾ or click, persisted to
  `localStorage["lapracer.diff"]`): **TIME TRIAL** (the SAME RACE_LAPS timed race, just
  an empty grid — "TT" badge, finish card without a POSITION row) or **VS·EASY/MED/HARD**
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
    the road. A curve builds lateral drift scaled by `CENTRIFUGAL * speed²` (v²/r). Grip
    is **road-aware**: loose mid-corner (`GRIP_RECOVER` — the fight), hooks up fast once
    the road straightens (`GRIP_STRAIGHT` — a short exit flick, not a long carry), blended
    by |curve|/4. The curve is sampled at the SPRITE's plane (`position + PLAYER_Z`), not
    the camera — the camera trails the visible car ~5 segments, so camera-sampling kept
    forces firing after the visible corner exit. Do nothing in a corner → fly straight off.
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
- **One car** (`CAR` const, "MX-5 APEX" — arcade-fast, planted), but a **paint picker**
  on the start screen (`PAINTS` in sprites.ts — the classic NA Miata palette; persisted
  to `lapracer.paint`). The whole body shades off one base color (`sh()` multipliers in
  `drawPlayerCar`); the minimap player dot matches the paint (white-ringed).
- **Four tracks** (`TRACKS`: layout via `makeRoad` + a color theme — sky/ground/grass/
  fog/tree): LAGUNA (the original sunset circuit), SIDEWINDER (desert hairpin fest),
  EL DORADO (flat-out dusk speedway) — all ~2100–2500 segments — plus **SALT FLATS**
  (3200 segments of pure straight, `trees: false`; shift/launch/NOS practice, drag-race
  VS mode, and the designated BOT TEST TRACK — no steering needed). Loop tracks net one
  full right-hand rotation so the map closes; `tracePath` distributes the loop-closure
  error so the player dot never "teleports" at the line — but ONLY for genuine loops
  (net curvature ≠ 0): applying it to a straight would collapse the map to a dot.
- **Start screen**: retro-California / OutRun overlay (`.start-screen`) — sunset gradient,
  scanline sun, neon grid, chrome "APEX" title, plus a **track picker** (cards with canvas
  loop previews; ←/→ or click to choose). Enter / click / Space starts.
- **NOS boost**: near-misses (crossing the collision plane a whisker outside the hitbox,
  lateral 0.22–0.5 at 30+ km/h) fill the NOS tank (`BOOST_FILL`); hold **Shift** to dump
  it — extra thrust (`BOOST_FORCE`/`BOOST_DRAIN`), exhaust flames, cyan NOS bar next to
  the pedals (flashes on fill). Disabled off-road. Threading traffic = boost economy.
  **Rivals give NO near-miss NOS** (pacing a similar-speed CPU would farm the tank) —
  traffic only. Also: the **first upshift INTO each gear** grants `BOOST_SHIFT` NOS if
  nailed in the sweet spot (rpm between shift light and redline) — one chance per gear
  per race, consumed even on a miss, no retries via downshifting. Success shows a small
  cyan toast above the dash, NOT a center banner (a banner sat on the horizon and hid
  oncoming traffic). A perfect run up the box banks 5 × 15%.
- **Launch zones (NFS-style)**: during the countdown the tach shows a GREEN band
  (`LAUNCH_LO..HI`) and a red wheelspin band (`LAUNCH_SPIN+`). Needle in the green at
  GO = perfect launch (30 km/h rolling, "PERFECT LAUNCH ★"); pinned past the red =
  "WHEELSPIN!" — 4 km/h + ~0.65 s of bogged throttle (torque ×0.2); below green =
  partial rev carry. Pre-race revs use a LAZY FLYWHEEL (rpm chases throttle at ~3.2/s)
  — without it the keyboard timing window was ~60 ms, humanly impossible. Rivals also
  launch at GO (randomized 8–28 km/h, scaled by difficulty accel).
- **Collision fault matters** — THREE contact kinds, split by `ahead` (were they in
  front of your nose) AND closing speed (±25 km/h): true rear-end = you lose your drive
  + counts as a contact; getting punted = shoved FORWARD keeping speed, the rammer eats
  the loss, blameless; **door-to-door rub** (side by side at similar speed) = a racing
  incident — both scrub ~7-10%, get pushed apart, does NOT count as a contact. Without
  the rub case, side-by-side racing was suicide (every touch scored as a rear-end).
  Repeated leaning still bleeds speed each 0.8 s cooldown, so wall-riding rivals isn't
  a cheese strategy. AI_CORNER default 1.4 = Bryce's play-tested HARD pace (winnable
  with a near-clean race).
- **Sprite anti-blink**: the nearest road row flickers in/out of the bottom-edge cull;
  when a car's own row is missing, `pushSprite` extrapolates from the NEXT segment's
  row (negative lerp fraction) so cars alongside you slide off smoothly.
- **Player car YAW**: the sprite rotates with lateral motion (steerVel + driftVel) — a
  flank panel (door/fender/front wheel) slides into view opposite the nose swing, the
  greenhouse shifts toward it, the rear face narrows. Turning shows the SIDE of the car
  instead of just leaning (`drawPlayerCar` in sprites.ts).
- **Challenges** (`missions.ts`): per track, two BINARY challenges — TARMAC ONLY (never
  off-road), NO CONTACT (zero hits) — and two MEDAL ladders: TIME (finish under
  bronze/silver/gold; `track.medalLaps` is per-LAP pace × RACE_LAPS so targets survive
  the race-length knob — TUNE from real laps) and BEAT THE PACK (win a VS race; medal =
  difficulty, 🥉easy/🥈med/🥇hard). Everything except BEAT THE PACK is earnable in time
  trial — deliberate: hotshots gold the pack on HARD, everyone else farms the rest in
  TT. Bryce explicitly did NOT want tiers on the binary ones. Graded at the finish;
  best results persist to `lapracer.challenges`; shown as dots on track cards, a strip
  on the start screen (hover for details), earned lines on the FINISH card, and a
  **live tracker while racing** (top-left: ✓/✗ flips the moment you blow one + a
  countdown to the next time medal). Stats in S: `contacts`, `offroadS`.
- **Best times on the menu**: each track card shows ⏱ best lap · 🏁 best race. Race
  bests persist per lap-count (`lapracer.racebest.<car>.<track>` = `{laps: seconds}`,
  read with THAT track's `laps` — not the selected track's). **Stale-record rule**: a
  best-lap whose splits array doesn't span the current layout (±10 segments) was set on
  an OLD track design — both `loadBest` and the card display reject it (its time is
  meaningless and its splits would freeze the live delta mid-lap).
- **The top chip is MODE-AWARE**: in a VS race it shows the **gap to the next car** in
  seconds ("▲ GHOST +2.4" chasing / "▼ VIPER −1.8" leading; distance ÷ player speed),
  colored by a ~0.6s-sampled TREND — green when the gap moves in the player's favor,
  red against, gray even — with the vs-best delta as a small second line when a record
  exists. In TIME TRIAL it's the classic live delta vs the best lap.
- **Live delta rules**: split recording stamps EVERY segment crossed per frame (2-3 at
  speed — holes would blank the delta); the vs-best delta shows from lap 2 only (lap 1
  is a standing start) and HIDES on a missing reference instead of freezing.
- **Dev panel is keyboard-only** (backtick; the Tune button was removed on request).
  It renders above the start screen (z-index 7) and has TWO resets: "reset defaults"
  (tuning) and "reset records" (wipes best laps, race times, challenges — confirm()ed).
- **Race format**: `TUNING.RACE_LAPS` (default 4) laps, then a retro FINISH card (race
  time, best lap, "NEW TRACK RECORD"); Enter re-races, Esc back to circuit select.
  (Ideas for NOS-from-near-misses, the out-in-out AI line, and the mission ladder came
  from studying github.com/Madni-Aghadi/Claude-for-speed — concepts only, no code/assets;
  that repo has no license.)
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
- `TUNING` block (tuning.ts): SEG_LEN, ROAD_WIDTH, CAMERA_*, DRAW_DISTANCE, POS_K
  (speed→world/feel of speed), STEER, CENTRIFUGAL + GRIP_RECOVER/GRIP_STRAIGHT (the
  drift pair), OFFROAD_*, BOOST_*, TRAFFIC_MUL (density dial, 0 = empty road for
  end-to-end testing), AI_PACE/AI_CORNER.
- `TRACKS` (tracks.ts): the level design — each track's addRoad(enter, hold, leave,
  curve) sequence plus theme colors, **traffic** (a DENSITY: cars per 100k world units,
  so track length doesn't skew it), **hazards** ({kind, density} — kind picks the
  off-road sprite: tree/cactus/rock, same collision behavior; density scales spawn
  rate, 0 = bare), **laps** (race length lives HERE, per track; TUNING.RACE_LAPS is
  only a fallback), and medalLaps. Salt medalLaps are MEASURED: the flying-lap floor at
  the 177 mph terminal is ≈26.7 s, so gold (28.2 s/lap pace) = perfect launch + shifts
  + NOS; Bryce flat-out ran a 58 s race ≈ silver. Don't set targets below physics.
- Drivetrain reference (measured on the empty salt flats): 0–60 in ~1.8 s (with a rev
  launch), 0–100 ~5.8 s, 0–150 ~17 s; terminal 177 mph @ ~7,070 rpm in 6th (drag-limited
  below redline — 6th is an overdrive you can't rev out), 199 mph with NOS. The top end
  past ~150 belongs to NOS by design.

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
