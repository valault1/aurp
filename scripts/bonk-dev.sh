#!/usr/bin/env bash
# Starts the Bonk Colyseus server + the frontend together.
# Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "🥎 Starting Bonk server on ws://localhost:2567 ..."
bun server/bonk/index.ts &
SERVER_PID=$!

cleanup() {
  echo ""
  echo "Stopping Bonk server (pid $SERVER_PID)..."
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.7
echo "🌐 Starting frontend (bun run dev) ..."
bun run dev
