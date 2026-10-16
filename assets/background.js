/* A procedural, decorative VLN world. No models, remote assets or tracking. */
(() => {
  const canvas = document.querySelector('#vln-background');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const pauseButton = document.querySelector('#scene-pause');
  const focusButton = document.querySelector('#scene-focus');
  const info = document.querySelector('#scene-info');
  const shell = document.querySelector('.site-shell');
  const status = document.querySelector('#scene-status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  try { const saved = localStorage.getItem('william-scene-paused'); if (saved !== null) paused = motion.matches || saved === 'true'; } catch {}
  let focus = false, width = 0, height = 0, scale = 1, origin = [0, 0];
  let frame = 0, lastTime = 0, elapsed = 0, lastDraw = 0;
  let pointer = [0, 0], camera = [0, 0], goal = null;
  const routes = [
    [[70, 110], [300, 110], [300, 360], [570, 360], [570, 110]],
    [[110, 420], [110, 230], [510, 230], [640, 120], [570, 420]],
    [[70, 70], [630, 70], [630, 430], [70, 430]]
  ];
  const agents = routes.map(route => ({ route, x: route[0][0], z: route[0][1], next: 1, moving: true }));
  const landmarks = [
    { x: 185, z: 170, w: 65, d: 55, h: 52, name: '感知站' },
    { x: 415, z: 290, w: 80, d: 65, h: 68, name: '观测台' },
    { x: 515, z: 120, w: 55, d: 45, h: 38, name: '补给点' }
  ];
  let colors;
  const project = (x, z, y = 0) => [(x - z) * .86, (x + z) * .4 - y];
  const path = (points, fill, stroke, lineWidth = 1) => {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  };
  function line(points, color, lineWidth = 1) {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
  }
  function circle(x, y, radius, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function palette() {
    const dark = document.documentElement.dataset.theme === 'dark';
    colors = dark
      ? { grid: '#a3c6af22', edge: '#b6d5ae55', route: '#9ed9c2', ink: '#c8e9ce', paper: '#243d33', side: '#355346', top: '#466858', gold: '#eac189', blue: '#92cbd7', ground: '#27413724' }
      : { grid: '#366d4d1c', edge: '#57796155', route: '#3c8269', ink: '#285b46', paper: '#eff5e9', side: '#c9d9c3', top: '#e0e9d3', gold: '#ad8041', blue: '#3b8090', ground: '#dae5ce35' };
    draw();
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min((width - (width > 900 ? 270 : 16)) / 1080, height / 690, 1.5);
    origin = [width > 900 ? 270 + (width - 270) * .48 : width * .44, height * (focus ? .43 : .53)];
    draw();
  }
  function building(item) {
    const { x, z, w, d, h } = item;
    const a = project(x, z), b = project(x + w, z), c = project(x + w, z + d), e = project(x, z + d);
    const roof = [project(x, z, h), project(x + w, z, h), project(x + w, z + d, h), project(x, z + d, h)];
    path([b, c, roof[2], roof[1]], colors.side, colors.edge);
    path([e, c, roof[2], roof[3]], colors.paper, colors.edge);
    path(roof, colors.top, colors.edge);
    for (let i = 1; i < 4; i++) line([project(x + w * i / 4, z + d, 12), project(x + w * i / 4, z + d, h - 10)], colors.edge, 2);
    const p = project(x + w / 2, z + d / 2, h + 16);
    circle(...p, 3, colors.gold);
    if (width > 650 || focus) {
      ctx.fillStyle = colors.ink; ctx.font = '14px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(item.name, p[0], p[1] - 13);
    }
  }
  function robot(agent) {
    const p = project(agent.x, agent.z);
    ctx.save(); ctx.translate(...p);
    ctx.fillStyle = colors.route + '12'; ctx.beginPath(); ctx.ellipse(0, 0, 58, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = colors.route + '55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 43 + Math.sin(elapsed * 1.7) * 8, 18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'round';
    const step = agent.moving ? Math.sin(elapsed * 5) * 4 : 0;
    line([[-6, -14], [-8 - step, -2]], colors.ink, 5);
    line([[6, -14], [8 + step, -2]], colors.ink, 5);
    line([[-11, -32], [-17, -19 - step]], colors.ink, 4);
    line([[11, -32], [17, -19 + step]], colors.ink, 4);
    path([[-11, -37], [11, -37], [9, -15], [-9, -15]], colors.paper, colors.ink, 2);
    ctx.fillStyle = colors.paper; ctx.strokeStyle = colors.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-12, -58, 24, 19, 6); ctx.fill(); ctx.stroke();
    line([[-7, -49], [7, -49]], colors.blue, 4);
    line([[0, -59], [0, -66]], colors.ink, 1.5); circle(0, -68, 2.5, colors.gold);
    ctx.restore();
  }
  function drone(agent) {
    const ground = project(agent.x, agent.z);
    const p = project(agent.x, agent.z, 98 + Math.sin(elapsed * 2) * 5);
    ctx.save();
    ctx.fillStyle = colors.blue + '0c'; path([p, [ground[0] - 37, ground[1] + 9], [ground[0] + 37, ground[1] + 9]], colors.blue + '0c');
    ctx.beginPath(); ctx.ellipse(...ground, 26, 9, 0, 0, Math.PI * 2); ctx.fillStyle = colors.ink + '14'; ctx.fill();
    line([p, ground], colors.blue + '40');
    ctx.translate(...p);
    const blades = [[-24, -10], [24, -10], [-24, 11], [24, 11]];
    for (const [x, y] of blades) {
      line([[0, 0], [x, y]], colors.ink, 3);
      ctx.beginPath(); ctx.ellipse(x, y, 15, 5, 0, 0, Math.PI * 2); ctx.strokeStyle = colors.blue; ctx.lineWidth = 1.5; ctx.stroke();
      const angle = elapsed * 26 + x;
      line([[x - Math.cos(angle) * 13, y - Math.sin(angle) * 4], [x + Math.cos(angle) * 13, y + Math.sin(angle) * 4]], colors.blue, 2);
    }
    path([[0, -9], [12, 0], [0, 9], [-12, 0]], colors.paper, colors.ink, 2);
    circle(0, 3, 3, colors.gold); ctx.restore();
  }
  function vehicle(agent) {
    const p = project(agent.x, agent.z);
    ctx.save(); ctx.translate(...p);
    ctx.beginPath(); ctx.ellipse(0, 4, 34, 12, 0, 0, Math.PI * 2); ctx.fillStyle = colors.ink + '12'; ctx.fill();
    for (const [x, y] of [[-22, 0], [13, 11], [-1, -10], [30, 1]]) {
      ctx.beginPath(); ctx.ellipse(x, y, 5, 8, -.3, 0, Math.PI * 2); ctx.fillStyle = colors.ink; ctx.fill();
    }
    path([[-28, -11], [1, -24], [31, -10], [1, 4]], colors.top, colors.ink, 1.5);
    path([[-28, -11], [1, 4], [1, 12], [-28, -3]], colors.side, colors.ink, 1.5);
    path([[1, 4], [31, -10], [31, -2], [1, 12]], colors.paper, colors.ink, 1.5);
    path([[-10, -20], [2, -27], [17, -20], [4, -13]], colors.blue, colors.ink);
    line([[4, -23], [4, -37]], colors.ink, 2); circle(4, -39, 4, colors.gold);
    line([[19, 2], [26, -1]], colors.gold, 3); ctx.restore();
  }
  function draw() {
    if (!colors || !width) return;
    ctx.clearRect(0, 0, width, height);
    ctx.save(); ctx.translate(origin[0] + camera[0], origin[1] + camera[1]); ctx.scale(scale, scale);
    path([project(-35, -35), project(735, -35), project(735, 535), project(-35, 535)], colors.ground, colors.edge);
    for (let x = 0; x <= 700; x += 35) line([project(x, 0), project(x, 500)], colors.grid);
    for (let z = 0; z <= 500; z += 35) line([project(0, z), project(700, z)], colors.grid);
    // Wide paths evoke a navigable campus without competing with foreground text.
    line([project(30, 110), project(640, 110)], colors.edge, 13);
    line([project(300, 30), project(300, 470)], colors.edge, 13);
    line([project(50, 360), project(650, 360)], colors.edge, 13);
    agents.forEach((a, i) => {
      ctx.setLineDash(i === 1 ? [3, 8] : [8, 8]); ctx.globalAlpha = .48;
      line(a.route.map(p => project(...p)), [colors.route, colors.blue, colors.gold][i], 1.8);
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    if (goal) {
      const p = project(...goal);
      ctx.save(); ctx.translate(...p);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(0, 0, 12 + i * 10 + Math.sin(elapsed * 2) * 3, 5 + i * 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = colors.gold; ctx.globalAlpha = .8 - i * .2; ctx.stroke();
      }
      line([[0, 0], [0, -38]], colors.gold, 2); circle(0, -40, 4, colors.gold); ctx.restore();
    }
    const objects = landmarks.map(item => ({ depth: item.x + item.z + item.w + item.d, paint: () => building(item) }));
    agents.forEach((agent, i) => objects.push({ depth: agent.x + agent.z + (i === 1 ? 1000 : 0), paint: () => [robot, drone, vehicle][i](agent) }));
    objects.sort((a, b) => a.depth - b.depth).forEach(o => o.paint());
    ctx.restore();
  }
  function update(dt) {
    elapsed += dt;
    agents.forEach((a, i) => {
      const target = a.route[a.next];
      const dx = target[0] - a.x, dz = target[1] - a.z, distance = Math.hypot(dx, dz), step = [36, 49, 43][i] * dt;
      a.moving = distance > .1;
      if (distance <= step) { a.x = target[0]; a.z = target[1]; if (!goal || a.next < a.route.length - 1) a.next = (a.next + 1) % a.route.length; }
      else { a.x += dx / distance * step; a.z += dz / distance * step; }
    });
    camera = camera.map((v, i) => v + (pointer[i] - v) * Math.min(dt * 4, 1));
  }
  function tick(time) {
    frame = 0;
    if (paused || document.hidden) return;
    if (time - lastDraw >= 33) {
      update(lastTime ? Math.min((time - lastTime) / 1000, .08) : 0);
      lastTime = time; lastDraw = time; draw();
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
    focus = value;
    document.body.classList.toggle('scene-focus', focus);
    shell.inert = focus;
    info.hidden = !focus;
    focusButton.textContent = focus ? '返回阅读 Esc' : '沉浸漫游 ↗';
    focusButton.setAttribute('aria-expanded', String(focus));
    canvas.style.pointerEvents = focus ? 'auto' : 'none';
    if (!focus) { pointer = [0, 0]; camera = [0, 0]; }
    resize();
    focusButton.focus();
  }
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('william-scene-paused', String(paused)); } catch {}
    schedule();
  });
  focusButton.addEventListener('click', () => setFocus(!focus));
  addEventListener('keydown', e => { if (e.key === 'Escape' && focus) setFocus(false); });
  addEventListener('pointermove', e => {
    if (paused || motion.matches || e.pointerType === 'touch') return;
    pointer = [(e.clientX / width - .5) * 24, (e.clientY / height - .5) * 15];
  }, { passive: true });
  canvas.addEventListener('click', e => {
    if (!focus) return;
    const px = (e.clientX - origin[0] - camera[0]) / scale / .86;
    const py = (e.clientY - origin[1] - camera[1]) / scale / .4;
    const x = (px + py) / 2, z = (py - px) / 2;
    if (x < 0 || x > 700 || z < 0 || z > 500) return;
    goal = [x, z];
    agents.forEach(a => { a.route = [[a.x, a.z], [x, a.z], [x, z]]; a.next = 1; });
    status.textContent = '共同目标已更新，三个智能体沿示意路径前往目标。';
    draw();
  });
  motion.addEventListener('change', () => { paused = motion.matches; pointer = [0, 0]; camera = [0, 0]; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  addEventListener('resize', resize);
  new MutationObserver(palette).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  palette(); resize(); schedule();
})();
