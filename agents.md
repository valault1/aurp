# Agent Context & Documentation

**CRITICAL RULE FOR ALL AGENTS**: You MUST always read, create, and update `agents.md` files in the directories you are modifying. These files serve as the persistent memory and context for our codebase.
- Be **extremely concise** in these files.
- **Regularly delete** unnecessary context, solved issues, and outdated information to prevent context bloat and hallucination.

## Technologies & Stack
- **Framework & Libraries**: React 19, React Router, Material UI (MUI), Lucide React.
- **Build & Dev**: Bun (Server running locally on port 3001).

## Global Context & Design Philosophy
- The application aims for "UI Reimagined": newer, cooler, radically experimental, and premium ways to interact with digital spaces.
- **Theme System**: The app uses a global Material UI `ThemeProvider` connected to `localStorage` via a custom `ThemeContext` (`src/context/ThemeContext.tsx`).
- We currently support 5 premium aesthetic themes: `ice`, `midnight`, `cyberpunk`, `forest`, and `sunset`.

## Project History & Recent Solutions
- **Goal**: Implement a beautiful, dynamic theme switcher saving preferences locally.
- **Implementation Highlights**: 
  - Refactored away from a simple boolean dark mode to a strict `ThemeMode` string union.
  - Created a Settings page component (`src/components/Settings.tsx`) with a Material UI Select dropdown to browse themes.
  - Linked the `/settings` route to a gear icon (`lucide-react`) in the top navigation.
- **Challenges Addressed**: 
  - Addressed an issue where the background colors failed to fully cover the screen by injecting `<CssBaseline />` directly inside the `ThemeProvider`.
  - Initially experimented with Radio buttons for theme selection before migrating to a more scalable `<Select>` dropdown as the list of themes grew.
  - Built a unified `CompetitionToggle` component using `framer-motion` to combine Competitor selection (e.g., Val vs Bryce) and their respective Iterations (e.g., v1, v2) into a single, sleek glassmorphism dashboard, replacing standard, clunky nested Material Tabs.
