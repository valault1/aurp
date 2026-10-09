/**
 * Wikipedia client for SIX DEGREES.
 *
 * Why not an iframe: Wikipedia renders fine in one, but a cross-origin frame
 * never exposes its URL, so there is no way to know which article the player
 * landed on — which is the entire game. Instead we fetch the parsed article
 * over the MediaWiki action API (CORS-enabled), strip it down, and render it
 * ourselves. That also means we control the typography and can tell a playable
 * link apart from a dead end before the player spends a hop on it.
 */

const API = "https://en.wikipedia.org/w/api.php";

export type Article = {
  /** Canonical title, after redirects. This is what we match against. */
  title: string;
  /** Plain-text title for display (no markup). */
  displayTitle: string;
  /** Sanitised article HTML. */
  html: string;
};

/** `Chuck_Norris#Career` and `chuck norris` both normalise to `Chuck Norris`. */
export function normalizeTitle(raw: string): string {
  let t = raw.trim();
  try {
    t = decodeURIComponent(t);
  } catch {
    /* already-decoded titles containing a stray % */
  }
  return t.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/** Case-insensitive comparison key. Wikipedia only capitalises the first letter. */
export function titleKey(raw: string): string {
  return normalizeTitle(raw).toLowerCase();
}

export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(normalizeTitle(title).replace(/ /g, "_"))}`;
}

/* ------------------------------------------------------------------ *
 * Sanitising
 * ------------------------------------------------------------------ */

/** Whole elements that only ever add noise to a link-hunting game. */
const DROP = [
  "style",
  "script",
  "link",
  "noscript",
  "meta",
  ".mw-editsection",
  "sup.reference",
  ".reference",
  ".reflist",
  "ol.references",
  ".mw-references-wrap",
  ".navbox",
  ".navbox-styles",
  ".vertical-navbox",
  ".catlinks",
  ".shortdescription",
  ".sistersitebox",
  ".side-box",
  ".ambox",
  ".navigation-not-searchable",
  ".mw-empty-elt",
  ".portal",
  ".portalbox",
  ".authority-control",
  ".mw-kartographer-container",
  ".mw-indicators",
  ".nomobile",
  "#coordinates",
].join(",");

/**
 * Sections that are pure citation apparatus. `See also` deliberately stays —
 * it is the single best link cluster on a Wikipedia page, so removing it would
 * gut the game.
 */
const DROP_SECTIONS = new Set([
  "references",
  "citations",
  "notes",
  "footnotes",
  "explanatory_notes",
  "works_cited",
  "further_reading",
  "external_links",
  "bibliography",
  "sources",
]);

/** Namespaces a player must not be able to walk into. */
const BLOCKED_NS = new Set([
  "file",
  "image",
  "media",
  "category",
  "template",
  "template_talk",
  "help",
  "special",
  "talk",
  "user",
  "user_talk",
  "wikipedia",
  "wikipedia_talk",
  "portal",
  "module",
  "draft",
  "mediawiki",
  "book",
  "timedtext",
  "wikt",
  "s",
  "q",
  "commons",
  "c",
  "m",
]);

/**
 * Wikipedia lays sections out flat: a heading wrapper followed by siblings
 * until the next heading of the same level. To drop a section we walk forward
 * from its heading and remove everything up to the next h2.
 */
function dropSection(heading: Element) {
  const start = heading.closest(".mw-heading") ?? heading;
  let node: Element | null = start.nextElementSibling;
  start.remove();
  while (node) {
    const next: Element | null = node.nextElementSibling;
    if (node.matches("h2, .mw-heading2") || node.querySelector("h2")) break;
    node.remove();
    node = next;
  }
}

/** The title a `/wiki/...` href points at, or null if it is not playable. */
function playableTitle(href: string): string | null {
  if (!href.startsWith("/wiki/")) return null;
  const raw = href.slice("/wiki/".length);
  if (!raw || raw.startsWith("#")) return null;
  // Anything with a query string is an edit/redlink/action URL.
  if (raw.includes("?")) return null;

  const title = normalizeTitle(raw.split("#")[0]!);
  if (!title) return null;

  const colon = title.indexOf(":");
  if (colon > 0) {
    const ns = title.slice(0, colon).toLowerCase().replace(/ /g, "_");
    if (BLOCKED_NS.has(ns)) return null;
  }
  return title;
}

function sanitize(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(`<div id="sd-root">${rawHtml}</div>`, "text/html");
  const root = doc.getElementById("sd-root")!;

  root.querySelectorAll(DROP).forEach((el) => el.remove());

  root.querySelectorAll("h2").forEach((h) => {
    const id = (h.getAttribute("id") ?? h.textContent ?? "").trim().toLowerCase().replace(/ /g, "_");
    if (DROP_SECTIONS.has(id)) dropSection(h);
  });

  // Defensive: Wikipedia content is trusted-ish, but we are injecting it as
  // HTML, so inline handlers go regardless.
  root.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  });

  // Wikipedia hard-codes colours inline (lime infobox headers, shaded table
  // rows). Those are tuned for Wikipedia's own white page and look broken on
  // five themed backgrounds, so the colour declarations are dropped and the
  // layout ones (width, float, text-align) kept.
  root.querySelectorAll("[bgcolor]").forEach((el) => el.removeAttribute("bgcolor"));
  root.querySelectorAll("[style]").forEach((el) => {
    const kept = (el.getAttribute("style") ?? "")
      .split(";")
      .filter((decl) => !/^\s*(background|border|color|box-shadow|outline)/i.test(decl))
      .join(";")
      .trim();
    if (kept) el.setAttribute("style", kept);
    else el.removeAttribute("style");
  });

  root.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    const title = playableTitle(href);
    a.removeAttribute("href");
    a.removeAttribute("target");
    a.removeAttribute("rel");
    a.className = "";

    // Red links point at a page that does not exist yet.
    const isRedlink = href.includes("redlink=1");
    if (title && !isRedlink) {
      a.classList.add("sd-link");
      a.setAttribute("data-wiki", title);
      a.setAttribute("role", "link");
      a.setAttribute("tabindex", "0");
    } else {
      a.classList.add("sd-dead");
    }
  });

  // Galleries carry hard-coded pixel widths on every box, which overflow a
  // phone no matter what the stylesheet says. Strip them and let CSS lay out.
  root.querySelectorAll("ul.gallery, ul.gallery *").forEach((el) => {
    el.removeAttribute("width");
    el.removeAttribute("height");
    const kept = (el.getAttribute("style") ?? "")
      .split(";")
      .filter((decl) => !/^\s*(width|height|max-width|min-width)/i.test(decl))
      .join(";")
      .trim();
    if (kept) el.setAttribute("style", kept);
    else el.removeAttribute("style");
  });

  // Wide tables need their own scroll container or they blow out the layout.
  root.querySelectorAll("table.wikitable").forEach((table) => {
    const wrap = doc.createElement("div");
    wrap.className = "sd-table-scroll";
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });

  // Lazy-loaded images arrive without a usable src on some pages.
  root.querySelectorAll("img").forEach((img) => {
    img.setAttribute("loading", "lazy");
    img.removeAttribute("width");
    img.removeAttribute("height");
  });

  return root.innerHTML;
}

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

const cache = new Map<string, Article>();

export async function fetchArticle(title: string, signal?: AbortSignal): Promise<Article> {
  const key = titleKey(title);
  const hit = cache.get(key);
  if (hit) return hit;

  const params = new URLSearchParams({
    action: "parse",
    page: normalizeTitle(title),
    prop: "text|displaytitle",
    format: "json",
    formatversion: "2",
    origin: "*",
    redirects: "1",
    disableeditsection: "1",
    disabletoc: "1",
    disablelimitreport: "1",
  });

  const res = await fetch(`${API}?${params}`, { signal });
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);

  const json = (await res.json()) as {
    parse?: { title: string; displaytitle?: string; text: string };
    error?: { info?: string };
  };
  if (json.error) throw new Error(json.error.info ?? "Wikipedia could not load that page");
  if (!json.parse) throw new Error("Wikipedia returned an empty page");

  const article: Article = {
    title: normalizeTitle(json.parse.title),
    displayTitle: stripTags(json.parse.displaytitle) || normalizeTitle(json.parse.title),
    html: sanitize(json.parse.text),
  };

  cache.set(key, article);
  cache.set(titleKey(article.title), article);
  return article;
}

function stripTags(html?: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").trim();
}
