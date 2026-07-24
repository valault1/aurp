// canvas sprite drawing: player roadster, traffic/rival cars, trees, road-quad helpers.
// Everything takes ctx (+ a fog() shader for distance haze) so the module stays pure.

import { clamp, type Col } from "./util";

export type FogFn = (color: Col, amount: number) => string;

export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath(); ctx.fill();
}

export function quad(ctx: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2);
  ctx.closePath(); ctx.fill();
}

export function checker(ctx: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number) {
  const cells = 8;
  for (let i = 0; i < cells; i++) {
    const a = i / cells, b = (i + 1) / cells;
    ctx.fillStyle = i % 2 === 0 ? "#f4f4f4" : "#15181d";
    ctx.beginPath();
    ctx.moveTo((x1 - w1) + 2 * w1 * a, y1); ctx.lineTo((x1 - w1) + 2 * w1 * b, y1);
    ctx.lineTo((x2 - w2) + 2 * w2 * b, y2); ctx.lineTo((x2 - w2) + 2 * w2 * a, y2);
    ctx.closePath(); ctx.fill();
  }
}

export function drawTree(ctx: CanvasRenderingContext2D, fog: FogFn, sx: number, sy: number, w: number, f: number, canopy: Col) {
  const th = Math.min(w * 1.3, 260); // canopy height (capped so close trees aren't huge)
  const tw = th * 0.5;
  ctx.fillStyle = fog([60, 42, 26], f);
  ctx.fillRect(sx - th * 0.04, sy - th * 0.34, th * 0.08, th * 0.34);
  ctx.fillStyle = fog(canopy, f);
  for (let i = 0; i < 3; i++) {
    const ty = sy - th * (0.28 + i * 0.28);
    const twi = tw * (1 - i * 0.24);
    ctx.beginPath();
    ctx.moveTo(sx, ty - th * 0.34);
    ctx.lineTo(sx - twi * 0.5, ty);
    ctx.lineTo(sx + twi * 0.5, ty);
    ctx.closePath(); ctx.fill();
  }
}

// four retro silhouettes: 0 = wedge coupe w/ spoiler, 1 = surf van, 2 = round bug,
// 3 = RACER (rival cars — coupe with a big wing and a racing stripe)
export function drawTrafficCar(ctx: CanvasRenderingContext2D, fog: FogFn, sx: number, sy: number, w: number, f: number, color: Col, variant: number) {
  // sized to read like the player's car, not a billboard. Width tracks the road's
  // perspective for depth; the cap clamps the near zone BELOW the player sprite's size —
  // the player car is itself drawn smaller than true near-plane scale (the classic
  // OutRun cheat so it doesn't fill the screen), so matching true scale here would make
  // everyone alongside you look enormous. Squat height ratio keeps them low + sleek.
  const cw = Math.min(w * 0.38, 210), ch = cw * 0.54;
  const glass: Col = [16, 18, 24];
  const darker: Col = [color[0] * 0.55, color[1] * 0.55, color[2] * 0.55];
  ctx.fillStyle = "rgba(0,0,0,.26)";
  ctx.beginPath(); ctx.ellipse(sx, sy, cw * 0.54, ch * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  // wheels
  ctx.fillStyle = fog([12, 14, 17], f);
  rrect(ctx, sx - cw * 0.49, sy - ch * 0.2, cw * 0.16, ch * 0.22, cw * 0.03);
  rrect(ctx, sx + cw * 0.33, sy - ch * 0.2, cw * 0.16, ch * 0.22, cw * 0.03);
  ctx.fillStyle = fog(color, f);
  if (variant === 1) {
    // camper van: tall two-tone box, big window, surfboard on the roof
    rrect(ctx, sx - cw / 2, sy - ch * 1.16, cw, ch * 1.06, ch * 0.14);
    ctx.fillStyle = fog(darker, f);
    rrect(ctx, sx - cw / 2, sy - ch * 0.5, cw, ch * 0.4, ch * 0.1);
    ctx.fillStyle = fog(glass, f);
    rrect(ctx, sx - cw * 0.4, sy - ch * 1.08, cw * 0.8, ch * 0.4, ch * 0.1);
    ctx.fillStyle = fog([236, 228, 208], f);
    rrect(ctx, sx - cw * 0.36, sy - ch * 1.28, cw * 0.72, ch * 0.1, ch * 0.05);
  } else if (variant === 2) {
    // round little bug: dome body, small rear window
    ctx.beginPath();
    ctx.moveTo(sx - cw * 0.5, sy - ch * 0.1);
    ctx.quadraticCurveTo(sx - cw * 0.52, sy - ch * 0.92, sx, sy - ch * 0.98);
    ctx.quadraticCurveTo(sx + cw * 0.52, sy - ch * 0.92, sx + cw * 0.5, sy - ch * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = fog(glass, f);
    ctx.beginPath();
    ctx.moveTo(sx - cw * 0.26, sy - ch * 0.6);
    ctx.quadraticCurveTo(sx, sy - ch * 0.95, sx + cw * 0.26, sy - ch * 0.6);
    ctx.closePath(); ctx.fill();
  } else {
    // wedge coupe: low body, raked greenhouse, whale-tail spoiler
    rrect(ctx, sx - cw / 2, sy - ch * 0.74, cw, ch * 0.66, ch * 0.16);
    if (variant === 3) { // racer: full-length stripe under the greenhouse
      ctx.fillStyle = fog([245, 245, 245], f);
      rrect(ctx, sx - cw * 0.09, sy - ch * 0.74, cw * 0.18, ch * 0.62, cw * 0.02);
    }
    ctx.fillStyle = fog(glass, f);
    rrect(ctx, sx - cw * 0.33, sy - ch * 0.92, cw * 0.66, ch * 0.38, ch * 0.12);
    ctx.fillStyle = fog(variant === 3 ? [20, 22, 26] : darker, f);
    const wingY = variant === 3 ? 1.12 : 1.0; // racers carry the wing high
    rrect(ctx, sx - cw * 0.46, sy - ch * wingY, cw * 0.92, ch * 0.09, cw * 0.02);
    rrect(ctx, sx - cw * 0.42, sy - ch * (wingY - 0.06), cw * 0.05, ch * (wingY - 0.8), 2);
    rrect(ctx, sx + cw * 0.37, sy - ch * (wingY - 0.06), cw * 0.05, ch * (wingY - 0.8), 2);
  }
  // chrome bumper + wraparound tail lights (shared by every variant)
  ctx.fillStyle = fog([206, 214, 222], f);
  rrect(ctx, sx - cw * 0.48, sy - ch * 0.17, cw * 0.96, ch * 0.1, cw * 0.02);
  ctx.fillStyle = fog([255, 77, 90], f);
  rrect(ctx, sx - cw * 0.45, sy - ch * 0.32, cw * 0.2, ch * 0.13, 3);
  rrect(ctx, sx + cw * 0.25, sy - ch * 0.32, cw * 0.2, ch * 0.13, 3);
  ctx.fillStyle = fog([255, 196, 130], f);
  rrect(ctx, sx - cw * 0.45, sy - ch * 0.3, cw * 0.06, ch * 0.09, 2);
  rrect(ctx, sx + cw * 0.39, sy - ch * 0.3, cw * 0.06, ch * 0.09, 2);
}

export interface PlayerPose {
  playerX: number; steerVel: number; driftVel: number;
  position: number; speed: number; brake: number;
}

// rear view of the little red roadster — chunky OutRun-style sprite
export function drawPlayerCar(ctx: CanvasRenderingContext2D, W: number, H: number, s: PlayerPose) {
  const cw = Math.min(W * 0.24, 300);
  const scale = cw / 300;
  // the car slides toward the screen edge as you drift wide — reads as YOU sliding,
  // not the world moving. Clamped so it never leaves the frame.
  const cx = W / 2 + clamp(s.playerX, -1.6, 1.6) * (W * 0.13);
  const cy = H - cw * 0.30;
  const bob = Math.sin(s.position * 0.02) * (s.speed > 5 ? 1.2 : 0);
  // bank with how hard the car is actually moving sideways — steering AND slide
  const bank = clamp((s.steerVel + s.driftVel) * 0.05, -0.2, 0.2);

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(scale, scale);
  ctx.rotate(bank);

  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath(); ctx.ellipse(0, 68, 158, 20, 0, 0, Math.PI * 2); ctx.fill();
  // rear tyres — wide + squat, silver hubs peeking under the bumper
  ctx.fillStyle = "#0e1013";
  rrect(ctx, -158, 24, 48, 44, 10); rrect(ctx, 110, 24, 48, 44, 10);
  ctx.fillStyle = "#3c434c";
  rrect(ctx, -146, 52, 24, 10, 4); rrect(ctx, 122, 52, 24, 10, 4);
  // rear valance + diffuser
  ctx.fillStyle = "#17191d"; rrect(ctx, -126, 42, 252, 24, 8);
  // fender hips — wide-body bulges
  const hip = ctx.createLinearGradient(0, -14, 0, 50);
  hip.addColorStop(0, "#dd1d3d"); hip.addColorStop(1, "#7e0a1e");
  ctx.fillStyle = hip;
  rrect(ctx, -150, -8, 60, 56, 20); rrect(ctx, 90, -8, 60, 56, 20);
  // body (vertical gradient for depth)
  const g = ctx.createLinearGradient(0, -36, 0, 48);
  g.addColorStop(0, "#f23350"); g.addColorStop(0.5, "#c8102e"); g.addColorStop(1, "#8f0c22");
  ctx.fillStyle = g; rrect(ctx, -132, -32, 264, 80, 20);
  // trunk speedline highlight
  ctx.fillStyle = "rgba(255,255,255,.14)"; rrect(ctx, -118, -28, 236, 12, 8);
  // twin roll hoops peeking over the soft-top
  ctx.fillStyle = "#20262e";
  ctx.beginPath(); ctx.arc(-36, -48, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(36, -48, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
  // soft-top + rear glass with a sun glare strip
  ctx.fillStyle = "#111418"; rrect(ctx, -76, -48, 152, 32, 13);
  ctx.fillStyle = "#05070a"; rrect(ctx, -62, -42, 124, 20, 8);
  ctx.fillStyle = "rgba(140,220,255,.16)"; rrect(ctx, -62, -42, 124, 8, 6);
  // side mirrors
  ctx.fillStyle = "#a90f28";
  rrect(ctx, -152, -24, 18, 12, 5); rrect(ctx, 134, -24, 18, 12, 5);
  // chrome rear bumper
  const chrome = ctx.createLinearGradient(0, 30, 0, 44);
  chrome.addColorStop(0, "#e8edf2"); chrome.addColorStop(0.5, "#9aa6b1"); chrome.addColorStop(1, "#5c666f");
  ctx.fillStyle = chrome; rrect(ctx, -128, 30, 256, 12, 6);
  // wraparound tail lights (+ brake glow when you're actually on the brakes)
  ctx.fillStyle = "#4a0410"; rrect(ctx, -122, 12, 58, 16, 5); rrect(ctx, 64, 12, 58, 16, 5);
  ctx.fillStyle = "#ff4d5a"; rrect(ctx, -116, 15, 46, 9, 4); rrect(ctx, 70, 15, 46, 9, 4);
  if (s.brake > 0.15) {
    ctx.fillStyle = `rgba(255,46,70,${(s.brake * 0.6).toFixed(2)})`;
    rrect(ctx, -126, 8, 66, 24, 8); rrect(ctx, 60, 8, 66, 24, 8);
  }
  ctx.fillStyle = "rgba(255,190,120,.95)"; rrect(ctx, -114, 16, 10, 7, 3); rrect(ctx, 104, 16, 10, 7, 3);
  // plate
  ctx.fillStyle = "#e9e3d2"; rrect(ctx, -26, 14, 52, 15, 3);
  ctx.fillStyle = "#3a4149"; ctx.font = "700 11px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("APEX", 0, 22);
  // dual exhaust tips
  ctx.fillStyle = "#2a2f36"; ctx.beginPath(); ctx.arc(-44, 58, 6, 0, Math.PI * 2); ctx.arc(44, 58, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0a0c0e"; ctx.beginPath(); ctx.arc(-44, 58, 3, 0, Math.PI * 2); ctx.arc(44, 58, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
