import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select,
  TextField, Tooltip, Typography, alpha, useTheme,
} from "@mui/material";
import { Code2, Download, Minus, Pause, Play, Plus, RotateCcw, Square, Trash2, Undo2, Upload, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react";
import { SONGS } from "../songs";
import { SongPlayer } from "../player";
import { midiToSong, songToCode, songToMidi } from "../songCode";
import { totalBeats, type Song } from "../song";
import { PianoRoll, TRACK_COLORS, type Selection } from "./PianoRoll";

const DRAFT_KEY = (id: string) => `aurp.music.draft.${id}`;

/** UI edits are kept as a per-song draft, but only while the song file is unchanged. */
function loadSong(id: string): Song {
  const file = SONGS.find((s) => s.id === id)!.song;
  try {
    const raw = localStorage.getItem(DRAFT_KEY(id));
    if (raw) {
      const draft = JSON.parse(raw) as { base: string; song: Song };
      if (draft.base === JSON.stringify(file)) return draft.song;
    }
  } catch {
    // storage unavailable or corrupt draft: fall back to the file
  }
  return file;
}

function Spectrum({ getBins }: { getBins: () => Float32Array | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = ref.current;
      const ctx = c?.getContext("2d");
      if (c && ctx) {
        const w = (c.width = c.clientWidth * devicePixelRatio);
        const h = (c.height = c.clientHeight * devicePixelRatio);
        ctx.clearRect(0, 0, w, h);
        const bins = getBins();
        if (bins) {
          const n = bins.length;
          const bar = w / n;
          for (let i = 0; i < n; i++) {
            const v = Math.max(0, Math.min(1, (bins[i]! + 100) / 80));
            ctx.fillStyle = TRACK_COLORS[i % TRACK_COLORS.length]!;
            ctx.globalAlpha = 0.35 + 0.65 * v;
            ctx.fillRect(i * bar + 1, h - v * h, bar - 2, v * h);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getBins]);
  return <Box component="canvas" ref={ref} sx={{ width: "100%", height: 48, display: "block", borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }} />;
}

export function SongStudio() {
  const theme = useTheme();
  const [songId, setSongId] = useState(SONGS[0]!.id);
  const entry = SONGS.find((s) => s.id === songId)!;
  const [song, setSong] = useState<Song>(() => loadSong(songId));
  const [activeTrack, setActiveTrack] = useState(0);
  const [selected, setSelected] = useState<Selection>(null);
  const [muted, setMuted] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [beatWidth, setBeatWidth] = useState(40);
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const history = useRef<Song[]>([]);
  const playerRef = useRef<SongPlayer | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const edited = JSON.stringify(song) !== JSON.stringify(entry.song);

  // Created lazily on first interaction so the AudioContext starts from a user gesture.
  const player = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new SongPlayer();
      playerRef.current.load(song, muted);
    }
    return playerRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => playerRef.current?.dispose(), []);

  // Reschedule on every edit so changes are heard immediately, even mid-playback.
  useEffect(() => {
    playerRef.current?.load(song, muted);
  }, [song, muted]);

  useEffect(() => {
    try {
      if (edited) localStorage.setItem(DRAFT_KEY(songId), JSON.stringify({ base: JSON.stringify(entry.song), song }));
      else localStorage.removeItem(DRAFT_KEY(songId));
    } catch {
      // drafts are a convenience only
    }
  }, [song, songId, entry, edited]);

  const edit = useCallback((fn: (s: Song) => Song, snapshot = false) => {
    setSong((s) => {
      if (snapshot) history.current = [...history.current.slice(-99), s];
      return fn(s);
    });
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) {
      setSong(prev);
      setSelected(null);
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    const { track, index } = selected;
    edit((s) => ({ ...s, tracks: s.tracks.map((t, ti) => (ti === track ? { ...t, notes: t.notes.filter((_, ni) => ni !== index) } : t)) }), true);
    setSelected(null);
  }, [selected, edit]);

  const togglePlay = useCallback(async () => {
    const p = player();
    if (playing) {
      p.pause();
      setPlaying(false);
    } else {
      await p.play();
      setPlaying(true);
      setStarted(true);
    }
  }, [player, playing]);

  const stop = () => {
    playerRef.current?.stop();
    setPlaying(false);
    setStarted(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || codeOpen) return;
      if (e.key === " ") {
        e.preventDefault();
        void togglePlay();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, deleteSelected, undo, selected, codeOpen]);

  const switchSong = (id: string) => {
    stop();
    setSongId(id);
    setSong(loadSong(id));
    history.current = [];
    setActiveTrack(0);
    setSelected(null);
    setMuted(new Set());
  };

  const resetToFile = () => {
    history.current = [...history.current, song];
    setSong(entry.song);
    setSelected(null);
  };

  const setBars = (bars: number) => {
    if (bars < 1 || bars > 64) return;
    edit((s) => ({
      ...s,
      bars,
      tracks: s.tracks.map((t) => ({ ...t, notes: t.notes.filter((n) => n.start < bars * s.beatsPerBar) })),
    }), true);
    setSelected(null);
  };

  const downloadMidi = () => {
    const bytes = songToMidi(song);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "audio/midi" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title.replace(/[^\w-]+/g, "_") || "song"}.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMidi = async (file: File) => {
    try {
      const next = midiToSong(await file.arrayBuffer(), file.name.replace(/\.midi?$/i, ""));
      history.current = [...history.current, song];
      setSong(next);
      setActiveTrack(0);
      setSelected(null);
      setMuted(new Set());
    } catch {
      alert("Couldn't read that MIDI file.");
    }
  };

  const exportName = entry.file.replace(/\.ts$/, "");
  const code = codeOpen ? songToCode(song, exportName) : "";
  const getBeat = useCallback(() => (started && playerRef.current ? playerRef.current.beat % totalBeats(song) : null), [started, song]);
  const getBins = useCallback(() => (playing && playerRef.current ? playerRef.current.spectrum() : null), [playing]);

  const glass = {
    p: { xs: 1.5, md: 2 },
    borderRadius: 4,
    bgcolor: alpha(theme.palette.background.paper, 0.6),
    backdropFilter: "blur(12px)",
    border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
  };

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ ...glass, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
        <Select size="small" value={songId} onChange={(e) => switchSong(e.target.value)} sx={{ minWidth: 160 }}>
          {SONGS.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.song.title}</MenuItem>
          ))}
        </Select>
        <Tooltip title="Play / pause (space)">
          <IconButton color="primary" onClick={() => void togglePlay()} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15) }}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Stop">
          <IconButton onClick={stop}><Square size={18} /></IconButton>
        </Tooltip>
        <TextField
          size="small" type="number" label="BPM" value={song.bpm} sx={{ width: 84 }}
          onChange={(e) => {
            const bpm = Number(e.target.value);
            if (bpm >= 30 && bpm <= 300) edit((s) => ({ ...s, bpm }), true);
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton size="small" onClick={() => setBars(song.bars - 1)}><Minus size={16} /></IconButton>
          <Typography variant="body2" sx={{ minWidth: 52, textAlign: "center" }}>{song.bars} bars</Typography>
          <IconButton size="small" onClick={() => setBars(song.bars + 1)}><Plus size={16} /></IconButton>
        </Box>
        <Box sx={{ display: "flex" }}>
          <IconButton size="small" onClick={() => setBeatWidth((w) => Math.max(16, w - 8))}><ZoomOut size={16} /></IconButton>
          <IconButton size="small" onClick={() => setBeatWidth((w) => Math.min(120, w + 8))}><ZoomIn size={16} /></IconButton>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Undo (Ctrl+Z)">
          <span><IconButton size="small" onClick={undo}><Undo2 size={16} /></IconButton></span>
        </Tooltip>
        <Tooltip title="Delete selected note (Delete)">
          <span><IconButton size="small" onClick={deleteSelected} disabled={!selected}><Trash2 size={16} /></IconButton></span>
        </Tooltip>
        {edited && (
          <Tooltip title={`Discard UI edits and reload songs/${entry.file}`}>
            <Button size="small" startIcon={<RotateCcw size={14} />} onClick={resetToFile}>Reset</Button>
          </Tooltip>
        )}
        <Button size="small" variant="contained" startIcon={<Code2 size={14} />} onClick={() => setCodeOpen(true)}>Copy as code</Button>
        <Tooltip title="Download .mid">
          <IconButton size="small" onClick={downloadMidi}><Download size={16} /></IconButton>
        </Tooltip>
        <Tooltip title="Import a .mid file">
          <IconButton size="small" onClick={() => fileInput.current?.click()}><Upload size={16} /></IconButton>
        </Tooltip>
        <input
          ref={fileInput} type="file" accept=".mid,.midi,audio/midi" hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importMidi(f);
            e.target.value = "";
          }}
        />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {song.tracks.map((t, i) => {
          const color = TRACK_COLORS[i % TRACK_COLORS.length]!;
          const isMuted = muted.has(i);
          return (
            <Chip
              key={i}
              label={`${t.name} · ${t.instrument}`}
              onClick={() => {
                setActiveTrack(i);
                setSelected(null);
              }}
              onDelete={() => setMuted((m) => {
                const next = new Set(m);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })}
              deleteIcon={isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              sx={{
                fontWeight: 700,
                opacity: isMuted ? 0.5 : 1,
                border: `1px solid ${alpha(color, i === activeTrack ? 1 : 0.4)}`,
                bgcolor: alpha(color, i === activeTrack ? 0.3 : 0.08),
                "& .MuiChip-deleteIcon": { color },
              }}
            />
          );
        })}
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          {edited ? `Edited in the UI (not saved to songs/${entry.file})` : `songs/${entry.file}`}
        </Typography>
      </Box>

      <Spectrum getBins={getBins} />

      <PianoRoll
        song={song}
        activeTrack={Math.min(activeTrack, song.tracks.length - 1)}
        selected={selected}
        beatWidth={beatWidth}
        onEdit={edit}
        onSelect={setSelected}
        onActiveTrack={setActiveTrack}
        onPreview={(track, pitch) => player().preview(track, pitch)}
        onSeek={(beat) => {
          player().seek(beat);
          setStarted(true);
        }}
        getBeat={getBeat}
      />

      <Typography variant="body2" color="text.secondary">
        Click an empty cell to add a note (drag to set its length). Drag a note to move it, drag its right edge to resize,
        and double-click or right-click to delete. Click a track chip to edit it, or its speaker to mute it. To change the
        song with AI, ask your coding agent to edit <code>src/hackathons/music/songs/{entry.file}</code>. To keep edits you
        made here, use <b>Copy as code</b> and paste the result over that file.
      </Typography>

      <Dialog open={codeOpen} onClose={() => setCodeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>songs/{entry.file}</DialogTitle>
        <DialogContent>
          <Box component="pre" sx={{ m: 0, p: 2, maxHeight: "60vh", overflow: "auto", fontSize: 12, borderRadius: 2, bgcolor: "background.default" }}>
            {code}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCodeOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                alert("Clipboard unavailable here (it needs HTTPS or localhost). Select the text and copy it manually.");
              }
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
