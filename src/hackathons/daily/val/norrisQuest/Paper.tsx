import { useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { CHART, FOLDS, FOXING, GRAIN_COARSE, GRAIN_FINE, GRATICULE, LAID_LINES, TEA_STAIN } from "./tokens";

/**
 * The chart itself: seven layers of aged paper, painted behind the whole game.
 *
 * Each layer gets its own element rather than one stacked `background-image`
 * list — the lists have to stay aligned with `background-size` entry for
 * entry, and one inserted gradient silently shifts every layer below it.
 * These divs paint nothing but a gradient and never reflow.
 */
export function ChartPaper() {
  return (
    <Box aria-hidden sx={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* 1 — tea stain */}
      <Box sx={{ position: "absolute", inset: 0, backgroundColor: CHART.ground, backgroundImage: TEA_STAIN }} />
      {/* 2 — laid lines */}
      <Box sx={{ position: "absolute", inset: 0, opacity: 0.55, backgroundImage: LAID_LINES }} />
      {/* 3 — graticule */}
      <Box sx={{ position: "absolute", inset: 0, backgroundImage: GRATICULE, backgroundSize: "68px 68px" }} />
      {/* 4 — pocket folds */}
      <Box sx={{ position: "absolute", inset: 0, backgroundImage: FOLDS }} />
      {/* 5 — two grains */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `${GRAIN_FINE}, ${GRAIN_COARSE}`,
          backgroundSize: "220px 220px, 620px 620px",
          opacity: 0.32,
          mixBlendMode: "multiply",
        }}
      />
      {/* 6 — foxing */}
      <Box sx={{ position: "absolute", inset: 0, backgroundImage: FOXING }} />
      {/* 7 — edge burn */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 120px rgba(104,72,32,0.42), inset 0 0 32px rgba(86,58,24,0.28)",
        }}
      />
    </Box>
  );
}

/**
 * Pushes the chart out to the edges of the screen, past whatever centred,
 * max-width container the game happens to be mounted in.
 *
 * Measured rather than `100vw`: on a platform with classic (space-taking)
 * scrollbars `100vw` is wider than the content box, so a `100vw` child
 * overflows and adds a horizontal scrollbar. `documentElement.clientWidth`
 * already excludes the scrollbar, and reading the anchor's own offset means
 * this works even if the container is not centred.
 */
export function FullBleedPaper() {
  const anchor = useRef<HTMLDivElement | null>(null);
  const [bleed, setBleed] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = anchor.current;
      if (!el) return;
      const left = -el.getBoundingClientRect().left;
      const width = document.documentElement.clientWidth;
      setBleed((prev) => (prev && prev.left === left && prev.width === width ? prev : { left, width }));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <Box
      ref={anchor}
      aria-hidden
      sx={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 0, pointerEvents: "none" }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: bleed ? `${bleed.left}px` : 0,
          width: bleed ? `${bleed.width}px` : "100%",
        }}
      >
        <ChartPaper />
      </Box>
    </Box>
  );
}
