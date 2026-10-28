<h1 align="center">🎮 Mini Royale 2D</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-Vanilla%20JS-f7df1e?style=for-the-badge&logo=javascript" />
  <img src="https://img.shields.io/badge/Renderer-HTML5%20Canvas-e34c26?style=for-the-badge&logo=html5" />
  <img src="https://img.shields.io/badge/Audio-Web%20Audio%20API-a855f7?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Size-3%20Files-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/github/license/techn13/mini-royal-2d?style=for-the-badge" />
</p>

<p align="center">
  A browser-based, single-player battle royale where you fight through a dynamic arena against nine AI opponents. Built with HTML, CSS, JavaScript, and native browser APIs—no game engine, external libraries, or downloaded game assets required.
</p>

<p align="center">
  <a href="https://techn13.github.io/mini-royal-2d/"><strong>▶ PLAY MINI ROYALE 2D</strong></a>
</p>

> **Online demo:** The play link uses GitHub Pages. If it currently returns 404, complete the one-time Pages setup in [How to Run](#-how-to-run), then rerun the deployment workflow.

---

## About

**Mini Royale 2D** is a lightweight, top-down battle royale game that runs directly in a modern web browser. Enter a large arena, face nine AI-controlled opponents, collect weapons and supplies, and stay inside the shrinking safe zone. A match ends when you are eliminated or become the last combatant standing.

The game is implemented with the HTML5 Canvas 2D API and plain JavaScript. A camera follows the player across a world larger than the visible screen, while a delta-time game loop keeps movement and effects consistent across different frame rates. Opponents use a finite-state AI to explore, pursue nearby combatants, and move back toward safety. Weapons, pickups, collision detection, the minimap, and match effects are handled in the game code; sound effects are synthesized at runtime with the Web Audio API.

The project is designed to be easy to play, inspect, and extend: it has no build step, package installation, game engine, or third-party runtime dependency. Open the game locally for a quick match, or publish the static files with GitHub Pages so other players can play from the browser.

## Gameplay recording

[▶ Watch the gameplay recording](docs/gameplay.mp4)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗺️ **1400×1000 World Map** | Larger than the viewport; dynamic camera follows player |
| 🤖 **9 AI Bots w/ FSM** | States: `WANDER → CHASE → RETREAT_ZONE`, with obstacle-aware steering |
| 🔫 **4 Weapon Types** | Pistol (∞), Shotgun, Assault Rifle, Sniper — each with unique fire rate, spread, damage |
| 💊 **Pickup System** | Weapon crates, Medkits (+40 HP), Shield Potions (+25 Shield) |
| ⛈️ **Shrinking Safe Zone** | Storm damages anyone outside; zone moves & shrinks each phase |
| 🎵 **Procedural Audio** | Synthesised sound effects via Web Audio API — **zero audio files** |
| 📡 **Radar Minimap** | Live positions of all combatants + zone ring |
| 📋 **Kill Feed** | Real-time elimination log; player kills highlighted in green |
| ⏸ **Pause System** | ESC or P pauses mid-match |
| ⚡ **DeltaTime Game Loop** | Frame-rate independent — plays identically at 60 Hz and 144 Hz |
| 💥 **Particle Effects** | Blood splats, hit sparks, storm shimmer, loot glow |
| 🏆 **End Screen** | "WINNER WINNER CHICKEN DINNER!" or "ELIMINATED!" + match stats |

---

## 🎮 Controls

| Input | Action |
|---|---|
| `W A S D` / Arrow Keys | Move |
| Mouse | Aim (cursor position in world space) |
| Left Click / Space | Shoot |
| Walk over pickup | Auto-collect |
| `ESC` / `P` | Pause / Resume |

---

## 🚀 How to Run

### Option 1 — Just Open It (Simplest)
```bash
# No server needed — just double-click
index.html
```
Open `index.html` directly in any modern browser (Chrome, Firefox, Edge).

### Option 2 — Local Dev Server (Recommended)
```bash
# Using VS Code Live Server extension, or:
npx serve .
# Then open http://localhost:3000
```

### Option 3 — GitHub Pages (Live Demo)
The repository includes a GitHub Actions workflow that publishes the game from the repository root.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy to GitHub Pages** and select **Run workflow** (or push a commit to `main`).
4. Wait for the workflow to complete successfully. The public game will then be available at **[techn13.github.io/mini-royal-2d](https://techn13.github.io/mini-royal-2d/)**.

If the play link still returns 404, check the latest **Deploy to GitHub Pages** run under the repository's Actions tab. The Pages site must be enabled and the deployment workflow must finish successfully before the link becomes available.

---

## 🛠️ Tech Stack

```
HTML5 Canvas 2D   — All rendering (world, characters, UI, minimap)
Web Audio API     — Synthesised SFX (oscillator + gain nodes)
Vanilla JS ES6+   — Game engine, OOP (Character class), FSM AI, deltaTime loop
CSS3              — Glassmorphism HUD, animations, modal overlays
```
**No bundler. No framework. No dependencies. The HTML, CSS, and JavaScript are kept in separate files.**

---

## 🧠 Architecture

```
gameLoop(timestamp)          ← requestAnimationFrame, deltaTime calculated here
  ├── updateZone(dt)         ← lerp-based shrink (frame-rate independent)
  ├── Character.update(dt)   ← player input OR AI FSM
  │     ├── _updatePlayer(dt)
  │     └── _updateAI(dt)    ← steerAround() avoids obstacles
  ├── updateBullets(dt)      ← AABB vs obstacles, circle vs characters
  ├── updateParticles(dt)    ← life in seconds, velocity in px/s
  └── updateDamageNums(dt)   ← floating numbers drift upward
```

**AI State Machine:**
```
RETREAT_ZONE  (priority 1 — outside storm)
      ↓
CHASE         (priority 2 — enemy within 320px)
      ↓
WANDER        (priority 3 — explore map)
```

---

## 📁 File Structure

```
mini-royale-2d/
├── index.html          ← Game markup
├── style.css           ← Game styles
├── script.js           ← Game logic
├── README.md           ← This file
└── .github/
    └── workflows/
        └── deploy.yml  ← Auto-deploy to GitHub Pages on push
```

---

## 💡 What I Learned

Building this project deepened my understanding of:

- **Canvas 2D API** — coordinate transforms, clipping paths (inverted circle for storm tint), `ctx.save()/restore()` patterns
- **Game Loop Architecture** — `requestAnimationFrame` vs `setInterval`, why deltaTime matters, and how to prevent the "spiral of death" with a frame cap
- **Web Audio API** — creating synthesised sound effects entirely in code using `OscillatorNode`, `GainNode`, and frequency/gain envelopes without any audio assets
- **OOP in game design** — using a single `Character` class for both player and AI, with behaviour delegated via the `isBot` flag
- **AI Finite State Machine** — implementing a simple 3-state FSM (WANDER / CHASE / RETREAT) and why bot priority order matters
- **Collision Detection** — AABB vs circle, axis-separated sliding resolution, and ray-casting-style lookahead for AI steering (`steerAround`)
- **Camera Systems** — world-to-viewport transforms, clamping to world edges, converting mouse screen coordinates to world coordinates

---

## 🔮 Planned Improvements

- [ ] Spatial hash grid for O(1) bullet–entity collision (performance)
- [ ] Difficulty selector (Easy / Medium / Hard)
- [ ] `localStorage` high score / fastest win tracker
- [ ] Refactor into ES Modules (`engine.js`, `entities.js`, `audio.js`)
- [ ] Mobile touch controls
- [ ] More map variety (water tiles, bridges)

---

## 📄 License

MIT — free to use, learn from, and fork.

---

<p align="center">Made with ❤️ and Vanilla JavaScript</p>
