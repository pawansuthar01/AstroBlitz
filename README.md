# AstroBlitz - Space Dodge Game

> A fast-paced, arcade-style space survival game built with **React Native + Expo**.
> Dodge asteroids, survive as long as possible, and beat your high score!

---

## Gameplay

- **Dodge asteroids** falling from the top of the screen
- **3 lives** - lose one each time an asteroid hits you
- **Speed increases** as you survive longer (new level every 6 dodges)
- **Up to 4 simultaneous asteroids** at higher levels
- **High score** is saved locally and persists between sessions

---

## Controls

| Mode | How to use |
|---|---|
| **Tap Mode** (default) | Tap and hold left / right buttons to move the ship |
| **Tilt / Gyro Mode** | Toggle with the centre button, then tilt your phone |

> Gyro mode uses the device accelerometer. Works best on physical devices.

---

## Features

- Animated scrolling starfield - ambient space-travel feel
- Explosion effects - spark bursts when you take a hit
- Asteroid colour themes that change per level (grey -> orange -> red -> purple)
- Persistent high score via AsyncStorage
- Dual control modes - tap buttons or phone tilt (accelerometer)
- Dark space theme with neon glows throughout

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React Native** | Cross-platform mobile UI |
| **Expo** (SDK 54) | Build toolchain & native APIs |
| **expo-sensors** | Accelerometer for tilt control |
| **@react-native-async-storage** | Persistent high score storage |
| **React Hooks** | Game loop, state management |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- Expo Go app on your phone **or** Android/iOS emulator

### Install & Run

`ash
# 1. Clone the repository
git clone https://github.com/pawansuthar01/astroblitz.git
cd SpaceEscapeRunner

# 2. Install dependencies
npm install

# 3. Start the development server
npm start
`

Then scan the QR code with **Expo Go** on your phone, or press:
-  - Android emulator
- i - iOS simulator
- w - Web browser

---

## Project Structure

`
SpaceEscapeRunner/
|-- App.js              # Main game logic & all components
|-- index.js            # Entry point (registerRootComponent)
|-- app.json            # Expo app configuration
|-- package.json        # Dependencies & scripts
|-- eas.json            # EAS Build configuration
+-- assets/
    |-- icon.png                    # App icon (1024x1024)
    |-- splash-icon.png             # Splash screen image
    |-- favicon.png                 # Web favicon
    |-- android-icon-foreground.png # Android adaptive icon foreground
    |-- android-icon-background.png # Android adaptive icon background
    +-- android-icon-monochrome.png # Android monochrome icon
`

---

## Architecture

All game logic lives in App.js using a **16ms setInterval game loop** (~60 fps):

`
App.js
|-- Stars          - Animated scrolling star background
|-- Ship           - Player spaceship (fins, cockpit, thruster flame)
|-- Asteroid       - Falling obstacles (colour changes by level)
|-- Explosion      - Spark burst effect on hit
+-- CenterScreen   - Idle / Game Over overlay with logo
`

**Game Loop Logic** (every 16ms):
1. Move each asteroid down by 
ockSpeed(level) pixels
2. Check collision with ship -> lose a life, show explosion, respawn rock
3. If rock passes bottom -> +1 score, check level-up, respawn rock

---

## Build & Deploy

### EAS Build (Production APK / IPA)

`ash
npm install -g eas-cli
eas login
eas build --platform android
eas build --platform ios
`

### Local Android Build

`ash
expo run:android
`

---

## Configuration (app.json)

| Key | Value | Description |
|---|---|---|
| 
ame | AstroBlitz | Display name on home screen |
| slug | stroblitz | Unique Expo URL slug |
| ersion | 1.0.0 | App version |
| orientation | portrait | Lock to portrait mode |
| userInterfaceStyle | dark | Force dark mode |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Gyro mode not working | Only works on physical device, not simulators |
| expo-sensors crash | App gracefully falls back to tap mode |
| High score not saving | Ensure @react-native-async-storage is installed |

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Credits

Built with love using [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/)

---

**AstroBlitz** - Made with React Native + Expo
