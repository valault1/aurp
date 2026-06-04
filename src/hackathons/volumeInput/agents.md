# Context: Volume Input Competition

**CRITICAL RULE FOR ALL AGENTS**: 
Always read and proactively update this `agents.md` file whenever making significant architectural or design changes. Delete outdated or solved contexts to keep this concise.

## Goal
The goal of this competition folder is to design a unique, innovative, and potentially terrible way to input **volume values** (e.g., audio levels, 0-100 sliders). 

## Structure
- Use `VolumeInput.tsx` to orchestrate variations. It holds the `CompetitionToggle`, which seamlessly switches between Val and Bryce and supports tracking "iterations" (e.g., v1, v2).
- **Each competitor keeps their files in their own subfolder** so they don't mix. Bryce's live in `bryce/`; Val's logic is in `ValVolumeInput.tsx` at the folder root (move to a `val/` subfolder if it grows).
- Add "v2", "v3" to the `COMPETITORS` array in `VolumeInput.tsx` to compare multiple approaches for the same person.
- **IMPORTANT**: When tracking iterations, export separate components (e.g., `BryceVolumeInputV4()` in `bryce/BryceVolumeInput.tsx`) rather than inline `Box` placeholders.

## Master Volume + Player (Bryce only)
This layer is scoped to Bryce's tab — it must NOT appear on Val's. `bryce/BryceVolumeArea.tsx`
owns it: it wraps Bryce's iterations in `VolumeProvider` (`bryce/VolumeContext.tsx` →
`useMasterVolume()`: volume 0–100, `setVolume`, `source` label) and renders
`bryce/GlobalVolumePanel.tsx` ONCE outside the iteration swap (so the YouTube player
never remounts when flipping v1–v6). The panel = a universal volume bar + a YouTube
IFrame-API player whose volume is driven by the master value, so any input audibly
changes the music. Each Bryce input pushes its committed value into the master via an
effect (tagging `source`). The clap counter (V3) starts its count at the current master so switching tabs is continuous.

## Current State (Bryce) — all in `bryce/`
Five iterations, routed via `/volume`. The mic-driven ones share
`bryce/useMicAnalyser.tsx` (one getUserMedia + AnalyserNode + rAF loop exposing
`getLevel` perceptual loudness, `getRaw` linear RMS for transients, `getPitch`
via autocorrelation). `MicGate` is the shared permission wrapper. `bryce/shared.tsx`
holds `GamePanel`, `CommittedValue`, and `levelColor`.
- **V1 Scream Meter** — user picks the target via a slider, then holds loudness in that band 2s to lock; needle wobbles, overshoot resets.
- **V2 Hum & Stamp** — pitch (autocorrelation) dials 0–100; a loud + sustained shout (separate loudness meter with a marked shout zone) commits. Tuned so quiet humming never trips the commit.
- **V3 Clap It Out** — clap = +10 (transient detection), hum = +1 creep.
- **V4 Haggle** — no mic; grumpy merchant counteroffers, settle on a price.
- **V5 Plinko** — canvas physics; pick drop X, the landing bin is the value.
- (Removed: the old Decay Tank — too finicky.)

## Implementations
- **Val V1 (`ValVolumeInputV1`)**: Uses Phaser to implement a gamified "Bounce-to-Volume" input. The user aims and launches a ball to bounce off walls and land on a specific target area. The `x` coordinate of the landing spot maps to a volume value (1-100). The Phaser game is wrapped in a React component and handles StrictMode unmounting with `game.destroy(true)`.
- **Val V2 (`ValVolumeInputV2`)**: Uses Phaser to implement a "Drop-to-Volume" input. A target bar moves back and forth along the bottom. The user drops a ball from the top half of the screen. Where it lands on the bar dictates the volume. Missing loses one of 5 lives, shrinking the bar. 0 lives sets volume to 0.
- **Val V3 (`ValVolumeInputV3`)**: Uses Phaser to implement a "Boombox Proximity" input. An old lady sits in the center of the room. The user drags a loud boombox towards her. The closer the boombox gets, the higher the volume, the angrier her face gets, and the redder the room gets. Sound waves pulse from the boombox. Releasing the drag locks the volume.

## Styling Rules
We are using `framer-motion` for animations and strict Material UI (`@mui/material`) for base styling. We rely heavily on the global `ThemeProvider` with five distinct dark modes (`ice`, `midnight`, `cyberpunk`, `forest`, `sunset`). 
- **DO NOT** use un-themed whites or pure blacks if possible.
- **DO** rely on `background.paper` or `background.default` for layered panels.
- Keep the aesthetic "premium" and glassmorphic where appropriate (`backdrop-filter`).
