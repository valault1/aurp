# Daily Hackathon

**Goal**: Each person builds games someone would come back to play once a day (think Wordle). The only shared rule is the "daily" theme; Val and Bryce build unrelated games. Each iteration slot (v1–v3) is a separate game, not a version of the previous one.

## Bryce
- **v1 Snug** — daily piece-fitting puzzle, yarn and quilt theme. Built; see `bryce/snug/agents.md`.
- **v2 Brink** — daily tactics fight, ink-and-parchment cliffs. Playable, plus art sheet. See `bryce/brink/agents.md`.
- Both: date-seeded, one recorded attempt per day, replays allowed but unscored.
- Full plan: https://claude.ai/code/artifact/05876357-1370-4832-b89c-9ffba16438a5

## Val — v1 Big Ticket (val/bigTicket); v2 Ticker (ValTicker.tsx); v3 Six Degrees (val/sixDegrees). Each version has its own file in val/ (ValDailyV1–V3.tsx); ValDaily.tsx just re-exports.
- **v3 Six Degrees** — Wikipedia link-chase to Chuck Norris in ≤6 clicks, same start article for everyone each day. Day 1 = `Apple`. Articles are fetched via the MediaWiki API and rendered in-app (an iframe can't report its URL). See `val/sixDegrees/agents.md`.
