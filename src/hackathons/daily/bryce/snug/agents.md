# Snug (Bryce, Daily v1)

Daily piece-fitting puzzle with a yarn and patchwork look. Rendered by `BryceDailyV1` with a Play / Art sheet toggle.

- `../daily.ts` — shared daily helpers: local date key (`?date=YYYY-MM-DD` override), seeded mulberry32 RNG, one-recorded-attempt store (`<game>.attempt.<date>` in localStorage).
- `pieces.ts` — 19 polyominoes, `rotateCW` (keeps cell order so a held cell stays under the pointer), `outlinePath`.
- `generator.ts` — reverse tiling: grows a blob from 8–9 real pieces (board = blob), plus 2 decoys. Rejects holes, fill outside 0.55–0.82, bbox over 9. Chiral shapes get a random handedness at generation; **players can only turn, never flip**, so basket orientations are rotations of the solution.
- `quilt.ts` — yarn palette and the date-seeded patchwork background (7 fabric styles).
- `parts.tsx` — shared visuals (knit patterns, `PatchSvg`, `BoardSvg`, `QuiltBackdrop`, buttons, result card).
- `Snug.tsx` — game: drag with snap, tap / Space / R to turn (works mid-drag), a turned piece that no longer fits hovers loose with a red-thread tint instead of returning to the basket (symmetric turns stay put), timer starts on first placement, auto-finish on zero holes, "Tie it off" for imperfect submits, replays unscored, "Show a perfect fill" after finishing.
- **Past quilts**: arrows step back to `LAUNCH_DATE` (backdated to 2026-10-01). Past days are practice: `SnugDay` never loads or saves attempts for them. Future days are not reachable except via `?date=`.
- `stitches.tsx` — hand-sewn running stitches (uneven, wobbly, shadowed, needle holes; no ply dots, by request). `stitchLoops` + `insetCellLoops` for SVG shapes (pieces, binding, basting grid, quilt patches); `StitchBorder` measures its positioned parent for HTML boxes. No CSS dashed outlines left.
- `ArtSheet.tsx` — every visual on one page for art review.

## Gotchas
- `QuiltBackdrop` makes `#root > div` transparent via GlobalStyles while mounted; that is what lets the quilt show behind the whole app.
- MUI ToggleButton ignores sx selected-state overrides under this theme; the view toggle uses `Btn` instead.
- Changing the generator changes every day's puzzle, which breaks already-saved attempts for those dates.
