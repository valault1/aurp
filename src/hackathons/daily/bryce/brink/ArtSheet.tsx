import { useEffect, useMemo, type ReactNode } from "react";
import { todayKey } from "../daily";
import { At, CELL, CellArrow, Cracks, Enemy, Enso, Hero, MoveDot, Prop, SpitLine, Splat, Terrain, Threat, type EnemyKind, type HeroKind } from "./figures";
import { BRUSH_FONT, INK, INK_2, INK_3, INK_4, InkBackdrop, InkButton, InkDefs, InkStat, PAPER, PAPER_DEEP, PAPER_LIGHT, SERIF, Scroll, Seal, VERMILION, WOOD, loadInkFonts } from "./ink";

const HEROES: { kind: HeroKind; name: string; max: number; blurb: string }[] = [
  { kind: "wanderer", name: "The Wanderer", max: 3, blurb: "Shoves an adjacent unit one tile. No damage, but the edge is close." },
  { kind: "crane", name: "The Crane", max: 2, blurb: "Swaps places with the first unit in a line, up to three tiles away." },
  { kind: "ox", name: "The Ox", max: 4, blurb: "Charges in a line, dealing 1 damage and shoving what it hits." },
];

const ENEMIES: { kind: EnemyKind; name: string; max: number; blurb: string }[] = [
  { kind: "blot", name: "Blot", max: 1, blurb: "Strikes an adjacent tile." },
  { kind: "spitter", name: "Spitter", max: 1, blurb: "Spits ink down a straight line." },
  { kind: "brute", name: "Brute", max: 3, blurb: "Heavy. Strikes and shoves; can knock a hero off the edge." },
];

const SAMPLE = ["..####..", ".######.", "########", "###..###", "########", ".######.", "..####.."];

/** Every Brink visual on one page, for reviewing the ink style before the game is built. */
export function BrinkArtSheet() {
  const dateKey = useMemo(todayKey, []);
  useEffect(loadInkFonts, []);

  return (
    <div style={{ display: "grid", gap: 36, padding: "8px 0 40px", fontFamily: SERIF, color: INK }}>
      <InkBackdrop dateKey={dateKey} />
      <InkDefs />

      <Scroll>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ fontFamily: BRUSH_FONT, fontSize: 84, lineHeight: 0.9, letterSpacing: "-0.04em" }}>Brink</div>
          <Seal char="崖" size={64} />
          <div style={{ flex: 1, minWidth: 220, color: INK_2, fontSize: 15, lineHeight: 1.6 }}>
            Art sheet for the ink-and-parchment cliffs. One fight a day on a plateau above the mist. Shove the ink spirits over the
            edge before they strike.
          </div>
        </div>
      </Scroll>

      <Section title="Ink and paper" note="Five ink tones from wet black to the palest wash, warm parchment, and vermilion used only for seals, danger, and life.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {[
            ["Ink", INK],
            ["Ink wash", INK_2],
            ["Grey wash", INK_3],
            ["Pale wash", INK_4],
            ["Parchment", PAPER],
            ["Deep parchment", PAPER_DEEP],
            ["Vermilion", VERMILION],
            ["Scroll wood", WOOD],
          ].map(([name, color]) => (
            <figure key={name} style={{ margin: 0, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 6, background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }} />
              <figcaption style={captionStyle}>{name}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="Heroes" note="Three travelers on pillars of stone. Red squares above them are their health.">
        <div style={rowStyle}>
          {HEROES.map((h) => (
            <Labeled key={h.kind} name={h.name} blurb={h.blurb}>
              <Pillar>
                <Hero kind={h.kind} max={h.max} hp={h.max} />
              </Pillar>
            </Labeled>
          ))}
        </div>
      </Section>

      <Section title="Ink spirits" note="Living blots of ink. White dots are their health; when one falls from the edge it is gone.">
        <div style={rowStyle}>
          {ENEMIES.map((e) => (
            <Labeled key={e.kind} name={e.name} blurb={e.blurb}>
              <Pillar>
                <Enemy kind={e.kind} max={e.max} hp={e.max} />
              </Pillar>
            </Labeled>
          ))}
        </div>
      </Section>

      <Section title="Terrain" note="Stone tiles, cracked ground that crumbles, blocking pines and boulders, and the shrine lantern some fights ask you to protect.">
        <div style={rowStyle}>
          <Labeled name="Plateau edge" blurb="Cliff faces fall away into drifting mist.">
            <Board layout={["###", "#.#", "###"]} pad={30}>
              {null}
            </Board>
          </Labeled>
          <Labeled name="Cracked ground" blurb="Crumbles after a unit leaves it.">
            <Pillar>
              <Cracks />
            </Pillar>
          </Labeled>
          <Labeled name="Pine" blurb="Blocks movement and shoves.">
            <Pillar>
              <Prop kind="pine" />
            </Pillar>
          </Labeled>
          <Labeled name="Boulder" blurb="Blocks movement and shoves.">
            <Pillar>
              <Prop kind="boulder" />
            </Pillar>
          </Labeled>
          <Labeled name="Shrine lantern" blurb="Protect it when the day asks.">
            <Pillar>
              <Prop kind="lantern" />
            </Pillar>
          </Labeled>
        </div>
      </Section>

      <Section title="Signals" note="Everything the board tells you before you act: where you can move, what the enemies will hit, and what your shove will do.">
        <div style={rowStyle}>
          <Labeled name="Selected hero" blurb="An enso brushed at the hero's feet.">
            <Pillar>
              <Enso />
              <Hero kind="wanderer" />
            </Pillar>
          </Labeled>
          <Labeled name="Move range" blurb="Ink dabs on reachable tiles.">
            <Board layout={["###", "###"]} pad={30}>
              {[[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]].map(([x, y]) => (
                <At key={`${x}${y}`} x={x!} y={y!}>
                  <MoveDot />
                </At>
              ))}
              <At x={1} y={1}>
                <Enso seed="range" />
                <Hero kind="crane" />
              </At>
            </Board>
          </Labeled>
          <Labeled name="Enemy strike" blurb="Red arrow and hatching on the target tile.">
            <Board layout={["##"]} pad={30}>
              <At x={1} y={0}>
                <Threat />
              </At>
              <At x={0} y={0}>
                <Enemy kind="blot" />
              </At>
              <CellArrow from={[0, 0]} to={[1, 0]} seed="strike" />
            </Board>
          </Labeled>
          <Labeled name="Ink spit" blurb="A dashed red line down a row.">
            <Board layout={["####"]} pad={30}>
              <At x={0} y={0}>
                <Threat seed="spit" />
              </At>
              <At x={3} y={0}>
                <Enemy kind="spitter" />
              </At>
              <SpitLine from={[3, 0]} to={[0, 0]} />
            </Board>
          </Labeled>
          <Labeled name="Shove" blurb="Black arrow shows where your shove sends it.">
            <Board layout={["##."]} pad={30}>
              <At x={0} y={0}>
                <Hero kind="wanderer" seed="shove" />
              </At>
              <At x={1} y={0}>
                <Enemy kind="blot" seed="shoved" />
              </At>
              <CellArrow from={[1, 0]} to={[2, 0]} color={INK} seed="shove" bend={-8} />
            </Board>
          </Labeled>
          <Labeled name="Wounded" blurb="A red splash where a hit lands.">
            <Pillar>
              <Hero kind="ox" max={4} hp={2} />
              <Splat />
            </Pillar>
          </Labeled>
          <Labeled name="Into the mist" blurb="A shoved spirit falls and dissolves.">
            <Board layout={["#."]} pad={30}>
              <At x={1} y={0} style={{ opacity: 0.45 }}>
                <g transform="translate(0 46) scale(0.8)">
                  <Enemy kind="blot" seed="falling" />
                </g>
              </At>
            </Board>
          </Labeled>
        </div>
      </Section>

      <Section title="A sample morning" note="Mid-fight. The Wanderer is about to shove a blot into the chasm before it strikes; a spitter has the Crane in its sights, and a brute is closing on the lantern.">
        <Board layout={SAMPLE} pad={40} maxWidth={760}>
          {[[2, 5], [4, 5], [3, 6], [2, 4], [4, 4]].map(([x, y]) => (
            <At key={`m${x}${y}`} x={x!} y={y!}>
              <MoveDot />
            </At>
          ))}
          <At x={3} y={5}>
            <Threat seed="s1" />
          </At>
          <At x={4} y={2}>
            <Threat seed="s2" />
          </At>
          <At x={4} y={6}>
            <Threat seed="s3" />
          </At>
          <At x={6} y={2}>
            <Cracks seed="sample" />
          </At>
          <At x={3} y={5}>
            <Enso seed="sample" />
          </At>
          {[
            { x: 1, y: 1, el: <Prop kind="pine" seed="p1" /> },
            { x: 5, y: 1, el: <Prop kind="pine" seed="p2" /> },
            { x: 2, y: 6, el: <Prop kind="boulder" seed="b1" /> },
            { x: 4, y: 2, el: <Hero kind="crane" max={2} hp={2} seed="sample" /> },
            { x: 7, y: 2, el: <Enemy kind="spitter" max={1} seed="sample" /> },
            { x: 3, y: 4, el: <Enemy kind="blot" max={1} seed="sample" /> },
            { x: 3, y: 5, el: <Hero kind="wanderer" max={3} hp={3} seed="sample" /> },
            { x: 6, y: 5, el: <Hero kind="ox" max={4} hp={3} seed="sample" /> },
            { x: 5, y: 6, el: <Enemy kind="brute" max={3} hp={3} seed="sample" /> },
            { x: 4, y: 6, el: <Prop kind="lantern" /> },
          ]
            .sort((a, b) => a.y - b.y)
            .map((u) => (
              <At key={`u${u.x}${u.y}`} x={u.x} y={u.y}>
                {u.el}
              </At>
            ))}
          <CellArrow from={[3, 4]} to={[3, 5]} seed="a1" />
          <SpitLine from={[7, 2]} to={[4, 2]} seed="a2" />
          <CellArrow from={[5, 6]} to={[4, 6]} seed="a3" />
          <CellArrow from={[3, 4]} to={[3, 3]} color={INK} seed="a4" bend={-10} />
        </Board>
      </Section>

      <Section title="Interface" note="Brush-swash buttons, brush numerals, and the seal that marks a cleared day.">
        <div style={{ ...rowStyle, alignItems: "center" }}>
          <InkStat label="Turn" value="3" />
          <InkStat label="Wounds" value="1" />
          <InkButton primary onClick={() => {}}>
            End turn
          </InkButton>
          <InkButton onClick={() => {}}>Undo move</InkButton>
          <InkButton onClick={() => {}} disabled>
            Undo move
          </InkButton>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <div
            style={{
              position: "relative",
              width: 380,
              maxWidth: "100%",
              padding: "34px 28px 26px",
              textAlign: "center",
              background: PAPER_LIGHT,
              boxShadow: "0 16px 40px rgba(25,18,10,.3)",
            }}
          >
            <div style={{ position: "absolute", top: -26, right: -18, transform: "rotate(8deg)" }}>
              <Seal char="勝" size={84} />
            </div>
            <div style={{ fontFamily: BRUSH_FONT, fontSize: 44, lineHeight: 1 }}>Cleared</div>
            <div style={{ marginTop: 10, color: INK_2 }}>Brink No. 1 &middot; 4 turns &middot; 1 wound</div>
            <div style={{ marginTop: 18, padding: "10px 14px", background: "rgba(69,64,58,.07)", fontSize: 14 }}>Brink #1: cleared in 4 turns, 1 wound</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              <InkButton onClick={() => {}}>Copy</InkButton>
              <InkButton primary onClick={() => {}}>
                Fight again
              </InkButton>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const captionStyle = { fontSize: 12, color: INK_3, marginTop: 6 } as const;
const rowStyle = { display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-end" } as const;

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <Scroll>
      <h2 style={{ fontFamily: BRUSH_FONT, fontWeight: 400, fontSize: 42, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>{title}</h2>
      <p style={{ margin: "6px 0 22px", color: INK_2, fontSize: 14, maxWidth: 720 }}>{note}</p>
      {children}
    </Scroll>
  );
}

function Labeled({ name, blurb, children }: { name: string; blurb: string; children: ReactNode }) {
  return (
    <figure style={{ margin: 0, display: "grid", justifyItems: "center", maxWidth: 210 }}>
      {children}
      <figcaption style={{ textAlign: "center", marginTop: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
        <div style={{ fontSize: 12.5, color: INK_3, marginTop: 2 }}>{blurb}</div>
      </figcaption>
    </figure>
  );
}

/** A single stone pillar with one drawing on top. */
function Pillar({ children }: { children: ReactNode }) {
  return (
    <Board layout={["#"]} pad={30}>
      <At x={0} y={0}>
        {children}
      </At>
    </Board>
  );
}

/** A terrain board with drawings on top; `pad` leaves room for tall figures and cliff faces. */
function Board({ layout, pad, children, maxWidth }: { layout: string[]; pad: number; children: ReactNode; maxWidth?: number }) {
  const cols = layout[0]!.length;
  const rows = layout.length;
  const top = 95;
  const bottom = 110;
  const w = cols * CELL + pad * 2;
  const h = rows * CELL + top + bottom;
  return (
    <svg viewBox={`${-pad} ${-top} ${w} ${h}`} width={maxWidth ?? w * 0.9} style={{ maxWidth: "100%", height: "auto", overflow: "visible" }}>
      <Terrain layout={layout} seed={layout.join("/")} />
      {children}
    </svg>
  );
}
