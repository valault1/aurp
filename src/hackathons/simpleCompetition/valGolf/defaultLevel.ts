import type { Level } from "./types";
import { uid } from "./geometry";

export const LEVEL_WIDTH = 900;
export const LEVEL_HEIGHT = 600;
export const BALL_RADIUS = 13;

/**
 * Dead space rendered around the playable course. It gives the slingshot room
 * to pull back "out of bounds" (the mouse can only register inside the canvas)
 * and visually frames the green.
 */
export const MARGIN = 220;
export const GAME_WIDTH = LEVEL_WIDTH + MARGIN * 2;
export const GAME_HEIGHT = LEVEL_HEIGHT + MARGIN * 2;

/** An easy starter course: a plain rectangular green with a handful of coins. */
export function makeDefaultLevel(): Level {
  return {
    id: "starter",
    name: "First Green",
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    outline: [
      { x: 40, y: 40 },
      { x: LEVEL_WIDTH - 40, y: 40 },
      { x: LEVEL_WIDTH - 40, y: LEVEL_HEIGHT - 40 },
      { x: 40, y: LEVEL_HEIGHT - 40 },
    ],
    start: { x: 140, y: LEVEL_HEIGHT / 2 },
    strokes: 5,
    targetScore: 4,
    friction: 0.45,
    bounciness: 0.7,
    obstacles: [
      { id: uid("coin"), type: "coin", x: 340, y: 200, radius: 14 },
      { id: uid("coin"), type: "coin", x: 460, y: 320, radius: 14 },
      { id: uid("coin"), type: "coin", x: 580, y: 200, radius: 14 },
      { id: uid("coin"), type: "coin", x: 700, y: 380, radius: 14 },
    ],
    water: [],
  };
}
