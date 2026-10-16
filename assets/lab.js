(() => {
  'use strict';
  const COLS = 14, ROWS = 10, CELL = 40;
  const key = (x, y) => `${x},${y}`;
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  let active = [];
  function findPath(start, goal, obstacles) {
    const queue = [start], parent = new Map([[key(...start), null]]);
    for (let index = 0; index < queue.length; index++) {
      const point = queue[index];
      if (same(point, goal)) {
        const path = [];
        let cursor = point;
        while (cursor) { path.unshift(cursor); cursor = parent.get(key(...cursor)); }
        return { path, explored: parent.size };
      }
      for (const [dx, dy] of [[1, 0], [0, -1], [-1, 0], [0, 1]]) {
        const x = point[0] + dx, y = point[1] + dy, id = key(x, y);
        if (!inside(x, y) || obstacles.has(id) || parent.has(id)) continue;
        parent.set(id, point); queue.push([x, y]);
      }
    }
    return { path: [], explored: parent.size };
  }
  function markup({ compact = false } = {}) {
    return `<section class="embodied-lab ${compact ? 'lab-compact' : ''}" data-embodied-lab data-compact="${compact}"><div class="lab-heading"><span class="tiny-label">EMBODIED SANDBOX / 具身实验</span><span class="lab-live"><i></i> 可交互</span></div><div class="lab-map-wrap"><svg class="lab-world" viewBox="0 0 560 400" tabindex="0" role="application" aria-label="机器人导航演示。点击设置目标；方向键手动移动机器人。"></svg><span class="lab-map-label">已知地图 · 二维示意</span></div><div class="lab-status" role="status" aria-live="polite"></div>${compact ? '<p class="lab-mini-hint">点击地面，给机器人一个新目标。</p><a class="text-link" href="#/lab">进入完整实验室 ↗</a>' : '<div class="lab-toolbar"><button class="lab-control active" data-lab-mode="goal">设置目标</button><button class="lab-control" data-lab-mode="obstacle">编辑障碍</button><button class="lab-control lab-run" data-lab-action="run">规划并移动</button><button class="lab-control" data-lab-action="pause">暂停</button><button class="lab-control" data-lab-action="reset">重置场景</button></div><div class="lab-presets"><span>快捷目标</span><button data-lab-preset="11,2">目标 A</button><button data-lab-preset="10,7">目标 B</button><button data-lab-preset="2,1">目标 C</button></div><div class="lab-metrics"><span>路径步数 <strong data-lab-steps>—</strong></span><span>探索格数 <strong data-lab-explored>—</strong></span><span>当前位置 <strong data-lab-position>2, 7</strong></span></div><p class="lab-explanation">这是使用完整已知地图与 BFS 寻路的交互示意，不是实际机器人策略或研究结果。选“编辑障碍”后点击格子可添加或移除障碍，方向键可手动移动机器人。</p>'}</section>`;
  }
  function mount(root) {
    for (const container of root.querySelectorAll('[data-embodied-lab]')) {
      const compact = container.dataset.compact === 'true';
      const world = container.querySelector('.lab-world');
      const status = container.querySelector('.lab-status');
      let robot, goal, obstacles, route = [], timer = null, mode = 'goal', moved = 0, explored = 0;
      function stop() { if (timer) clearInterval(timer); timer = null; }
      function report(text) { status.textContent = text; }
      function draw() {
        const cells = [];
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cells.push(`<rect x="${x * CELL + 2}" y="${y * CELL + 2}" width="36" height="36" rx="4" class="${obstacles.has(key(x, y)) ? 'lab-obstacle' : 'lab-cell'}" data-cell="${x},${y}"/>`);
        const routePath = route.length ? `<polyline class="lab-route" points="${route.map(([x, y]) => `${x * CELL + 20},${y * CELL + 20}`).join(' ')}"/>` : '';
        const [rx, ry] = robot.map(n => n * CELL + 20), [gx, gy] = goal.map(n => n * CELL + 20);
        world.innerHTML = `${cells.join('')}<circle cx="${rx}" cy="${ry}" r="94" class="lab-sensor"/>${routePath}<g class="lab-goal" transform="translate(${gx} ${gy})"><circle r="14"/><circle r="5"/><path d="M0-20v7M0 13v7M-20 0h7M13 0h7"/></g><g class="lab-robot" transform="translate(${rx} ${ry})"><circle r="17" class="lab-robot-base"/><rect x="-11" y="-9" width="22" height="17" rx="5"/><path d="M0-9v-5m-4 22v5m8-5v5M-14-2h3m22 0h3"/><circle cx="-4" cy="-2" r="1.3"/><circle cx="4" cy="-2" r="1.3"/><path d="M-3 3h6"/></g>`;
        container.querySelector('[data-lab-steps]')?.replaceChildren(document.createTextNode(String(Math.max(0, route.length - 1))));
        container.querySelector('[data-lab-explored]')?.replaceChildren(document.createTextNode(explored || '—'));
        container.querySelector('[data-lab-position]')?.replaceChildren(document.createTextNode(robot.join(', ')));
      }
      function plan() {
        const result = findPath(robot, goal, obstacles);
        route = result.path; explored = result.explored; moved = 0;
        draw();
        return route.length > 0;
      }
      function run() {
        stop();
        if (!plan()) { report('没有可达路径。试着移除障碍，或选择另一个目标。'); return; }
        if (route.length === 1) { report('机器人已经到达目标。试试换一个位置。'); return; }
        report('规划完成 → 正在行动');
        const steps = route.slice(1);
        timer = setInterval(() => {
          robot = steps[moved++]; draw();
          if (moved >= steps.length) { stop(); report(`已到达目标 · 移动 ${moved} 步 · 继续点击探索`); }
        }, compact ? 160 : 220);
      }
      function reset() {
        stop(); robot = [2, 7]; goal = [11, 2];
        obstacles = new Set(['5,2', '5,3', '5,4', '5,5', '8,5', '9,5', '10,5', '8,6', '8,7', '3,3', '10,1']);
        route = []; explored = 0; moved = 0;
        draw(); report(compact ? '感知 → 规划 → 行动' : '选择一个目标，然后点击“规划并移动”。');
      }
      function choose(point) {
        if (obstacles.has(key(...point))) { report('目标不能放在障碍物上。'); return; }
        stop(); goal = point; route = []; explored = 0; draw();
        if (compact) run(); else report('目标已更新，点击“规划并移动”。');
      }
      world.addEventListener('click', event => {
        const rect = world.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / rect.width * COLS);
        const y = Math.floor((event.clientY - rect.top) / rect.height * ROWS);
        if (!inside(x, y)) return;
        if (mode === 'obstacle' && !compact) {
          if (same(robot, [x, y]) || same(goal, [x, y])) { report('机器人和目标所在位置不能放置障碍。'); return; }
          stop(); const id = key(x, y); if (obstacles.has(id)) obstacles.delete(id); else obstacles.add(id);
          route = []; explored = 0; draw(); report('障碍已更新，可重新规划路径。');
        } else choose([x, y]);
      });
      world.addEventListener('keydown', event => {
        const delta = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
        if (!delta) return;
        event.preventDefault(); stop();
        const point = [robot[0] + delta[0], robot[1] + delta[1]];
        if (!inside(...point) || obstacles.has(key(...point))) { report('这个方向被边界或障碍挡住了。'); return; }
        robot = point; route = []; explored = 0; draw(); report(same(robot, goal) ? '手动到达目标。' : `手动移动到 ${robot.join(', ')}。`);
      });
      container.addEventListener('click', event => {
        const action = event.target.closest('[data-lab-action]')?.dataset.labAction;
        if (action === 'run') run();
        if (action === 'pause') { stop(); report('已暂停。点击“规划并移动”从当前位置继续。'); }
        if (action === 'reset') reset();
        const selectedMode = event.target.closest('[data-lab-mode]');
        if (selectedMode) { mode = selectedMode.dataset.labMode; container.querySelectorAll('[data-lab-mode]').forEach(button => { const active = button === selectedMode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }); report(mode === 'goal' ? '点击地图设置目标。' : '点击格子添加或移除障碍。'); }
        const preset = event.target.closest('[data-lab-preset]');
        if (preset) choose(preset.dataset.labPreset.split(',').map(Number));
      });
      reset(); active.push(stop);
    }
  }
  function unmount() { active.forEach(stop => stop()); active = []; }
  window.EmbodiedLab = { markup, mount, unmount, findPath };
})();
