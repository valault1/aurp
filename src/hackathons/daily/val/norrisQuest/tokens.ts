import { alpha } from "@mui/material";

/**
 * SIX DEGREES — "The Chart Room".
 *
 * The game is a voyage across an engraved chart, so it owns its look outright:
 * one aged sheet of vellum, whichever of the app's five themes is active. The
 * chart is the same object by daylight or lamplight, and tinting it five ways
 * would mean cyberpunk fuchsia and forest green both fighting the vermilion
 * course line — the one colour that has to stay readable.
 */
export type Chart = {
  /** The chart itself. */
  ground: string;
  /** Fresher paper laid *on* the chart: panels, the logbook, the cartouche. */
  slip: string;
  rule: string;
  ink: string;
  inkSoft: string;
  /** Playable links — annotated place names. */
  admiralty: string;
  /** The course, the destination, the stamps. */
  vermilion: string;
  /** Decorative instrument strokes: compass rose, dial, hairline ornament. */
  brass: string;
  /** Brass as *text*. Darker than the strokes — see the note below. */
  brassInk: string;
};

export const CHART: Chart = {
  ground: "#e6d4ae",
  slip: "#f3e6c6",
  rule: "#b4945d",
  ink: "#3b2e20",
  inkSoft: "#6b5637",
  admiralty: "#1f4260",
  vermilion: "#b23a2a",
  brass: "#a5771f",
  // On vellum the decorative brass reads at only 3.8:1, so label text takes a
  // darker cut of the same colour. Strokes keep the lighter value.
  brassInk: "#7a5214",
};

/* ------------------------------------------------------------------ *
 * Lettering
 * ------------------------------------------------------------------ */

/** Masthead and numerals. Title case — tracked-out caps read modern-luxury. */
export const DISPLAY = `"Playfair Display", Georgia, serif`;
/** Roman inscriptional caps: every label on the chart. */
export const LABEL = `Cinzel, "Trajan Pro", Georgia, serif`;
/** Real 17th-century type, with the ink spread cast in. Rubber stamps only. */
export const STAMP = `"IM Fell English SC", Georgia, serif`;
/** Article body. Already the best long-reading face available, at no cost. */
export const READING = `"Iowan Old Style", Charter, Palatino, Georgia, "Times New Roman", serif`;

/* ------------------------------------------------------------------ *
 * The paper stack
 * ------------------------------------------------------------------ */

/**
 * Noise baked into a small tiling image rather than a live `<svg>` filter.
 * An article can be 8000px tall; filtering a rect that size would be brutal,
 * whereas a 220px tile rasterises once and is repeated by the compositor.
 */
function noise(size: number, baseFrequency: number, octaves: number, seed: number) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/>` +
    `</filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Paper fibre. */
export const GRAIN_FINE = noise(220, 0.9, 5, 2);
/** The blotchy cloud that gives the sheet depth. First to go if this ever drags. */
export const GRAIN_COARSE = noise(620, 0.016, 4, 8);

/** Five overlapping blots. A real sheet is never one colour twice. */
export const TEA_STAIN = [
  "radial-gradient(ellipse 58% 44% at 14% 8%, rgba(255,250,234,0.92), transparent 70%)",
  "radial-gradient(ellipse 48% 38% at 86% 22%, rgba(247,233,203,0.78), transparent 72%)",
  "radial-gradient(ellipse 66% 48% at 24% 92%, rgba(168,131,76,0.36), transparent 70%)",
  "radial-gradient(ellipse 44% 34% at 96% 84%, rgba(144,106,54,0.4), transparent 70%)",
  "radial-gradient(ellipse 38% 44% at 62% 44%, rgba(255,249,232,0.5), transparent 75%)",
].join(",");

/** Chain and wire marks of a hand-made sheet. */
export const LAID_LINES = [
  "repeating-linear-gradient(0deg, rgba(112,84,46,0.06) 0 1px, transparent 1px 4px)",
  "repeating-linear-gradient(90deg, rgba(112,84,46,0.055) 0 1px, transparent 1px 27px)",
].join(",");

/** Latitude and longitude, under everything. */
export const GRATICULE = [
  "linear-gradient(rgba(31,66,96,0.07) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(31,66,96,0.07) 1px, transparent 1px)",
].join(",");

/**
 * Two creases down and one across: a dark valley with a lit ridge beside it.
 * This is the layer that stops the paper reading as texture and starts it
 * reading as a sheet somebody has carried around.
 */
const crease = (angle: string, at: string) =>
  `linear-gradient(${angle}, transparent calc(${at} - 3px), rgba(118,88,48,0.16) calc(${at} - 1px), rgba(255,250,236,0.5) calc(${at} + 1px), transparent calc(${at} + 3px))`;

export const FOLDS = [crease("90deg", "33.3%"), crease("90deg", "66.6%"), crease("0deg", "28%")].join(",");

/** Rust spots, margins only — never under body text. */
export const FOXING = [
  "radial-gradient(circle 28px at 3% 64%, rgba(133,88,38,0.3), transparent 72%)",
  "radial-gradient(circle 15px at 2% 30%, rgba(133,88,38,0.3), transparent 70%)",
  "radial-gradient(circle 34px at 97% 52%, rgba(133,88,38,0.3), transparent 74%)",
  "radial-gradient(circle 12px at 95% 8%, rgba(133,88,38,0.3), transparent 70%)",
  "radial-gradient(circle 22px at 6% 94%, rgba(133,88,38,0.3), transparent 72%)",
].join(",");

/**
 * A torn edge, tiled horizontally. Only the top and bottom of the logbook get
 * one — a deckle along a scrolling side rail would never be seen whole.
 */
export function tornEdge(flip: boolean): string {
  // Short, shallow undulations: a paper tear, not a scallop.
  const d = flip
    ? "M0 3 Q7 5 14 3 T28 4 T42 2 T56 4 T70 3 T84 4 T98 2 T112 3 T126 3"
    : "M0 4 Q7 2 14 4 T28 3 T42 5 T56 3 T70 4 T84 2 T98 4 T112 3 T126 4";
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='126' height='7'>` +
    `<path d='${d}' fill='none' stroke='${CHART.rule}' stroke-width='1.4'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ------------------------------------------------------------------ *
 * The injected Wikipedia HTML
 * ------------------------------------------------------------------ */

const c = CHART;
const hair = alpha(c.rule, 0.5);

/**
 * Wikipedia's own stylesheets never load, so every element an article can
 * contain is styled from scratch here — as a page of a ship's logbook.
 */
export const ARTICLE_SX = {
  fontFamily: READING,
  fontSize: { xs: "1rem", md: "1.0625rem" },
  lineHeight: 1.78,
  color: c.ink,

  // --- Playable links: annotated place names ---------------------------
  "& .sd-link": {
    color: c.admiralty,
    cursor: "pointer",
    textDecoration: "none",
    borderBottom: `1px dotted ${c.admiralty}`,
    padding: "0 1px",
    transition: "color .14s ease, background-color .14s ease, border-color .14s ease",
    "&:hover": {
      color: c.vermilion,
      borderBottom: `1.5px solid ${c.vermilion}`,
      backgroundColor: alpha(c.vermilion, 0.1),
    },
  },
  // Files, categories, red links, bare anchors: flat, no rule, no reward.
  "& .sd-dead": {
    color: alpha(c.inkSoft, 0.85),
    cursor: "default",
    textDecoration: "none",
  },
  // Becalmed — mid-fetch, or the voyage is over.
  "&[data-locked='true'] .sd-link": {
    color: alpha(c.inkSoft, 0.8),
    cursor: "default",
    borderBottom: `1px dotted ${alpha(c.inkSoft, 0.4)}`,
    "&:hover": { backgroundColor: "transparent", color: alpha(c.inkSoft, 0.8) },
  },

  // --- Headings --------------------------------------------------------
  "& .mw-heading, & h2, & h3, & h4": { clear: "both" },
  "& h2": {
    fontFamily: LABEL,
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: c.brassInk,
    margin: "2.6rem 0 0.8rem",
    paddingBottom: "0.5rem",
    borderBottom: `1px solid ${hair}`,
  },
  "& h3": {
    fontFamily: LABEL,
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: alpha(c.ink, 0.72),
    margin: "1.8rem 0 0.5rem",
  },
  "& h4, & h5": {
    fontFamily: READING,
    fontSize: "0.98rem",
    fontWeight: 700,
    fontStyle: "italic",
    color: alpha(c.ink, 0.82),
    margin: "1.3rem 0 0.35rem",
  },

  // --- Body ------------------------------------------------------------
  "& p": { margin: "0 0 1.15rem" },
  "& ul, & ol": { margin: "0 0 1.15rem", paddingLeft: "1.4rem" },
  "& li": { margin: "0 0 0.35rem" },
  "& b, & strong": { fontWeight: 700, color: c.ink },
  "& hr": { border: 0, borderTop: `1px solid ${hair}`, margin: "2rem 0" },
  "& sub, & sup": { lineHeight: 0 },

  "& .hatnote": {
    fontFamily: READING,
    fontSize: "0.85rem",
    fontStyle: "italic",
    color: c.inkSoft,
    margin: "0 0 1.3rem",
    paddingLeft: "0.85rem",
    borderLeft: `2px solid ${alpha(c.vermilion, 0.35)}`,
  },
  "& blockquote": {
    margin: "1.3rem 0",
    padding: "0.25rem 0 0.25rem 1rem",
    borderLeft: `2px solid ${alpha(c.vermilion, 0.35)}`,
    color: alpha(c.ink, 0.78),
    fontStyle: "italic",
  },

  // --- Media -----------------------------------------------------------
  "& img": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "2px",
    // Framed like a plate pasted into the log, so cut-out-on-white
    // photographs do not float free of the page.
    border: `1px solid ${alpha(c.rule, 0.55)}`,
  },
  "& figure, & .thumb": {
    margin: "1.3rem 0",
    maxWidth: "100%",
    "&.mw-halign-right, &.tright": {
      float: { xs: "none", md: "right" },
      marginLeft: { xs: 0, md: "1.6rem" },
      maxWidth: { xs: "100%", md: "280px" },
    },
    "&.mw-halign-left, &.tleft": {
      float: { xs: "none", md: "left" },
      marginRight: { xs: 0, md: "1.6rem" },
      maxWidth: { xs: "100%", md: "280px" },
    },
  },
  "& figcaption, & .thumbcaption": {
    fontFamily: READING,
    fontSize: "0.78rem",
    fontStyle: "italic",
    lineHeight: 1.6,
    color: c.inkSoft,
    marginTop: "0.5rem",
  },

  // --- The infobox, rebuilt as a cartouche ------------------------------
  "& .infobox, & .infobox_v2, & .sidebar": {
    float: { xs: "none", md: "right" },
    width: { xs: "100%", md: "290px" },
    maxWidth: "100%",
    margin: { xs: "0 0 1.6rem", md: "0.3rem 0 1.6rem 1.8rem" },
    padding: "3px",
    border: `1px solid ${c.brass}`,
    background: alpha(c.brass, 0.06),
    borderCollapse: "separate",
    borderSpacing: 0,
    fontFamily: READING,
    fontSize: "0.78rem",
    lineHeight: 1.6,
    // The inner rule of a double-ruled map legend.
    outline: `1px solid ${alpha(c.brass, 0.4)}`,
    outlineOffset: "-5px",
    "& th, & td": { padding: "0.32rem 0.5rem", verticalAlign: "top", textAlign: "left" },
    "& .infobox-title, & .infobox-above": {
      fontFamily: LABEL,
      fontSize: "0.8rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: c.ink,
      textAlign: "center",
      padding: "0.7rem 0.5rem 0.6rem",
    },
    "& .infobox-header, & .infobox-label": {
      fontFamily: LABEL,
      fontSize: "0.62rem",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: c.brassInk,
    },
    "& .infobox-image, & .infobox-full-data": { textAlign: "center" },
    "& img": { borderRadius: "2px" },
  },

  // --- Galleries ---------------------------------------------------------
  "& ul.gallery": {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    listStyle: "none",
    padding: 0,
    margin: "1.3rem 0",
    width: "auto !important",
  },
  "& li.gallerybox": {
    width: "auto !important",
    maxWidth: "100%",
    flex: "0 1 auto",
    "& div": { width: "auto !important", maxWidth: "100%", margin: 0 },
  },
  "& .gallerytext": {
    fontFamily: READING,
    fontSize: "0.76rem",
    fontStyle: "italic",
    lineHeight: 1.55,
    color: c.inkSoft,
    "& p": { margin: "0.4rem 0 0" },
  },

  // --- Tables ------------------------------------------------------------
  "& .sd-table-scroll": { overflowX: "auto", margin: "1.3rem 0" },
  "& table.wikitable": {
    borderCollapse: "collapse",
    fontFamily: READING,
    fontSize: "0.82rem",
    minWidth: "100%",
    "& th, & td": { border: `1px solid ${hair}`, padding: "0.45rem 0.65rem", textAlign: "left" },
    "& th": {
      fontFamily: LABEL,
      fontSize: "0.68rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      background: alpha(c.brass, 0.1),
      color: c.ink,
    },
    "& tr:nth-of-type(even) td": { background: alpha(c.ink, 0.025) },
  },
} as const;
