import type { SnugSong } from "../snugSong";
import { midnightMending } from "./midnightMending";
import { rainOnTheQuilt } from "./rainOnTheQuilt";
import { tenOClockThread } from "./tenOClockThread";
import { twoAmTea } from "./twoAmTea";
import { twoOClockPicnic } from "./twoOClockPicnic";

// Every Snug song the studio can open. To add one: create songs/<name>.ts exporting a `SnugSong` and add it here.
export const SNUG_SONGS: { id: string; file: string; song: SnugSong }[] = [
  { id: "rainOnTheQuilt", file: "rainOnTheQuilt.ts", song: rainOnTheQuilt },
  { id: "tenOClockThread", file: "tenOClockThread.ts", song: tenOClockThread },
  { id: "twoOClockPicnic", file: "twoOClockPicnic.ts", song: twoOClockPicnic },
  { id: "midnightMending", file: "midnightMending.ts", song: midnightMending },
  { id: "twoAmTea", file: "twoAmTea.ts", song: twoAmTea },
];
