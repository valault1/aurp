import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select,
  TextField, Tooltip, Typography, alpha, useTheme,
} from "@mui/material";
import { Code2, FileAudio, Minus, Music2, Pause, Play, Plus, RotateCcw, Square, Trash2, Undo2, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react";
import { TRACK_COLORS } from "../val/PianoRoll";
import { SnugRoll, type Selection } from "./SnugRoll";
import { SNUG_SONGS } from "./songs";
import { SnugPlayer, renderSong } from "./snugPlayer";
import { saveFile, snugToCode, snugToMidi, toWav } from "./snugCode";
import { SOUNDS, isKit, soundInfo, type SnugSong, type SnugSound } from "./snugSong";

const DRAFT_KEY = (id: string) => `aurp.music.bryce.draft.${id}`;

/** Space plays and pauses unless focus is on something Space already works (a field, button or menu). */
const TAKES_SPACE = "input, textarea, button, [role='button'], [role='combobox'], [role='option'], [role='listbox']";

/** Toolbar and track buttons skip focus on a mouse click, so Space keeps meaning play. */
const keepFocus = { onMouseDown: (e: React.MouseEvent) => e.preventDefault() };

/** UI edits are kept as a per-song draft, but only while the song file is unchanged. */
function loadSong(id: string): SnugSong {
  const file = SNUG_SONGS.find((s) => s.id === id)!.song;
  try {
    const raw = localStorage.getItem(DRAFT_KEY(id));
    if (raw) {
      const draft = JSON.parse(raw) as { base: string; song: SnugSong };
      if (draft.base === JSON.stringify(file)) return draft.song;
    }
  } catch {
    // storage unavailable or corrupt draft: fall back to the file
  }
  return file;
}

export function SnugStudio() {
  const theme = useTheme();
  const [songId, setSongId] = useState(SNUG_SONGS[0]!.id);
  const entry = SNUG_SONGS.find((s) => s.id === songId)!;
  const [song, setSong] = useState<SnugSong>(() => loadSong(songId));
  const [activeTrack, setActiveTrack] = useState(0);
  const [selected, setSelected] = useState<Selection>(null);
  const [muted, setMuted] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [beatWidth, setBeatWidth] = useState(40);
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [bpmText, setBpmText] = useState(String(song.bpm));
  const history = useRef<SnugSong[]>([]);
  const playerRef = useRef<SnugPlayer | null>(null);
  const latest = useRef({ song, muted });
  latest.current = { song, muted };

  const edited = JSON.stringify(song) !== JSON.stringify(entry.song);
  const track = Math.min(activeTrack, song.tracks.length - 1);

  useEffect(() => setBpmText(String(song.bpm)), [song.bpm]);

  // Created lazily on first interaction so the AudioContext starts from a user gesture, with whatever song is showing then.
  const player = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new SnugPlayer();
      playerRef.current.load(latest.current.song, latest.current.muted);
    }
    return playerRef.current;
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

  const edit = useCallback((fn: (s: SnugSong) => SnugSong, snapshot = false) => {
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
    const { track: ti, index } = selected;
    edit((s) => ({ ...s, tracks: s.tracks.map((t, i) => (i === ti ? { ...t, notes: t.notes.filter((_, ni) => ni !== index) } : t)) }), true);
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
      const target = e.target as HTMLElement;
      if (codeOpen || target.closest("input, textarea")) return;
      if (e.key === " ") {
        if (target.closest(TAKES_SPACE)) return;
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

  const setSound = (sound: SnugSound) =>
    edit((s) => ({ ...s, tracks: s.tracks.map((t, i) => (i === track ? { ...t, sound } : t)) }), true);

  const exportName = entry.file.replace(/\.ts$/, "");

  // Rendering swaps Tone's global context for a moment, so live playback stops first.
  const downloadWav = async () => {
    stop();
    setRendering(true);
    try {
      saveFile(toWav(await renderSong(song, muted)), `${exportName}.wav`);
    } catch {
      alert("Couldn't render that song.");
    } finally {
      setRendering(false);
    }
  };

  const downloadMidi = () => saveFile(new Blob([snugToMidi(song) as BlobPart], { type: "audio/midi" }), `${exportName}.mid`);

  const code = codeOpen ? snugToCode(song, exportName) : "";
  const getBeat = useCallback(() => (started && playerRef.current ? playerRef.current.beat % (song.bars * song.beatsPerBar) : null), [started, song]);

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
        <Select
          size="small" value={songId} onChange={(e) => switchSong(e.target.value)} sx={{ minWidth: 200 }}
          SelectDisplayProps={{ "aria-label": "Song" }} MenuProps={{ disableRestoreFocus: true }}
        >
          {SNUG_SONGS.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.song.title}</MenuItem>
          ))}
        </Select>
        <Tooltip title="Play / pause (space)">
          <IconButton {...keepFocus} color="primary" aria-label={playing ? "Pause" : "Play"} onClick={() => void togglePlay()} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.15) }}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Stop">
          <IconButton {...keepFocus} aria-label="Stop" onClick={stop}><Square size={18} /></IconButton>
        </Tooltip>
        <TextField
          size="small" type="number" label="BPM" value={bpmText} sx={{ width: 84 }}
          onChange={(e) => {
            setBpmText(e.target.value);
            const bpm = Number(e.target.value);
            if (bpm >= 30 && bpm <= 300) edit((s) => (s.bpm === bpm ? s : { ...s, bpm }), true);
          }}
          onBlur={() => setBpmText(String(song.bpm))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).blur()}
        />
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton size="small" aria-label="Fewer bars" onClick={() => setBars(song.bars - 1)}><Minus size={16} /></IconButton>
          <Typography variant="body2" sx={{ minWidth: 52, textAlign: "center" }}>{song.bars} bars</Typography>
          <IconButton size="small" aria-label="More bars" onClick={() => setBars(song.bars + 1)}><Plus size={16} /></IconButton>
        </Box>
        <Box sx={{ display: "flex" }}>
          <IconButton size="small" aria-label="Zoom out" onClick={() => setBeatWidth((w) => Math.max(16, w - 8))}><ZoomOut size={16} /></IconButton>
          <IconButton size="small" aria-label="Zoom in" onClick={() => setBeatWidth((w) => Math.min(120, w + 8))}><ZoomIn size={16} /></IconButton>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Undo (Ctrl+Z)">
          <span><IconButton size="small" aria-label="Undo" onClick={undo}><Undo2 size={16} /></IconButton></span>
        </Tooltip>
        <Tooltip title="Delete selected note (Delete)">
          <span><IconButton size="small" aria-label="Delete note" onClick={deleteSelected} disabled={!selected}><Trash2 size={16} /></IconButton></span>
        </Tooltip>
        {edited && (
          <Tooltip title={`Discard UI edits and reload bryce/songs/${entry.file}`}>
            <Button size="small" startIcon={<RotateCcw size={14} />} onClick={resetToFile}>Reset</Button>
          </Tooltip>
        )}
        <Button size="small" variant="contained" startIcon={<Code2 size={14} />} onClick={() => setCodeOpen(true)}>Copy as code</Button>
        <Tooltip title="Download as audio to share (two times through)">
          <span>
            <Button size="small" startIcon={<FileAudio size={14} />} onClick={() => void downloadWav()} disabled={rendering}>
              {rendering ? "Making..." : "WAV"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Download the notes for a music app">
          <Button size="small" startIcon={<Music2 size={14} />} onClick={downloadMidi}>MIDI</Button>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", px: 0.5 }}>{song.mood}</Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {song.tracks.map((t, i) => {
          const color = TRACK_COLORS[i % TRACK_COLORS.length]!;
          const isMuted = muted.has(i);
          return (
            <Chip
              key={i}
              {...keepFocus}
              label={`${t.name} · ${soundInfo(t.sound).label}`}
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
              deleteIcon={isMuted ? <VolumeX size={16} aria-label={`Unmute ${t.name}`} /> : <Volume2 size={16} aria-label={`Mute ${t.name}`} />}
              sx={{
                fontWeight: 700,
                opacity: isMuted ? 0.5 : 1,
                border: `1px solid ${alpha(color, i === track ? 1 : 0.4)}`,
                bgcolor: alpha(color, i === track ? 0.32 : 0.08),
                "&:hover, &.MuiChip-clickable:hover, &.Mui-focusVisible": { bgcolor: alpha(color, i === track ? 0.4 : 0.16) },
                "& .MuiChip-deleteIcon, & .MuiChip-deleteIcon:hover": { color },
              }}
            />
          );
        })}
        <Select
          size="small"
          value={song.tracks[track]!.sound}
          onChange={(e) => setSound(e.target.value as SnugSound)}
          SelectDisplayProps={{ "aria-label": "Sound for this track" }}
          sx={{ minWidth: 150 }}
        >
          {SOUNDS.filter((s) => isKit(s.id) === isKit(song.tracks[track]!.sound)).map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
          {edited ? `Edited in the UI (not saved to bryce/songs/${entry.file})` : `bryce/songs/${entry.file}`}
        </Typography>
      </Box>

      <SnugRoll
        song={song}
        activeTrack={track}
        selected={selected}
        beatWidth={beatWidth}
        onEdit={edit}
        onSelect={setSelected}
        onActiveTrack={setActiveTrack}
        onPreview={(ti, pitch) => player().preview(ti, pitch)}
        onSeek={(beat) => {
          player().seek(beat);
          setStarted(true);
        }}
        getBeat={getBeat}
      />

      <Typography variant="body2" color="text.secondary">
        Click an empty cell to add a note (drag to set its length). Drag a note to move it, drag its right edge to resize,
        and double-click or right-click to delete. Click a track chip (or any of its notes) to edit it, or its speaker to
        mute it, and pick its sound beside the chips. Drums and rain sit in their own strips along the bottom. To change the song with AI, ask your coding agent to edit{" "}
        <code>src/hackathons/music/bryce/songs/{entry.file}</code>. To keep edits you made here, use <b>Copy as code</b> and
        paste the result over that file. <b>WAV</b> saves the song to share, played twice through.
      </Typography>

      <Dialog open={codeOpen} onClose={() => setCodeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>bryce/songs/{entry.file}</DialogTitle>
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
