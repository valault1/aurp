// Snug songs: Val's song format, but each track names a cozy Snug sound instead of a generic instrument.
import type { Instrument, Note } from "../song";

export type SnugSound =
  | "musicbox" | "celesta" | "kalimba" | "vibes" | "marimba" | "felt" | "epiano" | "ocarina" | "pizz"
  | "warmpad" | "softbass" | "pluckbass" | "brushes" | "hand" | "weather";

export const SOUNDS: { id: SnugSound; label: string; family: Instrument }[] = [
  { id: "musicbox", label: "Music box", family: "keys" },
  { id: "celesta", label: "Celesta", family: "keys" },
  { id: "kalimba", label: "Kalimba", family: "pluck" },
  { id: "vibes", label: "Vibraphone", family: "keys" },
  { id: "marimba", label: "Marimba", family: "pluck" },
  { id: "felt", label: "Felt piano", family: "keys" },
  { id: "epiano", label: "Electric piano", family: "keys" },
  { id: "ocarina", label: "Ocarina", family: "lead" },
  { id: "pizz", label: "Pizzicato strings", family: "pluck" },
  { id: "warmpad", label: "Warm pad", family: "pad" },
  { id: "softbass", label: "Soft bass", family: "bass" },
  { id: "pluckbass", label: "Bouncy bass", family: "bass" },
  { id: "brushes", label: "Brushes", family: "drums" },
  { id: "hand", label: "Hand drums", family: "drums" },
  { id: "weather", label: "Rain", family: "drums" },
];

export const soundInfo = (id: SnugSound) => SOUNDS.find((s) => s.id === id)!;

export const isKit = (sound: SnugSound) => soundInfo(sound).family === "drums";

export interface SnugTrack {
  name: string;
  /** On a kit (`brushes`, `hand`, `weather`), pitch is a drum row; agents.md lists what each row plays. */
  sound: SnugSound;
  /** Track gain in decibels. Defaults to 0. */
  volume?: number;
  notes: Note[];
}

export interface SnugSong {
  title: string;
  /** One line on the feel, shown under the song picker. */
  mood: string;
  bpm: number;
  beatsPerBar: number;
  bars: number;
  /** 0 to 1: how far off-beat eighths lean late, for a lilt. Defaults to 0. */
  swing?: number;
  tracks: SnugTrack[];
}
