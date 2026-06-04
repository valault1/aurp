import { createContext, useCallback, useContext, useState } from "react";

interface MasterVolume {
  /** Current master volume, 0..100. */
  volume: number;
  /** Set the master volume (clamped + rounded). Stable identity. */
  setVolume: (v: number) => void;
  /** Which input last set the volume, for the global readout. */
  source: string;
  setSource: (s: string) => void;
}

const Ctx = createContext<MasterVolume | null>(null);

export function VolumeProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(50);
  const [source, setSource] = useState("default");

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(100, Math.round(v))));
  }, []);

  return <Ctx.Provider value={{ volume, setVolume, source, setSource }}>{children}</Ctx.Provider>;
}

export function useMasterVolume(): MasterVolume {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMasterVolume must be used within a VolumeProvider");
  return c;
}
