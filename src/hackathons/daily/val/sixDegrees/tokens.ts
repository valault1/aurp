import { alpha, type Theme } from "@mui/material";

/**
 * SIX DEGREES — "field dossier" look.
 *
 * The amber signal colour is fixed rather than pulled from the active app
 * theme: the whole game reads as one traced connection, and it needs to look
 * identical whether the user is on `ice` or `sunset`. Everything *around* the
 * dossier (page wash, card glass) does come from the theme, so the game still
 * sits inside the app instead of on top of it.
 */
export const SIGNAL = "#ffb43d";
export const SIGNAL_SOFT = "#ffd99a";
export const SIGNAL_DEEP = "#b26a00";

/** Last hop / out of hops. */
export const DANGER = "#ff5a52";
/** Target reached. */
export const WIN = "#34d399";

/**
 * `ice` is the one light theme in the app, and the dark-theme amber/mint/coral
 * all fall under 4.5:1 on white. Text-weight accents go through here; glows and
 * tints keep the vivid constants, since those are always alpha'd over a
 * background and never carry meaning on their own.
 */
export function accentsFor(theme: Theme) {
  const light = theme.palette.mode === "light";
  return {
    signal: light ? "#a35c00" : SIGNAL,
    signalSoft: light ? "#7d4600" : SIGNAL_SOFT,
    win: light ? "#0b7a52" : WIN,
    danger: light ? "#c3362e" : DANGER,
  };
}

export const MONO = `"SF Mono", "JetBrains Mono", ui-monospace, "Menlo", monospace`;
export const READING = `"Iowan Old Style", "Charter", "Palatino", Georgia, "Times New Roman", serif`;

/** Faint grid, like a dossier's graph paper. */
export const DOSSIER_GRID = `
  linear-gradient(rgba(255,180,61,0.035) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,180,61,0.035) 1px, transparent 1px)
`;

/**
 * Typography + layout for the Wikipedia HTML we inject. Wikipedia's own
 * stylesheets never load, so every element the article can contain has to be
 * styled here from scratch.
 */
export function articleSx(theme: Theme) {
  const ink = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const hair = alpha(ink, 0.12);
  const { signal, signalSoft } = accentsFor(theme);

  return {
    fontFamily: READING,
    fontSize: { xs: "1rem", md: "1.0625rem" },
    lineHeight: 1.75,
    color: alpha(ink, 0.88),

    // --- Playable links -------------------------------------------------
    "& .sd-link": {
      color: signal,
      cursor: "pointer",
      textDecoration: "none",
      borderRadius: "4px",
      padding: "0 2px",
      margin: "0 -2px",
      boxShadow: `inset 0 -1px 0 ${alpha(SIGNAL, 0.45)}`,
      transition: "background-color .14s ease, color .14s ease, box-shadow .14s ease",
      "&:hover": {
        color: signalSoft,
        backgroundColor: alpha(SIGNAL, 0.16),
        boxShadow: `inset 0 -1px 0 ${SIGNAL}`,
      },
    },
    // Dead ends: external links, file pages, red links, in-page anchors.
    "& .sd-dead": {
      color: alpha(muted, 0.75),
      cursor: "default",
      textDecoration: "none",
    },
    // A locked board (mid-load, or the run is over) should not look clickable.
    "&[data-locked='true'] .sd-link": {
      color: alpha(muted, 0.8),
      cursor: "default",
      boxShadow: "none",
      "&:hover": { backgroundColor: "transparent", color: alpha(muted, 0.8) },
    },

    // --- Headings -------------------------------------------------------
    "& .mw-heading, & h2, & h3, & h4": { clear: "both" },
    "& h2": {
      fontFamily: MONO,
      fontSize: "0.8125rem",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: signal,
      margin: "2.5rem 0 0.75rem",
      paddingBottom: "0.5rem",
      borderBottom: `1px solid ${alpha(SIGNAL, 0.25)}`,
    },
    "& h3": {
      fontFamily: MONO,
      fontSize: "0.75rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: alpha(ink, 0.7),
      margin: "1.75rem 0 0.5rem",
    },
    "& h4, & h5": {
      fontSize: "0.95rem",
      fontWeight: 700,
      color: alpha(ink, 0.8),
      margin: "1.25rem 0 0.35rem",
    },

    // --- Body -----------------------------------------------------------
    "& p": { margin: "0 0 1.1rem" },
    "& ul, & ol": { margin: "0 0 1.1rem", paddingLeft: "1.4rem" },
    "& li": { margin: "0 0 0.35rem" },
    "& b, & strong": { fontWeight: 700, color: ink },
    "& hr": { border: 0, borderTop: `1px solid ${hair}`, margin: "2rem 0" },
    "& sub, & sup": { lineHeight: 0 },

    // Hatnotes ("For other uses, see…") stay — they are real, useful links.
    "& .hatnote": {
      fontFamily: MONO,
      fontSize: "0.75rem",
      fontStyle: "normal",
      letterSpacing: "0.02em",
      color: muted,
      margin: "0 0 1.25rem",
      paddingLeft: "0.75rem",
      borderLeft: `2px solid ${alpha(SIGNAL, 0.3)}`,
    },
    "& blockquote": {
      margin: "1.25rem 0",
      padding: "0.25rem 0 0.25rem 1rem",
      borderLeft: `2px solid ${alpha(SIGNAL, 0.35)}`,
      color: alpha(ink, 0.75),
      fontStyle: "italic",
    },

    // --- Media ----------------------------------------------------------
    "& img": { maxWidth: "100%", height: "auto", borderRadius: "6px" },
    "& figure, & .thumb": {
      margin: "1.25rem 0",
      maxWidth: "100%",
      "&.mw-halign-right, &.tright": {
        float: { xs: "none", md: "right" },
        marginLeft: { xs: 0, md: "1.5rem" },
        maxWidth: { xs: "100%", md: "280px" },
      },
      "&.mw-halign-left, &.tleft": {
        float: { xs: "none", md: "left" },
        marginRight: { xs: 0, md: "1.5rem" },
        maxWidth: { xs: "100%", md: "280px" },
      },
    },
    "& figcaption, & .thumbcaption": {
      fontFamily: MONO,
      fontSize: "0.6875rem",
      lineHeight: 1.6,
      letterSpacing: "0.02em",
      color: muted,
      marginTop: "0.5rem",
    },

    // --- Infobox: the densest link cluster on most pages ----------------
    "& .infobox, & .infobox_v2, & .sidebar": {
      float: { xs: "none", md: "right" },
      width: { xs: "100%", md: "300px" },
      maxWidth: "100%",
      margin: { xs: "0 0 1.5rem", md: "0 0 1.5rem 1.75rem" },
      padding: "0.75rem",
      borderRadius: "12px",
      border: `1px solid ${alpha(SIGNAL, 0.2)}`,
      background: alpha(SIGNAL, 0.04),
      fontFamily: MONO,
      fontSize: "0.6875rem",
      lineHeight: 1.65,
      borderCollapse: "separate",
      borderSpacing: 0,
      "& th, & td": { padding: "0.3rem 0.4rem", verticalAlign: "top", textAlign: "left" },
      "& .infobox-title, & .infobox-above": {
        fontSize: "0.875rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: signal,
        textAlign: "center",
        paddingBottom: "0.5rem",
      },
      "& .infobox-header, & .infobox-label": { color: muted, fontWeight: 600 },
      "& .infobox-image, & .infobox-full-data": { textAlign: "center" },
      "& img": { borderRadius: "6px" },
    },

    // --- Tables ---------------------------------------------------------
    "& .sd-table-scroll": { overflowX: "auto", margin: "1.25rem 0" },
    "& table.wikitable": {
      borderCollapse: "collapse",
      fontFamily: MONO,
      fontSize: "0.75rem",
      minWidth: "100%",
      "& th, & td": { border: `1px solid ${hair}`, padding: "0.45rem 0.6rem", textAlign: "left" },
      "& th": {
        background: alpha(SIGNAL, 0.08),
        color: alpha(ink, 0.85),
        fontWeight: 700,
        letterSpacing: "0.04em",
      },
      "& tr:nth-of-type(even) td": { background: alpha(ink, 0.02) },
    },
  } as const;
}
