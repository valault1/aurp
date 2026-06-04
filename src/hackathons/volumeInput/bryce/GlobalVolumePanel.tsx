import { Box, Button, IconButton, TextField, Typography, useTheme, alpha } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMasterVolume } from "./VolumeContext";
import { levelColor } from "./shared";

// Minimal typings for the bits of the YouTube IFrame API we touch.
interface YTPlayer {
  setVolume: (v: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (id: string) => void;
  destroy: () => void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const DEFAULT_VIDEO = "jfKfPfyJRdk"; // lofi hip hop radio — loops forever, good for testing

function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1]! : null;
}

export function GlobalVolumePanel() {
  const theme = useTheme();
  const { volume, source } = useMasterVolume();

  const hostWrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // Create the YouTube player once. We append an imperatively-created host div
  // (YT replaces it with an iframe) so React never tries to reconcile it.
  useEffect(() => {
    let cancelled = false;

    const create = () => {
      if (cancelled || !hostWrapRef.current || !window.YT) return;
      const host = document.createElement("div");
      hostWrapRef.current.appendChild(host);
      playerRef.current = new window.YT.Player(host, {
        videoId: DEFAULT_VIDEO,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(volume);
            setReady(true);
          },
        },
      });
    };

    if (window.YT?.Player) {
      create();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        create();
      };
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* iframe already gone */
      }
      playerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive the actual media volume from the master value.
  useEffect(() => {
    if (ready) playerRef.current?.setVolume(volume);
  }, [volume, ready]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
      setPlaying(false);
    } else {
      playerRef.current.playVideo();
      setPlaying(true);
    }
  };

  const loadUrl = () => {
    const id = parseVideoId(urlInput);
    if (id && playerRef.current) {
      playerRef.current.loadVideoById(id);
      playerRef.current.setVolume(volume);
      setPlaying(true);
      setUrlInput("");
    }
  };

  const color = levelColor(volume);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 3,
        p: 3,
        mb: 4,
        borderRadius: 4,
        bgcolor: "background.paper",
        backdropFilter: "blur(12px)",
        border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
        boxShadow: `0 8px 32px ${alpha("#000", 0.3)}`,
      }}
    >
      {/* Master volume readout */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 2 }}>
            Master Volume
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            set by: <b>{source}</b>
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography sx={{ fontSize: 22 }}>{volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}</Typography>
          <Box
            sx={{
              flex: 1,
              height: 22,
              borderRadius: 11,
              overflow: "hidden",
              background: alpha(theme.palette.text.primary, 0.08),
            }}
          >
            <motion.div
              animate={{ width: `${volume}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ height: "100%", background: color, boxShadow: `0 0 12px ${color}` }}
            />
          </Box>
          <Typography sx={{ fontSize: 32, fontWeight: 900, minWidth: 56, textAlign: "right", color }}>
            {volume}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            size="small"
            onClick={togglePlay}
            disabled={!ready}
            sx={{ borderRadius: "100px", fontWeight: 700, minWidth: 96 }}
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </Button>
          <TextField
            size="small"
            placeholder="Paste a YouTube link…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUrl()}
            sx={{ flex: 1 }}
          />
          <IconButton onClick={loadUrl} disabled={!ready || !urlInput} size="small" sx={{ fontWeight: 700 }}>
            ⤵
          </IconButton>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
          Set the volume any way you like on the right — the music below obeys.
        </Typography>
      </Box>

      {/* Player */}
      <Box
        sx={{
          width: { xs: "100%", md: 280 },
          flexShrink: 0,
          aspectRatio: "16 / 9",
          borderRadius: 2,
          overflow: "hidden",
          background: "#000",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
        }}
      >
        <Box ref={hostWrapRef} sx={{ width: "100%", height: "100%" }} />
      </Box>
    </Box>
  );
}
