export type InstrumentState = { position: number; velocity: number; angle: number; angularVelocity: number };
export const createInstrumentState = (progress: number): InstrumentState => ({ position: progress, velocity: 0, angle: 0, angularVelocity: 0 });

/** Exact critically damped response; the same timing at 60, 120 and 144 Hz. */
export function advanceInstrument(state: InstrumentState, target: number, dt: number, pendulum: boolean) {
  target = Math.max(0, Math.min(1, target));
  const omega = 15, displacement = state.position - target, c = state.velocity + omega * displacement;
  const decay = Math.exp(-omega * dt);
  state.position = target + (displacement + c * dt) * decay;
  state.velocity = (state.velocity - omega * c * dt) * decay;
  if (pendulum) {
    const steps = Math.max(1, Math.ceil(dt * 240)), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = Math.max(-3.5, Math.min(3.5, -state.velocity * 7));
      state.angularVelocity += (-38 * state.angle - 6.8 * state.angularVelocity + force) * step;
      state.angle += state.angularVelocity * step;
    }
  }
  return Math.abs(state.position - target) > 0.00001 || Math.abs(state.velocity) > 0.0001 || Math.abs(state.angle) > 0.0001 || Math.abs(state.angularVelocity) > 0.0003;
}

/** Dark curved iris leaves sit inside the photographic glass, beneath its coating. */
export function drawAperture(ctx: CanvasRenderingContext2D, open: number) {
  const size = ctx.canvas.width, center = size / 2, outer = center * 1.08;
  const radius = center * (0.045 + open * 0.68), step = Math.PI * 2 / 9, turn = open * 0.22;
  ctx.clearRect(0, 0, size, size);
  const depth = ctx.createRadialGradient(center * 0.83, center * 0.83, 0, center, center, center);
  depth.addColorStop(0, '#071018'); depth.addColorStop(0.48, '#020508'); depth.addColorStop(1, '#010202');
  ctx.fillStyle = depth; ctx.fillRect(0, 0, size, size);
  const point = (r: number, a: number) => [center + Math.cos(a) * r, center + Math.sin(a) * r] as const;
  for (let i = 0; i < 9; i++) {
    const a = i * step + turn;
    const [ix, iy] = point(radius, a), [nx, ny] = point(radius, a + step);
    const [ox, oy] = point(outer, a - 0.22), [ex, ey] = point(outer, a + step + 0.08);
    const [cx, cy] = point(radius * 0.94, a + step * 0.5);
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.quadraticCurveTo(...point(outer * 0.67, a - 0.13), ox, oy);
    ctx.arc(center, center, outer, a - 0.22, a + step + 0.08);
    ctx.lineTo(ex, ey); ctx.lineTo(nx, ny); ctx.quadraticCurveTo(cx, cy, ix, iy); ctx.closePath();
    const finish = ctx.createLinearGradient(ix, iy, ox, oy);
    finish.addColorStop(0, '#182024'); finish.addColorStop(0.3, '#20282b'); finish.addColorStop(1, '#111719');
    ctx.fillStyle = finish; ctx.fill(); ctx.strokeStyle = 'rgba(1,4,6,.7)'; ctx.lineWidth = 1.15; ctx.stroke();
  }
  const glass = ctx.createRadialGradient(center, center, center * 0.52, center, center, center);
  glass.addColorStop(0, 'rgba(0,0,0,0)'); glass.addColorStop(0.87, 'rgba(0,5,9,.08)'); glass.addColorStop(1, 'rgba(0,4,7,.82)');
  ctx.fillStyle = glass; ctx.fillRect(0, 0, size, size);
}
