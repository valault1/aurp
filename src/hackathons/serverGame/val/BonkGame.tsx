import { useEffect, useRef, useState } from "react";
import { Box, Button, Paper, Stack, TextField, Typography, Alert, Chip } from "@mui/material";
import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import { BONK_SERVER_URL, FIELD } from "./netConfig";
import { BonkScene } from "./BonkScene";

type Phase = "menu" | "connecting" | "inRoom";

export function BonkGame() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<any> | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>("menu");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("waiting"); // waiting | playing | gameover
  const [winner, setWinner] = useState("");
  const [mySessionId, setMySessionId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [playerCount, setPlayerCount] = useState(0);

  function getClient() {
    if (!clientRef.current) clientRef.current = new Client(BONK_SERVER_URL);
    return clientRef.current;
  }

  function attachRoom(room: Room<any>) {
    roomRef.current = room;
    setMySessionId(room.sessionId);
    setRoomId(room.roomId);
    setStatus(room.state?.status ?? "waiting");
    setWinner(room.state?.winner ?? "");
    setPlayerCount(room.state?.players?.size ?? 0);
    console.log(`[bonk] connected  roomId=${room.roomId}  sessionId=${room.sessionId}`);

    room.onStateChange((state: any) => {
      console.log(
        `[bonk] stateChange roomId=${room.roomId} status=${state.status} players=${state.players?.size ?? 0} winner=${state.winner}`
      );
      setStatus(state.status);
      setWinner(state.winner);
      setPlayerCount(state.players?.size ?? 0);
    });
    room.onError((code, message) => {
      console.error("[bonk] room error", code, message);
      setError(`Server error ${code}: ${message ?? ""}`);
    });
    room.onLeave(() => {
      teardownGame();
      setPhase("menu");
    });
    setPhase("inRoom");
  }

  async function handleCreate() {
    const k = key.trim().toLowerCase();
    if (!k) return setError("Enter a keyphrase first.");
    setError("");
    setPhase("connecting");
    try {
      // joinOrCreate: makes a fresh room for this keyphrase (and won't spawn a
      // duplicate if one is already open under the same phrase).
      const room = await getClient().joinOrCreate<any>("bonk", { key: k });
      console.log(`[bonk] CREATE -> roomId=${room.roomId}`);
      attachRoom(room);
    } catch (e: any) {
      setError(`Couldn't create room: ${e?.message ?? e}`);
      setPhase("menu");
    }
  }

  async function handleJoin() {
    const k = key.trim().toLowerCase();
    if (!k) return setError("Enter a keyphrase first.");
    setError("");
    setPhase("connecting");
    try {
      const room = await getClient().join<any>("bonk", { key: k });
      console.log(`[bonk] JOIN -> roomId=${room.roomId}`);
      attachRoom(room);
    } catch (e: any) {
      setError(
        `No open room with keyphrase "${k}" (${e?.message ?? e}). Make sure the other player clicked Create first, with the exact same phrase.`
      );
      setPhase("menu");
    }
  }

  function teardownGame() {
    gameRef.current?.destroy(true);
    gameRef.current = null;
  }

  async function handleLeave() {
    try {
      await roomRef.current?.leave();
    } catch {
      /* ignore */
    }
    roomRef.current = null;
    teardownGame();
    setPhase("menu");
    setStatus("waiting");
    setWinner("");
    setRoomId("");
    setPlayerCount(0);
  }

  // Boot Phaser once we're in a room and the canvas host is mounted.
  useEffect(() => {
    if (phase !== "inRoom" || !roomRef.current || !parentRef.current) return;
    if (gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: FIELD.WIDTH,
      height: FIELD.HEIGHT,
      parent: parentRef.current,
      backgroundColor: "#0f172a",
      scene: [BonkScene],
    });
    game.registry.set("room", roomRef.current);
    game.registry.set("sessionId", roomRef.current.sessionId);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      if (gameRef.current === game) gameRef.current = null;
    };
  }, [phase]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      roomRef.current?.leave().catch(() => {});
      gameRef.current?.destroy(true);
    };
  }, []);

  if (phase !== "inRoom") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <Paper sx={{ p: 4, width: 420, maxWidth: "100%" }} elevation={3}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            🥎 Bonk
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
            Two baseballs, two bats. Whack your rival into the spikes. Move with WASD / arrows,
            press SPACE to swing.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Room keyphrase"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. purple-otter"
              fullWidth
              disabled={phase === "connecting"}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleCreate}
                disabled={phase === "connecting"}
              >
                Create Room
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleJoin}
                disabled={phase === "connecting"}
              >
                Join Room
              </Button>
            </Stack>
            {phase === "connecting" && <Typography variant="body2">Connecting…</Typography>}
            {error && <Alert severity="warning">{error}</Alert>}
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" justifyContent="center">
        <Typography variant="subtitle1">
          Room: <strong>{key}</strong>
        </Typography>
        <Chip size="small" label={`id ${roomId}`} />
        <Chip
          size="small"
          color={playerCount >= 2 ? "success" : "default"}
          label={`${playerCount}/2 players`}
        />
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {status === "waiting"
            ? "Waiting for player 2…"
            : status === "playing"
            ? "You are the blue ball. SPACE = swing."
            : winner === mySessionId
            ? "You win! 🏆"
            : "You lose 💀"}
        </Typography>
        <Button size="small" variant="outlined" color="inherit" onClick={handleLeave}>
          Leave
        </Button>
      </Stack>

      <Box
        ref={parentRef}
        sx={{
          width: FIELD.WIDTH,
          maxWidth: "100%",
          aspectRatio: `${FIELD.WIDTH} / ${FIELD.HEIGHT}`,
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 6,
        }}
      />
      {error && <Alert severity="warning">{error}</Alert>}
    </Box>
  );
}
