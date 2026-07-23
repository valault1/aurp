import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Box } from "@mui/material";
import { GolfScene } from "./GolfScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./defaultLevel";
import type { GameState, Level, PlacementTool, SceneMode } from "./types";

interface GolfCanvasProps {
  level: Level;
  mode: SceneMode;
  onReady?: (scene: GolfScene) => void;
  onState?: (state: GameState) => void;
  onToolChange?: (tool: PlacementTool) => void;
}

/**
 * Mounts a single Phaser game and hands the live GolfScene back to the parent.
 * StrictMode double-invokes effects in dev, so we fully destroy the game on
 * cleanup and rebuild on the second pass.
 */
export function GolfCanvas({ level, mode, onReady, onState, onToolChange }: GolfCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Keep the latest callbacks without re-creating the game.
  const cbRef = useRef({ onReady, onState, onToolChange });
  cbRef.current = { onReady, onState, onToolChange };

  useEffect(() => {
    if (!hostRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: hostRef.current,
      backgroundColor: "#12281c",
      transparent: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      },
      physics: {
        default: "matter",
        matter: { gravity: { x: 0, y: 0 }, debug: false },
      },
      // No sound in this game; disabling audio avoids an AudioContext
      // suspend error when the game is destroyed/recreated (StrictMode + HMR).
      audio: { noAudio: true },
    });

    // Register + auto-start the scene with its config data.
    game.scene.add(
      "golf",
      GolfScene,
      true,
      {
        level,
        mode,
        onReady: (s: GolfScene) => cbRef.current.onReady?.(s),
        onState: (st: GameState) => cbRef.current.onState?.(st),
        onToolChange: (t: PlacementTool) => cbRef.current.onToolChange?.(t),
      },
    );

    (window as unknown as { __golfGame?: Phaser.Game }).__golfGame = game; // debug hook

    return () => game.destroy(true);
    // Intentionally mount once; live updates go through the scene ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      ref={hostRef}
      sx={{
        width: "100%",
        aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        touchAction: "none",
        "& canvas": { display: "block", width: "100% !important", height: "100% !important" },
      }}
    />
  );
}
