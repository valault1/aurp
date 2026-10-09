import { useEffect } from "react";

const ID = "norrisquest-chart-fonts";
const HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Cinzel:wght@400;600;700" +
  "&family=IM+Fell+English+SC" +
  "&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400" +
  "&display=swap";

/**
 * Loads the chart's lettering on demand, so the rest of the app never pays for
 * three webfonts it does not use. Playfair is shared with Big Ticket, which
 * requests its own subset — the browser dedupes the overlap.
 */
export function useChartFonts() {
  useEffect(() => {
    if (document.getElementById(ID)) return;
    const link = document.createElement("link");
    link.id = ID;
    link.rel = "stylesheet";
    link.href = HREF;
    document.head.appendChild(link);
  }, []);
}
