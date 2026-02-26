import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Box, Typography, Button } from "@mui/material";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type LetterInfo = {
    id: string;
    char: string;
};

// Initial state: a-z
const INITIAL_LETTERS: LetterInfo[] = Array.from({ length: 26 }, (_, i) => ({
    id: `letter-${String.fromCharCode(97 + i)}`,
    char: String.fromCharCode(97 + i),
}));

export function Rearranger() {
    const [topLetters, setTopLetters] = useState<LetterInfo[]>([]);
    const [bottomLetters, setBottomLetters] = useState<LetterInfo[]>(INITIAL_LETTERS);
    const [targetLetter, setTargetLetter] = useState<LetterInfo[]>([]);
    const [sacrificeLetter, setSacrificeLetter] = useState<LetterInfo[]>([]);
    const [macrodataLetter, setMacrodataLetter] = useState<LetterInfo[]>([]);
    const [macrodataResultLetter, setMacrodataResultLetter] = useState<LetterInfo[]>([]);
    const [conversionResultLetter, setConversionResultLetter] = useState<LetterInfo[]>([]);
    const [conversionStatus, setConversionStatus] = useState<"idle" | "success" | "destroyed" | "random">("idle");
    const [capitalizerLetter, setCapitalizerLetter] = useState<LetterInfo[]>([]);
    const [capitalizerResultLetter, setCapitalizerResultLetter] = useState<LetterInfo[]>([]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) return;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Prevent dropping more than 1 item in target or sacrifice zones
        if (source.droppableId !== destination.droppableId) {
            if (destination.droppableId === "target-zone" && targetLetter.length >= 1) return;
            if (destination.droppableId === "sacrifice-zone" && sacrificeLetter.length >= 1) return;
            if (destination.droppableId === "conversion-result" && conversionResultLetter.length >= 1) return;
            if (destination.droppableId === "macrodata-result" && macrodataResultLetter.length >= 1) return;
            if (destination.droppableId === "capitalizer-zone" && capitalizerLetter.length >= 1) return;
            if (destination.droppableId === "capitalizer-result" && capitalizerResultLetter.length >= 1) return;
        }

        const getList = (id: string) => {
            if (id === "top-zone") return Array.from(topLetters);
            if (id === "bottom-zone") return Array.from(bottomLetters);
            if (id === "target-zone") return Array.from(targetLetter);
            if (id === "sacrifice-zone") return Array.from(sacrificeLetter);
            if (id === "macrodata-zone") return Array.from(macrodataLetter);
            if (id === "conversion-result") return Array.from(conversionResultLetter);
            if (id === "macrodata-result") return Array.from(macrodataResultLetter);
            if (id === "capitalizer-zone") return Array.from(capitalizerLetter);
            if (id === "capitalizer-result") return Array.from(capitalizerResultLetter);
            return [];
        };

        const setList = (id: string, list: LetterInfo[]) => {
            if (id === "top-zone") setTopLetters(list);
            if (id === "bottom-zone") setBottomLetters(list);
            if (id === "target-zone") setTargetLetter(list);
            if (id === "sacrifice-zone") setSacrificeLetter(list);
            if (id === "macrodata-zone") setMacrodataLetter(list);
            if (id === "conversion-result") setConversionResultLetter(list);
            if (id === "macrodata-result") setMacrodataResultLetter(list);
            if (id === "capitalizer-zone") setCapitalizerLetter(list);
            if (id === "capitalizer-result") setCapitalizerResultLetter(list);
        };

        if (source.droppableId === destination.droppableId) {
            const list = getList(source.droppableId);
            const removed = list.splice(source.index, 1)[0];
            if (removed) {
                list.splice(destination.index, 0, removed);
            }
            setList(source.droppableId, list);
        } else {
            const sourceList = getList(source.droppableId);
            const destList = getList(destination.droppableId);
            const removed = sourceList.splice(source.index, 1)[0];
            if (removed) {
                destList.splice(destination.index, 0, removed);
            }
            setList(source.droppableId, sourceList);
            setList(destination.droppableId, destList);
        }
    };

    const handleConvert = () => {
        if (targetLetter.length === 0 || sacrificeLetter.length === 0) return;

        const target = targetLetter[0];
        const sacrifice = sacrificeLetter[0];
        if (!target || !sacrifice) return;

        const rand = Math.random();

        let resultSacrifice: LetterInfo | null = null;
        if (rand < 0.4) {
            // 40% Destroyed, result is null
            setConversionStatus("destroyed");
        } else if (rand < 0.7) {
            // 30% Convert to target
            resultSacrifice = { id: `letter-${Date.now()}`, char: target.char };
            setConversionStatus("success");
        } else {
            // 30% Convert to random
            const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            resultSacrifice = { id: `letter-${Date.now()}`, char: randomChar };
            setConversionStatus("random");
        }

        const newBottom = [...bottomLetters, target];
        setBottomLetters(newBottom);

        if (resultSacrifice) {
            setConversionResultLetter([resultSacrifice]);
        } else {
            setConversionResultLetter([]);
        }

        setTargetLetter([]);
        setSacrificeLetter([]);
    };

    const handleMacrodataCreate = () => {
        if (macrodataLetter.length === 0) return;

        const count = macrodataLetter.length;
        // Limit digit to 0-9 by taking modulo 10 if necessary, but visually count works best
        const digitStr = Math.min(count, 9).toString();
        const newNumberLetter: LetterInfo = { id: `number-${Date.now()}`, char: digitStr };

        setBottomLetters([...bottomLetters, ...macrodataLetter]);
        setMacrodataResultLetter([newNumberLetter]);
        setMacrodataLetter([]);
    };

    const handleCapitalize = () => {
        if (capitalizerLetter.length === 0) return;
        const letter = capitalizerLetter[0];
        if (!letter) return;

        let newChar = letter.char;
        if (/[a-z]/.test(letter.char)) {
            newChar = letter.char.toUpperCase();
        } else {
            const shiftMap: Record<string, string> = {
                "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
                "6": "^", "7": "&", "8": "*", "9": "(", "0": ")"
            };
            newChar = shiftMap[letter.char] || letter.char;
        }

        const newResult: LetterInfo = { id: `capitalized-${Date.now()}`, char: newChar };
        setCapitalizerResultLetter([newResult]);
        setCapitalizerLetter([]);
    };

    const DroppableZone = ({ id, letters, title, placeholderText, sx = {} }: any) => (
        <Box sx={sx}>
            <Typography variant="subtitle2" gutterBottom>
                {title}
            </Typography>
            <Droppable droppableId={id} direction="horizontal">
                {(provided, snapshot) => (
                    <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: (id === "target-zone" || id === "sacrifice-zone" || id === "macrodata-zone") ? "center" : "flex-start",
                            alignItems: (id === "target-zone" || id === "sacrifice-zone" || id === "macrodata-zone") ? "center" : "flex-start",
                            minHeight: 80,
                            p: 2,
                            border: "2px dashed",
                            borderColor: snapshot.isDraggingOver ? "primary.main" : "divider",
                            borderRadius: 2,
                            backgroundColor: snapshot.isDraggingOver ? "action.hover" : "background.paper",
                            transition: "all 0.2s ease",
                            gap: 1,
                        }}
                    >
                        {letters.length === 0 && !snapshot.isDraggingOver && placeholderText && (
                            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", width: "100%", textAlign: "center" }}>
                                {placeholderText}
                            </Typography>
                        )}
                        {letters.map((item: LetterInfo, index: number) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided, snapshot) => (
                                    <Box
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: "primary.main",
                                            color: "primary.contrastText",
                                            borderRadius: 1,
                                            fontWeight: "bold",
                                            userSelect: "none",
                                            boxShadow: snapshot.isDragging ? 4 : 1,
                                            ...provided.draggableProps.style,
                                        }}
                                    >
                                        {item.char}
                                    </Box>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </Box>
                )}
            </Droppable>
        </Box>
    );

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 4 }}>
            <Typography variant="h6">Rearranger Input Method</Typography>
            <DragDropContext onDragEnd={onDragEnd}>
                <DroppableZone id="top-zone" letters={topLetters} title="Your Input:" placeholderText="Drag letters here to form your text" />

                <Box>
                    <Typography variant="subtitle1" gutterBottom>
                        Available Letters:
                    </Typography>
                    <Droppable droppableId="bottom-zone" direction="horizontal">
                        {(provided, snapshot) => (
                            <Box
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    minHeight: 120,
                                    p: 2,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 2,
                                    backgroundColor: snapshot.isDraggingOver ? "action.hover" : "background.default",
                                    transition: "all 0.2s ease",
                                    gap: 1,
                                }}
                            >
                                {bottomLetters.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided, snapshot) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    backgroundColor: "background.paper",
                                                    color: "text.primary",
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    borderRadius: 1,
                                                    fontWeight: "bold",
                                                    userSelect: "none",
                                                    boxShadow: snapshot.isDragging ? 4 : 1,
                                                    ...provided.draggableProps.style,
                                                }}
                                            >
                                                {item.char}
                                            </Box>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </Box>
                        )}
                    </Droppable>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                    <Box sx={{ flex: "1 1 300px", p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "background.default" }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ textAlign: "center", fontWeight: "bold" }}>
                            Conversion Machine
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 2 }}>
                            Drag a target letter and a sacrifice letter to convert.
                            <br />
                            40% chance sacrifice is destroyed | 30% chance sacrifice becomes target | 30% chance sacrifice becomes random
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "row", gap: 3, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                            <DroppableZone id="target-zone" letters={targetLetter} title="Target Letter" placeholderText="Want" sx={{ width: 140 }} />
                            <DroppableZone id="sacrifice-zone" letters={sacrificeLetter} title="Sacrifice Letter" placeholderText="Give" sx={{ width: 140 }} />
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 60 }}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleConvert}
                                    disabled={targetLetter.length === 0 || sacrificeLetter.length === 0}
                                    sx={{ alignSelf: "center", height: 50, mt: 2 }}
                                >
                                    Convert
                                </Button>
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                                    {conversionStatus === "success" && <CheckCircle color="green" size={32} />}
                                    {conversionStatus === "destroyed" && <XCircle color="red" size={32} />}
                                    {conversionStatus === "random" && <AlertTriangle color="orange" size={32} />}
                                </Box>
                            </Box>
                            <DroppableZone id="conversion-result" letters={conversionResultLetter} title="Result" placeholderText="Collect output" sx={{ width: 140 }} />
                        </Box>
                    </Box>

                    <Box sx={{ flex: "1 1 300px", p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "background.default" }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ textAlign: "center", fontWeight: "bold" }}>
                            Macrodata Refinement
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 2 }}>
                            Drag any number of tiles here and click create to get a number tile matching the count.
                            Max 9.
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "row", gap: 3, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                            <DroppableZone id="macrodata-zone" letters={macrodataLetter} title="Refinement Input" placeholderText="Drop items to count" sx={{ width: 240 }} />
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleMacrodataCreate}
                                disabled={macrodataLetter.length === 0}
                                sx={{ alignSelf: "center", height: 50 }}
                            >
                                Create ({Math.min(macrodataLetter.length, 9)})
                            </Button>
                            <DroppableZone id="macrodata-result" letters={macrodataResultLetter} title="Result" placeholderText="Collect output" sx={{ width: 140 }} />
                        </Box>
                    </Box>

                    <Box sx={{ flex: "1 1 300px", p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, backgroundColor: "background.default" }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ textAlign: "center", fontWeight: "bold" }}>
                            Capitalizer Machine
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 2 }}>
                            Drop a lowercase letter or number here to capitalize it (e.g., a → A, 2 → @).
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "row", gap: 3, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                            <DroppableZone id="capitalizer-zone" letters={capitalizerLetter} title="Capitalizer Input" placeholderText="Drop tile here" sx={{ width: 140 }} />
                            <Button
                                variant="contained"
                                color="info"
                                onClick={handleCapitalize}
                                disabled={capitalizerLetter.length === 0}
                                sx={{ alignSelf: "center", height: 50 }}
                            >
                                Capitalize
                            </Button>
                            <DroppableZone id="capitalizer-result" letters={capitalizerResultLetter} title="Result" placeholderText="Collect output" sx={{ width: 140 }} />
                        </Box>
                    </Box>
                </Box>
            </DragDropContext>
        </Box>
    );
}
