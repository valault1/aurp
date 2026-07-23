import { useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { RotateCcw, Pencil } from "lucide-react";
import { GolfCanvas } from "./GolfCanvas";
import type { GolfScene } from "./GolfScene";
import type { GameState } from "./types";
import { loadLevel } from "./storage";

interface GolfPlayerProps {
  onEdit: () => void;
}

/** Customer-facing play view: just the course, a HUD, and a replay. */
export function GolfPlayer({ onEdit }: GolfPlayerProps) {
  const level = useMemo(() => loadLevel(), []);
  const sceneRef = useRef<GolfScene | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  const over = state?.status === "won" || state?.status === "lost";

  return (
    <Box sx={{ width: "100%", maxWidth: 960, mx: "auto", position: "relative" }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
          {level.name}
        </Typography>
        <Chip color="warning" label={`🪙 ${state?.score ?? 0} / ${state?.coinsTotal ?? 0}`} sx={{ fontWeight: 700 }} />
        <Chip color="primary" label={`🎯 Target ${state?.targetScore ?? level.targetScore}`} sx={{ fontWeight: 700 }} />
        <Chip label={`🏌️ Strokes ${state?.strokesLeft ?? level.strokes}`} sx={{ fontWeight: 700 }} />
      </Stack>

      <Box sx={{ position: "relative" }}>
        <GolfCanvas
          level={level}
          mode="play"
          onReady={(s) => (sceneRef.current = s)}
          onState={setState}
        />

        {over && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              inset: 0,
              m: "auto",
              width: "fit-content",
              height: "fit-content",
              p: 4,
              textAlign: "center",
              borderRadius: 4,
              backdropFilter: "blur(4px)",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
              {state?.status === "won" ? "🎉 You win!" : "😅 So close!"}
            </Typography>
            <Typography sx={{ mb: 2 }}>
              Collected {state?.score} of {state?.coinsTotal} coins (target {state?.targetScore}).
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<RotateCcw size={18} />}
              onClick={() => sceneRef.current?.replay()}
            >
              Play again
            </Button>
          </Paper>
        )}
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} justifyContent="center">
        <Button variant="outlined" startIcon={<RotateCcw size={18} />} onClick={() => sceneRef.current?.replay()}>
          Restart
        </Button>
        <Button variant="text" startIcon={<Pencil size={18} />} onClick={onEdit}>
          Edit level
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: "center" }}>
        Drag back from the ball and release to shoot — like a slingshot. Grab every coin you can!
      </Typography>
    </Box>
  );
}
