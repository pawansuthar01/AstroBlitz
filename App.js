// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────────────────────────────────────

// React: the core library. We import useState, useEffect, useRef from it.
// • useState  → stores values that change (score, position, game state)
// • useEffect → runs code when the component mounts or a value changes
// • useRef    → stores a mutable value that does NOT cause a re-render
import React, { useState, useEffect, useRef } from 'react';

// React Native components (like HTML tags, but for mobile):
// • View            → a box/container (like <div>)
// • Text            → displays text (like <p> or <span>)
// • TouchableOpacity→ a pressable area that fades when touched (like a button)
// • StyleSheet      → creates CSS-like styles
// • Dimensions      → reads the real device screen width and height
// • StatusBar       → controls the phone's top status bar look
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Dimensions.get('window') returns the real screen width and height in pixels.
// We destructure it immediately so we can use SCREEN_WIDTH / SCREEN_HEIGHT
// anywhere in the file without calling Dimensions.get() again.
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// The total pixel width of our spaceship shape.
// We define it as a constant so it's easy to change in one place.
const SHIP_WIDTH = 70;

// How many pixels the ship moves each time the player taps Left or Right.
const MOVE_STEP = 20;

// ─────────────────────────────────────────────────────────────────────────────
// STAR COMPONENT — decorative background dots
// ─────────────────────────────────────────────────────────────────────────────

// A tiny functional component that renders one star (a white circle).
// Props: x (horizontal position), y (vertical position), size (diameter)
function Star({ x, y, size }) {
  return (
    <View
      style={{
        position: 'absolute',  // placed relative to its parent View
        left: x,               // horizontal position from the left edge
        top: y,                // vertical position from the top edge
        width: size,
        height: size,
        borderRadius: size / 2, // makes a circle: radius = half the width
        backgroundColor: 'rgba(255,255,255,0.8)',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPACESHIP COMPONENT — built entirely with View shapes (no images!)
// ─────────────────────────────────────────────────────────────────────────────

// The spaceship is built from layered View boxes with specific shapes:
//   1. Engine glow     — a faint oval below the body (thruster effect)
//   2. Left fin        — a rotated triangle-like shape on the left
//   3. Right fin       — mirror of the left fin
//   4. Body            — the main oval fuselage of the ship
//   5. Cockpit         — a smaller oval on top of the body (window)
//   6. Left engine     — small round thruster pod on the left
//   7. Right engine    — small round thruster pod on the right

function Spaceship() {
  return (
    // Outer container: lays everything out relative to each other.
    // 'alignItems: center' centers all children horizontally.
    <View style={styles.shipContainer}>

      {/* ── ENGINE GLOW ─────────────────────────────────────────────────── */}
      {/* A soft purple oval that sits below the body, simulating thruster exhaust */}
      <View style={styles.engineGlow} />

      {/* ── FINS ROW ────────────────────────────────────────────────────── */}
      {/* A horizontal row that holds the left fin, body, and right fin side by side */}
      <View style={styles.shipRow}>

        {/* LEFT FIN */}
        {/* borderTopRightRadius rounds only the top-right corner,
            giving the fin a swept-back aerodynamic shape */}
        <View style={styles.finLeft} />

        {/* BODY ───────────────────────────────────────────────────────────── */}
        {/* The main fuselage: an oval created by a View with large borderRadius */}
        <View style={styles.shipBody}>

          {/* COCKPIT — a smaller oval centered inside the body */}
          {/* Represents the glass dome / pilot window */}
          <View style={styles.cockpit} />

          {/* BODY STRIPE — a thin horizontal line across the middle of the body */}
          {/* Adds visual detail, making it look like an aircraft panel */}
          <View style={styles.bodyStripe} />
        </View>

        {/* RIGHT FIN */}
        <View style={styles.finRight} />
      </View>

      {/* ── ENGINE PODS ─────────────────────────────────────────────────── */}
      {/* A row of two small engine pods below the fins row */}
      <View style={styles.engineRow}>
        <View style={styles.enginePod} />
        <View style={styles.enginePod} />
      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {

  // ── STATE VARIABLES ────────────────────────────────────────────────────────
  //
  // useState(initialValue) returns [currentValue, setterFunction].
  // When setterFunction is called, React re-renders the component with the new value.

  // Tracks whether the game is active (true) or on the start screen (false).
  const [gameStarted, setGameStarted] = useState(false);

  // The player's score — increases over time while the game runs.
  const [score, setScore] = useState(0);

  // The horizontal position (in pixels from the LEFT edge of the screen)
  // of the spaceship's left edge.
  //
  // Initial value = center of screen minus half the ship width
  // so the ship starts exactly in the middle.
  const [shipX, setShipX] = useState(SCREEN_WIDTH / 2 - SHIP_WIDTH / 2);

  // ── REFS ───────────────────────────────────────────────────────────────────
  //
  // useRef stores a value that persists across renders but does NOT trigger
  // a re-render when changed. Perfect for storing timer IDs.

  // scoreIntervalRef stores the ID of the score timer so we can clear it later.
  const scoreIntervalRef = useRef(null);

  // ── EFFECT: SCORE TICKER ───────────────────────────────────────────────────
  //
  // useEffect runs after every render where [gameStarted] changed.
  // • When gameStarted becomes TRUE  → start a timer that adds 1 to score every second.
  // • When gameStarted becomes FALSE → clear the timer and reset the score.
  // The return function inside useEffect is called "cleanup" — it runs
  // before the component unmounts or before the effect runs again.

  useEffect(() => {
    if (gameStarted) {
      // setInterval runs a function repeatedly every N milliseconds.
      // Here: every 1000ms (1 second), add 1 to score using the functional form.
      // The functional form `prev => prev + 1` ensures we always get the latest value.
      scoreIntervalRef.current = setInterval(() => {
        setScore(prev => prev + 1);
      }, 1000);
    } else {
      // When game is not started, clear the running timer (if any) and reset score.
      clearInterval(scoreIntervalRef.current);
      setScore(0);
    }

    // Cleanup: if the component is removed from the screen, stop the timer.
    return () => clearInterval(scoreIntervalRef.current);
  }, [gameStarted]); // ← only re-run this effect when gameStarted changes

  // ── MOVEMENT HANDLERS ─────────────────────────────────────────────────────
  //
  // These functions update shipX when the player presses Left or Right.
  // BOUNDARY DETECTION:
  //   Left boundary  → shipX cannot go below 0 (left edge of screen)
  //   Right boundary → shipX cannot go above SCREEN_WIDTH - SHIP_WIDTH
  //                    (right edge minus the ship's own width, so it never clips off)

  const moveLeft = () => {
    setShipX(prev => {
      // Math.max(0, ...) means: "never let the value go below 0"
      // If prev - MOVE_STEP would be negative, use 0 instead.
      const next = Math.max(0, prev - MOVE_STEP);
      return next;
    });
  };

  const moveRight = () => {
    setShipX(prev => {
      // Math.min(maxX, ...) means: "never let the value exceed the right boundary"
      const maxX = SCREEN_WIDTH - SHIP_WIDTH;
      const next = Math.min(maxX, prev + MOVE_STEP);
      return next;
    });
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    // The outermost container fills the entire screen.
    // StatusBar is hidden so the game looks full-screen.
    <View style={styles.screen}>
      <StatusBar hidden />

      {/* ── BACKGROUND STARS ──────────────────────────────────────────────── */}
      {/* These are purely decorative. We hardcode a set of positions and sizes. */}
      {/* 'pointerEvents="none"' means touches pass through to elements below. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Star x={30}  y={80}  size={3} />
        <Star x={90}  y={150} size={2} />
        <Star x={200} y={60}  size={4} />
        <Star x={280} y={200} size={2} />
        <Star x={50}  y={300} size={3} />
        <Star x={320} y={100} size={2} />
        <Star x={150} y={400} size={3} />
        <Star x={250} y={500} size={2} />
        <Star x={70}  y={550} size={4} />
        <Star x={330} y={450} size={2} />
        <Star x={180} y={250} size={3} />
        <Star x={10}  y={700} size={2} />
        <Star x={340} y={650} size={3} />
        <Star x={110} y={620} size={2} />
      </View>

      {/* ── TITLE ─────────────────────────────────────────────────────────── */}
      <Text style={styles.title}>🚀 Space Escape Runner</Text>

      {/* ── SCORE DISPLAY ─────────────────────────────────────────────────── */}
      {/* The score card has a semi-transparent background (glassmorphism effect) */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>SCORE</Text>
        {/* score.toString().padStart(5, '0') formats score as 5 digits: e.g. "00042" */}
        <Text style={styles.scoreValue}>{score.toString().padStart(5, '0')}</Text>
      </View>

      {/* ── START / STOP BUTTON ───────────────────────────────────────────── */}
      {/* TouchableOpacity: dims to 70% opacity when pressed (activeOpacity={0.7}) */}
      <TouchableOpacity
        style={[
          styles.startButton,
          // If game is started, change button color to red (stop action)
          gameStarted && styles.stopButton,
        ]}
        onPress={() => setGameStarted(prev => !prev)} // toggle true/false
        activeOpacity={0.7}
      >
        <Text style={styles.startButtonText}>
          {gameStarted ? '⏹  STOP GAME' : '▶  START GAME'}
        </Text>
      </TouchableOpacity>

      {/* ── SPACESHIP ─────────────────────────────────────────────────────── */}
      {/* 
        position: 'absolute' removes the ship from the normal layout flow.
        We manually set its left edge (shipX) and bottom edge (100px from bottom).
        When shipX changes via moveLeft/moveRight, React re-renders and the ship moves!
      */}
      <View
        style={[
          styles.shipWrapper,
          {
            left: shipX,           // ← horizontal position (updated by state)
            bottom: 100,           // ← fixed distance from the bottom of the screen
          },
        ]}
      >
        <Spaceship />
      </View>

      {/* ── MOVEMENT CONTROLS ─────────────────────────────────────────────── */}
      {/*
        This row is positioned absolutely at the very bottom of the screen.
        It uses flexDirection: 'row' to place the two buttons side by side.
        justifyContent: 'space-between' pushes Left to the far left,
        and Right to the far right.
      */}
      <View style={styles.controlsRow}>

        {/* MOVE LEFT BUTTON */}
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={moveLeft}
          activeOpacity={0.6}
        >
          {/* ◀ is a Unicode left-pointing triangle — no image needed! */}
          <Text style={styles.controlBtnText}>◀</Text>
          <Text style={styles.controlBtnLabel}>LEFT</Text>
        </TouchableOpacity>

        {/* MOVE RIGHT BUTTON */}
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={moveRight}
          activeOpacity={0.6}
        >
          <Text style={styles.controlBtnText}>▶</Text>
          <Text style={styles.controlBtnLabel}>RIGHT</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
//
// StyleSheet.create() validates your styles at compile time, giving better
// error messages than plain JS objects. Keys become style references.

const styles = StyleSheet.create({

  // ── SCREEN ────────────────────────────────────────────────────────────────
  screen: {
    flex: 1,                      // fills the entire phone screen (like height: 100vh)
    backgroundColor: '#05051a',   // very dark navy — deep space color
    alignItems: 'center',         // horizontally centers children
    paddingTop: 60,               // breathing room from top (avoids notch area)
    // position: 'relative' is default — children with position:'absolute' are
    // placed relative to THIS View.
  },

  // ── TITLE ─────────────────────────────────────────────────────────────────
  title: {
    fontSize: 26,
    fontWeight: '900',            // maximum boldness
    color: '#a78bfa',             // soft purple — neon-ish but not harsh
    letterSpacing: 2,             // spaces out each character slightly
    textShadowColor: '#7c3aed',   // glow color (slightly darker purple)
    textShadowOffset: { width: 0, height: 0 }, // no directional shadow — pure glow
    textShadowRadius: 12,         // spread of glow in pixels
    marginBottom: 24,
  },

  // ── SCORE CARD ────────────────────────────────────────────────────────────
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', // very faint white = glassmorphism
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',       // translucent purple border
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6b7280',             // muted gray
    letterSpacing: 4,             // wide spacing gives a "HUD" look
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#f0abfc',             // bright pink-purple
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],// keeps digits same width so it doesn't jump around
  },

  // ── START BUTTON ──────────────────────────────────────────────────────────
  startButton: {
    backgroundColor: '#7c3aed',   // solid purple
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 50,             // fully pill-shaped
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,             // creates a "glow" around the button
    elevation: 12,                // Android shadow
    marginBottom: 16,
  },
  stopButton: {
    backgroundColor: '#dc2626',   // red when game is running (stop action)
    shadowColor: '#dc2626',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ── SPACESHIP WRAPPER ──────────────────────────────────────────────────────
  shipWrapper: {
    position: 'absolute',         // taken OUT of normal flow — positioned manually
    // left: and bottom: are set inline in JSX using state value shipX
  },

  // ── SPACESHIP SHAPE STYLES ─────────────────────────────────────────────────

  // Outer wrapper: centers everything inside
  shipContainer: {
    alignItems: 'center',         // horizontally centers children
  },

  // Engine glow (thruster exhaust):
  // An oval that simulates flame coming from below the ship.
  engineGlow: {
    width: 30,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#fde68a',   // warm yellow
    opacity: 0.5,
    marginBottom: -4,             // negative margin pulls the body DOWN over the glow
    shadowColor: '#f97316',       // orange glow shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },

  // Row holding left fin + body + right fin
  shipRow: {
    flexDirection: 'row',         // lays children HORIZONTALLY (left to right)
    alignItems: 'flex-end',       // aligns items to the BOTTOM of the row
  },

  // Left fin: a trapezoid-like shape using selective border radii
  finLeft: {
    width: 18,
    height: 28,
    backgroundColor: '#4f46e5',   // indigo
    borderTopRightRadius: 14,     // rounds only the top-right corner
    borderBottomLeftRadius: 4,
    marginRight: -2,              // overlap slightly with body
  },

  // Right fin: mirror of the left fin
  finRight: {
    width: 18,
    height: 28,
    backgroundColor: '#4f46e5',
    borderTopLeftRadius: 14,      // rounds only the top-left corner
    borderBottomRightRadius: 4,
    marginLeft: -2,               // overlap slightly with body
  },

  // Ship body: the main oval fuselage
  shipBody: {
    width: SHIP_WIDTH,
    height: 42,
    backgroundColor: '#6366f1',   // bright indigo-violet
    borderRadius: 24,             // large radius turns the rectangle into an oval
    alignItems: 'center',         // centers cockpit & stripe horizontally
    justifyContent: 'flex-start', // stacks cockpit at the top
    paddingTop: 5,
    overflow: 'hidden',           // clips children that go outside the oval shape
    borderWidth: 1.5,
    borderColor: '#818cf8',       // lighter border gives a 3D rim effect
  },

  // Cockpit: a small oval on top of the body (the pilot window / dome)
  cockpit: {
    width: 22,
    height: 14,
    borderRadius: 11,
    backgroundColor: '#93c5fd',   // light blue — glass/ice look
    borderWidth: 1,
    borderColor: '#dbeafe',       // even lighter border to suggest reflection
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  // Horizontal stripe across the body for visual detail
  bodyStripe: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)', // very subtle white line
    marginTop: 6,
  },

  // Row of two engine pods below the fin row
  engineRow: {
    flexDirection: 'row',
    gap: 28,                      // space between the two pods
    marginTop: -4,                // pull pods up slightly under the body
  },

  // Each engine pod: a small oval thruster nozzle
  enginePod: {
    width: 14,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#312e81',   // very dark indigo
    borderWidth: 1,
    borderColor: '#4f46e5',
    shadowColor: '#f97316',       // orange glow simulating heat
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },

  // ── CONTROLS ROW ──────────────────────────────────────────────────────────
  controlsRow: {
    position: 'absolute',         // pinned to the bottom of the screen
    bottom: 0,                    // flush with the very bottom
    left: 0,
    right: 0,
    flexDirection: 'row',         // Left and Right buttons side by side
    justifyContent: 'space-between', // Left btn at far left, Right btn at far right
    paddingHorizontal: 20,        // indent from screen edges
    paddingBottom: 24,            // breathing room above the home bar (iOS notch)
    backgroundColor: 'rgba(5,5,26,0.7)', // semi-transparent to let ship show behind
  },

  // Each control button
  controlBtn: {
    width: 100,
    height: 72,
    backgroundColor: 'rgba(99,102,241,0.2)',  // very faint purple
    borderWidth: 1.5,
    borderColor: 'rgba(129,140,248,0.5)',      // translucent purple border
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // The arrow icon inside the button
  controlBtnText: {
    fontSize: 24,
    color: '#a5b4fc',             // light lavender
  },

  // "LEFT" / "RIGHT" label below the arrow
  controlBtnLabel: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
});
