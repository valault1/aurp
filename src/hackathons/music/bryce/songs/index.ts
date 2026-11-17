import type { SnugSong } from "../snugSong";
import { afterTheRain } from "./afterTheRain";
import { elevenOClockErrand } from "./elevenOClockErrand";
import { emberWaltz } from "./emberWaltz";
import { kindlingWaltz } from "./kindlingWaltz";
import { kitchenMorning } from "./kitchenMorning";
import { movingHouseWaltz } from "./movingHouseWaltz";
import { noonPatch } from "./noonPatch";
import { puddleHop } from "./puddleHop";
import { rainKalimba } from "./rainKalimba";
import { rainLongWay } from "./rainLongWay";
import { rainOnTheQuilt } from "./rainOnTheQuilt";
import { seasideTown } from "./seasideTown";
import { tenOClockThread } from "./tenOClockThread";

// Every Snug song the studio can open. To add one: create songs/<name>.ts exporting a `SnugSong` and add it here.
export const SNUG_SONGS: { id: string; file: string; song: SnugSong }[] = [
  { id: "rainOnTheQuilt", file: "rainOnTheQuilt.ts", song: rainOnTheQuilt },
  { id: "rainLongWay", file: "rainLongWay.ts", song: rainLongWay },
  { id: "rainKalimba", file: "rainKalimba.ts", song: rainKalimba },
  { id: "afterTheRain", file: "afterTheRain.ts", song: afterTheRain },
  { id: "puddleHop", file: "puddleHop.ts", song: puddleHop },
  { id: "tenOClockThread", file: "tenOClockThread.ts", song: tenOClockThread },
  { id: "elevenOClockErrand", file: "elevenOClockErrand.ts", song: elevenOClockErrand },
  { id: "noonPatch", file: "noonPatch.ts", song: noonPatch },
  { id: "emberWaltz", file: "emberWaltz.ts", song: emberWaltz },
  { id: "kindlingWaltz", file: "kindlingWaltz.ts", song: kindlingWaltz },
  { id: "movingHouseWaltz", file: "movingHouseWaltz.ts", song: movingHouseWaltz },
  { id: "kitchenMorning", file: "kitchenMorning.ts", song: kitchenMorning },
  { id: "seasideTown", file: "seasideTown.ts", song: seasideTown },
];
