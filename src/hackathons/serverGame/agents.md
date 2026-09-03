# Server Game Hackathon

**Goal**: Learn real-time multiplayer. Two machines, one authoritative server, played over Tailscale.
Everything ships on **v1** — v2/v3 are unused placeholders the orchestrator still imports.

## `bryceShooter/` — NETLAB
Top-down deathmatch on raw Bun websockets. No extra deps.

- `protocol.ts` — arena, tuning, message types, AND `stepMove`. Both sides import it; prediction
  only cancels out if client and server run identical maths (hence `Math.sqrt`, not `Math.hypot`,
  and integer `dtMs` so JSON round-trips exactly).
- `server.ts` — authoritative sim, 20 Hz fixed tick, one global room. Mounted by `src/index.ts`
  at `/ws/shooter`.
- `ShooterClient.tsx` — canvas client: prediction + reconciliation for you, interpolation for
  everyone else, plus a network impairment simulator.

## Netcode model
- Clients send numbered **commands** (`seq`, `dtMs`, keys, aim, fire), never positions.
- Server drains each queue per tick and echoes the last consumed `seq` on that player's state.
- Client keeps unacked commands in `pending`, snaps to the authoritative position on each
  snapshot, replays `pending`, and absorbs any mismatch into `error` (80 ms half-life).
  Corrections over 80 px snap instead — that is a respawn, not a misprediction.
- Remote players interpolate on a **server-timeline playback clock** (`tick * TICK_MS`), not on
  packet arrival, so arrival jitter does not become positional jitter. Interp delay adapts to
  measured jitter, clamped to 45–250 ms.
- Each packet resends the last `CMD_RESEND` commands, so one lost packet costs nothing.

## Pickups and powers (all server-side)
Pads in `PADS`, fixed kind per position. The client predicts movement ONLY, so pickups cannot
desync it — a pad lights up a round trip after you touch it, which is the right trade.
- `health` +40 hp, 8 s respawn. Skipped if you are already full.
- `spread` 3 rounds over `SPREAD_ARC`; `big` r10 / 38 dmg / slower; `bounce` 3 ricochets, longer
  fuse; `ghost` ignores walls. 15 s each, 20 s pad respawn, and they STACK.
- Phase beats ricochet: a round that ignores walls has nothing to bounce off.
- Your own ricochet can kill you, but only after it has bounced once (`b.bounced > 0`), or it
  would detonate on you at the muzzle.
- Pads trigger on ENTRY, not overlap (`padOccupants`). Without that, parking on a pad re-grants
  it the instant its timer expires — permanent spread for whoever squats.
- `FIRE_COOLDOWN` is deliberately constant across powers: the client predicts its own muzzle
  flash from it, so varying it per power would desync the flash.

## Anti-cheat guards (both needed, learned the hard way)
- `MAX_CMD_MS` clamps any single command's dt.
- Token bucket refills `TICK_MS` per tick → a client can never buy more sim time than real time.
- `CMD_QUEUE_MAX_MS` backlog is acked and **dropped** before the budget is spent. Without this a
  spamming client throttles into an ever-growing backlog and freezes minutes in the past.
  Verified: a 4x command flood moves at exactly the honest rate.

## Known gaps / next
- **No lag compensation.** The server hit-tests bullets against where players are now, not where
  the shooter saw them. Lead your shots at high latency.
- Snapshots are full-state JSON, and names/colors are resent every tick.
- One global room, no room codes: everyone who opens the page is in the same match.
- Not built yet: alternate weapons, round/score limits, sound.

## Gotchas
- The tick loop is a **wall-clock accumulator**, not `setInterval(step, TICK_MS)`. Timers drift
  under load (a 50 ms interval fires every ~55 ms); since the command budget refills TICK_MS per
  tick, a nominal interval hands out sim time slower than clients generate it, queues creep up,
  and the backlog trim starts discarding honest input. That shows up in play as a rubber-band
  every few seconds. Measured: 19 honest commands trimmed in one 60 s test before the fix, zero
  after.
- `server.ts` stores its tick interval on `globalThis` — `bun --hot` re-runs the module and would
  otherwise stack intervals.
- Client resets its playback clock on reconnect; a restarted server counts ticks from zero again.
- Client connects to `location.host`, so a tailnet IP needs no config.
