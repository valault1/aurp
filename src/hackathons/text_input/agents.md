# Text Input Hackathon Context

This file serves as the memory and context for the Text Input Hackathon project. **It should be updated continuously as new context, requirements, or architecture decisions are introduced.**

## Motivation
The goal of this project is to build a "Bad Input Competition" interface. This interface contains several tabs, each featuring a uniquely terrible or unconventional way to input text. These are built as a fun exercise to explore novel and challenging UI/UX paradigms.

## Current State
We have implemented the foundational scaffolding with two tabs:
1. **Val (formerly Rearranger):** A drag-and-drop text input method using `@hello-pangea/dnd`. Users are given the lowercase alphabet (a-z) in an available letters zone and must drag individual letters into a top input zone to spell words.
   - **Conversion Machine:** Users can sacrifice a letter to try and duplicate another target letter. It features a 40% chance of destroying the sacrifice, 30% chance of successfully duplicating the target, and 30% chance of returning a random letter. Results drop into a collection box.
   - **Macrodata Refinement:** Users drop any number of tiles into this machine to create a number tile matching the count of dropped tiles (max 9).
   - **Capitalizer Machine:** Users drop a lowercase letter or number to capitalize it (e.g., a → A) or shift it (e.g., 2 → @).
2. **Bryce (Option 2):** *Pending implementation*

## Architecture
- **Root Component:** `src/hackathons/text_input/TextInput.tsx` contains the tabbed interface routing to the specific bad input methods.
- **Val Component:** `src/hackathons/text_input/Rearranger.tsx` handles drag-and-drop state for the Val tab.
- **Routing:** Accessible via the `/text-input` route in `App.tsx`, and linked in `Navigation.tsx`.

## Instructions for Agents
- When you add a new option or receive new requirements from the user, **always update this `agents.md` file.**
- Keep descriptions succinct and concise.
- Document any new libraries or significant architectural decisions here.
