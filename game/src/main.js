// Boot and the one loop. Input is sampled every frame; the arena advances in fixed 1/60 s
// steps; the renderer paints what is there. The game moves between title, play, paused and
// over. The ?shot=start|play|end query stages a deterministic scene, paints it twice and sets
// window.__shotReady so a headless camera can capture it.

import { BEST_KEY, ENEMY, PALETTE, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { ACTION_BURST, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const effects = createEffects(createRandom((seed ^ 0x9e3779b9) >>> 0));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be unavailable; the best then lasts only for this visit.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, effects);
  const ui = {
    best: scene.best,
    victory: scene.victory,
    newBest: false,
    time: scene.time,
    effects,
    muted: true,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let victory = false;
  let newBest = false;
  let clock = 0;
  let accumulator = 0;
  let last = performance.now();

  const ui = {
    best,
    victory,
    newBest,
    time: clock,
    effects,
    muted: false,
  };

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    effects.reset();
    accumulator = 0;
    clock = 0;
    victory = false;
    newBest = false;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.wave();
    announce('Wave 1. Survive ten waves.');
  }

  function finish(won) {
    if (screen === SCREEN_OVER) return;
    screen = SCREEN_OVER;
    victory = won;
    if (world.state.score > best) {
      best = world.state.score;
      newBest = true;
      saveBest(best);
    } else {
      newBest = false;
    }
    if (won) audio.victory();
    else audio.defeat();
    announce(won
      ? `Arena cleared. Score ${world.state.score}. Best ${best}.`
      : `Core collapsed. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      audio.toggleMute();
      announce(audio.isMuted() ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function processEvents(events) {
    let shootSound = false;
    let hitSound = false;
    let deathSound = false;
    let pickupSound = false;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (event.type === 'shoot') {
        if (!shootSound) {
          audio.shoot();
          shootSound = true;
        }
        effects.burst(event.x, event.y, PALETTE.bullet, 1, 70, 1.8);
      } else if (event.type === 'hit') {
        if (!hitSound) {
          audio.hit();
          hitSound = true;
        }
        const color = ENEMY[event.enemyType] ? ENEMY[event.enemyType].color : PALETTE.drifter;
        effects.burst(event.x, event.y, color, 4, 120, 2.2);
        effects.addShake(1.4);
      } else if (event.type === 'death') {
        if (!deathSound) {
          audio.death();
          deathSound = true;
        }
        const color = ENEMY[event.enemyType] ? ENEMY[event.enemyType].color : PALETTE.drifter;
        effects.burst(event.x, event.y, color, 19, 260, 3.4);
        effects.ring(event.x, event.y, color, 66, 3);
        effects.addShake(5);
      } else if (event.type === 'orb') {
        if (!pickupSound) {
          audio.pickup();
          pickupSound = true;
        }
        effects.burst(event.x, event.y, PALETTE.orb, 7, 110, 2.2);
      } else if (event.type === 'burst') {
        audio.burst();
        effects.burst(event.x, event.y, PALETTE.player, 26, 320, 3.2);
        effects.ring(event.x, event.y, PALETTE.player, 202, 4);
        effects.addShake(7);
      } else if (event.type === 'hurt') {
        audio.hurt();
        effects.burst(event.x, event.y, PALETTE.danger, 24, 260, 3.8);
        effects.ring(event.x, event.y, PALETTE.danger, 130, 4);
        effects.addShake(17);
        announce(`Hull ${Math.ceil(world.state.player.health)}.`);
      } else if (event.type === 'cleared') {
        audio.cleared();
        effects.ring(event.x, event.y, PALETTE.energy, 360, 3);
        announce(`Wave ${event.wave} cleared.`);
      } else if (event.type === 'wave') {
        audio.wave();
        announce(`Wave ${event.wave}.`);
      } else if (event.type === 'lose') {
        effects.burst(event.x, event.y, PALETTE.danger, 56, 400, 4.8);
        effects.ring(event.x, event.y, PALETTE.danger, 270, 6);
        effects.addShake(24);
      } else if (event.type === 'win') {
        effects.ring(640, 360, PALETTE.victory, 520, 5);
        effects.burst(640, 360, PALETTE.victory, 40, 300, 3.2);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const wasPlaying = screen === SCREEN_PLAY;
    const actions = input.takeActions();
    handleActions(actions);

    if (screen === SCREEN_PLAY) {
      accumulator += delta;
      let burst = wasPlaying && (actions & ACTION_BURST) !== 0;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const pointer = renderer.toWorld(input.pointer.x, input.pointer.y);
        const move = input.move();
        const events = world.step(STEP, {
          moveX: move.x,
          moveY: move.y,
          aimX: pointer.x,
          aimY: pointer.y,
          burst,
        });
        burst = false;
        accumulator -= STEP;
        processEvents(events);
        if (world.state.phase === 'defeat') {
          finish(false);
          break;
        }
        if (world.state.phase === 'victory') {
          finish(true);
          break;
        }
      }
      if (screen !== SCREEN_PLAY) accumulator = 0;
    } else {
      accumulator = 0;
    }

    if (screen !== SCREEN_PAUSED) {
      effects.update(delta);
      clock += delta;
    }

    ui.best = best;
    ui.victory = victory;
    ui.newBest = newBest;
    ui.time = clock;
    ui.muted = audio.isMuted();
    renderer.draw(world.state, screen, ui);
  }

  // Leaving the tab pauses a running game instead of letting the dark advance unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Drift. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
