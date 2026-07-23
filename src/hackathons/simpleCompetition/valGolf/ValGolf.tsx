import { useState } from "react";
import { GolfPlayer } from "./GolfPlayer";
import { GolfEditor } from "./GolfEditor";

/**
 * Val's coin-golf game. Two surfaces sharing one saved level:
 *  - "play": the customer experience.
 *  - "edit": the level editor (with in-place play-testing).
 */
export function ValGolf() {
  const [view, setView] = useState<"play" | "edit">("play");

  return view === "play" ? (
    <GolfPlayer onEdit={() => setView("edit")} />
  ) : (
    <GolfEditor onExit={() => setView("play")} />
  );
}
