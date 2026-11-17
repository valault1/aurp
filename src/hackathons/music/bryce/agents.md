# Context: Bryce's music (Snug songs)

Read and keep this file current when changing this folder. Be concise.

## Goal
Cozy songs for the Snug quilt game. v1 is `SnugStudio.tsx`: pick a song from the dropdown; v2 and v3 are unused.

## Editing a song (for AI agents)
- Songs are data in `songs/*.ts` typed `SnugSong` (`snugSong.ts`): Val's format (`../song.ts`, beats are quarter notes) with a `mood` line, an optional `swing` (0 to 1), and a `sound` per track instead of `instrument`.
- Keep the exact layout `snugToCode` (`snugCode.ts`) emits, so "Copy as code" pastes back cleanly. New song: add `songs/<name>.ts` and register it in `songs/index.ts`.
- Sounds: `musicbox | celesta | kalimba | vibes | marimba | felt | piano | epiano | ocarina | flute | accordion | mandolin | pizz | warmpad | glow | softbass | pluckbass | brushes | hand | weather`, all synthesized in `snugPlayer.ts` through one soft room (reverb). `piano` and `glow` also have their own long hall.
- Kits use the drum rows (kick, snare, clap, hat, openhat):
  - `brushes`: soft kick, brush swish, wood tick, shaker, long shaker.
  - `hand`: low conga, bongo, rim click, shaker, cabasa.
  - `weather`: far thunder, gust, drip on glass, droplet, rain bed. Hold a rain bed for its length; back-to-back beds crossfade. Left out of MIDI.

## The vibe (Bryce's taste)
Cozy and awake, never sad and never a lullaby. Background music that stays pleasant on repeat.
- Favorites: `tenOClockThread` (bouncy marimba opening, plucked bass, hand drums), `rainOnTheQuilt` (soft, but the tune keeps moving), `emberWaltz` (the waltz lilt, even though it is minor).
- References: Animal Crossing hourly music; Studio Ghibli café waltzes and bright town music (Howl's Moving Castle theme and cooking scene, Kiki's seaside town). Borrow instruments, rhythm and mood, never a melody.
- Chords: plain major triads, 6th, add9 and dominant 7th chords. Minor chords only in passing; a run of minor 7th or 9th chords, or major 7th chords everywhere, turns wistful.
- Melody: phrases climb and bounce and land on the home note; avoid falling phrases that end on a long held note.
- Sounds: plucked or struck leads (marimba, kalimba, pizz, mandolin, accordion). `piano` leads only in a waltz, kept low and quiet. Pads and `felt` only underneath, quietly.
- Movement: a bass that bounces or walks; a light kit or waltz pulse. Tempo about 100 to 120 in 4/4, a waltz near 84 or a café waltz near 148; slower only with a busy, moving tune.
- Length: about 2 to 3 minutes per loop, built from sections (tune, variation, contrast, a rest with no tune, outro) with the lead passed between instruments.
- Disliked: rain sounds, `felt` as a lead, slow sparse songs, anything that feels like remembering better days.

## Structure
- `snugPlayer.ts`: `SnugPlayer` (Tone transport, looping, swing, `load()` after every edit) and `renderSong` (Tone.Offline, for WAV downloads).
- `SnugStudio.tsx`: song picker, transport, tracks; drafts in `aurp.music.bryce.draft.<id>`. The player is made on first play from the song showing then (`latest` ref).
- `SnugRoll.tsx` (based on Val's piano roll): all melodic tracks on one pitch grid, each kit track in its own strip pinned to the bottom, so nothing hides when you switch tracks. A click on another lane's empty cell makes that lane active; it adds a note only to the active track.
