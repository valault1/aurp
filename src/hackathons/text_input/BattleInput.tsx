import React, { useState } from "react";

type Inventory = Record<string, number>;

type Enemy = {
  hp: number;
  maxHp: number;
  loot: string[];
  sprite: string;
};

// --- UI COMPONENTS ---

const HealthBar = ({ current, max, label, color }: { current: number; max: number; label: string; color: string }) => {
  const percentage = Math.max(0, (current / max) * 100);
  return (
    <div style={{ width: "100%", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
        <span>{label}</span>
        <span>
          {current}/{max}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 12,
          background: "#333",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid #555",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: color,
            transition: "width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        />
      </div>
    </div>
  );
};

// --- LOGIC ---

const generateEnemy = (): Enemy => {
  const commonLetters = ["a", "e", "i", "o", "u", "s", "t", "r", "n", "l"];
  const rareLetters = ["q", "z", "x", "j", "k", "v", "b", "p", "y", "m"];
  const specialChars = ["!", "?", "@", ".", ",", "-", "_", "$", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]; // Added specials/numbers!

  // Pick 4-8 random characters for loot
  const lootCount = Math.floor(Math.random() * 5) + 4;

  const loot = Array.from({ length: lootCount })
    .map(() => {
      const roll = Math.random();
      const pool = roll > 0.4 ? commonLetters : roll > 0.1 ? rareLetters : specialChars;
      return pool[Math.floor(Math.random() * pool.length)];
    })
    .filter((c): c is string => typeof c === "string");

  const sprites = ["👾", "🐉", "👹", "🤖"];
  const spriteIndex = Math.floor(Math.random() * sprites.length);
  const sprite: string = sprites[spriteIndex] ?? "👾";

  return {
    hp: 60,
    maxHp: 60,
    loot,
    sprite,
  };
};

export const BattleInput = () => {
  const [view, setView] = useState<"input" | "battle">("input");
  const [inventory, setInventory] = useState<Inventory>({ q: 1, a: 2, t: 1, "!": 1 });
  const [text, setText] = useState("");

  // Combat State
  const [playerHP, setPlayerHP] = useState(100);
  const [enemy, setEnemy] = useState<Enemy>(generateEnemy());
  const [battleLog, setBattleLog] = useState("A wild text-monster appears!");
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [inputError, setInputError] = useState(false);

  // --- INPUT LOGIC ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;
    const lowerChar = key.toLowerCase();

    if (key === "Backspace") {
      e.preventDefault();
      if (text.length === 0) return;
      const lastChar = text.slice(-1).toLowerCase();
      if (lastChar !== " ") {
        setInventory((prev) => ({ ...prev, [lastChar]: (prev[lastChar] || 0) + 1 }));
      }
      setText((prev) => prev.slice(0, -1));
      return;
    }

    if (key === " ") return;
    if (key.length > 1) return;

    e.preventDefault();
    if (inventory[lowerChar] && inventory[lowerChar] > 0) {
      setInventory((prev) => ({ ...prev, [lowerChar]: (prev[lowerChar] ?? 0) - 1 }));
      setText((prev) => prev + key);
    } else {
      // TRIGGER SHAKE
      setInputError(true);
      setTimeout(() => setInputError(false), 400);
    }
  };

  // --- COMBAT LOGIC ---
  const startFight = () => {
    setEnemy(generateEnemy());
    setPlayerHP(100);
    setBattleLog("You engage the enemy!");
    setIsEnemyTurn(false);
    setView("battle");
  };

  const executeTurn = (moveName: string, baseDamage: number, heal: number = 0) => {
    if (isEnemyTurn) return;

    // 15% Crit Chance
    const isCrit = Math.random() < 0.15;
    const damage = isCrit ? baseDamage * 2 : baseDamage;

    const critText = isCrit ? "💥 CRITICAL HIT! " : "";
    setBattleLog(`${critText}You used ${moveName} for ${damage} DMG!`);

    if (damage > 0) {
      setIsHit(true);
      setTimeout(() => setIsHit(false), 300);
    }

    const newEnemyHp = Math.max(0, enemy.hp - damage);
    setEnemy((prev) => ({ ...prev, hp: newEnemyHp }));

    if (heal > 0) setPlayerHP((h) => Math.min(100, h + heal));

    if (newEnemyHp === 0) {
      setBattleLog("🏆 Enemy defeated! Claim your loot!");
      return;
    }

    setIsEnemyTurn(true);
    setTimeout(() => {
      const enemyCrit = Math.random() < 0.1; // Enemy can crit too!
      let enemyDmg = Math.floor(Math.random() * 10) + 10;
      if (enemyCrit) enemyDmg *= 2;

      setPlayerHP((h) => {
        const newHp = Math.max(0, h - enemyDmg);
        if (newHp === 0) {
          setBattleLog("💀 You died! You lost your pending loot.");
          setTimeout(() => setView("input"), 2000);
        } else {
          setBattleLog(`${enemyCrit ? "💥 " : ""}The enemy hits you for ${enemyDmg} DMG!`);
        }
        return newHp;
      });
      setIsEnemyTurn(false);
    }, 1000);
  };

  const onVictory = () => {
    const newInv = { ...inventory };
    enemy.loot.forEach((l) => {
      newInv[l] = (newInv[l] || 0) + 1;
    });
    setInventory(newInv);
    setView("input");
  };

  return (
    <div style={{ fontFamily: "sans-serif", color: "#333" }}>
      <style>
        {`
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes flashHit { 
            0% { filter: brightness(1); transform: scale(1); } 
            50% { filter: brightness(3) sepia(1) hue-rotate(-50deg); transform: scale(1.2); } 
            100% { filter: brightness(1); transform: scale(1); } 
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .sprite-idle { animation: float 2s ease-in-out infinite; display: inline-block; }
          .sprite-hit { animation: flashHit 0.3s ease-in-out; display: inline-block; }
          .input-error { animation: shake 0.1s ease-in-out 4; border: 2px solid red !important; }
        `}
      </style>

      {view === "battle" ? (
        <div
          style={{
            padding: 20,
            border: "2px solid #ff4444",
            borderRadius: 12,
            maxWidth: 400,
            background: "#1a1a1a",
            color: "white",
          }}
        >
          <HealthBar label="PLAYER" current={playerHP} max={100} color="#00ff88" />
          <HealthBar label="ENEMY" current={enemy.hp} max={enemy.maxHp} color="#ff4444" />

          <div style={{ textAlign: "center", fontSize: "5rem", margin: "30px 0" }}>
            <div className={isHit ? "sprite-hit" : "sprite-idle"}>{enemy.hp > 0 ? enemy.sprite : "💀"}</div>
            <div style={{ fontSize: "0.9rem", color: "#aaa", marginTop: 10 }}>Drops: {enemy.loot.join(" ")}</div>
          </div>

          <div
            style={{
              background: "#333",
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
              minHeight: 50,
              borderLeft: "4px solid gold",
            }}
          >
            {battleLog}
          </div>

          {enemy.hp > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button disabled={isEnemyTurn} onClick={() => executeTurn("Slash", 20)} style={btnStyle}>
                🗡️ Slash
              </button>
              <button
                disabled={isEnemyTurn}
                onClick={() => executeTurn("Slam", Math.floor(Math.random() * 35) + 5)}
                style={btnStyle}
              >
                🎲 Slam
              </button>
              <button disabled={isEnemyTurn} onClick={() => executeTurn("Heal", 0, 25)} style={btnStyle}>
                🩹 Heal
              </button>
              <button disabled={isEnemyTurn} onClick={() => setView("input")} style={btnStyle}>
                🏃 Run
              </button>
            </div>
          ) : (
            <button onClick={onVictory} style={{ ...btnStyle, background: "gold", color: "black", width: "100%" }}>
              CLAIM LOOT
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: 20, border: "2px solid #4444ff", borderRadius: 12, maxWidth: 400 }}>
          <div style={{ marginBottom: 15 }}>
            <strong>Inventory:</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {Object.entries(inventory).map(
                ([char, count]) =>
                  count > 0 && (
                    <span key={char} style={tagStyle}>
                      {char}:{count}
                    </span>
                  ),
              )}
            </div>
          </div>

          <input
            className={inputError ? "input-error" : ""}
            value={text}
            onKeyDown={handleKeyDown}
            placeholder="Enter Your Email"
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 15,
              borderRadius: 8,
              border: "1px solid #ccc",
              outline: "none",
              transition: "all 0.2s",
            }}
          />

          <button onClick={startFight} style={{ ...btnStyle, width: "100%", marginBottom: 10 }}>
            Fight for Characters ⚔️
          </button>
          <button style={{ ...btnStyle, width: "100%", opacity: 0.5 }}>Login</button>
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  background: "#444",
  color: "white",
  fontWeight: "bold",
};

const tagStyle: React.CSSProperties = {
  background: "#eee",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.9rem",
  fontFamily: "monospace",
};
