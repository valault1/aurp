/**
 * Per-path link previews.
 *
 * Link unfurlers (iMessage, Slack, Discord) read the HTML a URL returns and
 * never run the bundle, so a single-page app shows one preview everywhere.
 * This writes a copy of dist/index.html per route with its own Open Graph
 * tags, which Firebase serves ahead of the catch-all rewrite. The app boots
 * from the copy exactly as it does from the root document.
 *
 * Run as part of `bun run build`.
 */

import { mkdir, readdir, copyFile, readFile, writeFile } from "node:fs/promises";

const SITE = "https://aurp-e6a4b.web.app";
const DIST = "dist";

type Preview = {
  /** Route path, no trailing slash. */
  path: string;
  title: string;
  description: string;
  /** File name in src/og, served from /og. */
  image: string;
};

const PREVIEWS: Preview[] = [
  {
    path: "/apex",
    title: "APEX",
    description: "Outrun the pack and set the record on a retro-California circuit.",
    image: "apex.png",
  },
  {
    path: "/snug",
    title: "Snug",
    description: "A daily piece-fitting puzzle, stitched together out of yarn and patchwork.",
    image: "snug.png",
  },
  {
    path: "/norrisquest",
    title: "NorrisQuest",
    description: "Six links to Chuck Norris, no more. A daily voyage across the chart room.",
    image: "norrisquest.png",
  },
  {
    path: "/dev",
    title: "aurp",
    description: "Experiments in progress.",
    image: "dev.png",
  },
];

/** Swaps the content of a `<meta>` matching `attr="name"`. */
function setMeta(html: string, attr: "property" | "name", name: string, value: string) {
  const re = new RegExp(`(<meta\\s+${attr}="${name}"[^>]*?content=")[^"]*(")`, "s");
  if (re.test(html)) return html.replace(re, `$1${escapeAttr(value)}$2`);
  // The tag is laid out across two lines in src/index.html, so try again with
  // the attributes in the other order before giving up.
  const re2 = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=\\s*")[^"]*(")`, "s");
  if (re2.test(html)) return html.replace(re2, `$1${escapeAttr(value)}$2`);
  throw new Error(`no <meta ${attr}="${name}"> in dist/index.html`);
}

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

async function main() {
  // The images themselves.
  await mkdir(`${DIST}/og`, { recursive: true });
  for (const f of await readdir("src/og")) {
    if (f.endsWith(".png")) await copyFile(`src/og/${f}`, `${DIST}/og/${f}`);
  }

  const root = await readFile(`${DIST}/index.html`, "utf8");

  for (const p of PREVIEWS) {
    // Bun emits "./index-<hash>.js"; a copy one directory down would resolve
    // that against its own folder, so every asset reference goes absolute.
    let html = root.replace(/(\s(?:src|href)=")\.\//g, "$1/");

    const url = `${SITE}${p.path}`;
    const img = `${SITE}/og/${p.image}`;

    html = html.replace(/(<title>)[^<]*(<\/title>)/, `$1${p.title}$2`);
    html = setMeta(html, "name", "description", p.description);
    html = setMeta(html, "property", "og:title", p.title);
    html = setMeta(html, "property", "og:description", p.description);
    html = setMeta(html, "property", "og:url", url);
    html = setMeta(html, "property", "og:image", img);
    html = setMeta(html, "name", "twitter:title", p.title);
    html = setMeta(html, "name", "twitter:description", p.description);
    html = setMeta(html, "name", "twitter:image", img);

    // Declaring the size lets an unfurler lay out the card before the image
    // lands. The root document keeps its own square image, so these are only
    // ever added to the generated copies.
    html = html.replace(
      /(<meta property="og:image"[^>]*>)/,
      `$1\n  <meta property="og:image:width" content="1200" />` +
      `\n  <meta property="og:image:height" content="630" />`,
    );

    const dir = `${DIST}${p.path}`;
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/index.html`, html);
    console.log(`${p.path} -> ${dir}/index.html`);
  }
}

await main();
