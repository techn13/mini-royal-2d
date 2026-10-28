<p align="center">
  <img src="docs/banner.png" alt="Mini Royale 2D Banner" width="700"/>
</p>

<h1 align="center">🎮 Mini Royale 2D</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-Vanilla%20JS-f7df1e?style=for-the-badge&logo=javascript" />
  <img src="https://img.shields.io/badge/Renderer-HTML5%20Canvas-e34c26?style=for-the-badge&logo=html5" />
  <img src="https://img.shields.io/badge/Audio-Web%20Audio%20API-a855f7?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Size-Single%20File-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/github/license/YOUR_USERNAME/mini-royale-2d?style=for-the-badge" />
</p>

<p align="center">
  A lightweight <strong>top-down 2D Battle Royale</strong> built from scratch in a single HTML file — no game engine, no external libraries, no assets. Just pure browser APIs.
</p>

<p align="center">
  <a href="https://YOUR_USERNAME.github.io/mini-royale-2d/"><strong>▶ PLAY NOW (GitHub Pages)</strong></a>
</p>

---

## 📸 Gameplay

> **Add a GIF here!** Record 30–60 seconds with [LICEcap](https://www.cockos.com/licecap/) (Windows, free) or OBS, save as `docs/gameplay.gif`, then uncomment the line below.

<!-- ![Gameplay GIF](docs/gameplay.gif) -->

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
Push to GitHub and enable **Pages** from `Settings → Pages → Deploy from branch: main → / (root)`.

---

## 🛠️ Tech Stack

```
HTML5 Canvas 2D   — All rendering (world, characters, UI, minimap)
Web Audio API     — Synthesised SFX (oscillator + gain nodes)
Vanilla JS ES6+   — Game engine, OOP (Character class), FSM AI, deltaTime loop
CSS3              — Glassmorphism HUD, animations, modal overlays
```
**No bundler. No framework. No dependencies. One file (~550 lines of JS).**

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
├── index.html          ← Entire game (HTML + CSS + JS)
├── README.md           ← This file
├── docs/
│   ├── gameplay.gif    ← (add your own recording here)
│   └── banner.png      ← (optional banner)
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
