import * as Tone from "tone";
import type { DrumHit, Note } from "../song";
import type { SnugSong, SnugSound } from "./snugSong";

type PartEvent = { time: string; note: Note };

interface Voice {
  output: Tone.Volume;
  play(pitch: string, seconds: number, time: number, velocity: number): void;
  dispose(): void;
}

/** A melodic sound: the synth runs through `fx` (in order) into the track's volume. */
function melodic(output: Tone.Volume, synth: Tone.PolySynth, fx: Tone.ToneAudioNode[] = []): Voice {
  synth.chain(...fx, output);
  return {
    output,
    play: (pitch, seconds, time, velocity) => synth.triggerAttackRelease(pitch, seconds, time, velocity),
    dispose: () => [synth, ...fx, output].forEach((n) => n.dispose()),
  };
}

function brushes(output: Tone.Volume): Voice {
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 3, envelope: { attack: 0.002, decay: 0.35, sustain: 0, release: 0.1 }, volume: -10 });
  const swishFilter = new Tone.Filter(2600, "bandpass").connect(output);
  const swish = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.02, decay: 0.28, sustain: 0 }, volume: -6 }).connect(swishFilter);
  const wood = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.04 }, volume: -12 });
  const shakeFilter = new Tone.Filter(6500, "highpass").connect(output);
  const shake = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.004, decay: 0.05, sustain: 0 }, volume: -16 }).connect(shakeFilter);
  const longShake = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0 }, volume: -20 }).connect(shakeFilter);
  kick.connect(output);
  wood.connect(output);
  const all = [kick, swish, swishFilter, wood, shake, longShake, shakeFilter];
  const hits: Record<DrumHit, (time: number, velocity: number) => void> = {
    kick: (t, v) => kick.triggerAttackRelease("A1", 0.3, t, v),
    snare: (t, v) => swish.triggerAttackRelease(0.25, t, v),
    clap: (t, v) => wood.triggerAttackRelease("E6", 0.05, t, v),
    hat: (t, v) => shake.triggerAttackRelease(0.05, t, v),
    openhat: (t, v) => longShake.triggerAttackRelease(0.2, t, v),
  };
  return {
    output,
    play: (pitch, _seconds, time, velocity) => hits[pitch as DrumHit]?.(time, velocity),
    dispose: () => [...all, output].forEach((n) => n.dispose()),
  };
}

function hand(output: Tone.Volume): Voice {
  const lowConga = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 1.5, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 }, volume: -6 });
  const bongo = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 1.2, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }, volume: -8 });
  const rim = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 }, volume: -14 });
  const shakeFilter = new Tone.Filter(6000, "highpass").connect(output);
  const shake = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.004, decay: 0.05, sustain: 0 }, volume: -17 }).connect(shakeFilter);
  const cabasa = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.01, decay: 0.14, sustain: 0 }, volume: -19 }).connect(shakeFilter);
  [lowConga, bongo, rim].forEach((s) => s.connect(output));
  const hits: Record<DrumHit, (time: number, velocity: number) => void> = {
    kick: (t, v) => lowConga.triggerAttackRelease("G3", 0.2, t, v),
    snare: (t, v) => bongo.triggerAttackRelease("D4", 0.1, t, v),
    clap: (t, v) => rim.triggerAttackRelease("B6", 0.03, t, v),
    hat: (t, v) => shake.triggerAttackRelease(0.05, t, v),
    openhat: (t, v) => cabasa.triggerAttackRelease(0.14, t, v),
  };
  return {
    output,
    play: (pitch, _seconds, time, velocity) => hits[pitch as DrumHit]?.(time, velocity),
    dispose: () => [lowConga, bongo, rim, shake, cabasa, shakeFilter, output].forEach((n) => n.dispose()),
  };
}

const DROP_HZ = [1100, 1450, 1250, 1800, 1350, 2100, 1550];

/** Rain: openhat is the rain bed (hold it; consecutive beds crossfade), hat a droplet, clap a drip on glass, snare a gust, kick far thunder. */
function weather(output: Tone.Volume): Voice {
  const bedTone = new Tone.AutoFilter({ frequency: 0.07, baseFrequency: 700, octaves: 2, depth: 0.5 }).start();
  const bedBand = new Tone.Filter(250, "highpass").connect(output);
  bedTone.connect(bedBand);
  const hissFilter = new Tone.Filter(4500, "highpass").connect(output);
  const bedEnv = { attack: 2, decay: 0.01, sustain: 1, release: 2, attackCurve: "linear", releaseCurve: "linear" } as const;
  const beds = [0, 1].map(() => new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: bedEnv, volume: -8 }).connect(bedTone));
  const hiss = [0, 1].map(() => new Tone.NoiseSynth({ noise: { type: "white" }, envelope: bedEnv, volume: -26 }).connect(hissFilter));
  const drops = [0, 1, 2, 3].map(() =>
    new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 }, volume: -16 }).connect(output));
  const glass = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 }, volume: -20 }).connect(output);
  const gustFilter = new Tone.Filter({ frequency: 1400, type: "bandpass", Q: 0.7 }).connect(output);
  const gust = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 1.5, decay: 2.5, sustain: 0 }, volume: -10 }).connect(gustFilter);
  const thunderFilter = new Tone.Filter(160, "lowpass").connect(output);
  const thunder = new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.5, decay: 4.5, sustain: 0 }, volume: 2 }).connect(thunderFilter);
  let bed = 0;
  let drop = 0;
  const hits: Record<DrumHit, (time: number, velocity: number, seconds: number) => void> = {
    // Held a second past its length so it is still full while the next bed fades in.
    openhat: (t, v, s) => {
      beds[bed % 2]!.triggerAttackRelease(s + 1, t, v);
      hiss[bed % 2]!.triggerAttackRelease(s + 1, t, v);
      bed++;
    },
    hat: (t, v) => {
      const synth = drops[drop % drops.length]!;
      const hz = DROP_HZ[drop % DROP_HZ.length]!;
      drop++;
      synth.triggerAttackRelease(hz, 0.06, t, v);
      synth.frequency.exponentialRampToValueAtTime(hz * 1.8, t + 0.05);
    },
    clap: (t, v) => glass.triggerAttackRelease("E7", 0.02, t, v),
    snare: (t, v) => gust.triggerAttackRelease(3, t, v),
    kick: (t, v) => thunder.triggerAttackRelease(5, t, v),
  };
  const all = [bedTone, bedBand, hissFilter, ...beds, ...hiss, ...drops, glass, gustFilter, gust, thunderFilter, thunder, output];
  return {
    output,
    play: (pitch, seconds, time, velocity) => hits[pitch as DrumHit]?.(time, velocity, seconds),
    dispose: () => all.forEach((n) => n.dispose()),
  };
}

function makeVoice(sound: SnugSound, dest: Tone.InputNode): Voice {
  const output = new Tone.Volume(0).connect(dest);
  switch (sound) {
    case "musicbox":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 4,
        modulationIndex: 6,
        envelope: { attack: 0.002, decay: 1.6, sustain: 0, release: 1.2 },
        modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.2 },
        volume: -12,
      }));
    case "celesta":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 7,
        modulationIndex: 2,
        envelope: { attack: 0.002, decay: 2.4, sustain: 0, release: 1.5 },
        modulationEnvelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -14,
      }));
    case "kalimba":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 4,
        envelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.6 },
        modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
        volume: -10,
      }));
    case "vibes":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 4,
        modulationIndex: 0.8,
        envelope: { attack: 0.002, decay: 3.2, sustain: 0, release: 2 },
        modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.1 },
        volume: -12,
      }), [new Tone.Tremolo(5, 0.3).start()]);
    case "marimba":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 4,
        modulationIndex: 1.2,
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.4 },
        modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        volume: -8,
      }));
    case "pizz":
      return melodic(output, new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 2, spread: 10 },
        envelope: { attack: 0.003, decay: 0.22, sustain: 0, release: 0.12 },
        volume: -14,
      }), [new Tone.Filter(2000, "lowpass")]);
    case "felt":
      return melodic(output, new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.004, decay: 2.2, sustain: 0.05, release: 0.8 },
        volume: -8,
      }), [new Tone.Filter(1600, "lowpass")]);
    case "epiano":
      return melodic(output, new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 3.5,
        envelope: { attack: 0.003, decay: 2.5, sustain: 0.15, release: 1 },
        modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.1, release: 0.5 },
        volume: -12,
      }), [new Tone.Tremolo(4, 0.25).start()]);
    case "ocarina":
      return melodic(output, new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.06, decay: 0.2, sustain: 0.8, release: 0.35 },
        volume: -12,
      }), [new Tone.Vibrato(5, 0.08)]);
    case "warmpad":
      return melodic(output, new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 18 },
        envelope: { attack: 0.9, decay: 0.6, sustain: 0.8, release: 2.2 },
        volume: -22,
      }), [new Tone.Filter(900, "lowpass"), new Tone.Chorus(0.6, 3, 0.4).start()]);
    case "softbass":
      return melodic(output, new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.015, decay: 0.6, sustain: 0.4, release: 0.4 },
        volume: -6,
      }), [new Tone.Filter(600, "lowpass")]);
    case "pluckbass":
      return melodic(output, new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: "square" },
        filter: { Q: 1, type: "lowpass" },
        filterEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.2, release: 0.2, baseFrequency: 110, octaves: 2.6 },
        envelope: { attack: 0.004, decay: 0.45, sustain: 0.35, release: 0.15 },
        volume: -8,
      }));
    case "brushes":
      return brushes(output);
    case "hand":
      return hand(output);
    case "weather":
      return weather(output);
  }
}

/** Plays a SnugSong on the Tone.js transport, looping, through a soft room. Call `load` again after every edit. */
export class SnugPlayer {
  private voices: { sound: SnugSound; voice: Voice }[] = [];
  private parts: Tone.Part<PartEvent>[] = [];
  private bus = new Tone.Gain(1);
  private room = new Tone.Reverb({ decay: 3.2, wet: 0.24 });
  private fx: Tone.ToneAudioNode[];
  /** Resolves once the room is built; sounds before then are dry. */
  readonly ready: Promise<void>;

  constructor() {
    this.fx = [new Tone.Filter(8000, "lowpass"), this.room, new Tone.Compressor(-18, 3), new Tone.Limiter(-1)];
    this.bus.chain(...this.fx, Tone.getDestination());
    this.ready = this.room.ready;
  }

  load(song: SnugSong, muted: ReadonlySet<number>) {
    const transport = Tone.getTransport();
    this.parts.forEach((p) => p.dispose());
    this.parts = [];

    song.tracks.forEach((t, i) => {
      const slot = this.voices[i];
      if (!slot || slot.sound !== t.sound) {
        slot?.voice.dispose();
        this.voices[i] = { sound: t.sound, voice: makeVoice(t.sound, this.bus) };
      }
      const out = this.voices[i]!.voice.output;
      out.volume.value = t.volume ?? 0;
      out.mute = muted.has(i);
    });
    this.voices.splice(song.tracks.length).forEach((v) => v.voice.dispose());

    const ppq = transport.PPQ;
    const secPerBeat = 60 / song.bpm;
    transport.bpm.value = song.bpm;
    transport.swing = song.swing ?? 0;
    transport.swingSubdivision = "8n";
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
            // A noise hit retriggered at the same instant throws; drop the extra.
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
      this.voices[track]?.voice.play(pitch, 0.4, Tone.now(), 0.8);
    } catch {
      // ignore a retriggered noise hit
    }
  }

  dispose() {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    // The transport is shared with Val's studio, which never sets swing.
    transport.swing = 0;
    this.parts.forEach((p) => p.dispose());
    this.voices.forEach((v) => v.voice.dispose());
    [this.bus, ...this.fx].forEach((n) => n.dispose());
  }
}

/** Plays the song `loops` times into a file-ready buffer, faster than real time, letting the last notes ring out. */
export async function renderSong(song: SnugSong, muted: ReadonlySet<number>, loops = 2): Promise<AudioBuffer> {
  const seconds = (song.bars * song.beatsPerBar * 60 * loops) / song.bpm;
  const buffer = await Tone.Offline(async ({ transport }) => {
    const player = new SnugPlayer();
    await player.ready;
    player.load(song, muted);
    transport.start(0).stop(seconds);
  }, seconds + 4, 2, 44100);
  const out = buffer.get();
  if (!out) throw new Error("Nothing rendered");
  return out;
}
