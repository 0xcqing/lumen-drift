// The staged scenes behind ?shot=start|play|end. Each one runs the real rules with a simple
// autopilot from a fresh world, so a screenshot shows a real moment of play rather than a
// mock-up: the same seed always produces the same bolts, shapes, sparks and score.

import { ENEMY, FIELD, NOVA, PALETTE, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PLAY_SECONDS = 44;
const BUILD_SECONDS = 26;
const END_SECONDS = 170;

function nearest(state) {
  const player = state.player;
  let best = null;
  let bestDistance = Infinity;
  for (let index = 0; index < state.enemies.length; index += 1) {
    const enemy = state.enemies[index];
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = enemy;
    }
  }
  return best;
}

function dangerousCount(state, radius) {
  const player = state.player;
  let count = 0;
  for (let index = 0; index < state.enemies.length; index += 1) {
    const enemy = state.enemies[index];
    if (enemy.dead) continue;
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < radius) count += 1;
  }
  return count;
}

/** Movement only: push away from shapes, drift toward motes, stay near the middle. */
function evade(state) {
  const player = state.player;
  let moveX = 0;
  let moveY = 0;

  for (let index = 0; index < state.enemies.length; index += 1) {
    const enemy = state.enemies[index];
    if (enemy.dead) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > 310) continue;
    const weight = (1 - distance / 310) * 3.6;
    moveX += (dx / distance) * weight;
    moveY += (dy / distance) * weight;
  }

  for (let index = 0; index < state.orbs.length; index += 1) {
    const orb = state.orbs[index];
    const dx = orb.x - player.x;
    const dy = orb.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > 330) continue;
    const weight = (1 - distance / 330) * 0.85;
    moveX += (dx / distance) * weight;
    moveY += (dy / distance) * weight;
  }

  moveX += (FIELD.width / 2 - player.x) * 0.0007;
  moveY += (FIELD.height / 2 - player.y) * 0.0007;

  const length = Math.hypot(moveX, moveY);
  if (length > 1) {
    moveX /= length;
    moveY /= length;
  }
  return { moveX, moveY };
}

/** A cautious pilot: evade, then fire at the closest shape, bursting when boxed in. */
function playInput(state) {
  const move = evade(state);
  const target = nearest(state);
  const aimX = target ? target.x : state.player.x;
  const aimY = target ? target.y : state.player.y - 300;
  const burst = state.player.energy >= NOVA.cost
    && state.player.burstCooldown <= 0
    && dangerousCount(state, NOVA.radius - 12) >= 2;
  return { moveX: move.moveX, moveY: move.moveY, aimX, aimY, burst };
}

/** Evade, but aim the other way so shapes gather for the play screenshot. */
function stallInput(state) {
  const move = evade(state);
  const target = nearest(state);
  const aimX = target ? state.player.x - (target.x - state.player.x) : state.player.x;
  const aimY = target ? state.player.y - (target.y - state.player.y) : state.player.y + 300;
  return { moveX: move.moveX, moveY: move.moveY, aimX, aimY, burst: false };
}

/** A doomed pilot: charge the closest shape, but aim away so its own bolts cannot save it. */
function recklessInput(state) {
  const player = state.player;
  const target = nearest(state);
  let moveX = 0;
  let moveY = 0;
  if (target) {
    moveX = target.x - player.x;
    moveY = target.y - player.y;
  } else {
    moveX = FIELD.width / 2 - player.x;
    moveY = FIELD.height / 2 - player.y;
  }
  const length = Math.hypot(moveX, moveY) || 1;
  moveX /= length;
  moveY /= length;
  const aimX = target ? player.x - (target.x - player.x) : player.x;
  const aimY = target ? player.y - (target.y - player.y) : player.y + 300;
  return { moveX, moveY, aimX, aimY, burst: false };
}

function decorate(events, effects) {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.type === 'death') {
      const color = ENEMY[event.enemyType] ? ENEMY[event.enemyType].color : PALETTE.drifter;
      effects.burst(event.x, event.y, color, 20, 250, 3.4);
      effects.ring(event.x, event.y, color, 64, 3);
      effects.addShake(5);
    } else if (event.type === 'hit') {
      const color = ENEMY[event.enemyType] ? ENEMY[event.enemyType].color : PALETTE.drifter;
      effects.burst(event.x, event.y, color, 5, 120, 2.2);
      effects.addShake(1.2);
    } else if (event.type === 'hurt') {
      effects.burst(event.x, event.y, PALETTE.danger, 22, 240, 3.6);
      effects.ring(event.x, event.y, PALETTE.danger, 120, 4);
      effects.addShake(15);
    } else if (event.type === 'orb') {
      effects.burst(event.x, event.y, PALETTE.orb, 7, 110, 2.2);
    } else if (event.type === 'burst') {
      effects.burst(event.x, event.y, PALETTE.player, 26, 320, 3.2);
      effects.ring(event.x, event.y, PALETTE.player, 200, 4);
    } else if (event.type === 'cleared') {
      effects.ring(event.x, event.y, PALETTE.energy, 360, 3);
    } else if (event.type === 'lose') {
      effects.burst(event.x, event.y, PALETTE.danger, 54, 390, 4.8);
      effects.ring(event.x, event.y, PALETTE.danger, 260, 6);
      effects.addShake(24);
    } else if (event.type === 'win') {
      effects.ring(640, 360, PALETTE.victory, 520, 5);
    }
  }
}

function run(world, effects, input, limit) {
  const steps = Math.floor(limit / STEP);
  for (let index = 0; index < steps; index += 1) {
    const events = world.step(STEP, input(world.state));
    decorate(events, effects);
    effects.update(STEP);
    if (world.state.phase === 'defeat' || world.state.phase === 'victory') return;
  }
}

export function stageShot(name, world, effects) {
  world.reset();
  effects.reset();

  if (name !== 'play' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0, victory: false, time: 2.6 };
  }

  if (name === 'play') {
    run(world, effects, playInput, PLAY_SECONDS);
    run(world, effects, stallInput, 5);
    run(world, effects, playInput, 1);
    return {
      screen: SCREEN_PLAY,
      best: world.state.score,
      victory: false,
      time: 5.1,
    };
  }

  run(world, effects, playInput, BUILD_SECONDS);
  if (world.state.phase !== 'defeat' && world.state.phase !== 'victory') {
    run(world, effects, recklessInput, END_SECONDS);
  }
  if (world.state.phase !== 'defeat') {
    world.state.player.health = 0;
    world.state.phase = 'defeat';
  }

  const player = world.state.player;
  effects.burst(player.x, player.y, PALETTE.danger, 40, 380, 4.6);
  effects.ring(player.x, player.y, PALETTE.danger, 250, 6);
  effects.addShake(22);

  return {
    screen: SCREEN_OVER,
    best: Math.max(world.state.score + 760, 1400),
    victory: false,
    time: 5.7,
  };
}
