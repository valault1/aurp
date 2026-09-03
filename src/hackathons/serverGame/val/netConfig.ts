// Where the Colyseus (Bonk) server lives. Override at runtime with
// window.BONK_SERVER_URL if you ever point the client at a remote box.
export const BONK_SERVER_URL: string =
  (typeof window !== "undefined" && (window as any).BONK_SERVER_URL) ||
  "ws://localhost:2567";

// Must match server/bonk/BonkRoom.ts FIELD.
export const FIELD = {
  WIDTH: 800,
  HEIGHT: 600,
  BALL_RADIUS: 24,
  SPIKE_W: 44,
  BAT_LENGTH: 72,
};
