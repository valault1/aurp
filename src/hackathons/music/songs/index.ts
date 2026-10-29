import type { Song } from "../song";
import { firstLight } from "./firstLight";

// Every song the studio can open. To add one: create songs/<name>.ts exporting a
// `Song` (copy firstLight.ts as a starting point) and add it here.
export const SONGS: { id: string; file: string; song: Song }[] = [
  { id: "firstLight", file: "firstLight.ts", song: firstLight },
];
