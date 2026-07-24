// tiny shared helpers for the APEX lap racer

export type Col = [number, number, number];

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const FONT_LABEL = '"Helvetica Neue","Segoe UI",system-ui,-apple-system,sans-serif';

export const fmtTime = (s: number) => {
  if (!Number.isFinite(s)) return "--:--.---";
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(3).padStart(6, "0")}`;
};
