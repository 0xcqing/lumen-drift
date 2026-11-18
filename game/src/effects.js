// The look of violence: short-lived sparks, expanding rings and the shake that follows a hit.
// The sim only says what happened; this module owns every visual consequence, with its own
// seeded generator so a staged screenshot keeps the same debris each time.

const MAX_PARTICLES = 700;
const MAX_RINGS = 40;

export function createEffects(random) {
  const state = {
    particles: [],
    rings: [],
    shake: 0,
  };

  function reset() {
    state.particles.length = 0;
    state.rings.length = 0;
    state.shake = 0;
  }

  function burst(x, y, color, count, speed, size) {
    const amount = Math.min(count, MAX_PARTICLES - state.particles.length);
    for (let index = 0; index < amount; index += 1) {
      const angle = random() * Math.PI * 2;
      const pace = speed * (0.22 + random() * 0.98);
      const life = 0.3 + random() * 0.5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * pace,
        vy: Math.sin(angle) * pace,
        size: size * (0.45 + random() * 0.9),
        color,
        life,
        maxLife: life,
        drag: 2.4 + random() * 2.8,
      });
    }
  }

  function ring(x, y, color, maxRadius, width) {
    if (state.rings.length >= MAX_RINGS) state.rings.shift();
    state.rings.push({
      x,
      y,
      color,
      maxRadius,
      width: width || 3,
      life: 0.5,
      maxLife: 0.5,
    });
  }

  function addShake(amount) {
    state.shake = Math.min(30, Math.max(state.shake, amount));
  }

  function update(dt) {
    const particles = state.particles;
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      const damping = Math.max(0, 1 - particle.drag * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }

    const rings = state.rings;
    for (let index = rings.length - 1; index >= 0; index -= 1) {
      const haze = rings[index];
      haze.life -= dt;
      if (haze.life <= 0) rings.splice(index, 1);
    }

    state.shake = Math.max(0, state.shake - 36 * dt);
  }

  return {
    particles: state.particles,
    rings: state.rings,
    get shake() {
      return state.shake;
    },
    reset,
    burst,
    ring,
    addShake,
    update,
  };
}
