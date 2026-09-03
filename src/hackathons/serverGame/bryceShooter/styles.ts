// all styles, scoped under .shoot

export const CSS = `
.shoot { --bg0:#090b0e; --bg1:#0f1319; --line:#1e242c; --text:#e2ddd1; --muted:#7c8792;
  --cyan:#35e0e6; --neon:#ff36a1; --amber:#ffab40; --good:#52c17a; --bad:#ff5d4d;
  width:100%; color:var(--text);
  font-family:"Helvetica Neue","Segoe UI",system-ui,-apple-system,sans-serif; }
.shoot * { box-sizing:border-box; }

.shoot-stage { background:linear-gradient(180deg,var(--bg1),var(--bg0)); border:1px solid var(--line);
  border-radius:16px; padding:14px; box-shadow:0 20px 60px rgba(0,0,0,.45); }

.shoot-top { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:12px; }
.shoot-brand { margin-right:auto; display:flex; align-items:baseline; gap:10px; }
.shoot-brand h1 { margin:0; font-size:24px; font-weight:900; letter-spacing:4px;
  background:linear-gradient(180deg,#fff 20%,var(--cyan) 60%,var(--neon) 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
.shoot-brand .tag { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }

.shoot-name { background:#0c0f13; border:1px solid var(--line); border-radius:8px; color:var(--text);
  font:600 12px inherit; letter-spacing:1px; padding:7px 10px; width:150px; outline:none; }
.shoot-name:focus { border-color:var(--cyan); }

.shoot-pills { display:flex; gap:8px; flex-wrap:wrap; }
.shoot-pill { border:1px solid var(--line); background:#0c0f13; border-radius:8px; padding:6px 11px;
  font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
.shoot-pill b { color:var(--text); font-size:12px; letter-spacing:1px; margin-left:6px; }
.shoot-pill.live b { color:var(--good); }
.shoot-pill.down b { color:var(--bad); }

.shoot-body { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
.shoot-canvas-wrap { position:relative; flex:1 1 620px; min-width:320px; }
.shoot-canvas { display:block; width:100%; height:auto; border:1px solid var(--line); border-radius:12px;
  background:#0a0c10; cursor:crosshair; touch-action:none; }

.shoot-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  flex-direction:column; gap:8px; background:rgba(9,11,14,.78); border-radius:12px; text-align:center;
  padding:20px; pointer-events:none; }
.shoot-overlay h2 { margin:0; font-size:20px; letter-spacing:3px; text-transform:uppercase; }
.shoot-overlay p { margin:0; color:var(--muted); font-size:12px; max-width:420px; line-height:1.6; }

.shoot-side { flex:0 0 250px; display:flex; flex-direction:column; gap:12px; }
.shoot-card { border:1px solid var(--line); background:#0c0f13; border-radius:12px; padding:12px; }
.shoot-card h3 { margin:0 0 10px; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); }

.shoot-row { display:flex; align-items:center; gap:8px; padding:5px 0; font-size:13px; }
.shoot-row .swatch { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
.shoot-row .who { flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.shoot-row .kd { color:var(--muted); font-variant-numeric:tabular-nums; font-size:12px; }
.shoot-row.me .who { color:var(--amber); font-weight:700; }

.shoot-stat { display:flex; align-items:baseline; justify-content:space-between; gap:8px; padding:4px 0;
  font-size:11px; color:var(--muted); }
.shoot-stat b { color:var(--text); font-size:12px; font-variant-numeric:tabular-nums; }
.shoot-stat b.warn { color:var(--amber); }

select.shoot-name { width:auto; cursor:pointer; }

.shoot-none { font-size:11px; color:var(--muted); }

.shoot-power { display:grid; grid-template-columns:1fr auto; gap:2px 8px; padding:5px 0; font-size:11px;
  text-transform:uppercase; letter-spacing:1px; }
.shoot-power b { color:var(--text); font-variant-numeric:tabular-nums; letter-spacing:0; }
.shoot-power .bar { grid-column:1 / -1; height:3px; border-radius:2px; background:#1b222a; overflow:hidden; }
.shoot-power .bar div { height:100%; border-radius:2px; transition:width .25s linear; }

.shoot-legend { display:flex; flex-wrap:wrap; gap:6px 10px; font-size:10px; letter-spacing:1px;
  text-transform:uppercase; color:var(--muted); }
.shoot-legend span { display:flex; align-items:center; gap:5px; }
.shoot-legend i { width:7px; height:7px; border-radius:50%; }

.shoot-row .pips { display:flex; gap:3px; flex:0 0 auto; }
.shoot-row .pips i { width:6px; height:6px; border-radius:50%; }

.shoot-feed { display:flex; flex-direction:column; gap:6px; min-height:70px; }
.shoot-feed div { font-size:11px; color:var(--muted); line-height:1.4; }
.shoot-feed b { color:var(--text); }

.shoot-keys { display:flex; flex-direction:column; gap:6px; font-size:11px; color:var(--muted); line-height:1.5; }
.shoot-keys kbd { background:#151a21; border:1px solid var(--line); border-bottom-width:2px; border-radius:4px;
  padding:1px 5px; font:600 10px inherit; color:var(--text); }
`;
