import { Midi } from "@tonejs/midi";
import { DRUM_MIDI, pitchToMidi, type DrumHit, type Note } from "../song";
import type { SnugSong, SnugSound } from "./snugSong";

/** Serialize a song as a `bryce/songs/*.ts` file, in the same layout the song files use. */
export function snugToCode(song: SnugSong, exportName: string): string {
  const q = JSON.stringify;
  const note = (n: Note) =>
    `{ pitch: ${q(n.pitch)}, start: ${n.start}, length: ${n.length}${n.velocity !== undefined ? `, velocity: ${n.velocity}` : ""} }`;
  const tracks = song.tracks.map((t) => {
    const notes = [...t.notes].sort((a, b) => a.start - b.start || (pitchToMidi(b.pitch) ?? 0) - (pitchToMidi(a.pitch) ?? 0));
    return [
      "    {",
      `      name: ${q(t.name)},`,
      `      sound: ${q(t.sound)},`,
      ...(t.volume !== undefined ? [`      volume: ${t.volume},`] : []),
      "      notes: [",
      ...notes.map((n) => `        ${note(n)},`),
      "      ],",
      "    },",
    ].join("\n");
  });
  return [
    `import type { SnugSong } from "../snugSong";`,
    ``,
    `// Song format: see ../snugSong.ts and ../agents.md. Beats are quarter notes from the top.`,
    `export const ${exportName}: SnugSong = {`,
    `  title: ${q(song.title)},`,
    `  mood: ${q(song.mood)},`,
    `  bpm: ${song.bpm},`,
    `  beatsPerBar: ${song.beatsPerBar},`,
    `  bars: ${song.bars},`,
    ...(song.swing !== undefined ? [`  swing: ${song.swing},`] : []),
    `  tracks: [`,
    ...tracks,
    `  ],`,
    `};`,
    ``,
  ].join("\n");
}

// General MIDI instruments, counted from zero.
const GM_PROGRAM: Record<Exclude<SnugSound, "brushes" | "hand" | "weather">, number> = {
  musicbox: 10, celesta: 8, kalimba: 108, vibes: 11, marimba: 12, felt: 0, epiano: 4, ocarina: 79, pizz: 45,
  warmpad: 89, softbass: 32, pluckbass: 33,
};

export function snugToMidi(song: SnugSong): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(song.bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [song.beatsPerBar, 4] });
  midi.header.name = song.title;
  const ppq = midi.header.ppq;
  // Rain has no MIDI instrument, so it is left out.
  for (const t of song.tracks.filter((t) => t.sound !== "weather")) {
    const track = midi.addTrack();
    track.name = t.name;
    const kit = t.sound === "brushes" || t.sound === "hand";
    if (kit) track.channel = 9;
    else track.instrument.number = GM_PROGRAM[t.sound];
    for (const n of t.notes) {
      const num = kit ? DRUM_MIDI[n.pitch as DrumHit] : pitchToMidi(n.pitch);
      if (num === undefined || num === null) continue;
      track.addNote({ midi: num, ticks: Math.round(n.start * ppq), durationTicks: Math.max(1, Math.round(n.length * ppq)), velocity: n.velocity ?? 0.8 });
    }
  }
  return midi.toArray();
}

/** 16-bit stereo WAV, turned up so its loudest moment sits just under full volume. */
export function toWav(buf: AudioBuffer): Blob {
  const channels = [buf.getChannelData(0), buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0)];
  let peak = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]!));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const frames = buf.length;
  const data = new DataView(new ArrayBuffer(44 + frames * 4));
  const text = (at: number, s: string) => [...s].forEach((c, i) => data.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  data.setUint32(4, 36 + frames * 4, true);
  text(8, "WAVEfmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 2, true);
  data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * 4, true);
  data.setUint16(32, 4, true);
  data.setUint16(34, 16, true);
  text(36, "data");
  data.setUint32(40, frames * 4, true);
  for (let i = 0, at = 44; i < frames; i++) {
    for (const ch of channels) {
      data.setInt16(at, Math.round(Math.max(-1, Math.min(1, ch[i]! * gain)) * 32767), true);
      at += 2;
    }
  }
  return new Blob([data.buffer], { type: "audio/wav" });
}

/** Hands the browser a file to save. */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
