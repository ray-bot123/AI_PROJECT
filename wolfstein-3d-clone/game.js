const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const healthEl = document.getElementById("health");
const ammoEl = document.getElementById("ammo");
const scoreEl = document.getElementById("score");
const keysEl = document.getElementById("keys");
const banner = document.getElementById("banner");
const startButton = document.getElementById("start");

const W = canvas.width;
const H = canvas.height;
const FOV = Math.PI / 3;
const TWO_PI = Math.PI * 2;
const TILE_EMPTY = 0;
const TILE_STONE = 1;
const TILE_BRICK = 2;
const TILE_METAL = 3;
const TILE_EXIT = 4;

const world = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1],
  [1, 0, 2, 2, 0, 1, 1, 1, 0, 2, 2, 2, 0, 1, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 1, 0, 1],
  [1, 0, 2, 0, 1, 1, 0, 1, 0, 2, 0, 3, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 2, 2, 2, 2, 0, 3, 3, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 0, 1],
  [1, 0, 2, 2, 2, 0, 1, 1, 0, 2, 2, 2, 0, 3, 0, 1],
  [1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 1],
  [1, 3, 3, 0, 2, 0, 1, 0, 3, 3, 0, 2, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 2, 0, 1],
  [1, 0, 1, 1, 1, 0, 2, 2, 0, 3, 3, 3, 0, 2, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const player = {
  x: 2.4,
  y: 2.4,
  dir: 0.04,
  health: 100,
  ammo: 32,
  score: 0,
  keys: 0,
  firing: 0,
  hurt: 0,
};

const enemies = [
  { x: 7.4, y: 3.5, sx: 7.4, sy: 3.5, maxHp: 45, hp: 45, cool: 0, alive: true },
  { x: 12.5, y: 5.5, sx: 12.5, sy: 5.5, maxHp: 45, hp: 45, cool: 0, alive: true },
  { x: 4.5, y: 10.5, sx: 4.5, sy: 10.5, maxHp: 45, hp: 45, cool: 0, alive: true },
  { x: 10.5, y: 12.5, sx: 10.5, sy: 12.5, maxHp: 60, hp: 60, cool: 0, alive: true },
];

const pickups = [
  { x: 5.5, y: 5.5, type: "ammo", active: true },
  { x: 13.5, y: 1.5, type: "key", active: true },
  { x: 2.5, y: 13.5, type: "med", active: true },
  { x: 14.5, y: 10.5, type: "ammo", active: true },
];

const keys = new Set();
const zBuffer = new Float32Array(W);
let last = performance.now();
let running = false;
let message = "";
let messageTimer = 0;

const textures = makeTextures();
const sprites = makeSprites();

function makeTextures() {
  const colors = {
    [TILE_STONE]: ["#7b7367", "#5f594f", "#998f80"],
    [TILE_BRICK]: ["#7f2d2d", "#5b2020", "#a44036"],
    [TILE_METAL]: ["#59646a", "#30383d", "#9aa6a9"],
    [TILE_EXIT]: ["#7b6527", "#38300f", "#f2c94c"],
  };
  const result = {};
  for (const [tile, palette] of Object.entries(colors)) {
    const tex = document.createElement("canvas");
    tex.width = 64;
    tex.height = 64;
    const t = tex.getContext("2d");
    t.fillStyle = palette[0];
    t.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 16) {
      for (let x = (y / 16) % 2 ? -16 : 0; x < 64; x += 32) {
        t.fillStyle = palette[1];
        t.fillRect(x, y + 14, 32, 2);
        t.fillRect(x, y, 2, 16);
        t.fillStyle = palette[2];
        t.fillRect(x + 3, y + 3, 24, 2);
      }
    }
    if (+tile === TILE_METAL) {
      t.fillStyle = "#191d20";
      for (let n = 7; n < 64; n += 16) {
        t.fillRect(n, n, 4, 4);
        t.fillRect(57 - n, n, 4, 4);
      }
    }
    if (+tile === TILE_EXIT) {
      t.fillStyle = "#20200d";
      t.fillRect(12, 10, 40, 46);
      t.fillStyle = "#e0bc45";
      t.fillRect(18, 16, 28, 4);
      t.fillRect(18, 26, 28, 4);
      t.fillRect(18, 36, 28, 4);
    }
    result[tile] = tex;
  }
  return result;
}

function makeSprites() {
  const enemy = document.createElement("canvas");
  enemy.width = 64;
  enemy.height = 64;
  const e = enemy.getContext("2d");
  e.fillStyle = "#2d321f";
  e.fillRect(18, 22, 28, 35);
  e.fillStyle = "#43512c";
  e.fillRect(13, 26, 10, 23);
  e.fillRect(41, 26, 10, 23);
  e.fillStyle = "#c8a36a";
  e.fillRect(21, 8, 22, 18);
  e.fillStyle = "#15110c";
  e.fillRect(24, 15, 5, 4);
  e.fillRect(35, 15, 5, 4);
  e.fillStyle = "#7e1818";
  e.fillRect(27, 24, 10, 5);
  e.fillStyle = "#171717";
  e.fillRect(12, 44, 40, 7);

  const ammo = document.createElement("canvas");
  ammo.width = 64;
  ammo.height = 64;
  const a = ammo.getContext("2d");
  a.fillStyle = "#1f4f62";
  a.fillRect(16, 28, 32, 20);
  a.fillStyle = "#e7c96d";
  a.fillRect(20, 22, 7, 24);
  a.fillRect(30, 22, 7, 24);
  a.fillRect(40, 22, 7, 24);

  const med = document.createElement("canvas");
  med.width = 64;
  med.height = 64;
  const m = med.getContext("2d");
  m.fillStyle = "#f0eee1";
  m.fillRect(14, 22, 36, 28);
  m.fillStyle = "#b52020";
  m.fillRect(28, 26, 8, 20);
  m.fillRect(22, 32, 20, 8);

  const key = document.createElement("canvas");
  key.width = 64;
  key.height = 64;
  const k = key.getContext("2d");
  k.strokeStyle = "#f0cc4a";
  k.lineWidth = 7;
  k.beginPath();
  k.arc(22, 31, 10, 0, TWO_PI);
  k.moveTo(32, 31);
  k.lineTo(52, 31);
  k.lineTo(52, 39);
  k.moveTo(43, 31);
  k.lineTo(43, 38);
  k.stroke();

  return { enemy, ammo, med, key };
}

function tileAt(x, y) {
  const row = world[Math.floor(y)];
  return row ? row[Math.floor(x)] ?? TILE_STONE : TILE_STONE;
}

function solidAt(x, y) {
  return tileAt(x, y) !== TILE_EMPTY && tileAt(x, y) !== TILE_EXIT;
}

function castRay(angle) {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);
  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);
  const deltaX = Math.abs(1 / rayDirX);
  const deltaY = Math.abs(1 / rayDirY);
  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;
  let sideX = rayDirX < 0 ? (player.x - mapX) * deltaX : (mapX + 1 - player.x) * deltaX;
  let sideY = rayDirY < 0 ? (player.y - mapY) * deltaY : (mapY + 1 - player.y) * deltaY;
  let side = 0;
  let tile = TILE_EMPTY;

  for (let i = 0; i < 64; i++) {
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }
    tile = tileAt(mapX, mapY);
    if (tile !== TILE_EMPTY) break;
  }

  const dist =
    side === 0
      ? (mapX - player.x + (1 - stepX) / 2) / rayDirX
      : (mapY - player.y + (1 - stepY) / 2) / rayDirY;
  const hit = side === 0 ? player.y + dist * rayDirY : player.x + dist * rayDirX;
  return { dist: Math.max(0.001, dist), tile, side, texX: Math.floor((hit - Math.floor(hit)) * 64) };
}

function move(dx, dy) {
  const radius = 0.18;
  if (!solidAt(player.x + dx + Math.sign(dx) * radius, player.y)) player.x += dx;
  if (!solidAt(player.x, player.y + dy + Math.sign(dy) * radius)) player.y += dy;
}

function update(dt) {
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const speed = (run ? 4.0 : 2.5) * dt;
  const turn = 2.2 * dt;
  if (keys.has("ArrowLeft")) player.dir -= turn;
  if (keys.has("ArrowRight")) player.dir += turn;
  let forward = 0;
  let strafe = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
  if (keys.has("KeyA")) strafe -= 1;
  if (keys.has("KeyD")) strafe += 1;
  if (forward || strafe) {
    const fx = Math.cos(player.dir) * forward + Math.cos(player.dir + Math.PI / 2) * strafe;
    const fy = Math.sin(player.dir) * forward + Math.sin(player.dir + Math.PI / 2) * strafe;
    const len = Math.hypot(fx, fy) || 1;
    move((fx / len) * speed, (fy / len) * speed);
  }

  for (const p of pickups) {
    if (!p.active || Math.hypot(p.x - player.x, p.y - player.y) > 0.55) continue;
    p.active = false;
    if (p.type === "ammo") {
      player.ammo += 12;
      flash("Ammo collected");
    } else if (p.type === "med") {
      player.health = Math.min(100, player.health + 30);
      flash("Health restored");
    } else {
      player.keys += 1;
      flash("Exit key found");
    }
  }

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.cool = Math.max(0, enemy.cool - dt);
    if (dist < 6 && hasLineOfSight(enemy.x, enemy.y, player.x, player.y)) {
      if (dist > 0.85) {
        const step = 1.1 * dt;
        const nx = enemy.x + (dx / dist) * step;
        const ny = enemy.y + (dy / dist) * step;
        if (!solidAt(nx, enemy.y)) enemy.x = nx;
        if (!solidAt(enemy.x, ny)) enemy.y = ny;
      } else if (enemy.cool === 0) {
        player.health -= 9;
        player.hurt = 0.18;
        enemy.cool = 0.9;
        if (player.health <= 0) endGame("You fell in the keep. Click to restart.");
      }
    }
  }

  if (tileAt(player.x, player.y) === TILE_EXIT) {
    if (player.keys > 0) endGame("You escaped the keep. Click to play again.");
    else flash("The exit is locked");
  }

  player.firing = Math.max(0, player.firing - dt * 6);
  player.hurt = Math.max(0, player.hurt - dt);
  messageTimer = Math.max(0, messageTimer - dt);
}

function hasLineOfSight(x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

function fire() {
  if (!running || player.firing > 0.15 || player.ammo <= 0) return;
  player.ammo -= 1;
  player.firing = 1;
  let best = null;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx) - player.dir;
    angle = Math.atan2(Math.sin(angle), Math.cos(angle));
    if (Math.abs(angle) < 0.11 && hasLineOfSight(player.x, player.y, enemy.x, enemy.y)) {
      if (!best || dist < best.dist) best = { enemy, dist };
    }
  }
  if (!best) return;
  best.enemy.hp -= best.dist < 3 ? 28 : 18;
  if (best.enemy.hp <= 0) {
    best.enemy.alive = false;
    player.score += 100;
    flash("Guard down");
  }
}

function render() {
  const sky = ctx.createLinearGradient(0, 0, 0, H / 2);
  sky.addColorStop(0, "#202832");
  sky.addColorStop(1, "#596070");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H / 2);
  const floor = ctx.createLinearGradient(0, H / 2, 0, H);
  floor.addColorStop(0, "#42392c");
  floor.addColorStop(1, "#15130f");
  ctx.fillStyle = floor;
  ctx.fillRect(0, H / 2, W, H / 2);

  for (let x = 0; x < W; x++) {
    const cameraX = (2 * x) / W - 1;
    const angle = player.dir + Math.atan(cameraX * Math.tan(FOV / 2));
    const hit = castRay(angle);
    const corrected = hit.dist * Math.cos(angle - player.dir);
    zBuffer[x] = corrected;
    const lineH = Math.min(H * 2, H / corrected);
    const y0 = Math.floor(H / 2 - lineH / 2);
    const tex = textures[hit.tile] || textures[TILE_STONE];
    ctx.globalAlpha = hit.side ? 0.78 : 1;
    ctx.drawImage(tex, hit.texX, 0, 1, 64, x, y0, 1, lineH);
    ctx.globalAlpha = 1;
  }

  drawSprites();
  drawWeapon();
  drawMiniMap();
  drawOverlayText();
  if (player.hurt > 0) {
    ctx.fillStyle = `rgba(160, 18, 18, ${player.hurt * 2.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawSprites() {
  const drawables = [];
  for (const enemy of enemies) {
    if (enemy.alive) drawables.push({ ...enemy, sprite: sprites.enemy, size: 0.9 });
  }
  for (const p of pickups) {
    if (p.active) drawables.push({ ...p, sprite: sprites[p.type], size: 0.55 });
  }
  drawables.sort((a, b) => distSq(b) - distSq(a));
  for (const obj of drawables) {
    const dx = obj.x - player.x;
    const dy = obj.y - player.y;
    const dirX = Math.cos(player.dir);
    const dirY = Math.sin(player.dir);
    const planeX = -dirY * Math.tan(FOV / 2);
    const planeY = dirX * Math.tan(FOV / 2);
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const transformX = invDet * (dirY * dx - dirX * dy);
    const transformY = invDet * (-planeY * dx + planeX * dy);
    if (transformY <= 0.05) continue;
    const screenX = Math.floor((W / 2) * (1 + transformX / transformY));
    const size = Math.abs(Math.floor((H / transformY) * obj.size));
    const x0 = screenX - size / 2;
    const y0 = H / 2 - size / 2;
    if (screenX >= 0 && screenX < W && transformY < zBuffer[Math.max(0, Math.min(W - 1, screenX))]) {
      ctx.drawImage(obj.sprite, x0, y0, size, size);
    }
  }
}

function distSq(obj) {
  return (obj.x - player.x) ** 2 + (obj.y - player.y) ** 2;
}

function drawWeapon() {
  const bob = Math.sin(performance.now() / 85) * 4;
  const recoil = player.firing * 28;
  const cx = W / 2;
  const base = H - 24 + recoil + bob;
  ctx.fillStyle = "#171717";
  ctx.fillRect(cx - 72, base - 96, 144, 120);
  ctx.fillStyle = "#4d4d45";
  ctx.fillRect(cx - 24, base - 150, 48, 78);
  ctx.fillStyle = "#222";
  ctx.fillRect(cx - 16, base - 165, 32, 32);
  ctx.fillStyle = "#8d6b43";
  ctx.fillRect(cx - 54, base - 54, 108, 38);
  if (player.firing > 0.55) {
    ctx.fillStyle = "#ffe38a";
    ctx.beginPath();
    ctx.moveTo(cx, base - 184);
    ctx.lineTo(cx - 28, base - 134);
    ctx.lineTo(cx + 28, base - 134);
    ctx.fill();
  }
}

function drawMiniMap() {
  const scale = 7;
  const ox = 18;
  const oy = 18;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(ox - 6, oy - 6, world[0].length * scale + 12, world.length * scale + 12);
  for (let y = 0; y < world.length; y++) {
    for (let x = 0; x < world[y].length; x++) {
      ctx.fillStyle = world[y][x] ? "#8f8270" : "#171717";
      if (world[y][x] === TILE_EXIT) ctx.fillStyle = "#d1ad3a";
      ctx.fillRect(ox + x * scale, oy + y * scale, scale - 1, scale - 1);
    }
  }
  ctx.fillStyle = "#d8ece8";
  ctx.beginPath();
  ctx.arc(ox + player.x * scale, oy + player.y * scale, 3, 0, TWO_PI);
  ctx.fill();
  ctx.strokeStyle = "#d8ece8";
  ctx.beginPath();
  ctx.moveTo(ox + player.x * scale, oy + player.y * scale);
  ctx.lineTo(ox + (player.x + Math.cos(player.dir) * 0.9) * scale, oy + (player.y + Math.sin(player.dir) * 0.9) * scale);
  ctx.stroke();
  ctx.fillStyle = "#b51f1f";
  for (const enemy of enemies) {
    if (enemy.alive) ctx.fillRect(ox + enemy.x * scale - 2, oy + enemy.y * scale - 2, 4, 4);
  }
}

function drawOverlayText() {
  if (messageTimer <= 0) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(W / 2 - 170, 72, 340, 38);
  ctx.fillStyle = "#f5e8bd";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, W / 2, 98);
  ctx.textAlign = "start";
}

function flash(text) {
  message = text;
  messageTimer = 1.4;
}

function syncHud() {
  healthEl.textContent = Math.max(0, Math.ceil(player.health));
  ammoEl.textContent = player.ammo;
  scoreEl.textContent = player.score;
  keysEl.textContent = player.keys;
}

function endGame(text) {
  running = false;
  banner.querySelector("p").textContent = text;
  startButton.textContent = "Restart";
  banner.classList.remove("hidden");
  document.exitPointerLock?.();
}

function resetGame() {
  player.x = 2.4;
  player.y = 2.4;
  player.dir = 0.04;
  player.health = 100;
  player.ammo = 32;
  player.score = 0;
  player.keys = 0;
  enemies.forEach((enemy) => {
    enemy.x = enemy.sx;
    enemy.y = enemy.sy;
    enemy.hp = enemy.maxHp;
    enemy.alive = true;
    enemy.cool = 0;
  });
  pickups.forEach((pickup) => {
    pickup.active = true;
  });
  running = true;
  banner.classList.add("hidden");
  canvas.requestPointerLock?.();
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (running) update(dt);
  render();
  syncHud();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", resetGame);
canvas.addEventListener("click", () => {
  if (!running) resetGame();
  else fire();
});
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    fire();
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas && running) player.dir += event.movementX * 0.0022;
});

requestAnimationFrame(loop);
