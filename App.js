// ─────────────────────────────────────────────────────────────────────────────
// ASTROBLITZ — Space Dodge Game
// Features: Multiple asteroids · 3 Lives · Speed levels · Explosions · Tilt Control
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── SAFE ACCELEROMETER IMPORT ─────────────────────────────────────────────────
// We wrap the import in a try-catch so if expo-sensors has a version mismatch
// (the most common cause of the "Cannot read property GRANTED of undefined" crash),
// the app still loads — gyro mode is simply disabled instead of crashing.
let Accelerometer = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Accelerometer = require('expo-sensors').Accelerometer;
} catch (e) {
  console.warn('expo-sensors not available — gyro mode disabled:', e.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');

const SHIP_W      = 64;
const SHIP_H      = 40;
const SHIP_BOTTOM = 110;          // px above bottom bar
const SHIP_START  = SW / 2 - SHIP_W / 2;
const MOVE_STEP   = 24;

const ROCK_SIZE   = 38;
const TICK_MS     = 16;           // ~60 fps
const BASE_SPEED  = 4;            // px/tick at level 1
const SPEED_INC   = 0.8;         // extra px/tick per level
const LEVEL_EVERY = 6;           // dodges before next level
const MAX_ROCKS   = 4;           // cap at 4 simultaneous asteroids

const HS_KEY = 'SER_HighScore_v2';

// Asteroid color theme by level
const ROCK_THEME = [
  { body: '#78716c', border: '#57534e', glow: '#a8a29e' }, // L1 grey
  { body: '#92400e', border: '#78350f', glow: '#f97316' }, // L2 orange
  { body: '#7f1d1d', border: '#991b1b', glow: '#ef4444' }, // L3 red
  { body: '#4c1d95', border: '#5b21b6', glow: '#a78bfa' }, // L4 purple
];

const rockTheme = (level) => ROCK_THEME[Math.min(level - 1, ROCK_THEME.length - 1)];
const numRocks  = (level) => Math.min(1 + Math.floor((level - 1) / 2), MAX_ROCKS);
const rockSpeed = (level) => BASE_SPEED + (level - 1) * SPEED_INC;

const randX = () => Math.floor(Math.random() * (SW - ROCK_SIZE));
const makeRock = (id, delayY = 0) => ({
  id,
  x: randX(),
  y: -ROCK_SIZE - Math.random() * 200 - delayY, // stagger spawn
});

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED SCROLLING STARS
// ─────────────────────────────────────────────────────────────────────────────
//
// Stars are rendered at their base Y + a scrolling offset.
// The offset increases every 20ms, making stars drift downward (space-travel feel).
// We render each star TWICE (offset + offset - SH) so there's no gap when it wraps.
//
// starOffset goes from 0 → SH, then resets to 0 (seamless loop).
// Speed: 1px per 20ms = 50 px/second — slow enough to feel ambient.

const STAR_DATA = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  x:    Math.random() * SW,
  baseY: Math.random() * SH,          // starting position
  s:    1 + Math.random() * 3,         // size 1–4 px
  o:    0.3 + Math.random() * 0.7,    // opacity 0.3–1.0
  speed: 0.4 + Math.random() * 1.2,  // individual drift speed multiplier
}));

// Stars component receives `offset` from the parent so one interval drives all stars
function Stars({ offset }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STAR_DATA.map(st => {
        // Compute scrolled Y — wraps around using modulo
        const y = (st.baseY + offset * st.speed) % SH;
        return (
          <React.Fragment key={st.id}>
            {/* Primary star */}
            <View style={{
              position: 'absolute', left: st.x,
              top: y,
              width: st.s, height: st.s, borderRadius: st.s / 2,
              backgroundColor: `rgba(255,255,255,${st.o})`,
            }} />
            {/* Duplicate shifted up by SH — fills the gap as the star exits bottom */}
            <View style={{
              position: 'absolute', left: st.x,
              top: y - SH,
              width: st.s, height: st.s, borderRadius: st.s / 2,
              backgroundColor: `rgba(255,255,255,${st.o})`,
            }} />
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPACESHIP — sleeker, minimal shapes
// ─────────────────────────────────────────────────────────────────────────────

function Ship({ thrusting }) {
  return (
    <View style={s.ship}>
      {/* Thruster flame — grows when button held */}
      <View style={[s.flame, thrusting && s.flameBig]} />

      {/* Main body */}
      <View style={s.shipBody}>
        <View style={s.cockpit} />
      </View>

      {/* Left / right fins */}
      <View style={s.finLeft} />
      <View style={s.finRight} />

      {/* Engine pods */}
      <View style={s.pods}>
        <View style={s.pod} />
        <View style={s.pod} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASTEROID — color changes by level
// ─────────────────────────────────────────────────────────────────────────────

function Asteroid({ x, y, level }) {
  const theme = rockTheme(level);
  return (
    <View style={[s.rockWrap, { left: x, top: y }]}>
      {/* Outer glow ring */}
      <View style={[s.rockGlow, { shadowColor: theme.glow }]} />
      {/* Rock body */}
      <View style={[s.rockBody, {
        backgroundColor: theme.body,
        borderColor: theme.border,
        shadowColor: theme.glow,
      }]}>
        <View style={s.crater1} />
        <View style={s.crater2} />
        <View style={s.rockShine} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLOSION EFFECT — burst of circles when a life is lost
// ─────────────────────────────────────────────────────────────────────────────

function Explosion({ x, y }) {
  const sparks = [
    { dx: -22, dy: -20, c: '#f97316', r: 10 },
    { dx:  22, dy: -20, c: '#ef4444', r:  8 },
    { dx:   0, dy: -30, c: '#fbbf24', r: 12 },
    { dx: -30, dy:   5, c: '#f97316', r:  7 },
    { dx:  30, dy:   5, c: '#ef4444', r:  9 },
    { dx:  -8, dy:  25, c: '#fbbf24', r:  8 },
    { dx:   8, dy:  25, c: '#f97316', r:  6 },
  ];
  return (
    <View style={{ position: 'absolute', left: x, top: y }} pointerEvents="none">
      {sparks.map((sp, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: sp.dx, top: sp.dy,
          width: sp.r, height: sp.r,
          borderRadius: sp.r / 2,
          backgroundColor: sp.c,
          opacity: 0.9,
          shadowColor: sp.c,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
        }} />
      ))}
      {/* Centre flash */}
      <View style={{
        position: 'absolute', left: -16, top: -16,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(251,191,36,0.4)',
      }} />
    </View>
  );
}

// Level-up banner removed — level shows in HUD pill only (less intrusive)

// ─────────────────────────────────────────────────────────────────────────────
// IDLE / GAME-OVER SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function CenterScreen({ gameState, score, highScore, onStart }) {
  const isOver = gameState === 'gameover';
  return (
    <View style={s.centerOverlay}>
      <View style={s.centerCard}>
        {/* App logo — always visible on idle and game-over screens */}
        <Image
          source={require('./assets/icon.png')}
          style={s.logoImage}
          resizeMode="contain"
        />
        {isOver && <Text style={s.centerEmoji}>💥</Text>}
        <Text style={s.centerTitle}>
          {isOver ? 'GAME OVER' : 'ASTROBLITZ'}
        </Text>
        {isOver && (
          <>
            <Text style={s.centerSubLabel}>YOUR SCORE</Text>
            <Text style={s.centerBigScore}>{score.toString().padStart(4, '0')}</Text>
            <Text style={s.centerSubLabel}>BEST  {highScore.toString().padStart(4, '0')}</Text>
          </>
        )}
        {!isOver && (
          <Text style={s.centerHint}>Dodge the asteroids.{'\n'}Survive as long as possible.</Text>
        )}
        <TouchableOpacity style={s.tapBtn} onPress={onStart} activeOpacity={0.75}>
          <Text style={s.tapBtnText}>{isOver ? '▶  PLAY AGAIN' : '▶  TAP TO PLAY'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {

  // ── GAME STATE ─────────────────────────────────────────────────────────────
  // 'idle' → start screen  |  'playing' → game running  |  'gameover' → dead
  const [gameState,  setGameState]  = useState('idle');
  const [score,      setScore]      = useState(0);
  const [lives,      setLives]      = useState(3);
  const [level,      setLevel]      = useState(1);
  const [shipX,      setShipX]      = useState(SHIP_START);
  const [rocks,      setRocks]      = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [highScore,  setHighScore]  = useState(0);
  const [thrusting,  setThrusting]  = useState(false); // for flame animation

  // ── STAR SCROLL OFFSET ──────────────────────────────────────────────────────
  // starOffset increases every 20ms → stars drift downward smoothly.
  // Runs always (idle + playing + gameover) for ambient feel.
  const [starOffset, setStarOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStarOffset(prev => (prev + 1) % SH);
    }, 20); // 50fps star scroll — lighter than 60fps game loop
    return () => clearInterval(id);
  }, []);

  // ── REFS (always-fresh values for game loop) ────────────────────────────────
  const shipXRef     = useRef(SHIP_START);
  const livesRef     = useRef(3);
  const scoreRef     = useRef(0);
  const levelRef     = useRef(1);
  const loopRef      = useRef(null);
  const explIdRef    = useRef(0);
  const hsRef        = useRef(0);        // mirrors highScore for loop access

  // ── LOAD HIGH SCORE ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(HS_KEY);
        if (v) { const n = parseInt(v, 10); setHighScore(n); hsRef.current = n; }
      } catch (_) {}
    })();
  }, []);

  // ── SAVE HIGH SCORE ─────────────────────────────────────────────────────────
  const maybeSaveHS = useCallback(async (finalScore) => {
    if (finalScore > hsRef.current) {
      hsRef.current = finalScore;
      setHighScore(finalScore);
      try { await AsyncStorage.setItem(HS_KEY, String(finalScore)); } catch (_) {}
    }
  }, []);

  // ── HANDLE GAME OVER (called from loop) ────────────────────────────────────
  const doGameOver = useCallback(() => {
    clearInterval(loopRef.current);
    setGameState('gameover');
    maybeSaveHS(scoreRef.current);
  }, [maybeSaveHS]);

  const doGameOverRef = useRef(doGameOver);
  doGameOverRef.current = doGameOver;

  // ── TRIGGER EXPLOSION EFFECT ────────────────────────────────────────────────
  // Creates a short-lived explosion at (x, y) that auto-removes after 550ms
  const spawnExplosion = useCallback((x, y) => {
    const id = explIdRef.current++;
    setExplosions(prev => [...prev, { id, x, y }]);
    setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 550);
  }, []);

  const spawnExplosionRef = useRef(spawnExplosion);
  spawnExplosionRef.current = spawnExplosion;

  // ── THE GAME LOOP ───────────────────────────────────────────────────────────
  //
  // Runs every 16ms. Each tick:
  //   1. Move every asteroid down by rockSpeed(level) pixels
  //   2. Collision check: does any rock overlap the ship?
  //      YES → lose a life, respawn that rock, show explosion
  //            if lives hit 0 → game over
  //   3. Bottom check: did rock pass bottom?
  //      YES → +1 score, check level-up, respawn rock

  const gameLoop = useCallback(() => {
    const spd  = rockSpeed(levelRef.current);
    const curX = shipXRef.current;

    // Pre-compute ship bounding box (top-coordinate system)
    const shipTop    = SH - SHIP_BOTTOM - SHIP_H;
    const shipBottom = SH - SHIP_BOTTOM;
    const shipRight  = curX + SHIP_W;

    setRocks(prev => {
      return prev.map(rock => {
        const nextY = rock.y + spd;

        // ── COLLISION ───────────────────────────────────────────────────────
        const hitX = (rock.x + ROCK_SIZE > curX) && (rock.x < shipRight);
        const hitY = (nextY + ROCK_SIZE > shipTop) && (nextY < shipBottom);

        if (hitX && hitY) {
          // Lose a life
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);

          // Show explosion centred on the rock
          setTimeout(() => {
            spawnExplosionRef.current(rock.x + ROCK_SIZE / 2, nextY + ROCK_SIZE / 2);
          }, 0);

          if (newLives <= 0) {
            // No lives left → game over
            setTimeout(() => doGameOverRef.current(), 0);
            return { ...rock, y: nextY }; // freeze in place briefly
          }
          // Still has lives → respawn rock at top
          return { ...rock, x: randX(), y: -ROCK_SIZE };
        }

        // ── PASSED THE BOTTOM ────────────────────────────────────────────────
        if (nextY > SH - SHIP_BOTTOM) {
          const newScore = scoreRef.current + 1;
          scoreRef.current = newScore;
          setScore(newScore);

          // Level up every LEVEL_EVERY dodges
          const newLevel = Math.floor(newScore / LEVEL_EVERY) + 1;
          if (newLevel > levelRef.current) {
            levelRef.current = newLevel;
            setLevel(newLevel);
            // Level change reflected in HUD pill — no disruptive popup
          }

          return { ...rock, x: randX(), y: -ROCK_SIZE - Math.random() * 100 };
        }

        // Normal fall
        return { ...rock, y: nextY };
      });
    });
  }, []);

  // ── START / RESTART GAME ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    // Reset all state
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    shipXRef.current = SHIP_START;

    setScore(0);
    setLives(3);
    setLevel(1);
    setShipX(SHIP_START);
    setExplosions([]);
    setGameState('playing');

    // Spawn initial rocks (start with 1, loop adds more as level rises)
    setRocks([makeRock(0, 0), makeRock(1, 120), makeRock(2, 280)].slice(0, numRocks(1)));

    // Start the game loop
    clearInterval(loopRef.current);
    loopRef.current = setInterval(gameLoop, TICK_MS);
  }, [gameLoop]);

  // ── KEEP ROCK COUNT IN SYNC WITH LEVEL ─────────────────────────────────────
  // When level increases, add extra rocks up to the max for that level
  useEffect(() => {
    if (gameState !== 'playing') return;
    const needed = numRocks(level);
    setRocks(prev => {
      if (prev.length >= needed) return prev;
      const extras = Array.from({ length: needed - prev.length }, (_, i) =>
        makeRock(Date.now() + i, 150 * (i + 1))
      );
      return [...prev, ...extras];
    });
  }, [level, gameState]);

  // ── STOP LOOP ON UNMOUNT ────────────────────────────────────────────────────
  useEffect(() => () => clearInterval(loopRef.current), []);

  // ── HOLD-TO-MOVE REFS ───────────────────────────────────────────────────────
  // holdIntervalRef stores the repeat timer that fires while finger is held.
  // When user lifts finger (onPressOut), we clear it → ship stops.
  const holdIntervalRef = useRef(null);

  // Core move functions — called immediately on press AND every 80ms while held
  const doMoveLeft = () => {
    setThrusting(true);
    setShipX(prev => {
      const n = Math.max(0, prev - MOVE_STEP);
      shipXRef.current = n;
      return n;
    });
  };
  const doMoveRight = () => {
    setThrusting(true);
    setShipX(prev => {
      const n = Math.min(SW - SHIP_W, prev + MOVE_STEP);
      shipXRef.current = n;
      return n;
    });
  };

  // onPressIn → move once immediately, then start repeat every 80ms
  const startMoveLeft = () => {
    doMoveLeft();
    holdIntervalRef.current = setInterval(doMoveLeft, 80);
  };
  const startMoveRight = () => {
    doMoveRight();
    holdIntervalRef.current = setInterval(doMoveRight, 80);
  };

  // onPressOut → stop repeating and stop thruster flame
  const stopMove = () => {
    clearInterval(holdIntervalRef.current);
    setThrusting(false);
  };

  // ── GYROSCOPE / ACCELEROMETER CONTROL ─────────────────────────────────────
  //
  // HOW IT WORKS:
  //   The phone's accelerometer measures gravity pulling on each axis.
  //   When you tilt the phone LEFT:  x becomes negative (gravity pulls left)
  //   When you tilt the phone RIGHT: x becomes positive (gravity pulls right)
  //
  //   DEAD ZONE (0.12): small tilts below this threshold are ignored
  //   so the ship doesn't drift when held flat.
  //
  //   SENSITIVITY (28): multiplier that converts the tilt amount (0–1)
  //   into pixels per update. Higher = ship moves faster per degree of tilt.
  //
  //   setUpdateInterval(16): sensor fires ~60 times/second (matches game loop).

  const [gyroMode, setGyroMode] = useState(false); // false = tap buttons, true = tilt
  const gyroRef  = useRef(false);                  // ref so subscription sees latest value
  gyroRef.current = gyroMode;

  const DEAD_ZONE    = 0.12;   // ignore tilts smaller than this
  const SENSITIVITY  = 30;     // pixels per tick at maximum tilt

  useEffect(() => {
    if (!gyroMode) return;
    // If expo-sensors failed to load (version mismatch), disable gyro gracefully
    if (!Accelerometer) {
      setGyroMode(false);
      return;
    }

    // Set how often the sensor fires (every 16ms ≈ 60fps)
    Accelerometer.setUpdateInterval(16);

    // addListener returns a subscription object
    const sub = Accelerometer.addListener(({ x }) => {
      // x is roughly in range -1 (full left tilt) to +1 (full right tilt)
      // We negate x because phone portrait mode x-axis is mirrored
      // relative to screen left/right on most devices.
      // If your phone feels inverted, change `-x` to `x` below.
      const tilt = -x;

      if (Math.abs(tilt) < DEAD_ZONE) return; // inside dead zone — do nothing

      // Calculate step: proportional to how far the phone is tilted
      // tilt goes from 0 (edge of dead zone) to ~1 (phone fully sideways)
      const step = (Math.abs(tilt) - DEAD_ZONE) * SENSITIVITY;

      setThrusting(true);

      if (tilt < 0) {
        // Tilted LEFT → move ship left
        setShipX(prev => {
          const n = Math.max(0, prev - step);
          shipXRef.current = n;
          return n;
        });
      } else {
        // Tilted RIGHT → move ship right
        setShipX(prev => {
          const n = Math.min(SW - SHIP_W, prev + step);
          shipXRef.current = n;
          return n;
        });
      }

      // Auto-clear thruster flame when tilt is very small
      if (Math.abs(tilt) < DEAD_ZONE + 0.05) setThrusting(false);
    });

    // Cleanup: remove sensor listener when gyro mode is turned off
    return () => {
      sub.remove();
      setThrusting(false);
    };
  }, [gyroMode]); // re-runs when gyroMode toggles ON or OFF

  // Sync shipX ref on every render (backup)
  shipXRef.current = shipX;

  // ── LIVES DISPLAY ───────────────────────────────────────────────────────────
  const heartsDisplay = ['❤️', '❤️', '❤️'].map((h, i) =>
    i < lives ? h : '🖤'
  ).join(' ');

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <StatusBar hidden />
      {/* Pass starOffset so stars scroll — driven by the 20ms interval above */}
      <Stars offset={starOffset} />

      {/* ── MINIMAL HUD ─────────────────────────────────────────────────────── */}
      <View style={s.hud}>
        <Text style={s.hudScore}>{score.toString().padStart(4, '0')}</Text>
        <View style={s.levelPill}>
          <Text style={s.levelPillText}>LV {level}</Text>
        </View>
        {/* Gyro indicator dot — glows cyan when tilt mode is active */}
        <View style={[s.gyroDot, gyroMode && s.gyroDotActive]} />
        <Text style={s.hudLives}>{heartsDisplay}</Text>
      </View>

      {/* High score — small, below HUD */}
      <Text style={s.hudBest}>🏆 {highScore.toString().padStart(4, '0')}</Text>

      {/* Level change is shown in the HUD pill above — no popup banner */}

      {/* ── ASTEROIDS ────────────────────────────────────────────────────────── */}
      {gameState === 'playing' && rocks.map(rock => (
        <Asteroid key={rock.id} x={rock.x} y={rock.y} level={level} />
      ))}

      {/* ── EXPLOSIONS ───────────────────────────────────────────────────────── */}
      {explosions.map(ex => (
        <Explosion key={ex.id} x={ex.x - 16} y={ex.y - 16} />
      ))}

      {/* ── SPACESHIP ────────────────────────────────────────────────────────── */}
      <View style={[s.shipWrap, { left: shipX, bottom: SHIP_BOTTOM }]}>
        <Ship thrusting={thrusting} />
      </View>

      {/* ── IDLE / GAME OVER SCREEN ──────────────────────────────────────────── */}
      {gameState !== 'playing' && (
        <CenterScreen
          gameState={gameState}
          score={score}
          highScore={highScore}
          onStart={startGame}
        />
      )}

      {/* ── CONTROLS ─────────────────────────────────────────────────────────── */}
      {/*
        GYRO MODE ON:  tap-buttons dim to 15% opacity (still tappable as backup)
                       ship is controlled by tilting the phone.
        GYRO MODE OFF: full-opacity tap buttons, hold to keep moving.

        Centre button toggles between the two modes.
        📳 = tap mode  |  🌀 = gyro/tilt mode
      */}
      <View style={s.controls}>

        {/* LEFT tap button — dims when gyro is on */}
        <TouchableOpacity
          style={[s.ctrlBtn, gyroMode && s.ctrlBtnDimmed]}
          onPressIn={startMoveLeft}
          onPressOut={stopMove}
          activeOpacity={0.4}
        >
          <Text style={s.ctrlArrow}>◀</Text>
        </TouchableOpacity>

        {/* CENTRE: gyro toggle button */}
        <TouchableOpacity
          style={s.gyroToggleBtn}
          onPress={() => setGyroMode(prev => !prev)}
          activeOpacity={0.7}
        >
          <Text style={s.gyroToggleIcon}>{gyroMode ? '🌀' : '📳'}</Text>
          <Text style={s.gyroToggleLabel}>{gyroMode ? 'TILT' : 'TAP'}</Text>
        </TouchableOpacity>

        {/* RIGHT tap button — dims when gyro is on */}
        <TouchableOpacity
          style={[s.ctrlBtn, gyroMode && s.ctrlBtnDimmed]}
          onPressIn={startMoveRight}
          onPressOut={stopMove}
          activeOpacity={0.4}
        >
          <Text style={s.ctrlArrow}>▶</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — Dark space theme, minimal and clean
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: '#030311',
    overflow: 'hidden',
  },

  // ── HUD ──────────────────────────────────────────────────────────────────────
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  hudScore: {
    fontSize: 28,
    fontWeight: '900',
    color: '#e2e8f0',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    textShadowColor: '#818cf8',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  levelPill: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  levelPillText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hudLives: {
    fontSize: 18,
    letterSpacing: 2,
  },
  hudBest: {
    textAlign: 'center',
    fontSize: 11,
    color: '#fbbf24',
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 4,
  },

  // ── LEVEL BANNER ─────────────────────────────────────────────────────────────
  levelBanner: {
    position: 'absolute',
    top: SH * 0.3,
    alignSelf: 'center',
    backgroundColor: 'rgba(124,58,237,0.85)',
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 20,
  },
  levelBannerText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
  },

  // ── SPACESHIP ─────────────────────────────────────────────────────────────────
  shipWrap: {
    position: 'absolute',
    width: SHIP_W,
    alignItems: 'center',
  },
  ship: {
    width: SHIP_W,
    height: SHIP_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Main oval body
  shipBody: {
    position: 'absolute',
    width: SHIP_W,
    height: SHIP_H,
    backgroundColor: '#4f46e5',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#818cf8',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  cockpit: {
    width: 20,
    height: 12,
    borderRadius: 10,
    backgroundColor: '#7dd3fc',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  finLeft: {
    position: 'absolute',
    left: -2,
    bottom: 0,
    width: 16,
    height: 24,
    backgroundColor: '#3730a3',
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 4,
  },
  finRight: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 16,
    height: 24,
    backgroundColor: '#3730a3',
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 4,
  },
  pods: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    gap: 24,
  },
  pod: {
    width: 12,
    height: 9,
    borderRadius: 4,
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4f46e5',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  // Thruster flame below pods — toggles when moving
  flame: {
    position: 'absolute',
    bottom: -18,
    width: 22,
    height: 12,
    borderRadius: 8,
    backgroundColor: '#fde68a',
    opacity: 0.4,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  flameBig: {
    height: 20,
    opacity: 0.9,
    width: 28,
    bottom: -24,
  },

  // ── ASTEROID ──────────────────────────────────────────────────────────────────
  rockWrap: {
    position: 'absolute',
    width: ROCK_SIZE,
    height: ROCK_SIZE,
  },
  rockGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: ROCK_SIZE + 8,
    height: ROCK_SIZE + 8,
    borderRadius: (ROCK_SIZE + 8) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    backgroundColor: 'transparent',
  },
  rockBody: {
    width: ROCK_SIZE,
    height: ROCK_SIZE,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  crater1: {
    position: 'absolute',
    width: 10, height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    top: 7, left: 5,
  },
  crater2: {
    position: 'absolute',
    width: 7, height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    top: 18, left: 18,
  },
  rockShine: {
    position: 'absolute',
    width: 9, height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    top: 4, right: 4,
  },

  // ── CONTROLS ──────────────────────────────────────────────────────────────────
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHIP_BOTTOM + 4,
    flexDirection: 'row',
    backgroundColor: 'rgba(3,3,17,0.75)',
  },
  ctrlBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlArrow: {
    fontSize: 32,
    color: 'rgba(165,180,252,0.5)',
  },
  ctrlDivider: {
    width: 1,
    marginVertical: 18,
    backgroundColor: 'rgba(99,102,241,0.2)',
  },

  // ── IDLE / GAME OVER OVERLAY ──────────────────────────────────────────────────
  centerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(3,3,17,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCard: {
    width: SW * 0.8,
    backgroundColor: 'rgba(10,10,35,0.98)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  // App logo image — shown on idle + game-over screens
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 22,
    marginBottom: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
  },
  centerEmoji: {
    fontSize: 42,
    marginBottom: 6,
  },
  centerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#e0e7ff',
    letterSpacing: 5,
    marginBottom: 16,
    textShadowColor: '#6366f1',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  centerSubLabel: {
    fontSize: 10,
    color: '#6b7280',
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: 4,
  },
  centerBigScore: {
    fontSize: 56,
    fontWeight: '900',
    color: '#f0abfc',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
    textShadowColor: '#a855f7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  centerHint: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  tapBtn: {
    marginTop: 28,
    backgroundColor: '#6d28d9',
    paddingHorizontal: 44,
    paddingVertical: 16,
    borderRadius: 50,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 14,
  },
  tapBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // ── GYRO INDICATOR DOT (in HUD) ──────────────────────────────────────────────
  // A tiny dot next to the level pill — grey when off, cyan when gyro is active.
  gyroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#374151',   // grey = tap mode
    marginRight: 4,
  },
  gyroDotActive: {
    backgroundColor: '#22d3ee',   // bright cyan = tilt mode active
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // ── GYRO TOGGLE BUTTON (centre of controls bar) ──────────────────────────────
  // A compact button between ◀ and ▶ that switches control mode.
  gyroToggleBtn: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(34,211,238,0.08)',  // very faint cyan background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  gyroToggleIcon: {
    fontSize: 22,
  },
  gyroToggleLabel: {
    fontSize: 8,
    color: '#22d3ee',
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },

  // ── DIMMED TAP BUTTON (when gyro mode is on) ─────────────────────────────────
  // Tap buttons still exist in gyro mode as a fallback, but are nearly invisible.
  ctrlBtnDimmed: {
    opacity: 0.15,
  },
});
