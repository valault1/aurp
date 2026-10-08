# Six Degrees (Val daily v3)

Chase Wikipedia links from the day's start article to **Chuck Norris** in **6 clicks or fewer**. Score = links clicked. Day 1 = `Apple`.

## Why not an iframe
Wikipedia frames fine, but a cross-origin iframe never exposes its URL — so there is no way to know which article the player landed on, which is the whole game. Instead we fetch `action=parse` (CORS-enabled, `origin=*`), sanitize, and render the HTML ourselves. That also buys us typography control and the ability to mark dead-end links before a player spends a hop.

## Files
- `wiki.ts` — fetch + sanitize + title normalisation. Owns the namespace blocklist and the `data-wiki` attribute that makes an anchor playable.
- `puzzles.ts` — seeds, date→edition, localStorage result, share text, loss hints.
- `tokens.ts` — palette, `accentsFor(theme)`, and `articleSx(theme)` (all Wikipedia element styling, since none of their CSS loads).
- `HopChain.tsx` — sticky-HUD rail + `Trail` breadcrumb.
- `ArticleView.tsx` — delegated click handling over the injected HTML.
- `SixDegrees.tsx` — run state, win/loss, result panel.

## Rules that are deliberate
- **No back button.** Six committed hops; refundable backtracking makes the score meaningless.
- **Failed fetch costs nothing** — the player never got to read the page.
- **First finished run of the day is recorded.** Replays allowed, flagged unscored.
- **Share text omits the route** — on a daily puzzle the path is the spoiler.
- `See also` sections are kept (best link cluster on a page); references/external-links are dropped.
- Inline `style`/`bgcolor` colour declarations are stripped — Wikipedia hard-codes colours for its own white page, which breaks on four dark themes.

## Gotchas
- Only `ice` is a light theme. Text-weight accents must go through `accentsFor(theme)` or they fail contrast on white.
- `EPOCH` is `2026-10-08` = edition 1.
- `HUB_HINTS` were verified against the live backlink list for Chuck Norris — re-verify before editing.
- Verified day-1 route: `Apple → China → Martial arts → Chuck Norris` (3). No 2-hop route exists.
