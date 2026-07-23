import type { Level } from "./types";
import { makeDefaultLevel } from "./defaultLevel";

const KEY = "valGolf.level.v2";

/** Load the saved level from localStorage, falling back to the starter level. */
export function loadLevel(): Level {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Level;
  } catch {
    // ignore malformed / unavailable storage
  }
  return makeDefaultLevel();
}

export function saveLevel(level: Level): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(level));
  } catch {
    // ignore quota / unavailable storage
  }
}

export function resetSavedLevel(): Level {
  const fresh = makeDefaultLevel();
  saveLevel(fresh);
  return fresh;
}

/** Trigger a browser download of the level as a .json file. */
export function exportLevel(level: Level): void {
  const blob = new Blob([JSON.stringify(level, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${level.name.replace(/\s+/g, "-").toLowerCase() || "level"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseLevel(json: string): Level {
  const level = JSON.parse(json) as Level;
  if (!level.outline || !level.obstacles) throw new Error("Not a valid level file");
  return level;
}
