import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import CloseIcon from "@mui/icons-material/Close";
import Phaser from "phaser";

// --- TYPES & COMMUNICATION ---
type Command = "UP" | "DOWN" | "LEFT" | "RIGHT" | "WAIT";
const froggerEvents = new Phaser.Events.EventEmitter();

interface LaneConfig {
  row: number;
  speed: number;
  direction: 1 | -1;
  color: number;
}
interface LevelData {
  id: number;
  name: string;
  gridSize: number;
  bpm: number;
  goalRow: number;
  startPos: { x: number; y: number };
  lanes: LaneConfig[];
}

const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "The First Leap",
    gridSize: 40,
    bpm: 120,
    goalRow: 3,
    startPos: { x: 400, y: 520 },
    lanes: [
      { row: 9, speed: 1, direction: -1, color: 0xff4444 },
      { row: 7, speed: 1, direction: 1, color: 0xff4444 },
    ],
  },
  {
    id: 2,
    name: "Rush Hour",
    gridSize: 32,
    bpm: 140,
    goalRow: 2,
    startPos: { x: 400, y: 560 },
    lanes: [
      { row: 13, speed: 1, direction: -1, color: 0xff6600 },
      { row: 11, speed: 3, direction: 1, color: 0xff0000 },
      { row: 9, speed: 1, direction: -1, color: 0xff6600 },
      { row: 7, speed: 2, direction: 1, color: 0xff0000 },
    ],
  },
];

// --- PHASER SCENE V2 ---
class RhythmFroggerSceneV2 extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private obstacles: Phaser.GameObjects.Group | any;
  private beatTimer!: Phaser.Time.TimerEvent;
  private level!: LevelData;
  private sequence: Command[] = [];
  private currentStep = 0;
  private gameState: "EDIT" | "PLAYING" | "RESULT" = "EDIT";

  constructor() {
    super("RhythmFroggerScene");
  }

  init(data: { level: LevelData }) {
    this.level = data.level;
    this.gameState = "EDIT";
  }

  create() {
    const { gridSize, lanes, startPos, goalRow } = this.level;
    this.add.grid(400, 300, 800, 600, gridSize, gridSize, 0x000000, 0, 0x333333, 0.3);

    // Goal zone — highlighted strip at the top showing where to reach
    const goalY = goalRow * gridSize;
    const goalZone = this.add.rectangle(400, goalY - gridSize / 2, 800, gridSize, 0x00ffaa, 0.18);
    goalZone.setDepth(1);
    this.tweens.add({
      targets: goalZone,
      alpha: { from: 0.18, to: 0.45 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    // Goal line (clear threshold)
    const goalLine = this.add.rectangle(400, goalY, 800, 3, 0x00ffaa, 1);
    goalLine.setDepth(2);
    this.add
      .text(400, goalY - gridSize / 2, "★ GOAL ★", {
        fontSize: "20px",
        color: "#00ffaa",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.player = this.add.rectangle(startPos.x, startPos.y, gridSize - 4, gridSize - 4, 0x00ff00);
    this.player.setDepth(10);
    this.obstacles = this.add.group();

    lanes.forEach((lane) => {
      const y = lane.row * gridSize;
      for (let i = 0; i < 3; i++) {
        const x = i * 300;
        const obs = this.add.rectangle(x, y, gridSize - 4, gridSize - 4, lane.color);
        obs.setData("config", lane);
        this.obstacles.add(obs);
      }
    });

    this.beatTimer = this.time.addEvent({
      delay: 60000 / this.level.bpm,
      loop: true,
      callback: this.onBeat,
      callbackScope: this,
      paused: true,
    });

    const onPlay = (seq: Command[]) => {
      // Always snap player back to the start position when a new run begins.
      this.player.setPosition(this.level.startPos.x, this.level.startPos.y);
      this.tweens.killTweensOf(this.player);
      this.sequence = seq;
      this.currentStep = 0;
      this.gameState = "PLAYING";
      this.beatTimer.paused = false;
    };
    const onStop = () => this.resetGame();

    froggerEvents.on("PLAY", onPlay);
    froggerEvents.on("STOP", onStop);

    // Clean up listeners when scene shuts down so they don't accumulate
    // across scene.restart() calls (which was causing stale player refs).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      froggerEvents.off("PLAY", onPlay);
      froggerEvents.off("STOP", onStop);
    });
  }

  onBeat() {
    if (this.gameState !== "PLAYING") return;
    this.spawnPulse();
    this.updateObstacles();
    this.runNextCommand();
  }

  spawnPulse() {
    const pulse = this.add.circle(400, 300, 10, 0xffffff, 0);
    pulse.setStrokeStyle(2, 0xffffff, 0.5);
    this.tweens.add({
      targets: pulse,
      radius: 500,
      alpha: 0,
      duration: 60000 / this.level.bpm,
      ease: "Quad.out",
      onComplete: () => pulse.destroy(),
    });
  }

  runNextCommand() {
    if (this.sequence.length === 0) return;
    const cmd = this.sequence[this.currentStep];
    let targetX = this.player.x;
    let targetY = this.player.y;

    if (cmd === "UP") targetY -= this.level.gridSize;
    if (cmd === "DOWN") targetY += this.level.gridSize;
    if (cmd === "LEFT") targetX -= this.level.gridSize;
    if (cmd === "RIGHT") targetX += this.level.gridSize;

    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 60000 / this.level.bpm - 50,
      ease: "Power1",
    });
    this.currentStep = (this.currentStep + 1) % this.sequence.length;
  }

  updateObstacles() {
    this.obstacles.getChildren().forEach((obs: any) => {
      const config = obs.getData("config");
      let newX = obs.x + config.speed * this.level.gridSize * config.direction;
      if (newX > 800 + this.level.gridSize) newX = -this.level.gridSize;
      if (newX < -this.level.gridSize) newX = 800 + this.level.gridSize;
      this.tweens.add({
        targets: obs,
        x: newX,
        duration: 60000 / this.level.bpm - 50,
        ease: "Linear",
      });
    });
  }

  override update() {
    if (this.gameState !== "PLAYING") return;
    const playerBounds = this.player.getBounds();
    this.obstacles.getChildren().forEach((obs: any) => {
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, obs.getBounds())) {
        this.endGame("SPLAT!");
      }
    });
    // Out-of-bounds check: player has left the 800x600 play area
    const half = this.level.gridSize / 2;
    if (
      this.player.x < half ||
      this.player.x > 800 - half ||
      this.player.y < half ||
      this.player.y > 600 - half
    ) {
      this.endGame("OUT OF BOUNDS!");
      return;
    }
    if (this.player.y <= this.level.goalRow * this.level.gridSize) {
      this.endGame("VICTORY!");
    }
  }

  endGame(msg: string) {
    if (this.gameState === "RESULT") return;
    this.gameState = "RESULT";
    this.beatTimer.paused = true;
    // Snap player back to start so a fresh run begins from the right place,
    // even before the user clicks Try Again.
    this.tweens.killTweensOf(this.player);
    this.player.setPosition(this.level.startPos.x, this.level.startPos.y);
    froggerEvents.emit("GAME_OVER", msg);
  }

  resetGame() {
    this.scene.restart({ level: this.level });
  }
}

// --- REACT UI V2 WITH DRAG & DROP ---
export function BryceFroggerV2() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);
  const [sequence, setSequence] = useState<Command[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!gameContainerRef.current) return;
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameContainerRef.current,
      scene: [RhythmFroggerSceneV2],
    };
    const game = new Phaser.Game(config);
    gameRef.current = game;
    game.scene.start("RhythmFroggerScene", { level: currentLevel });

    froggerEvents.on("GAME_OVER", (msg: string | null) => {
      setStatus(msg);
      setIsPlaying(false);
    });

    return () => {
      froggerEvents.off("GAME_OVER");
      game.destroy(true);
    };
  }, []);

  const handleLevelChange = (levelId: number) => {
    const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    setCurrentLevel(level);
    setSequence([]);
    setStatus(null);
    setIsPlaying(false);
    gameRef.current?.scene.start("RhythmFroggerScene", { level });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || isPlaying) return;
    const items = Array.from(sequence);
    const [reorderedItem] = items.splice(result.source.index, 1);
    if (reorderedItem === undefined) return;
    items.splice(result.destination.index, 0, reorderedItem);
    setSequence(items);
  };

  const removeCommand = (index: number) => {
    if (isPlaying) return;
    setSequence((prev) => prev.filter((_, i) => i !== index));
  };

  if (!currentLevel) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Stack direction="row" spacing={4} alignItems="center" sx={{ width: 800, mb: 1 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {currentLevel.name}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Select Level</InputLabel>
          <Select
            value={currentLevel.id}
            label="Select Level"
            onChange={(e) => handleLevelChange(Number(e.target.value))}
          >
            {LEVELS.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box
        sx={{
          position: "relative",
          width: 800,
          height: 600,
          borderRadius: 2,
          overflow: "hidden",
          border: "2px solid #333",
        }}
      >
        <Box ref={gameContainerRef} sx={{ width: "100%", height: "100%" }} />
        {status && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0,0,0,0.85)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Typography variant="h1" color={status === "VICTORY!" ? "cyan" : "magenta"}>
              {status}
            </Typography>
            <Typography variant="body1" color="grey.400" sx={{ mt: 1 }}>
              {status === "VICTORY!"
                ? "You crossed the threshold!"
                : "Frog has been reset to the start."}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 4 }}
              onClick={() => {
                setStatus(null);
                froggerEvents.emit("STOP");
              }}
            >
              Try Again
            </Button>
          </Box>
        )}
      </Box>

      <Paper sx={{ p: 3, width: 800, bgcolor: "#1a1a1a", color: "white" }}>
        {/* Drag and Drop Sequence Area */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sequence" direction="horizontal">
            {(provided) => (
              <Box
                {...provided.droppableProps}
                ref={provided.innerRef}
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 2,
                  minHeight: 50,
                  p: 1,
                  bgcolor: "#333",
                  borderRadius: 1,
                  overflowX: "auto",
                }}
              >
                {sequence.map((cmd, i) => (
                  <Draggable key={`${cmd}-${i}`} draggableId={`${cmd}-${i}`} index={i} isDragDisabled={isPlaying}>
                    {(provided) => (
                      <Chip
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        label={cmd}
                        onDelete={() => removeCommand(i)}
                        deleteIcon={<CloseIcon sx={{ color: "white !important" }} />}
                        sx={{
                          color: "white",
                          borderColor: "primary.main",
                          bgcolor: isPlaying ? "action.disabledBackground" : "transparent",
                        }}
                        variant="outlined"
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>

        <Stack direction="row" spacing={1} justifyContent="center">
          {["UP", "DOWN", "LEFT", "RIGHT", "WAIT"].map((cmd) => (
            <Button
              key={cmd}
              variant="contained"
              disabled={isPlaying}
              onClick={() => setSequence((s) => [...s, cmd as Command])}
            >
              {cmd}
            </Button>
          ))}
          <Button variant="contained" color="error" onClick={() => setSequence([])}>
            Clear All
          </Button>
        </Stack>

        <Button
          fullWidth
          variant="contained"
          color="success"
          size="large"
          sx={{ mt: 2 }}
          onClick={() => {
            setIsPlaying(true);
            froggerEvents.emit("PLAY", sequence);
          }}
          disabled={isPlaying || sequence.length === 0}
        >
          EXECUTE RHYTHM LOOP
        </Button>
      </Paper>
    </Box>
  );
}
