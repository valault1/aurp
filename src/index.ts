import { serve } from "bun";
import index from "@/index.html";
import { registerUser, loginUser } from "@/api/auth";
import { getAllUsers } from "@/api/users";
import { withAuth } from "@/api/middleware";
import { getWeather } from "@/api/weather";
import { gameUpgrade, gameWebSocket } from "@/hackathons/serverGame/net/router";
// Imported for their side effect: each module registers itself with the router.
import "@/hackathons/serverGame/bryceShooter/server";
import "@/hackathons/serverGame/provingGrounds/server";

const users: Record<string, string> = {};

const server = serve({
  // Listen on every interface so a friend on the tailnet can reach this machine.
  hostname: "0.0.0.0",

  routes: {
    "/*": index,

    "/api/register": { POST: registerUser },
    "/api/login": { POST: loginUser },
    "/api/users": { GET: withAuth(getAllUsers) },
    "/api/weather": { GET: getWeather },

    // One handler for every game; the last path segment selects which.
    "/ws/*": gameUpgrade,
  },

  websocket: gameWebSocket,

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
