import { Box, Typography, useTheme, alpha } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";

const BILLS = [1, 5, 10, 20, 100];
const COINS = [0.01, 0.05, 0.10, 0.25];

export function ValCurrencyV1() {
    const theme = useTheme();
    const [total, setTotal] = useState(0);
    const [flyingItems, setFlyingItems] = useState<{ id: string, amount: number, x: number, y: number }[]>([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = (amount: number, info: PanInfo) => {
        if (!dropZoneRef.current) return;
        const rect = dropZoneRef.current.getBoundingClientRect();
        const { x, y } = info.point;

        // info.point is relative to the document/page, but getBoundingClientRect is relative to the viewport.
        // We add window.scrollX/scrollY to convert the dimensions into page coordinates.
        const top = rect.top + window.scrollY;
        const bottom = rect.bottom + window.scrollY;
        const left = rect.left + window.scrollX;
        const right = rect.right + window.scrollX;

        // Check if dropped within the piggy bank's bounding box
        if (x >= left && x <= right && y >= top && y <= bottom) {
            setTotal(prev => prev + amount);
            const id = Math.random().toString(36).substring(7);
            setFlyingItems(prev => [...prev, { id, amount, x, y }]);

            // Clean up the flying animation after it completes
            setTimeout(() => {
                setFlyingItems(prev => prev.filter(item => item.id !== id));
            }, 1000);
        }
        setIsDraggingOver(false);
    };

    const handleDrag = (_: any, info: PanInfo) => {
        if (!dropZoneRef.current) return;
        const rect = dropZoneRef.current.getBoundingClientRect();
        const { x, y } = info.point;

        // Align coordinates via scroll offsets
        const top = rect.top + window.scrollY;
        const bottom = rect.bottom + window.scrollY;
        const left = rect.left + window.scrollX;
        const right = rect.right + window.scrollX;

        // Add hover effect while dragging over the drop zone
        if (x >= left && x <= right && y >= top && y <= bottom) {
            setIsDraggingOver(true);
        } else {
            setIsDraggingOver(false);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%", maxWidth: 600, mx: "auto", position: "relative" }}>
            {/* Digital Display */}
            <Box sx={{
                width: "100%",
                p: 3,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: "blur(12px)",
                borderRadius: 4,
                boxShadow: `inset 0 4px 20px ${alpha("#000", 0.5)}, 0 4px 15px ${alpha(theme.palette.primary.main, 0.2)}`,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                textAlign: "right",
                fontFamily: "'Courier New', Courier, monospace",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Screen glare effect */}
                <Box sx={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, height: "50%",
                    background: `linear-gradient(to bottom, ${alpha("#fff", 0.1)}, transparent)`,
                    pointerEvents: "none"
                }} />
                <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: "bold", letterSpacing: 2, zIndex: 1, position: "relative" }}>Current Balance</Typography>
                <Typography variant="h2" sx={{
                    fontFamily: "'Courier New', Courier, monospace",
                    fontWeight: 900,
                    color: theme.palette.success.main,
                    textShadow: `0 0 15px ${alpha(theme.palette.success.main, 0.6)}, 0 0 5px ${alpha(theme.palette.success.main, 0.8)}`,
                    zIndex: 1, position: "relative"
                }}>
                    ${total.toFixed(2)}
                </Typography>
            </Box>

            {/* Drop Zone (Piggy Bank) */}
            <Box
                ref={dropZoneRef}
                className={isDraggingOver ? 'is-drag-over' : ''}
                sx={{
                    width: 250,
                    height: 200,
                    borderRadius: "40% 60% 60% 40% / 50% 50% 50% 50%", // Piggy bean shape
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.dark, 0.4) : alpha(theme.palette.secondary.light, 0.5),
                    border: `6px solid ${theme.palette.secondary.main}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    boxShadow: `inset -20px -20px 40px ${alpha("#000", 0.2)}, 0 15px 35px ${alpha(theme.palette.secondary.main, 0.3)}`,
                    // Initial non-hover interaction styling so it still pops slightly
                    transform: "scale(1)",
                    '&.is-drag-over': { // Simulated state when dragging over
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.dark, 0.7) : alpha(theme.palette.secondary.light, 0.8),
                        transform: "scale(1.1) rotate(-3deg)",
                        boxShadow: `inset -20px -20px 40px ${alpha("#000", 0.2)}, 0 35px 55px ${alpha(theme.palette.secondary.main, 0.6)}, 0 0 40px ${alpha(theme.palette.success.main, 0.4)}`,
                        borderColor: theme.palette.success.main,
                        borderWidth: "8px"
                    },
                    '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.dark, 0.6) : alpha(theme.palette.secondary.light, 0.7),
                        transform: "scale(1.05) rotate(-2deg)",
                        boxShadow: `inset -20px -20px 40px ${alpha("#000", 0.2)}, 0 25px 45px ${alpha(theme.palette.secondary.main, 0.4)}`,
                    },
                    '&::before': { // Coin Slot
                        content: '""',
                        position: 'absolute',
                        top: 20,
                        width: 80,
                        height: 10,
                        bgcolor: alpha("#000", 0.5),
                        borderRadius: 10,
                        boxShadow: `inset 0 3px 6px ${alpha("#000", 0.8)}`,
                        transition: "all 0.2s ease",
                    },
                    '&.is-drag-over::before': { // Make coin slot larger and glow when hovered
                        transform: "scale(1.2)",
                        bgcolor: alpha(theme.palette.success.main, 0.5),
                        boxShadow: `inset 0 0 10px ${alpha(theme.palette.success.main, 0.8)}, 0 0 15px ${alpha(theme.palette.success.main, 0.5)}`
                    },
                    '&::after': { // Piggy Ear
                        content: '""',
                        position: 'absolute',
                        top: -20,
                        left: 40,
                        width: 40,
                        height: 50,
                        bgcolor: theme.palette.secondary.main,
                        borderRadius: "50% 50% 0 0",
                        transform: "rotate(-20deg)",
                        zIndex: 1 // Changed to be visible!
                    }
                }}
            >
                {/* Piggy Snout */}
                <Box sx={{
                    position: "absolute",
                    right: -20,
                    width: 60,
                    height: 80,
                    bgcolor: theme.palette.secondary.main,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    boxShadow: `inset -5px -5px 10px ${alpha("#000", 0.1)}`,
                }}>
                    <Box sx={{ width: 12, height: 25, bgcolor: alpha("#000", 0.3), borderRadius: "50%" }} />
                    <Box sx={{ width: 12, height: 25, bgcolor: alpha("#000", 0.3), borderRadius: "50%" }} />
                </Box>
                {/* Piggy Eye */}
                <Box sx={{
                    position: "absolute",
                    right: 60,
                    top: 50,
                    width: 20,
                    height: 20,
                    bgcolor: "#000",
                    borderRadius: "50%",
                    transition: "all 0.2s ease"
                }} className="piggy-eye">
                    <Box sx={{ position: "absolute", top: 3, right: 3, width: 8, height: 8, bgcolor: "#fff", borderRadius: "50%" }} />
                </Box>

                {/* Piggy Tail */}
                <Box sx={{
                    position: "absolute",
                    left: -30,
                    width: 40,
                    height: 40,
                    border: `6px solid ${theme.palette.secondary.main}`,
                    borderRadius: "50%",
                    borderTopColor: "transparent",
                    borderLeftColor: "transparent",
                    transform: "rotate(45deg)",
                    zIndex: -1 // Tail can stay behind
                }} />

                {/* Piggy Legs */}
                <Box sx={{ position: "absolute", bottom: -20, left: 40, width: 30, height: 40, bgcolor: theme.palette.secondary.main, borderRadius: "0 0 10px 10px", zIndex: 1 }} />
                <Box sx={{ position: "absolute", bottom: -20, right: 60, width: 30, height: 40, bgcolor: theme.palette.secondary.main, borderRadius: "0 0 10px 10px", zIndex: 1 }} />
            </Box>

            {/* Wallet Source */}
            <Box sx={{
                width: "100%",
                p: 4,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: "blur(10px)",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 8px 32px ${alpha("#000", 0.1)}`
            }}>
                <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 3, textAlign: "center", fontWeight: "bold", letterSpacing: 2 }}>
                    The Wallet (Drag funds into the bank)
                </Typography>

                {/* Bills */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", mb: 4 }}>
                    {BILLS.map(bill => (
                        <motion.div
                            key={`bill-${bill}`}
                            drag
                            dragSnapToOrigin
                            onDrag={handleDrag}
                            onDragEnd={(_, info) => handleDragEnd(bill, info)}
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            whileDrag={{ scale: 1.1, zIndex: 100, rotate: 5 }}
                            style={{ cursor: "grab" }}
                        >
                            <Box sx={{
                                width: 90, height: 45,
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                border: `2px solid ${alpha(theme.palette.success.main, 0.5)}`,
                                borderRadius: 1.5,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "success.main", fontWeight: "bold", fontSize: "1.1rem",
                                boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.2)}`,
                                userSelect: "none"
                            }}>${bill}</Box>
                        </motion.div>
                    ))}
                </Box>

                {/* Coins */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                    {COINS.map(coin => (
                        <motion.div
                            key={`coin-${coin}`}
                            drag
                            dragSnapToOrigin
                            onDrag={handleDrag}
                            onDragEnd={(_, info) => handleDragEnd(coin, info)}
                            whileHover={{ scale: 1.1, y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            whileDrag={{ scale: 1.2, zIndex: 100 }}
                            style={{ cursor: "grab" }}
                        >
                            <Box sx={{
                                width: 55, height: 55,
                                borderRadius: "50%",
                                bgcolor: alpha(theme.palette.warning.main, 0.15),
                                border: `2px solid ${alpha(theme.palette.warning.main, 0.6)}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "warning.main", fontWeight: "bold", fontSize: "0.95rem",
                                boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.2)}`,
                                userSelect: "none"
                            }}>{coin < 1 ? `${Math.round(coin * 100)}¢` : `$${coin}`}</Box>
                        </motion.div>
                    ))}
                </Box>
            </Box>

            {/* Flying Total Animations */}
            <AnimatePresence>
                {flyingItems.map(item => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 1, x: item.x - 40, y: item.y - 40, scale: 0.5 }}
                        animate={{ opacity: 0, y: item.y - 150, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            pointerEvents: "none",
                            zIndex: 9999,
                            color: theme.palette.success.main,
                            fontWeight: 900,
                            fontSize: "2rem",
                            textShadow: `0 2px 15px ${alpha(theme.palette.background.default, 0.9)}`
                        }}
                    >
                        +${item.amount.toFixed(2)}
                    </motion.div>
                ))}
            </AnimatePresence>
        </Box>
    );
}

export function ValCurrencyV2() {
    const theme = useTheme();
    const [piggyPos, setPiggyPos] = useState({ x: 1, y: 1 }); // Start at '5'
    const [inputValue, setInputValue] = useState("");
    const [animationState, setAnimationState] = useState<"idle" | "moving" | "pressing">("idle");
    const [pressedKey, setPressedKey] = useState<{ x: number, y: number } | null>(null);

    const gridKeys = [
        ['7', '8', '9'],
        ['4', '5', '6'],
        ['1', '2', '3'],
        ['C', '0', '.']
    ];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (animationState === "pressing") return;

            let newX = piggyPos.x;
            let newY = piggyPos.y;

            switch (e.key) {
                case 'ArrowUp':
                    newY = Math.max(0, newY - 1);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    newY = Math.min(3, newY + 1);
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    newX = Math.max(0, newX - 1);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    newX = Math.min(2, newX + 1);
                    e.preventDefault();
                    break;
                case ' ':
                    e.preventDefault();
                    handlePress(piggyPos.x, piggyPos.y);
                    return;
                default:
                    return;
            }

            if (newX !== piggyPos.x || newY !== piggyPos.y) {
                setPiggyPos({ x: newX, y: newY });
                setAnimationState("moving");
                setTimeout(() => setAnimationState("idle"), 200);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [piggyPos, animationState]);

    const handlePress = (x: number, y: number) => {
        setAnimationState("pressing");
        const keyVal = gridKeys[y]?.[x];
        if (!keyVal) return;

        // Piggy lands halfway through the 300ms animation
        setTimeout(() => {
            setPressedKey({ x, y });
            if (keyVal === 'C') {
                setInputValue("");
            } else {
                setInputValue(prev => {
                    if (keyVal === '.' && prev.includes('.')) return prev;
                    if (prev.length >= 10) return prev;
                    // Don't start with multiple zeros
                    if (prev === "0" && keyVal !== ".") return keyVal;
                    return prev + keyVal;
                });
            }
        }, 150);

        setTimeout(() => {
            setPressedKey(null);
            setAnimationState("idle");
        }, 350); // slight buffer for reset
    };

    // Key sizing for the grid and piggy positioning
    const keyWidth = 80;
    const keyHeight = 70;
    const gap = 16;
    const offsetX = keyWidth + gap;
    const offsetY = keyHeight + gap;

    return (
        <Box sx={{
            display: "flex", flexDirection: "column", alignItems: "center",
            width: "100%", maxWidth: 600, mx: "auto", position: "relative",
            perspective: "1000px" // For 3D effect
        }}>
            {/* Instructions */}
            <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 4, textAlign: "center", fontWeight: "bold", letterSpacing: 2 }}>
                Use Arrow Keys to move • Spacebar to press
            </Typography>

            {/* The Calculator Body */}
            <Box sx={{
                width: 320,
                p: 3,
                bgcolor: theme.palette.mode === 'dark' ? "#2a2a2a" : "#e0e0e0",
                borderRadius: 4,
                boxShadow: `
                    0 20px 40px ${alpha("#000", 0.4)}, 
                    inset 0 5px 10px ${alpha("#fff", 0.1)},
                    inset 0 -5px 15px ${alpha("#000", 0.2)}
                `,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                transform: "rotateX(15deg) rotateY(0deg)",
                transformStyle: "preserve-3d",
                transition: "transform 0.3s ease",
            }}>
                {/* The LCD Display */}
                <Box sx={{
                    width: "100%",
                    height: 80,
                    mb: 3,
                    bgcolor: "#9db88b", // Retro green LCD
                    borderRadius: 2,
                    boxShadow: `
                        inset 0 4px 10px ${alpha("#000", 0.4)}, 
                        0 2px 5px ${alpha("#fff", 0.1)}
                    `,
                    border: `4px solid ${alpha("#000", 0.8)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    p: 2,
                    position: "relative",
                    overflow: "hidden"
                }}>
                    {/* LCD Grid lines overlay */}
                    <Box sx={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `linear-gradient(${alpha("#000", 0.05)} 1px, transparent 1px), linear-gradient(90deg, ${alpha("#000", 0.05)} 1px, transparent 1px)`,
                        backgroundSize: "4px 4px",
                        pointerEvents: "none"
                    }} />

                    <Typography sx={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontWeight: 900,
                        fontSize: "2.5rem",
                        color: "#1a2b16", // Dark green text
                        textShadow: `0 0 5px ${alpha("#1a2b16", 0.3)}`,
                        zIndex: 1,
                        display: "flex",
                        alignItems: "baseline",
                        gap: 1
                    }}>
                        <span style={{ fontSize: "1.5rem", opacity: 0.8 }}>$</span>
                        {inputValue || "0"}
                    </Typography>
                </Box>

                {/* The Keys Grid Area */}
                <Box sx={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: `repeat(3, ${keyWidth}px)`,
                    gridTemplateRows: `repeat(4, ${keyHeight}px)`,
                    gap: `${gap}px`,
                    justifyContent: "center",
                    transformStyle: "preserve-3d",
                }}>
                    {/* Keys mapped out */}
                    {gridKeys.map((row, yIndex) =>
                        row.map((key, xIndex) => {
                            const isPressed = pressedKey?.x === xIndex && pressedKey?.y === yIndex;
                            return (
                                <Box
                                    key={`${xIndex}-${yIndex}`}
                                    sx={{
                                        width: keyWidth,
                                        height: keyHeight,
                                        bgcolor: key === 'C' ? theme.palette.error.main : (theme.palette.mode === 'dark' ? "#444" : "#f5f5f5"),
                                        borderRadius: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: key === 'C' ? "#fff" : "text.primary",
                                        typography: "h5",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        userSelect: "none",
                                        // 3D tactile chunky effect
                                        boxShadow: isPressed
                                            ? `0 2px 0 ${alpha("#000", 0.8)}, inset 0 4px 8px ${alpha("#000", 0.4)}`
                                            : `0 8px 0 ${alpha("#000", 0.8)}, 0 10px 15px ${alpha("#000", 0.4)}, inset 0 2px 5px ${alpha("#fff", theme.palette.mode === 'dark' ? 0.1 : 0.6)}`,
                                        transform: isPressed ? "translateY(6px)" : "translateY(0)",
                                        transition: "all 0.1s cubic-bezier(0.4, 0, 0.2, 1)",
                                    }}
                                    onClick={() => handlePress(xIndex, yIndex)} // Fallback for mouse users
                                >
                                    {key}
                                </Box>
                            );
                        })
                    )}

                    {/* The Piggy Character */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0, // Will align with row 0
                            left: 0, // Will align with col 0
                            width: keyWidth,
                            height: keyHeight,
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "flex-end", // Align Piggy to the bottom of the key space
                            justifyContent: "center",
                            zIndex: 10,
                            // Move Piggy to correct key cell
                            transform: `translate(${piggyPos.x * offsetX}px, ${piggyPos.y * offsetY}px)`,
                            transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)", // Springy hop
                        }}
                    >
                        {/* The animated Piggy Sprite Wrapper */}
                        <Box sx={{
                            width: 50,
                            height: 40,
                            position: "relative",
                            mb: 2, // Fixed margin so we rely only on transform for jumps
                            // Ground Pound Jump Animation
                            animation: animationState === "pressing"
                                ? "groundPound 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards"
                                : animationState === "moving"
                                    ? "hop 0.2s ease-in-out"
                                    : "idleBob 2s infinite ease-in-out",
                            '@keyframes groundPound': {
                                '0%': { transform: 'translateY(0) scale(1)' },
                                '40%': { transform: 'translateY(-40px) scale(1.1) rotate(5deg)' },
                                '80%': { transform: 'translateY(10px) scale(1.15, 0.8)' }, // Squish on impact
                                '100%': { transform: 'translateY(0) scale(1)' }
                            },
                            '@keyframes hop': {
                                '0%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-15px)' },
                                '100%': { transform: 'translateY(0)' }
                            },
                            '@keyframes idleBob': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-4px)' }
                            }
                        }}>
                            {/* Simple CSS Piggy Sprite */}
                            <Box sx={{
                                width: "100%", height: "100%",
                                bgcolor: theme.palette.secondary.main,
                                borderRadius: "40% 60% 60% 40% / 50% 50% 50% 50%",
                                position: "relative",
                                boxShadow: `inset -5px -5px 10px ${alpha("#000", 0.2)}, 0 5px 10px ${alpha("#000", 0.3)}`,
                                '&::after': { // Ear
                                    content: '""', position: 'absolute', top: -8, left: 10,
                                    width: 12, height: 16, bgcolor: theme.palette.secondary.main,
                                    borderRadius: "50% 50% 0 0", transform: "rotate(-20deg)"
                                }
                            }}>
                                {/* Snout */}
                                <Box sx={{
                                    position: "absolute", right: -5, top: "20%",
                                    width: 16, height: 24, bgcolor: theme.palette.secondary.main,
                                    borderRadius: "50%",
                                    boxShadow: `inset -2px -2px 4px ${alpha("#000", 0.1)}`,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5
                                }}>
                                    <Box sx={{ width: 3, height: 6, bgcolor: alpha("#000", 0.4), borderRadius: "50%" }} />
                                    <Box sx={{ width: 3, height: 6, bgcolor: alpha("#000", 0.4), borderRadius: "50%" }} />
                                </Box>
                                {/* Eye */}
                                <Box sx={{
                                    position: "absolute", right: 15, top: 12,
                                    width: 6, height: 6, bgcolor: "#000", borderRadius: "50%"
                                }}>
                                    {/* Blink animation */}
                                    <Box sx={{
                                        position: "absolute", top: 1, right: 1, width: 2, height: 2, bgcolor: "#fff", borderRadius: "50%",
                                        animation: "blink 4s infinite",
                                        '@keyframes blink': {
                                            '0%, 96%, 100%': { transform: 'scaleY(1)' },
                                            '98%': { transform: 'scaleY(0.1)' }
                                        }
                                    }} />
                                </Box>
                                {/* Legs */}
                                <Box sx={{ position: "absolute", bottom: -5, left: 10, width: 8, height: 10, bgcolor: theme.palette.secondary.dark, borderRadius: "0 0 4px 4px" }} />
                                <Box sx={{ position: "absolute", bottom: -5, right: 15, width: 8, height: 10, bgcolor: theme.palette.secondary.dark, borderRadius: "0 0 4px 4px" }} />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export function ValCurrencyV3() {
    const theme = useTheme();
    const [history, setHistory] = useState<number[]>(Array(50).fill(50));
    const [currentAmount, setCurrentAmount] = useState<number>(50);
    const [isLocked, setIsLocked] = useState(false);
    const [trend, setTrend] = useState<"up" | "down">("up");

    useEffect(() => {
        if (isLocked) return;

        const interval = setInterval(() => {
            setCurrentAmount(prev => {
                // Highly volatile random walk
                const volatility = Math.random() * 50; // Jump up to $50 at a time
                const direction = Math.random() > 0.5 ? 1 : -1;
                let nextValue = prev + (volatility * direction);

                // Keep it in bounds [0, 999.99]
                if (nextValue < 0) nextValue = Math.random() * 10;
                if (nextValue > 999.99) nextValue = 999.99 - (Math.random() * 50);

                setTrend(nextValue >= prev ? "up" : "down");

                setHistory(currHistory => {
                    return [...currHistory.slice(1), nextValue];
                });

                return nextValue;
            });
        }, 80); // Fast! 80ms

        return () => clearInterval(interval);
    }, [isLocked]);

    const handleLock = () => {
        setIsLocked(prev => !prev);
    };

    // Calculate chart SVG points
    const maxVal = Math.max(...history, 100);
    const minVal = Math.min(...history, 0);
    const range = maxVal - minVal || 1;

    // Scale points to 0-100 for SVG path
    const points = history.map((val, i) => {
        const x = (i / (history.length - 1)) * 100;
        const y = 100 - (((val - minVal) / range) * 100);
        return `${x},${y}`;
    }).join(" ");

    const glowColor = trend === "up" ? theme.palette.success.main : theme.palette.error.main;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: "100%", maxWidth: 600, mx: "auto", position: "relative" }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: "block", textAlign: "center", fontWeight: "bold", letterSpacing: 2 }}>
                Val Street: Time the market perfectly
            </Typography>

            {/* The Chart Container */}
            <Box sx={{
                width: "100%",
                height: 300,
                bgcolor: "#0a0a0a",
                borderRadius: 4,
                boxShadow: `0 15px 35px ${alpha("#000", 0.6)}, inset 0 0 40px ${alpha("#000", 0.9)}`,
                border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
            }}>
                {/* Grid Lines */}
                <Box sx={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: `
                        linear-gradient(${alpha("#fff", 0.05)} 1px, transparent 1px),
                        linear-gradient(90deg, ${alpha("#fff", 0.05)} 1px, transparent 1px)
                    `,
                    backgroundSize: "20px 20px",
                    pointerEvents: "none",
                    zIndex: 0
                }} />

                {/* Display Value Header */}
                <Box sx={{ position: "relative", zIndex: 2, p: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                        <Typography variant="body2" sx={{ color: alpha("#fff", 0.5), fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>
                            PAY/USD Live
                        </Typography>
                        <Typography variant="h2" sx={{
                            fontFamily: "monospace",
                            fontWeight: 900,
                            color: isLocked ? "#fff" : glowColor,
                            textShadow: `0 0 20px ${alpha(isLocked ? "#fff" : glowColor, 0.6)}`,
                            transition: "color 0.1s ease"
                        }}>
                            ${currentAmount.toFixed(2)}
                        </Typography>
                        <Typography variant="body1" sx={{
                            color: glowColor,
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5
                        }}>
                            {trend === "up" ? "▲" : "▼"} {((Math.random() * 5) + 0.1).toFixed(2)}%
                        </Typography>
                    </Box>

                    {isLocked && (
                        <Box sx={{
                            px: 2, py: 0.5,
                            bgcolor: alpha(theme.palette.success.main, 0.2),
                            border: `1px solid ${theme.palette.success.main}`,
                            color: theme.palette.success.main,
                            borderRadius: 1,
                            fontWeight: "bold",
                            boxShadow: `0 0 10px ${alpha(theme.palette.success.main, 0.4)}`
                        }}>
                            LOCKED IN
                        </Box>
                    )}
                </Box>

                {/* SVG Chart */}
                <Box sx={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "65%", zIndex: 1 }}>
                    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ display: 'block' }}>
                        <defs>
                            <linearGradient id={isLocked ? "chartGlowLocked" : "chartGlow"} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={alpha(isLocked ? "#fff" : glowColor, 0.5)} />
                                <stop offset="100%" stopColor={alpha(isLocked ? "#fff" : glowColor, 0.0)} />
                            </linearGradient>
                        </defs>
                        {/* Fill Area */}
                        <polygon
                            points={`0,100 ${points} 100,100`}
                            fill={isLocked ? "url(#chartGlowLocked)" : "url(#chartGlow)"}
                            style={{ transition: "fill 0.1s ease" }}
                        />
                        {/* Line */}
                        <polyline
                            points={points}
                            fill="none"
                            stroke={isLocked ? "#fff" : glowColor}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                filter: `drop-shadow(0 0 6px ${alpha(isLocked ? "#fff" : glowColor, 0.8)})`,
                                transition: "stroke 0.1s ease"
                            }}
                        />
                    </svg>
                </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ width: "100%", display: "flex", gap: 2 }}>
                <motion.div
                    whileHover={!isLocked ? { scale: 1.02 } : {}}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                    style={{ flex: 1 }}
                >
                    <Box
                        onClick={!isLocked ? handleLock : undefined}
                        sx={{
                            width: "100%",
                            py: 3,
                            bgcolor: isLocked ? alpha(theme.palette.action.disabledBackground, 0.2) : theme.palette.error.main,
                            color: isLocked ? alpha(theme.palette.text.primary, 0.5) : "#fff",
                            borderRadius: 3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: isLocked ? "default" : "pointer",
                            fontWeight: 900,
                            fontSize: "1.5rem",
                            letterSpacing: 2,
                            boxShadow: isLocked
                                ? "none"
                                : `0 10px 30px ${alpha(theme.palette.error.main, 0.4)}, inset 0 2px 10px ${alpha("#fff", 0.4)}`,
                            border: isLocked ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : "none",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            userSelect: "none",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        {/* Pulse effect when active */}
                        {!isLocked && (
                            <Box sx={{
                                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                                borderRadius: 3,
                                boxShadow: `0 0 20px ${theme.palette.error.main}`,
                                animation: "pulse 1.5s infinite",
                                '@keyframes pulse': {
                                    '0%': { opacity: 0.5, transform: 'scale(1)' },
                                    '50%': { opacity: 0, transform: 'scale(1.05)' },
                                    '100%': { opacity: 0.5, transform: 'scale(1)' }
                                }
                            }} />
                        )}
                        {isLocked ? "FUNDS SECURED" : "LOCK IN AMOUNT"}
                    </Box>
                </motion.div>

                <AnimatePresence>
                    {isLocked && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, width: 0 }}
                            animate={{ opacity: 1, scale: 1, width: "140px" }}
                            exit={{ opacity: 0, scale: 0.8, width: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Box
                                onClick={handleLock}
                                sx={{
                                    width: "100%",
                                    height: "100%",
                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                    border: `2px solid ${theme.palette.warning.main}`,
                                    color: theme.palette.warning.main,
                                    borderRadius: 3,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    boxShadow: `0 4px 15px ${alpha(theme.palette.warning.main, 0.2)}`
                                }}
                            >
                                <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>PANIC</Typography>
                                RE-ROLL
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Box>
    );
}
