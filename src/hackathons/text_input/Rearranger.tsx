import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Box, Typography } from "@mui/material";

type LetterInfo = {
    id: string;
    char: string;
};

// Initial state: A-Z
const INITIAL_LETTERS: LetterInfo[] = Array.from({ length: 26 }, (_, i) => ({
    id: `letter-${String.fromCharCode(65 + i)}`,
    char: String.fromCharCode(65 + i),
}));

export function Rearranger() {
    const [topLetters, setTopLetters] = useState<LetterInfo[]>([]);
    const [bottomLetters, setBottomLetters] = useState<LetterInfo[]>(INITIAL_LETTERS);

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination) {
            return;
        }

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Moving within the same list
        if (source.droppableId === destination.droppableId) {
            const isTop = source.droppableId === "top-zone";
            const list = isTop ? Array.from(topLetters) : Array.from(bottomLetters);
            const removed = list.splice(source.index, 1)[0];
            if (removed) {
                list.splice(destination.index, 0, removed);
            }

            if (isTop) {
                setTopLetters(list);
            } else {
                setBottomLetters(list);
            }
            return;
        }

        // Moving between lists
        const sourceList = source.droppableId === "top-zone" ? Array.from(topLetters) : Array.from(bottomLetters);
        const destList = destination.droppableId === "top-zone" ? Array.from(topLetters) : Array.from(bottomLetters);

        const removed = sourceList.splice(source.index, 1)[0];
        if (removed) {
            destList.splice(destination.index, 0, removed);
        }

        if (source.droppableId === "top-zone") {
            setTopLetters(sourceList);
            setBottomLetters(destList);
        } else {
            setBottomLetters(sourceList);
            setTopLetters(destList);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 4 }}>
            <Typography variant="h6">Rearranger Input Method</Typography>
            <DragDropContext onDragEnd={onDragEnd}>
                {/* Top Zone - The Input String */}
                <Box>
                    <Typography variant="subtitle1" gutterBottom>
                        Your Input:
                    </Typography>
                    <Droppable droppableId="top-zone" direction="horizontal">
                        {(provided, snapshot) => (
                            <Box
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
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
                                {topLetters.length === 0 && !snapshot.isDraggingOver && (
                                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", width: "100%", textAlign: "center" }}>
                                        Drag letters here to form your text
                                    </Typography>
                                )}
                                {topLetters.map((item, index) => (
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

                {/* Bottom Zone - Available Letters */}
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
            </DragDropContext>
        </Box>
    );
}
