import { useEffect, useRef, useState } from 'react';
import type { BufferGeometry, Material, Mesh, WebGLRenderer } from 'three';

type Props = { label: string };

/** Renders only during deliberate interaction or a resize. */
export default function PortalScene({ label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const interaction = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current;
    const grabZone = interaction.current;
    if (!element || !grabZone) return;
    let disposed = false;
    let destroy = () => {};
    void (async () => {
      let renderer: WebGLRenderer | undefined;
      try {
        const [T, { RoomEnvironment }] = await Promise.all([
          import('three'), import('three/addons/environments/RoomEnvironment.js'),
        ]);
        if (disposed) return;
        renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.toneMapping = T.ACESFilmicToneMapping;
        const canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        element.appendChild(canvas);
        const scene = new T.Scene();
        const background = new T.Color();
        scene.background = background;
        const camera = new T.PerspectiveCamera(38, 1, 0.1, 60);
        camera.position.set(0, 0.45, 10.5);
        camera.lookAt(0, -0.12, 0);
        const pmrem = new T.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const environment = pmrem.fromScene(room, 0.08);
        scene.environment = environment.texture;
        room.dispose(); pmrem.dispose();
        scene.add(new T.HemisphereLight(0xd8dee5, 0x12151a, 0.8));
        const key = new T.DirectionalLight(0xffe9d9, 2.4);
        key.position.set(-4, 6, 4); scene.add(key);
        const rim = new T.DirectionalLight(0xc2d5ed, 1.4);
        rim.position.set(4, 3, -2); scene.add(rim);

        const sculpture = new T.Group();
        const homePosition = new T.Vector3(0, 0.12, 0);
        sculpture.position.copy(homePosition);
        scene.add(sculpture);
        // The brand's crescent: fine tips on the left, full red edge on the right.
        const geometry = new T.BufferGeometry();
        const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
        const segments = 160, profile = 24;
        const red = new T.Color('#cc1c06'), orange = new T.Color('#f04808');
        for (let i = 0; i <= segments; i++) {
          const angle = -Math.PI + 0.13 + (Math.PI * 2 - 0.26) * i / segments;
          // Preserve the circular outline and the offset inner circle of the logo.
          const innerRadius = -0.33 * Math.cos(angle) + Math.sqrt(1.67 ** 2 - (0.33 * Math.sin(angle)) ** 2);
          const centerRadius = (2 + innerRadius) / 2;
          const thickness = (2 - innerRadius) / 2;
          const depth = 0.085 * Math.sqrt(thickness / 0.33);
          for (let j = 0; j <= profile; j++) {
            const cross = j / profile * Math.PI * 2;
            const radius = centerRadius + thickness * Math.cos(cross);
            vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), depth * Math.sin(cross));
            const color = red.clone().lerp(orange, Math.pow((1 - Math.cos(cross)) / 2, 3) * 0.45);
            colors.push(color.r, color.g, color.b);
            if (i < segments && j < profile) {
              const a = i * (profile + 1) + j, b = a + profile + 1;
              indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
          }
        }
        // Close both tips so the sculpture remains solid when viewed from behind.
        for (const end of [0, segments]) {
          const angle = -Math.PI + 0.13 + (Math.PI * 2 - 0.26) * end / segments;
          const innerRadius = -0.33 * Math.cos(angle) + Math.sqrt(1.67 ** 2 - (0.33 * Math.sin(angle)) ** 2);
          const centerIndex = vertices.length / 3;
          vertices.push((2 + innerRadius) / 2 * Math.cos(angle), (2 + innerRadius) / 2 * Math.sin(angle), 0);
          colors.push(red.r, red.g, red.b);
          for (let j = 0; j < profile; j++) {
            const a = end * (profile + 1) + j;
            indices.push(centerIndex, end === 0 ? a : a + 1, end === 0 ? a + 1 : a);
          }
        }
        geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
        const normals = geometry.getAttribute('normal');
        for (let i = 0; i <= segments; i++) {
          const a = i * (profile + 1), b = a + profile;
          const normal = new T.Vector3().fromBufferAttribute(normals, a).add(new T.Vector3().fromBufferAttribute(normals, b)).normalize();
          normals.setXYZ(a, normal.x, normal.y, normal.z); normals.setXYZ(b, normal.x, normal.y, normal.z);
        }
        const face = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.8, envMapIntensity: 0.6 });
        const emblem = new T.Mesh(geometry, face);
        sculpture.add(emblem);

        const floorY = -2.15;
        const reflection = sculpture.clone(true);
        reflection.traverse(object => {
          const mesh = object as Mesh;
          if (!mesh.material) return;
          const clone = (material: Material) => {
            const result = material.clone(); result.transparent = true; result.opacity = 0.13; result.depthWrite = false;
            return result;
          };
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
        });
        reflection.matrixAutoUpdate = false;
        const mirror = new T.Matrix4().makeScale(1, -1, 1);
        mirror.setPosition(0, floorY * 2, 0); scene.add(reflection);
        // Keep the ground in the background palette: environment lighting on a
        // huge standard-material plane produced a bright rectangular horizon.
        const floorMaterial = new T.MeshBasicMaterial({ transparent: true, opacity: 0.88, depthWrite: false, toneMapped: false });
        const floor = new T.Mesh(new T.PlaneGeometry(65, 65), floorMaterial);
        floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.renderOrder = 2; scene.add(floor);
        // A soft contact shadow anchors the base without real-time shadow maps.
        const shadowSize = 64, shadowPixels = new Uint8Array(shadowSize * shadowSize * 4);
        for (let y = 0; y < shadowSize; y++) for (let x = 0; x < shadowSize; x++) {
          const radius = Math.hypot((x + 0.5) / shadowSize * 2 - 1, (y + 0.5) / shadowSize * 2 - 1);
          shadowPixels[(y * shadowSize + x) * 4 + 3] = Math.round((1 - T.MathUtils.smoothstep(radius, 0.25, 1)) * 255);
        }
        const shadowMap = new T.DataTexture(shadowPixels, shadowSize, shadowSize);
        shadowMap.magFilter = T.LinearFilter; shadowMap.minFilter = T.LinearFilter; shadowMap.needsUpdate = true;
        const shadowMaterial = new T.MeshBasicMaterial({ color: 0x000000, map: shadowMap, transparent: true, depthWrite: false, toneMapped: false });
        const shadow = new T.Mesh(new T.PlaneGeometry(4.4, 3.8), shadowMaterial);
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = floorY + 0.002; shadow.renderOrder = 3; scene.add(shadow);

        let frame = 0, last = 0, yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0;
        let visible = true, dragging = false, previousX = 0, previousY = 0;
        let samples = 0, totalInterval = 0, longest = 0;
        const render = (now: number) => {
          frame = 0;
          if (disposed || document.hidden || !visible) return;
          const interval = (now - last) || 1000 / 60;
          const elapsed = Math.min(interval / 1000, 0.05); last = now;
          const easing = 1 - Math.exp(-(dragging ? 17 : 6.5) * elapsed);
          yaw += (targetYaw - yaw) * easing; pitch += (targetPitch - pitch) * easing;
          sculpture.rotation.set(pitch, yaw, 0, 'YXZ');
          sculpture.updateMatrix(); reflection.matrix.copy(sculpture.matrix).premultiply(mirror);
          renderer!.render(scene, camera);
          const settling = Math.abs(targetYaw - yaw) + Math.abs(targetPitch - pitch) > 0.00012;
          if (!dragging && !settling) {
            yaw = targetYaw = T.MathUtils.euclideanModulo(yaw + Math.PI, Math.PI * 2) - Math.PI;
            pitch = targetPitch = T.MathUtils.euclideanModulo(pitch + Math.PI, Math.PI * 2) - Math.PI;
          }
          if (import.meta.env.DEV && (dragging || settling)) {
            samples++; totalInterval += interval; longest = Math.max(longest, interval);
          }
          if (dragging || settling) frame = requestAnimationFrame(render);
          else if (import.meta.env.DEV && samples > 5) {
            element.dataset.frameInterval = (totalInterval / samples).toFixed(1);
            element.dataset.longestFrame = longest.toFixed(1);
            element.dataset.frameSamples = String(samples);
            samples = 0; totalInterval = 0; longest = 0;
          }
        };
        const start = () => {
          if (disposed || frame || !visible || document.hidden) return;
          last = performance.now(); frame = requestAnimationFrame(render);
        };
        const returnHome = () => {
          // Return through the nearest equivalent angle, even after multiple turns.
          yaw = T.MathUtils.euclideanModulo(yaw + Math.PI, Math.PI * 2) - Math.PI;
          pitch = T.MathUtils.euclideanModulo(pitch + Math.PI, Math.PI * 2) - Math.PI;
          targetYaw = 0; targetPitch = 0;
          start();
        };
        const endDrag = () => {
          dragging = false; element.dataset.dragging = 'false'; returnHome();
        };
        const syncTheme = () => {
          background.set(getComputedStyle(element).backgroundColor);
          floorMaterial.color.copy(background);
          shadowMaterial.opacity = 0.38;
          renderer!.toneMappingExposure = 0.95;
          start();
        };
        const resize = () => {
          const { width, height } = element.getBoundingClientRect();
          if (!width || !height) return;
          renderer!.setPixelRatio(Math.min(devicePixelRatio, 1.5, Math.sqrt(1300000 / (width * height))));
          renderer!.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.z = camera.aspect < 0.7 ? 14 : camera.aspect < 1 ? 11 : 10;
          camera.updateProjectionMatrix(); camera.updateMatrixWorld();
          const wide = camera.aspect > 1.15;
          const portrait = camera.aspect <= 1;
          homePosition.set(wide ? 1.8 : 0, portrait ? 0.9 : -0.65, 0);
          sculpture.position.copy(homePosition);
          sculpture.scale.setScalar(wide ? 0.82 : portrait ? 0.78 : 1);
          const grabSize = 4.3 * sculpture.scale.x * height / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
          const screenPosition = homePosition.clone().project(camera);
          grabZone.style.width = `${grabSize}px`; grabZone.style.height = `${grabSize}px`;
          grabZone.style.transform = `translate3d(${(screenPosition.x + 1) / 2 * width - grabSize / 2}px,${(1 - screenPosition.y) / 2 * height - grabSize / 2}px,0)`;
          if (dragging) endDrag();
          start();
        };
        const move = (event: PointerEvent) => {
          if (!dragging) return;
          targetYaw += (event.clientX - previousX) * Math.PI * 2 / Math.max(element.clientWidth, 320);
          targetPitch += (event.clientY - previousY) * Math.PI * 2 / Math.max(element.clientHeight, 320);
          previousX = event.clientX; previousY = event.clientY; start();
        };
        const down = (event: PointerEvent) => {
          if (event.button !== 0 || !event.isPrimary) return;
          targetYaw = yaw; targetPitch = pitch;
          dragging = true; previousX = event.clientX; previousY = event.clientY;
          element.focus({ preventScroll: true }); grabZone.setPointerCapture(event.pointerId);
          element.dataset.dragging = 'true'; start();
        };
        const up = (event: PointerEvent) => {
          if (!dragging) return;
          endDrag();
          if (grabZone.hasPointerCapture(event.pointerId)) grabZone.releasePointerCapture(event.pointerId);
        };
        const keydown = (event: KeyboardEvent) => {
          if (event.ctrlKey || event.metaKey || event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Home') { returnHome(); return; }
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') targetYaw += (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12;
          else targetPitch += (event.key === 'ArrowUp' ? -1 : 1) * Math.PI / 12;
          start();
        };
        const keyup = (event: KeyboardEvent) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) returnHome();
        };
        const visibility = () => { if (document.hidden) endDrag(); else start(); };
        const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); frame = 0; setReady(false); };
        const events: [string, EventListener][] = [
          ['pointermove', move as EventListener], ['pointerdown', down as EventListener],
          ['pointerup', up as EventListener], ['pointercancel', up as EventListener], ['lostpointercapture', up as EventListener],
        ];
        for (const [name, handler] of events) grabZone.addEventListener(name, handler);
        canvas.addEventListener('webglcontextlost', lost);
        element.addEventListener('keydown', keydown); element.addEventListener('keyup', keyup);
        element.addEventListener('blur', endDrag); window.addEventListener('blur', endDrag);
        document.addEventListener('visibilitychange', visibility);
        const intersection = new IntersectionObserver(entries => {
          visible = entries[0].isIntersecting;
          if (visible) start(); else { endDrag(); cancelAnimationFrame(frame); frame = 0; }
        });
        intersection.observe(element);
        const size = new ResizeObserver(resize); size.observe(element);
        destroy = () => {
          cancelAnimationFrame(frame); intersection.disconnect(); size.disconnect();
          document.removeEventListener('visibilitychange', visibility);
          element.removeEventListener('keydown', keydown); element.removeEventListener('keyup', keyup);
          element.removeEventListener('blur', endDrag); window.removeEventListener('blur', endDrag);
          canvas.removeEventListener('webglcontextlost', lost);
          for (const [name, handler] of events) grabZone.removeEventListener(name, handler);
          const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
          scene.traverse(object => {
            const mesh = object as Mesh;
            if (mesh.geometry) geometries.add(mesh.geometry);
            if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
          });
          for (const geometry of geometries) geometry.dispose();
          for (const material of materials) material.dispose();
          shadowMap.dispose(); environment.dispose(); renderer!.dispose(); canvas.remove();
        };
        syncTheme(); resize(); setReady(true);
      } catch {
        destroy(); renderer?.dispose(); renderer?.domElement.remove();
        if (!disposed) setReady(false);
      }
    })();
    return () => { disposed = true; destroy(); };
  }, []);

  return <div ref={host} className={`portal-scene${ready ? ' is-ready' : ''}`} role="group" aria-label={label} tabIndex={0}>
    <div className="portal-fallback" aria-hidden="true"><img src="/unseen-logo-transparent.png" alt="" /></div>
    <div ref={interaction} className="portal-grab-zone" aria-hidden="true" />
  </div>;
}
