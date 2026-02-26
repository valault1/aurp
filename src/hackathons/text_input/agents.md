# Text Input Hackathon Context

This file serves as the memory and context for the Text Input Hackathon project. **It should be updated continuously as new context, requirements, or architecture decisions are introduced.**

## Motivation
The goal of this project is to build a "Bad Input Competition" interface. This interface will contain several tabs, each featuring a uniquely terrible or unconventional way to input text. These are built as a fun exercise to explore novel and challenging UI/UX paradigms.

## Current State
We have implemented the foundational scaffolding with three tabs:
1. **Rearranger:** A drag-and-drop text input method. Users are given the alphabet (A-Z) in a bottom zone and must drag individual letters into a top input zone. They can then rearrange the letters in the top zone to spell words. Implemented using `@hello-pangea/dnd` for smooth React Drag and Drop functionality.
2. **Option 2:** *Pending implementation*
3. **Option 3:** *Pending implementation*

## Architecture
- **Root Component:** `src/hackathons/text_input/TextInput.tsx` contains the tabbed interface routing to the specific bad input methods.
- **Rearranger Component:** `src/hackathons/text_input/Rearranger.tsx` handles drag-and-drop state.
- **Routing:** Accessible via the `/text-input` route in `App.tsx`, and linked in `Navigation.tsx`.

## Instructions for Agents
- When you add a new option or receive new requirements from the user, **always update this `agents.md` file.**
- Keep descriptions succinct and concise.
- Document any new libraries or significant architectural decisions here.
