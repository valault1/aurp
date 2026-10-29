import { useEffect, useRef } from "react";
import { Box, alpha, useTheme } from "@mui/material";
import { DRUM_HITS, isBlackKey, midiToPitch, pitchToMidi, totalBeats, type Note, type Song } from "../song";

export const TRACK_COLORS = ["#f472b6", "#7dd3fc", "#a3e635", "#fbbf24", "#c084fc", "#fb7185", "#5eead4"];

const ROW_H = 14;
const LABEL_W = 44;
const RULER_H = 20;
const SNAP = 0.25;
const LOW = 36; // C2
const HIGH = 96; // C7

export type Selection = { track: number; index: number } | null;

interface Props {
  song: Song;
  activeTrack: number;
  selected: Selection;
  beatWidth: number;
  /** Apply an edit. `snapshot` marks the start of a new undo step. */
  onEdit: (fn: (song: Song) => Song, snapshot?: boolean) => void;
  onSelect: (sel: Selection) => void;
  onActiveTrack: (track: number) => void;
  onPreview: (track: number, pitch: string) => void;
  onSeek: (beat: number) => void;
  /** Playhead position in beats, or null when stopped. Polled every frame. */
  getBeat: () => number | null;
}

type Drag = {
  mode: "move" | "resize";
  track: number;
  index: number;
  origStart: number;
  origLength: number;
  origRow: number;
  x: number;
  y: number;
};

function updateNote(song: Song, track: number, index: number, patch: Partial<Note>): Song {
  return {
    ...song,
    tracks: song.tracks.map((t, ti) =>
      ti !== track ? t : { ...t, notes: t.notes.map((n, ni) => (ni === index ? { ...n, ...patch } : n)) },
    ),
  };
}

export function PianoRoll({ song, activeTrack, selected, beatWidth: bw, onEdit, onSelect, onActiveTrack, onPreview, onSeek, getBeat }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const lastLength = useRef(1);

  const drumMode = song.tracks[activeTrack]?.instrument === "drums";
  const rows: string[] = drumMode
    ? [...DRUM_HITS]
    : Array.from({ length: HIGH - LOW + 1 }, (_, i) => midiToPitch(HIGH - i));
  const rowOf = (pitch: string) => (drumMode ? rows.indexOf(pitch) : HIGH - (pitchToMidi(pitch) ?? -999));
  const beats = totalBeats(song);
  const width = beats * bw;
  const height = rows.length * ROW_H;

  // Visible tracks: in drum mode just the active drum track; otherwise every melodic track.
  const visible = song.tracks
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => (drumMode ? i === activeTrack : t.instrument !== "drums"))
    .sort((a, b) => (a.i === activeTrack ? 1 : 0) - (b.i === activeTrack ? 1 : 0));

  // Scroll the active track's notes into view when switching tracks.
  useEffect(() => {
    const el = scrollRef.current;
    const notes = song.tracks[activeTrack]?.notes ?? [];
    if (!el || drumMode || notes.length === 0) return;
    const r = notes.map((n) => rowOf(n.pitch)).filter((r) => r >= 0);
    const mid = ((Math.min(...r) + Math.max(...r)) / 2) * ROW_H + RULER_H;
    el.scrollTop = mid - el.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack, drumMode]);

  // Playhead + lit-up notes, driven by rAF so React doesn't re-render every frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const beat = getBeat();
      const head = playheadRef.current;
      if (head) {
        head.style.display = beat === null ? "none" : "block";
        if (beat !== null) head.style.transform = `translateX(${LABEL_W + beat * bw}px)`;
      }
      gridRef.current?.querySelectorAll<HTMLElement>("[data-note]").forEach((el) => {
        const on = beat !== null && beat >= Number(el.dataset.start) && beat < Number(el.dataset.end);
        el.dataset.on = on ? "1" : "0";
      });
      const sc = scrollRef.current;
      if (sc && beat !== null && !dragRef.current) {
        const x = LABEL_W + beat * bw;
        if (x < sc.scrollLeft + LABEL_W || x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = x - LABEL_W - 40;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getBeat, bw]);

  const local = (e: React.PointerEvent) => {
    const r = gridRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const { x, y } = local(e);
    const noteEl = (e.target as HTMLElement).closest<HTMLElement>("[data-note]");
    if (noteEl) {
      const track = Number(noteEl.dataset.track);
      const index = Number(noteEl.dataset.index);
      if (track !== activeTrack) {
        onActiveTrack(track);
        onSelect({ track, index });
        return;
      }
      const n = song.tracks[track]!.notes[index]!;
      onSelect({ track, index });
      onPreview(track, n.pitch);
      const right = (n.start + n.length) * bw;
      dragRef.current = {
        mode: x > right - 8 ? "resize" : "move",
        track, index, x, y,
        origStart: n.start,
        origLength: n.length,
        origRow: rowOf(n.pitch),
      };
      onEdit((s) => s, true);
    } else {
      const track = activeTrack;
      if (!song.tracks[track]) return;
      const row = Math.floor(y / ROW_H);
      const pitch = rows[row];
      if (!pitch) return;
      const start = Math.min(Math.floor(x / bw / SNAP) * SNAP, beats - SNAP);
      const length = Math.min(lastLength.current, beats - start);
      const index = song.tracks[track]!.notes.length;
      onEdit(
        (s) => ({
          ...s,
          tracks: s.tracks.map((t, ti) => (ti === track ? { ...t, notes: [...t.notes, { pitch, start, length }] } : t)),
        }),
        true,
      );
      onSelect({ track, index });
      onPreview(track, pitch);
      dragRef.current = { mode: "resize", track, index, x, y, origStart: start, origLength: length, origRow: row };
    }
    gridRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const { x, y } = local(e);
    const dBeats = Math.round((x - d.x) / bw / SNAP) * SNAP;
    if (d.mode === "resize") {
      const length = Math.max(SNAP, Math.min(d.origLength + dBeats, beats - d.origStart));
      onEdit((s) => updateNote(s, d.track, d.index, { length }));
      lastLength.current = length;
    } else {
      const row = Math.max(0, Math.min(rows.length - 1, d.origRow + Math.round((y - d.y) / ROW_H)));
      const start = Math.max(0, Math.min(d.origStart + dBeats, beats - d.origLength));
      const pitch = rows[row]!;
      const prev = song.tracks[d.track]?.notes[d.index]?.pitch;
      if (pitch !== prev) onPreview(d.track, pitch);
      onEdit((s) => updateNote(s, d.track, d.index, { start, pitch }));
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const deleteNote = (track: number, index: number) => {
    onEdit(
      (s) => ({ ...s, tracks: s.tracks.map((t, ti) => (ti === track ? { ...t, notes: t.notes.filter((_, ni) => ni !== index) } : t)) }),
      true,
    );
    onSelect(null);
  };

  const line = alpha(theme.palette.text.primary, 0.07);
  const barLine = alpha(theme.palette.text.primary, 0.22);
  const beatsPerBar = song.beatsPerBar;

  return (
    <Box
      ref={scrollRef}
      sx={{
        position: "relative",
        overflow: "auto",
        maxHeight: "58vh",
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        bgcolor: "background.paper",
        overscrollBehavior: "contain",
      }}
    >
      <Box sx={{ position: "relative", width: LABEL_W + width, height: RULER_H + height }}>
        {/* Ruler: bar numbers; click to seek. */}
        <Box
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(Math.max(0, Math.floor((e.clientX - r.left - LABEL_W) / bw)));
          }}
          sx={{
            position: "sticky", top: 0, zIndex: 3, height: RULER_H, width: LABEL_W + width, cursor: "pointer",
            bgcolor: "background.paper", borderBottom: `1px solid ${barLine}`,
          }}
        >
          {Array.from({ length: song.bars }, (_, b) => (
            <Box key={b} sx={{ position: "absolute", left: LABEL_W + b * beatsPerBar * bw + 4, top: 2, fontSize: 11, color: "text.secondary", userSelect: "none" }}>
              {b + 1}
            </Box>
          ))}
        </Box>

        {/* Pitch labels, sticky on the left. */}
        <Box sx={{ position: "sticky", left: 0, zIndex: 2, width: LABEL_W, height, bgcolor: "background.paper", borderRight: `1px solid ${barLine}` }}>
          {rows.map((p, r) => {
            const black = !drumMode && isBlackKey(pitchToMidi(p) ?? 0);
            return (
              <Box
                key={p}
                onPointerDown={() => onPreview(activeTrack, p)}
                sx={{
                  height: ROW_H, fontSize: 10, lineHeight: `${ROW_H}px`, px: 0.5, cursor: "pointer", userSelect: "none",
                  color: black ? "text.disabled" : "text.secondary",
                  bgcolor: black ? alpha(theme.palette.text.primary, 0.06) : "transparent",
                  fontWeight: p.startsWith("C") && !p.includes("#") && !drumMode ? 700 : 400,
                }}
                style={{ position: "absolute", top: r * ROW_H, width: LABEL_W }}
              >
                {p}
              </Box>
            );
          })}
        </Box>

        {/* Grid + notes. */}
        <Box
          ref={gridRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          sx={{
            position: "absolute", left: LABEL_W, top: RULER_H, width, height, touchAction: "none", cursor: "crosshair",
            backgroundImage: `linear-gradient(to right, ${barLine} 1px, transparent 1px), linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
            backgroundSize: `${bw * beatsPerBar}px 100%, ${bw}px 100%, 100% ${ROW_H}px`,
          }}
        >
          {!drumMode &&
            rows.map((p, r) =>
              isBlackKey(pitchToMidi(p) ?? 0) ? (
                <Box key={p} sx={{ position: "absolute", left: 0, right: 0, top: r * ROW_H, height: ROW_H, bgcolor: alpha(theme.palette.text.primary, 0.03), pointerEvents: "none" }} />
              ) : null,
            )}
          {visible.map(({ t, i }) =>
            t.notes.map((n, ni) => {
              const row = rowOf(n.pitch);
              if (row < 0 || row >= rows.length) return null;
              const color = TRACK_COLORS[i % TRACK_COLORS.length]!;
              const active = i === activeTrack;
              const isSel = selected?.track === i && selected.index === ni;
              return (
                <Box
                  key={`${i}-${ni}`}
                  data-note=""
                  data-track={i}
                  data-index={ni}
                  data-start={n.start}
                  data-end={n.start + n.length}
                  onDoubleClick={() => active && deleteNote(i, ni)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (active) deleteNote(i, ni);
                  }}
                  sx={{
                    position: "absolute",
                    left: n.start * bw,
                    top: row * ROW_H + 1,
                    width: Math.max(n.length * bw - 1, 4),
                    height: ROW_H - 2,
                    borderRadius: "3px",
                    bgcolor: alpha(color, active ? 0.35 + 0.6 * (n.velocity ?? 0.8) : 0.18),
                    border: `1px solid ${alpha(color, active ? 1 : 0.35)}`,
                    outline: isSel ? `2px solid ${theme.palette.text.primary}` : "none",
                    zIndex: active ? 1 : 0,
                    cursor: active ? "grab" : "pointer",
                    transition: "box-shadow 80ms, filter 80ms",
                    "&::after": active ? { content: '""', position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "ew-resize" } : {},
                    '&[data-on="1"]': { filter: "brightness(1.5)", boxShadow: `0 0 10px 2px ${alpha(color, 0.8)}` },
                  }}
                />
              );
            }),
          )}
        </Box>

        <Box
          ref={playheadRef}
          sx={{ position: "absolute", top: 0, left: 0, width: 2, height: RULER_H + height, bgcolor: "primary.main", zIndex: 4, pointerEvents: "none", display: "none" }}
        />
      </Box>
    </Box>
  );
}
