/**
 * One websocket endpoint per game, all sharing a single Bun server.
 *
 * `Bun.serve` accepts exactly ONE `websocket` handler for the whole process, so games
 * cannot each own theirs. Instead the upgrade stamps the game name onto the socket and
 * this module fans open/message/close out to the right module. Connect to `/ws/<name>`.
 *
 * Games are also ticked from here, on one wall-clock accumulator. Do not simplify that to
 * `setInterval(tick, TICK_MS)`: timers drift under load, a 50 ms interval fires every
 * ~55 ms, and any game metering input against a nominal tick then hands out simulation
 * time slower than clients produce it. Driving from the clock keeps every game honest.
 */

import type { Server, ServerWebSocket } from "bun";

export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;

export type SocketData = { game: string; id: string };
export type GameSocket = ServerWebSocket<SocketData>;

export type GameModule = {
  name: string;
  open(ws: GameSocket): void;
  message(ws: GameSocket, raw: string | Buffer): void;
  close(ws: GameSocket): void;
  tick(dt: number): void;
};

// Survives `bun --hot` re-evaluation of individual game modules.
const hot = globalThis as unknown as {
  __games?: Map<string, GameModule>;
  __gameLoop?: ReturnType<typeof setInterval>;
  __gameIds?: number;
};
const games: Map<string, GameModule> = (hot.__games ??= new Map());

export function registerGame(mod: GameModule) {
  games.set(mod.name, mod);
}

export function shutdownGameLoop() {
  if (hot.__gameLoop) clearInterval(hot.__gameLoop);
  hot.__gameLoop = undefined;
}

export function gameUpgrade(req: Request, server: Server<SocketData>): Response | undefined {
  const name = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  if (!games.has(name)) return new Response(`No game named "${name}"`, { status: 404 });

  hot.__gameIds = (hot.__gameIds ?? 0) + 1;
  const data: SocketData = { game: name, id: `c${hot.__gameIds}` };
  return server.upgrade(req, { data })
    ? undefined
    : new Response("Expected a WebSocket upgrade", { status: 426 });
}

export const gameWebSocket = {
  open(ws: GameSocket) {
    games.get(ws.data.game)?.open(ws);
  },
  message(ws: GameSocket, raw: string | Buffer) {
    games.get(ws.data.game)?.message(ws, raw);
  },
  close(ws: GameSocket) {
    games.get(ws.data.game)?.close(ws);
  },
};

let acc = 0;
let lastTick = Date.now();

function loop() {
  const now = Date.now();
  // Cap the catch-up so a long stall replays a few ticks, never a spiral.
  acc = Math.min(acc + (now - lastTick), TICK_MS * 5);
  lastTick = now;
  while (acc >= TICK_MS) {
    acc -= TICK_MS;
    for (const mod of games.values()) {
      try {
        mod.tick(TICK_MS / 1000);
      } catch (err) {
        // One game throwing must not stop every other game's clock.
        console.error(`[${mod.name}] tick failed:`, err);
      }
    }
  }
}

shutdownGameLoop();
lastTick = Date.now();
acc = 0;
hot.__gameLoop = setInterval(loop, Math.floor(TICK_MS / 2));
