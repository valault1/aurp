# Bonk — Val's frontend (Phaser + Colyseus client)

Multiplayer baseball-bat brawl. Client is a thin renderer; the Colyseus
server (`server/bonk/`) is authoritative.

- `BonkGame.tsx` — lobby (Create/Join room by keyphrase) + hosts the Phaser game.
  Uses `colyseus.js` (`client.create/join("bonk", { key })`). Tracks status/winner
  via `room.onStateChange`.
- `BonkScene.ts` — Phaser scene. Reads `room.state` each frame to draw the two
  baseballs, their bats, and the left/right spikes. Sends `{up,down,left,right,swing}`
  input every frame. Own ball = blue, opponent = orange.
- `netConfig.ts` — server URL (`ws://localhost:2567`, override with
  `window.BONK_SERVER_URL`) + FIELD dims (must match the server).

Rendered as `ValServerGameV1` in `../ServerGame.tsx` → route `/servergame`.
Controls: WASD / arrows to move, SPACE to swing.
