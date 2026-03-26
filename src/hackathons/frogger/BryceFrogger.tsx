import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import Phaser from "phaser";

class BrycePlaceholderScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("BrycePlaceholderScene");
  }

  create() {
    // Add a simple green square placeholder for the player
    this.player = this.add.rectangle(400, 300, 32, 32, 0x00ff00);

    // Initialize keyboard input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  override update() {
    if (!this.cursors || !this.player) return;

    const speed = 5;

    if (this.cursors.left.isDown) {
      this.player.x -= speed;
    } else if (this.cursors.right.isDown) {
      this.player.x += speed;
    }

    if (this.cursors.up.isDown) {
      this.player.y -= speed;
    } else if (this.cursors.down.isDown) {
      this.player.y += speed;
    }
  }
}

export function BryceFroggerV1() {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameContainerRef.current,
      scene: [BrycePlaceholderScene],
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <Box sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Typography variant="h3" sx={{ mb: 2 }}>Bryce Frogger V1</Typography>
      <Box ref={gameContainerRef} sx={{ width: 800, height: 600, bgcolor: "black", borderRadius: 2, overflow: "hidden" }} />
    </Box>
  );
}

export function BryceFroggerV2() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h3">Bryce Frogger V2</Typography>
      <Typography color="text.secondary">Placeholder</Typography>
    </Box>
  );
}

export function BryceFroggerV3() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h3">Bryce Frogger V3</Typography>
      <Typography color="text.secondary">Placeholder</Typography>
    </Box>
  );
}
