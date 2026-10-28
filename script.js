/* ==========================================================================
   MINI ROYALE 2D — v1.1
   Browser Battle Royale game
   Fixes v1.1: deltaTime game loop, AI obstacle avoidance, pause system
   ========================================================================== */

// ── Canvas & viewport constants ──────────────────────────────────────────────
const WORLD_WIDTH  = 1400;
const WORLD_HEIGHT = 1000;
const VIEW_WIDTH   = 900;
const VIEW_HEIGHT  = 650;

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const miniCtx = minimapCanvas.getContext('2d');

// ── UI element references ─────────────────────────────────────────────────────
const hpFill        = document.getElementById('hp-fill');
const hpText        = document.getElementById('hp-text');
const shieldFill    = document.getElementById('shield-fill');
const shieldText    = document.getElementById('shield-text');
const weaponName    = document.getElementById('weapon-name');
const weaponAmmo    = document.getElementById('weapon-ammo');
const weaponIcon    = document.getElementById('weapon-icon');
const aliveVal      = document.getElementById('alive-val');
const killsVal      = document.getElementById('kills-val');
const zoneTimerVal  = document.getElementById('zone-timer-val');
const zoneBanner    = document.getElementById('zone-banner');
const killFeed      = document.getElementById('kill-feed');
const startModal    = document.getElementById('start-modal');
const gameOverModal = document.getElementById('game-over-modal');
const pauseOverlay  = document.getElementById('pause-overlay');
const resultHeading = document.getElementById('result-heading');
const resultSub     = document.getElementById('result-sub');
const statPlacement = document.getElementById('stat-placement');
const statKills     = document.getElementById('stat-kills');
const statDamage    = document.getElementById('stat-damage');
const startBtn      = document.getElementById('start-btn');
const restartBtn    = document.getElementById('restart-btn');

/* ==========================================================================
   WEB AUDIO SYNTHESIZER — zero external files needed
   ========================================================================== */
class SoundEngine {
  constructor() { this.ctx = null; }

  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Generic tone helper
  _tone(type, freqStart, freqEnd, gainStart, duration) {
    if (!this.ctx) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    gain.gain.setValueAtTime(gainStart, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  playShot(type) {
    const cfg = {
      Pistol:         ['square',   300,  40, 0.30, 0.10],
      Shotgun:        ['sawtooth', 180,  30, 0.50, 0.20],
      'Assault Rifle':['sawtooth', 400,  80, 0.25, 0.08],
      Sniper:         ['triangle', 600,  50, 0.60, 0.30],
    };
    const c = cfg[type] || cfg.Pistol;
    this._tone(...c);
  }
  playHit()    { this._tone('sine',    150, 60,  0.20, 0.05); }
  playPickup() { this._tone('sine',    440, 880, 0.20, 0.15); }
  playWin() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3);
      osc.start(now + i * 0.12);
      osc.stop (now + i * 0.12 + 0.3);
    });
  }
}
const sounds = new SoundEngine();

/* ==========================================================================
   WEAPON DEFINITIONS
   Speeds are in pixels/second (previously px/frame × 60)
   fireRate is in SECONDS
   ========================================================================== */
const WEAPONS = {
  Pistol:       { name: 'Pistol',        damage: 18, fireRate: 0.32, speed: 840,  spread: 0.04, count: 1, ammo: Infinity, color: '#ffd700' },
  Shotgun:      { name: 'Shotgun',       damage: 12, fireRate: 0.75, speed: 720,  spread: 0.22, count: 5, ammo: 16,       color: '#ff4500' },
  AssaultRifle: { name: 'Assault Rifle', damage: 15, fireRate: 0.13, speed: 1020, spread: 0.07, count: 1, ammo: 60,       color: '#00bfff' },
  Sniper:       { name: 'Sniper',        damage: 70, fireRate: 1.10, speed: 1500, spread: 0.01, count: 1, ammo: 8,        color: '#a855f7' }
};

// Character move speeds in pixels/second
const PLAYER_SPEED = 192; // 3.2 px/frame × 60
const BOT_SPEED    = 156; // 2.6 px/frame × 60

/* ==========================================================================
   GAME STATE
   ========================================================================== */
let gameState = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
let paused    = false;

let player      = null;
let combatants  = [];
let bullets     = [];
let pickups     = [];
let obstacles   = [];
let particles   = [];
let damageNums  = [];

let camera = { x: 0, y: 0 };
let keys   = {};
let mouse  = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2, worldX: 700, worldY: 500, down: false };

// deltaTime tracking (v1.1 fix)
let lastTimestamp = 0;
let gameTime      = 0; // total seconds elapsed this match

// Safe Zone state
let zone = {};
let zoneInterval = null;

/* ==========================================================================
   INPUT
   ========================================================================== */
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') mouse.down = true;

  // Toggle Pause with ESC or P
  if ((e.code === 'Escape' || e.code === 'KeyP') && gameState === 'PLAYING') togglePause();
  if ((e.code === 'Escape' || e.code === 'KeyP') && gameState === 'PAUSED')  togglePause();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space') mouse.down = false;
});
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) { mouse.down = true; sounds.init(); }
});
canvas.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });

startBtn.addEventListener('click', () => { sounds.init(); startModal.style.display = 'none'; initGame(); });
restartBtn.addEventListener('click', () => { gameOverModal.style.display = 'none'; initGame(); });

function togglePause() {
  paused = !paused;
  gameState = paused ? 'PAUSED' : 'PLAYING';
  pauseOverlay.style.display = paused ? 'flex' : 'none';
}

/* ==========================================================================
   COLLISION HELPERS (v1.1 — used by AI to steer around obstacles)
   ========================================================================== */

/**
 * Returns true if a circle at (x,y) with given radius is clear of all
 * obstacles and within map boundaries.
 */
function isPositionClear(x, y, radius) {
  if (x - radius < 0 || x + radius > WORLD_WIDTH ||
      y - radius < 0 || y + radius > WORLD_HEIGHT) return false;

  for (const obs of obstacles) {
    if (x + radius > obs.x && x - radius < obs.x + obs.w &&
        y + radius > obs.y && y - radius < obs.y + obs.h) return false;
  }
  return true;
}

/**
 * Finds the best clear movement angle near `desiredAngle`.
 * Tries increasingly wide offsets until a clear path is found.
 * @returns the best angle (radians) the bot should actually travel.
 */
function steerAround(x, y, radius, desiredAngle, stepDist) {
  // Lookahead distance — at least 1.5× radius for safety
  const look = Math.max(stepDist, radius * 1.5);
  // Offsets to try in degrees, ordered by preference (smallest deviation first)
  const offsets = [0, 25, -25, 50, -50, 80, -80, 110, -110, 140, -140, 170, -170, 180];

  for (const deg of offsets) {
    const angle = desiredAngle + deg * (Math.PI / 180);
    const nx = x + Math.cos(angle) * look;
    const ny = y + Math.sin(angle) * look;
    if (isPositionClear(nx, ny, radius)) return angle;
  }
  return desiredAngle; // fallback — try anyway
}

/* ==========================================================================
   ENVIRONMENT GENERATION
   ========================================================================== */
function generateObstacles() {
  obstacles = [];
  for (let i = 0; i < 24; i++) {
    let obs, valid = false, attempts = 0;
    while (!valid && attempts < 100) {
      attempts++;
      const w = 40 + Math.random() * 50;
      const h = 40 + Math.random() * 50;
      const x = 100 + Math.random() * (WORLD_WIDTH  - 200);
      const y = 100 + Math.random() * (WORLD_HEIGHT - 200);
      obs = { x, y, w, h, isRock: Math.random() > 0.5 };
      // Keep a clear spawn circle in the centre
      if (Math.hypot(x + w/2 - WORLD_WIDTH/2, y + h/2 - WORLD_HEIGHT/2) > 160) valid = true;
    }
    if (valid) obstacles.push(obs);
  }
}

function spawnPickups() {
  pickups = [];
  const weaponKeys = ['Shotgun', 'AssaultRifle', 'Sniper'];

  for (let i = 0; i < 14; i++) {
    const type = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    pickups.push({ x: 80 + Math.random() * (WORLD_WIDTH-160), y: 80 + Math.random() * (WORLD_HEIGHT-160), type: 'weapon', weapon: { ...WEAPONS[type] }, radius: 12 });
  }
  for (let i = 0; i < 8; i++) {
    pickups.push({ x: 80 + Math.random() * (WORLD_WIDTH-160), y: 80 + Math.random() * (WORLD_HEIGHT-160), type: 'medkit', radius: 10 });
  }
  for (let i = 0; i < 6; i++) {
    pickups.push({ x: 80 + Math.random() * (WORLD_WIDTH-160), y: 80 + Math.random() * (WORLD_HEIGHT-160), type: 'shield', radius: 10 });
  }
}

/* ==========================================================================
   PARTICLES
   Life is stored in SECONDS for frame-rate independence.
   ========================================================================== */
function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 360, // px/s
      vy: (Math.random() - 0.5) * 360, // px/s
      color,
      radius: 2 + Math.random() * 3,
      alpha:  1.0,
      life:   0.3 + Math.random() * 0.3  // seconds
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    p.alpha -= (1 / p.life) * dt; // drain over `life` seconds
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  });
}

/* ==========================================================================
   CHARACTER CLASS — Player and AI Bots
   ========================================================================== */
class Character {
  constructor(id, name, color, isBot, x, y) {
    this.id    = id;
    this.name  = name;
    this.color = color;
    this.isBot = isBot;
    this.x = x;
    this.y = y;
    this.radius   = 16;
    this.hp       = 100;
    this.maxHp    = 100;
    this.shield   = 0;
    this.maxShield = 50;
    this.speed    = isBot ? BOT_SPEED : PLAYER_SPEED; // px/s
    this.angle    = 0;
    this.weapon   = { ...WEAPONS.Pistol };

    // Use gameTime (seconds) for fire-rate — frame-rate independent
    this.lastShotTime = -10;

    this.kills       = 0;
    this.totalDamage = 0;
    this.dead        = false;

    // AI state
    this.aiTarget       = null;
    this.aiState        = 'WANDER';
    this.aiWanderAngle  = Math.random() * Math.PI * 2;
    this.aiWanderTimer  = Math.random() * 1.5; // seconds until next direction change
  }

  /* ── Per-frame update. dt = seconds since last frame ── */
  update(dt) {
    if (this.dead) return;

    if (!this.isBot) {
      this._updatePlayer(dt);
    } else {
      this._updateAI(dt);
    }

    // ── Storm (safe zone) damage ──
    const distFromZone = Math.hypot(this.x - zone.x, this.y - zone.y);
    if (distFromZone > zone.radius) {
      this.takeDamage(zone.dps * dt, 'The Storm'); // damage per second × dt
      if (Math.random() < 0.06) createParticles(this.x, this.y, '#a855f7', 2);
    }

    // ── Pickup collection ──
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (Math.hypot(this.x - p.x, this.y - p.y) >= this.radius + p.radius) continue;

      if (p.type === 'weapon') {
        this.weapon = { ...p.weapon };
        if (!this.isBot) { sounds.playPickup(); addKillMsg(`Picked up ${p.weapon.name}!`, true); }
        pickups.splice(i, 1);
      } else if (p.type === 'medkit' && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + 40);
        if (!this.isBot) sounds.playPickup();
        createParticles(this.x, this.y, '#22c55e', 8);
        pickups.splice(i, 1);
      } else if (p.type === 'shield' && this.shield < this.maxShield) {
        this.shield = Math.min(this.maxShield, this.shield + 25);
        if (!this.isBot) sounds.playPickup();
        createParticles(this.x, this.y, '#38bdf8', 8);
        pickups.splice(i, 1);
      }
    }
  }

  _updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    // Normalise diagonal movement
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    this._move(dx * this.speed * dt, dy * this.speed * dt);

    // Aim toward mouse cursor in world space
    this.angle = Math.atan2(mouse.worldY - this.y, mouse.worldX - this.x);

    if (mouse.down) this._shoot();
  }

  /* ── AI behaviour ─────────────────────────────────────────────────────────
     State machine: RETREAT_ZONE → CHASE → WANDER
     v1.1: steerAround() used everywhere to avoid obstacles.
  ─────────────────────────────────────────────────────────────────────────── */
  _updateAI(dt) {
    const stepDist = this.speed * dt;

    // Priority 1: flee the storm
    const distToZone = Math.hypot(this.x - zone.x, this.y - zone.y);
    if (distToZone > zone.radius - 40) {
      this.aiState = 'RETREAT_ZONE';
      const raw    = Math.atan2(zone.y - this.y, zone.x - this.x);
      const steered = steerAround(this.x, this.y, this.radius, raw, stepDist);
      this.angle = steered;
      this._move(Math.cos(steered) * stepDist, Math.sin(steered) * stepDist);
      return;
    }

    // Priority 2: engage nearest enemy within vision range
    let nearest = null, minDist = 320;
    for (const c of combatants) {
      if (c !== this && !c.dead) {
        const d = Math.hypot(c.x - this.x, c.y - this.y);
        if (d < minDist) { minDist = d; nearest = c; }
      }
    }

    if (nearest) {
      this.aiState  = 'CHASE';
      this.aiTarget = nearest;
      const rawAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
      this.angle = rawAngle; // always face the enemy

      if (minDist > 140) {
        // Advance — steer around obstacles
        const steered = steerAround(this.x, this.y, this.radius, rawAngle, stepDist);
        this._move(Math.cos(steered) * stepDist, Math.sin(steered) * stepDist);
      } else if (minDist < 80) {
        // Too close — back away, also steered
        const backAngle = rawAngle + Math.PI;
        const steered   = steerAround(this.x, this.y, this.radius, backAngle, stepDist);
        this._move(Math.cos(steered) * stepDist, Math.sin(steered) * stepDist);
      }
      // else: optimal range — stay still and keep shooting

      this._shoot();
      return;
    }

    // Priority 3: wander (steer around walls & obstacles)
    this.aiState = 'WANDER';
    this.aiWanderTimer -= dt;
    if (this.aiWanderTimer <= 0) {
      this.aiWanderAngle += (Math.random() - 0.5) * 2.0;
      this.aiWanderTimer  = 0.7 + Math.random() * 1.2; // 0.7–1.9 seconds
    }

    const steered = steerAround(this.x, this.y, this.radius, this.aiWanderAngle, stepDist);
    // If steered angle differs a lot from wander angle, adopt it so bot turns smoothly
    if (Math.abs(steered - this.aiWanderAngle) > 0.1) this.aiWanderAngle = steered;
    this.angle = steered;
    this._move(Math.cos(steered) * this.speed * 0.6 * dt, Math.sin(steered) * this.speed * 0.6 * dt);
  }

  /* ── Movement with AABB obstacle + boundary collision ── */
  _move(vx, vy) {
    let nx = Math.max(this.radius, Math.min(WORLD_WIDTH  - this.radius, this.x + vx));
    let ny = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y + vy));

    for (const obs of obstacles) {
      const overlapX = nx + this.radius > obs.x && nx - this.radius < obs.x + obs.w;
      const overlapY = ny + this.radius > obs.y && ny - this.radius < obs.y + obs.h;

      if (overlapX && overlapY) {
        // Slide: cancel only the axis that causes penetration
        const wasOverlapX = this.x + this.radius > obs.x && this.x - this.radius < obs.x + obs.w;
        const wasOverlapY = this.y + this.radius > obs.y && this.y - this.radius < obs.y + obs.h;
        if (!wasOverlapX) nx = this.x; // X move caused it → revert X
        if (!wasOverlapY) ny = this.y; // Y move caused it → revert Y
      }
    }

    this.x = nx;
    this.y = ny;
  }

  /* ── Shooting (fire rate in seconds, compared against gameTime) ── */
  _shoot() {
    if (gameTime - this.lastShotTime < this.weapon.fireRate) return;
    if (this.weapon.ammo <= 0) this.weapon = { ...WEAPONS.Pistol }; // swap back to pistol

    this.lastShotTime = gameTime;
    if (this.weapon.ammo !== Infinity) this.weapon.ammo--;

    sounds.playShot(this.weapon.name);

    for (let i = 0; i < this.weapon.count; i++) {
      const spread = this.angle + (Math.random() - 0.5) * this.weapon.spread * 2;
      bullets.push({
        owner: this,
        x: this.x + Math.cos(this.angle) * 18,
        y: this.y + Math.sin(this.angle) * 18,
        vx: Math.cos(spread) * this.weapon.speed, // px/s
        vy: Math.sin(spread) * this.weapon.speed, // px/s
        damage: this.weapon.damage,
        color:  this.weapon.color,
        distance: 0,
        maxDistance: 650
      });
    }
  }

  /* ── Take damage, shield absorbs first ── */
  takeDamage(amount, attackerName) {
    if (this.dead) return;

    let remaining = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield   -= absorbed;
      remaining     -= absorbed;
    }
    this.hp -= remaining;

    // Floating damage number
    damageNums.push({
      x: this.x + (Math.random() - 0.5) * 15,
      y: this.y - 15,
      text:  Math.round(amount),
      color: this.isBot ? '#fbbf24' : '#ef4444',
      alpha: 1.0
    });

    if (this.hp <= 0) {
      this.hp   = 0;
      this.dead = true;
      createParticles(this.x, this.y, '#ef4444', 16);
      addKillMsg(`${this.name} was eliminated by ${attackerName}`, this.id === player.id);
      checkGameStatus();
    }
  }

  /* ── Draw character on canvas ── */
  draw() {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Health bar above head
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-20, -28, 40, 5);
    ctx.fillStyle = this.isBot ? '#ef4444' : '#22c55e';
    ctx.fillRect(-20, -28, (this.hp / this.maxHp) * 40, 5);

    if (this.shield > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-20, -22, (this.shield / this.maxShield) * 40, 3);
    }

    // Rotate body to face movement / aim direction
    ctx.rotate(this.angle);

    // Gun barrel
    ctx.fillStyle = '#475569';
    ctx.fillRect(8, 4, 14, 5);

    // Body circle
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Facing dot
    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    // Name tag (not rotated)
    ctx.fillStyle  = '#cbd5e1';
    ctx.font       = '10px sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(this.name, this.x, this.y - 32);
  }
}

/* ==========================================================================
   BULLETS
   vx/vy are in px/s. Position updated by vx*dt each frame.
   ========================================================================== */
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.distance += Math.hypot(b.vx, b.vy) * dt;

    // Remove if out of bounds or max range
    if (b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT || b.distance >= b.maxDistance) {
      bullets.splice(i, 1); continue;
    }

    // Obstacle collision
    let hitWall = false;
    for (const obs of obstacles) {
      if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) {
        createParticles(b.x, b.y, '#94a3b8', 4);
        bullets.splice(i, 1);
        hitWall = true;
        break;
      }
    }
    if (hitWall) continue;

    // Character collision
    for (const c of combatants) {
      if (!c.dead && c !== b.owner && Math.hypot(b.x - c.x, b.y - c.y) < c.radius + 3) {
        c.takeDamage(b.damage, b.owner.name);
        if (b.owner === player) {
          sounds.playHit();
          player.totalDamage += b.damage;
          if (c.dead) player.kills++;
        }
        createParticles(b.x, b.y, '#ef4444', 6);
        bullets.splice(i, 1);
        break;
      }
    }
  }
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    // Tracer line
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); // short tracer
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = 2;
    ctx.stroke();
  });
}

/* ==========================================================================
   SAFE ZONE
   dps applied per-second (multiplied by dt in Character.update).
   Zone lerp rate uses dt for frame-rate independence.
   ========================================================================== */
function initZone() {
  if (zoneInterval) { clearInterval(zoneInterval); zoneInterval = null; }

  zone = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    radius: Math.max(WORLD_WIDTH, WORLD_HEIGHT) * 0.7,
    targetX: WORLD_WIDTH / 2,
    targetY: WORLD_HEIGHT / 2,
    targetRadius: Math.max(WORLD_WIDTH, WORLD_HEIGHT) * 0.7,
    phase:     1,
    timer:     30,    // seconds shown in UI
    shrinking: false,
    dps:       4      // damage per second outside zone
  };

  // Real-clock 1-second tick for the UI countdown (game logic uses rAF)
  zoneInterval = setInterval(() => {
    if (gameState !== 'PLAYING') return;
    zone.timer--;
    if (zone.timer <= 0) {
      if (!zone.shrinking) {
        zone.shrinking = true;
        zone.timer     = 15;
        zoneBanner.style.display = 'block';

        const nextRadius = zone.radius * 0.55;
        const maxOffset  = (zone.radius - nextRadius) * 0.7;
        const ang        = Math.random() * Math.PI * 2;
        zone.targetRadius = nextRadius;
        zone.targetX      = zone.x + Math.cos(ang) * maxOffset * Math.random();
        zone.targetY      = zone.y + Math.sin(ang) * maxOffset * Math.random();
        zone.dps         += 3;
      } else {
        zone.shrinking = false;
        zone.timer     = 25;
        zone.phase++;
        zoneBanner.style.display = 'none';
      }
    }
  }, 1000);
}

function updateZone(dt) {
  if (zone.shrinking) {
    // Frame-rate independent lerp — rate 0.3/s (was 0.005/frame × 60)
    const rate = 0.3 * dt;
    zone.radius += (zone.targetRadius - zone.radius) * rate;
    zone.x      += (zone.targetX      - zone.x)      * rate;
    zone.y      += (zone.targetY      - zone.y)      * rate;
  }
}

function drawZone() {
  ctx.save();
  // Storm tint outside the safe circle (inverted arc clip)
  ctx.fillStyle = 'rgba(147,51,234,0.22)';
  ctx.beginPath();
  ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.arc(zone.x, zone.y, Math.max(0, zone.radius), 0, Math.PI * 2, true);
  ctx.fill();
  // Glowing safe zone border
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, Math.max(0, zone.radius), 0, Math.PI * 2);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth   = 4;
  ctx.setLineDash([12, 6]);
  ctx.stroke();
  ctx.restore();
}

/* ==========================================================================
   ENVIRONMENT DRAW
   ========================================================================== */
function drawEnvironment() {
  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 1;
  for (let x = 0; x < WORLD_WIDTH;  x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,WORLD_HEIGHT); ctx.stroke(); }
  for (let y = 0; y < WORLD_HEIGHT; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WORLD_WIDTH,y);  ctx.stroke(); }

  // World boundary
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth   = 6;
  ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Obstacles (rocks & crates)
  obstacles.forEach(obs => {
    ctx.save();
    ctx.fillStyle   = obs.isRock ? '#334155' : '#475569';
    ctx.strokeStyle = obs.isRock ? '#1e293b' : '#64748b';
    ctx.lineWidth   = 2;
    ctx.fillRect  (obs.x, obs.y, obs.w, obs.h);
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    ctx.restore();
  });

  // Pickups
  pickups.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.type === 'weapon') {
      ctx.fillStyle   = p.weapon.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1.5;
      ctx.fillRect  (-8, -8, 16, 16);
      ctx.strokeRect(-8, -8, 16, 16);
    } else if (p.type === 'medkit') {
      ctx.fillStyle = '#22c55e'; ctx.fillRect(-7,-7,14,14);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-2,-5,4,10); ctx.fillRect(-5,-2,10,4);
    } else if (p.type === 'shield') {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  });
}

/* ==========================================================================
   FLOATING DAMAGE NUMBERS
   Rate is in units/second, multiplied by dt.
   ========================================================================== */
function updateDamageNums(dt) {
  for (let i = damageNums.length - 1; i >= 0; i--) {
    const d = damageNums[i];
    d.y     -= 36 * dt;   // float upward at 36 px/s
    d.alpha -= 1.2 * dt;  // fade out over ~0.83 seconds
    if (d.alpha <= 0) damageNums.splice(i, 1);
  }
}

function drawDamageNums() {
  damageNums.forEach(d => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, d.alpha);
    ctx.fillStyle   = d.color;
    ctx.font        = 'bold 13px sans-serif';
    ctx.fillText(`-${d.text}`, d.x, d.y);
    ctx.restore();
  });
}

/* ==========================================================================
   HUD & MINIMAP
   ========================================================================== */
function updateHUD() {
  if (!player) return;

  hpFill.style.width     = `${Math.max(0, (player.hp     / player.maxHp)     * 100)}%`;
  hpText.textContent     = `HEALTH: ${Math.max(0, Math.ceil(player.hp))}/100`;
  shieldFill.style.width = `${Math.max(0, (player.shield / player.maxShield) * 100)}%`;
  shieldText.textContent = `SHIELD: ${Math.max(0, Math.ceil(player.shield))}/50`;

  weaponName.textContent = player.weapon.name;
  weaponAmmo.textContent = player.weapon.ammo === Infinity ? '∞' : player.weapon.ammo;
  weaponIcon.style.background = player.weapon.color;

  aliveVal.textContent  = combatants.filter(c => !c.dead).length;
  killsVal.textContent  = player.kills;

  const t    = zone.timer;
  const mins = String(Math.floor(t / 60)).padStart(2, '0');
  const secs = String(t % 60).padStart(2, '0');
  zoneTimerVal.textContent = `${mins}:${secs}`;
}

function renderMinimap() {
  const sx = 130 / WORLD_WIDTH, sy = 130 / WORLD_HEIGHT;
  miniCtx.fillStyle = '#0f172a';
  miniCtx.fillRect(0, 0, 130, 130);

  // Safe zone ring
  miniCtx.beginPath();
  miniCtx.arc(zone.x * sx, zone.y * sy, zone.radius * sx, 0, Math.PI * 2);
  miniCtx.strokeStyle = '#38bdf8';
  miniCtx.lineWidth   = 1.5;
  miniCtx.stroke();

  // Dots for each alive combatant
  combatants.forEach(c => {
    if (!c.dead) {
      miniCtx.beginPath();
      miniCtx.arc(c.x * sx, c.y * sy, c.isBot ? 2.5 : 3.5, 0, Math.PI * 2);
      miniCtx.fillStyle = c.isBot ? '#ef4444' : '#22c55e';
      miniCtx.fill();
    }
  });
}

function addKillMsg(text, isPlayer = false) {
  const msg = document.createElement('div');
  msg.className = `kill-msg${isPlayer ? ' player-kill' : ''}`;
  msg.textContent = text;
  killFeed.appendChild(msg);
  if (killFeed.children.length > 5) killFeed.removeChild(killFeed.firstChild);
  setTimeout(() => { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 5000);
}

/* ==========================================================================
   GAME INIT, WIN CHECK & MAIN LOOP
   ========================================================================== */
function initGame() {
  // Reset all state arrays
  bullets    = [];
  particles  = [];
  damageNums = [];
  killFeed.innerHTML = '';
  gameTime = 0;

  generateObstacles();
  spawnPickups();

  // Spawn player at centre
  player = new Character(0, 'YOU', '#3b82f6', false, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  combatants = [player];

  const botNames  = ['Shadow','Hunter','Viper','Ghost','Blaze','Falcon','Spectre','Apex','Titan'];
  const botColors = ['#f43f5e','#fb923c','#a855f7','#ec4899','#eab308','#06b6d4','#f97316','#84cc16','#10b981'];

  for (let i = 0; i < 9; i++) {
    combatants.push(new Character(
      i + 1,
      botNames[i],
      botColors[i],
      true,
      100 + Math.random() * (WORLD_WIDTH  - 200),
      100 + Math.random() * (WORLD_HEIGHT - 200)
    ));
  }

  initZone();
  gameState = 'PLAYING';
  paused    = false;
  pauseOverlay.style.display = 'none';
}

function checkGameStatus() {
  const alive = combatants.filter(c => !c.dead);
  if (!player.dead && alive.length > 1) return; // still playing

  gameState = 'GAMEOVER';
  if (zoneInterval) { clearInterval(zoneInterval); zoneInterval = null; }

  const win = !player.dead;
  if (win) {
    sounds.playWin();
    resultHeading.textContent = 'WINNER WINNER CHICKEN DINNER!';
    resultHeading.className   = 'result-title win-text';
    resultSub.textContent     = 'Awesome! You outlived all 9 combatants!';
    statPlacement.textContent = '#1';
  } else {
    resultHeading.textContent = 'ELIMINATED!';
    resultHeading.className   = 'result-title loss-text';
    resultSub.textContent     = `You placed #${alive.length + 1} out of 10.`;
    statPlacement.textContent = `#${alive.length + 1}`;
  }
  statKills.textContent  = player.kills;
  statDamage.textContent = Math.round(player.totalDamage);

  setTimeout(() => { gameOverModal.style.display = 'flex'; }, 1200);
}

/**
 * Main game loop — receives a DOMHighResTimeStamp from requestAnimationFrame.
 * deltaTime (dt) is capped at 50 ms to prevent a "spiral of death" if the
 * tab was backgrounded or the device paused.
 */
function gameLoop(timestamp) {
  // ── deltaTime calculation (v1.1 fix) ──
  const dt  = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // seconds, max 50 ms
  lastTimestamp = timestamp;

  if (gameState === 'PLAYING') {
    gameTime += dt;

    // Camera — centres on player, clamped to world edges
    camera.x = Math.max(0, Math.min(WORLD_WIDTH  - VIEW_WIDTH,  player.x - VIEW_WIDTH  / 2));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, player.y - VIEW_HEIGHT / 2));

    // Transform mouse to world-space for aiming
    mouse.worldX = mouse.x + camera.x;
    mouse.worldY = mouse.y + camera.y;

    // ── Update ──
    updateZone(dt);
    combatants.forEach(c => c.update(dt));
    updateBullets(dt);
    updateParticles(dt);
    updateDamageNums(dt);

    // ── Render ──
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawEnvironment();
    drawZone();
    drawBullets();
    combatants.forEach(c => c.draw());
    drawParticles();
    drawDamageNums();
    ctx.restore();

    updateHUD();
    renderMinimap();
  }

  requestAnimationFrame(gameLoop);
}

// Bootstrap: capture the first timestamp before starting the loop
requestAnimationFrame(ts => { lastTimestamp = ts; requestAnimationFrame(gameLoop); });
