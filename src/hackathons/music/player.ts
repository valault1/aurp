import * as Tone from "tone";
import type { DrumHit, Instrument, Note, Song } from "./song";

type PartEvent = { time: string; note: Note };

interface Voice {
  output: Tone.Volume;
  play(pitch: string, seconds: number, time: number, velocity: number): void;
  dispose(): void;
}

function melodic(output: Tone.Volume, synth: Tone.PolySynth | Tone.MonoSynth): Voice {
  synth.connect(output);
  return {
    output,
    play: (pitch, seconds, time, velocity) => synth.triggerAttackRelease(pitch, seconds, time, velocity),
    dispose: () => {
      synth.dispose();
      output.dispose();
    },
  };
}

function drums(output: Tone.Volume): Voice {
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 } });
  const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.18, sustain: 0 }, volume: -6 });
  const clap = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -4 });
  const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -22 });
  const openhat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.3, release: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5, volume: -24 });
  const all = [kick, snare, clap, hat, openhat];
  all.forEach((s) => s.connect(output));
  const hits: Record<DrumHit, (time: number, velocity: number) => void> = {
    kick: (t, v) => kick.triggerAttackRelease("C1", 0.3, t, v),
    snare: (t, v) => snare.triggerAttackRelease(0.15, t, v),
    clap: (t, v) => clap.triggerAttackRelease(0.1, t, v),
    hat: (t, v) => hat.triggerAttackRelease(220, 0.05, t, v),
    openhat: (t, v) => openhat.triggerAttackRelease(220, 0.3, t, v),
  };
  return {
    output,
    play: (pitch, _seconds, time, velocity) => hits[pitch as DrumHit]?.(time, velocity),
    dispose: () => {
      all.forEach((s) => s.dispose());
      output.dispose();
    },
  };
}

function makeVoice(kind: Instrument): Voice {
  const output = new Tone.Volume(0).toDestination();
  switch (kind) {
    case "lead":
      return melodic(output, new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle8" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 }, volume: -10 }));
    case "keys":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3, modulationIndex: 2, envelope: { attack: 0.005, decay: 0.6, sustain: 0.2, release: 1 }, volume: -10 }));
    case "pluck":
      return melodic(output, new Tone.PolySynth(Tone.Synth, { oscillator: { type: "square" }, envelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.2 }, volume: -16 }));
    case "pad":
      return melodic(output, new Tone.PolySynth(Tone.AMSynth, { envelope: { attack: 0.4, decay: 0.5, sustain: 0.8, release: 1.5 }, volume: -16 }));
    case "bass":
      return melodic(output, new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        filter: { Q: 2, type: "lowpass" },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 80, octaves: 2.5 },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.3 },
        volume: -10,
      }));
    case "drums":
      return drums(output);
  }
}

/** Plays a Song on the Tone.js transport, looping. Call `load` again after every edit. */
export class SongPlayer {
  private voices: { kind: Instrument; voice: Voice }[] = [];
  private parts: Tone.Part<PartEvent>[] = [];
  private analyser = new Tone.Analyser("fft", 64);

  constructor() {
    Tone.getDestination().connect(this.analyser);
  }

  load(song: Song, muted: ReadonlySet<number>) {
    const transport = Tone.getTransport();
    this.parts.forEach((p) => p.dispose());
    this.parts = [];

    song.tracks.forEach((t, i) => {
      const slot = this.voices[i];
      if (!slot || slot.kind !== t.instrument) {
        slot?.voice.dispose();
        this.voices[i] = { kind: t.instrument, voice: makeVoice(t.instrument) };
      }
      const out = this.voices[i]!.voice.output;
      out.volume.value = t.volume ?? 0;
      out.mute = muted.has(i);
    });
    this.voices.splice(song.tracks.length).forEach((v) => v.voice.dispose());

    const ppq = transport.PPQ;
    const secPerBeat = 60 / song.bpm;
    transport.bpm.value = song.bpm;
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = `${song.bars * song.beatsPerBar * ppq}i`;

    song.tracks.forEach((t, i) => {
      const voice = this.voices[i]!.voice;
      const part = new Tone.Part<PartEvent>(
        (time, { note: n }) => {
          try {
            voice.play(n.pitch, n.length * secPerBeat, time, n.velocity ?? 0.8);
          } catch {
            // Monophonic synths throw on two notes at the exact same instant; drop the extra.
          }
        },
        t.notes.map((n) => ({ time: `${Math.round(n.start * ppq)}i`, note: n })),
      );
      part.start(0);
      this.parts.push(part);
    });
  }

  async play() {
    await Tone.start();
    Tone.getTransport().start();
  }

  pause() {
    Tone.getTransport().pause();
  }

  stop() {
    const transport = Tone.getTransport();
    transport.stop();
    transport.ticks = 0;
  }

  /** Current playhead position in beats. */
  get beat(): number {
    const transport = Tone.getTransport();
    return transport.ticks / transport.PPQ;
  }

  seek(beat: number) {
    const transport = Tone.getTransport();
    transport.ticks = Math.round(beat * transport.PPQ);
  }

  preview(track: number, pitch: string) {
    void Tone.start();
    try {
      this.voices[track]?.voice.play(pitch, 0.3, Tone.now(), 0.8);
    } catch {
      // ignore overlapping preview on a mono synth
    }
  }

  /** FFT bins in decibels, for visualizers. */
  spectrum(): Float32Array {
    return this.analyser.getValue() as Float32Array;
  }

  dispose() {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    this.parts.forEach((p) => p.dispose());
    this.voices.forEach((v) => v.voice.dispose());
    this.analyser.dispose();
  }
}
