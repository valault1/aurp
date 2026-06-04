import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, useTheme, Button } from "@mui/material";
import Phaser from "phaser";
import { motion } from "framer-motion";

class BounceVolumeGameScene extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Image;
  private middleWall!: Phaser.Physics.Arcade.Image;
  private trajectoryLine!: Phaser.GameObjects.Graphics;
  private targetZone!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
  private gameState: 'AIMING' | 'IN_FLIGHT' | 'LANDED' = 'AIMING';
  private launchSpeed = 800;
  private onVolumeSelected: (volume: number) => void;
  private onStateChange: (state: string) => void;

  constructor(config: { onVolumeSelected: (volume: number) => void, onStateChange: (state: string) => void }) {
    super({ key: 'BounceVolumeGameScene' });
    this.onVolumeSelected = config.onVolumeSelected;
    this.onStateChange = config.onStateChange;
  }

  preload() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('ball', 20, 20);
    graphics.destroy();

    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x888888, 1);
    wallGraphics.fillRect(0, 0, 10, 200);
    wallGraphics.generateTexture('wall', 10, 200);
    wallGraphics.destroy();
  }

  create() {
    this.physics.world.setBounds(0, 0, 800, 400);
    this.physics.world.setBoundsCollision(true, true, true, false); // disable bottom bound

    const launchBg = this.add.rectangle(200, 200, 400, 400, 0x111111);
    const targetBg = this.add.rectangle(600, 200, 400, 400, 0x222222);

    for (let i = 1; i <= 10; i++) {
        this.add.text(400 + (i * 40) - 20, 370, `${i * 10}`, { fontSize: '12px', color: '#666' }).setOrigin(0.5);
    }

    this.middleWall = this.physics.add.staticImage(400, 300, 'wall');

    this.targetZone = this.add.rectangle(600, 405, 400, 10, 0xff0000);
    this.physics.add.existing(this.targetZone, true);

    const launchFloor = this.add.rectangle(200, 405, 400, 10, 0x0000ff);
    this.physics.add.existing(launchFloor, true);

    this.ball = this.physics.add.image(200, 390, 'ball');
    this.ball.setCircle(10);
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    
    this.physics.add.collider(this.ball, this.middleWall);
    this.physics.add.collider(this.ball, this.targetZone, this.handleTargetCollision as any, undefined, this);
    this.physics.add.collider(this.ball, launchFloor, this.handleMiss as any, undefined, this);

    this.trajectoryLine = this.add.graphics();

    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.input.on('pointerdown', this.launchBall, this);

    this.resetBall();
  }

  update() {
    if (this.gameState === 'AIMING') {
      if (this.cursors.left.isDown) {
        this.ball.x -= 5;
      } else if (this.cursors.right.isDown) {
        this.ball.x += 5;
      }
      
      this.ball.x = Phaser.Math.Clamp(this.ball.x, 10, 390);

      const pointer = this.input.activePointer;
      this.trajectoryLine.clear();
      
      const angle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, pointer.x, pointer.y);
      
      if (pointer.y < this.ball.y && pointer.y < 380) {
          this.trajectoryLine.lineStyle(2, 0xaaaaaa, 0.8);
          this.trajectoryLine.beginPath();
          this.trajectoryLine.moveTo(this.ball.x, this.ball.y);
          const endX = this.ball.x + Math.cos(angle) * 150;
          const endY = this.ball.y + Math.sin(angle) * 150;
          this.trajectoryLine.lineTo(endX, endY);
          this.trajectoryLine.strokePath();
      }
    }
  }

  private launchBall(pointer: Phaser.Input.Pointer) {
    if (this.gameState !== 'AIMING' || pointer.y >= this.ball.y) return;

    this.setState('IN_FLIGHT');
    this.trajectoryLine.clear();

    const angle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, pointer.x, pointer.y);
    this.physics.velocityFromRotation(angle, this.launchSpeed, this.ball.body?.velocity);
    
    this.time.delayedCall(5000, () => {
        if (this.gameState === 'IN_FLIGHT') {
            this.handleMiss();
        }
    });
  }

  private setState(newState: 'AIMING' | 'IN_FLIGHT' | 'LANDED') {
      this.gameState = newState;
      this.onStateChange(newState);
  }

  private handleTargetCollision() {
    if (this.gameState !== 'IN_FLIGHT') return;
    this.setState('LANDED');
    if (this.ball.body) {
        this.ball.body.stop();
        this.ball.body.enable = false; // Freeze it completely
    }

    const landingX = Phaser.Math.Clamp(this.ball.x, 400, 800);
    let volume = Math.round(((landingX - 400) / 400) * 99) + 1;
    if (landingX <= 400) volume = 1;
    if (landingX >= 800) volume = 100;

    this.onVolumeSelected(volume);
  }

  private handleMiss() {
    if (this.gameState !== 'IN_FLIGHT') return;
    this.resetBall();
  }

  public resetBall() {
    this.setState('AIMING');
    if (this.ball.body) {
        this.ball.body.enable = true;
    }
    this.ball.setVelocity(0, 0);
    this.ball.setPosition(200, 390);
    this.trajectoryLine.clear();
  }
}

export function ValVolumeInputV1() {
  const theme = useTheme();
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [gameState, setGameState] = useState<string>('AIMING');

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      },
      scene: new BounceVolumeGameScene({ 
          onVolumeSelected: setVolume,
          onStateChange: setGameState
      })
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  const getScene = () => {
      if (phaserGameRef.current) {
          return phaserGameRef.current.scene.getScene('BounceVolumeGameScene') as BounceVolumeGameScene;
      }
      return null;
  };

  const handleReset = () => {
    setVolume(null);
    getScene()?.resetBall();
  };

  return (
    <Box sx={{ p: 4, borderRadius: 2, bgcolor: "background.paper", boxShadow: theme.shadows[4] }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Bounce Volume Input</Typography>
      
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center", minHeight: 40 }}>
        <Typography variant="body1" sx={{ flexGrow: 1 }}>
          {gameState === 'AIMING' && "Use Left/Right Arrows to move. Aim with the mouse and click to launch!"}
          {gameState === 'IN_FLIGHT' && "Watch it fly!"}
          {gameState === 'LANDED' && "Target reached!"}
        </Typography>
      </Box>

      <Box sx={{ position: "relative", width: 800, height: 400, overflow: "hidden", borderRadius: 2, border: `2px solid ${theme.palette.divider}`, touchAction: 'none' }}>
        <Box ref={gameRef} sx={{ width: '100%', height: '100%' }} />
        {volume !== null && (
          <Box 
            component={motion.div}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            sx={{ 
              position: "absolute", 
              top: 0, left: 0, right: 0, bottom: 0, 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              bgcolor: "rgba(0,0,0,0.8)",
              zIndex: 10
            }}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <Typography variant="h4" sx={{ color: "#fff", mb: 1, opacity: 0.8 }}>
                New volume:
              </Typography>
              <Typography variant="h1" sx={{ color: "#fff", mb: 4, fontWeight: "bold", textShadow: "0 0 20px rgba(0,255,255,0.5)" }}>
                {volume}%
              </Typography>
              <Button variant="contained" size="large" onClick={handleReset} sx={{ px: 4, py: 2, fontSize: "1.2rem" }}>
                Try Again
              </Button>
            </motion.div>
          </Box>
        )}
      </Box>
    </Box>
  );
}

class DropVolumeGameScene extends Phaser.Scene {
  private ball: Phaser.Physics.Arcade.Image | null = null;
  private targetBar!: Phaser.GameObjects.Container;
  private barWidth = 200;
  
  private gameState: 'WAITING_FOR_DROP' | 'DROPPING' | 'LANDED' = 'WAITING_FOR_DROP';
  private lives = 5;
  
  private onVolumeSelected: (volume: number) => void;
  private onStateChange: (state: string) => void;
  private onLivesChange: (lives: number) => void;

  constructor(config: { onVolumeSelected: (volume: number) => void, onStateChange: (state: string) => void, onLivesChange: (lives: number) => void }) {
    super({ key: 'DropVolumeGameScene' });
    this.onVolumeSelected = config.onVolumeSelected;
    this.onStateChange = config.onStateChange;
    this.onLivesChange = config.onLivesChange;
  }

  preload() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('drop_ball', 20, 20);
    graphics.destroy();
  }

  create() {
    this.physics.world.setBounds(0, 0, 800, 400);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.add.rectangle(400, 200, 800, 400, 0x111111);

    this.add.text(400, 200, "Click top half to drop", { fontSize: '24px', color: '#444' }).setOrigin(0.5);

    this.createTargetBar();

    this.input.on('pointerdown', this.dropBall, this);

    this.resetTurn();
  }

  private createTargetBar() {
    if (this.targetBar) {
        this.targetBar.destroy();
    }

    this.targetBar = this.add.container(400, 390);

    const rect = this.add.rectangle(0, 0, this.barWidth, 20, 0xff00aa);
    this.targetBar.add(rect);

    const tick = this.add.rectangle(0, 0, 2, 20, 0xffffff);
    this.targetBar.add(tick);

    if (this.barWidth >= 50) {
        const leftText = this.add.text(-this.barWidth / 2 + 4, 0, '0', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5);
        const rightText = this.add.text(this.barWidth / 2 - 4, 0, '100', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
        this.targetBar.add(leftText);
        this.targetBar.add(rightText);
    }

    this.physics.add.existing(this.targetBar, false);

    const body = this.targetBar.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.barWidth, 20);
    body.setOffset(-this.barWidth / 2, -10);
    body.setImmovable(true);
    body.setCollideWorldBounds(true);
    body.setBounce(1, 0);
    body.allowGravity = false;
    body.setVelocityX(250); // Medium speed
  }

  update() {
      if (this.gameState === 'DROPPING' && this.ball) {
          if (this.ball.y > 420) {
              this.handleMiss();
          }
      }
  }

  private dropBall(pointer: Phaser.Input.Pointer) {
    if (this.gameState !== 'WAITING_FOR_DROP' || pointer.y > 200) return;

    this.setState('DROPPING');
    
    if (this.ball) {
        this.ball.destroy();
    }

    this.ball = this.physics.add.image(pointer.x, pointer.y, 'drop_ball');
    this.ball.setCircle(10);
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(1000); 

    this.physics.add.collider(this.ball, this.targetBar, this.handleTargetCollision as any, undefined, this);
  }

  private handleTargetCollision() {
    if (this.gameState !== 'DROPPING') return;
    this.setState('LANDED');
    
    if (this.ball && this.ball.body) {
        this.ball.body.stop();
        this.ball.body.enable = false;
    }
    
    if (this.targetBar && this.targetBar.body) {
        (this.targetBar.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    }

    if (this.ball) {
        const leftEdge = this.targetBar.x - (this.barWidth / 2);
        const rightEdge = this.targetBar.x + (this.barWidth / 2);
        
        let relPos = (this.ball.x - leftEdge) / this.barWidth;
        relPos = Phaser.Math.Clamp(relPos, 0, 1);
        
        const volume = Math.max(1, Math.round(relPos * 100));
        this.onVolumeSelected(volume);
    }
  }

  private handleMiss() {
    if (this.gameState !== 'DROPPING') return;

    this.lives -= 1;
    this.onLivesChange(this.lives);

    if (this.lives <= 0) {
        this.setState('LANDED');
        this.onVolumeSelected(0);
        if (this.targetBar && this.targetBar.body) {
            (this.targetBar.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
        }
    } else {
        this.barWidth = Math.max(20, this.barWidth - 30);
        this.createTargetBar();
        this.resetTurn();
    }
  }

  private setState(newState: 'WAITING_FOR_DROP' | 'DROPPING' | 'LANDED') {
      this.gameState = newState;
      this.onStateChange(newState);
  }

  public resetGame() {
    this.lives = 5;
    this.onLivesChange(this.lives);
    this.barWidth = 200;
    this.createTargetBar();
    this.resetTurn();
  }

  public resetTurn() {
      this.setState('WAITING_FOR_DROP');
      if (this.ball) {
          this.ball.destroy();
          this.ball = null;
      }
      if (this.targetBar && this.targetBar.body) {
          const body = this.targetBar.body as Phaser.Physics.Arcade.Body;
          if (body.velocity.x === 0) {
              body.setVelocityX(250);
          }
      }
  }
}

export function ValVolumeInputV2() {
  const theme = useTheme();
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [gameState, setGameState] = useState<string>('WAITING_FOR_DROP');
  const [lives, setLives] = useState<number>(5);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      },
      scene: new DropVolumeGameScene({ 
          onVolumeSelected: setVolume,
          onStateChange: setGameState,
          onLivesChange: setLives
      })
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  const getScene = () => {
      if (phaserGameRef.current) {
          return phaserGameRef.current.scene.getScene('DropVolumeGameScene') as DropVolumeGameScene;
      }
      return null;
  };

  const handleReset = () => {
    setVolume(null);
    getScene()?.resetGame();
  };

  return (
    <Box sx={{ p: 4, borderRadius: 2, bgcolor: "background.paper", boxShadow: theme.shadows[4] }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Drop-to-Volume Input</Typography>
      
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center", minHeight: 40 }}>
        <Typography variant="body1" sx={{ flexGrow: 1 }}>
          {gameState === 'WAITING_FOR_DROP' && "Click the top area to drop the ball!"}
          {gameState === 'DROPPING' && "Falling..."}
          {gameState === 'LANDED' && "Game Over!"}
        </Typography>
        
        <Typography variant="h6" color={lives <= 1 ? "error" : "primary"} sx={{ fontWeight: "bold" }}>
            Lives: {lives}
        </Typography>
      </Box>

      <Box sx={{ position: "relative", width: 800, height: 400, overflow: "hidden", borderRadius: 2, border: `2px solid ${theme.palette.divider}`, touchAction: 'none' }}>
        <Box ref={gameRef} sx={{ width: '100%', height: '100%' }} />
        {volume !== null && (
          <Box 
            component={motion.div}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            sx={{ 
              position: "absolute", 
              top: 0, left: 0, right: 0, bottom: 0, 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              bgcolor: "rgba(0,0,0,0.8)",
              zIndex: 10
            }}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <Typography variant="h4" sx={{ color: "#fff", mb: 1, opacity: 0.8 }}>
                New volume:
              </Typography>
              <Typography variant="h1" sx={{ color: lives <= 0 ? "#ff4444" : "#fff", mb: 4, fontWeight: "bold", textShadow: `0 0 20px ${lives <= 0 ? "rgba(255,0,0,0.5)" : "rgba(0,255,255,0.5)"}` }}>
                {volume}%
              </Typography>
              <Button variant="contained" size="large" onClick={handleReset} sx={{ px: 4, py: 2, fontSize: "1.2rem" }}>
                Try Again
              </Button>
            </motion.div>
          </Box>
        )}
      </Box>
    </Box>
  );
}

class BoomboxGameScene extends Phaser.Scene {
  private boombox!: Phaser.GameObjects.Text;
  private oldLady!: Phaser.GameObjects.Text;
  
  private gameState: 'DRAGGING' | 'LANDED' = 'DRAGGING';
  private maxDistance = 350;
  
  private onVolumeSelected: (volume: number) => void;
  private onStateChange: (state: string) => void;

  constructor(config: { onVolumeSelected: (volume: number) => void, onStateChange: (state: string) => void }) {
    super({ key: 'BoomboxGameScene' });
    this.onVolumeSelected = config.onVolumeSelected;
    this.onStateChange = config.onStateChange;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a2e1a');

    this.oldLady = this.add.text(400, 200, '😌', { fontSize: '64px' }).setOrigin(0.5);

    this.boombox = this.add.text(50, 350, '📻', { fontSize: '48px' }).setOrigin(0.5);
    this.boombox.setInteractive({ draggable: true });
    this.input.setDraggable(this.boombox);

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (this.gameState === 'DRAGGING') {
            this.boombox.x = Phaser.Math.Clamp(dragX, 30, 770);
            this.boombox.y = Phaser.Math.Clamp(dragY, 30, 370);
            this.updateProximity();
            this.emitSoundWave();
        }
    });

    this.input.on('dragend', () => {
        if (this.gameState === 'DRAGGING') {
            this.lockVolume();
        }
    });

    this.updateProximity();
  }

  update() {
      if (this.gameState === 'DRAGGING') {
          const volume = this.getVolume();
          if (volume > 80) {
              this.oldLady.x = 400 + Phaser.Math.Between(-5, 5);
              this.oldLady.y = 200 + Phaser.Math.Between(-5, 5);
              
              // Emit more sound waves when very loud
              if (Math.random() > 0.8) {
                  this.emitSoundWave();
              }
          } else {
              this.oldLady.x = 400;
              this.oldLady.y = 200;
          }
      }
  }

  private emitSoundWave() {
      if (Math.random() > 0.3) return; // Throttle

      const wave = this.add.circle(this.boombox.x, this.boombox.y, 20);
      wave.setStrokeStyle(2, 0x00ffff, 0.8);
      
      this.tweens.add({
          targets: wave,
          radius: 120,
          alpha: 0,
          duration: 800,
          ease: 'Sine.easeOut',
          onComplete: () => {
              wave.destroy();
          }
      });
  }

  private getDistance() {
      return Phaser.Math.Distance.Between(this.boombox.x, this.boombox.y, 400, 200);
  }

  private getVolume() {
      const dist = this.getDistance();
      let vol = 100 - (dist / this.maxDistance) * 100;
      return Math.max(0, Math.min(100, Math.round(vol)));
  }

  private updateProximity() {
      const volume = this.getVolume();

      if (volume < 33) {
          this.oldLady.setText('😌');
          this.oldLady.setFontSize('64px');
      } else if (volume < 66) {
          this.oldLady.setText('😠');
          this.oldLady.setFontSize('72px');
      } else if (volume < 90) {
          this.oldLady.setText('🤬');
          this.oldLady.setFontSize('84px');
      } else {
          this.oldLady.setText('💥');
          this.oldLady.setFontSize('100px');
      }

      const calmColor = Phaser.Display.Color.HexStringToColor('#1a2e1a');
      const angryColor = Phaser.Display.Color.HexStringToColor('#6a0000');
      
      const interp = Phaser.Display.Color.Interpolate.ColorWithColor(calmColor, angryColor, 100, volume);
      const colorObj = Phaser.Display.Color.ObjectToColor(interp);
      this.cameras.main.setBackgroundColor(colorObj.color);
  }

  private lockVolume() {
      this.gameState = 'LANDED';
      this.boombox.disableInteractive();
      const vol = this.getVolume();
      this.onVolumeSelected(vol);
      this.onStateChange('LANDED');
  }

  public resetGame() {
      this.gameState = 'DRAGGING';
      this.boombox.setInteractive({ draggable: true });
      this.boombox.setPosition(50, 350);
      this.updateProximity();
      this.onStateChange('DRAGGING');
  }
}

export function ValVolumeInputV3() {
  const theme = useTheme();
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [gameState, setGameState] = useState<string>('DRAGGING');

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false
        }
      },
      scene: new BoomboxGameScene({ 
          onVolumeSelected: setVolume,
          onStateChange: setGameState
      })
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  const getScene = () => {
      if (phaserGameRef.current) {
          return phaserGameRef.current.scene.getScene('BoomboxGameScene') as BoomboxGameScene;
      }
      return null;
  };

  const handleReset = () => {
    setVolume(null);
    getScene()?.resetGame();
  };

  return (
    <Box sx={{ p: 4, borderRadius: 2, bgcolor: "background.paper", boxShadow: theme.shadows[4] }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Boombox Proximity Input</Typography>
      
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center", minHeight: 40 }}>
        <Typography variant="body1" sx={{ flexGrow: 1 }}>
          {gameState === 'DRAGGING' && "Drag the boombox towards the old lady to turn up the volume!"}
          {gameState === 'LANDED' && "Volume locked in."}
        </Typography>
      </Box>

      <Box sx={{ position: "relative", width: 800, height: 400, overflow: "hidden", borderRadius: 2, border: `2px solid ${theme.palette.divider}`, touchAction: 'none' }}>
        <Box ref={gameRef} sx={{ width: '100%', height: '100%' }} />
        {volume !== null && (
          <Box 
            component={motion.div}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            sx={{ 
              position: "absolute", 
              top: 0, left: 0, right: 0, bottom: 0, 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              bgcolor: "rgba(0,0,0,0.8)",
              zIndex: 10
            }}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <Typography variant="h4" sx={{ color: "#fff", mb: 1, opacity: 0.8 }}>
                New volume:
              </Typography>
              <Typography variant="h1" sx={{ color: "#fff", mb: 4, fontWeight: "bold", textShadow: "0 0 20px rgba(0,255,255,0.5)" }}>
                {volume}%
              </Typography>
              <Button variant="contained" size="large" onClick={handleReset} sx={{ px: 4, py: 2, fontSize: "1.2rem" }}>
                Try Again
              </Button>
            </motion.div>
          </Box>
        )}
      </Box>
    </Box>
  );
}
