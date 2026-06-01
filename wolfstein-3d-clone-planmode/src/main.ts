import * as THREE from "three";
import "./style.css";

type Tile = 0 | 1 | 2 | 3;
type GameMode = "start" | "playing" | "paused" | "won" | "dead";
type PickupType = "health" | "ammo" | "score";

interface Enemy {
  mesh: THREE.Sprite;
  position: THREE.Vector3;
  health: number;
  attackCooldown: number;
  alive: boolean;
}

interface Pickup {
  mesh: THREE.Mesh;
  type: PickupType;
  value: number;
  collected: boolean;
}

function mustQuery<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing DOM element: ${selector}`);
  return element;
}

const canvas = mustQuery<HTMLCanvasElement>("#game");
const hudHealth = mustQuery<HTMLSpanElement>("#health");
const hudAmmo = mustQuery<HTMLSpanElement>("#ammo");
const hudScore = mustQuery<HTMLSpanElement>("#score");
const overlay = mustQuery<HTMLDivElement>("#overlay");
const message = mustQuery<HTMLParagraphElement>("#message");
const startButton = mustQuery<HTMLButtonElement>("#start");
const weapon = mustQuery<HTMLDivElement>("#weapon");

const level = {
  width: 16,
  height: 16,
  spawn: new THREE.Vector3(2.5, 0, 2.5),
  exit: new THREE.Vector3(13.5, 0, 13.5),
  tiles: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 2, 2, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 2, 2, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 2, 0, 0, 0, 3, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 2, 0, 0, 0, 1, 1, 1, 0, 2, 2, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ] as Tile[][],
  enemies: [
    new THREE.Vector3(7.5, 0, 2.5),
    new THREE.Vector3(11.5, 0, 6.5),
    new THREE.Vector3(4.5, 0, 12.5),
    new THREE.Vector3(12.5, 0, 11.5)
  ],
  pickups: [
    { type: "ammo" as PickupType, value: 10, position: new THREE.Vector3(5.5, 0, 5.5) },
    { type: "health" as PickupType, value: 25, position: new THREE.Vector3(2.5, 0, 12.5) },
    { type: "score" as PickupType, value: 250, position: new THREE.Vector3(10.5, 0, 10.5) },
    { type: "ammo" as PickupType, value: 8, position: new THREE.Vector3(13.5, 0, 3.5) }
  ]
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101215);
scene.fog = new THREE.Fog(0x101215, 6, 18);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);
camera.position.copy(level.spawn).setY(0.72);

const world = new THREE.Group();
scene.add(world);
scene.add(new THREE.HemisphereLight(0xf3deb1, 0x1b1c1d, 1.7));

const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x3a342b, roughness: 0.95 });
const ceilingMaterial = new THREE.MeshBasicMaterial({ color: 0x17181a, side: THREE.BackSide });
const wallMaterials = {
  1: new THREE.MeshStandardMaterial({ color: 0x83715b, roughness: 0.88 }),
  2: new THREE.MeshStandardMaterial({ color: 0x5e6f75, roughness: 0.82 }),
  3: new THREE.MeshStandardMaterial({ color: 0x7b483a, roughness: 0.86 })
};

const floor = new THREE.Mesh(new THREE.PlaneGeometry(level.width, level.height), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(level.width / 2, 0, level.height / 2);
world.add(floor);

const ceiling = new THREE.Mesh(new THREE.BoxGeometry(level.width, 0.08, level.height), ceilingMaterial);
ceiling.position.set(level.width / 2, 1.84, level.height / 2);
world.add(ceiling);

const exitMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.32, 0.32, 0.04, 32),
  new THREE.MeshBasicMaterial({ color: 0xf0c64a })
);
exitMesh.position.copy(level.exit).setY(0.03);
world.add(exitMesh);

for (let z = 0; z < level.height; z += 1) {
  for (let x = 0; x < level.width; x += 1) {
    const tile = level.tiles[z][x];
    if (tile === 0) continue;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 1), wallMaterials[tile]);
    wall.position.set(x + 0.5, 0.9, z + 0.5);
    world.add(wall);
  }
}

const enemies = level.enemies.map((position) => {
  const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xc84732 }));
  mesh.scale.set(0.58, 1.08, 1);
  mesh.position.copy(position).setY(0.68);
  world.add(mesh);
  return { mesh, position: position.clone(), health: 60, attackCooldown: 0, alive: true };
});

const pickups = level.pickups.map((pickup) => {
  const colors: Record<PickupType, number> = { health: 0x3aba61, ammo: 0xd8bd59, score: 0x58a5d8 };
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.34, 0.34),
    new THREE.MeshStandardMaterial({ color: colors[pickup.type], emissive: colors[pickup.type], emissiveIntensity: 0.2 })
  );
  mesh.position.copy(pickup.position).setY(0.25);
  world.add(mesh);
  return { mesh, type: pickup.type, value: pickup.value, collected: false };
});

let mode: GameMode = "start";
let yaw = 0;
let health = 100;
let ammo = 24;
let score = 0;
let shotCooldown = 0;
let audioContext: AudioContext | null = null;

const keys = new Set<string>();
const velocity = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();

function playTone(frequency: number, duration: number, type: OscillatorType = "square", gain = 0.05) {
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.value = gain;
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function setOverlay(nextMode: GameMode, text: string, buttonText = "Start") {
  mode = nextMode;
  message.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.toggle("hidden", nextMode === "playing");
}

function updateHud() {
  hudHealth.textContent = `HEALTH ${Math.max(0, Math.ceil(health))}`;
  hudAmmo.textContent = `AMMO ${ammo}`;
  hudScore.textContent = `SCORE ${score}`;
}

function tileAt(x: number, z: number): Tile {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  if (ix < 0 || iz < 0 || ix >= level.width || iz >= level.height) return 1;
  return level.tiles[iz][ix];
}

function canMoveTo(x: number, z: number) {
  const radius = 0.22;
  return (
    tileAt(x - radius, z - radius) === 0 &&
    tileAt(x + radius, z - radius) === 0 &&
    tileAt(x - radius, z + radius) === 0 &&
    tileAt(x + radius, z + radius) === 0
  );
}

function startGame() {
  if (mode === "dead" || mode === "won") resetGame();
  setOverlay("playing", "");
  canvas.requestPointerLock();
  audioContext ??= new AudioContext();
}

function resetGame() {
  camera.position.copy(level.spawn).setY(0.72);
  yaw = 0;
  health = 100;
  ammo = 24;
  score = 0;
  enemies.forEach((enemy, index) => {
    enemy.position.copy(level.enemies[index]);
    enemy.mesh.position.copy(enemy.position).setY(0.68);
    enemy.health = 60;
    enemy.alive = true;
    enemy.mesh.visible = true;
    enemy.attackCooldown = 0;
  });
  pickups.forEach((pickup) => {
    pickup.collected = false;
    pickup.mesh.visible = true;
  });
  updateHud();
}

function shoot() {
  if (mode !== "playing" || shotCooldown > 0 || ammo <= 0) return;
  shotCooldown = 0.32;
  ammo -= 1;
  weapon.classList.remove("firing");
  void weapon.offsetWidth;
  weapon.classList.add("firing");
  playTone(90, 0.08, "sawtooth", 0.09);

  raycaster.set(camera.position, camera.getWorldDirection(new THREE.Vector3()));
  const targets = enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.mesh);
  const hit = raycaster.intersectObjects(targets, false)[0];
  if (!hit || hit.distance > 8) {
    updateHud();
    return;
  }

  const enemy = enemies.find((candidate) => candidate.mesh === hit.object);
  if (!enemy) return;
  enemy.health -= 35;
  playTone(220, 0.05, "triangle", 0.04);
  if (enemy.health <= 0) {
    enemy.alive = false;
    enemy.mesh.visible = false;
    score += 100;
  }
  updateHud();
}

function hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3) {
  const steps = Math.ceil(from.distanceTo(to) * 4);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = THREE.MathUtils.lerp(from.x, to.x, t);
    const z = THREE.MathUtils.lerp(from.z, to.z, t);
    if (tileAt(x, z) !== 0) return false;
  }
  return true;
}

function updatePlayer(delta: number) {
  const turnSpeed = 2.4;
  if (keys.has("ArrowLeft")) yaw += turnSpeed * delta;
  if (keys.has("ArrowRight")) yaw -= turnSpeed * delta;
  camera.rotation.set(0, yaw, 0, "YXZ");

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(-forward.z, 0, forward.x);
  velocity.set(0, 0, 0);
  if (keys.has("KeyW")) velocity.add(forward);
  if (keys.has("KeyS")) velocity.sub(forward);
  if (keys.has("KeyD")) velocity.add(right);
  if (keys.has("KeyA")) velocity.sub(right);
  if (velocity.lengthSq() > 0) velocity.normalize().multiplyScalar(3.2 * delta);

  const nextX = camera.position.x + velocity.x;
  const nextZ = camera.position.z + velocity.z;
  if (canMoveTo(nextX, camera.position.z)) camera.position.x = nextX;
  if (canMoveTo(camera.position.x, nextZ)) camera.position.z = nextZ;

  if (camera.position.distanceTo(level.exit) < 0.7 && enemies.every((enemy) => !enemy.alive)) {
    score += 500;
    updateHud();
    playTone(620, 0.25, "triangle", 0.06);
    setOverlay("won", "Sector clear. Click restart to play again.", "Restart");
    document.exitPointerLock();
  }
}

function updateEnemies(delta: number) {
  const player = new THREE.Vector3(camera.position.x, 0, camera.position.z);
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
    const distance = enemy.position.distanceTo(player);
    const seesPlayer = distance < 7 && hasLineOfSight(enemy.position, player);
    if (seesPlayer && distance > 0.75) {
      const direction = player.clone().sub(enemy.position).normalize();
      const next = enemy.position.clone().addScaledVector(direction, 1.05 * delta);
      if (canMoveTo(next.x, next.z)) enemy.position.copy(next);
    }
    if (distance < 0.9 && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = 1.1;
      health -= 12;
      playTone(130, 0.1, "square", 0.04);
      if (health <= 0) {
        health = 0;
        setOverlay("dead", "You were overrun. Click restart to try again.", "Restart");
        document.exitPointerLock();
      }
      updateHud();
    }
    enemy.mesh.position.copy(enemy.position).setY(0.68);
  });
}

function updatePickups(delta: number) {
  pickups.forEach((pickup) => {
    if (pickup.collected) return;
    pickup.mesh.rotation.y += delta * 2.5;
    pickup.mesh.position.y = 0.25 + Math.sin(clock.elapsedTime * 3) * 0.04;
    if (pickup.mesh.position.distanceTo(camera.position) > 0.65) return;
    pickup.collected = true;
    pickup.mesh.visible = false;
    if (pickup.type === "health") health = Math.min(100, health + pickup.value);
    if (pickup.type === "ammo") ammo += pickup.value;
    if (pickup.type === "score") score += pickup.value;
    playTone(440, 0.08, "triangle", 0.05);
    updateHud();
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (mode === "playing") {
    shotCooldown = Math.max(0, shotCooldown - delta);
    updatePlayer(delta);
    updateEnemies(delta);
    updatePickups(delta);
  }
  exitMesh.rotation.y += delta;
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") shoot();
  if (event.code === "Escape" && mode === "playing") {
    setOverlay("paused", "Paused. Click resume to continue.", "Resume");
    document.exitPointerLock();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("mousedown", (event) => {
  if (event.button === 0 && mode === "playing") shoot();
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas || mode !== "playing") return;
  yaw -= event.movementX * 0.0022;
});

document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== canvas && mode === "playing") {
    setOverlay("paused", "Paused. Click resume to continue.", "Resume");
  }
});

startButton.addEventListener("click", startGame);
overlay.addEventListener("click", (event) => {
  if (event.target === overlay) startGame();
});

updateHud();
animate();
