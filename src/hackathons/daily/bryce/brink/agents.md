# Brink (Bryce, Daily v2)

Daily tactics fight in an ink-and-parchment (sumi-e) style: shove ink spirits off a cliff-top plateau. `BryceDailyV2` toggles Play (`Brink.tsx`) and Art sheet (`ArtSheet.tsx`).

- `ink.tsx` — palette (5 ink tones, parchment, vermilion), `brush()` tapered calligraphic stroke, `blob`, `enso`, `arrow`, SVG filters (`brink-rough`, `brink-dry-h/v`, `brink-wash`, `brink-glow`, `brink-face` gradient), date-seeded mountain `inkLandscape` backdrop, `Scroll` panel, `Seal`, `InkButton`, `InkStat`.
- `figures.tsx` — 100 units per cell. `Terrain` (wash, rim strokes heavier on south lips, axe-cut cliff faces, drifting mist), heroes (wanderer/crane/ox), enemies (blot/spitter/brute ink blots), props (pine/boulder/lantern), signals (`Enso`, `MoveDot`, `Threat`, `CellArrow`, `SpitLine`, `Splat`, `Cracks`), `At` to place by cell.
- `engine.ts` — pure rules. 8x8 seeded plateau, 3 heroes (wanderer shove / crane swap / ox charge; abilities target enemies only), 4 spirits (blot, spitter, brute 3hp). Enemy intents are directions that travel with the enemy when shoved. `enemyPhase` returns animation frames. Win: clear all within `MAX_TURNS` (8); lose: heroes gone, lantern broken, or mist. Score: turns, then wounds.
- `Brink.tsx` — UI: select hero, move dots, target marks, hover previews with outcome text, undo within a turn, stepped enemy animation, one recorded attempt per day, unscored replays and past fights (`LAUNCH_DATE` 2026-10-01).
- Grid outline helpers (`outlineLoops`, `outlinePath`, `cellKey`) are shared from `../snug/pieces.ts`.

## Gotchas
- All randomness is seeded per drawing (`makeRng("kind:seed")`) so strokes do not change between renders.
- Rim edges run clockwise; a leftward edge is a south lip, which gets the heavy stroke and a cliff face.
- Figures are scaled per kind (`FIGURE_SCALE`); boards need ~95 units of top padding for tall figures.
