import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { FIELD } from "./netConfig";

// Renders the authoritative server state and forwards local input.
// The server owns all physics; this scene just draws what it's told.
export class BonkScene extends Phaser.Scene {
  private room!: Room<any>;
  private sessionId = "";
  private gfx!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    r: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super("bonk");
  }

  create() {
    this.room = this.registry.get("room") as Room<any>;
    this.sessionId = this.registry.get("sessionId") as string;

    this.gfx = this.add.graphics();

    this.statusText = this.add
      .text(FIELD.WIDTH / 2, FIELD.HEIGHT / 2, "", {
        fontFamily: "monospace",
        fontSize: "34px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.hintText = this.add
      .text(FIELD.WIDTH / 2, FIELD.HEIGHT / 2 + 44, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#cbd5e1",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10);

    const kb = this.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      r: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
    };
    // Don't let SPACE / arrows scroll the page.
    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);
  }

  update() {
    const room = this.room;
    if (!room || !room.state) return;

    const state: any = room.state;
    const k = this.keys;
    const input = {
      up: k.up.isDown || k.w.isDown,
      down: k.down.isDown || k.s.isDown,
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      swing: k.space.isDown,
    };
    room.send("input", input);

    // R is the keyboard twin of the "Play again" button, so you can call a
    // rematch without leaving the canvas.
    if (state.status === "gameover" && Phaser.Input.Keyboard.JustDown(k.r)) {
      room.send("rematch");
    }

    const g = this.gfx;
    g.clear();

    // playfield
    g.fillStyle(0x0f172a, 1);
    g.fillRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);

    // spike strips (deadly) on left + right
    this.drawSpikes(g);

    // players
    state.players?.forEach((p: any, id: string) => {
      const isMe = id === this.sessionId;
      const ballColor = isMe ? 0x38bdf8 : 0xfb923c;

      if (!p.dead) {
        // bat
        const batLen = p.swinging ? FIELD.BAT_LENGTH : 46;
        const bx = p.x + Math.cos(p.facing) * batLen;
        const by = p.y + Math.sin(p.facing) * batLen;
        g.lineStyle(p.swinging ? 9 : 6, p.swinging ? 0xfacc15 : 0xd6c3a0, 1);
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(bx, by);
        g.strokePath();
        // knob at the tip
        g.fillStyle(p.swinging ? 0xfacc15 : 0xd6c3a0, 1);
        g.fillCircle(bx, by, p.swinging ? 8 : 6);
      }

      // baseball
      g.fillStyle(p.dead ? 0x475569 : ballColor, 1);
      g.fillCircle(p.x, p.y, FIELD.BALL_RADIUS);
      g.lineStyle(3, 0xffffff, 0.85);
      g.strokeCircle(p.x, p.y, FIELD.BALL_RADIUS);
    });

    this.updateStatusText(state);
  }

  private drawSpikes(g: Phaser.GameObjects.Graphics) {
    const w = FIELD.SPIKE_W;
    const h = FIELD.HEIGHT;
    g.fillStyle(0x7f1d1d, 1);
    g.fillRect(0, 0, w, h);
    g.fillRect(FIELD.WIDTH - w, 0, w, h);
    g.fillStyle(0xef4444, 1);
    const teeth = Math.floor(h / 28);
    for (let i = 0; i < teeth; i++) {
      const y = i * 28;
      // left teeth point right
      g.fillTriangle(w, y, w, y + 28, w + 16, y + 14);
      // right teeth point left
      const rx = FIELD.WIDTH - w;
      g.fillTriangle(rx, y, rx, y + 28, rx - 16, y + 14);
    }
  }

  private updateStatusText(state: any) {
    if (state.status === "waiting") {
      this.statusText.setText("Waiting for opponent...").setColor("#e2e8f0");
      this.statusText.setVisible(true);
      this.hintText.setVisible(false);
    } else if (state.status === "gameover") {
      const iWon = state.winner === this.sessionId;
      this.statusText.setText(iWon ? "YOU WIN! 🏆" : "YOU LOSE").setColor(iWon ? "#4ade80" : "#f87171");
      this.statusText.setVisible(true);

      const players = state.players;
      const me = players?.get(this.sessionId);
      this.hintText.setText(
        (players?.size ?? 0) < 2
          ? "waiting for an opponent..."
          : me?.ready
          ? "waiting for your opponent..."
          : "press R (or Play again) for a rematch"
      );
      this.hintText.setVisible(true);
    } else {
      this.statusText.setVisible(false);
      this.hintText.setVisible(false);
    }
  }
}
