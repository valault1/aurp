import { Box, Typography, useTheme, alpha } from "@mui/material";
import { motion } from "framer-motion";

/** Glassy panel wrapper shared by every Bryce volume input. */
export function GamePanel({
  title,
  subtitle,
  children,
  width = 460,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  width?: number;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: width,
        mx: "auto",
        p: { xs: 3, md: 4 },
        borderRadius: 4,
        bgcolor: "background.paper",
        backdropFilter: "blur(12px)",
        border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
        boxShadow: `0 12px 48px ${alpha("#000", 0.35)}`,
      }}
    >
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        {subtitle}
      </Typography>
      {children}
    </Box>
  );
}

/** Big animated readout of the currently-committed volume value. */
export function CommittedValue({ value, locked }: { value: number | null; locked: boolean }) {
  const theme = useTheme();
  const color = locked ? theme.palette.success.main : theme.palette.primary.main;
  return (
    <Box
      sx={{
        mt: 3,
        py: 2,
        borderRadius: 3,
        textAlign: "center",
        border: `1px solid ${alpha(color, 0.4)}`,
        background: alpha(color, 0.08),
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 2 }}
      >
        {locked ? "Volume Locked" : "Volume"}
      </Typography>
      <motion.div
        key={value == null ? "none" : Math.round(value)}
        initial={{ scale: 0.85, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 24 }}
      >
        <Typography sx={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color }}>
          {value == null ? "—" : Math.round(value)}
        </Typography>
      </motion.div>
    </Box>
  );
}

/** Maps a 0..100 volume to a traffic-light status color (quiet→loud). */
export function levelColor(v: number) {
  if (v < 40) return "#4ade80";
  if (v < 75) return "#fbbf24";
  return "#f87171";
}
