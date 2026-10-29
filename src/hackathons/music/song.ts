// The song format every music iteration shares. Songs are plain data in
// `songs/*.ts` so they can be edited by hand or by prompting an AI coding agent.

/** Sound used to play a track. All are synthesized in the browser by Tone.js. */
export type Instrument = "lead" | "keys" | "pluck" | "pad" | "bass" | "drums";

export const INSTRUMENTS: Instrument[] = ["lead", "keys", "pluck", "pad", "bass", "drums"];

/** Pitches a `drums` track understands (instead of note names). */
export const DRUM_HITS = ["openhat", "hat", "clap", "snare", "kick"] as const;
export type DrumHit = (typeof DRUM_HITS)[number];

/** General MIDI drum numbers, for MIDI import/export. */
export const DRUM_MIDI: Record<DrumHit, number> = { kick: 36, snare: 38, clap: 39, hat: 42, openhat: 46 };

export interface Note {
  /** Note name with octave ("C4", "F#3", "Bb5"), or a DrumHit on a drums track. */
  pitch: string;
  /** Start time in beats from the top of the song (0 = first beat). Fractions allowed. */
  start: number;
  /** Length in beats (1 = quarter note, 0.5 = eighth). */
  length: number;
  /** Loudness 0–1. Defaults to 0.8. */
  velocity?: number;
}

export interface Track {
  name: string;
  instrument: Instrument;
  /** Track gain in decibels. Defaults to 0; negative is quieter. */
  volume?: number;
  notes: Note[];
}

export interface Song {
  title: string;
  bpm: number;
  beatsPerBar: number;
  /** Song length in bars; it loops after this. */
  bars: number;
  tracks: Track[];
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function pitchToMidi(pitch: string): number | null {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(pitch.trim());
  if (!m) return null;
  const accidental = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return OFFSETS[m[1]!.toUpperCase()]! + accidental + (Number(m[3]) + 1) * 12;
}

export function midiToPitch(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function isBlackKey(midi: number): boolean {
  return NAMES[midi % 12]!.includes("#");
}

export function totalBeats(song: Song): number {
  return song.bars * song.beatsPerBar;
}
