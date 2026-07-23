import type { Level } from "./types";

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

/** The starter course (authored in the editor and exported to first-green.json). */
const FIRST_GREEN: Level = {
  id: "starter",
  name: "First Green",
  width: LEVEL_WIDTH,
  height: LEVEL_HEIGHT,
  outline: [
    { x: 40, y: 40 },
    { x: 860, y: 40 },
    { x: 860, y: 560 },
    { x: 40, y: 560 },
  ],
  start: { x: 111.61616161616166, y: 508.3793642522147 },
  strokes: 5,
  targetScore: 26,
  friction: 0.14,
  bounciness: 0.7,
  obstacles: [
    { id: "coin_2vnce3g", type: "coin", x: 747.7777777777777, y: 104.00615157793055, radius: 14 },
    { id: "coin_j85i692", type: "coin", x: 705.4797979797979, y: 105.69808970627486, radius: 14 },
    { id: "coin_wm3fdgc", type: "coin", x: 675.0252525252524, y: 105.69808970627486, radius: 14 },
    { id: "coin_2nezh92", type: "coin", x: 632.7272727272726, y: 105.69808970627486, radius: 14 },
    { id: "coin_xufc1c6", type: "coin", x: 576.8939393939394, y: 104.00615157793055, radius: 14 },
    { id: "coin_u4vvoip", type: "coin", x: 517.6767676767677, y: 100.622275321242, radius: 14 },
    { id: "coin_1avbfdj", type: "coin", x: 471.9949494949494, y: 110.77390409130771, radius: 14 },
    { id: "coin_s6fzc0c", type: "coin", x: 428.00505050505046, y: 110.77390409130771, radius: 14 },
    { id: "coin_amsqcw5", type: "coin", x: 385.70707070707067, y: 104.00615157793055, radius: 14 },
    { id: "coin_q24ddoq", type: "coin", x: 341.7171717171717, y: 110.77390409130771, radius: 14 },
    { id: "coin_fwo85sx", type: "coin", x: 301.1111111111111, y: 102.3142134495863, radius: 14 },
    { id: "coin_7ouibe7", type: "coin", x: 255.4292929292929, y: 109.08196596296341, radius: 14 },
    { id: "coin_znb2xwq", type: "coin", x: 223.28282828282823, y: 105.69808970627486, radius: 14 },
    { id: "coin_kml6ekm", type: "coin", x: 180.98484848484844, y: 109.08196596296341, radius: 14 },
    { id: "coin_1k16xza", type: "coin", x: 130.2272727272727, y: 115.84971847634057, radius: 14 },
    { id: "coin_q6l94hr", type: "coin", x: 230.05050505050502, y: 381.48400462639324, radius: 14 },
    { id: "coin_znymwzo", type: "coin", x: 265.580808080808, y: 430.5502103483775, radius: 14 },
    { id: "coin_p5pjo9k", type: "coin", x: 309.57070707070704, y: 476.23253981367327, radius: 14 },
    { id: "coin_9qwgsgp", type: "coin", x: 346.7929292929292, y: 513.4551786372475, radius: 14 },
    { id: "coin_6pqwhep", type: "coin", x: 373.8636363636364, y: 308.73066510758906, radius: 14 },
    { id: "coin_2w4ioa1", type: "coin", x: 416.16161616161617, y: 335.8016751610976, radius: 14 },
    { id: "coin_h4zxywr", type: "coin", x: 453.38383838383834, y: 364.5646233429504, radius: 14 },
    { id: "coin_yno7y0g", type: "coin", x: 488.91414141414134, y: 389.94369526811477, radius: 14 },
    { id: "coin_4s65lpv", type: "coin", x: 517.6767676767677, y: 406.8630765515576, radius: 14 },
    { id: "coin_3jm40qb", type: "coin", x: 551.5151515151515, y: 440.7018391184432, radius: 14 },
    { id: "coin_cg2ouh6", type: "coin", x: 690.2525252525252, y: 354.4129945728847, radius: 14 },
    { id: "coin_ecoaf0m", type: "coin", x: 722.3989898989898, y: 332.417798904409, radius: 14 },
    { id: "coin_yrum2k9", type: "coin", x: 751.161616161616, y: 303.65485072255615, radius: 14 },
    { id: "coin_ohw8niv", type: "coin", x: 796.8434343434343, y: 252.89670687222764, radius: 14 },
    { id: "coin_k6gm5pp", type: "coin", x: 818.8383838383838, y: 217.36600617699764, radius: 14 },
    { id: "coin_osvhhey", type: "coin", x: 818.8383838383838, y: 169.9917385833577, radius: 14 },
    { id: "coin_5v4uie0", type: "coin", x: 810.3787878787878, y: 112.46584221965196, radius: 14 },
  ],
  water: [
    {
      id: "water_l7uhfno",
      points: [
        { x: 105.68181818181819, y: 45.39483216614343 },
        { x: 768.9393939393939, y: 48.77870842283204 },
        { x: 768.9393939393939, y: 79.71250270084778 },
        { x: 103.98989898989902, y: 84.78831708588064 },
      ],
    },
    {
      id: "water_5t0ng65",
      points: [
        { x: 98.9141414141414, y: 135.06755296839054 },
        { x: 767.2474747474747, y: 135.06755296839054 },
        { x: 763.8636363636364, y: 198.14817168494767 },
        { x: 100.60606060606057, y: 204.91592419832483 },
      ],
    },
  ],
};

/** Returns a fresh, independent copy of the starter level. */
export function makeDefaultLevel(): Level {
  return structuredClone(FIRST_GREEN);
}
