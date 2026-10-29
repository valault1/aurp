// A piano roll that always shows the whole song: every melodic track on one pitch grid, and each kit track in its own
// strip pinned to the bottom. Based on Val's ../val/PianoRoll.tsx.
import { useEffect, useRef } from "react";
import { Box, alpha, useTheme } from "@mui/material";
import { DRUM_HITS, isBlackKey, midiToPitch, pitchToMidi, type DrumHit, type Note } from "../song";
import { TRACK_COLORS } from "../val/PianoRoll";
import { isKit, type SnugSong, type SnugSound } from "./snugSong";

const LABEL_W = 76;
const RULER_H = 20;
const SNAP = 0.25;
const LOW = 36; // C2
const HIGH = 96; // C7
const PITCH_H = 14;
const KIT_H = 13;
const KIT_TITLE_H = 16;

export type Selection = { track: number; index: number } | null;

const KIT_ROWS: Partial<Record<SnugSound, Record<DrumHit, string>>> = {
  brushes: { openhat: "Long shake", hat: "Shaker", clap: "Wood tick", snare: "Swish", kick: "Kick" },
  hand: { openhat: "Cabasa", hat: "Shaker", clap: "Rim", snare: "Bongo", kick: "Conga" },
  weather: { openhat: "Rain", hat: "Drop", clap: "Glass drip", snare: "Gust", kick: "Thunder" },
};

const PITCHES = Array.from({ length: HIGH - LOW + 1 }, (_, i) => midiToPitch(HIGH - i));

type Lane = { tracks: number[]; rows: string[]; labels: string[]; rowH: number; kit: boolean };

interface Props {
  song: SnugSong;
  activeTrack: number;
  selected: Selection;
  beatWidth: number;
  /** Apply an edit. `snapshot` marks the start of a new undo step. */
  onEdit: (fn: (song: SnugSong) => SnugSong, snapshot?: boolean) => void;
  onSelect: (sel: Selection) => void;
  onActiveTrack: (track: number) => void;
  onPreview: (track: number, pitch: string) => void;
  onSeek: (beat: number) => void;
  /** Playhead position in beats, or null when stopped. Polled every frame. */
  getBeat: () => number | null;
}

function updateNote(song: SnugSong, track: number, index: number, patch: Partial<Note>): SnugSong {
  return {
    ...song,
    tracks: song.tracks.map((t, ti) =>
      ti !== track ? t : { ...t, notes: t.notes.map((n, ni) => (ni === index ? { ...n, ...patch } : n)) },
    ),
  };
}

type Drag = { mode: "move" | "resize"; track: number; index: number; origStart: number; origLength: number; origRow: number; x: number; y: number };

interface LaneProps extends Omit<Props, "beatWidth" | "onSeek" | "getBeat"> {
  lane: Lane;
  bw: number;
  /** The track a click on an empty cell of this lane wakes up when it is not already active. */
  wake: number;
  lastLength: React.MutableRefObject<number>;
  dragging: React.MutableRefObject<boolean>;
}

/** One block of rows and its notes. Clicking an empty cell adds a note only when this lane holds the active track. */
function LaneGrid({ lane, song, activeTrack, selected, bw, wake, onEdit, onSelect, onActiveTrack, onPreview, lastLength, dragging }: LaneProps) {
  const theme = useTheme();
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const beats = song.bars * song.beatsPerBar;
  const { rows, rowH } = lane;
  const owns = lane.tracks.includes(activeTrack);

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
      dragRef.current = { mode: x > right - 8 ? "resize" : "move", track, index, x, y, origStart: n.start, origLength: n.length, origRow: rows.indexOf(n.pitch) };
      onEdit((s) => s, true);
    } else {
      if (!owns) {
        onActiveTrack(wake);
        onSelect(null);
        return;
      }
      const pitch = rows[Math.floor(y / rowH)];
      if (!pitch) return;
      const track = activeTrack;
      const start = Math.min(Math.floor(x / bw / SNAP) * SNAP, beats - SNAP);
      const length = Math.min(lastLength.current, beats - start);
      const index = song.tracks[track]!.notes.length;
      onEdit((s) => ({ ...s, tracks: s.tracks.map((t, ti) => (ti === track ? { ...t, notes: [...t.notes, { pitch, start, length }] } : t)) }), true);
      onSelect({ track, index });
      onPreview(track, pitch);
      dragRef.current = { mode: "resize", track, index, x, y, origStart: start, origLength: length, origRow: rows.indexOf(pitch) };
    }
    dragging.current = true;
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
      const row = Math.max(0, Math.min(rows.length - 1, d.origRow + Math.round((y - d.y) / rowH)));
      const start = Math.max(0, Math.min(d.origStart + dBeats, beats - d.origLength));
      const pitch = rows[row]!;
      if (pitch !== song.tracks[d.track]?.notes[d.index]?.pitch) onPreview(d.track, pitch);
      onEdit((s) => updateNote(s, d.track, d.index, { start, pitch }));
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
    dragging.current = false;
  };

  const deleteNote = (track: number, index: number) => {
    onEdit((s) => ({ ...s, tracks: s.tracks.map((t, ti) => (ti === track ? { ...t, notes: t.notes.filter((_, ni) => ni !== index) } : t)) }), true);
    onSelect(null);
  };

  const line = alpha(theme.palette.text.primary, 0.07);
  const barLine = alpha(theme.palette.text.primary, 0.22);
  const ordered = [...lane.tracks].sort((a, b) => (a === activeTrack ? 1 : 0) - (b === activeTrack ? 1 : 0));

  return (
    <Box sx={{ display: "flex" }}>
      <Box sx={{ position: "sticky", left: 0, zIndex: 2, width: LABEL_W, flexShrink: 0, bgcolor: "background.paper", borderRight: `1px solid ${barLine}` }}>
        {rows.map((p, r) => {
          const black = !lane.kit && isBlackKey(pitchToMidi(p) ?? 0);
          return (
            <Box
              key={p}
              onPointerDown={() => onPreview(owns ? activeTrack : wake, p)}
              sx={{
                height: rowH, fontSize: 10, lineHeight: `${rowH}px`, px: 0.75, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
                color: black ? "text.disabled" : "text.secondary",
                bgcolor: black ? alpha(theme.palette.text.primary, 0.06) : "transparent",
                fontWeight: !lane.kit && p.startsWith("C") && !p.includes("#") ? 700 : 400,
              }}
            >
              {lane.labels[r]}
            </Box>
          );
        })}
      </Box>
      <Box
        ref={gridRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          position: "relative", width: beats * bw, height: rows.length * rowH, flexShrink: 0, touchAction: "none",
          cursor: owns ? "crosshair" : "pointer",
          backgroundImage: `linear-gradient(to right, ${barLine} 1px, transparent 1px), linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          backgroundSize: `${bw * song.beatsPerBar}px 100%, ${bw}px 100%, 100% ${rowH}px`,
        }}
      >
        {!lane.kit &&
          rows.map((p, r) =>
            isBlackKey(pitchToMidi(p) ?? 0) ? (
              <Box key={p} sx={{ position: "absolute", left: 0, right: 0, top: r * rowH, height: rowH, bgcolor: alpha(theme.palette.text.primary, 0.03), pointerEvents: "none" }} />
            ) : null,
          )}
        {ordered.map((i) =>
          song.tracks[i]!.notes.map((n, ni) => {
            const row = rows.indexOf(n.pitch);
            if (row < 0) return null;
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
                  top: row * rowH + 1,
                  width: Math.max(n.length * bw - 1, 4),
                  height: rowH - 2,
                  borderRadius: "3px",
                  bgcolor: alpha(color, active ? 0.35 + 0.6 * (n.velocity ?? 0.8) : 0.22),
                  border: `1px solid ${alpha(color, active ? 1 : 0.45)}`,
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
    </Box>
  );
}

export function SnugRoll({ song, activeTrack, selected, beatWidth: bw, onEdit, onSelect, onActiveTrack, onPreview, onSeek, getBeat }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const lastLength = useRef(1);
  const dragging = useRef(false);

  const melodic = song.tracks.map((t, i) => ({ t, i })).filter(({ t }) => !isKit(t.sound)).map(({ i }) => i);
  const kits = song.tracks.map((t, i) => ({ t, i })).filter(({ t }) => isKit(t.sound));
  const lastMelodic = useRef(melodic[0] ?? 0);
  if (melodic.includes(activeTrack)) lastMelodic.current = activeTrack;
  else if (!melodic.includes(lastMelodic.current)) lastMelodic.current = melodic[0] ?? 0;

  const pitchLane: Lane = { tracks: melodic, rows: PITCHES, labels: PITCHES, rowH: PITCH_H, kit: false };
  const width = song.bars * song.beatsPerBar * bw;
  const barLine = alpha(theme.palette.text.primary, 0.22);
  const shared = { song, activeTrack, selected, bw, onEdit, onSelect, onActiveTrack, onPreview, lastLength, dragging };

  // Center the active melodic track's notes when it or the song changes.
  const focus = melodic.includes(activeTrack) ? activeTrack : lastMelodic.current;
  useEffect(() => {
    const el = scrollRef.current;
    const notes = song.tracks[focus]?.notes ?? [];
    if (!el || notes.length === 0) return;
    const r = notes.map((n) => PITCHES.indexOf(n.pitch)).filter((r) => r >= 0);
    if (r.length === 0) return;
    const mid = ((Math.min(...r) + Math.max(...r)) / 2) * PITCH_H + RULER_H;
    el.scrollTo({ top: mid - el.clientHeight / 2, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, song.title]);

  // Playhead and lit-up notes, driven by rAF so React does not re-render every frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const beat = getBeat();
      const head = playheadRef.current;
      if (head) {
        head.style.display = beat === null ? "none" : "block";
        if (beat !== null) head.style.transform = `translateX(${LABEL_W + beat * bw}px)`;
      }
      contentRef.current?.querySelectorAll<HTMLElement>("[data-note]").forEach((el) => {
        el.dataset.on = beat !== null && beat >= Number(el.dataset.start) && beat < Number(el.dataset.end) ? "1" : "0";
      });
      const sc = scrollRef.current;
      if (sc && beat !== null && !dragging.current) {
        const x = LABEL_W + beat * bw;
        if (x < sc.scrollLeft + LABEL_W || x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = x - LABEL_W - 40;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getBeat, bw]);

  return (
    <Box
      ref={scrollRef}
      sx={{
        position: "relative", overflow: "auto", maxHeight: "62vh", borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`, bgcolor: "background.paper", overscrollBehavior: "contain",
      }}
    >
      <Box ref={contentRef} sx={{ position: "relative", width: LABEL_W + width }}>
        <Box
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(Math.max(0, Math.floor((e.clientX - r.left - LABEL_W) / bw)));
          }}
          sx={{ position: "sticky", top: 0, zIndex: 5, height: RULER_H, width: LABEL_W + width, cursor: "pointer", bgcolor: "background.paper", borderBottom: `1px solid ${barLine}` }}
        >
          {Array.from({ length: song.bars }, (_, b) => (
            <Box key={b} sx={{ position: "absolute", left: LABEL_W + b * song.beatsPerBar * bw + 4, top: 2, fontSize: 11, color: "text.secondary", userSelect: "none" }}>
              {b + 1}
            </Box>
          ))}
        </Box>

        {melodic.length > 0 && <LaneGrid lane={pitchLane} wake={lastMelodic.current} {...shared} />}

        {kits.length > 0 && (
          <Box sx={{ position: "sticky", bottom: 0, zIndex: 3, bgcolor: "background.paper", borderTop: `2px solid ${barLine}`, boxShadow: `0 -6px 12px ${alpha(theme.palette.background.default, 0.6)}` }}>
            {kits.map(({ t, i }) => {
              const color = TRACK_COLORS[i % TRACK_COLORS.length]!;
              const names = KIT_ROWS[t.sound] ?? Object.fromEntries(DRUM_HITS.map((h) => [h, h]));
              const lane: Lane = { tracks: [i], rows: [...DRUM_HITS], labels: DRUM_HITS.map((h) => names[h] ?? h), rowH: KIT_H, kit: true };
              return (
                <Box key={i}>
                  <Box
                    onPointerDown={() => onActiveTrack(i)}
                    sx={{
                      position: "sticky", left: 0, width: "fit-content", height: KIT_TITLE_H, px: 0.75, fontSize: 10, fontWeight: 700,
                      lineHeight: `${KIT_TITLE_H}px`, color, cursor: "pointer", userSelect: "none", opacity: i === activeTrack ? 1 : 0.7,
                    }}
                  >
                    {t.name}
                  </Box>
                  <LaneGrid lane={lane} wake={i} {...shared} />
                </Box>
              );
            })}
          </Box>
        )}

        <Box
          ref={playheadRef}
          sx={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 2, bgcolor: "primary.main", zIndex: 6, pointerEvents: "none", display: "none" }}
        />
      </Box>
    </Box>
  );
}
