import { useEffect } from "react";

const ID = "bigticket-display-font";
const HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap";

/**
 * Loads the game's display serif on demand, so the rest of the app doesn't
 * pay for a webfont it never uses.
 */
export function useDisplayFont() {
  useEffect(() => {
    if (document.getElementById(ID)) return;
    const link = document.createElement("link");
    link.id = ID;
    link.rel = "stylesheet";
    link.href = HREF;
    document.head.appendChild(link);
  }, []);
}
