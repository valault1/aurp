// synthesized engine audio: saw main osc through a lowpass (throttle opens it), a sub
// octave, turbo-ish whistle and road noise. One manager instance per mounted game.

import { SOUND } from "./tuning";
import { clamp } from "./util";

export function createEngineAudio(car: { idle: number; redline: number }) {
  let audio: AudioContext | null = null, master: GainNode | null = null;
  let oscMain: OscillatorNode | null = null, mainFilter: BiquadFilterNode | null = null, mainGain: GainNode | null = null;
  let oscSub: OscillatorNode | null = null, subGain: GainNode | null = null;
  let noiseGain: GainNode | null = null, whistleFilter: BiquadFilterNode | null = null, whistleGain: GainNode | null = null;
  let soundOn = true;

  function ensure() {
    if (audio || !soundOn) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio = new Ctx();
      master = audio.createGain(); master.gain.value = 0.85; master.connect(audio.destination);
      oscMain = audio.createOscillator(); oscMain.type = "sawtooth"; mainFilter = audio.createBiquadFilter(); mainFilter.type = "lowpass"; mainGain = audio.createGain(); mainGain.gain.value = 0;
      oscMain.connect(mainFilter); mainFilter.connect(mainGain); mainGain.connect(master);
      oscSub = audio.createOscillator(); oscSub.type = "sawtooth"; subGain = audio.createGain(); subGain.gain.value = 0;
      oscSub.connect(subGain); subGain.connect(master);
      const buf = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noiseSrc = audio.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
      const nf = audio.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 900; nf.Q.value = 0.7;
      noiseGain = audio.createGain(); noiseGain.gain.value = 0;
      noiseSrc.connect(nf); nf.connect(noiseGain); noiseGain.connect(master);
      whistleFilter = audio.createBiquadFilter(); whistleFilter.type = "bandpass"; whistleFilter.Q.value = 7; whistleFilter.frequency.value = 2200;
      whistleGain = audio.createGain(); whistleGain.gain.value = 0;
      noiseSrc.connect(whistleFilter); whistleFilter.connect(whistleGain); whistleGain.connect(master);
      oscMain.start(); oscSub.start(); noiseSrc.start();
    } catch { audio = null; }
  }

  function update(rpmIn: number, throttle: number) {
    if (!audio || !mainGain || !oscMain || !mainFilter || !oscSub || !subGain || !whistleGain || !whistleFilter || !noiseGain) return;
    const now = audio.currentTime;
    if (!Number.isFinite(now)) return;
    if (!soundOn) { [mainGain, subGain, whistleGain, noiseGain].forEach((n) => n.gain.setTargetAtTime(0, now, 0.06)); return; }
    const rpm = Number.isFinite(rpmIn) ? rpmIn : car.idle;
    const load = 0.5 + throttle * 0.5;
    const f = SOUND.base + rpm * SOUND.pitch;
    oscMain.frequency.setTargetAtTime(f, now, 0.02);
    mainFilter.frequency.setTargetAtTime(SOUND.cutoff + rpm * SOUND.cutoffPerRpm, now, 0.04);
    mainGain.gain.setTargetAtTime(0.02 + load * 0.05 * (rpm / car.redline + 0.2), now, 0.04);
    oscSub.frequency.setTargetAtTime(f * 0.5, now, 0.02);
    subGain.gain.setTargetAtTime(SOUND.sub * (0.03 + load * 0.035), now, 0.04);
    const spool = clamp((rpm - 1800) / 3200, 0, 1);
    whistleFilter.frequency.setTargetAtTime(1400 + rpm * 0.2, now, 0.06);
    whistleGain.gain.setTargetAtTime(SOUND.whistle * throttle * spool * 0.1, now, 0.06);
    noiseGain.gain.setTargetAtTime(SOUND.noise * (0.008 + load * 0.02), now, 0.03);
  }

  function resume() { if (audio && audio.state === "suspended") audio.resume(); }

  return {
    ensure, update, resume,
    get on() { return soundOn; },
    toggle() { soundOn = !soundOn; if (soundOn) { ensure(); resume(); } return soundOn; },
    dispose() { if (audio) audio.close(); },
  };
}
