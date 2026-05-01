import { Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

// ----- 80s NEON PALETTE -----
const NEON_PINK = 0xff2bd6;
const NEON_CYAN = 0x00f0ff;
const NEON_YELLOW = 0xfff200;
const NEON_PURPLE = 0xb026ff;
const NEON_ORANGE = 0xff6b00;
const NEON_GREEN = 0x39ff14;
const NEON_RED = 0xff003c;
const NEON_BLUE = 0x4d6bff;

const NEON_PINK_CSS = "#ff2bd6";
const NEON_CYAN_CSS = "#00f0ff";
const NEON_YELLOW_CSS = "#fff200";

// ----- TABLE GEOMETRY -----
const TABLE_W = 800;
const TABLE_H = 480;
const RAIL = 28;
const PLAY_X = RAIL;
const PLAY_Y = RAIL;
const PLAY_W = TABLE_W - 2 * RAIL;
const PLAY_H = TABLE_H - 2 * RAIL;
const BALL_R = 12;
const POCKET_R = 22;
const MAX_POWER_TICKS = 1000;
const MIN_SHOT_SPEED = 120;
const MAX_SHOT_SPEED = 900;
const BALL_DRAG_COEFFICIENT = 0.4; // lower = more friction
const MAX_PREDICTION_DEPTH = 4; // hops shown after the first contact

const POCKETS = [
  { x: PLAY_X + 8, y: PLAY_Y + 8 },
  { x: TABLE_W / 2, y: PLAY_Y + 2 },
  { x: TABLE_W - PLAY_X - 8, y: PLAY_Y + 8 },
  { x: PLAY_X + 8, y: TABLE_H - PLAY_Y - 8 },
  { x: TABLE_W / 2, y: TABLE_H - PLAY_Y - 2 },
  { x: TABLE_W - PLAY_X - 8, y: TABLE_H - PLAY_Y - 8 },
];

const BALL_COLORS = [
  NEON_YELLOW,
  NEON_BLUE,
  NEON_RED,
  NEON_PURPLE,
  NEON_ORANGE,
  NEON_GREEN,
  NEON_PINK,
  NEON_CYAN,
  NEON_YELLOW,
  NEON_RED,
];

const CUE_START = { x: PLAY_X + PLAY_W * 0.22, y: TABLE_H / 2 };

const poolEvents = new Phaser.Events.EventEmitter();

// ----- PHASER SCENE -----
class PoolScene extends Phaser.Scene {
  private cueBall!: Phaser.Physics.Arcade.Sprite;
  private balls: Phaser.Physics.Arcade.Sprite[] = [];
  private aimGfx!: Phaser.GameObjects.Graphics;
  private powerGfx!: Phaser.GameObjects.Graphics;
  private powering = false;
  private power = 0;
  private aimAngle = 0;
  private shots = 0;
  private remaining = 0;
  private gameOver = false;
  private predictionEnabled = true;

  constructor() {
    super("PoolScene");
  }

  create() {
    this.balls = [];
    this.shots = 0;
    this.gameOver = false;
    this.powering = false;
    this.power = 0;

    this.makeBallTextures();
    this.drawTable();

    this.aimGfx = this.add.graphics().setDepth(50);
    this.powerGfx = this.add.graphics().setDepth(51);

    this.spawnBalls();

    this.input.on("pointerdown", () => {
      if (this.gameOver) return;
      if (this.allStopped()) {
        this.powering = true;
        this.power = 0;
      }
    });
    this.input.on("pointerup", () => {
      if (this.powering && this.allStopped() && !this.gameOver) {
        this.shoot();
      }
      this.powering = false;
      this.power = 0;
    });

    const onReset = () => this.scene.restart();
    const onPrediction = (enabled: boolean) => {
      this.predictionEnabled = enabled;
    };
    poolEvents.on("RESET", onReset);
    poolEvents.on("PREDICTION", onPrediction);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      poolEvents.off("RESET", onReset);
      poolEvents.off("PREDICTION", onPrediction);
    });

    poolEvents.emit("STATE", { shots: 0, remaining: this.balls.length });
  }

  private makeBallTextures() {
    // cue ball
    const cg = this.make.graphics({ x: 0, y: 0 }, false);
    cg.fillStyle(0xffffff, 1);
    cg.fillCircle(BALL_R, BALL_R, BALL_R);
    cg.lineStyle(2, NEON_CYAN, 1);
    cg.strokeCircle(BALL_R, BALL_R, BALL_R - 1);
    cg.fillStyle(NEON_PINK, 1);
    cg.fillCircle(BALL_R + 3, BALL_R - 3, 1.5);
    cg.generateTexture("cueball", BALL_R * 2, BALL_R * 2);
    cg.destroy();

    BALL_COLORS.forEach((color, i) => {
      const gi = this.make.graphics({ x: 0, y: 0 }, false);
      gi.fillStyle(0x110022, 1);
      gi.fillCircle(BALL_R, BALL_R, BALL_R);
      gi.lineStyle(3, color, 1);
      gi.strokeCircle(BALL_R, BALL_R, BALL_R - 1);
      gi.fillStyle(color, 1);
      gi.fillCircle(BALL_R, BALL_R, BALL_R / 2.6);
      gi.generateTexture(`ball-${i}`, BALL_R * 2, BALL_R * 2);
      gi.destroy();
    });
  }

  private drawTable() {
    const g = this.add.graphics();

    // backdrop
    g.fillStyle(0x0a0020, 1);
    g.fillRect(0, 0, TABLE_W, TABLE_H);

    // rails (chunky neon frame)
    g.fillStyle(0x1a0033, 1);
    g.fillRect(0, 0, TABLE_W, RAIL);
    g.fillRect(0, TABLE_H - RAIL, TABLE_W, RAIL);
    g.fillRect(0, 0, RAIL, TABLE_H);
    g.fillRect(TABLE_W - RAIL, 0, RAIL, TABLE_H);

    // playing felt
    g.fillStyle(0x0d0026, 1);
    g.fillRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);

    // grid
    g.lineStyle(1, NEON_PINK, 0.18);
    for (let x = PLAY_X; x <= PLAY_X + PLAY_W; x += 32) {
      g.lineBetween(x, PLAY_Y, x, PLAY_Y + PLAY_H);
    }
    for (let y = PLAY_Y; y <= PLAY_Y + PLAY_H; y += 32) {
      g.lineBetween(PLAY_X, y, PLAY_X + PLAY_W, y);
    }

    // neon double border
    g.lineStyle(3, NEON_PINK, 1);
    g.strokeRect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H);
    g.lineStyle(1, NEON_CYAN, 0.7);
    g.strokeRect(PLAY_X - 5, PLAY_Y - 5, PLAY_W + 10, PLAY_H + 10);
    g.lineStyle(2, NEON_CYAN, 0.9);
    g.strokeRect(2, 2, TABLE_W - 4, TABLE_H - 4);

    // pockets
    POCKETS.forEach((p) => {
      const pg = this.add.graphics();
      pg.fillStyle(0x000000, 1);
      pg.fillCircle(p.x, p.y, POCKET_R);
      pg.lineStyle(2, NEON_CYAN, 1);
      pg.strokeCircle(p.x, p.y, POCKET_R);
      pg.lineStyle(1, NEON_PINK, 0.6);
      pg.strokeCircle(p.x, p.y, POCKET_R - 4);
    });
  }

  private spawnBalls() {
    this.cueBall = this.physics.add.sprite(CUE_START.x, CUE_START.y, "cueball");
    this.cueBall.setCircle(BALL_R);
    this.cueBall.setBounce(1, 1);
    this.cueBall.setDamping(true);
    // Drag in damping mode is "fraction of velocity retained per second" —
    // lower = more friction. 0.35 ≈ felt-table feel.
    this.cueBall.setDrag(BALL_DRAG_COEFFICIENT, BALL_DRAG_COEFFICIENT);
    this.cueBall.setData("isCue", true);

    // rack triangle on the right
    const rackX = PLAY_X + PLAY_W * 0.7;
    const rackY = TABLE_H / 2;
    let idx = 0;
    const spacing = BALL_R * 2 + 1;
    for (let row = 0; row < 4 && idx < 10; row++) {
      for (let col = 0; col <= row && idx < 10; col++) {
        const x = rackX + row * (spacing * 0.87);
        const y = rackY + col * spacing - row * BALL_R;
        const ball = this.physics.add.sprite(x, y, `ball-${idx}`);
        ball.setCircle(BALL_R);
        ball.setBounce(1, 1);
        ball.setDamping(true);
        ball.setDrag(BALL_DRAG_COEFFICIENT, BALL_DRAG_COEFFICIENT);
        ball.setData("ballIdx", idx);
        ball.setData("color", BALL_COLORS[idx]);
        this.balls.push(ball);
        idx++;
      }
    }

    const all = [this.cueBall, ...this.balls];
    this.physics.add.collider(all, all);
    this.remaining = this.balls.length;
  }

  private allStopped() {
    const all = [this.cueBall, ...this.balls];
    return all.every((b) => {
      if (!b.active) return true;
      const v = b.body?.velocity;
      if (!v) return true;
      return Math.abs(v.x) < 4 && Math.abs(v.y) < 4;
    });
  }

  // Ray-cast the cue ball's path and return the first object ball it would
  // graze. Treats each target as a circle of radius 2*BALL_R (the locus of
  // cue-ball centers at the moment of contact = "ghost ball" position).
  private predictHit(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
  ): {
    ghostX: number;
    ghostY: number;
    hitBall: Phaser.Physics.Arcade.Sprite;
    objDirX: number;
    objDirY: number;
    distance: number;
  } | null {
    const R2 = BALL_R * 2;
    let bestT = Infinity;
    let bestBall: Phaser.Physics.Arcade.Sprite | null = null;
    for (const b of this.balls) {
      if (!b.active) continue;
      const relX = b.x - startX;
      const relY = b.y - startY;
      const proj = relX * dirX + relY * dirY;
      if (proj <= 0) continue; // behind the cue ball
      const perpSq = relX * relX + relY * relY - proj * proj;
      if (perpSq > R2 * R2) continue; // ray misses
      const t = proj - Math.sqrt(R2 * R2 - perpSq);
      if (t < bestT) {
        bestT = t;
        bestBall = b;
      }
    }
    if (!bestBall || bestT === Infinity) return null;
    const ghostX = startX + dirX * bestT;
    const ghostY = startY + dirY * bestT;
    // Object ball travels along the line from contact-point cue-center
    // through its own center.
    let ox = bestBall.x - ghostX;
    let oy = bestBall.y - ghostY;
    const olen = Math.hypot(ox, oy) || 1;
    ox /= olen;
    oy /= olen;
    return {
      ghostX,
      ghostY,
      hitBall: bestBall,
      objDirX: ox,
      objDirY: oy,
      distance: bestT,
    };
  }

  // Recursive cone-cascade prediction. At each hop we ray-cast for the next
  // ball impact; on contact the moving ball continues along the line of
  // centers, and the incoming source deflects perpendicular (90° tangent
  // rule). Cones widen + fade with depth to convey growing uncertainty.
  private drawPredictionCone(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    depth: number,
    incomingColor: number,
  ) {
    // Cone half-angle: tight at the first hop (we mostly know where the
    // hit ball goes), then widens as compounding error grows.
    const halfAngleDeg = 2 + (depth - 1) * 3; // 2°→5°→8°→11°
    const halfAngleRad = (halfAngleDeg * Math.PI) / 180;
    const alpha = Math.max(0.18, 1 - depth * 0.22);

    // Terminal — just paint a fading cone in the travel direction.
    if (depth >= MAX_PREDICTION_DEPTH) {
      const termLen = Math.max(35, 80 - depth * 10);
      this.drawCone(startX, startY, dirX, dirY, termLen, halfAngleRad, incomingColor, alpha);
      return;
    }

    const hit = this.predictHit(startX, startY, dirX, dirY);
    if (!hit) {
      // No further contact predicted — terminal cone in current direction.
      const termLen = Math.max(60, 150 - depth * 25);
      this.drawCone(startX, startY, dirX, dirY, termLen, halfAngleRad, incomingColor, alpha);
      return;
    }

    // Cone from origin up to the predicted ghost-ball position.
    this.drawCone(startX, startY, dirX, dirY, hit.distance, halfAngleRad, incomingColor, alpha);

    // Object ball travels along the line of centers (its own color).
    const objColor = (hit.hitBall.getData("color") as number) ?? NEON_YELLOW;
    this.drawPredictionCone(hit.hitBall.x, hit.hitBall.y, hit.objDirX, hit.objDirY, depth + 1, objColor);

    // Source ball deflects along the perpendicular component of its velocity
    // relative to the line of centers (real pool tangent line).
    const parDot = dirX * hit.objDirX + dirY * hit.objDirY;
    const perpX = dirX - parDot * hit.objDirX;
    const perpY = dirY - parDot * hit.objDirY;
    const perpLen = Math.hypot(perpX, perpY);
    if (perpLen > 0.05) {
      this.drawPredictionCone(hit.ghostX, hit.ghostY, perpX / perpLen, perpY / perpLen, depth + 1, incomingColor);
    }
  }

  private drawCone(
    x: number,
    y: number,
    dx: number,
    dy: number,
    length: number,
    halfAngleRad: number,
    color: number,
    alpha: number,
  ) {
    const baseAng = Math.atan2(dy, dx);
    const a1 = baseAng - halfAngleRad;
    const a2 = baseAng + halfAngleRad;
    const x1 = x + Math.cos(a1) * length;
    const y1 = y + Math.sin(a1) * length;
    const x2 = x + Math.cos(a2) * length;
    const y2 = y + Math.sin(a2) * length;

    // Soft fill wedge for the "this region" feel.
    this.aimGfx.fillStyle(color, alpha * 0.12);
    this.aimGfx.fillTriangle(x, y, x1, y1, x2, y2);

    // Cone edges.
    this.aimGfx.lineStyle(1.5, color, alpha * 0.75);
    this.aimGfx.lineBetween(x, y, x1, y1);
    this.aimGfx.lineBetween(x, y, x2, y2);

    // Arc cap at the cone's far end.
    this.aimGfx.lineStyle(1, color, alpha * 0.5);
    const arcSteps = 8;
    for (let i = 0; i < arcSteps; i++) {
      const aA = a1 + ((a2 - a1) * i) / arcSteps;
      const aB = a1 + ((a2 - a1) * (i + 1)) / arcSteps;
      this.aimGfx.lineBetween(
        x + Math.cos(aA) * length,
        y + Math.sin(aA) * length,
        x + Math.cos(aB) * length,
        y + Math.sin(aB) * length,
      );
    }
  }

  private shoot() {
    const t = this.power / MAX_POWER_TICKS;
    const speed = MIN_SHOT_SPEED + t * (MAX_SHOT_SPEED - MIN_SHOT_SPEED);
    this.cueBall.setVelocity(Math.cos(this.aimAngle) * speed, Math.sin(this.aimAngle) * speed);
    this.shots++;
    poolEvents.emit("STATE", { shots: this.shots, remaining: this.remaining });
  }

  private pocketExplosion(x: number, y: number, color: number) {
    // expanding shock-ring
    const ring = this.add.circle(x, y, 4, color, 0);
    ring.setStrokeStyle(3, color, 1);
    ring.setDepth(40);
    this.tweens.add({
      targets: ring,
      radius: 36,
      alpha: 0,
      duration: 380,
      ease: "Quad.out",
      onComplete: () => ring.destroy(),
    });

    // inner flash
    const flash = this.add.circle(x, y, 14, color, 0.85);
    flash.setDepth(41);
    this.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration: 220,
      ease: "Quad.out",
      onComplete: () => flash.destroy(),
    });

    // sparks
    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 30 + Math.random() * 40;
      const size = 2 + Math.random() * 2;
      const sparkColor = i % 3 === 0 ? NEON_CYAN : i % 3 === 1 ? NEON_YELLOW : color;
      const spark = this.add.circle(x, y, size, sparkColor, 1);
      spark.setDepth(42);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 400 + Math.random() * 250,
        ease: "Quad.out",
        onComplete: () => spark.destroy(),
      });
    }
  }

  override update(_t: number, dt: number) {
    if (!this.cueBall) return;

    // rail bounces (manual clamp keeps balls inside the inset playfield)
    const all = [this.cueBall, ...this.balls];
    all.forEach((b) => {
      if (!b.active) return;
      const body = b.body;
      if (!body) return;
      if (b.x < PLAY_X + BALL_R) {
        b.x = PLAY_X + BALL_R;
        body.velocity.x = Math.abs(body.velocity.x);
      } else if (b.x > PLAY_X + PLAY_W - BALL_R) {
        b.x = PLAY_X + PLAY_W - BALL_R;
        body.velocity.x = -Math.abs(body.velocity.x);
      }
      if (b.y < PLAY_Y + BALL_R) {
        b.y = PLAY_Y + BALL_R;
        body.velocity.y = Math.abs(body.velocity.y);
      } else if (b.y > PLAY_Y + PLAY_H - BALL_R) {
        b.y = PLAY_Y + PLAY_H - BALL_R;
        body.velocity.y = -Math.abs(body.velocity.y);
      }
    });

    // pocket detection
    POCKETS.forEach((p) => {
      all.forEach((b) => {
        if (!b.active) return;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < POCKET_R - 2) {
          if (b.getData("isCue")) {
            // scratch — respawn cue ball at the start
            b.setPosition(CUE_START.x, CUE_START.y);
            b.setVelocity(0, 0);
            poolEvents.emit("SCRATCH");
          } else {
            const color = (b.getData("color") as number) ?? NEON_PINK;
            this.pocketExplosion(b.x, b.y, color);
            b.disableBody(true, true);
            this.remaining--;
            poolEvents.emit("STATE", {
              shots: this.shots,
              remaining: this.remaining,
            });
            if (this.remaining === 0 && !this.gameOver) {
              this.gameOver = true;
              poolEvents.emit("WIN", this.shots);
            }
          }
        }
      });
    });

    // aim + power UI
    this.aimGfx.clear();
    this.powerGfx.clear();
    if (!this.gameOver && this.allStopped() && this.cueBall.active) {
      const pointer = this.input.activePointer;
      const dx = pointer.worldX - this.cueBall.x;
      const dy = pointer.worldY - this.cueBall.y;
      if (dx !== 0 || dy !== 0) {
        // Smooth toward the target angle to filter out pixel-level mouse
        // jitter that otherwise causes the cones to flicker every frame.
        const targetAngle = Math.atan2(dy, dx);
        let delta = targetAngle - this.aimAngle;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        this.aimAngle += delta * 0.5; // ~3 frames to settle
      }

      const dirX = Math.cos(this.aimAngle);
      const dirY = Math.sin(this.aimAngle);
      const prediction = this.predictionEnabled ? this.predictHit(this.cueBall.x, this.cueBall.y, dirX, dirY) : null;

      // Aim line ends at the ghost-ball position when a hit is predicted,
      // otherwise extends a fixed distance.
      const fullLen = 220;
      const aimLen = prediction ? Math.max(prediction.distance - 2 * BALL_R, 0) : fullLen;

      // dashed aim line
      this.aimGfx.lineStyle(2, NEON_CYAN, 0.85);
      const segs = 22;
      for (let i = 0; i < segs; i += 2) {
        const r1 = BALL_R + (aimLen * i) / segs;
        const r2 = BALL_R + (aimLen * (i + 1)) / segs;
        const x1 = this.cueBall.x + dirX * r1;
        const y1 = this.cueBall.y + dirY * r1;
        const x2 = this.cueBall.x + dirX * r2;
        const y2 = this.cueBall.y + dirY * r2;
        this.aimGfx.lineBetween(x1, y1, x2, y2);
      }

      if (prediction) {
        // ghost-ball outline (where the cue ball would be at impact)
        this.aimGfx.lineStyle(2, NEON_CYAN, 0.55);
        this.aimGfx.strokeCircle(prediction.ghostX, prediction.ghostY, BALL_R);
        this.aimGfx.lineStyle(1, NEON_CYAN, 0.25);
        this.aimGfx.strokeCircle(prediction.ghostX, prediction.ghostY, BALL_R + 3);

        // Cascade prediction: object ball goes along the line of centers,
        // cue ball deflects perpendicular (90° tangent rule). Each branch
        // recurses up to MAX_PREDICTION_DEPTH hops, with cones that widen
        // and fade as uncertainty grows.
        const objColor = (prediction.hitBall.getData("color") as number) ?? NEON_YELLOW;
        this.drawPredictionCone(
          prediction.hitBall.x,
          prediction.hitBall.y,
          prediction.objDirX,
          prediction.objDirY,
          1,
          objColor,
        );
        const parDot = dirX * prediction.objDirX + dirY * prediction.objDirY;
        const perpX = dirX - parDot * prediction.objDirX;
        const perpY = dirY - parDot * prediction.objDirY;
        const perpLen = Math.hypot(perpX, perpY);
        if (perpLen > 0.05) {
          this.drawPredictionCone(prediction.ghostX, prediction.ghostY, perpX / perpLen, perpY / perpLen, 1, NEON_CYAN);
        }
      } else {
        // tip dot at the end of the open aim line
        this.aimGfx.fillStyle(NEON_PINK, 1);
        this.aimGfx.fillCircle(this.cueBall.x + dirX * (BALL_R + aimLen), this.cueBall.y + dirY * (BALL_R + aimLen), 4);
      }

      if (this.powering) {
        this.power = Math.min(MAX_POWER_TICKS, this.power + dt * 1.4);
        const t = this.power / MAX_POWER_TICKS;
        const stickLen = 30 + t * 90;
        const bx = -Math.cos(this.aimAngle);
        const by = -Math.sin(this.aimAngle);
        const sx = this.cueBall.x + bx * (BALL_R + 6);
        const sy = this.cueBall.y + by * (BALL_R + 6);
        const ex = this.cueBall.x + bx * (BALL_R + 6 + stickLen);
        const ey = this.cueBall.y + by * (BALL_R + 6 + stickLen);
        // glow
        this.powerGfx.lineStyle(8, NEON_PINK, 0.35);
        this.powerGfx.lineBetween(sx, sy, ex, ey);
        // core stick — color shifts cyan -> yellow -> pink as power rises
        const stickColor = t < 0.5 ? NEON_CYAN : t < 0.85 ? NEON_YELLOW : NEON_PINK;
        this.powerGfx.lineStyle(4, stickColor, 1);
        this.powerGfx.lineBetween(sx, sy, ex, ey);
      }
    }

    poolEvents.emit("AIM_TICK", {
      powering: this.powering,
      power: this.power / MAX_POWER_TICKS,
      stopped: this.allStopped(),
    });
  }
}

// ----- REACT WRAPPER -----
export function BryceGameClonesV1() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [shots, setShots] = useState(0);
  const [remaining, setRemaining] = useState(10);
  const [scratched, setScratched] = useState(false);
  const [winShots, setWinShots] = useState<number | null>(null);
  const [power, setPower] = useState(0);
  const [predictionEnabled, setPredictionEnabled] = useState(true);

  useEffect(() => {
    poolEvents.emit("PREDICTION", predictionEnabled);
  }, [predictionEnabled]);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: TABLE_W,
      height: TABLE_H,
      parent: containerRef.current,
      backgroundColor: "#0a0020",
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
      scene: [PoolScene],
    });
    gameRef.current = game;

    const onState = (s: { shots: number; remaining: number }) => {
      setShots(s.shots);
      setRemaining(s.remaining);
    };
    const onScratch = () => {
      setScratched(true);
      window.setTimeout(() => setScratched(false), 1200);
    };
    const onWin = (s: number) => setWinShots(s);
    const onAim = (a: { power: number }) => setPower(a.power);

    poolEvents.on("STATE", onState);
    poolEvents.on("SCRATCH", onScratch);
    poolEvents.on("WIN", onWin);
    poolEvents.on("AIM_TICK", onAim);

    return () => {
      poolEvents.off("STATE", onState);
      poolEvents.off("SCRATCH", onScratch);
      poolEvents.off("WIN", onWin);
      poolEvents.off("AIM_TICK", onAim);
      game.destroy(true);
    };
  }, []);

  const handleReset = () => {
    setWinShots(null);
    setScratched(false);
    setShots(0);
    setRemaining(10);
    setPower(0);
    poolEvents.emit("RESET");
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: TABLE_W + 40,
        mx: "auto",
        p: 3,
        borderRadius: 3,
        background: "linear-gradient(180deg, #1a0033 0%, #0a0020 60%, #2a004f 100%)",
        boxShadow: `0 0 40px ${NEON_PINK_CSS}55, inset 0 0 60px ${NEON_CYAN_CSS}22`,
        border: `1px solid ${NEON_PINK_CSS}`,
        fontFamily: '"Courier New", ui-monospace, monospace',
      }}
    >
      <Stack direction="row" alignItems="baseline" spacing={2} sx={{ mb: 2 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            letterSpacing: 4,
            color: NEON_PINK_CSS,
            textShadow: `0 0 8px ${NEON_PINK_CSS}, 0 0 18px ${NEON_PINK_CSS}aa, 0 0 30px ${NEON_CYAN_CSS}88`,
            fontFamily: "inherit",
          }}
        >
          NEON POOL
        </Typography>
        <Typography
          sx={{
            color: NEON_CYAN_CSS,
            letterSpacing: 3,
            fontWeight: 700,
            textShadow: `0 0 8px ${NEON_CYAN_CSS}cc`,
          }}
        >
          ★ 1985 ★
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          mb: 2,
          color: "#fff",
          fontFamily: "inherit",
          letterSpacing: 2,
        }}
      >
        <StatChip label="SHOTS" value={String(shots).padStart(2, "0")} color={NEON_YELLOW_CSS} />
        <StatChip label="LEFT" value={String(remaining).padStart(2, "0")} color={NEON_CYAN_CSS} />
        <StatChip label="POWER" value={`${Math.round(power * 100)}%`} color={NEON_PINK_CSS} />
        <Box
          onClick={() => setPredictionEnabled((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setPredictionEnabled((v) => !v);
          }}
          sx={{
            px: 2,
            py: 1,
            cursor: "pointer",
            userSelect: "none",
            borderRadius: 1,
            border: `1px solid ${predictionEnabled ? NEON_YELLOW_CSS : "#555"}`,
            boxShadow: predictionEnabled
              ? `0 0 10px ${NEON_YELLOW_CSS}66, inset 0 0 10px ${NEON_YELLOW_CSS}22`
              : "none",
            minWidth: 140,
            fontFamily: "inherit",
            transition: "all 120ms ease",
          }}
        >
          <Box
            sx={{
              fontSize: 11,
              color: predictionEnabled ? NEON_YELLOW_CSS : "#888",
              letterSpacing: 3,
              opacity: 0.85,
            }}
          >
            AIM ASSIST
          </Box>
          <Box
            sx={{
              fontSize: 18,
              fontWeight: 900,
              color: predictionEnabled ? "#fff" : "#888",
              letterSpacing: 2,
              textShadow: predictionEnabled ? `0 0 8px ${NEON_YELLOW_CSS}` : "none",
            }}
          >
            {predictionEnabled ? "● ON" : "○ OFF"}
          </Box>
        </Box>
        {scratched && (
          <Box
            sx={{
              alignSelf: "center",
              color: NEON_PINK_CSS,
              fontWeight: 800,
              letterSpacing: 3,
              textShadow: `0 0 8px ${NEON_PINK_CSS}`,
            }}
          >
            ✶ SCRATCH ✶
          </Box>
        )}
      </Stack>

      <Box
        sx={{
          position: "relative",
          width: TABLE_W,
          height: TABLE_H,
          borderRadius: 2,
          overflow: "hidden",
          border: `2px solid ${NEON_CYAN_CSS}`,
          boxShadow: `0 0 30px ${NEON_PINK_CSS}88`,
          mx: "auto",
        }}
      >
        <Box ref={containerRef} sx={{ width: "100%", height: "100%" }} />
        {winShots !== null && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(10,0,32,0.92)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              zIndex: 10,
            }}
          >
            <Typography
              variant="h2"
              sx={{
                color: NEON_YELLOW_CSS,
                letterSpacing: 6,
                fontWeight: 900,
                textShadow: `0 0 12px ${NEON_YELLOW_CSS}, 0 0 30px ${NEON_PINK_CSS}`,
                fontFamily: "inherit",
              }}
            >
              ★ RACK CLEARED ★
            </Typography>
            <Typography
              sx={{
                color: NEON_CYAN_CSS,
                letterSpacing: 3,
                textShadow: `0 0 8px ${NEON_CYAN_CSS}`,
              }}
            >
              {winShots} SHOTS
            </Typography>
            <Button
              onClick={handleReset}
              sx={{
                mt: 1,
                px: 4,
                py: 1.5,
                fontFamily: "inherit",
                fontWeight: 800,
                letterSpacing: 4,
                color: "#0a0020",
                bgcolor: NEON_PINK_CSS,
                border: `2px solid ${NEON_CYAN_CSS}`,
                boxShadow: `0 0 20px ${NEON_PINK_CSS}`,
                "&:hover": {
                  bgcolor: NEON_YELLOW_CSS,
                  boxShadow: `0 0 30px ${NEON_YELLOW_CSS}`,
                },
              }}
            >
              PLAY AGAIN
            </Button>
          </Box>
        )}
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
        <Button
          onClick={handleReset}
          sx={{
            fontFamily: "inherit",
            fontWeight: 800,
            letterSpacing: 3,
            color: NEON_CYAN_CSS,
            border: `2px solid ${NEON_CYAN_CSS}`,
            px: 3,
            "&:hover": {
              color: "#0a0020",
              bgcolor: NEON_CYAN_CSS,
              boxShadow: `0 0 20px ${NEON_CYAN_CSS}`,
            },
          }}
        >
          RACK 'EM UP
        </Button>
        <Typography
          sx={{
            color: "#fff",
            opacity: 0.7,
            letterSpacing: 1,
            fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          AIM with the mouse — HOLD to charge — RELEASE to break
        </Typography>
      </Stack>
    </Box>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        border: `1px solid ${color}`,
        borderRadius: 1,
        boxShadow: `0 0 10px ${color}66, inset 0 0 10px ${color}22`,
        minWidth: 110,
        fontFamily: "inherit",
      }}
    >
      <Box sx={{ fontSize: 11, color, letterSpacing: 3, opacity: 0.85 }}>{label}</Box>
      <Box
        sx={{
          fontSize: 22,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: 2,
          textShadow: `0 0 8px ${color}`,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}
