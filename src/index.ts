import { serve } from "bun";
import index from "@/index.html";
import { registerUser, loginUser } from "@/api/auth";
import { getAllUsers } from "@/api/users";
import { withAuth } from "@/api/middleware";
import { getWeather } from "@/api/weather";

const users: Record<string, string> = {};

const server = serve({
  routes: {
    "/*": index,

    "/api/register": { POST: registerUser },
    "/api/login": { POST: loginUser },
    "/api/users": { GET: withAuth(getAllUsers) },
    "/api/weather": { GET: getWeather },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
