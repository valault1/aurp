import Phaser from "phaser";
import type {
  CircleObstacle,
  GameState,
  Level,
  PlacementTool,
  SceneMode,
  Vec,
  WaterHazard,
} from "./types";
import { BALL_RADIUS, MARGIN } from "./defaultLevel";
import {
  centroid,
  dist,
  pointInPolygon,
  pointToSegment,
  uid,
} from "./geometry";

const Body = Phaser.Physics.Matter.Matter.Body;

// ---- Visual palette -------------------------------------------------------
const COLORS = {
  grass: 0x4aa564,
  grassEdge: 0x2f6b43,
  wall: 0xf2e9d0,
  wallShadow: 0x2a5c3a,
  water: 0x2f86d6,
  waterEdge: 0x1c5fa8,
  ball: 0xffffff,
  ballShadow: 0x1d3d29,
  coin: 0xffd24a,
  coinEdge: 0xe0a91b,
  extraHit: 0x8b5cf6,
  bumper: 0xff5da2,
  bumperRing: 0xffd6e8,
  start: 0xffffff,
  handle: 0xffffff,
  handleEdge: 0x1d3d29,
  aim: 0xffffff,
};

// ---- Gameplay tunables ----------------------------------------------------
const MAX_DRAG = 360;
const POWER = 0.105; // launch velocity per drag pixel (max speed ~38)
const REST_SPEED = 0.32; // below this the ball is considered stopped
const BUMPER_BOOST = 20;
const WALL_THICKNESS = 42; // thick enough to stop the ball tunneling at max speed
const MOVE_TIMEOUT = 9000; // ms safety: force the ball to settle
const VERTEX_HIT = 12;

const mapFrictionAir = (f: number) => 0.012 + f * 0.05;
const mapRestitution = (b: number) => 0.05 + b * 0.95;

export interface SceneConfig {
  level: Level;
  mode: SceneMode;
  onReady?: (scene: GolfScene) => void;
  onState?: (state: GameState) => void;
  onToolChange?: (tool: PlacementTool) => void;
}

/**
 * A single Phaser scene that both plays and edits a coin-golf level.
 * Play mode runs Matter physics; edit mode manipulates the level data directly
 * and only rebuilds physics bodies when you enter play/play-test.
 */
export class GolfScene extends Phaser.Scene {
  private level!: Level;
  private mode: SceneMode = "play";
  private tool: PlacementTool = "select";

  private onReadyCb?: (scene: GolfScene) => void;
  private onStateCb?: (state: GameState) => void;
  private onToolChangeCb?: (tool: PlacementTool) => void;

  private gStatic!: Phaser.GameObjects.Graphics;
  private gDynamic!: Phaser.GameObjects.Graphics;

  // --- play runtime state ---
  private ball?: MatterJS.BodyType;
  private walls: MatterJS.BodyType[] = [];
  private bumpers: MatterJS.BodyType[] = [];
  private coins: CircleObstacle[] = []; // live (un-collected) coins/tokens
  private status: GameState["status"] = "ready";
  private score = 0;
  private strokesLeft = 0;
  private lastRest: Vec = { x: 0, y: 0 };
  private moveTimer = 0;
  private splashUntil = 0;
  private splashAt: Vec = { x: 0, y: 0 };

  // --- aiming ---
  private aiming = false;
  private aimVec: Vec = { x: 0, y: 0 }; // pointer relative to ball, clamped

  // --- editing ---
  private dragTarget:
    | { kind: "vertex"; poly: Vec[]; index: number }
    | { kind: "obstacle"; obstacle: CircleObstacle }
    | { kind: "water"; hazard: WaterHazard }
    | { kind: "ball" }
    | null = null;
  private dragLast: Vec = { x: 0, y: 0 };
  private lastTap = { t: 0, x: 0, y: 0 };

  constructor() {
    super({ key: "golf" });
  }

  init(data: SceneConfig) {
    this.level = data.level;
    this.mode = data.mode;
    this.onReadyCb = data.onReady;
    this.onStateCb = data.onState;
    this.onToolChangeCb = data.onToolChange;
  }

  create() {
    this.matter.world.setGravity(0, 0);
    // More solver iterations => cleaner, more reliable wall bounces at speed.
    this.matter.world.engine.positionIterations = 16;
    this.matter.world.engine.velocityIterations = 16;
    // Inset the course by MARGIN so there's dead space to pull back into.
    this.cameras.main.setScroll(-MARGIN, -MARGIN);
    this.gStatic = this.add.graphics();
    this.gDynamic = this.add.graphics();

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);

    this.matter.world.on("collisionstart", this.onCollision, this);

    if (this.mode === "play") this.startPlay();
    else this.enterEdit();

    this.onReadyCb?.(this);
    this.emitState();
  }

  // =========================================================================
  //  Public API (called from React)
  // =========================================================================

  setMode(mode: SceneMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === "play") {
      this.startPlay();
    } else {
      this.teardownPlay();
      this.enterEdit();
    }
    this.redrawStatic();
    this.emitState();
  }

  setTool(tool: PlacementTool) {
    this.tool = tool;
  }

  replay() {
    if (this.mode !== "play") return;
    this.teardownPlay();
    this.startPlay();
    this.redrawStatic();
    this.emitState();
  }

  setFriction(v: number) {
    this.level.friction = v;
    if (this.ball) this.ball.frictionAir = mapFrictionAir(v);
  }

  setBounciness(v: number) {
    this.level.bounciness = v;
    for (const w of this.walls) w.restitution = mapRestitution(v);
  }

  setStrokes(n: number) {
    this.level.strokes = Math.max(1, Math.round(n));
    this.emitState();
  }

  setTarget(n: number) {
    this.level.targetScore = Math.max(0, Math.round(n));
    this.emitState();
  }

  setName(name: string) {
    this.level.name = name;
  }

  getLevel(): Level {
    return this.level;
  }

  loadLevel(level: Level) {
    this.level = level;
    if (this.mode === "play") this.replay();
    else {
      this.enterEdit();
      this.redrawStatic();
      this.emitState();
    }
  }

  // =========================================================================
  //  Play mode
  // =========================================================================

  private startPlay() {
    this.buildBodies();
    this.coins = this.level.obstacles
      .filter((o) => o.type === "coin" || o.type === "extraHit")
      .map((o) => ({ ...o }));
    this.score = 0;
    this.strokesLeft = this.level.strokes;
    this.status = "ready";
    this.lastRest = { ...this.level.start };
    this.aiming = false;
    this.redrawStatic();
  }

  private teardownPlay() {
    if (this.ball) {
      this.matter.world.remove(this.ball);
      this.ball = undefined;
    }
    for (const w of this.walls) this.matter.world.remove(w);
    for (const b of this.bumpers) this.matter.world.remove(b);
    this.walls = [];
    this.bumpers = [];
    this.aiming = false;
  }

  private buildBodies() {
    this.teardownPlay();
    const { outline, bounciness } = this.level;

    // Walls: one static rectangle per outline edge.
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      const len = dist(a, b) + WALL_THICKNESS;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const wall = this.matter.add.rectangle(cx, cy, len, WALL_THICKNESS, {
        isStatic: true,
        angle,
        restitution: mapRestitution(bounciness),
        friction: 0,
        label: "wall",
      });
      this.walls.push(wall);
    }

    // Rounded corner colliders: a static circle at each vertex removes the
    // ambiguous normals where two wall segments meet, so the ball always
    // bounces cleanly away from a corner instead of catching on it.
    for (const v of outline) {
      const corner = this.matter.add.circle(v.x, v.y, WALL_THICKNESS / 2, {
        isStatic: true,
        restitution: mapRestitution(bounciness),
        friction: 0,
        label: "wall",
      });
      this.walls.push(corner);
    }

    // Bumpers: static circles that boost the ball on contact.
    for (const o of this.level.obstacles) {
      if (o.type !== "bumper") continue;
      const bumper = this.matter.add.circle(o.x, o.y, o.radius, {
        isStatic: true,
        restitution: 1,
        friction: 0,
        label: "bumper",
      });
      this.bumpers.push(bumper);
    }

    // Ball.
    this.ball = this.matter.add.circle(
      this.level.start.x,
      this.level.start.y,
      BALL_RADIUS,
      {
        // Matter combines restitution multiplicatively, so the ball must be
        // fully elastic; the wall's restitution then sets the actual bounciness.
        restitution: 1,
        frictionAir: mapFrictionAir(this.level.friction),
        friction: 0,
        frictionStatic: 0,
        label: "ball",
      },
    );
  }

  private onCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    if (!this.ball) return;
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (labels.includes("ball") && labels.includes("bumper")) {
        const bumper = pair.bodyA.label === "bumper" ? pair.bodyA : pair.bodyB;
        const nx = this.ball.position.x - bumper.position.x;
        const ny = this.ball.position.y - bumper.position.y;
        const mag = Math.hypot(nx, ny) || 1;
        Body.setVelocity(this.ball, {
          x: (nx / mag) * BUMPER_BOOST,
          y: (ny / mag) * BUMPER_BOOST,
        });
      }
    }
  }

  update(_time: number, delta: number) {
    this.gDynamic.clear();

    if (this.mode === "edit") {
      this.drawBall(this.level.start.x, this.level.start.y);
      this.drawSplash();
      return;
    }

    if (!this.ball) return;

    if (this.status === "moving") {
      this.checkPickups();
      this.checkWater();
      this.moveTimer += delta;
      const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.y);
      if (speed < REST_SPEED || this.moveTimer > MOVE_TIMEOUT) {
        this.settle();
      }
    }

    this.drawBall(this.ball.position.x, this.ball.position.y);
    this.drawSplash();
    if (this.aiming) this.drawAim();
  }

  private checkPickups() {
    if (!this.ball) return;
    const bp = this.ball.position;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (dist(bp, c) < BALL_RADIUS + c.radius) {
        this.coins.splice(i, 1);
        if (c.type === "coin") this.score++;
        else this.strokesLeft++; // extra-hit token
        this.redrawStatic();
        this.emitState();
      }
    }
  }

  private checkWater() {
    if (!this.ball) return;
    const bp = { x: this.ball.position.x, y: this.ball.position.y };
    for (const hazard of this.level.water) {
      if (pointInPolygon(bp, hazard.points)) {
        // Water penalty: reset to last rest spot; the stroke is already spent.
        this.splashAt = { ...bp };
        this.splashUntil = this.time.now + 500;
        Body.setPosition(this.ball, { ...this.lastRest });
        Body.setVelocity(this.ball, { x: 0, y: 0 });
        this.settle();
        return;
      }
    }
  }

  private settle() {
    if (!this.ball) return;
    Body.setVelocity(this.ball, { x: 0, y: 0 });
    this.lastRest = { x: this.ball.position.x, y: this.ball.position.y };

    const coinsLeft = this.coins.some((c) => c.type === "coin");
    if (!coinsLeft && this.level.obstacles.some((o) => o.type === "coin")) {
      this.status = this.score >= this.level.targetScore ? "won" : "lost";
    } else if (this.strokesLeft <= 0) {
      this.status = this.score >= this.level.targetScore ? "won" : "lost";
    } else {
      this.status = "ready";
    }
    this.emitState();
  }

  // =========================================================================
  //  Input
  // =========================================================================

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    const p = { x: pointer.worldX, y: pointer.worldY };
    if (this.mode === "play") {
      if (this.status !== "ready" || this.strokesLeft <= 0 || !this.ball) return;
      this.aiming = true;
      this.status = "aiming";
      this.updateAim(p);
      this.emitState();
      return;
    }
    // ---- edit mode ----
    if (this.tool !== "select") {
      this.placeWithTool(p);
      return;
    }
    if (this.isDoubleTap(p)) {
      this.handleDoubleEdit(p);
      return;
    }
    this.beginDrag(p);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    const p = { x: pointer.worldX, y: pointer.worldY };
    if (this.mode === "play") {
      if (this.aiming) this.updateAim(p);
      return;
    }
    if (this.dragTarget) this.applyDrag(p);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.mode === "play") {
      if (this.aiming) this.releaseShot();
      return;
    }
    this.dragTarget = null;
  }

  // ---- aiming ----
  private updateAim(p: Vec) {
    if (!this.ball) return;
    const dx = p.x - this.ball.position.x;
    const dy = p.y - this.ball.position.y;
    const len = Math.min(Math.hypot(dx, dy), MAX_DRAG);
    const ang = Math.atan2(dy, dx);
    this.aimVec = { x: Math.cos(ang) * len, y: Math.sin(ang) * len };
  }

  private releaseShot() {
    this.aiming = false;
    if (!this.ball) return;
    const len = Math.hypot(this.aimVec.x, this.aimVec.y);
    if (len < 6) {
      this.status = "ready";
      this.emitState();
      return;
    }
    // Slingshot: launch opposite the drag direction.
    Body.setVelocity(this.ball, {
      x: -this.aimVec.x * POWER,
      y: -this.aimVec.y * POWER,
    });
    this.strokesLeft--;
    this.lastRest = { x: this.ball.position.x, y: this.ball.position.y };
    this.status = "moving";
    this.moveTimer = 0;
    this.emitState();
  }

  // ---- editing helpers ----
  private isDoubleTap(p: Vec): boolean {
    const now = this.time.now;
    const near = dist(p, { x: this.lastTap.x, y: this.lastTap.y }) < 20;
    const quick = now - this.lastTap.t < 320;
    this.lastTap = { t: now, x: p.x, y: p.y };
    return near && quick;
  }

  private beginDrag(p: Vec) {
    const v = this.findVertexNear(p);
    if (v) {
      this.dragTarget = { kind: "vertex", poly: v.poly, index: v.index };
    } else if (dist(p, this.level.start) < BALL_RADIUS + 6) {
      this.dragTarget = { kind: "ball" };
    } else {
      const o = this.findObstacleNear(p);
      if (o) {
        this.dragTarget = { kind: "obstacle", obstacle: o };
      } else {
        const h = this.findWaterAt(p);
        if (h) this.dragTarget = { kind: "water", hazard: h };
      }
    }
    this.dragLast = p;
  }

  private applyDrag(p: Vec) {
    const dx = p.x - this.dragLast.x;
    const dy = p.y - this.dragLast.y;
    const t = this.dragTarget!;
    if (t.kind === "vertex") {
      t.poly[t.index].x += dx;
      t.poly[t.index].y += dy;
    } else if (t.kind === "obstacle") {
      t.obstacle.x += dx;
      t.obstacle.y += dy;
    } else if (t.kind === "water") {
      for (const pt of t.hazard.points) {
        pt.x += dx;
        pt.y += dy;
      }
    } else if (t.kind === "ball") {
      this.level.start.x += dx;
      this.level.start.y += dy;
    }
    this.dragLast = p;
    this.redrawStatic();
  }

  private handleDoubleEdit(p: Vec) {
    // Priority: delete vertex > delete obstacle > insert vertex on an edge.
    const v = this.findVertexNear(p);
    if (v && v.poly.length > 3) {
      v.poly.splice(v.index, 1);
      this.redrawStatic();
      return;
    }
    const o = this.findObstacleNear(p);
    if (o) {
      this.level.obstacles = this.level.obstacles.filter((x) => x.id !== o.id);
      this.redrawStatic();
      this.emitState();
      return;
    }
    this.insertVertexNear(p);
  }

  private placeWithTool(p: Vec) {
    if (this.tool === "coin" || this.tool === "extraHit" || this.tool === "bumper") {
      this.level.obstacles.push({
        id: uid(this.tool),
        type: this.tool,
        x: p.x,
        y: p.y,
        radius: this.tool === "bumper" ? 28 : 14,
      });
      this.redrawStatic();
      this.emitState();
      return;
    }
    if (this.tool === "water") {
      this.level.water.push({
        id: uid("water"),
        points: [
          { x: p.x - 55, y: p.y - 40 },
          { x: p.x + 55, y: p.y - 40 },
          { x: p.x + 55, y: p.y + 40 },
          { x: p.x - 55, y: p.y + 40 },
        ],
      });
      this.redrawStatic();
      this.setTool("select");
      this.onToolChangeCb?.("select");
      return;
    }
    if (this.tool === "moveBall") {
      this.level.start = { ...p };
      this.redrawStatic();
      this.setTool("select");
      this.onToolChangeCb?.("select");
    }
  }

  private findVertexNear(p: Vec): { poly: Vec[]; index: number } | null {
    const polys: Vec[][] = [this.level.outline, ...this.level.water.map((w) => w.points)];
    for (const poly of polys) {
      for (let i = 0; i < poly.length; i++) {
        if (dist(p, poly[i]) < VERTEX_HIT) return { poly, index: i };
      }
    }
    return null;
  }

  private findObstacleNear(p: Vec): CircleObstacle | null {
    for (let i = this.level.obstacles.length - 1; i >= 0; i--) {
      const o = this.level.obstacles[i];
      if (dist(p, o) < o.radius + 6) return o;
    }
    return null;
  }

  private findWaterAt(p: Vec): WaterHazard | null {
    for (let i = this.level.water.length - 1; i >= 0; i--) {
      if (pointInPolygon(p, this.level.water[i].points)) return this.level.water[i];
    }
    return null;
  }

  private insertVertexNear(p: Vec) {
    const polys: Vec[][] = [this.level.outline, ...this.level.water.map((w) => w.points)];
    let best: { poly: Vec[]; index: number; d: number; at: Vec } | null = null;
    for (const poly of polys) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const { d, closest } = pointToSegment(p, a, b);
        if (d < 16 && (!best || d < best.d)) {
          best = { poly, index: i + 1, d, at: closest };
        }
      }
    }
    if (best) {
      best.poly.splice(best.index, 0, best.at);
      this.redrawStatic();
    }
  }

  private enterEdit() {
    this.tool = "select";
    this.dragTarget = null;
    this.redrawStatic();
  }

  // =========================================================================
  //  Rendering
  // =========================================================================

  private redrawStatic() {
    const g = this.gStatic;
    g.clear();

    // Ground fill + wall stroke from the outline polygon.
    const pts = this.level.outline;
    g.fillStyle(COLORS.grass, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.lineStyle(WALL_THICKNESS, COLORS.wall, 1);
    g.strokePath();
    g.lineStyle(3, COLORS.grassEdge, 1);
    g.strokePath();

    // Water hazards.
    for (const hz of this.level.water) {
      const w = hz.points;
      g.fillStyle(COLORS.water, 0.85);
      g.beginPath();
      g.moveTo(w[0].x, w[0].y);
      for (let i = 1; i < w.length; i++) g.lineTo(w[i].x, w[i].y);
      g.closePath();
      g.fillPath();
      g.lineStyle(3, COLORS.waterEdge, 1);
      g.strokePath();
    }

    // Obstacles.
    const activeIds = this.mode === "play" ? new Set(this.coins.map((c) => c.id)) : null;
    for (const o of this.level.obstacles) {
      if (o.type !== "bumper" && activeIds && !activeIds.has(o.id)) continue; // collected
      this.drawObstacle(g, o);
    }

    // Edit-only decorations: start marker + vertex handles.
    if (this.mode === "edit") {
      g.lineStyle(2, COLORS.start, 0.9);
      g.strokeCircle(this.level.start.x, this.level.start.y, BALL_RADIUS + 5);
      this.drawHandles(g);
    }
  }

  private drawObstacle(g: Phaser.GameObjects.Graphics, o: CircleObstacle) {
    if (o.type === "coin") {
      g.fillStyle(COLORS.coinEdge, 1);
      g.fillCircle(o.x, o.y, o.radius);
      g.fillStyle(COLORS.coin, 1);
      g.fillCircle(o.x, o.y, o.radius - 3);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(o.x - o.radius * 0.3, o.y - o.radius * 0.3, o.radius * 0.25);
    } else if (o.type === "extraHit") {
      g.fillStyle(COLORS.extraHit, 1);
      g.fillCircle(o.x, o.y, o.radius);
      // white plus sign
      const t = o.radius * 0.35;
      const l = o.radius * 0.9;
      g.fillStyle(0xffffff, 1);
      g.fillRect(o.x - t / 2, o.y - l / 2, t, l);
      g.fillRect(o.x - l / 2, o.y - t / 2, l, t);
    } else {
      // bumper: pink disc with a bright ring + highlight
      g.fillStyle(COLORS.bumper, 1);
      g.fillCircle(o.x, o.y, o.radius);
      g.lineStyle(4, COLORS.bumperRing, 1);
      g.strokeCircle(o.x, o.y, o.radius - 3);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(o.x - o.radius * 0.3, o.y - o.radius * 0.3, o.radius * 0.28);
    }
  }

  private drawHandles(g: Phaser.GameObjects.Graphics) {
    const polys: Vec[][] = [this.level.outline, ...this.level.water.map((w) => w.points)];
    for (const poly of polys) {
      for (const v of poly) {
        g.fillStyle(COLORS.handle, 1);
        g.fillCircle(v.x, v.y, 6);
        g.lineStyle(2, COLORS.handleEdge, 1);
        g.strokeCircle(v.x, v.y, 6);
      }
    }
  }

  private drawBall(x: number, y: number) {
    const g = this.gDynamic;
    g.fillStyle(COLORS.ballShadow, 0.3);
    g.fillCircle(x + 2, y + 3, BALL_RADIUS);
    g.fillStyle(COLORS.ball, 1);
    g.fillCircle(x, y, BALL_RADIUS);
    g.fillStyle(0x000000, 0.06);
    g.fillCircle(x + BALL_RADIUS * 0.25, y + BALL_RADIUS * 0.25, BALL_RADIUS * 0.7);
  }

  private drawAim() {
    if (!this.ball) return;
    const g = this.gDynamic;
    const bx = this.ball.position.x;
    const by = this.ball.position.y;
    // shoot direction = opposite the drag
    const ex = bx - this.aimVec.x;
    const ey = by - this.aimVec.y;
    const power = Math.hypot(this.aimVec.x, this.aimVec.y) / MAX_DRAG;
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(120, 220, 120),
      new Phaser.Display.Color(240, 90, 90),
      100,
      Math.round(power * 100),
    );
    const tint = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

    // dotted trajectory
    g.fillStyle(tint, 0.9);
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      g.fillCircle(bx + (ex - bx) * t, by + (ey - by) * t, 4);
    }
    // pull-back guide line
    g.lineStyle(3, COLORS.aim, 0.5);
    g.lineBetween(bx, by, bx + this.aimVec.x, by + this.aimVec.y);
  }

  private drawSplash() {
    if (this.time.now > this.splashUntil) return;
    const g = this.gDynamic;
    const t = 1 - (this.splashUntil - this.time.now) / 500;
    g.lineStyle(3, COLORS.water, 1 - t);
    g.strokeCircle(this.splashAt.x, this.splashAt.y, 6 + t * 26);
  }

  private emitState() {
    const coinsTotal = this.level.obstacles.filter((o) => o.type === "coin").length;
    this.onStateCb?.({
      status: this.status,
      score: this.mode === "play" ? this.score : 0,
      coinsTotal,
      strokesLeft: this.mode === "play" ? this.strokesLeft : this.level.strokes,
      targetScore: this.level.targetScore,
    });
  }
}
