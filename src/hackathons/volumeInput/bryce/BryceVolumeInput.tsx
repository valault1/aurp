import { Box, Button, Slider, Typography, useTheme, alpha } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MicGate, useMicAnalyser } from "./useMicAnalyser";
import { CommittedValue, GamePanel, levelColor } from "./shared";
import { useMasterVolume } from "./VolumeContext";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Run `cb(dtMs)` every animation frame while `active`. */
function useRaf(active: boolean, cb: (dtMs: number, nowMs: number) => void) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      cbRef.current(dt, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

// ============================================================================
// V1 — SUSTAINED SCREAM METER
// Hold your loudness inside the target band for 2 full seconds. The needle
// wobbles to fight you, and going too loud overshoots and resets the timer.
// ============================================================================
const SCREAM_TOL = 7; // half-width of the target band
const SCREAM_OVER = 6; // how far above the band counts as "too loud"
const SCREAM_HOLD_MS = 2000;
const METER_H = 280;

export function BryceVolumeInputV1() {
  const theme = useTheme();
  const mic = useMicAnalyser();

  const [target, setTarget] = useState(50);
  const [needle, setNeedle] = useState(0);
  const [holdMs, setHoldMs] = useState(0);
  const [status, setStatus] = useState<"idle" | "holding" | "tooloud" | "locked">("idle");
  const [locked, setLocked] = useState<number | null>(null);

  const targetRef = useRef(target);
  const holdRef = useRef(0);
  const lockedRef = useRef(false);
  targetRef.current = target;

  const { setVolume, setSource } = useMasterVolume();
  useEffect(() => {
    if (locked != null) {
      setVolume(locked);
      setSource("Scream Meter");
    }
  }, [locked, setVolume, setSource]);

  const unlock = useCallback(() => {
    setLocked(null);
    setStatus("idle");
    holdRef.current = 0;
    lockedRef.current = false;
    setHoldMs(0);
  }, []);

  useRaf(mic.ready, (dt, now) => {
    if (lockedRef.current) return;
    const lvl = mic.getLevel() * 100;
    const wobble = Math.sin(now / 90) * 2.4 + Math.sin(now / 37) * 1.6;
    const shown = clamp(lvl + wobble, 0, 100);
    setNeedle(shown);

    const t = targetRef.current;
    if (shown > t + SCREAM_TOL + SCREAM_OVER) {
      holdRef.current = 0;
      setStatus("tooloud");
    } else if (shown >= t - SCREAM_TOL && shown <= t + SCREAM_TOL) {
      holdRef.current += dt;
      setStatus("holding");
      if (holdRef.current >= SCREAM_HOLD_MS) {
        lockedRef.current = true;
        setLocked(t);
        setStatus("locked");
      }
    } else {
      holdRef.current = Math.max(0, holdRef.current - dt * 0.8);
      setStatus("idle");
    }
    setHoldMs(holdRef.current);
  });

  const bandBottom = (clamp(target - SCREAM_TOL, 0, 100) / 100) * METER_H;
  const bandTop = (clamp(target + SCREAM_TOL, 0, 100) / 100) * METER_H;
  const holdPct = clamp(holdMs / SCREAM_HOLD_MS, 0, 1);

  const statusText =
    status === "locked"
      ? `🔒 Locked at ${locked}!`
      : status === "tooloud"
        ? "📢 TOO LOUD — ease off!"
        : status === "holding"
          ? `Holding… ${(holdMs / 1000).toFixed(1)}s`
          : "Scream to match your target";

  return (
    <GamePanel
      title="Scream to Set 🎚️"
      subtitle="Pick your target, then hold your voice inside its band for 2 seconds to lock it. The needle wobbles, and overshooting resets you."
    >
      <MicGate
        mic={mic}
        title="Scream Meter"
        hint="We'll read your loudness live. Find the band and sustain a steady tone — not too loud!"
      >
        <Box sx={{ display: "flex", gap: 3, alignItems: "stretch" }}>
          {/* vertical meter */}
          <Box
            sx={{
              position: "relative",
              width: 88,
              height: METER_H,
              borderRadius: 3,
              overflow: "hidden",
              border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
              background: alpha(theme.palette.text.primary, 0.04),
              flexShrink: 0,
            }}
          >
            {/* target band */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: bandBottom,
                height: Math.max(2, bandTop - bandBottom),
                background: alpha(theme.palette.success.main, 0.28),
                borderTop: `2px dashed ${theme.palette.success.main}`,
                borderBottom: `2px dashed ${theme.palette.success.main}`,
              }}
            />
            {/* live fill */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: (needle / 100) * METER_H,
                background: `linear-gradient(180deg, ${alpha(levelColor(needle), 0.95)}, ${alpha(
                  levelColor(needle),
                  0.4,
                )})`,
                transition: "height 60ms linear",
              }}
            />
            {/* needle line */}
            <Box
              sx={{
                position: "absolute",
                left: -4,
                right: -4,
                bottom: (needle / 100) * METER_H,
                height: 3,
                background: "#fff",
                boxShadow: `0 0 8px #fff`,
              }}
            />
          </Box>

          {/* right column */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                YOUR TARGET
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Slider
                  value={target}
                  onChange={(_, v) => setTarget(v as number)}
                  disabled={locked != null}
                  min={0}
                  max={100}
                  sx={{ flex: 1 }}
                />
                <Typography sx={{ fontSize: 30, fontWeight: 900, minWidth: 44, textAlign: "right" }}>
                  {target}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color:
                    status === "tooloud"
                      ? "error.main"
                      : status === "locked"
                        ? "success.main"
                        : "text.primary",
                }}
              >
                {statusText}
              </Typography>
              {/* hold progress */}
              <Box
                sx={{
                  height: 10,
                  borderRadius: 5,
                  overflow: "hidden",
                  background: alpha(theme.palette.text.primary, 0.08),
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${holdPct * 100}%`,
                    background: holdPct > 0.7 ? theme.palette.success.main : theme.palette.primary.main,
                    transition: "width 60ms linear",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <CommittedValue value={locked} locked={locked != null} />

        {locked != null && (
          <Button fullWidth variant="outlined" onClick={unlock} sx={{ borderRadius: "100px", fontWeight: 700, mt: 2 }}>
            Set a different value
          </Button>
        )}
      </MicGate>
    </GamePanel>
  );
}

// ============================================================================
// V2 — PITCH SCRUB / LOUDNESS COMMIT  ("Hum & Stamp")
// Two independent axes: PITCH dials the value (hum low→high), LOUDNESS commits
// it (a loud, sustained shout). Quiet humming stays well below the shout zone,
// so dialing the value never commits by accident.
// ============================================================================
const PITCH_MIN = 120; // Hz → 0
const PITCH_MAX = 360; // Hz → 100
const SCRUB_MAX_LVL = 0.55; // hum at/below this loudness to dial the value
const COMMIT_LVL = 0.82; // get this loud (and hold) to stamp it
const COMMIT_MS = 900;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function hzToNote(hz: number): string {
  if (hz <= 0) return "—";
  const n = Math.round(12 * Math.log2(hz / 440) + 69);
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

export function BryceVolumeInputV2() {
  const theme = useTheme();
  const mic = useMicAnalyser();

  const [scrub, setScrub] = useState(0);
  const [note, setNote] = useState("—");
  const [loud, setLoud] = useState(0); // live loudness 0..1 for the meter
  const [charge, setCharge] = useState(0);
  const [locked, setLocked] = useState<number | null>(null);

  const scrubRef = useRef(0);
  const chargeRef = useRef(0);
  const lockedRef = useRef(false);

  const { setVolume, setSource } = useMasterVolume();
  useEffect(() => {
    if (locked != null) {
      setVolume(locked);
      setSource("Hum & Stamp");
    }
  }, [locked, setVolume, setSource]);

  useRaf(mic.ready, (dt) => {
    if (lockedRef.current) return;
    const lvl = mic.getLevel();
    const pitch = mic.getPitch();
    setLoud(lvl);

    if (lvl >= COMMIT_LVL) {
      // Loud + sustained → commit. Value is frozen while you shout.
      chargeRef.current += dt;
      if (chargeRef.current >= COMMIT_MS) {
        lockedRef.current = true;
        setLocked(Math.round(scrubRef.current));
      }
    } else {
      // Not shouting → charge bleeds away fast, so a brief noise won't lock.
      chargeRef.current = Math.max(0, chargeRef.current - dt * 2);
      // Quiet humming dials the value by pitch.
      if (lvl > 0.08 && lvl <= SCRUB_MAX_LVL && pitch > 0) {
        const v = clamp(((pitch - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * 100, 0, 100);
        scrubRef.current = scrubRef.current + (v - scrubRef.current) * 0.2;
        setScrub(scrubRef.current);
        setNote(hzToNote(pitch));
      }
    }
    setCharge(clamp(chargeRef.current / COMMIT_MS, 0, 1));
  });

  const reset = () => {
    lockedRef.current = false;
    chargeRef.current = 0;
    scrubRef.current = 0;
    setScrub(0);
    setCharge(0);
    setNote("—");
    setLoud(0);
    setLocked(null);
  };

  const inShoutZone = loud >= COMMIT_LVL;

  return (
    <GamePanel
      title="Hum & Stamp 🎵"
      subtitle="Two different things! Hum low→high to dial the number (pitch). When it's right, SHOUT and hold to stamp it (loudness)."
    >
      <MicGate
        mic={mic}
        title="Pitch Scrubber"
        hint="Quiet humming slides the value by pitch. A loud, held shout locks it in. Watch the two meters — they move independently."
      >
        {/* ① PITCH axis — dials the value */}
        <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, fontWeight: 700 }}>
          ① PITCH — dials the value
        </Typography>
        <Box sx={{ mt: 0.5, mb: 0.5 }}>
          <Box
            sx={{
              position: "relative",
              height: 56,
              borderRadius: 3,
              background: `linear-gradient(90deg, ${alpha("#4ade80", 0.25)}, ${alpha("#fbbf24", 0.25)}, ${alpha(
                "#f87171",
                0.25,
              )})`,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `calc(${clamp(scrub, 0, 100)}% - 3px)`,
                width: 6,
                background: "#fff",
                boxShadow: "0 0 10px #fff",
                transition: "left 70ms linear",
              }}
            />
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: 24, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                {Math.round(scrub)}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            note: <b>{note}</b> · low hum → 0, high hum → 100
          </Typography>
        </Box>

        {/* ② LOUDNESS axis — shout to lock */}
        <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1, fontWeight: 700 }}>
          ② LOUDNESS — shout past the line to lock
        </Typography>
        <Box
          sx={{
            position: "relative",
            height: 34,
            mt: 0.5,
            borderRadius: 2,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
            background: alpha(theme.palette.text.primary, 0.06),
          }}
        >
          {/* shaded shout zone */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${COMMIT_LVL * 100}%`,
              right: 0,
              background: alpha(theme.palette.error.main, 0.18),
              borderLeft: `2px dashed ${theme.palette.error.main}`,
            }}
          />
          {/* live loudness fill */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${clamp(loud * 100, 0, 100)}%`,
              background: alpha(inShoutZone ? theme.palette.error.main : theme.palette.primary.main, 0.7),
              transition: "width 60ms linear",
            }}
          />
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", pr: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: theme.palette.error.main }}>
              SHOUT →
            </Typography>
          </Box>
        </Box>

        {/* lock charge */}
        <Typography variant="caption" sx={{ color: "text.secondary", mt: 1.5, display: "block" }}>
          {inShoutZone ? "🔒 holding the shout…" : "lock charge"}
        </Typography>
        <Box
          sx={{
            height: 10,
            mt: 0.5,
            borderRadius: 5,
            overflow: "hidden",
            background: alpha(theme.palette.text.primary, 0.08),
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${charge * 100}%`,
              background: theme.palette.success.main,
              transition: "width 60ms linear",
            }}
          />
        </Box>

        <CommittedValue value={locked} locked={locked != null} />

        {locked != null && (
          <Button fullWidth variant="outlined" onClick={reset} sx={{ borderRadius: "100px", fontWeight: 700, mt: 2 }}>
            Re-scrub
          </Button>
        )}
      </MicGate>
    </GamePanel>
  );
}

// ============================================================================
// V3 — CLAP COUNTER
// Each clap is +10. Hum to creep +1 for the in-betweens. Want 73? Good luck.
// ============================================================================
const CLAP_THRESH = 0.5;
const CLAP_COOLDOWN = 280; // ms
const CREEP_INTERVAL = 320; // ms per +1 while humming

export function BryceVolumeInputV3() {
  const theme = useTheme();
  const mic = useMicAnalyser();
  const { volume: masterVolume, setVolume, setSource } = useMasterVolume();

  // Start the counter at the current master volume so opening this tab is
  // continuous (doesn't slam the music to 0). Clapping/humming adjusts from here.
  const [value, setValue] = useState(masterVolume);
  const [flash, setFlash] = useState(0); // increments to trigger ripple
  const valueRef = useRef(masterVolume);
  const lastClapRef = useRef(0);
  const armedRef = useRef(true);
  const creepAccRef = useRef(0);

  useEffect(() => {
    setVolume(value);
    setSource("Clap Counter");
  }, [value, setVolume, setSource]);

  const bump = (delta: number) => {
    valueRef.current = clamp(valueRef.current + delta, 0, 100);
    setValue(valueRef.current);
  };

  useRaf(mic.ready, (dt, now) => {
    const raw = mic.getRaw();
    const lvl = mic.getLevel();

    // Clap = sharp transient with a rising edge + cooldown.
    if (raw > CLAP_THRESH && armedRef.current && now - lastClapRef.current > CLAP_COOLDOWN) {
      armedRef.current = false;
      lastClapRef.current = now;
      bump(10);
      setFlash((f) => f + 1);
    }
    if (raw < CLAP_THRESH * 0.5) armedRef.current = true;

    // Hum (sustained, moderate, not a clap) creeps +1.
    if (raw < CLAP_THRESH && lvl > 0.22 && lvl < 0.6) {
      creepAccRef.current += dt;
      if (creepAccRef.current >= CREEP_INTERVAL) {
        creepAccRef.current = 0;
        bump(1);
      }
    } else {
      creepAccRef.current = 0;
    }
  });

  const reset = () => {
    valueRef.current = 0;
    setValue(0);
  };

  return (
    <GamePanel
      title="Clap It Out 👏"
      subtitle="Every clap is +10. Hum a steady tone to creep up by 1. Landing on an exact number is your problem."
    >
      <MicGate
        mic={mic}
        title="Clap Counter"
        hint="Clap sharply for +10 each. Need the in-betweens? Hum to nudge up by 1 at a time."
      >
        <Box sx={{ position: "relative", textAlign: "center", py: 2 }}>
          <AnimatePresence>
            <motion.div
              key={flash}
              initial={{ scale: 0.4, opacity: 0.5 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 80,
                height: 80,
                marginLeft: -40,
                marginTop: -40,
                borderRadius: "50%",
                border: `3px solid ${theme.palette.primary.main}`,
              }}
            />
          </AnimatePresence>
          <Typography sx={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: levelColor(value) }}>
            {Math.round(value)}
          </Typography>
        </Box>

        {/* 10-segment ladder */}
        <Box sx={{ display: "flex", gap: 0.75, mt: 1 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const on = value >= (i + 1) * 10;
            const partial = !on && value > i * 10;
            return (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: 16,
                  borderRadius: 1,
                  background: on
                    ? theme.palette.primary.main
                    : partial
                      ? alpha(theme.palette.primary.main, 0.4)
                      : alpha(theme.palette.text.primary, 0.08),
                  transition: "background 120ms ease",
                }}
              />
            );
          })}
        </Box>

        <CommittedValue value={value} locked={false} />

        <Button fullWidth variant="outlined" onClick={reset} sx={{ borderRadius: "100px", fontWeight: 700, mt: 2 }}>
          Reset to 0
        </Button>
      </MicGate>
    </GamePanel>
  );
}

// ============================================================================
// V4 — VOLUME HAGGLING (no mic)
// A grumpy merchant sells you loudness. Make offers, suffer counteroffers,
// settle on a price that is almost never the number you wanted.
// ============================================================================
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)] ?? arr[0]!;

function merchantLine(gap: number, deal: boolean): string {
  if (deal) return pick(["Fine. FINE. Sold. Get out of my shop.", "Ugh, deal. You drive a hard bargain, kid."]);
  if (gap > 35) return pick(["Are you INSULTING me? That's robbery!", "Ha! In this economy? Absolutely not."]);
  if (gap > 15) return pick(["Pfft. You're not even close.", "I have a family of decibels to feed."]);
  if (gap > 6) return pick(["Hmm. We're getting warmer, I suppose.", "Meet me halfway and stop wasting my time."]);
  return pick(["...you're killing me. Almost.", "Tch. So close I can taste it."]);
}

export function BryceVolumeInputV4() {
  const theme = useTheme();

  const [fair] = useState(() => Math.round(rand(35, 85)));
  const [yourOffer, setYourOffer] = useState(50);
  const [merchant, setMerchant] = useState(() => Math.round(rand(80, 98)));
  const [round, setRound] = useState(0);
  const [line, setLine] = useState("So. You want some VOLUME. It'll cost you.");
  const [settled, setSettled] = useState<number | null>(null);

  const { setVolume, setSource } = useMasterVolume();
  useEffect(() => {
    if (settled != null) {
      setVolume(settled);
      setSource("Haggle");
    }
  }, [settled, setVolume, setSource]);

  const makeOffer = () => {
    if (settled != null) return;
    const gap = Math.abs(yourOffer - merchant);
    const nextRound = round + 1;
    setRound(nextRound);

    if (gap <= 4) {
      const price = Math.round((yourOffer + merchant) / 2);
      setMerchant(price);
      setSettled(price);
      setLine(merchantLine(gap, true));
      return;
    }
    if (nextRound >= 8) {
      setSettled(merchant);
      setLine("I'm too old for this. Take it at my price.");
      return;
    }
    // Merchant drifts toward a blend of the fair price and your offer, but
    // anchors stubbornly high and never undercuts the fair price by much.
    const desired = fair * 0.55 + yourOffer * 0.45;
    let next = merchant + (desired - merchant) * 0.45 + rand(-2, 3);
    next = Math.max(fair * 0.9, next);
    next = clamp(Math.round(next), 0, 100);
    setMerchant(next);
    setLine(merchantLine(Math.abs(yourOffer - next), false));
  };

  const acceptHis = () => {
    if (settled != null) return;
    setSettled(merchant);
    setLine("Smart choice. Pleasure doing business.");
  };

  const walkAway = () => {
    setSettled(null);
    setYourOffer(50);
    setMerchant(Math.round(rand(80, 98)));
    setRound(0);
    setLine("Back again? Fine. Make me an offer.");
  };

  return (
    <GamePanel
      title="Haggle for Volume 🪙"
      subtitle="The merchant sets the price of loudness. Negotiate. You will not get exactly what you want."
      width={520}
    >
      {/* merchant */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          p: 2,
          mb: 3,
          borderRadius: 3,
          background: alpha(theme.palette.secondary.main, 0.1),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
        }}
      >
        <Box sx={{ fontSize: 44, lineHeight: 1 }}>🧔</Box>
        <Box sx={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <Typography variant="body1" sx={{ fontStyle: "italic", fontWeight: 600 }}>
                “{line}”
              </Typography>
            </motion.div>
          </AnimatePresence>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            His price: <b>{merchant}</b> · Round {round}/8
          </Typography>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1 }}>
        YOUR OFFER
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Slider
          value={yourOffer}
          onChange={(_, v) => setYourOffer(v as number)}
          disabled={settled != null}
          min={0}
          max={100}
          sx={{ flex: 1 }}
        />
        <Typography sx={{ fontSize: 28, fontWeight: 900, minWidth: 56, textAlign: "right" }}>{yourOffer}</Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
        {settled == null ? (
          <>
            <Button variant="contained" onClick={makeOffer} sx={{ borderRadius: "100px", fontWeight: 700, flex: 1 }}>
              Make offer
            </Button>
            <Button variant="outlined" onClick={acceptHis} sx={{ borderRadius: "100px", fontWeight: 700 }}>
              Accept {merchant}
            </Button>
          </>
        ) : (
          <Button variant="outlined" fullWidth onClick={walkAway} sx={{ borderRadius: "100px", fontWeight: 700 }}>
            Haggle again
          </Button>
        )}
      </Box>

      <CommittedValue value={settled} locked={settled != null} />
    </GamePanel>
  );
}

// ============================================================================
// V5 — PLINKO
// Pick a drop position. Release. The chip bounces through the pegs and the
// slot it lands in is your volume. You only control where it starts.
// ============================================================================
const PLINKO_W = 380;
const PLINKO_H = 440;
const PEG_ROWS = 9;
const PEG_R = 5;
const CHIP_R = 8;
const BIN_COUNT = 10; // → values 5,15,...,95 (bin centers)
const GRAVITY = 0.32;
const RESTITUTION = 0.62;

export function BryceVolumeInputV5() {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dropX, setDropX] = useState(50); // percent across the top
  const [falling, setFalling] = useState(false);
  const [committed, setCommitted] = useState<number | null>(null);

  const { setVolume, setSource } = useMasterVolume();
  useEffect(() => {
    if (committed != null) {
      setVolume(committed);
      setSource("Plinko");
    }
  }, [committed, setVolume, setSource]);

  // physics state in refs so the rAF loop owns it
  const chipRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const fallingRef = useRef(false);
  const primaryRef = useRef(theme.palette.primary.main);
  primaryRef.current = theme.palette.primary.main;

  // Precompute peg + bin geometry once.
  const pegsRef = useRef<{ x: number; y: number }[]>([]);
  if (pegsRef.current.length === 0) {
    const pegs: { x: number; y: number }[] = [];
    const topPad = 70;
    const rowGap = (PLINKO_H - topPad - 70) / (PEG_ROWS - 1);
    for (let r = 0; r < PEG_ROWS; r++) {
      const count = 3 + r;
      const colGap = PLINKO_W / (count + 1);
      for (let c = 0; c < count; c++) {
        pegs.push({ x: colGap * (c + 1), y: topPad + r * rowGap });
      }
    }
    pegsRef.current = pegs;
  }

  const binValue = (binIdx: number) => Math.round(((binIdx + 0.5) / BIN_COUNT) * 100);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PLINKO_W, PLINKO_H);

    // bins
    const binW = PLINKO_W / BIN_COUNT;
    for (let i = 0; i < BIN_COUNT; i++) {
      ctx.fillStyle = alpha(levelColor(binValue(i)), 0.18);
      ctx.fillRect(i * binW + 1, PLINKO_H - 46, binW - 2, 46);
      ctx.fillStyle = alpha(theme.palette.text.primary, 0.7);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(binValue(i)), i * binW + binW / 2, PLINKO_H - 18);
    }
    // bin dividers
    ctx.strokeStyle = alpha(theme.palette.text.primary, 0.15);
    ctx.lineWidth = 1;
    for (let i = 0; i <= BIN_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * binW, PLINKO_H - 46);
      ctx.lineTo(i * binW, PLINKO_H);
      ctx.stroke();
    }

    // pegs
    ctx.fillStyle = alpha(theme.palette.text.primary, 0.45);
    for (const p of pegsRef.current) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // chip (live or parked at drop position)
    const chip = chipRef.current;
    const cx = chip ? chip.x : (dropX / 100) * PLINKO_W;
    const cy = chip ? chip.y : 26;
    ctx.beginPath();
    ctx.arc(cx, cy, CHIP_R, 0, Math.PI * 2);
    ctx.fillStyle = primaryRef.current;
    ctx.shadowColor = primaryRef.current;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [dropX, theme.palette.text.primary]);

  // redraw when idle (drop position changes)
  useEffect(() => {
    if (!fallingRef.current) draw();
  }, [draw]);

  useRaf(falling, () => {
    const chip = chipRef.current;
    if (!chip) return;

    chip.vy += GRAVITY;
    chip.x += chip.vx;
    chip.y += chip.vy;

    // walls
    if (chip.x < CHIP_R) {
      chip.x = CHIP_R;
      chip.vx = Math.abs(chip.vx) * RESTITUTION;
    } else if (chip.x > PLINKO_W - CHIP_R) {
      chip.x = PLINKO_W - CHIP_R;
      chip.vx = -Math.abs(chip.vx) * RESTITUTION;
    }

    // pegs
    for (const p of pegsRef.current) {
      const dx = chip.x - p.x;
      const dy = chip.y - p.y;
      const dist = Math.hypot(dx, dy);
      const min = PEG_R + CHIP_R;
      if (dist < min && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        // push out
        chip.x = p.x + nx * min;
        chip.y = p.y + ny * min;
        // reflect velocity about the normal
        const vDotN = chip.vx * nx + chip.vy * ny;
        chip.vx = (chip.vx - 2 * vDotN * nx) * RESTITUTION;
        chip.vy = (chip.vy - 2 * vDotN * ny) * RESTITUTION;
        // a little chaos so identical drops diverge
        chip.vx += rand(-0.8, 0.8);
      }
    }

    // settle into a bin
    if (chip.y > PLINKO_H - 46 - CHIP_R) {
      chip.y = PLINKO_H - 46 - CHIP_R;
      chip.vy *= -RESTITUTION * 0.5;
      chip.vx *= 0.7;
      if (Math.abs(chip.vy) < 1.2 && Math.abs(chip.vx) < 1.2) {
        const binW = PLINKO_W / BIN_COUNT;
        const binIdx = clamp(Math.floor(chip.x / binW), 0, BIN_COUNT - 1);
        fallingRef.current = false;
        setFalling(false);
        setCommitted(binValue(binIdx));
        chipRef.current = null;
      }
    }

    draw();
  });

  const drop = () => {
    if (fallingRef.current) return;
    setCommitted(null);
    chipRef.current = { x: (dropX / 100) * PLINKO_W, y: 26, vx: rand(-0.4, 0.4), vy: 0 };
    fallingRef.current = true;
    setFalling(true);
  };

  return (
    <GamePanel
      title="Volume Plinko 🎰"
      subtitle="Pick where to drop the chip. Physics does the rest. Whatever slot it lands in is your volume."
      width={460}
    >
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Box
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
            background: alpha(theme.palette.text.primary, 0.03),
          }}
        >
          <canvas ref={canvasRef} width={PLINKO_W} height={PLINKO_H} style={{ display: "block" }} />
        </Box>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1 }}>
          DROP POSITION
        </Typography>
        <Slider
          value={dropX}
          onChange={(_, v) => setDropX(v as number)}
          disabled={falling}
          min={0}
          max={100}
        />
      </Box>

      <Button
        fullWidth
        variant="contained"
        onClick={drop}
        disabled={falling}
        sx={{ borderRadius: "100px", fontWeight: 700, mt: 1 }}
      >
        {falling ? "Dropping…" : committed != null ? "Drop again" : "Drop the chip"}
      </Button>

      <CommittedValue value={committed} locked={committed != null} />
    </GamePanel>
  );
}
