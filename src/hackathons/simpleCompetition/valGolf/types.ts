// Level data model for Val's coin-golf game.
// A level is pure data: the editor produces it, the game consumes it.

export type Vec = { x: number; y: number };

export type ObstacleType = "coin" | "extraHit" | "bumper";

/** Coins, extra-hit tokens and bumpers are all positioned circles. */
export interface CircleObstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  radius: number;
}

/** Water hazards are free-form polygons you can reshape. */
export interface WaterHazard {
  id: string;
  points: Vec[]; // >= 3 points, in level coordinates
}

export interface Level {
  id: string;
  name: string;
  /** Design-space dimensions; the canvas scales to fit. */
  width: number;
  height: number;
  /** Closed polygon defining the play area. Its edges are the bouncy walls. */
  outline: Vec[];
  /** Where the ball starts each attempt. */
  start: Vec;
  /** Number of hits (strokes) the player gets. */
  strokes: number;
  /** Coins the player should aim to collect. */
  targetScore: number;
  /** 0 = slick ice, 1 = rough grass. Maps to how quickly the ball slows. */
  friction: number;
  /** 0 = dead walls, 1 = super bouncy. Maps to wall restitution. */
  bounciness: number;
  obstacles: CircleObstacle[];
  water: WaterHazard[];
}

export type GameStatus = "ready" | "aiming" | "moving" | "won" | "lost";

/** Snapshot the scene emits to React for the HUD. */
export interface GameState {
  status: GameStatus;
  score: number;
  coinsTotal: number;
  strokesLeft: number;
  targetScore: number;
}

export type SceneMode = "play" | "edit";

/** What a click on the canvas will place, in edit mode. */
export type PlacementTool =
  | "select"
  | "coin"
  | "extraHit"
  | "bumper"
  | "water"
  | "moveBall";
