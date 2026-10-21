type Spring = { value: number; velocity: number };

// Exact critically damped spring: no overshoot, independent of display refresh rate.
function follow(state: Spring, target: number, elapsed: number, frequency: number) {
  const offset = state.value - target;
  const impulse = state.velocity + frequency * offset;
  const decay = Math.exp(-frequency * elapsed);
  state.value = target + (offset + impulse * elapsed) * decay;
  state.velocity = (state.velocity - frequency * impulse * elapsed) * decay;
}

/** Bloom from the actual rendered crescent, so light stays attached to its silhouette. */
export function createPortalGlow(output: HTMLCanvasElement, source: HTMLCanvasElement) {
  const mask = document.createElement('canvas');
  const maskContext = mask.getContext('2d')!;
  const context = output.getContext('2d')!;
  const x: Spring = { value: 0, velocity: 0 };
  const y: Spring = { value: 0, velocity: 0 };
  const intensity: Spring = { value: 0.42, velocity: 0 };
  let padding = 0, pixelScale = 1, blur = 0, maxOffset = 0, dirty = true;

  const resize = (width: number, height: number) => {
    const shortest = Math.min(width, height);
    padding = shortest * 0.22;
    // Small offscreen buffers keep the blur inexpensive on phones as well.
    pixelScale = Math.min(1, 320 / Math.max(width + padding * 2, height + padding * 2));
    mask.width = Math.max(1, Math.round(width * pixelScale));
    mask.height = Math.max(1, Math.round(height * pixelScale));
    output.width = Math.round((width + padding * 2) * pixelScale);
    output.height = Math.round((height + padding * 2) * pixelScale);
    output.style.left = output.style.top = `${-padding}px`;
    output.style.width = `${width + padding * 2}px`;
    output.style.height = `${height + padding * 2}px`;
    blur = shortest * 0.045 * pixelScale;
    maxOffset = shortest * 0.004;
    dirty = true;
  };

  const update = (elapsed: number, yawDelta: number, pitchDelta: number) => {
    const yawSpeed = yawDelta / elapsed, pitchSpeed = pitchDelta / elapsed;
    const speed = Math.hypot(yawSpeed, pitchSpeed);
    const energy = speed / (speed + 4);
    follow(x, -Math.tanh(yawSpeed * 0.16) * maxOffset, elapsed, 14);
    follow(y, Math.tanh(pitchSpeed * 0.16) * maxOffset, elapsed, 14);
    follow(intensity, 0.42 + energy * 0.08, elapsed, 6);
    const moving = Math.abs(yawDelta) + Math.abs(pitchDelta) > 0.000001;
    const settling = Math.abs(x.value) + Math.abs(y.value) > 0.015
      || Math.abs(x.velocity) + Math.abs(y.velocity) > 0.04
      || Math.abs(intensity.value - 0.42) > 0.001;

    if (dirty || moving || settling) {
      // Copy immediately after WebGL rendering, then tint its alpha mask.
      maskContext.clearRect(0, 0, mask.width, mask.height);
      maskContext.globalCompositeOperation = 'source-over';
      maskContext.drawImage(source, 0, 0, mask.width, mask.height);
      maskContext.globalCompositeOperation = 'source-in';
      const warmth = maskContext.createLinearGradient(0, 0, 0, mask.height);
      warmth.addColorStop(0, '#ffb359');
      warmth.addColorStop(0.45, '#ff781f');
      warmth.addColorStop(1, '#f54808');
      maskContext.fillStyle = warmth;
      maskContext.fillRect(0, 0, mask.width, mask.height);

      context.clearRect(0, 0, output.width, output.height);
      context.globalCompositeOperation = 'lighter';
      const inset = padding * pixelScale;
      for (const [radius, opacity] of [[blur * 1.8, 0.13], [blur, 0.11], [blur * 0.5, 0.03]]) {
        context.filter = `blur(${radius.toFixed(2)}px)`;
        context.globalAlpha = opacity * intensity.value;
        context.drawImage(mask, inset, inset);
      }
      context.filter = 'none';
      context.globalAlpha = 1;
      output.style.transform = `translate3d(${x.value.toFixed(3)}px,${y.value.toFixed(3)}px,0)`;
      dirty = false;
    }
    return settling;
  };

  return {
    resize, update,
    dispose() { mask.width = mask.height = output.width = output.height = 1; },
  };
}
