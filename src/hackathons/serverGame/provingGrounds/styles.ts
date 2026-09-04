// all styles, scoped under .pg — stone-and-ember RPG skin

export const CSS = `
.pg { --bg0:#0a0908; --bg1:#12100e; --line:#2a251f; --text:#e8e0d2; --muted:#8b8175;
  --ember:#ff8a3d; --gold:#ffc861; --blood:#d2453f; --leaf:#6fbf73; --arcane:#8f7bff;
  --frost:#6fc0ff;
  width:100%; color:var(--text);
  font-family:"Helvetica Neue","Segoe UI",system-ui,-apple-system,sans-serif; }
.pg * { box-sizing:border-box; }

.pg-stage { background:linear-gradient(180deg,var(--bg1),var(--bg0)); border:1px solid var(--line);
  border-radius:16px; padding:14px; box-shadow:0 20px 60px rgba(0,0,0,.5); }

.pg-top { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:12px; }
.pg-brand { margin-right:auto; display:flex; align-items:baseline; gap:10px; }
.pg-brand h1 { margin:0; font-size:23px; font-weight:900; letter-spacing:5px;
  background:linear-gradient(180deg,#fff 15%,var(--gold) 55%,var(--ember) 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
.pg-brand .tag { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }

.pg-name { background:#0c0a09; border:1px solid var(--line); border-radius:8px; color:var(--text);
  font:600 12px inherit; letter-spacing:1px; padding:7px 10px; width:150px; outline:none; }
.pg-name:focus { border-color:var(--gold); }

.pg-pills { display:flex; gap:8px; flex-wrap:wrap; }
.pg-pill { border:1px solid var(--line); background:#0c0a09; border-radius:8px; padding:6px 11px;
  font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
.pg-pill b { color:var(--text); font-size:12px; letter-spacing:1px; margin-left:6px; font-variant-numeric:tabular-nums; }
.pg-pill.live b { color:var(--leaf); }
.pg-pill.down b { color:var(--blood); }
.pg-pill.clock b { color:var(--gold); }
.pg-pill.duel { border-color:var(--blood); }
.pg-pill.duel b { color:var(--blood); }

.pg-body { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
.pg-arena { position:relative; flex:1 1 680px; min-width:320px; }
.pg-canvas { display:block; width:100%; height:auto; border:1px solid var(--line); border-radius:12px;
  background:#0b0a09; cursor:crosshair; touch-action:none; }

.pg-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(10,9,8,.86); border-radius:12px; padding:24px; overflow:auto; }
.pg-overlay-inner { width:100%; max-width:760px; text-align:center; }
.pg-overlay h2 { margin:0 0 6px; font-size:22px; letter-spacing:5px; text-transform:uppercase; }
.pg-overlay p { margin:0 0 20px; color:var(--muted); font-size:12px; line-height:1.7; }

.pg-classes { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.pg-class { flex:1 1 200px; max-width:230px; text-align:left; background:#100e0c;
  border:1px solid var(--line); border-radius:12px; padding:14px; cursor:pointer;
  transition:border-color .15s, transform .15s, background .15s; }
.pg-class:hover { transform:translateY(-3px); background:#151210; }
.pg-class.on { border-color:currentColor; background:#181410; }
.pg-class h3 { margin:0 0 4px; font-size:15px; letter-spacing:2px; text-transform:uppercase; }
.pg-class .blurb { color:var(--muted); font-size:11px; line-height:1.6; margin-bottom:10px; min-height:52px; }
.pg-class dl { margin:0; display:grid; grid-template-columns:auto 1fr; gap:3px 10px; font-size:11px; }
.pg-class dt { color:var(--muted); }
.pg-class dd { margin:0; color:var(--text); text-align:right; font-variant-numeric:tabular-nums; }
.pg-class .kit { margin-top:10px; padding-top:10px; border-top:1px solid var(--line); font-size:11px; line-height:1.6; }
.pg-class .kit b { color:var(--text); }
.pg-class .kit span { color:var(--muted); }

.pg-go { margin-top:20px; border:1px solid var(--gold); background:transparent; color:var(--gold);
  font:700 12px inherit; letter-spacing:3px; text-transform:uppercase; padding:11px 30px;
  border-radius:10px; cursor:pointer; transition:background .15s, color .15s; }
.pg-go:hover:not(:disabled) { background:var(--gold); color:#12100e; }
.pg-go:disabled { border-color:var(--line); color:var(--muted); cursor:not-allowed; }
.pg-go.on { background:var(--gold); color:#12100e; }

.pg-side { flex:0 0 244px; display:flex; flex-direction:column; gap:12px; }
.pg-card { border:1px solid var(--line); background:#0e0c0b; border-radius:12px; padding:12px; }
.pg-card h3 { margin:0 0 10px; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }

.pg-sheet .who { display:flex; align-items:baseline; gap:8px; margin-bottom:8px; }
.pg-sheet .who b { font-size:14px; letter-spacing:1px; }
.pg-sheet .who span { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); margin-left:auto; }
.pg-bar { height:9px; border-radius:5px; background:#1c1815; overflow:hidden; margin-bottom:4px; position:relative; }
.pg-bar > div { height:100%; border-radius:5px; transition:width .2s linear; }
.pg-bar.hp > div { background:linear-gradient(90deg,#8e2b28,var(--blood)); }
.pg-bar.xp { height:5px; }
.pg-bar.xp > div { background:linear-gradient(90deg,#7a5c1f,var(--gold)); }
.pg-meta { display:flex; justify-content:space-between; font-size:10px; color:var(--muted);
  letter-spacing:1px; font-variant-numeric:tabular-nums; margin-bottom:8px; }
.pg-stats { display:grid; grid-template-columns:1fr auto; gap:3px 8px; font-size:11px; }
.pg-stats span { color:var(--muted); }
.pg-stats b { text-align:right; font-variant-numeric:tabular-nums; }

.pg-abils { display:flex; gap:8px; }
.pg-abil { position:relative; flex:0 0 52px; height:52px; border:1px solid var(--line); border-radius:10px;
  background:#141110; display:flex; align-items:center; justify-content:center; overflow:hidden;
  cursor:pointer; user-select:none; }
.pg-abil.locked { opacity:.3; cursor:default; }
.pg-abil .key { position:absolute; top:3px; left:5px; font-size:9px; color:var(--muted); letter-spacing:1px; }
.pg-abil .glyph { font-size:19px; font-weight:800; letter-spacing:0; }
.pg-abil .sweep { position:absolute; inset:0; background:rgba(8,7,6,.78); }
.pg-abil .sweep span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:800; color:var(--text); font-variant-numeric:tabular-nums; }
.pg-abil-name { margin-top:8px; font-size:11px; line-height:1.5; color:var(--muted); }
.pg-abil-name b { color:var(--text); }

.pg-row { display:flex; align-items:center; gap:8px; padding:5px 0; font-size:12px; }
.pg-row .swatch { width:9px; height:9px; border-radius:2px; flex:0 0 auto; }
.pg-row .who { flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pg-row .lv { color:var(--muted); font-size:11px; font-variant-numeric:tabular-nums; }
.pg-row.me .who { color:var(--gold); font-weight:700; }
.pg-row.dead { opacity:.45; }

.pg-log { display:flex; flex-direction:column; gap:5px; max-height:132px; overflow:hidden; }
.pg-log div { font-size:11px; color:var(--muted); line-height:1.45; }
.pg-log div:first-child { color:var(--text); }

.pg-help { font-size:11px; color:var(--muted); line-height:1.7; }
.pg-help kbd { background:#1c1815; border:1px solid var(--line); border-bottom-width:2px; border-radius:4px;
  padding:1px 5px; font:600 10px inherit; color:var(--text); }

.pg-result { display:flex; flex-direction:column; gap:6px; margin-top:14px; font-size:12px; }
.pg-result div { display:flex; gap:10px; justify-content:center; color:var(--muted); }
.pg-result b { color:var(--text); }
`;
