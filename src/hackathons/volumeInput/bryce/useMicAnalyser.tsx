import { Box, Button, Typography, useTheme, alpha } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Shared microphone analyser for the audio-driven volume inputs (V1–V4).
 *
 * One instance owns a getUserMedia stream + AudioContext + AnalyserNode and
 * runs a single rAF sampling loop that keeps three refs hot:
 *   - level  : perceptual loudness 0..1 (dB-mapped, lightly smoothed)
 *   - raw    : instantaneous linear RMS 0..1 (good for transient/clap detection)
 *   - pitch  : dominant frequency in Hz via autocorrelation (0 when too quiet)
 *
 * Components read these through stable getters and run their own render/game
 * loops on top — so the heavy DSP happens once regardless of how the UI draws.
 */
export interface MicAnalyser {
  ready: boolean;
  requesting: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  getLevel: () => number;
  getRaw: () => number;
  getPitch: () => number;
}

// dB window that maps to 0..1. Quiet room ≈ -55dB, a committed shout ≈ -8dB.
const MIN_DB = -55;
const MAX_DB = -8;

function rmsToLevel(rms: number): number {
  if (rms <= 0.00001) return 0;
  const db = 20 * Math.log10(rms);
  const norm = (db - MIN_DB) / (MAX_DB - MIN_DB);
  return Math.max(0, Math.min(1, norm));
}

// Classic autocorrelation pitch detector (McLeod-ish), returns Hz or 0.
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.012) return 0; // too quiet to be a real pitch

  // Trim near-silent head/tail so the ACF locks onto the voiced part.
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }
  const trimmed = buf.subarray(r1, r2);
  const n = trimmed.length;
  if (n < 16) return 0;

  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n - i; j++) sum += trimmed[j] * trimmed[j + i];
    c[i] = sum;
  }

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0) return 0;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  let T0 = maxpos;
  const x1 = c[T0 - 1] ?? 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const freq = sampleRate / T0;
  if (freq < 50 || freq > 1500) return 0;
  return freq;
}

export function useMicAnalyser(): MicAnalyser {
  const [ready, setReady] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  const levelRef = useRef(0);
  const rawRef = useRef(0);
  const pitchRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    analyserRef.current = null;
    levelRef.current = 0;
    rawRef.current = 0;
    pitchRef.current = 0;
    setReady(false);
  }, []);

  const sample = useCallback(() => {
    const analyser = analyserRef.current;
    const buf = bufRef.current;
    const ctx = ctxRef.current;
    if (analyser && buf && ctx) {
      analyser.getFloatTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
      const rms = Math.sqrt(sumSq / buf.length);

      rawRef.current = Math.min(1, rms * 6); // linear, generous gain for transients
      const target = rmsToLevel(rms);
      // Asymmetric smoothing: snap up fast (responsive), fall slower (readable).
      const prev = levelRef.current;
      const k = target > prev ? 0.5 : 0.12;
      levelRef.current = prev + (target - prev) * k;

      // Pitch is expensive — only every 2nd frame, and only when voiced.
      if (frameRef.current % 2 === 0) {
        pitchRef.current = target > 0.08 ? autoCorrelate(buf, ctx.sampleRate) : 0;
      }
      frameRef.current++;
    }
    rafRef.current = requestAnimationFrame(sample);
  }, []);

  const start = useCallback(async () => {
    if (ready || requesting) return;
    setRequesting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      analyserRef.current = analyser;
      bufRef.current = new Float32Array(analyser.fftSize);
      setReady(true);
      rafRef.current = requestAnimationFrame(sample);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission denied. Allow it in your browser to play."
          : "Couldn't open the microphone. Check that one is connected.",
      );
    } finally {
      setRequesting(false);
    }
  }, [ready, requesting, sample]);

  useEffect(() => () => stop(), [stop]);

  const getLevel = useCallback(() => levelRef.current, []);
  const getRaw = useCallback(() => rawRef.current, []);
  const getPitch = useCallback(() => pitchRef.current, []);

  return { ready, requesting, error, start, stop, getLevel, getRaw, getPitch };
}

/** Permission gate shown until the mic is live. Wraps each audio game. */
export function MicGate({
  mic,
  title,
  hint,
  children,
}: {
  mic: MicAnalyser;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  if (mic.ready) return <>{children}</>;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        py: 8,
        px: 4,
        textAlign: "center",
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 34,
            background: alpha(theme.palette.primary.main, 0.12),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
          }}
        >
          🎤
        </Box>
      </motion.div>
      <Typography variant="h5" fontWeight={800}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 360 }}>
        {hint}
      </Typography>
      {mic.error && (
        <Typography variant="body2" sx={{ color: "error.main", maxWidth: 360 }}>
          {mic.error}
        </Typography>
      )}
      <Button
        variant="contained"
        size="large"
        onClick={mic.start}
        disabled={mic.requesting}
        sx={{ mt: 1, borderRadius: "100px", px: 4, fontWeight: 700 }}
      >
        {mic.requesting ? "Requesting…" : mic.error ? "Try again" : "Enable microphone"}
      </Button>
    </Box>
  );
}
