# Context: Music Hackathon

**CRITICAL RULE FOR ALL AGENTS**: Read and keep this file current when changing this folder. Be concise; delete stale notes.

## Goal
Visualize and play songs. A song is plain data in `songs/*.ts` that a human edits by prompting an AI coding agent ("make the chorus sadder in songs/firstLight.ts"). The app shows it as a piano roll, plays it with Tone.js, and allows hand edits. **The app itself never calls an AI.**

## Editing a song (for AI agents)
- Format is defined in `song.ts` (`Song` → `tracks[]` → `notes[]`). Keep files data-only, in the exact layout `songToCode` (`songCode.ts`) emits, so "Copy as code" output can be pasted back with no diff noise.
- `start`/`length` are in **beats** (quarter notes) from the top of the song; `bars * beatsPerBar` is the loop length, and notes past it never play. `velocity` (0–1) is optional.
- `pitch` is a note name with octave (`"C4"`, `"F#3"`, `"Bb2"`). The piano roll shows C2–C7. On `instrument: "drums"` tracks, pitch is one of `kick | snare | clap | hat | openhat`.
- Instruments: `lead | keys | pluck | pad | bass | drums`, all synthesized in `player.ts`, with no samples. `volume` is the track's gain in dB.
- New song: add `songs/<name>.ts` (export const `<name>`, matching the file name) and register it in `songs/index.ts`.

## Structure
- `Music.tsx`: orchestrator (`/music/:competitor/:iteration`). `ValMusic.tsx` / `bryce/BryceMusic.tsx` export V1–V3.
- Shared: `song.ts` (types and pitch helpers), `player.ts` (`SongPlayer`: Tone transport, looping, `load()` after every edit, `beat`, `seek`, `preview`, `spectrum`), `songCode.ts` (to TS code, to/from `.mid` via `@tonejs/midi`).
- **Val V1** (`val/SongStudio.tsx` + `val/PianoRoll.tsx`): song picker, play/pause/stop, BPM, bars, zoom, per-track mute, spectrum bars, piano roll editing (click to add, drag to move or resize, double-click or right-click to delete, Ctrl+Z, Space), Copy as code, MIDI export and import. UI edits are a localStorage draft (`aurp.music.draft.<id>`) that is dropped when the song file changes.
- Bryce V1–V3: placeholders.
