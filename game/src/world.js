// The arena's rules, with no canvas and no browser in it. A fixed step moves the pilot, the
// dark shapes, the light bolts and the energy motes, resolves collisions and advances the wave
// schedule. Events come back as plain objects so the caller can add sound and sparks without
// the simulation knowing about either.

import { BULLET, ENEMY, FIELD, MAX_WAVE, NOVA, ORB, PLAYER, WAVE } from './config.js';

const TAU = Math.PI * 2;

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function powerOf(energy) {
  const level = 1 + Math.floor(energy / PLAYER.powerSpan);
  return Math.min(PLAYER.powerLevels, level);
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    vx: 0,
    vy: 0,
    aimX: FIELD.width / 2,
    aimY: FIELD.height / 2 - 120,
    facingX: 0,
    facingY: -1,
    health: PLAYER.startHealth,
    energy: PLAYER.startEnergy,
    power: 1,
    invuln: 0,
    fireTimer: 0,
    burstCooldown: 0,
  };

  const state = {
    player,
    enemies: [],
    bullets: [],
    orbs: [],
    score: 0,
    kills: 0,
    wave: 1,
    phase: 'combat',
    time: 0,
    elapsed: 0,
    spawnQueue: [],
    spawnTimer: 0,
    waveTimer: 0,
    banner: 0,
  };

  function spawnOrbs(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * TAU;
      const pace = 24 + random() * 92;
      state.orbs.push({
        x,
        y,
        vx: Math.cos(angle) * pace,
        vy: Math.sin(angle) * pace,
        life: ORB.life,
        phase: random() * TAU,
        dead: false,
      });
    }
    if (state.orbs.length > 160) state.orbs.splice(0, state.orbs.length - 160);
  }

  function startWave(number, events) {
    state.wave = number;
    state.phase = 'combat';
    state.spawnQueue.length = 0;
    const drifters = WAVE.baseCount + number * WAVE.perWave;
    for (let index = 0; index < drifters; index += 1) state.spawnQueue.push('drifter');
    const brutes = number >= WAVE.firstBruteWave
      ? 1 + Math.floor((number - WAVE.firstBruteWave) / WAVE.bruteEvery)
      : 0;
    for (let index = 0; index < brutes; index += 1) state.spawnQueue.push('brute');
    for (let index = state.spawnQueue.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      const held = state.spawnQueue[index];
      state.spawnQueue[index] = state.spawnQueue[other];
      state.spawnQueue[other] = held;
    }
    state.spawnTimer = 0.55;
    state.banner = 2.2;
    if (events) events.push({ type: 'wave', wave: number });
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.aimX = player.x;
    player.aimY = player.y - 120;
    player.facingX = 0;
    player.facingY = -1;
    player.health = PLAYER.startHealth;
    player.energy = PLAYER.startEnergy;
    player.power = powerOf(player.energy);
    player.invuln = 0;
    player.fireTimer = 0.2;
    player.burstCooldown = 0;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.orbs.length = 0;
    state.score = 0;
    state.kills = 0;
    state.time = 0;
    state.elapsed = 0;
    state.waveTimer = 0;
    state.banner = 0;
    startWave(1, null);
  }

  function spawnEnemy(type) {
    const config = ENEMY[type];
    const edge = Math.floor(random() * 4);
    let x = FIELD.width / 2;
    let y = FIELD.height / 2;
    let bestX = x;
    let bestY = y;
    let bestGap = -1;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (edge === 0) {
        x = FIELD.inset + config.radius + random() * (FIELD.width - 2 * (FIELD.inset + config.radius));
        y = FIELD.inset + config.radius + 6;
      } else if (edge === 1) {
        x = FIELD.width - FIELD.inset - config.radius - 6;
        y = FIELD.inset + config.radius + random() * (FIELD.height - 2 * (FIELD.inset + config.radius));
      } else if (edge === 2) {
        x = FIELD.inset + config.radius + random() * (FIELD.width - 2 * (FIELD.inset + config.radius));
        y = FIELD.height - FIELD.inset - config.radius - 6;
      } else {
        x = FIELD.inset + config.radius + 6;
        y = FIELD.inset + config.radius + random() * (FIELD.height - 2 * (FIELD.inset + config.radius));
      }
      const gap = Math.hypot(x - player.x, y - player.y);
      if (gap > bestGap) {
        bestGap = gap;
        bestX = x;
        bestY = y;
      }
      if (gap > 300) break;
    }

    const hp = config.hp + config.hpPerWave * (state.wave - 1);
    state.enemies.push({
      type,
      x: bestX,
      y: bestY,
      vx: 0,
      vy: 0,
      radius: config.radius,
      hp,
      maxHp: hp,
      speed: config.speed + config.speedPerWave * (state.wave - 1) + random() * config.speedJitter,
      phase: random() * TAU,
      wobble: 1.1 + random() * 1.7,
      spawn: 0.55,
      flash: 0,
      dead: false,
    });
  }

  function killEnemy(enemy, events, drop) {
    if (enemy.dead) return;
    enemy.dead = true;
    const config = ENEMY[enemy.type];
    state.score += config.score;
    state.kills += 1;
    if (drop) spawnOrbs(enemy.x, enemy.y, config.orbs);
    events.push({ type: 'death', x: enemy.x, y: enemy.y, enemyType: enemy.type });
  }

  function hurtEnemy(enemy, amount, events, pushX, pushY) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 0.16;
    if (pushX !== 0 || pushY !== 0) {
      enemy.vx += pushX;
      enemy.vy += pushY;
    }
    if (enemy.hp <= 0) killEnemy(enemy, events, true);
  }

  function hurtPlayer(amount, sourceX, sourceY, events) {
    if (player.invuln > 0 || state.phase === 'defeat') return;
    player.health = Math.max(0, player.health - amount);
    player.invuln = PLAYER.invulnerable;
    const dx = player.x - sourceX;
    const dy = player.y - sourceY;
    const length = Math.hypot(dx, dy) || 1;
    player.vx += (dx / length) * 260;
    player.vy += (dy / length) * 260;
    events.push({ type: 'hurt', x: player.x, y: player.y, amount });
    if (player.health <= 0) {
      state.phase = 'defeat';
      events.push({ type: 'lose', x: player.x, y: player.y, score: state.score });
    }
  }

  function fireBullet(events) {
    const angle = Math.atan2(player.facingY, player.facingX);
    const muzzleX = player.x + player.facingX * (player.radius + 8);
    const muzzleY = player.y + player.facingY * (player.radius + 8);
    const damage = BULLET.baseDamage + (player.power - 1) * BULLET.damageStep;
    state.bullets.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(angle) * BULLET.speed + player.vx * 0.14,
      vy: Math.sin(angle) * BULLET.speed + player.vy * 0.14,
      radius: BULLET.radius,
      damage,
      life: BULLET.life,
      dead: false,
    });
    events.push({ type: 'shoot', x: muzzleX, y: muzzleY, angle });
  }

  function step(dt, input) {
    const events = [];
    if (state.phase === 'defeat') {
      state.time += dt;
      return events;
    }

    state.time += dt;
    state.elapsed += dt;
    if (state.banner > 0) state.banner = Math.max(0, state.banner - dt);

    const aimX = input.aimX;
    const aimY = input.aimY;
    player.aimX = aimX;
    player.aimY = aimY;
    const aimDX = aimX - player.x;
    const aimDY = aimY - player.y;
    const aimLength = Math.hypot(aimDX, aimDY);
    if (aimLength > 5) {
      player.facingX = aimDX / aimLength;
      player.facingY = aimDY / aimLength;
    }

    player.invuln = Math.max(0, player.invuln - dt);
    player.burstCooldown = Math.max(0, player.burstCooldown - dt);
    player.fireTimer -= dt;

    const moveX = input.moveX || 0;
    const moveY = input.moveY || 0;
    const blend = Math.min(1, dt * 11);
    player.vx += (moveX * PLAYER.speed - player.vx) * blend;
    player.vy += (moveY * PLAYER.speed - player.vy) * blend;
    player.x = clamp(
      player.x + player.vx * dt,
      FIELD.inset + player.radius,
      FIELD.width - FIELD.inset - player.radius,
    );
    player.y = clamp(
      player.y + player.vy * dt,
      FIELD.inset + player.radius,
      FIELD.height - FIELD.inset - player.radius,
    );

    if (input.burst && player.burstCooldown <= 0 && player.energy >= NOVA.cost) {
      player.energy -= NOVA.cost;
      player.burstCooldown = NOVA.cooldown;
      events.push({ type: 'burst', x: player.x, y: player.y });
      for (let index = 0; index < state.enemies.length; index += 1) {
        const enemy = state.enemies[index];
        if (enemy.dead) continue;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const length = Math.hypot(dx, dy) || 1;
        if (length > NOVA.radius + enemy.radius) continue;
        enemy.vx += (dx / length) * NOVA.push;
        enemy.vy += (dy / length) * NOVA.push;
        hurtEnemy(enemy, NOVA.damage, events, 0, 0);
      }
    }

    if (player.fireTimer <= 0) {
      fireBullet(events);
      const interval = Math.max(0.13, PLAYER.fireBase - PLAYER.fireStep * (player.power - 1));
      player.fireTimer = interval;
    }

    if (state.phase === 'combat' && state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.spawnQueue.shift());
        state.spawnTimer = Math.max(WAVE.spawnFloor, WAVE.spawnBase - WAVE.spawnStep * (state.wave - 1));
      }
    }

    for (let index = 0; index < state.bullets.length; index += 1) {
      const bolt = state.bullets[index];
      if (bolt.dead) continue;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0 || bolt.x < -40 || bolt.x > FIELD.width + 40 || bolt.y < -40 || bolt.y > FIELD.height + 40) {
        bolt.dead = true;
        continue;
      }
      for (let other = 0; other < state.enemies.length; other += 1) {
        const enemy = state.enemies[other];
        if (enemy.dead || enemy.spawn > 0) continue;
        const dx = enemy.x - bolt.x;
        const dy = enemy.y - bolt.y;
        if (dx * dx + dy * dy > (enemy.radius + bolt.radius) * (enemy.radius + bolt.radius)) continue;
        bolt.dead = true;
        const length = Math.hypot(bolt.vx, bolt.vy) || 1;
        hurtEnemy(enemy, bolt.damage, events, (bolt.vx / length) * 55, (bolt.vy / length) * 55);
        events.push({
          type: 'hit',
          x: bolt.x,
          y: bolt.y,
          enemyType: enemy.type,
        });
        break;
      }
    }

    for (let index = 0; index < state.enemies.length; index += 1) {
      const enemy = state.enemies[index];
      if (enemy.dead) continue;
      if (enemy.spawn > 0) enemy.spawn = Math.max(0, enemy.spawn - dt);
      enemy.flash = Math.max(0, enemy.flash - dt);

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const chase = Math.atan2(dy, dx) + Math.sin(state.time * enemy.wobble + enemy.phase) * 0.28;
      const damping = Math.max(0, 1 - 6 * dt);
      enemy.vx *= damping;
      enemy.vy *= damping;
      enemy.x += (Math.cos(chase) * enemy.speed + enemy.vx) * dt;
      enemy.y += (Math.sin(chase) * enemy.speed + enemy.vy) * dt;
    }

    for (let first = 0; first < state.enemies.length; first += 1) {
      const a = state.enemies[first];
      if (a.dead) continue;
      for (let second = first + 1; second < state.enemies.length; second += 1) {
        const b = state.enemies[second];
        if (b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        const wanted = a.radius + b.radius;
        if (distance >= wanted || distance < 0.001) continue;
        const push = (wanted - distance) * 0.5;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }

    const lowX = FIELD.inset;
    const highX = FIELD.width - FIELD.inset;
    const lowY = FIELD.inset;
    const highY = FIELD.height - FIELD.inset;
    for (let index = 0; index < state.enemies.length; index += 1) {
      const enemy = state.enemies[index];
      if (enemy.dead) continue;
      enemy.x = clamp(enemy.x, lowX + enemy.radius, highX - enemy.radius);
      enemy.y = clamp(enemy.y, lowY + enemy.radius, highY - enemy.radius);
      if (enemy.spawn > 0 || player.invuln > 0) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const reach = player.radius + enemy.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      const length = Math.hypot(dx, dy) || 1;
      hurtPlayer(ENEMY[enemy.type].damage, enemy.x, enemy.y, events);
      enemy.hp -= 2.5;
      enemy.flash = 0.16;
      enemy.vx -= (dx / length) * 220;
      enemy.vy -= (dy / length) * 220;
      if (enemy.hp <= 0) killEnemy(enemy, events, false);
      if (state.phase === 'defeat') break;
    }

    for (let index = 0; index < state.orbs.length; index += 1) {
      const orb = state.orbs[index];
      if (orb.dead) continue;
      orb.life -= dt;
      if (orb.life <= 0) {
        orb.dead = true;
        continue;
      }
      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < ORB.pullRange) {
        orb.vx += (dx / distance) * ORB.pullForce * dt;
        orb.vy += (dy / distance) * ORB.pullForce * dt;
      } else {
        const damping = Math.max(0, 1 - 1.4 * dt);
        orb.vx *= damping;
        orb.vy *= damping;
      }
      const pace = Math.hypot(orb.vx, orb.vy);
      if (pace > ORB.maxSpeed) {
        orb.vx = (orb.vx / pace) * ORB.maxSpeed;
        orb.vy = (orb.vy / pace) * ORB.maxSpeed;
      }
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (distance < player.radius + ORB.radius + 5) {
        orb.dead = true;
        player.energy = Math.min(PLAYER.maxEnergy, player.energy + ORB.energy);
        state.score += ORB.score;
        events.push({ type: 'orb', x: orb.x, y: orb.y });
      }
    }

    for (let index = state.bullets.length - 1; index >= 0; index -= 1) {
      if (state.bullets[index].dead) state.bullets.splice(index, 1);
    }
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      if (state.enemies[index].dead) state.enemies.splice(index, 1);
    }
    for (let index = state.orbs.length - 1; index >= 0; index -= 1) {
      if (state.orbs[index].dead) state.orbs.splice(index, 1);
    }

    player.power = powerOf(player.energy);

    if (state.phase === 'defeat') return events;

    if (state.phase === 'combat' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.phase = 'intermission';
      state.waveTimer = WAVE.gap;
      state.banner = 0;
      state.score += WAVE.clearScore + WAVE.clearScorePerWave * state.wave;
      player.health = Math.min(PLAYER.maxHealth, player.health + WAVE.heal);
      player.energy = Math.min(PLAYER.maxEnergy, player.energy + WAVE.energy);
      player.power = powerOf(player.energy);
      events.push({ type: 'cleared', wave: state.wave, x: player.x, y: player.y });
    } else if (state.phase === 'intermission') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        if (state.wave >= MAX_WAVE) {
          state.phase = 'victory';
          events.push({ type: 'win', score: state.score });
        } else {
          startWave(state.wave + 1, events);
        }
      }
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
