# Context: Currency Input Competition

**CRITICAL RULE FOR ALL AGENTS**: 
Always read and proactively update this `agents.md` file whenever making significant architectural or design changes. Delete outdated or solved contexts to keep this concise.

## Goal
The goal of this competition folder is to design a unique, innovative, and potentially terrible way to input **currency values** (money). 

## Structure
- Use `Currency.tsx` to orchestrate variations. It holds the `CompetitionToggle`, which seamlessly switches between Val and Bryce and supports tracking "iterations" (e.g., v1, v2).
- Add your logic primarily to `ValCurrency.tsx` or `BryceCurrency.tsx`, or break it out into smaller subcomponents within this folder as the components grow.
- Add "v2", "v3" to the `COMPETITORS` array in `Currency.tsx` if you need to easily compare multiple approaches for the same person without deleting existing files.

## Styling Rules
We are using `framer-motion` for animations and strict Material UI (`@mui/material`) for base styling. We rely heavily on the global `ThemeProvider` with five distinct dark modes (`ice`, `midnight`, `cyberpunk`, `forest`, `sunset`). 
- **DO NOT** use un-themed whites or pure blacks if possible.
- **DO** rely on `background.paper` or `background.default` for layered panels.
- Keep the aesthetic "premium" and glassmorphic where appropriate (`backdrop-filter`).
