# Context: Bryce's music (Snug songs)

Read and keep this file current when changing this folder. Be concise.

## Goal
Cozy songs for the Snug quilt game. v1 is `SnugStudio.tsx`: pick a song from the dropdown; v2 and v3 are unused.

## Editing a song (for AI agents)
- Songs are data in `songs/*.ts` typed `SnugSong` (`snugSong.ts`): Val's format (`../song.ts`, beats are quarter notes) with a `mood` line, an optional `swing` (0 to 1), and a `sound` per track instead of `instrument`.
- Keep the exact layout `snugToCode` (`snugCode.ts`) emits, so "Copy as code" pastes back cleanly. New song: add `songs/<name>.ts` and register it in `songs/index.ts`.
- Style: Animal Crossing (GameCube) hourly music: 7th and 9th chords, offbeat electric piano, vibes or marimba leads, light kits. Melodies are original.
- Sounds: `musicbox | celesta | kalimba | vibes | marimba | felt | epiano | ocarina | pizz | warmpad | softbass | pluckbass | brushes | hand | weather`, all synthesized in `snugPlayer.ts` through one soft room (reverb).
- Kits use the drum rows (kick, snare, clap, hat, openhat):
  - `brushes`: soft kick, brush swish, wood tick, shaker, long shaker.
  - `hand`: low conga, bongo, rim click, shaker, cabasa.
  - `weather`: far thunder, gust, drip on glass, droplet, rain bed. Hold a rain bed for its length; back-to-back beds crossfade. Left out of MIDI.

## Structure
- `snugPlayer.ts`: `SnugPlayer` (Tone transport, looping, swing, `load()` after every edit) and `renderSong` (Tone.Offline, for WAV downloads).
- `SnugStudio.tsx`: song picker, transport, tracks; drafts in `aurp.music.bryce.draft.<id>`. The player is made on first play from the song showing then (`latest` ref).
- `SnugRoll.tsx` (based on Val's piano roll): all melodic tracks on one pitch grid, each kit track in its own strip pinned to the bottom, so nothing hides when you switch tracks. A click on another lane's empty cell makes that lane active; it adds a note only to the active track.
