# NorrisQuest — "The Chart Room" (Val daily v3)

*(Renamed from "Six Degrees"; folder, component and all copy moved with it.)*

Chase Wikipedia links from the day's start article to **Chuck Norris** in **6 clicks or fewer**. Score = links clicked. Day 1 = `Apple`.

The art direction is a Victorian navigation chart: the start is a **port of departure**, each click is a **leg sailed**, each article visited is a **passport stamp**, the target is an inked **X**. Full art sheet: https://claude.ai/artifact/5j4Gb5fnMEH4UnN3qPsZNX

## Why not an iframe
Wikipedia frames fine, but a cross-origin iframe never exposes its URL — so there is no way to know which article the player landed on, which is the whole game. Instead we fetch `action=parse` (CORS-enabled, `origin=*`), sanitize, and render the HTML ourselves. That also buys typography control and lets us mark dead-end links before a player spends a leg.

## Files
- `tokens.ts` — `CHART` palette, the seven paper layers, `ARTICLE_SX`. No theme argument anywhere: see below.
- `Paper.tsx` — `ChartPaper` (the seven layers) and `FullBleedPaper` (pushes it to the screen edges).
- `VoyageBar.tsx` — compass rose, course line, vessel, `Stamps`, `LegDial`.
- `wiki.ts` — fetch + sanitize + title normalisation. Owns the namespace blocklist and the `data-wiki` attribute that makes an anchor playable.
- `puzzles.ts` — seeds, date→edition, localStorage result, share text, loss hints.
- `ArticleView.tsx` — delegated click handling over the injected HTML.
- `NorrisQuest.tsx` — run state, logbook chrome, arrival seal / abandonment stamp.
- `useChartFonts.ts` — lazily loads Playfair Display, Cinzel, IM Fell English SC.

Rendered at `/daily/val/v3` and, for prod, at `/norrisquest` via `daily/ProdGames.tsx`.

## Decisions that will look wrong if you don't know why
- **One paper, always.** The chart ignores all five app themes. A night variant was built and cut — Val wanted vellum everywhere. Do not reintroduce `chartFor(theme)`.
- **Brass has two values.** `brass` `#a5771f` for strokes, `brassInk` `#7a5214` for text. The lighter one reads at 3.8:1 on vellum and fails contrast.
- **Grain is a tiled data-URI, not a live `<svg>` filter.** Articles run to 8000px; filtering a rect that tall is brutal. If it ever drags, drop `GRAIN_COARSE` first.
- **Waypoint *n* sits at `n/6` across the rail**, not `(n-1)/6` — so the drawn course always ends exactly on the pip it just reached. Off-by-one here is very visible.
- **Full bleed is measured, not `100vw`.** With classic scrollbars `100vw` exceeds the content box and adds a horizontal scrollbar; `documentElement.clientWidth` excludes it.
- **No back button.** Six committed legs; refundable backtracking makes the score meaningless.
- **Failed fetch costs nothing** — the player never got to read it.
- **First finished voyage of the day is recorded.** Replays allowed, flagged unscored.
- **Share text keeps coloured emoji squares** despite the period styling: a daily game lives on a grid that reads at a glance in a group chat. It ends with `GAME_URL`.
- `See also` is kept (best link cluster on a page); references/external-links are dropped.
- Inline `style`/`bgcolor` colour declarations are stripped — Wikipedia hard-codes colours for its own white page. Gallery pixel widths are stripped too, or they overflow a phone.

## Gotchas
- `EPOCH` is `2026-10-08` = edition 1.
- `GAME_NAME` drives both the masthead and the shared log — change it in one place.
- `loadResult` still reads the pre-rename `sixdegrees.v1.day*` key so a logged day survived the rename. Safe to drop once nobody has one.
- **Scrolling never goes through `requestAnimationFrame`.** rAF callbacks do not fire while the page is not compositing — a background tab, or an embedded browser that is hidden — which silently swallowed the jump back to the top on a win. The scroll is driven by a `scrollIntent` state plus an effect, which runs after commit regardless.
- **`behavior: "smooth"` is not guaranteed.** Some embedded browsers accept the call and do nothing at all. `scrollWindowTo` asks for smooth, then checks 250ms later: no movement at all means it was ignored, so it jumps instead. Reduced-motion users skip straight to the jump.
- **Copying can be refused.** `navigator.clipboard.writeText` throws `NotAllowedError` in some browsers and in automated ones. The catch used to be silent, so the button just did nothing; a refusal now reveals a selectable textarea instead. Don't re-swallow it.
- `HUB_HINTS` were verified against the live backlink list for Chuck Norris — re-verify before editing.
- Verified day-1 route: `Apple → China → Martial arts → Chuck Norris` (3). No 2-hop route exists.
- The app's own `<AppBar>` nav overflows below ~480px. Pre-existing, not this game's doing.
