import { Server } from "colyseus";
import { BunWebSockets } from "@colyseus/bun-websockets";
import { BonkRoom } from "./BonkRoom";

const PORT = Number(process.env.BONK_PORT ?? 2567);

// Bun-native transport. The default @colyseus/ws-transport (Node `ws`) does
// NOT deliver Colyseus's binary state patches correctly under Bun, so state
// never syncs to clients. BunWebSockets uses Bun's native WebSocket server.
const gameServer = new Server({
  transport: new BunWebSockets(),
});

// Rooms are matched by keyphrase.
gameServer.define("bonk", BonkRoom).filterBy(["key"]);

gameServer
  .listen(PORT)
  .then(() => console.log(`🥎 Bonk server listening on ws://localhost:${PORT}`))
  .catch((err) => {
    console.error("Failed to start Bonk server:", err);
    process.exit(1);
  });
