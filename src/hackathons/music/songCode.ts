import { Midi } from "@tonejs/midi";
import { DRUM_HITS, DRUM_MIDI, midiToPitch, pitchToMidi, type DrumHit, type Instrument, type Note, type Song } from "./song";

/** Serialize a song as a `songs/*.ts` file, in the same layout the song files use. */
export function songToCode(song: Song, exportName: string): string {
  const q = JSON.stringify;
  const note = (n: Note) =>
    `{ pitch: ${q(n.pitch)}, start: ${n.start}, length: ${n.length}${n.velocity !== undefined ? `, velocity: ${n.velocity}` : ""} }`;
  const tracks = song.tracks.map((t) => {
    const notes = [...t.notes].sort((a, b) => a.start - b.start || (pitchToMidi(b.pitch) ?? 0) - (pitchToMidi(a.pitch) ?? 0));
    return [
      "    {",
      `      name: ${q(t.name)},`,
      `      instrument: ${q(t.instrument)},`,
      ...(t.volume !== undefined ? [`      volume: ${t.volume},`] : []),
      "      notes: [",
      ...notes.map((n) => `        ${note(n)},`),
      "      ],",
      "    },",
    ].join("\n");
  });
  return [
    `import type { Song } from "../song";`,
    ``,
    `// Song format: see ../song.ts and ../agents.md. Beats are quarter notes from the top.`,
    `export const ${exportName}: Song = {`,
    `  title: ${q(song.title)},`,
    `  bpm: ${song.bpm},`,
    `  beatsPerBar: ${song.beatsPerBar},`,
    `  bars: ${song.bars},`,
    `  tracks: [`,
    ...tracks,
    `  ],`,
    `};`,
    ``,
  ].join("\n");
}

const GM_PROGRAM: Record<Instrument, number> = { lead: 80, keys: 4, pluck: 45, pad: 89, bass: 38, drums: 0 };

export function songToMidi(song: Song): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(song.bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [song.beatsPerBar, 4] });
  const ppq = midi.header.ppq;
  for (const t of song.tracks) {
    const track = midi.addTrack();
    track.name = t.name;
    if (t.instrument === "drums") track.channel = 9;
    else track.instrument.number = GM_PROGRAM[t.instrument];
    for (const n of t.notes) {
      const num = t.instrument === "drums" ? DRUM_MIDI[n.pitch as DrumHit] : pitchToMidi(n.pitch);
      if (num === undefined || num === null) continue;
      track.addNote({
        midi: num,
        ticks: Math.round(n.start * ppq),
        durationTicks: Math.max(1, Math.round(n.length * ppq)),
        velocity: n.velocity ?? 0.8,
      });
    }
  }
  return midi.toArray();
}

function drumFromMidi(num: number): DrumHit {
  if (num <= 36) return "kick";
  if (num === 39) return "clap";
  if (num === 37 || num === 38 || num === 40) return "snare";
  if (num === 46) return "openhat";
  return DRUM_HITS.find((d) => DRUM_MIDI[d] === num) ?? "hat";
}

function instrumentFromFamily(family: string): Instrument {
  if (family === "bass") return "bass";
  if (family === "pad" || family === "strings" || family === "ensemble") return "pad";
  if (family === "synth lead" || family === "brass" || family === "reed" || family === "pipe") return "lead";
  if (family === "guitar" || family === "chromatic percussion") return "pluck";
  return "keys";
}

const round = (x: number) => Math.round(x * 1000) / 1000;

export function midiToSong(data: ArrayBuffer, title: string): Song {
  const midi = new Midi(data);
  const ppq = midi.header.ppq;
  const beatsPerBar = midi.header.timeSignatures[0]?.timeSignature[0] ?? 4;
  const tracks = midi.tracks
    .filter((t) => t.notes.length > 0)
    .map((t, i) => {
      const drums = t.channel === 9 || t.instrument.percussion;
      return {
        name: t.name || `Track ${i + 1}`,
        instrument: drums ? ("drums" as const) : instrumentFromFamily(t.instrument.family),
        notes: t.notes.map((n) => ({
          pitch: drums ? drumFromMidi(n.midi) : midiToPitch(n.midi),
          start: round(n.ticks / ppq),
          length: round(Math.max(n.durationTicks, 1) / ppq),
          velocity: round(n.velocity),
        })),
      };
    });
  const end = Math.max(1, ...tracks.flatMap((t) => t.notes.map((n) => n.start + n.length)));
  return {
    title,
    bpm: Math.round(midi.header.tempos[0]?.bpm ?? 120),
    beatsPerBar,
    bars: Math.ceil(end / beatsPerBar),
    tracks,
  };
}
