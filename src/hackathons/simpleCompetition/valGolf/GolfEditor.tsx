import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Paper,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  MousePointer2,
  Circle,
  PlusCircle,
  Disc3,
  Droplets,
  Flag,
  Play,
  Square,
  RotateCcw,
  Save,
  Download,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { GolfCanvas } from "./GolfCanvas";
import type { GolfScene } from "./GolfScene";
import type { GameState, PlacementTool } from "./types";
import { exportLevel, loadLevel, resetSavedLevel, saveLevel } from "./storage";

interface GolfEditorProps {
  onExit: () => void;
}

const TOOLS: { value: PlacementTool; label: string; icon: React.ReactNode }[] = [
  { value: "select", label: "Select / move", icon: <MousePointer2 size={18} /> },
  { value: "coin", label: "Coin", icon: <Circle size={18} /> },
  { value: "extraHit", label: "Extra hit", icon: <PlusCircle size={18} /> },
  { value: "bumper", label: "Bumper", icon: <Disc3 size={18} /> },
  { value: "water", label: "Water", icon: <Droplets size={18} /> },
  { value: "moveBall", label: "Ball start", icon: <Flag size={18} /> },
];

export function GolfEditor({ onExit }: GolfEditorProps) {
  const initial = useMemo(() => loadLevel(), []);
  const sceneRef = useRef<GolfScene | null>(null);

  const [tool, setTool] = useState<PlacementTool>("select");
  const [testing, setTesting] = useState(false);
  const [state, setState] = useState<GameState | null>(null);

  const [name, setName] = useState(initial.name);
  const [friction, setFriction] = useState(initial.friction);
  const [bounciness, setBounciness] = useState(initial.bounciness);
  const [strokes, setStrokes] = useState(initial.strokes);
  const [target, setTarget] = useState(initial.targetScore);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const scene = () => sceneRef.current;

  const pickTool = (t: PlacementTool) => {
    setTool(t);
    scene()?.setTool(t);
  };

  const toggleTest = () => {
    const next = !testing;
    setTesting(next);
    scene()?.setMode(next ? "play" : "edit");
    if (!next) pickTool("select");
  };

  const doSave = () => {
    const s = scene();
    if (!s) return;
    saveLevel(s.getLevel());
    setSavedAt(new Date().toLocaleTimeString());
  };

  const doReset = () => {
    const fresh = resetSavedLevel();
    scene()?.loadLevel(fresh);
    setName(fresh.name);
    setFriction(fresh.friction);
    setBounciness(fresh.bounciness);
    setStrokes(fresh.strokes);
    setTarget(fresh.targetScore);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1240, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => {
            const s = scene();
            if (s) saveLevel(s.getLevel());
            onExit();
          }}
        >
          Save &amp; play
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
          Level Editor
        </Typography>
        {savedAt && (
          <Typography variant="caption" color="success.main">
            Saved at {savedAt}
          </Typography>
        )}
      </Stack>

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" }, alignItems: "flex-start" }}>
        {/* Canvas */}
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <GolfCanvas
            level={initial}
            mode="edit"
            onReady={(s) => (sceneRef.current = s)}
            onState={setState}
            onToolChange={(t) => setTool(t)}
          />
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center" flexWrap="wrap">
            <Button
              variant={testing ? "outlined" : "contained"}
              color={testing ? "warning" : "success"}
              startIcon={testing ? <Square size={18} /> : <Play size={18} />}
              onClick={toggleTest}
            >
              {testing ? "Stop test" : "Play-test"}
            </Button>
            {testing && (
              <>
                <Button startIcon={<RotateCcw size={18} />} onClick={() => scene()?.replay()}>
                  Restart
                </Button>
                <Typography variant="body2" color="text.secondary">
                  🪙 {state?.score ?? 0}/{state?.coinsTotal ?? 0} · 🏌️ {state?.strokesLeft ?? 0} left ·{" "}
                  {state?.status === "won" ? "won 🎉" : state?.status === "lost" ? "out of strokes" : "playing"}
                </Typography>
              </>
            )}
          </Stack>
        </Box>

        {/* Control panel */}
        <Paper elevation={3} sx={{ p: 2.5, width: { xs: "100%", md: 320 }, flexShrink: 0, borderRadius: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Place objects
          </Typography>
          <ToggleButtonGroup
            value={tool}
            exclusive
            onChange={(_, v) => v && pickTool(v)}
            size="small"
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1, "& .MuiToggleButton-root": { borderRadius: 2, border: "1px solid rgba(128,128,128,0.3)" } }}
            disabled={testing}
          >
            {TOOLS.map((t) => (
              <ToggleButton key={t.value} value={t.value} sx={{ justifyContent: "flex-start", gap: 1, textTransform: "none" }}>
                {t.icon}
                {t.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Pick a tool then click the course. In <b>Select</b>: drag to move; double-click an object to delete;
            double-click a wall/water edge to add a point, a corner to remove it.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" color="text.secondary">
            Level settings
          </Typography>

          <TextField
            label="Name"
            value={name}
            size="small"
            fullWidth
            sx={{ mt: 1.5 }}
            onChange={(e) => {
              setName(e.target.value);
              scene()?.setName(e.target.value);
            }}
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">Ground friction — {friction < 0.33 ? "slick" : friction > 0.66 ? "rough" : "medium"}</Typography>
            <Slider
              value={friction}
              min={0}
              max={1}
              step={0.01}
              onChange={(_, v) => {
                setFriction(v as number);
                scene()?.setFriction(v as number);
              }}
            />
          </Box>

          <Box>
            <Typography variant="body2">Wall bounciness — {bounciness < 0.33 ? "dead" : bounciness > 0.66 ? "springy" : "medium"}</Typography>
            <Slider
              value={bounciness}
              min={0}
              max={1}
              step={0.01}
              onChange={(_, v) => {
                setBounciness(v as number);
                scene()?.setBounciness(v as number);
              }}
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Strokes"
              type="number"
              size="small"
              value={strokes}
              onChange={(e) => {
                const n = Number(e.target.value);
                setStrokes(n);
                scene()?.setStrokes(n);
              }}
            />
            <TextField
              label="Target coins"
              type="number"
              size="small"
              value={target}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTarget(n);
                scene()?.setTarget(n);
              }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Changing strokes takes effect on the next <b>Restart</b>.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            <Button variant="contained" startIcon={<Save size={18} />} onClick={doSave}>
              Save level
            </Button>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Download as JSON">
                <Button fullWidth variant="outlined" startIcon={<Download size={18} />} onClick={() => scene() && exportLevel(scene()!.getLevel())}>
                  Export
                </Button>
              </Tooltip>
              <Tooltip title="Reset to the starter level">
                <Button fullWidth color="error" variant="outlined" startIcon={<RefreshCw size={18} />} onClick={doReset}>
                  Reset
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
