# PROVING GROUNDS — Bryce v2 (`/servergame/bryce/v2`)

Point-and-click RPG. Farm monster camps for 5 minutes, then duel whoever else is here with
exactly what you earned. Nothing persists. Registered with the router as `arena` (`/ws/arena`).

- `protocol.ts` — map, classes, monsters, items, wire types. Data only; no shared sim code.
- `server.ts` — authoritative sim, phases, AI, loot.
- `ArenaClient.tsx` — canvas + HUD + character select.
- `styles.ts` — CSS, scoped under `.pg`.

## Why there is no client prediction here
The shooter predicts because WASD demands instant feedback. A click-to-move character
visibly turns and walks, which hides a round trip on its own — so this client is a pure
renderer: orders out, snapshots in. Remote units still interpolate on a server-tick playback
clock (same trick as the shooter) so jitter does not become stutter.

## Phases
`lobby` → `farm` → `duel` (ends early on last-one-standing, else on the clock) → `result` →
`lobby` with everything wiped. All three lengths are overridable for tests:
`ARENA_FARM_SECONDS`, `ARENA_DUEL_SECONDS`, `ARENA_RESULT_SECONDS` — the whole cycle then runs
in about 15 seconds instead of seven minutes.
Picking a class mid-farm drops you straight in. Last player leaving resets to lobby.

## Classes
Auto-attack plus one ability each; `abilities` is an array so W/E slots are already wired in
the UI, just empty.
- Warrior — Sword (melee) + Smash (cone, 2.4 rad on purpose: melee gets swarmed).
- Mage — Staff (300 reach) + Frostbolt (heavy, 45% slow for 2.5s).
- Rogue — Bow (fast) + Piercing Shot (runs through every enemy in a line).

## Map rules, all learned the hard way
- `CAMP_SAFE_RADIUS` — no spawn point inside a camp's aggro, or you are chewed up before you
  can act. The first layout did exactly that and killed a level-1 mage at spawn.
- `CAMP_GAP` — camps must clear each other's aggro, or one pull drags in the neighbours and
  three camps kill you in four seconds.
- Rocks stay off the y=410 duel lane; a rock on that line eats every projectile in a duel.
- Duel positions come from `duelPost(i, n)` around a circle, NOT a fixed list. A fixed list of
  two gets reused modulo the roster, stacking the third fighter on the first — and a bolt
  aimed at one then hits whoever is standing in front of them.

## Gotchas
- **`walkToward` must deflect, not just slide.** Axis-separated sliding is enough for WASD
  because the player keeps re-aiming; a click-to-move unit holds one heading, so a rock dead
  ahead blocks the x step, leaves the y step at zero, and it parks against the face forever.
  It now tries progressively wider sidestep angles (`DEFLECT`).
- **Casts skip the move-order throttle.** They are gated by ability cooldowns already. Sharing
  the throttle silently swallowed any ability pressed in the same breath as a click, which is
  how the game is actually played.
- Out-of-combat regen is farm-only. In a duel it would just reward disengaging.
- The server drops silent sockets after 20 s, so the client pings every second.
- Rocks block projectiles. That is cover, and it is why a duel opening can be a whiff.

## Not built
Talents, more ability slots, persistence, pathfinding, lag compensation, sound.
