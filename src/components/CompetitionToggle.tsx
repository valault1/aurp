import { Box, Typography, useTheme, alpha } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

export type Competitor = {
    id: string;
    name: string;
    iterations: string[];
};

interface CompetitionToggleProps {
    competitors: Competitor[];
    activeCompetitorId: string;
    activeIterationId: string;
    onChange: (competitorId: string, iterationId: string) => void;
}

export function CompetitionToggle({
    competitors,
    activeCompetitorId,
    activeIterationId,
    onChange,
}: CompetitionToggleProps) {
    const theme = useTheme();
    const activeCompetitor = competitors.find((c) => c.id === activeCompetitorId) || competitors[0];

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                p: 1,
                mb: 4,
                borderRadius: "100px",
                background: alpha(theme.palette.text.primary, 0.03),
                backdropFilter: "blur(12px)",
                border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
            }}
        >
            {/* Competitor Toggle (Left Side) */}
            <Box sx={{ display: "flex", position: "relative", gap: 1 }}>
                {competitors.map((competitor) => {
                    const isActive = activeCompetitorId === competitor.id;
                    return (
                        <Box
                            key={competitor.id}
                            onClick={() => onChange(competitor.id, competitor.iterations?.[0] || "")}
                            sx={{
                                position: "relative",
                                px: 4,
                                py: 1.5,
                                borderRadius: "100px",
                                cursor: "pointer",
                                zIndex: 1,
                                transition: "all 0.3s ease",
                                color: isActive ? "text.primary" : alpha(theme.palette.text.primary, 0.4),
                                "&:hover": {
                                    color: "text.primary",
                                }
                            }}
                        >
                            <Typography variant="body1" fontWeight={700} sx={{ position: "relative", zIndex: 2 }}>
                                {competitor.name}
                            </Typography>

                            {isActive && (
                                <motion.div
                                    layoutId="activeCompetitorUnderline"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    style={{
                                        position: "absolute",
                                        bottom: "4px",
                                        left: "25%",
                                        right: "25%",
                                        height: "2px",
                                        borderRadius: "2px",
                                        background: theme.palette.primary.main,
                                        boxShadow: `0 0 10px ${theme.palette.primary.main}`,
                                        zIndex: 1,
                                    }}
                                />
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* Iteration Selector (Right Side) */}
            {(activeCompetitor?.iterations.length ?? 0) > 1 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, mr: 1 }}>
                        Iterations
                    </Typography>

                    <AnimatePresence mode="popLayout">
                        {activeCompetitor?.iterations.map((iteration) => {
                            const isIterActive = activeIterationId === iteration;
                            return (
                                <motion.div
                                    key={`${activeCompetitor.id}-${iteration}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Box
                                        onClick={() => onChange(activeCompetitorId, iteration)}
                                        sx={{
                                            position: "relative",
                                            px: 2,
                                            py: 1,
                                            borderRadius: "100px",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            color: isIterActive ? "text.primary" : "text.secondary",
                                            "&:hover": {
                                                color: "text.primary",
                                                background: alpha(theme.palette.text.primary, 0.05),
                                            },
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={isIterActive ? 700 : 500} sx={{ position: "relative", zIndex: 2 }}>
                                            {iteration}
                                        </Typography>

                                        {isIterActive && (
                                            <motion.div
                                                layoutId="activeIterationUnderline"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                style={{
                                                    position: "absolute",
                                                    bottom: "2px",
                                                    left: "20%",
                                                    right: "20%",
                                                    height: "2px",
                                                    borderRadius: "2px",
                                                    background: theme.palette.primary.main,
                                                    boxShadow: `0 0 8px ${theme.palette.primary.main}`,
                                                    zIndex: 1,
                                                }}
                                            />
                                        )}
                                    </Box>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </Box>
            )}
        </Box>
    );
}
