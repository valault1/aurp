# Context: Volume Input Competition

**CRITICAL RULE FOR ALL AGENTS**: 
Always read and proactively update this `agents.md` file whenever making significant architectural or design changes. Delete outdated or solved contexts to keep this concise.

## Goal
The goal of this competition folder is to design a unique, innovative, and potentially terrible way to input **volume values** (e.g., audio levels, 0-100 sliders). 

## Structure
- Use `VolumeInput.tsx` to orchestrate variations. It holds the `CompetitionToggle`, which seamlessly switches between Val and Bryce and supports tracking "iterations" (e.g., v1, v2).
- Add your logic primarily to `ValVolumeInput.tsx` or `BryceVolumeInput.tsx`, or break it out into smaller subcomponents within this folder as the components grow.
- Add "v2", "v3" to the `COMPETITORS` array in `VolumeInput.tsx` if you need to easily compare multiple approaches for the same person without deleting existing files.
- **IMPORTANT**: When tracking iterations (v1, v2, etc.), export separate components from the user's file (e.g., `export function ValVolumeInputV2() { ... }` in `ValVolumeInput.tsx`) and import them into `VolumeInput.tsx` to render. Do not use inline `Box` placeholders inside `VolumeInput.tsx`.

## Implementations
- **Val V1 (`ValVolumeInputV1`)**: Uses Phaser to implement a gamified "Bounce-to-Volume" input. The user aims and launches a ball to bounce off walls and land on a specific target area. The `x` coordinate of the landing spot maps to a volume value (1-100). The Phaser game is wrapped in a React component and handles StrictMode unmounting with `game.destroy(true)`.
- **Val V2 (`ValVolumeInputV2`)**: Uses Phaser to implement a "Drop-to-Volume" input. A target bar moves back and forth along the bottom. The user drops a ball from the top half of the screen. Where it lands on the bar dictates the volume. Missing loses one of 5 lives, shrinking the bar. 0 lives sets volume to 0.
- **Val V3 (`ValVolumeInputV3`)**: Uses Phaser to implement a "Boombox Proximity" input. An old lady sits in the center of the room. The user drags a loud boombox towards her. The closer the boombox gets, the higher the volume, the angrier her face gets, and the redder the room gets. Sound waves pulse from the boombox. Releasing the drag locks the volume.

## Styling Rules
We are using `framer-motion` for animations and strict Material UI (`@mui/material`) for base styling. We rely heavily on the global `ThemeProvider` with five distinct dark modes (`ice`, `midnight`, `cyberpunk`, `forest`, `sunset`). 
- **DO NOT** use un-themed whites or pure blacks if possible.
- **DO** rely on `background.paper` or `background.default` for layered panels.
- Keep the aesthetic "premium" and glassmorphic where appropriate (`backdrop-filter`).
