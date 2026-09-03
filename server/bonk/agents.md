# Bonk Server (Colyseus)

Authoritative multiplayer server for the Bonk baseball game.

- `index.ts` — boots Colyseus on ws://localhost:2567 (env `BONK_PORT`). Defines the `bonk` room, matched by keyphrase via `.filterBy(["key"])`.
- IMPORTANT: uses the **Bun-native** transport `@colyseus/bun-websockets` (`BunWebSockets`). The default `@colyseus/ws-transport` (Node `ws`) does not deliver binary state patches under Bun, so state never syncs. Keep BunWebSockets while the server runs under `bun`.
- `BonkRoom.ts` — room state (schema via `defineTypes`, no decorators) + 60fps authoritative physics: movement, bat swing, knockback, left/right spikes = death, win detection. Field is 800x600; clients render at the same size.

Run: `bun server/bonk/index.ts` (needs `colyseus`, `@colyseus/schema`, `@colyseus/bun-websockets`).
Matchmaking: `client.create("bonk", { key })` then another player `client.join("bonk", { key })` with the same keyphrase.
