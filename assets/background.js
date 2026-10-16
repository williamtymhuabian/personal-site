/* Local procedural graphics: no remote assets, analytics or third-party runtime. */
(() => {
  'use strict';
  const canvas = document.querySelector('#vln-background');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx) return;
  const pauseButton = document.querySelector('#scene-pause');
  const focusButton = document.querySelector('#scene-focus');
  const info = document.querySelector('#scene-info');
  const shell = document.querySelector('.site-shell');
  const status = document.querySelector('#scene-status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  try { const saved = localStorage.getItem('william-scene-paused'); if (saved !== null) paused = motion.matches || saved === 'true'; } catch {}
  let width = 0, height = 0, focus = false, frame = 0, lastTime = 0, lastDraw = 0, elapsed = 0;
  let colors, cameraX = 0, cameraY = 0, burst = 0;
  const pointer = { x: -1000, y: -1000, active: false };
  const pulses = [];
  const sphere = [], edges = [], stars = [];
  const TAU = Math.PI * 2;
  // A stable Fibonacci lattice produces a clean spatial graph instead of random jitter.
  for (let i = 0; i < 62; i++) {
    const y = 1 - i / 61 * 2, radius = Math.sqrt(1 - y * y), angle = i * Math.PI * (3 - Math.sqrt(5));
    sphere.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
  }
  sphere.forEach((node, i) => {
    sphere.map((other, j) => ({ j, d: Math.hypot(node.x - other.x, node.y - other.y, node.z - other.z) }))
      .filter(item => item.j !== i).sort((a, b) => a.d - b.d).slice(0, 4)
      .forEach(({ j }) => { if (j > i) edges.push([i, j]); });
  });
  // Deterministic positions keep resizing calm and avoid flashing on route changes.
  for (let i = 0; i < 34; i++) stars.push({ x: (i * .61803398875) % 1, y: (i * .41421356237 + .17) % 1, phase: i * 2.39996 });
  function ink(rgb, alpha) { return `rgba(${rgb},${Math.max(0, Math.min(1, alpha))})`; }
  function line(x1, y1, x2, y2, color, weight = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
  }
  function circle(x, y, radius, color, stroke = false) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx[stroke ? 'strokeStyle' : 'fillStyle'] = color;
    if (stroke) ctx.stroke(); else ctx.fill();
  }
  function palette() {
    const dark = document.documentElement.dataset.theme === 'dark';
    colors = dark
      ? { cyan: '92,205,242', blue: '90,126,242', violet: '163,137,252', grid: '105,157,195', bright: '216,242,255', dark }
      : { cyan: '25,110,150', blue: '76,98,189', violet: '119,91,182', grid: '71,119,155', bright: '29,93,129', dark };
    draw();
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, width < 700 ? 1.35 : 1.7);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }
  function point3D(node, angle, cx, cy, radius) {
    const a = node.x * Math.cos(angle) + node.z * Math.sin(angle);
    const z = -node.x * Math.sin(angle) + node.z * Math.cos(angle);
    const y = node.y * .94 - z * .34, depth = node.y * .34 + z * .94;
    const perspective = 1 + depth * .09;
    return { x: cx + a * radius * perspective, y: cy + y * radius * perspective, z: depth };
  }
  function curveRing(cx, cy, radius, angle, tilt, phase, alpha) {
    ctx.beginPath();
    for (let j = 0; j <= 100; j++) {
      const theta = j / 100 * TAU;
      const node = { x: Math.cos(theta), y: Math.sin(theta) * Math.sin(tilt), z: Math.sin(theta) * Math.cos(tilt) };
      const p = point3D(node, angle + phase, cx, cy, radius);
      if (!j) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = ink(colors.blue, alpha); ctx.lineWidth = .7; ctx.stroke();
  }
  function drawGrid() {
    const horizon = height * .62, lower = height + 30, vanishing = width * .64 + cameraX * .1;
    for (let i = -9; i <= 9; i++) {
      const bottom = vanishing + i * width * .105;
      line(vanishing + (bottom - vanishing) * .02, horizon, bottom, lower, ink(colors.grid, .065));
    }
    for (let i = 1; i < 12; i++) {
      const fraction = i / 12, y = horizon + fraction * fraction * (lower - horizon);
      line(0, y, width, y, ink(colors.grid, .04 + fraction * .045));
    }
  }
  function draw() {
    if (!colors || !width) return;
    ctx.clearRect(0, 0, width, height);
    const strength = focus ? 1 : .72;
    drawGrid();
    const radius = Math.min(width * (width < 700 ? .61 : .255), height * .39, 410);
    const cx = width * (width < 700 ? .75 : .77) + cameraX, cy = height * (focus ? .56 : .4) + cameraY;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.8);
    glow.addColorStop(0, ink(colors.blue, colors.dark ? .095 : .045)); glow.addColorStop(.55, ink(colors.cyan, .026)); glow.addColorStop(1, ink(colors.blue, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    const angle = elapsed * .035 + (burst * .12);
    const projected = sphere.map(node => point3D(node, angle, cx, cy, radius));
    curveRing(cx, cy, radius * 1.2, angle * .45, .22, .8, .19 * strength);
    curveRing(cx, cy, radius * 1.32, -angle * .25, .67, -1.2, .12 * strength);
    curveRing(cx, cy, radius * 1.55, angle * .2, .14, 2, .075 * strength);
    // Meridian traces make the neural graph read as a continuous computational field.
    for (let j = 0; j < 3; j++) curveRing(cx, cy, radius, angle, j * .62 + .2, j * 1.8, .075 * strength);
    edges.forEach(([a, b], i) => {
      if (width < 600 && i % 3 === 0) return;
      const p = projected[a], q = projected[b];
      const front = (p.z + q.z + 2) / 4;
      const near = pointer.active ? Math.max(0, 1 - Math.hypot((p.x + q.x) / 2 - pointer.x, (p.y + q.y) / 2 - pointer.y) / 210) : 0;
      line(p.x, p.y, q.x, q.y, ink(i % 9 === 0 ? colors.violet : colors.cyan, (.045 + front * .18 + near * .37) * strength), near ? 1.1 : .65);
      if (i % 9 === 0) {
        const t = (elapsed * .12 + i * .29) % 1;
        const x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
        circle(x, y, 1.7, ink(colors.bright, (.15 + front * .43) * strength));
      }
    });
    projected.forEach((p, i) => {
      const near = pointer.active ? Math.max(0, 1 - Math.hypot(p.x - pointer.x, p.y - pointer.y) / 190) : 0;
      const alpha = (.16 + (p.z + 1) * .24 + near * .35) * strength;
      if (i % 7 === 0 || near > .4) circle(p.x, p.y, 6 + near * 4, ink(colors.cyan, .07 * alpha));
      circle(p.x, p.y, (i % 7 === 0 ? 2.1 : 1.1) + near * 1.2, ink(colors.cyan, alpha));
    });
    const ambient = [];
    stars.slice(0, width < 650 ? 21 : 34).forEach((star, i) => {
      const x = star.x * width + Math.sin(elapsed * .07 + star.phase) * 10 + cameraX * .16;
      const y = star.y * height + Math.cos(elapsed * .06 + star.phase) * 9 + cameraY * .16;
      ambient.push({ x, y });
      circle(x, y, i % 6 === 0 ? 1.7 : .8, ink(i % 5 === 0 ? colors.violet : colors.cyan, .13 + Math.sin(elapsed * .3 + star.phase) * .055));
      if (i % 7 === 0) {
        line(x - 5, y, x + 5, y, ink(colors.grid, .12)); line(x, y - 5, x, y + 5, ink(colors.grid, .12));
      }
    });
    if (pointer.active) {
      const halo = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
      halo.addColorStop(0, ink(colors.cyan, .065)); halo.addColorStop(1, ink(colors.cyan, 0));
      ctx.fillStyle = halo; ctx.fillRect(pointer.x - 220, pointer.y - 220, 440, 440);
      [...ambient, ...projected].map(p => ({ ...p, distance: Math.hypot(p.x - pointer.x, p.y - pointer.y) }))
        .filter(p => p.distance < 180).sort((a, b) => a.distance - b.distance).slice(0, 5)
        .forEach(p => line(pointer.x, pointer.y, p.x, p.y, ink(colors.cyan, (1 - p.distance / 180) * .38), .7));
      if (focus) {
        circle(pointer.x, pointer.y, 18, ink(colors.cyan, .25), true);
        line(pointer.x - 25, pointer.y, pointer.x - 14, pointer.y, ink(colors.cyan, .5));
        line(pointer.x + 14, pointer.y, pointer.x + 25, pointer.y, ink(colors.cyan, .5));
      }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i], age = elapsed - pulse.time;
      if (age > 2.2) { pulses.splice(i, 1); continue; }
      const r = 12 + age * 125;
      ctx.lineWidth = 1;
      circle(pulse.x, pulse.y, r, ink(colors.cyan, .48 * (1 - age / 2.2)), true);
      circle(pulse.x, pulse.y, r * .7, ink(colors.violet, .26 * (1 - age / 2.2)), true);
    }
    // Small registration marks, deliberately without fake telemetry or research claims.
    if (focus && width > 700) {
      ctx.font = '11px Consolas, monospace'; ctx.fillStyle = ink(colors.cyan, .52);
      ctx.fillText('COMPUTATIONAL FIELD / INTERACTIVE VISUAL', 40, height - 45);
      ctx.fillText('GRAPH  ·  SIGNAL  ·  SPACE', width - 260, 45);
    }
  }
  function tick(time) {
    frame = 0;
    if (paused || document.hidden) return;
    if (time - lastDraw >= 33) {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, .08) : 0;
      elapsed += dt; lastTime = time; lastDraw = time;
      const targetX = pointer.active ? (pointer.x / width - .5) * 25 : 0;
      const targetY = pointer.active ? (pointer.y / height - .5) * 17 : 0;
      cameraX += (targetX - cameraX) * Math.min(dt * 4, 1); cameraY += (targetY - cameraY) * Math.min(dt * 4, 1);
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    pauseButton.textContent = paused ? '播放' : '暂停';
    pauseButton.setAttribute('aria-label', paused ? '播放背景动画' : '暂停背景动画');
    document.body.classList.toggle('scene-paused', paused);
    if (!paused && !document.hidden) frame = requestAnimationFrame(tick);
    draw();
  }
  function setFocus(value) {
    focus = value; document.body.classList.toggle('scene-focus', focus); shell.inert = focus; info.hidden = !focus;
    focusButton.textContent = focus ? '返回阅读 Esc' : '沉浸视图 ↗';
    focusButton.setAttribute('aria-expanded', String(focus)); canvas.style.pointerEvents = focus ? 'auto' : 'none';
    if (!focus) { cameraX = 0; cameraY = 0; }
    draw(); focusButton.focus();
  }
  pauseButton.addEventListener('click', () => {
    paused = !paused; try { localStorage.setItem('william-scene-paused', String(paused)); } catch {} schedule();
  });
  focusButton.addEventListener('click', () => setFocus(!focus));
  addEventListener('keydown', e => { if (e.key === 'Escape' && focus) setFocus(false); });
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    document.documentElement.style.setProperty('--pointer-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--pointer-y', `${e.clientY}px`);
    document.body.classList.add('pointer-in-field');
    if (paused || motion.matches) draw();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; document.body.classList.remove('pointer-in-field'); if (paused) draw(); });
  addEventListener('pointerdown', e => {
    if (e.target.closest?.('.scene-dock,dialog') || motion.matches || paused) return;
    pulses.push({ x: e.clientX, y: e.clientY, time: elapsed });
    if (pulses.length > 4) pulses.shift();
    if (focus) { burst += 1; status.textContent = '局部信号脉冲已触发，移动指针可连接邻近节点。'; }
  }, { passive: true });
  motion.addEventListener('change', () => { paused = motion.matches; cameraX = cameraY = 0; schedule(); });
  document.addEventListener('visibilitychange', schedule); addEventListener('resize', resize);
  new MutationObserver(palette).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  palette(); resize(); schedule();
})();
