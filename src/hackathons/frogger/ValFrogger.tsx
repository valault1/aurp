import { Box, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

const GRID_SIZE = 32;
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

export function ValFroggerV1() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: gameRef.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: true, // For verification of hitboxes
        }
      },
      scene: [Scene_Boot, Scene_UI, Scene_Highway, Scene_Brawl, Scene_GameOver]
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <Box sx={{ p: 4, textAlign: "center", height: "100vh", bgcolor: "#000" }}>
      <Typography variant="h3" color="white" gutterBottom>Val Frogger V1</Typography>
      <Box
        ref={gameRef}
        sx={{
          width: "100%",
          maxWidth: "1000px",
          margin: "0 auto",
          border: "4px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
          aspectRatio: "1280/720"
        }}
      />
    </Box>
  );
}

export function ValFroggerV2() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h3">Val Frogger V2</Typography>
      <Typography color="text.secondary">Placeholder</Typography>
    </Box>
  );
}

export function ValFroggerV3() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h3">Val Frogger V3</Typography>
      <Typography color="text.secondary">Placeholder</Typography>
    </Box>
  );
}

class Scene_Boot extends Phaser.Scene {
  constructor() { super({ key: 'Scene_Boot' }); }
  create() {
    if (!this.textures.exists('frog')) {
      let gr = this.add.graphics();
      gr.fillStyle(0x00FF00);
      gr.fillRect(0, 0, GRID_SIZE, GRID_SIZE);
      gr.generateTexture('frog', GRID_SIZE, GRID_SIZE);
      gr.destroy();

      gr = this.add.graphics();
      gr.fillStyle(0xFF0000);
      gr.fillRect(0, 0, GRID_SIZE * 2, GRID_SIZE);
      gr.generateTexture('car', GRID_SIZE * 2, GRID_SIZE);
      gr.destroy();

      gr = this.add.graphics();
      gr.fillStyle(0x800080);
      gr.fillRect(0, 0, GRID_SIZE * 2, GRID_SIZE);
      gr.generateTexture('boss_car', GRID_SIZE * 2, GRID_SIZE);
      gr.destroy();

      gr = this.add.graphics();
      gr.fillStyle(0x888888);
      gr.fillRect(0, 0, GRID_SIZE * 2, GRID_SIZE);
      gr.generateTexture('wreckage', GRID_SIZE * 2, GRID_SIZE);
      gr.destroy();

      gr = this.add.graphics();
      gr.fillStyle(0xFF69B4);
      gr.fillRect(0, 0, 10, 10);
      gr.generateTexture('tongue', 10, 10);
      gr.destroy();

      gr = this.add.graphics();
      gr.fillStyle(0x00FFFF);
      gr.fillRect(0, 0, 16, 16);
      gr.generateTexture('boss_part', 16, 16);
      gr.destroy();
    }

    this.registry.set('global_score', 0);

    this.scene.launch('Scene_UI');
    this.scene.start('Scene_Highway');
  }
}

class Scene_UI extends Phaser.Scene {
  scoreText!: Phaser.GameObjects.Text;
  mashText!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'Scene_UI' }); }

  create() {
    this.registry.events.off('changedata-global_score');
    this.registry.events.off('show_mash_prompt');
    this.registry.events.off('hide_mash_prompt');

    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '48px', color: '#fff' });
    this.mashText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', { fontSize: '64px', color: '#fff', backgroundColor: '#000' }).setOrigin(0.5).setVisible(false);

    this.registry.events.on('changedata-global_score', (parent: any, value: number) => {
      this.scoreText.setText(`Score: ${value}`);
    });

    this.registry.events.on('show_mash_prompt', (current: number, target: number) => {
      this.mashText.setVisible(true);
      this.mashText.setText(`MASH! ${current}/${target}`);
    });

    this.registry.events.on('hide_mash_prompt', () => {
      this.mashText.setVisible(false);
    });
  }
}

class Scene_Highway extends Phaser.Scene {
  frog!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  keys!: any;
  lastHopTime: number = 0;
  highestY: number = 0;
  standardTrafficGroup!: Phaser.GameObjects.Group;
  bossTrafficGroup!: Phaser.GameObjects.Group;
  wreckageGroup!: Phaser.GameObjects.Group;
  chunkY: number = 0;
  isInvulnerable: boolean = false;
  spawners: any[] = [];

  constructor() {
    super({ key: 'Scene_Highway' });
  }

  create() {
    const startX = Math.floor(GAME_WIDTH / 2 / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((GAME_HEIGHT * 0.8) / GRID_SIZE) * GRID_SIZE;

    this.frog = this.physics.add.sprite(startX, startY, 'frog');
    this.frog.setOrigin(0, 0);
    // Forgiving hitbox
    this.frog.body.setSize(16, 16);
    this.frog.body.setOffset(8, 8);
    this.frog.setDepth(10);

    this.highestY = startY;
    this.chunkY = startY - GRID_SIZE * 2;

    this.registry.set('highest_y_reached', this.highestY);
    this.registry.set('global_score', 0);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    this.standardTrafficGroup = this.add.group();
    this.bossTrafficGroup = this.add.group();
    this.wreckageGroup = this.add.group();

    this.cameras.main.startFollow(this.frog, false, 0, 1);
    this.cameras.main.setDeadzone(GAME_WIDTH, GAME_HEIGHT * 0.4);

    this.physics.add.overlap(this.frog, this.standardTrafficGroup, this.hitStandardCar as any, undefined, this);
    this.physics.add.overlap(this.frog, this.bossTrafficGroup, this.hitBossCar as any, undefined, this);

    this.events.on('wake', this.onWake, this);

    // Draw grid
    const gridGr = this.add.graphics();
    gridGr.lineStyle(2, 0x222222, 1);
    for (let x = 0; x < GAME_WIDTH; x += GRID_SIZE) {
      gridGr.moveTo(x, -GAME_HEIGHT * 10);
      gridGr.lineTo(x, GAME_HEIGHT * 2);
    }
    for (let y = -GAME_HEIGHT * 10; y < GAME_HEIGHT * 2; y += GRID_SIZE) {
      gridGr.moveTo(0, y);
      gridGr.lineTo(GAME_WIDTH, y);
    }
    gridGr.strokePath();
    gridGr.setDepth(-1);
  }

  onWake() {
    this.isInvulnerable = true;
    this.frog.setAlpha(0.5);

    const collidedBoss = this.registry.get('collided_boss');
    if (collidedBoss && collidedBoss.active) {
      const wreck = this.physics.add.sprite(collidedBoss.x, collidedBoss.y, 'wreckage');
      wreck.setOrigin(0, 0);
      wreck.body.immovable = true;
      this.wreckageGroup.add(wreck);
      collidedBoss.destroy();
    }

    this.time.delayedCall(1500, () => {
      this.isInvulnerable = false;
      this.frog.setAlpha(1);
    });

    this.cameras.main.startFollow(this.frog, false, 0, 1);
  }

  hitStandardCar(frog: any, car: any) {
    if (this.isInvulnerable) return;

    let safe = false;
    this.wreckageGroup.getChildren().forEach((w: any) => {
      if (Phaser.Geom.Intersects.RectangleToRectangle(frog.getBounds(), w.getBounds())) {
        safe = true;
      }
    });
    if (safe) return;

    this.hitBossCar(frog, car);
  }

  hitBossCar(frog: any, car: any) {
    if (this.isInvulnerable) return;

    this.physics.pause();
    this.registry.set('frog_x', frog.x);
    this.registry.set('frog_y', frog.y);
    this.registry.set('boss_x', car.x);
    this.registry.set('boss_y', car.y);
    this.registry.set('camera_scroll_y', this.cameras.main.scrollY);

    // Convert to manual body disable so it doesn't trigger again immediately
    if (car.body) car.body.enable = false;
    this.registry.set('collided_boss', car);

    this.scene.sleep();
    this.scene.launch('Scene_Brawl');
  }

  gameOver() {
    this.physics.pause();
    this.spawners.forEach(s => s.timer?.destroy());
    this.scene.launch('Scene_GameOver');
  }

  override update(time: number, delta: number) {
    const hop = GRID_SIZE;
    let moved = false;

    if (Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.UP)) { this.frog.y -= hop; moved = true; }
    else if (Phaser.Input.Keyboard.JustDown(this.keys.S) || Phaser.Input.Keyboard.JustDown(this.keys.DOWN)) { this.frog.y += hop; moved = true; }
    else if ((Phaser.Input.Keyboard.JustDown(this.keys.A) || Phaser.Input.Keyboard.JustDown(this.keys.LEFT)) && this.frog.x >= hop) { this.frog.x -= hop; moved = true; }
    else if ((Phaser.Input.Keyboard.JustDown(this.keys.D) || Phaser.Input.Keyboard.JustDown(this.keys.RIGHT)) && this.frog.x <= GAME_WIDTH - hop * 2) { this.frog.x += hop; moved = true; }

    if (moved) {
      if (this.frog.y < this.highestY) {
        this.highestY = this.frog.y;
        this.registry.set('highest_y_reached', this.highestY);
        this.registry.set('global_score', this.registry.get('global_score') + 1);
      }
    }

    const bottomEdge = this.cameras.main.scrollY + GAME_HEIGHT;
    if (this.frog.y > bottomEdge + GRID_SIZE) {
      this.gameOver();
    }

    if (this.cameras.main.scrollY < this.chunkY + GAME_HEIGHT * 2) {
      this.spawnChunk();
    }

    this.standardTrafficGroup.getChildren().forEach((car: any) => {
      if (car.x < -200 || car.x > GAME_WIDTH + 200) {
        car.destroy();
      }
    });
    this.bossTrafficGroup.getChildren().forEach((car: any) => {
      if (car.x < -200 || car.x > GAME_WIDTH + 200) {
        car.destroy();
      }
    });

    this.standardTrafficGroup.getChildren().forEach((c: any) => {
      if (c.getData('type') === 'Erratic' && Math.random() < 0.01) {
        const dir = c.getData('direction');
        c.setVelocityX(250 * dir);
        this.time.delayedCall(1000, () => {
          if (c && c.active) c.setVelocityX(120 * dir);
        });
      }
    });
  }

  spawnChunk() {
    for (let i = 0; i < 10; i++) {
      const laneY = this.chunkY - (i * GRID_SIZE * 2);
      if (Math.random() > 0.3) {
        this.spawnLane(laneY);
      }
    }
    this.chunkY -= (10 * GRID_SIZE * 2);
  }

  spawnLane(y: number) {
    const isBoss = Math.random() < 0.05; // 5% chance slightly rarer to ease gameplay
    const direction = Math.random() > 0.5 ? 1 : -1;
    const startX = direction === 1 ? -200 : GAME_WIDTH + 200;

    if (isBoss) {
      const speedX = (Math.random() * 80 + 80) * direction; // Slower for easier targeting
      const car = this.physics.add.sprite(startX, y, 'boss_car');
      car.setOrigin(0, 0);
      car.body.velocity.x = speedX;
      this.bossTrafficGroup.add(car);
    } else {
      const types = ['Commuter', 'Speedster', 'Convoy', 'Erratic'];
      const type = types[Math.floor(Math.random() * types.length)] as string;
      this.spawners.push(new TrafficSpawner(this, y, type, direction));
    }
  }
}

class TrafficSpawner {
  scene: Scene_Highway;
  y: number;
  type: string;
  direction: number;
  timer!: Phaser.Time.TimerEvent;

  constructor(scene: Scene_Highway, y: number, type: string, direction: number) {
    this.scene = scene;
    this.y = y;
    this.type = type;
    this.direction = direction;
    this.startSpawning();
  }

  startSpawning() {
    let delay = 2000;
    if (this.type === 'Speedster') delay = 4000;
    if (this.type === 'Convoy') delay = 5000;
    if (this.type === 'Erratic') delay = 2500;

    this.timer = this.scene.time.addEvent({
      delay,
      startAt: Math.random() * delay,
      loop: true,
      callback: () => {
        if (this.y > this.scene.cameras.main.scrollY + GAME_HEIGHT + 200) {
          this.timer.destroy();
          return;
        }

        let speed = 100;
        let carsToSpawn = 1;
        let spacing = 0;

        if (this.type === 'Commuter') speed = 100;
        else if (this.type === 'Speedster') speed = 350;
        else if (this.type === 'Convoy') { speed = 150; carsToSpawn = 3; spacing = 80; }
        else if (this.type === 'Erratic') speed = 120;

        const startX = this.direction === 1 ? -200 : GAME_WIDTH + 200;
        const finalSpeed = speed * this.direction;

        for (let i = 0; i < carsToSpawn; i++) {
          this.scene.time.delayedCall(i * (spacing / speed * 1000 || 0), () => {
            const car = this.scene.physics.add.sprite(startX, this.y, 'car');
            car.setOrigin(0, 0);
            car.setVelocityX(finalSpeed);
            car.setData('type', this.type);
            car.setData('direction', this.direction);
            this.scene.standardTrafficGroup.add(car);
          });
        }
      }
    });
  }
}

class Scene_Brawl extends Phaser.Scene {
  frog!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  bossCar!: Phaser.GameObjects.Container;
  parts!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
  keys!: any;
  tongue!: Phaser.GameObjects.TileSprite;
  state: 'BULL_RUSH' | 'STALLED' | 'DISMANTLE' = 'BULL_RUSH';
  rushTimer: number = 0;
  mashCount: number = 0;
  targetPart: any = null;
  dismantledParts: number = 0;
  tongueCooldown: boolean = false;

  constructor() {
    super({ key: 'Scene_Brawl' });
  }

  create() {
    const scrollY = this.registry.get('camera_scroll_y') || 0;
    const frogX = this.registry.get('frog_x') || GAME_WIDTH / 2;
    const frogY = this.registry.get('frog_y') || 576;
    const bossX = this.registry.get('boss_x') || GAME_WIDTH / 2;
    
    // Force the boss to the top of the currently visible screen to prevent instant overlapping death
    const bossY = scrollY + 100;

    this.cameras.main.scrollY = scrollY;
    this.physics.world.setBounds(0, scrollY, GAME_WIDTH, GAME_HEIGHT);

    this.frog = this.physics.add.sprite(frogX, frogY, 'frog');
    this.frog.setCollideWorldBounds(true);
    this.frog.body.setSize(16, 16);

    this.bossCar = this.add.container(bossX, bossY);
    this.physics.world.enable(this.bossCar);

    const body = this.bossCar.body as Phaser.Physics.Arcade.Body;
    body.setSize(GRID_SIZE * 2, GRID_SIZE);
    body.setCollideWorldBounds(true);
    body.onWorldBounds = true;
    body.setBounce(1, 1);

    const baseBoss = this.add.sprite(0, 0, 'boss_car');
    this.bossCar.add(baseBoss);

    this.parts = [];
    // Offsets based on center of boss_car
    const positions = [{ x: -24, y: 0 }, { x: 24, y: 0 }, { x: 0, y: -8 }, { x: 0, y: 8 }];
    positions.forEach(pos => {
      const part = this.physics.add.sprite(pos.x, pos.y, 'boss_part');
      this.bossCar.add(part);
      this.parts.push(part);
    });

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE');

    this.tongue = this.add.tileSprite(this.frog.x, this.frog.y, 10, 10, 'tongue');
    this.tongue.setOrigin(0, 0.5);
    this.tongue.setVisible(false);
    this.tongue.setDepth(-1); // Under frog

    this.physics.add.overlap(this.frog, this.bossCar as any, this.onFrogHitBoss as any, undefined, this);

    this.physics.world.on('worldbounds', (b: Phaser.Physics.Arcade.Body) => {
      if (b.gameObject === this.bossCar && this.state === 'BULL_RUSH') {
        this.startStall();
      }
    });

    this.startBullRush();
  }

  startBullRush() {
    this.state = 'BULL_RUSH';
    this.physics.moveToObject(this.bossCar, this.frog, 300);
    this.rushTimer = this.time.now;
  }

  startStall() {
    this.state = 'STALLED';
    (this.bossCar.body as Phaser.Physics.Arcade.Body).setVelocity(0);

    const activeParts = this.parts.filter(p => p.active);
    if (activeParts.length > 0) {
      this.targetPart = activeParts[Math.floor(Math.random() * activeParts.length)];
      this.targetPart.setTint(0xff0000);
    }

    this.time.delayedCall(2000, () => {
      if (this.state === 'STALLED') {
        if (this.targetPart) this.targetPart.clearTint();
        this.startBullRush();
      }
    });
  }

  onFrogHitBoss() {
    if (this.state === 'BULL_RUSH') {
      this.physics.pause();
      this.scene.launch('Scene_GameOver');
    }
  }

  override update(time: number, delta: number) {
    if (this.state === 'BULL_RUSH' || this.state === 'STALLED') {
      const speed = 400;
      this.frog.setVelocity(0);

      if (this.keys.W.isDown || this.keys.UP.isDown) this.frog.setVelocityY(-speed);
      if (this.keys.S.isDown || this.keys.DOWN.isDown) this.frog.setVelocityY(speed);
      if (this.keys.A.isDown || this.keys.LEFT.isDown) this.frog.setVelocityX(-speed);
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) this.frog.setVelocityX(speed);

      if (this.state === 'BULL_RUSH') {
        // Accelerate towards frog
        this.physics.moveToObject(this.bossCar, this.frog, 350);

        if (time - this.rushTimer > 2500) {
          this.startStall(); // Fallback if it doesn't hit a wall
        }
      } else if (this.state === 'STALLED') {
        const vel = (this.bossCar.body as Phaser.Physics.Arcade.Body).velocity;
        vel.x *= 0.95;
        vel.y *= 0.95;
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && this.state === 'STALLED' && !this.tongueCooldown) {
        this.fireTongue();
      }
    } else if (this.state === 'DISMANTLE') {
      this.frog.setVelocity(0);
      (this.bossCar.body as Phaser.Physics.Arcade.Body).setVelocity(0);

      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.mashCount++;
        this.registry.events.emit('show_mash_prompt', this.mashCount, 5);
        if (this.mashCount >= 5) {
          this.finishDismantle();
        }
      }
    }

    if (this.tongue.visible) {
      this.tongue.setPosition(this.frog.x, this.frog.y);
      const angle = Phaser.Math.Angle.Between(this.frog.x, this.frog.y, this.bossCar.x, this.bossCar.y);
      this.tongue.setRotation(angle);
    }
  }

  fireTongue() {
    this.tongueCooldown = true;
    this.tongue.setVisible(true);
    this.tongue.width = 10;
    const dist = Phaser.Math.Distance.Between(this.frog.x, this.frog.y, this.bossCar.x, this.bossCar.y);

    this.tweens.add({
      targets: this.tongue,
      width: dist,
      duration: 200,
      onComplete: () => {
        if (this.targetPart && this.tongueHitPart()) {
          this.startDismantle();
        } else {
          this.tweens.add({
            targets: this.tongue,
            width: 10,
            duration: 200,
            onComplete: () => {
              this.tongue.setVisible(false);
              this.time.delayedCall(500, () => {
                this.tongueCooldown = false;
              });
            }
          });
        }
      }
    });
  }

  tongueHitPart() {
    if (!this.targetPart) return false;

    // Convert container local coordinates to world coords
    const partWorldX = this.bossCar.x + this.targetPart.x;
    const partWorldY = this.bossCar.y + this.targetPart.y;

    const ang = this.tongue.rotation;
    const dist = Phaser.Math.Distance.Between(this.frog.x, this.frog.y, this.bossCar.x, this.bossCar.y);
    const endX = this.frog.x + Math.cos(ang) * dist;
    const endY = this.frog.y + Math.sin(ang) * dist;

    return Phaser.Math.Distance.Between(endX, endY, partWorldX, partWorldY) < 48; // Generous hit radius
  }

  startDismantle() {
    this.state = 'DISMANTLE';
    this.mashCount = 0;
    this.registry.events.emit('show_mash_prompt', 0, 5);
  }

  finishDismantle() {
    this.targetPart.destroy();
    this.targetPart = null;
    this.dismantledParts++;
    this.tongue.setVisible(false);
    this.registry.events.emit('hide_mash_prompt');
    this.tongueCooldown = false;

    if (this.dismantledParts >= 4) {
      this.win();
    } else {
      this.startBullRush();
    }
  }

  win() {
    this.registry.events.emit('hide_mash_prompt');
    this.scene.stop('Scene_Brawl');
    this.scene.get('Scene_Highway').physics.resume();
    this.scene.wake('Scene_Highway');
  }
}

class Scene_GameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'Scene_GameOver' });
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'GAME OVER', { fontSize: '64px', color: '#ff0000' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press SPACE to Restart', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.stop('Scene_UI');
      this.scene.stop('Scene_Highway');
      this.scene.stop('Scene_Brawl');
      this.registry.set('global_score', 0);
      this.scene.start('Scene_Boot');
    });
  }
}
