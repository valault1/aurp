import { Box } from "@mui/material";
import { VolumeProvider } from "./VolumeContext";
import { GlobalVolumePanel } from "./GlobalVolumePanel";
import {
  BryceVolumeInputV1,
  BryceVolumeInputV2,
  BryceVolumeInputV3,
  BryceVolumeInputV4,
  BryceVolumeInputV5,
} from "./BryceVolumeInput";

/**
 * Bryce's whole volume-input area. Owns the master-volume provider and the
 * persistent global panel (player + universal readout) so that layer lives
 * ONLY on Bryce's tab and never bleeds into Val's. The panel sits outside the
 * iteration swap, so flipping v1–v6 doesn't remount the YouTube player.
 */
export function BryceVolumeArea({ iteration }: { iteration: string }) {
  return (
    <VolumeProvider>
      <GlobalVolumePanel />
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        {iteration === "v1" && <BryceVolumeInputV1 />}
        {iteration === "v2" && <BryceVolumeInputV2 />}
        {iteration === "v3" && <BryceVolumeInputV3 />}
        {iteration === "v4" && <BryceVolumeInputV4 />}
        {iteration === "v5" && <BryceVolumeInputV5 />}
      </Box>
    </VolumeProvider>
  );
}
