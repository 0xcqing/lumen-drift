// Every tuning value, colour and label for Lumen Drift. The playfield is a fixed logical
// 1280x720 arena; the renderer scales it to whatever window the player has.

export const FIELD = { width: 1280, height: 720, inset: 34 };

export const STEP = 1 / 60;

export const MAX_WAVE = 10;

export const PLAYER = {
  radius: 15,
  speed: 330,
  maxHealth: 100,
  startHealth: 100,
  startEnergy: 20,
  maxEnergy: 100,
  invulnerable: 0.95,
  fireBase: 0.27,
  fireStep: 0.035,
  powerLevels: 4,
  powerSpan: 25,
};

export const BULLET = {
  speed: 760,
  radius: 4,
  life: 1.4,
  baseDamage: 1,
  damageStep: 0.45,
};

export const NOVA = {
  cost: 30,
  radius: 178,
  damage: 3,
  cooldown: 0.85,
  push: 300,
};

export const ORB = {
  radius: 6,
  energy: 14,
  score: 10,
  pullRange: 210,
  pullForce: 1100,
  maxSpeed: 470,
  life: 18,
};

export const ENEMY = {
  drifter: {
    radius: 15,
    hp: 2,
    hpPerWave: 0.34,
    speed: 70,
    speedPerWave: 8,
    speedJitter: 26,
    damage: 13,
    score: 25,
    orbs: 1,
    color: '#c15cff',
  },
  brute: {
    radius: 27,
    hp: 8,
    hpPerWave: 0.9,
    speed: 44,
    speedPerWave: 4.5,
    speedJitter: 12,
    damage: 26,
    score: 95,
    orbs: 3,
    color: '#ff8a3d',
  },
};

export const WAVE = {
  baseCount: 4,
  perWave: 2,
  firstBruteWave: 3,
  bruteEvery: 2,
  gap: 2.5,
  spawnBase: 0.88,
  spawnStep: 0.045,
  spawnFloor: 0.3,
  clearScore: 100,
  clearScorePerWave: 25,
  heal: 8,
  energy: 15,
};

export const PALETTE = {
  space: '#05070f',
  spaceDeep: '#02030a',
  arena: 'rgba(98, 220, 255, 0.28)',
  grid: 'rgba(84, 190, 240, 0.07)',
  gridStrong: 'rgba(84, 190, 240, 0.14)',
  star: '#a8e8ff',
  player: '#63f5ff',
  playerHot: '#eaffff',
  playerRim: 'rgba(110, 250, 255, 0.55)',
  bullet: '#8ffcff',
  drifter: '#c15cff',
  drifterEdge: '#e5b0ff',
  drifterCore: '#ff5f9e',
  brute: '#ff8a3d',
  bruteEdge: '#ffd0a1',
  bruteCore: '#ff3b3b',
  orb: '#78ffb4',
  orbHot: '#e9fff2',
  danger: '#ff4d6d',
  health: '#5ff0ff',
  healthLow: '#ff5c7a',
  energy: '#56f0a8',
  text: '#eaf7ff',
  muted: '#8fa8c4',
  faint: '#54647d',
  panel: 'rgba(6, 12, 26, 0.88)',
  panelEdge: 'rgba(110, 240, 255, 0.55)',
  gold: '#ffd36e',
  victory: '#7dffb8',
};

export const FONT = '"Segoe UI", "Trebuchet MS", system-ui, sans-serif';

export const BEST_KEY = 'lumen-drift.best';
