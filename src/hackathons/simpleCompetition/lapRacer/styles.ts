// all styles, scoped under .lap — synthwave/arcade skin for the HUD + overlays

import { FONT_LABEL } from "./util";

export const CSS = `
.lap { --red:#c8102e; --amber:#ffab40; --amber-dim:#c07f2e; --good:#52c17a;
  --neon:#ff36a1; --cyan:#35e0e6;
  --bg0:#0b0d10; --bg1:#0f1319; --text:#e2ddd1; --muted:#828d99;
  width:100%; color:var(--text); font-family:${FONT_LABEL}; }
.lap * { box-sizing:border-box; }
.lap-stage { width:100%; background:linear-gradient(180deg,var(--bg1),var(--bg0)); border:1px solid #20262e;
  border-radius:16px; padding:14px; box-shadow:0 20px 60px rgba(0,0,0,.4); }
.lap-top { display:flex; align-items:center; gap:14px; }
.lap-brand { display:flex; align-items:baseline; gap:8px; margin-right:auto; }
.lap-brand h1 { margin:0; font-size:28px; font-weight:900; letter-spacing:3px; font-style:italic;
  background:linear-gradient(180deg,#ffffff 15%,#ffd24a 45%,#ff69a8 72%,#8f7bff 96%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  filter:drop-shadow(0 2px 0 rgba(122,27,107,.8)); }
.lap-brand .dot { color:var(--red); }
.lap-brand .tag { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }
.sound-btn { border:1px solid #20262e; background:#0c0f13; color:var(--muted); font:700 11px ${FONT_LABEL};
  letter-spacing:2px; text-transform:uppercase; padding:6px 12px; border-radius:8px; cursor:pointer; transition:border-color .15s, color .15s; }
.sound-btn:hover { border-color:var(--cyan); color:var(--cyan); }
.sound-btn.on { color:var(--amber); border-color:var(--amber-dim); }

.road-wrap { position:relative; width:100%; aspect-ratio:16/9; border-radius:12px; overflow:hidden;
  border:1px solid #20262e; background:#0a0c0f; margin-top:12px; }
.road { position:absolute; inset:0; width:100%; height:100%; display:block; }
.crt { position:absolute; inset:0; pointer-events:none; z-index:1; opacity:.45;
  background:repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px),
             radial-gradient(ellipse at center, transparent 62%, rgba(4,2,12,.36) 100%); }

.hud-timing { position:absolute; top:12px; left:12px; display:flex; flex-direction:column; gap:3px;
  background:rgba(8,10,13,.62); backdrop-filter:blur(6px); padding:8px 12px; border-radius:10px;
  border:1px solid rgba(53,224,230,.30); box-shadow:0 0 14px rgba(53,224,230,.14); }
.lap-line { display:flex; align-items:baseline; gap:8px; font-variant-numeric:tabular-nums; }
.lap-line .k { font-size:10px; letter-spacing:2px; color:var(--muted); width:34px; }
.lap-line .v { font:700 16px ui-monospace,Menlo,monospace; color:var(--text); }
.lap-line.big .v { font-size:28px; font-style:italic; color:#fff; text-shadow:0 0 12px rgba(53,224,230,.75); }
.lap-line .v.best { color:var(--amber); text-shadow:0 0 10px rgba(255,171,64,.5); }

.delta { position:absolute; top:12px; left:50%; transform:translateX(-50%); opacity:0;
  font:800 22px ui-monospace,Menlo,monospace; padding:4px 14px; border-radius:8px; transition:opacity .2s; }
.delta.show { opacity:1; }
.delta.ahead { background:rgba(82,193,122,.92); color:#04150b; }
.delta.behind { background:rgba(224,47,38,.92); color:#fff; }

.hud-map { position:absolute; top:12px; right:12px; width:150px; height:126px;
  background:rgba(8,10,13,.62); backdrop-filter:blur(6px); border-radius:10px;
  border:1px solid rgba(255,54,161,.35); box-shadow:0 0 14px rgba(255,54,161,.14); padding:5px; }
.hud-map canvas { width:100%; height:100px; display:block; }
.hud-map .lapcount { display:block; text-align:center; font-size:11px; letter-spacing:1px; color:var(--muted); }
.hud-map .lapcount b { color:var(--text); }
.hud-map .lapcount b.pos { color:var(--amber); }

.hud-dash { position:absolute; bottom:12px; left:12px; display:flex; align-items:flex-end; gap:14px; }
.tach-box { width:118px; height:118px; }
.tach { width:100%; height:100%; display:block; }
.readout { display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
  background:rgba(8,10,13,.62); backdrop-filter:blur(6px); border-radius:10px;
  border:1px solid rgba(53,224,230,.30); box-shadow:0 0 14px rgba(53,224,230,.14); padding:6px 14px; }
.readout .gear { font:800 italic 40px ui-monospace,Menlo,monospace; line-height:1;
  background:linear-gradient(180deg,#ffe07a,#ff5a36); -webkit-background-clip:text; background-clip:text; color:transparent; }
.readout .rpm, .readout .mph { font:700 14px ui-monospace,Menlo,monospace; color:var(--text); }
.readout .rpm i, .readout .mph i { color:var(--muted); font-style:normal; font-size:10px; margin-left:3px; letter-spacing:1px; }
.pedals { display:flex; gap:6px; align-items:flex-end; }
.pedal { position:relative; width:22px; height:70px; background:rgba(8,10,13,.6); border-radius:6px; border:1px solid rgba(255,255,255,.08); overflow:hidden; }
.pedal .fill { position:absolute; bottom:0; left:0; right:0; height:0%; }
.pedal .fill.gas { background:linear-gradient(180deg,var(--good),#2c8a52); }
.pedal .fill.brake { background:linear-gradient(180deg,var(--red),#7d0a1c); }
.pedal span { position:absolute; bottom:2px; left:0; right:0; text-align:center; font-size:8px; letter-spacing:1px; color:#fff; mix-blend-mode:difference; }

.banner { position:absolute; top:42%; left:50%; transform:translate(-50%,-50%) scale(.8) skewX(-6deg); opacity:0;
  font:900 42px ${FONT_LABEL}; font-style:italic; letter-spacing:2px; text-align:center; pointer-events:none;
  text-shadow:0 3px 0 rgba(0,0,0,.5), 0 0 28px rgba(255,90,160,.65); transition:opacity .18s, transform .18s; z-index:4; }
.banner.show { opacity:1; transform:translate(-50%,-50%) scale(1) skewX(-6deg); }
.banner.count { color:#fff; font-size:72px; }
.banner.go { color:var(--good); font-size:72px; }
.banner.best { color:var(--amber); }
.banner.info { color:var(--text); }

/* ---- dev tuning panel ---- */
.dev { position:absolute; top:146px; right:12px; width:236px; display:none; flex-direction:column; gap:4px;
  background:rgba(8,10,13,.85); backdrop-filter:blur(6px); border:1px solid rgba(53,224,230,.4);
  box-shadow:0 0 18px rgba(53,224,230,.18); border-radius:10px; padding:10px 12px; z-index:5; }
.dev.open { display:flex; }
.dev h3 { margin:0 0 4px; font:800 11px ${FONT_LABEL}; letter-spacing:3px; color:var(--cyan); }
.dev-rows { display:flex; flex-direction:column; gap:5px; }
.dev-row { display:grid; grid-template-columns:80px 1fr 40px; align-items:center; gap:6px;
  font:600 10px ${FONT_LABEL}; letter-spacing:.5px; color:#c9d4dd; }
.dev-row input[type=range] { width:100%; margin:0; accent-color:var(--neon); }
.dev-row .val { text-align:right; font:700 10px ui-monospace,Menlo,monospace; color:var(--amber); }
.dev-reset { margin-top:6px; align-self:flex-end; background:none; border:1px solid #3a4149; color:var(--muted);
  font:700 10px ${FONT_LABEL}; letter-spacing:1px; padding:3px 9px; border-radius:6px; cursor:pointer; }
.dev-reset:hover { border-color:var(--neon); color:var(--neon); }

/* ---- race results ---- */
.results { position:absolute; inset:0; z-index:5; display:flex; align-items:center; justify-content:center;
  background:rgba(8,6,20,.5); backdrop-filter:blur(3px); }
.results.hidden { display:none; }
.results-card { text-align:center; min-width:300px; padding:24px 38px 20px; border-radius:16px;
  border:2px solid rgba(255,255,255,.55);
  background:linear-gradient(180deg, rgba(36,16,86,.94), rgba(195,49,137,.9));
  box-shadow:0 0 44px rgba(255,90,160,.5); }
.results-title { font:900 52px/1 "Arial Black",${FONT_LABEL}; font-style:italic; letter-spacing:5px;
  background:linear-gradient(180deg,#ffffff 12%,#ffe07a 42%,#ff69a8 68%,#8f7bff 94%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  filter:drop-shadow(0 3px 0 #7a1b6b) drop-shadow(0 0 18px rgba(255,90,160,.55)); }
.rrow { display:flex; justify-content:space-between; align-items:baseline; gap:34px; margin-top:10px;
  font:700 13px ${FONT_LABEL}; letter-spacing:2px; color:#ffe6a0; }
.rrow b { font:800 20px ui-monospace,Menlo,monospace; color:#fff; font-variant-numeric:tabular-nums; }
.results-note { min-height:18px; margin-top:10px; font:800 13px ${FONT_LABEL}; letter-spacing:2px; color:#ffd24a;
  text-shadow:0 0 12px rgba(255,210,74,.7); }
.results-hint { margin-top:12px; font:700 11px ${FONT_LABEL}; letter-spacing:3px; color:rgba(255,255,255,.85); }

/* ---- retro California start screen ---- */
.start-screen { position:absolute; inset:0; z-index:6; overflow:hidden; display:flex; align-items:center; justify-content:center;
  background:linear-gradient(180deg,#241056 0%,#5b1c86 32%,#c33189 55%,#ff6b52 74%,#ffb03a 100%); }
.start-screen.hidden { display:none; }
.start-sun { position:absolute; top:20%; left:50%; transform:translateX(-50%); width:min(340px,54%); aspect-ratio:1; border-radius:50%;
  background:linear-gradient(180deg,#fff2a6 0%,#ffd24a 42%,#ff5a6e 100%);
  -webkit-mask:linear-gradient(#000 55%, transparent 55%), repeating-linear-gradient(#000 0 8px, transparent 8px 15px);
  -webkit-mask-composite:source-over; mask:linear-gradient(#000 55%, transparent 55%), repeating-linear-gradient(#000 0 8px, transparent 8px 15px);
  filter:drop-shadow(0 0 60px rgba(255,120,80,.6)); }
.start-grid { position:absolute; left:-60%; right:-60%; bottom:0; height:42%;
  background-image:linear-gradient(rgba(255,54,161,.55) 2px, transparent 2px), linear-gradient(90deg, rgba(255,54,161,.45) 2px, transparent 2px);
  background-size:100% 34px, 58px 100%;
  transform:perspective(300px) rotateX(64deg); transform-origin:bottom center;
  -webkit-mask:linear-gradient(transparent, #000 55%); mask:linear-gradient(transparent, #000 55%);
  animation:gridpull 1.1s linear infinite; }
@keyframes gridpull { to { background-position:0 34px, 0 0; } }
.start-inner { position:relative; z-index:2; text-align:center; padding-bottom:4%; }
.start-kicker { font:800 13px ${FONT_LABEL}; letter-spacing:8px; color:#ffe6a0; text-shadow:0 0 12px rgba(255,140,80,.8); }
.start-title { margin:4px 0 2px; font:900 clamp(56px,13vw,130px)/0.9 "Arial Black","Arial Black",${FONT_LABEL}; letter-spacing:6px;
  background:linear-gradient(180deg,#ffffff 8%,#ffe07a 38%,#ff69a8 62%,#8f7bff 92%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  -webkit-text-stroke:2px rgba(255,255,255,.16);
  filter:drop-shadow(0 3px 0 #7a1b6b) drop-shadow(0 0 22px rgba(255,90,160,.55)); }
.start-sub { font:600 14px ${FONT_LABEL}; letter-spacing:3px; text-transform:uppercase; color:#fff; opacity:.9; text-shadow:0 2px 10px rgba(0,0,0,.4); }
.track-picker { display:flex; gap:12px; justify-content:center; margin-top:18px; }
.track-card { display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer;
  border:2px solid rgba(255,255,255,.28); border-radius:12px; padding:8px 10px 6px;
  background:rgba(16,8,34,.38); backdrop-filter:blur(4px);
  transition:transform .15s, border-color .15s, box-shadow .15s, background .15s; }
.track-card:hover { transform:translateY(-2px); }
.track-card.active { border-color:#fff; background:rgba(255,255,255,.14); box-shadow:0 0 22px rgba(255,90,160,.65); }
.track-card canvas { display:block; }
.track-card .tname { font:800 12px ${FONT_LABEL}; letter-spacing:2px; color:#fff; }
.track-card .ttag { font:600 9px ${FONT_LABEL}; letter-spacing:1.5px; text-transform:uppercase; color:#ffe6a0; }
.diff-picker { display:flex; gap:8px; justify-content:center; margin-top:12px; }
.diff-btn { border:2px solid rgba(255,255,255,.3); background:rgba(16,8,34,.38); color:#fff;
  font:800 11px ${FONT_LABEL}; letter-spacing:2px; padding:6px 16px; border-radius:20px; cursor:pointer;
  backdrop-filter:blur(4px); transition:border-color .15s, background .15s, box-shadow .15s; }
.diff-btn:hover { border-color:rgba(255,255,255,.7); }
.diff-btn.active { border-color:#fff; background:rgba(255,255,255,.16); box-shadow:0 0 16px rgba(255,90,160,.6); }
.track-hint { margin-top:9px; font:700 11px ${FONT_LABEL}; letter-spacing:3px; color:rgba(255,255,255,.75); }
.start-btn { margin-top:14px; border:2px solid rgba(255,255,255,.7); background:rgba(255,255,255,.08); color:#fff;
  font:800 15px ${FONT_LABEL}; letter-spacing:3px; padding:12px 26px; border-radius:40px; cursor:pointer; backdrop-filter:blur(4px);
  box-shadow:0 0 24px rgba(255,90,160,.5); transition:transform .15s, background .15s; animation:pulseBtn 1.6s ease-in-out infinite; }
.start-btn:hover { background:rgba(255,255,255,.2); transform:translateY(-2px); }
@keyframes pulseBtn { 0%,100%{ box-shadow:0 0 20px rgba(255,90,160,.4); } 50%{ box-shadow:0 0 34px rgba(255,90,160,.75); } }

.lap-controls { display:flex; flex-wrap:wrap; gap:6px 16px; margin-top:12px; padding:0 2px; font-size:12px; color:var(--muted); }
.lap-controls b { color:var(--text); font-family:ui-monospace,Menlo,monospace; }
`;
