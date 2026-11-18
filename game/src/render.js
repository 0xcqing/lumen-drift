// Drawing, and only drawing: arena, light, dark shapes, sparks, bars and the title, pause and
// end panels. The 1280x720 field is scaled to fit the window and centred; all glow is canvas
// shadowBlur, all art is paths and gradients, so the game loads no images at all.

import { ENEMY, FIELD, FONT, MAX_WAVE, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

function hash(value) {
  const number = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return number - Math.floor(number);
}

function roundedPath(context, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(window.innerWidth * ratio));
    const height = Math.max(1, Math.round(window.innerHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    view.ratio = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function toWorld(clientX, clientY) {
    return {
      x: (clientX * view.ratio - view.x) / view.scale,
      y: (clientY * view.ratio - view.y) / view.scale,
    };
  }

  function setFont(size, weight) {
    const key = `${weight} ${size}`;
    let font = fonts.get(key);
    if (!font) {
      font = `${weight} ${size}px ${FONT}`;
      fonts.set(key, font);
    }
    context.font = font;
  }

  function text(value, x, y, size, color, align, weight) {
    setFont(size, weight || '600');
    context.fillStyle = color;
    context.textAlign = align || 'center';
    context.textBaseline = 'middle';
    context.fillText(value, x, y);
  }

  function glow(color, blur) {
    context.shadowColor = color;
    context.shadowBlur = blur;
  }

  function unglow() {
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
  }

  function bar(x, y, width, height, ratio, color) {
    roundedPath(context, x, y, width, height, height / 2);
    context.fillStyle = 'rgba(8, 22, 40, 0.82)';
    context.fill();
    context.strokeStyle = 'rgba(120, 220, 255, 0.2)';
    context.lineWidth = 1;
    context.stroke();
    const amount = Math.max(0, Math.min(1, ratio));
    if (amount <= 0.001) return;
    const innerWidth = Math.max(height - 2, (width - 2) * amount);
    roundedPath(context, x + 1, y + 1, innerWidth, height - 2, (height - 2) / 2);
    context.fillStyle = color;
    glow(color, 10);
    context.fill();
    unglow();
  }

  function drawBackdrop(time) {
    context.fillStyle = PALETTE.spaceDeep;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    const shaft = context.createRadialGradient(640, 330, 40, 640, 330, 790);
    shaft.addColorStop(0, 'rgba(18, 56, 98, 0.6)');
    shaft.addColorStop(0.48, 'rgba(8, 22, 48, 0.36)');
    shaft.addColorStop(1, 'rgba(2, 3, 10, 0)');
    context.fillStyle = shaft;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    for (let index = 0; index < 58; index += 1) {
      const x = hash(index + 3) * FIELD.width;
      const drift = (hash(index + 77) * FIELD.height + time * (4 + (index % 6) * 2.4)) % FIELD.height;
      const alpha = 0.08 + hash(index + 31) * 0.28;
      const radius = 0.6 + hash(index + 11) * 1.5 + Math.sin(time * 1.7 + index) * 0.25;
      context.globalAlpha = alpha;
      context.fillStyle = PALETTE.star;
      context.beginPath();
      context.arc(x, drift, Math.max(0.2, radius), 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;

    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 80; x < FIELD.width; x += 80) {
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
    }
    for (let y = 80; y < FIELD.height; y += 80) {
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
    }
    context.stroke();

    const shade = context.createRadialGradient(640, 360, 280, 640, 360, 760);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    context.fillStyle = shade;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawArenaFrame() {
    const inset = FIELD.inset;
    roundedPath(context, inset, inset, FIELD.width - inset * 2, FIELD.height - inset * 2, 22);
    context.strokeStyle = PALETTE.arena;
    context.lineWidth = 1.5;
    glow(PALETTE.player, 12);
    context.stroke();
    unglow();

    const corner = 54;
    context.strokeStyle = 'rgba(130, 245, 255, 0.55)';
    context.lineWidth = 3;
    const left = inset + 10;
    const right = FIELD.width - inset - 10;
    const top = inset + 10;
    const bottom = FIELD.height - inset - 10;
    context.beginPath();
    context.moveTo(left, top + corner);
    context.lineTo(left, top);
    context.lineTo(left + corner, top);
    context.moveTo(right - corner, top);
    context.lineTo(right, top);
    context.lineTo(right, top + corner);
    context.moveTo(right, bottom - corner);
    context.lineTo(right, bottom);
    context.lineTo(right - corner, bottom);
    context.moveTo(left + corner, bottom);
    context.lineTo(left, bottom);
    context.lineTo(left, bottom - corner);
    context.stroke();
  }

  function drawOrbs(state) {
    const time = state.time;
    for (let index = 0; index < state.orbs.length; index += 1) {
      const orb = state.orbs[index];
      const pulse = Math.sin(time * 4.2 + orb.phase);
      let alpha = 1;
      if (orb.life < 2) alpha = 0.3 + 0.7 * Math.abs(Math.sin(time * 13 + orb.phase));
      context.globalAlpha = alpha;
      context.strokeStyle = 'rgba(120, 255, 180, 0.55)';
      context.lineWidth = 1.5;
      glow(PALETTE.orb, 12);
      context.beginPath();
      context.arc(orb.x, orb.y, 10 + pulse * 2, 0, TAU);
      context.stroke();
      context.fillStyle = PALETTE.orb;
      context.beginPath();
      context.arc(orb.x, orb.y, 5 + pulse * 0.8, 0, TAU);
      context.fill();
      context.fillStyle = PALETTE.orbHot;
      context.beginPath();
      context.arc(orb.x - 1.5, orb.y - 1.5, 2.2, 0, TAU);
      context.fill();
      unglow();
      context.globalAlpha = 1;
    }
  }

  function drawBullets(state) {
    context.globalCompositeOperation = 'lighter';
    for (let index = 0; index < state.bullets.length; index += 1) {
      const bolt = state.bullets[index];
      const tailX = bolt.x - bolt.vx * 0.03;
      const tailY = bolt.y - bolt.vy * 0.03;
      context.strokeStyle = 'rgba(120, 250, 255, 0.32)';
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.lineTo(bolt.x, bolt.y);
      context.stroke();
      context.strokeStyle = PALETTE.bullet;
      context.lineWidth = 2.4;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.lineTo(bolt.x, bolt.y);
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(bolt.x, bolt.y, 2.6, 0, TAU);
      context.fill();
    }
    context.globalCompositeOperation = 'source-over';
  }

  function drifterPath(radius) {
    context.beginPath();
    context.moveTo(radius * 1.15, 0);
    context.lineTo(-radius * 0.55, radius * 0.95);
    context.lineTo(-radius * 0.22, 0);
    context.lineTo(-radius * 0.55, -radius * 0.95);
    context.closePath();
  }

  function brutePath(radius) {
    context.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = (point / 6) * TAU;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  }

  function drawEnemies(state) {
    const time = state.time;
    for (let index = 0; index < state.enemies.length; index += 1) {
      const enemy = state.enemies[index];
      const spawning = enemy.spawn > 0;
      const birth = spawning ? 1 - enemy.spawn / 0.55 : 1;
      context.save();
      context.translate(enemy.x, enemy.y);

      if (spawning) {
        context.strokeStyle = enemy.type === 'brute' ? PALETTE.bruteEdge : PALETTE.drifterEdge;
        context.globalAlpha = 0.25 + 0.5 * (1 - birth);
        context.lineWidth = 2;
        context.beginPath();
        context.arc(0, 0, enemy.radius + 42 * (1 - birth), 0, TAU);
        context.stroke();
      }

      context.globalAlpha = spawning ? 0.45 + 0.55 * birth : 1;

      if (enemy.type === 'brute') {
        context.rotate(-time * 0.65 + enemy.phase);
        brutePath(enemy.radius);
        context.fillStyle = '#1b0d08';
        glow(ENEMY.brute.color, 16);
        context.fill();
        unglow();
        context.strokeStyle = ENEMY.brute.color;
        context.lineWidth = 2.4;
        context.stroke();
        brutePath(enemy.radius * 0.66);
        context.strokeStyle = 'rgba(255, 190, 140, 0.55)';
        context.lineWidth = 1.2;
        context.stroke();
        context.fillStyle = ENEMY.brute.color;
        glow(PALETTE.bruteCore, 12);
        context.beginPath();
        context.arc(0, 0, enemy.radius * 0.26 + Math.sin(time * 5 + enemy.phase) * 1.4, 0, TAU);
        context.fill();
        unglow();
      } else {
        context.rotate(time * 1.7 + enemy.phase);
        drifterPath(enemy.radius);
        context.fillStyle = '#170a2b';
        glow(ENEMY.drifter.color, 14);
        context.fill();
        unglow();
        context.strokeStyle = ENEMY.drifter.color;
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = ENEMY.drifterCore;
        glow(ENEMY.drifterCore, 10);
        context.beginPath();
        context.arc(enemy.radius * 0.34, 0, 2.6 + Math.sin(time * 6 + enemy.phase) * 0.7, 0, TAU);
        context.fill();
        unglow();
      }

      if (enemy.flash > 0) {
        context.globalAlpha = Math.min(0.85, enemy.flash * 5);
        context.fillStyle = '#ffffff';
        if (enemy.type === 'brute') brutePath(enemy.radius);
        else drifterPath(enemy.radius);
        context.fill();
      }
      context.restore();

      if (enemy.type === 'brute' && enemy.hp < enemy.maxHp) {
        const width = 46;
        const health = Math.max(0, enemy.hp / enemy.maxHp);
        context.fillStyle = 'rgba(20, 10, 10, 0.8)';
        context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 14, width, 4);
        context.fillStyle = PALETTE.brute;
        context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 14, width * health, 4);
      }
    }
    context.globalAlpha = 1;
  }

  function drawPlayer(state) {
    const player = state.player;
    const time = state.time;
    const pulse = Math.sin(time * 5.4) * 1.6;

    context.globalCompositeOperation = 'lighter';
    for (let ghost = 4; ghost >= 1; ghost -= 1) {
      context.globalAlpha = 0.045 * ghost;
      context.fillStyle = PALETTE.player;
      context.beginPath();
      context.arc(
        player.x - player.vx * 0.012 * ghost,
        player.y - player.vy * 0.012 * ghost,
        Math.max(2, player.radius * (1 - ghost * 0.16)),
        0,
        TAU,
      );
      context.fill();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';

    if (player.invuln > 0) {
      context.save();
      context.globalAlpha = 0.45 + 0.35 * Math.sin(time * 22);
      context.strokeStyle = PALETTE.playerHot;
      context.lineWidth = 2;
      context.setLineDash([5, 8]);
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 13, 0, TAU);
      context.stroke();
      context.restore();
    }

    context.save();
    context.translate(player.x, player.y);
    glow(PALETTE.player, 28);
    context.strokeStyle = PALETTE.playerRim;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, player.radius + 7 + pulse, 0, TAU);
    context.stroke();

    const core = context.createRadialGradient(-4, -5, 1, 0, 0, player.radius + 3);
    core.addColorStop(0, PALETTE.playerHot);
    core.addColorStop(0.45, PALETTE.player);
    core.addColorStop(1, 'rgba(24, 120, 150, 0.95)');
    context.fillStyle = core;
    context.beginPath();
    context.arc(0, 0, player.radius, 0, TAU);
    context.fill();
    unglow();

    context.strokeStyle = 'rgba(235, 255, 255, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, player.radius + 12, time * 2.3, time * 2.3 + 0.9);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, player.radius + 17, -time * 1.8, -time * 1.8 + 0.55);
    context.stroke();

    context.fillStyle = PALETTE.playerHot;
    context.beginPath();
    context.arc(player.facingX * (player.radius + 9), player.facingY * (player.radius + 9), 3, 0, TAU);
    context.fill();
    context.restore();
  }

  function drawReticle(state) {
    const x = state.player.aimX;
    const y = state.player.aimY;
    if (x < FIELD.inset || x > FIELD.width - FIELD.inset || y < FIELD.inset || y > FIELD.height - FIELD.inset) return;
    context.save();
    context.strokeStyle = 'rgba(170, 250, 255, 0.62)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(x, y, 10, 0.4, 1.15);
    context.arc(x, y, 10, Math.PI + 0.4, Math.PI + 1.15);
    context.stroke();
    context.beginPath();
    context.arc(x, y, 2, 0, TAU);
    context.fillStyle = 'rgba(210, 255, 255, 0.8)';
    context.fill();
    context.restore();
  }

  function drawEffects(effects) {
    for (let index = 0; index < effects.rings.length; index += 1) {
      const haze = effects.rings[index];
      const life = Math.max(0, haze.life / haze.maxLife);
      const radius = haze.maxRadius * (0.12 + 0.88 * (1 - life));
      context.globalAlpha = life;
      context.strokeStyle = haze.color;
      context.lineWidth = Math.max(0.5, haze.width * life);
      glow(haze.color, 18);
      context.beginPath();
      context.arc(haze.x, haze.y, radius, 0, TAU);
      context.stroke();
      unglow();
    }
    context.globalAlpha = 1;

    context.globalCompositeOperation = 'lighter';
    for (let index = 0; index < effects.particles.length; index += 1) {
      const particle = effects.particles[index];
      const life = Math.max(0, particle.life / particle.maxLife);
      context.globalAlpha = life * 0.9;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, Math.max(0.4, particle.size * (0.35 + 0.65 * life)), 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function drawHud(state, ui) {
    const width = FIELD.width;
    const height = FIELD.height;

    text('SCORE', 42, 31, 13, PALETTE.faint, 'left', '700');
    glow(PALETTE.player, 12);
    text(String(state.score), 42, 60, 32, PALETTE.text, 'left', '700');
    unglow();
    text(`BEST ${ui.best}`, 42, 87, 13, PALETTE.muted, 'left', '600');

    text('WAVE', width / 2, 28, 13, PALETTE.faint, 'center', '700');
    glow(PALETTE.player, 10);
    text(`${state.wave} / ${MAX_WAVE}`, width / 2, 56, 26, PALETTE.text, 'center', '700');
    unglow();

    text('POWER', width - 42, 28, 13, PALETTE.faint, 'right', '700');
    for (let pip = 0; pip < PLAYER.powerLevels; pip += 1) {
      const x = width - 42 - (PLAYER.powerLevels - 1 - pip) * 22;
      const y = 58;
      context.save();
      context.translate(x, y);
      context.rotate(Math.PI / 4);
      context.fillStyle = pip < state.player.power ? PALETTE.player : 'rgba(90, 130, 160, 0.35)';
      if (pip < state.player.power) glow(PALETTE.player, 10);
      context.fillRect(-5.5, -5.5, 11, 11);
      unglow();
      context.restore();
    }

    const healthRatio = state.player.health / PLAYER.maxHealth;
    const healthColor = healthRatio > 0.35 ? PALETTE.health : PALETTE.healthLow;
    text('HULL', 42, height - 72, 13, PALETTE.faint, 'left', '700');
    text(String(Math.ceil(state.player.health)), 342, height - 72, 15, healthColor, 'right', '700');
    bar(42, height - 58, 300, 14, healthRatio, healthColor);

    const energyRatio = state.player.energy / PLAYER.maxEnergy;
    text('ENERGY', width - 42, height - 72, 13, PALETTE.faint, 'right', '700');
    text(String(Math.round(state.player.energy)), width - 342, height - 72, 15, PALETTE.energy, 'left', '700');
    bar(width - 342, height - 58, 300, 14, energyRatio, PALETTE.energy);

    text('P pause', width / 2 - 66, height - 24, 12, PALETTE.faint, 'center', '600');
    text(ui.muted ? 'M unmute' : 'M mute', width / 2 + 66, height - 24, 12, PALETTE.faint, 'center', '600');

    if (healthRatio < 0.35 && state.phase === 'combat') {
      const pulse = 0.1 + 0.1 * Math.sin(ui.time * 6);
      context.strokeStyle = `rgba(255, 60, 92, ${pulse})`;
      context.lineWidth = 26;
      context.strokeRect(13, 13, width - 26, height - 26);
    }
  }

  function drawWaveBanner(state) {
    if (state.phase === 'intermission') {
      const fade = Math.min(1, Math.max(0, state.waveTimer) / 0.6);
      const shown = Math.min(1, (2.5 - state.waveTimer) / 0.3);
      context.globalAlpha = Math.max(0, Math.min(fade, shown));
      glow(PALETTE.energy, 18);
      text(`WAVE ${state.wave} CLEARED`, 640, 158, 38, PALETTE.energy, 'center', '700');
      unglow();
      text(`NEXT IN ${Math.max(1, Math.ceil(state.waveTimer))}`, 640, 196, 16, PALETTE.muted, 'center', '600');
      context.globalAlpha = 1;
      return;
    }
    if (state.banner <= 0) return;
    const appear = Math.min(1, (2.2 - state.banner) / 0.22);
    const vanish = Math.min(1, state.banner / 0.55);
    const alpha = Math.max(0, Math.min(appear, vanish));
    const scale = 0.9 + 0.1 * appear;
    context.save();
    context.globalAlpha = alpha;
    context.translate(640, 166);
    context.scale(scale, scale);
    glow(PALETTE.player, 22);
    text(`WAVE ${state.wave}`, 0, 0, 46, PALETTE.text, 'center', '700');
    unglow();
    text('THE DARK GATHERS', 0, 39, 14, PALETTE.drifter, 'center', '700');
    context.restore();
    context.globalAlpha = 1;
  }

  function drawAmbient(time) {
    const cx = 640;
    const cy = 352;
    context.save();
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = 230 + ring * 86;
      context.strokeStyle = `rgba(90, 220, 255, ${0.07 - ring * 0.015})`;
      context.lineWidth = 1;
      context.setLineDash([2, 12]);
      context.beginPath();
      context.ellipse(cx, cy, radius * 1.2, radius * 0.7, 0, 0, TAU);
      context.stroke();
    }
    context.setLineDash([]);
    for (let index = 0; index < 10; index += 1) {
      const angle = time * 0.16 + (index / 10) * TAU;
      const radius = 250 + (index % 4) * 46;
      const x = cx + Math.cos(angle) * radius * 1.12;
      const y = cy + Math.sin(angle) * radius * 0.64;
      const size = 6 + (index % 3) * 5;
      context.save();
      context.translate(x, y);
      context.rotate(angle + Math.PI / 2);
      context.strokeStyle = index % 2 === 0 ? 'rgba(120, 245, 255, 0.28)' : 'rgba(193, 92, 255, 0.28)';
      context.lineWidth = 1.4;
      context.beginPath();
      context.moveTo(size, 0);
      context.lineTo(-size * 0.6, size * 0.8);
      context.lineTo(-size * 0.6, -size * 0.8);
      context.closePath();
      context.stroke();
      context.restore();
    }
    context.restore();
  }

  function drawPanel(options) {
    const width = options.width || 780;
    const titleSize = options.titleSize || 54;
    const lines = options.lines || [];
    let linesHeight = 0;
    for (let index = 0; index < lines.length; index += 1) linesHeight += lines[index].size + 15;
    const height = 74 + titleSize + 30 + linesHeight + 76;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;

    context.save();
    glow('rgba(80, 225, 255, 0.4)', 30);
    context.fillStyle = PALETTE.panel;
    roundedPath(context, x, y, width, height, 20);
    context.fill();
    unglow();

    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1.5;
    glow(PALETTE.panelEdge, 16);
    roundedPath(context, x, y, width, height, 20);
    context.stroke();
    unglow();

    const sheen = context.createLinearGradient(0, y, 0, y + height);
    sheen.addColorStop(0, 'rgba(80, 210, 255, 0.1)');
    sheen.addColorStop(0.3, 'rgba(80, 210, 255, 0)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    context.fillStyle = sheen;
    roundedPath(context, x, y, width, height, 20);
    context.fill();

    const titleY = y + 66 + titleSize * 0.4;
    glow(options.titleColor, 26);
    text(options.title, FIELD.width / 2, titleY, titleSize, options.titleColor, 'center', '700');
    unglow();

    let cursor = titleY + titleSize * 0.5 + 38;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      cursor += line.size * 0.5;
      text(line.text, FIELD.width / 2, cursor, line.size, line.color, 'center', line.weight || '600');
      cursor += line.size * 0.5 + 15;
    }

    const promptAlpha = 0.62 + 0.38 * Math.sin(options.time * 4.2);
    context.globalAlpha = promptAlpha;
    glow(options.promptColor, 14);
    text(options.prompt, FIELD.width / 2, y + height - 43, 23, options.promptColor, 'center', '700');
    unglow();
    context.globalAlpha = 1;
    context.restore();
  }

  function drawTitle(ui) {
    drawAmbient(ui.time);
    const lines = [
      { text: 'A NEON ARENA SURVIVAL', size: 17, color: PALETTE.muted },
      { text: 'Move with W A S D or the arrow keys. Aim with the mouse.', size: 20, color: PALETTE.text },
      { text: 'Your core fires on its own. Click for a Nova burst.', size: 20, color: PALETTE.text },
      { text: 'Collect green energy to raise POWER. Survive ten waves.', size: 20, color: PALETTE.text },
      { text: `BEST  ${ui.best}`, size: 18, color: PALETTE.gold, weight: '700' },
      { text: 'P pause          M mute sound', size: 14, color: PALETTE.faint },
    ];
    drawPanel({
      title: 'LUMEN DRIFT',
      titleColor: PALETTE.player,
      titleSize: 78,
      width: 880,
      lines,
      prompt: 'Press Space or click to start',
      promptColor: PALETTE.gold,
      time: ui.time,
    });
  }

  function drawPaused(ui) {
    context.fillStyle = 'rgba(2, 5, 14, 0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel({
      title: 'PAUSED',
      titleColor: PALETTE.player,
      titleSize: 60,
      width: 680,
      lines: [
        { text: 'The dark holds still.', size: 20, color: PALETTE.muted },
        { text: 'Resume with P or Esc. A click works too.', size: 16, color: PALETTE.faint },
      ],
      prompt: 'Press P or Esc to resume',
      promptColor: PALETTE.player,
      time: ui.time,
    });
  }

  function drawOver(state, ui) {
    context.fillStyle = 'rgba(2, 5, 14, 0.68)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const good = ui.victory;
    const lines = [
      { text: 'FINAL SCORE', size: 14, color: PALETTE.faint },
      {
        text: String(state.score),
        size: 48,
        color: good ? PALETTE.victory : PALETTE.text,
        weight: '700',
      },
      {
        text: ui.newBest ? `NEW BEST  ${ui.best}` : `BEST  ${ui.best}`,
        size: 18,
        color: ui.newBest ? PALETTE.gold : PALETTE.muted,
        weight: '700',
      },
      { text: `WAVE REACHED  ${state.wave} / ${MAX_WAVE}`, size: 17, color: PALETTE.muted },
    ];
    drawPanel({
      title: good ? 'ARENA CLEARED' : 'CORE COLLAPSED',
      titleColor: good ? PALETTE.victory : PALETTE.danger,
      titleSize: 58,
      width: 760,
      lines,
      prompt: 'Press Space or click to play again',
      promptColor: PALETTE.gold,
      time: ui.time,
    });
  }

  function draw(state, screen, ui) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.spaceDeep;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawBackdrop(ui.time);

    if (screen === SCREEN_TITLE) {
      drawTitle(ui);
      return;
    }

    const shake = ui.effects ? ui.effects.shake : 0;
    context.save();
    if (shake > 0.2) {
      context.translate(
        Math.sin(ui.time * 96) * shake,
        Math.cos(ui.time * 73) * shake * 0.72,
      );
    }
    drawArenaFrame();
    drawOrbs(state);
    drawBullets(state);
    drawEnemies(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawReticle(state);
    drawPlayer(state);
    if (ui.effects) drawEffects(ui.effects);
    context.restore();

    if (screen === SCREEN_OVER) {
      drawHud(state, ui);
      drawOver(state, ui);
      return;
    }

    drawHud(state, ui);
    if (screen === SCREEN_PAUSED) drawPaused(ui);
    else drawWaveBanner(state);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toWorld, resize };
}
