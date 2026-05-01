import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Paper, Stack, Grid, IconButton, Slider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Phaser from "phaser";

// --- EVENT EMITTER ---
const tdEvents = new Phaser.Events.EventEmitter();

// --- GAME CONSTANTS ---
const TILE_SIZE = 40;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const WIDTH = MAP_WIDTH * TILE_SIZE; // 800
const HEIGHT = MAP_HEIGHT * TILE_SIZE; // 600

// --- TYPES ---
interface TowerData {
    id: string;
    x: number;
    y: number;
    damage: number;
    range: number;
    fireDelay: number;
    pierce: number;
    levelSpeed: number;
    levelRange: number;
    levelPower: number;
    totalSpent: number;
}

// --- PHASER SCENE ---
class TDScene extends Phaser.Scene {
    private path!: Phaser.Curves.Path;
    private enemies!: Phaser.GameObjects.Group;
    private towers!: Phaser.GameObjects.Group;
    private projectiles!: Phaser.Physics.Arcade.Group;
    private placementGrid: number[][] = []; // 0 = empty, 1 = path, 2 = tower
    private ghostTower!: Phaser.GameObjects.Arc;
    private ghostRange!: Phaser.GameObjects.Arc;
    
    // State
    private money = 650;
    private lives = 100;
    private currentWave = 0;
    private gameSpeed = 1;
    private isPlacementMode = false;
    private selectedTower: Phaser.GameObjects.Arc | null = null;
    private selectionCircle!: Phaser.GameObjects.Arc;
    
    // Wave Management
    private waveConfig = [
        { red: 20, blue: 0, green: 0, spawnDelay: 1000 },
        { red: 30, blue: 5, green: 0, spawnDelay: 800 },
        { red: 20, blue: 15, green: 5, spawnDelay: 700 },
        { red: 10, blue: 20, green: 15, spawnDelay: 600 },
        { red: 0, blue: 30, green: 30, spawnDelay: 500 },
    ];
    private enemiesToSpawn: { type: string, time: number }[] = [];
    private spawnTimer = 0;
    private isWaveActive = false;
    
    constructor() {
        super("TDScene");
    }

    create() {
        // Initialize Grid
        for (let y = 0; y < MAP_HEIGHT; y++) {
            this.placementGrid[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                this.placementGrid[y][x] = 0;
            }
        }

        // Create Path
        this.path = new Phaser.Curves.Path(0, 3 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(6 * TILE_SIZE + TILE_SIZE/2, 3 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(6 * TILE_SIZE + TILE_SIZE/2, 10 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(14 * TILE_SIZE + TILE_SIZE/2, 10 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(14 * TILE_SIZE + TILE_SIZE/2, 5 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(19 * TILE_SIZE + TILE_SIZE/2, 5 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(19 * TILE_SIZE + TILE_SIZE/2, 12 * TILE_SIZE + TILE_SIZE/2);
        this.path.lineTo(800, 12 * TILE_SIZE + TILE_SIZE/2);

        // Draw Path
        const graphics = this.add.graphics();
        graphics.lineStyle(TILE_SIZE, 0x8B4513, 1);
        this.path.draw(graphics);
        
        // Mark grid cells along path as blocked
        const points = this.path.getPoints(100);
        points.forEach(p => {
            const gridX = Math.floor(p.x / TILE_SIZE);
            const gridY = Math.floor(p.y / TILE_SIZE);
            if (gridY >= 0 && gridY < MAP_HEIGHT && gridX >= 0 && gridX < MAP_WIDTH) {
                this.placementGrid[gridY][gridX] = 1;
            }
        });

        // Add Grid lines
        graphics.lineStyle(1, 0xffffff, 0.1);
        for(let i=0; i<=WIDTH; i+=TILE_SIZE) { graphics.moveTo(i, 0); graphics.lineTo(i, HEIGHT); }
        for(let i=0; i<=HEIGHT; i+=TILE_SIZE) { graphics.moveTo(0, i); graphics.lineTo(WIDTH, i); }
        graphics.strokePath();

        // Groups
        this.enemies = this.add.group({ classType: Phaser.GameObjects.Arc, runChildUpdate: true });
        this.towers = this.add.group({ classType: Phaser.GameObjects.Arc, runChildUpdate: true });
        this.projectiles = this.physics.add.group();

        // Physics overlap
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy as any, undefined, this);

        // Ghost Tower for placement
        this.ghostTower = this.add.circle(-100, -100, TILE_SIZE/2 - 4, 0x888888, 0.5);
        this.ghostRange = this.add.circle(-100, -100, 100, 0xffffff, 0.2);
        this.ghostTower.setDepth(100);
        this.ghostRange.setDepth(99);
        this.ghostTower.setVisible(false);
        this.ghostRange.setVisible(false);

        // Selection highlight
        this.selectionCircle = this.add.circle(-100, -100, 100, 0xffff00, 0.2);
        this.selectionCircle.setStrokeStyle(2, 0xffff00);
        this.selectionCircle.setVisible(false);
        this.selectionCircle.setDepth(98);

        // Input
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerdown', this.onPointerDown, this);

        tdEvents.on('START_WAVE', () => { if (this.sys && this.sys.isActive()) this.startNextWave(); });
        tdEvents.on('ENTER_PLACEMENT', () => { if (this.sys && this.sys.isActive()) this.isPlacementMode = true; });
        tdEvents.on('CANCEL_PLACEMENT', () => {
            if (!this.sys || !this.sys.isActive() || !this.ghostTower) return;
            this.isPlacementMode = false;
            this.ghostTower.setVisible(false);
            this.ghostRange.setVisible(false);
        });
        tdEvents.on('UPGRADE_TOWER', (data: any) => { if (this.sys && this.sys.isActive()) this.upgradeSelectedTower(data); });
        tdEvents.on('DESELECT_TOWER', () => {
            if (!this.sys || !this.sys.isActive() || !this.selectionCircle) return;
            this.selectedTower = null;
            this.selectionCircle.setVisible(false);
        });
        tdEvents.on('SET_SPEED', (speed: number) => {
            if (!this.sys || !this.sys.isActive() || !this.tweens || !this.physics || !this.physics.world) return;
            this.gameSpeed = speed;
            this.tweens.timeScale = speed;
            this.physics.world.timeScale = 1 / speed;
        });

        this.syncState();
    }

    syncState() {
        tdEvents.emit('STATE_UPDATE', { money: this.money, lives: this.lives, wave: this.currentWave, isWaveActive: this.isWaveActive });
    }

    startNextWave() {
        if (this.currentWave >= this.waveConfig.length) return;
        this.isWaveActive = true;
        const config = this.waveConfig[this.currentWave];
        
        let t = 0;
        for(let i=0; i<config.red; i++) { this.enemiesToSpawn.push({type: 'red', time: t}); t+=config.spawnDelay; }
        for(let i=0; i<config.blue; i++) { this.enemiesToSpawn.push({type: 'blue', time: t}); t+=config.spawnDelay; }
        for(let i=0; i<config.green; i++) { this.enemiesToSpawn.push({type: 'green', time: t}); t+=config.spawnDelay; }
        
        this.enemiesToSpawn.sort((a,b) => a.time - b.time);
        this.spawnTimer = 0;
        this.syncState();
    }

    spawnEnemy(type: string) {
        let color = 0xff0000;
        let hp = 1;
        let speed = 1/10000;
        if (type === 'blue') { color = 0x0000ff; hp = 2; speed = 1.4/10000; }
        if (type === 'green') { color = 0x00ff00; hp = 3; speed = 1.8/10000; }

        const enemy = this.add.circle(0, 0, 15, color) as any;
        this.physics.add.existing(enemy);
        enemy.hp = hp;
        enemy.maxSpeed = speed;
        enemy.follower = { t: 0, vec: new Phaser.Math.Vector2() };
        
        this.enemies.add(enemy);
    }

    override update(time: number, delta: number) {
        delta *= this.gameSpeed;
        if (this.lives <= 0) return;

        // Wave Spawning
        if (this.isWaveActive && this.enemiesToSpawn.length > 0) {
            this.spawnTimer += delta;
            while (this.enemiesToSpawn.length > 0 && this.spawnTimer >= this.enemiesToSpawn[0].time) {
                this.spawnEnemy(this.enemiesToSpawn.shift()!.type);
            }
        } else if (this.isWaveActive && this.enemies.countActive() === 0 && this.enemiesToSpawn.length === 0) {
            this.isWaveActive = false;
            this.currentWave++;
            this.money += 100 + (this.currentWave * 20); // End of wave bonus
            this.syncState();
        }

        // Enemy Movement
        this.enemies.getChildren().forEach((e: any) => {
            e.follower.t += e.maxSpeed * delta;
            this.path.getPoint(e.follower.t, e.follower.vec);
            e.setPosition(e.follower.vec.x, e.follower.vec.y);
            
            if (e.follower.t >= 1) {
                this.lives -= e.hp;
                e.destroy();
                this.syncState();
                if (this.lives <= 0) tdEvents.emit('GAME_OVER');
            }
        });

        // Towers Firing
        this.towers.getChildren().forEach((t: any) => {
            t.fireTimer -= delta;
            if (t.fireTimer <= 0) {
                // Find target
                let target: any = null;
                let maxT = -1;
                this.enemies.getChildren().forEach((e: any) => {
                    const dist = Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y);
                    if (dist <= t.range && e.follower.t > maxT) {
                        maxT = e.follower.t;
                        target = e;
                    }
                });

                if (target) {
                    this.fireProjectile(t, target);
                    t.fireTimer = t.fireDelay;
                }
            }
        });
    }

    fireProjectile(tower: any, target: any) {
        const proj = this.add.circle(tower.x, tower.y, 4, 0xdddddd) as any;
        this.physics.add.existing(proj);
        this.projectiles.add(proj);
        
        proj.damage = tower.damage;
        proj.pierce = tower.pierce;
        proj.hitEnemies = new Set();
        proj.lifespan = 2000;
        
        // Calculate velocity
        const angle = Phaser.Math.Angle.Between(tower.x, tower.y, target.x, target.y);
        const speed = 600;
        proj.body.setVelocity(Math.cos(angle)*speed, Math.sin(angle)*speed);

        // Tween out lifespan
        this.tweens.add({
            targets: proj,
            alpha: 0,
            duration: proj.lifespan,
            onComplete: () => { if (proj.active) proj.destroy(); }
        });
    }

    hitEnemy(obj1: any, obj2: any) {
        const projectile = obj1.hitEnemies ? obj1 : obj2;
        const enemy = obj1.hitEnemies ? obj2 : obj1;

        if (!projectile.hitEnemies || projectile.hitEnemies.has(enemy)) return;
        projectile.hitEnemies.add(enemy);
        
        enemy.hp -= projectile.damage;
        this.money += projectile.damage; // $1 per layer popped
        this.syncState();
        
        // Degradation
        if (enemy.hp <= 0) {
            enemy.destroy();
        } else if (enemy.hp === 2) {
            enemy.fillColor = 0x0000ff;
            enemy.maxSpeed = 1.4/10000;
        } else if (enemy.hp === 1) {
            enemy.fillColor = 0xff0000;
            enemy.maxSpeed = 1/10000;
        }

        projectile.pierce--;
        if (projectile.pierce <= 0) {
            projectile.destroy();
        }
    }

    onPointerMove(pointer: Phaser.Input.Pointer) {
        if (this.isPlacementMode) {
            this.ghostTower.setVisible(true);
            this.ghostRange.setVisible(true);
            
            const gridX = Math.floor(pointer.x / TILE_SIZE);
            const gridY = Math.floor(pointer.y / TILE_SIZE);
            
            const x = gridX * TILE_SIZE + TILE_SIZE/2;
            const y = gridY * TILE_SIZE + TILE_SIZE/2;
            
            this.ghostTower.setPosition(x, y);
            this.ghostRange.setPosition(x, y);

            if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT && this.placementGrid[gridY][gridX] === 0) {
                this.ghostRange.setFillStyle(0xffffff, 0.2);
            } else {
                this.ghostRange.setFillStyle(0xff0000, 0.2);
            }
        }
    }

    onPointerDown(pointer: Phaser.Input.Pointer) {
        const gridX = Math.floor(pointer.x / TILE_SIZE);
        const gridY = Math.floor(pointer.y / TILE_SIZE);
        
        if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) return;

        if (this.isPlacementMode) {
            if (this.placementGrid[gridY][gridX] === 0 && this.money >= 200) {
                this.money -= 200;
                this.syncState();
                this.placementGrid[gridY][gridX] = 2; // Tower
                
                const x = gridX * TILE_SIZE + TILE_SIZE/2;
                const y = gridY * TILE_SIZE + TILE_SIZE/2;
                
                const tower = this.add.circle(x, y, TILE_SIZE/2 - 4, 0x9c27b0) as any;
                tower.setInteractive();
                
                // Base stats
                tower.id = `t_${Date.now()}`;
                tower.damage = 1;
                tower.range = 100;
                tower.fireDelay = 1000;
                tower.fireTimer = 0;
                tower.pierce = 1;
                
                // Upgrades
                tower.levelSpeed = 0;
                tower.levelRange = 0;
                tower.levelPower = 0;
                tower.totalSpent = 200;

                tower.on('pointerdown', (p: any, localX: any, localY: any, event: any) => {
                    event.stopPropagation();
                    if (!this.isPlacementMode) this.selectTower(tower);
                });

                this.towers.add(tower);
                
                this.isPlacementMode = false;
                this.ghostTower.setVisible(false);
                this.ghostRange.setVisible(false);
                tdEvents.emit('PLACEMENT_FINISHED');
                
                this.selectTower(tower);
            }
        } else {
            // Deselect if clicking on empty ground
            this.selectedTower = null;
            this.selectionCircle.setVisible(false);
            tdEvents.emit('TOWER_DESELECTED_BY_CLICK');
        }
    }

    selectTower(tower: any) {
        this.selectedTower = tower;
        this.selectionCircle.setPosition(tower.x, tower.y);
        this.selectionCircle.setRadius(tower.range);
        this.selectionCircle.setVisible(true);

        const tData: TowerData = {
            id: tower.id,
            x: tower.x,
            y: tower.y,
            damage: tower.damage,
            range: tower.range,
            fireDelay: tower.fireDelay,
            pierce: tower.pierce,
            levelSpeed: tower.levelSpeed,
            levelRange: tower.levelRange,
            levelPower: tower.levelPower,
            totalSpent: tower.totalSpent
        };
        tdEvents.emit('TOWER_SELECTED', tData);
    }

    upgradeSelectedTower(data: { path: string, cost: number }) {
        if (!this.selectedTower || this.money < data.cost) return;
        
        const t = this.selectedTower as any;
        this.money -= data.cost;
        t.totalSpent += data.cost;

        if (data.path === 'speed') {
            t.levelSpeed++;
            if (t.levelSpeed === 1) t.fireDelay *= 0.85;
            if (t.levelSpeed === 2) t.fireDelay *= 0.70;
        } else if (data.path === 'range') {
            t.levelRange++;
            if (t.levelRange === 1) t.range *= 1.20;
            if (t.levelRange === 2) t.range *= 1.40;
            this.selectionCircle.setRadius(t.range);
        } else if (data.path === 'power') {
            t.levelPower++;
            if (t.levelPower === 1) t.pierce += 1;
            if (t.levelPower === 2) t.damage += 1;
        }

        this.syncState();
        this.selectTower(t); // re-emit updated stats
    }
}


export function ValGameClonesV1() {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [money, setMoney] = useState(0);
    const [lives, setLives] = useState(0);
    const [wave, setWave] = useState(0);
    const [isWaveActive, setIsWaveActive] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameSpeed, setGameSpeed] = useState(1);
    
    const [selectedTower, setSelectedTower] = useState<TowerData | null>(null);
    const [placementMode, setPlacementMode] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: WIDTH,
            height: HEIGHT,
            parent: containerRef.current,
            scene: [TDScene],
            physics: {
                default: 'arcade',
                arcade: { debug: false }
            }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        tdEvents.on('STATE_UPDATE', (s: any) => {
            setMoney(s.money);
            setLives(s.lives);
            setWave(s.wave);
            setIsWaveActive(s.isWaveActive);
        });

        tdEvents.on('GAME_OVER', () => setGameOver(true));
        tdEvents.on('TOWER_SELECTED', (t: TowerData) => setSelectedTower(t));
        tdEvents.on('TOWER_DESELECTED_BY_CLICK', () => setSelectedTower(null));
        tdEvents.on('PLACEMENT_FINISHED', () => setPlacementMode(false));

        return () => {
            tdEvents.removeAllListeners();
            game.destroy(true);
        };
    }, []);

    const handleBuyTower = () => {
        if (money >= 200) {
            setPlacementMode(true);
            tdEvents.emit('ENTER_PLACEMENT');
        }
    };

    const handleCancelPlacement = () => {
        setPlacementMode(false);
        tdEvents.emit('CANCEL_PLACEMENT');
    };

    const handleUpgrade = (path: string, cost: number) => {
        if (money >= cost) {
            tdEvents.emit('UPGRADE_TOWER', { path, cost });
        }
    };

    const getUpgradeCost = (level: number) => {
        if (level === 0) return 150;
        if (level === 1) return 250;
        return 0;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            {/* HUD */}
            <Paper sx={{ p: 2, width: WIDTH, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#111' }}>
                <Typography variant="h6" color="success.main">💰 ${money}</Typography>
                <Typography variant="h6" color="error.main">❤️ {lives}</Typography>
                <Typography variant="h6" color="info.main">Wave: {wave + 1}/5</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 100 }}>
                        <Typography variant="caption" color="text.secondary">Speed: {gameSpeed}x</Typography>
                        <Slider
                            value={gameSpeed}
                            min={1}
                            max={5}
                            step={1}
                            marks
                            size="small"
                            onChange={(e, val) => {
                                setGameSpeed(val as number);
                                tdEvents.emit('SET_SPEED', val);
                            }}
                        />
                    </Box>
                    <Button 
                        variant="contained" 
                        color="primary"
                        disabled={isWaveActive || gameOver || wave >= 5}
                        onClick={() => tdEvents.emit('START_WAVE')}
                    >
                        {wave >= 5 ? "You Win!" : isWaveActive ? "Wave in Progress" : "Start Next Wave"}
                    </Button>
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                {/* GAME CANVAS */}
                <Box sx={{ position: 'relative', width: WIDTH, height: HEIGHT, border: '2px solid #333' }}>
                    <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
                    
                    {gameOver && (
                        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Typography variant="h2" color="error">GAME OVER</Typography>
                        </Box>
                    )}
                </Box>

                {/* SIDE PANEL */}
                <Stack spacing={2} sx={{ width: 250 }}>
                    <Paper sx={{ p: 2, bgcolor: '#1a1a1a' }}>
                        <Typography variant="h6" mb={2}>Shop</Typography>
                        <Button 
                            variant="outlined" 
                            fullWidth 
                            disabled={money < 200 || placementMode}
                            onClick={handleBuyTower}
                        >
                            Buy Dart Tower ($200)
                        </Button>
                        {placementMode && (
                            <Button variant="text" color="error" fullWidth onClick={handleCancelPlacement} sx={{ mt: 1 }}>
                                Cancel Placement
                            </Button>
                        )}
                    </Paper>

                    {selectedTower && (
                        <Paper sx={{ p: 2, bgcolor: '#1a1a1a', position: 'relative' }}>
                            <IconButton 
                                size="small" 
                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                onClick={() => {
                                    setSelectedTower(null);
                                    tdEvents.emit('DESELECT_TOWER');
                                }}
                            >
                                <CloseIcon fontSize="small"/>
                            </IconButton>
                            
                            <Typography variant="h6" mb={1}>Upgrades</Typography>
                            
                            {/* Path 1: Speed */}
                            <Box mb={2}>
                                <Typography variant="body2" color="text.secondary">Path 1: Speed ({selectedTower.levelSpeed}/2)</Typography>
                                <Button 
                                    size="small" 
                                    variant="contained" 
                                    disabled={selectedTower.levelSpeed >= 2 || money < getUpgradeCost(selectedTower.levelSpeed)}
                                    onClick={() => handleUpgrade('speed', getUpgradeCost(selectedTower.levelSpeed))}
                                    fullWidth
                                >
                                    {selectedTower.levelSpeed >= 2 ? 'MAX' : `Upgrade ($${getUpgradeCost(selectedTower.levelSpeed)})`}
                                </Button>
                            </Box>

                            {/* Path 2: Range */}
                            <Box mb={2}>
                                <Typography variant="body2" color="text.secondary">Path 2: Range ({selectedTower.levelRange}/2)</Typography>
                                <Button 
                                    size="small" 
                                    variant="contained" 
                                    disabled={selectedTower.levelRange >= 2 || money < getUpgradeCost(selectedTower.levelRange)}
                                    onClick={() => handleUpgrade('range', getUpgradeCost(selectedTower.levelRange))}
                                    fullWidth
                                >
                                    {selectedTower.levelRange >= 2 ? 'MAX' : `Upgrade ($${getUpgradeCost(selectedTower.levelRange)})`}
                                </Button>
                            </Box>

                            {/* Path 3: Power */}
                            <Box>
                                <Typography variant="body2" color="text.secondary">Path 3: Power ({selectedTower.levelPower}/2)</Typography>
                                <Button 
                                    size="small" 
                                    variant="contained" 
                                    disabled={selectedTower.levelPower >= 2 || money < getUpgradeCost(selectedTower.levelPower)}
                                    onClick={() => handleUpgrade('power', getUpgradeCost(selectedTower.levelPower))}
                                    fullWidth
                                >
                                    {selectedTower.levelPower >= 2 ? 'MAX' : `Upgrade ($${getUpgradeCost(selectedTower.levelPower)})`}
                                </Button>
                            </Box>
                        </Paper>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
