(() => {
  'use strict';

  let cleanup = () => {};
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sigmoid = value => 1 / (1 + Math.exp(-value));
  const nodes = [
    {id:'A', x:65, y:140}, {id:'B', x:205, y:60}, {id:'C', x:205, y:220},
    {id:'D', x:355, y:65}, {id:'E', x:355, y:215}, {id:'F', x:505, y:140}, {id:'G', x:645, y:140}
  ];
  const links = [['A','B'],['A','C'],['B','C'],['B','D'],['C','E'],['D','E'],['D','F'],['E','F'],['F','G']];
  const linkKey = (a, b) => [a, b].sort().join('-');

  function route(source, target, broken = new Set()) {
    const queue = [[source]], visited = new Set([source]);
    while (queue.length) {
      const path = queue.shift(), current = path[path.length - 1];
      if (current === target) return path;
      for (const [a, b] of links) {
        if (broken.has(linkKey(a,b))) continue;
        const next = a === current ? b : b === current ? a : null;
        if (next && !visited.has(next)) { visited.add(next); queue.push([...path, next]); }
      }
    }
    return [];
  }

  function sortFrames(input, algorithm) {
    const values = [...input], frames = [];
    let comparisons = 0, writes = 0;
    const record = (active, label, done = false) => frames.push({values:[...values], active:[...active], comparisons, writes, label, done});
    record([], '就绪：选择单步观察，或播放整个过程。');
    if (algorithm === 'merge') {
      const merge = (left, right) => {
        if (right - left < 2) return;
        const mid = (left + right) >> 1;
        merge(left, mid); merge(mid, right);
        const first = values.slice(left, mid), second = values.slice(mid, right);
        let a = 0, b = 0, index = left;
        while (a < first.length && b < second.length) {
          comparisons++;
          record([left + a, mid + b], `合并区间 [${left}, ${right - 1}]：比较 ${first[a]} 与 ${second[b]}`);
          values[index] = first[a] <= second[b] ? first[a++] : second[b++];
          writes++; record([index], `写入位置 ${index}：${values[index]}`); index++;
        }
        while (a < first.length) { values[index] = first[a++]; writes++; record([index], `补齐左半区间：${values[index]}`); index++; }
        while (b < second.length) { values[index] = second[b++]; writes++; record([index], `补齐右半区间：${values[index]}`); index++; }
      };
      merge(0, values.length);
    } else {
      for (let end = values.length - 1; end > 0; end--) {
        let swapped = false;
        for (let index = 0; index < end; index++) {
          comparisons++; record([index, index + 1], `比较位置 ${index} 与 ${index + 1}`);
          if (values[index] > values[index + 1]) {
            [values[index], values[index + 1]] = [values[index + 1], values[index]];
            writes += 2; swapped = true; record([index, index + 1], '交换这两个元素');
          }
        }
        if (!swapped) break;
      }
    }
    record([], '排序完成。比较次数与写入次数来自这一次实际操作。', true);
    return frames;
  }

  function markup() {
    return `<section class="cs-labs" aria-label="计算机交互实验室">
      <div class="cs-tabs" role="tablist" aria-label="选择计算机实验室">
        <button class="cs-tab" type="button" role="tab" id="cs-tab-sort" aria-controls="cs-panel-sort" aria-selected="true" data-cs-tab="sort"><span>01 / ALGORITHMS</span><strong>排序与复杂度</strong></button>
        <button class="cs-tab" type="button" role="tab" id="cs-tab-neural" aria-controls="cs-panel-neural" aria-selected="false" tabindex="-1" data-cs-tab="neural"><span>02 / PERCEPTION</span><strong>神经元与决策</strong></button>
        <button class="cs-tab" type="button" role="tab" id="cs-tab-network" aria-controls="cs-panel-network" aria-selected="false" tabindex="-1" data-cs-tab="network"><span>03 / NETWORKS</span><strong>路由与数据包</strong></button>
      </div>

      <section class="cs-panel" role="tabpanel" id="cs-panel-sort" aria-labelledby="cs-tab-sort" data-cs-panel="sort">
        <header class="cs-panel-head"><div><p class="cs-overline">ALGORITHM OBSERVATORY</p><h2>把一次排序拆开看</h2><p>同一组数据，观察冒泡与归并如何比较、交换、写入。</p></div><span class="cs-chip">浏览器内运行</span></header>
        <div class="cs-controls"><label>算法<select data-cs-sort-algorithm><option value="bubble">冒泡排序 · O(n²)</option><option value="merge">归并排序 · O(n log n)</option></select></label><label>元素数量<select data-cs-sort-size><option>8</option><option selected>12</option><option>18</option></select></label><button type="button" data-cs-sort-play>播放</button><button type="button" data-cs-sort-step>单步</button><button type="button" data-cs-sort-reset>回到起点</button><button type="button" data-cs-sort-random>换组数据</button></div>
        <div class="cs-visual cs-sort-visual" data-cs-sort-visual></div>
        <div class="cs-metrics"><div><span>比较次数</span><strong data-cs-sort-comparisons>0</strong></div><div><span>写入次数</span><strong data-cs-sort-writes>0</strong></div><div><span>操作帧</span><strong data-cs-sort-frame>0 / 0</strong></div></div>
        <p class="cs-status" data-cs-sort-status role="status" aria-live="polite"></p>
        <div class="cs-explanation"><strong>观察什么？</strong><p>冒泡在相邻元素间交换；归并先分解区间，再按顺序写回。写入次数按数组赋值计数，一次交换记为两次写入。图中的高亮表示当前操作，不代表元素已经有序。</p></div>
      </section>

      <section class="cs-panel" role="tabpanel" id="cs-panel-neural" aria-labelledby="cs-tab-neural" data-cs-panel="neural" hidden>
        <header class="cs-panel-head"><div><p class="cs-overline">NEURAL SIGNAL DESK</p><h2>亲手调出一条决策边界</h2><p>调整输入、权重与偏置，看一个 Sigmoid 神经元怎样做出响应。</p></div><span class="cs-chip">可解释的教学模型</span></header>
        <div class="cs-neural-layout"><div class="cs-sliders">
          ${[['x1','输入 x₁',-1,1,.6],['x2','输入 x₂',-1,1,.3],['w1','权重 w₁',-4,4,2],['w2','权重 w₂',-4,4,-1],['bias','偏置 b',-3,3,0]].map(([id,label,min,max,value])=>`<label for="cs-neural-${id}"><span>${label}<output data-cs-neural-value="${id}">${value}</output></span><input id="cs-neural-${id}" data-cs-neural-input="${id}" type="range" min="${min}" max="${max}" step="0.1" value="${value}"></label>`).join('')}
          <div class="cs-controls"><button type="button" data-cs-neural-preset="positive">同时响应</button><button type="button" data-cs-neural-preset="contrast">差异响应</button><button type="button" data-cs-neural-preset="zero">归零</button></div>
        </div><div><div class="cs-visual cs-neural-visual" data-cs-neural-visual></div><div class="cs-neural-formula" data-cs-neural-formula role="status" aria-live="polite"></div></div></div>
        <div class="cs-neural-bottom"><div class="cs-heatmap-wrap"><div class="cs-visual cs-heatmap" data-cs-neural-heatmap></div><span>输入空间 x₁ × x₂ · 亮色表示更高的输出</span></div><div class="cs-explanation"><strong>从信号到决策</strong><p>先计算 z = w₁x₁ + w₂x₂ + b，再计算 p = 1 / (1 + e⁻ᶻ)。虚线是 p = 0.5 的决策边界，圆点是当前输入。此处演示单个神经元的前向计算，没有训练，也没有调用真实识别模型。</p><p data-cs-neural-insight></p></div></div>
      </section>

      <section class="cs-panel" role="tabpanel" id="cs-panel-network" aria-labelledby="cs-tab-network" data-cs-panel="network" hidden>
        <header class="cs-panel-head"><div><p class="cs-overline">PACKET ROUTING STATION</p><h2>让一个数据包抵达终点</h2><p>断开链路、改变 TTL，观察最少跳数路径和投递结果。</p></div><span class="cs-chip">BFS 路由模拟</span></header>
        <div class="cs-controls"><label>源节点<select data-cs-network-source>${nodes.map(node=>`<option ${node.id==='A'?'selected':''}>${node.id}</option>`).join('')}</select></label><label>目标节点<select data-cs-network-target>${nodes.map(node=>`<option ${node.id==='G'?'selected':''}>${node.id}</option>`).join('')}</select></label><label>初始 TTL<input data-cs-network-ttl type="number" min="1" max="12" step="1" value="6"></label><button type="button" data-cs-network-send>发送数据包</button><button type="button" data-cs-network-step>逐跳前进</button><button type="button" data-cs-network-reset>恢复链路</button></div>
        <div class="cs-visual cs-network-visual" data-cs-network-visual></div>
        <div class="cs-link-controls" aria-label="切换网络链路">${links.map(([a,b])=>`<button type="button" data-cs-network-link="${linkKey(a,b)}" aria-pressed="false" aria-label="断开链路 ${a} 到 ${b}">${a} ↔ ${b}</button>`).join('')}</div>
        <p class="cs-status" data-cs-network-status role="status" aria-live="polite"></p>
        <div class="cs-network-bottom"><div class="cs-log" aria-label="数据包传输日志"><h3>传输日志</h3><ol data-cs-network-log></ol></div><div class="cs-explanation"><strong>实验规则</strong><p>所有链路权重相同，BFS 在当前连通图上寻找最少跳数路径。每经过一条链路，TTL 减一；尚未到达目标且 TTL 已耗尽，就丢弃数据包。修改拓扑会取消当前传输并重新计算路线。</p><p>这是离散的教学模拟；真实互联网还涉及路由协议、拥塞、时延与丢包。</p></div></div>
      </section>
    </section>`;
  }

  function mount(root = document) {
    cleanup();
    const host = root.matches?.('.cs-labs') ? root : root.querySelector('.cs-labs');
    if (!host) return;
    const controller = new AbortController(), signal = controller.signal;
    const $ = selector => host.querySelector(selector);
    const $$ = selector => [...host.querySelectorAll(selector)];
    const on = (target, event, callback) => target.addEventListener(event, callback, {signal});
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let sortTimer = null, networkTimer = null;
    const pauseSort = () => { clearInterval(sortTimer); sortTimer = null; $('[data-cs-sort-play]').textContent = '播放'; };
    const pauseNetwork = () => { clearInterval(networkTimer); networkTimer = null; };
    cleanup = () => { pauseSort(); pauseNetwork(); controller.abort(); };

    const switchTab = id => {
      pauseSort(); pauseNetwork();
      $$('[data-cs-tab]').forEach(tab => { const active = tab.dataset.csTab === id; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
      $$('[data-cs-panel]').forEach(panel => { panel.hidden = panel.dataset.csPanel !== id; });
    };
    $$('[data-cs-tab]').forEach((tab, index, tabs) => {
      on(tab, 'click', () => switchTab(tab.dataset.csTab));
      on(tab, 'keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); switchTab(tabs[next].dataset.csTab); tabs[next].focus();
      });
    });

    let input = [], frames = [], frame = 0;
    const paintSort = () => {
      const current = frames[frame], count = current.values.length, cell = 680 / count;
      $('[data-cs-sort-visual]').innerHTML = `<svg viewBox="0 0 720 280" role="img" aria-label="排序柱状图：${current.values.join('、')}；${escape(current.label)}"><path d="M20 236H700" class="cs-grid-line"/>${current.values.map((value,index)=>`<g><rect x="${20+index*cell+4}" y="${232-value*1.8}" width="${cell-8}" height="${value*1.8}" rx="4" class="${current.done?'cs-bar-done':current.active.includes(index)?'cs-bar-active':'cs-bar'}"/><text x="${20+(index+.5)*cell}" y="${222-value*1.8}" text-anchor="middle">${value}</text><text x="${20+(index+.5)*cell}" y="258" text-anchor="middle" class="cs-axis-text">${index}</text></g>`).join('')}</svg>`;
      $('[data-cs-sort-comparisons]').textContent = current.comparisons;
      $('[data-cs-sort-writes]').textContent = current.writes;
      $('[data-cs-sort-frame]').textContent = `${frame} / ${frames.length-1}`;
      $('[data-cs-sort-status]').textContent = current.label;
      $('[data-cs-sort-step]').disabled = frame === frames.length - 1;
    };
    const rebuild = random => {
      pauseSort();
      if (random) input = Array.from({length:Number($('[data-cs-sort-size]').value)},()=>10+Math.floor(Math.random()*90));
      frames = sortFrames(input, $('[data-cs-sort-algorithm]').value); frame = 0; paintSort();
    };
    const stepSort = () => { if (frame < frames.length - 1) frame++; paintSort(); if (frame === frames.length - 1) pauseSort(); };
    on($('[data-cs-sort-play]'), 'click', () => {
      if (sortTimer) return pauseSort();
      if (frame === frames.length - 1) { frame = 0; paintSort(); }
      $('[data-cs-sort-play]').textContent = '暂停';
      sortTimer = setInterval(stepSort, reducedMotion ? 850 : 260);
    });
    on($('[data-cs-sort-step]'), 'click', () => { pauseSort(); stepSort(); });
    on($('[data-cs-sort-reset]'), 'click', () => rebuild(false));
    on($('[data-cs-sort-random]'), 'click', () => rebuild(true));
    on($('[data-cs-sort-size]'), 'change', () => rebuild(true));
    on($('[data-cs-sort-algorithm]'), 'change', () => rebuild(false));
    rebuild(true);

    const paintNeural = () => {
      const state = Object.fromEntries($$('[data-cs-neural-input]').map(input=>[input.dataset.csNeuralInput, Number(input.value)]));
      const {x1,x2,w1,w2,bias} = state, z = x1*w1+x2*w2+bias, p = sigmoid(z);
      $$('[data-cs-neural-value]').forEach(output=>{output.textContent=state[output.dataset.csNeuralValue].toFixed(1);});
      $('[data-cs-neural-visual]').innerHTML = `<svg viewBox="0 0 560 265" role="img" aria-label="神经元网络，输出 ${p.toFixed(3)}"><defs><linearGradient id="cs-neural-gradient"><stop stop-color="var(--accent)"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><path d="M105 65L315 130" class="cs-neural-edge ${w1<0?'cs-negative':''}" stroke-width="${2+Math.abs(w1)*1.5}"/><path d="M105 200L315 130" class="cs-neural-edge ${w2<0?'cs-negative':''}" stroke-width="${2+Math.abs(w2)*1.5}"/><path d="M360 130H475" class="cs-neural-edge" stroke-width="4"/><circle cx="80" cy="65" r="28" class="cs-node"/><circle cx="80" cy="200" r="28" class="cs-node"/><circle cx="335" cy="130" r="40" class="cs-node cs-node-active"/><circle cx="485" cy="130" r="29" class="cs-node"/><text x="80" y="70" text-anchor="middle">x₁</text><text x="80" y="205" text-anchor="middle">x₂</text><text x="335" y="136" text-anchor="middle" class="cs-neural-symbol">σ</text><text x="485" y="135" text-anchor="middle">p</text><text x="205" y="65" text-anchor="middle">w₁ = ${w1.toFixed(1)}</text><text x="205" y="215" text-anchor="middle">w₂ = ${w2.toFixed(1)}</text><text x="335" y="202" text-anchor="middle">b = ${bias.toFixed(1)}</text><text x="485" y="195" text-anchor="middle">${p.toFixed(3)}</text></svg>`;
      $('[data-cs-neural-formula]').textContent = `z = ${w1.toFixed(1)} × ${x1.toFixed(1)} + ${w2.toFixed(1)} × ${x2.toFixed(1)} + ${bias.toFixed(1)} = ${z.toFixed(2)}　 →　p = ${p.toFixed(3)}`;
      const cells = [], resolution = 20, size = 200/resolution;
      for (let row=0;row<resolution;row++) for(let col=0;col<resolution;col++) {
        const value=sigmoid(w1*(-1+(col+.5)*2/resolution)+w2*(1-(row+.5)*2/resolution)+bias);
        cells.push(`<rect x="${30+col*size}" y="${15+row*size}" width="${size+.2}" height="${size+.2}" fill="hsl(${207-value*29} 80% ${12+value*58}%)"/>`);
      }
      const boundary = [];
      const add = (x,y) => { if (x>=-1.00001&&x<=1.00001&&y>=-1.00001&&y<=1.00001&&!boundary.some(point=>Math.abs(point[0]-x)+Math.abs(point[1]-y)<.00001)) boundary.push([x,y]); };
      if (Math.abs(w2)>.00001) {add(-1,(-bias+w1)/w2);add(1,(-bias-w1)/w2);}
      if (Math.abs(w1)>.00001) {add((-bias+w2)/w1,-1);add((-bias-w2)/w1,1);}
      const decision = boundary.length>=2?`<path d="M${130+boundary[0][0]*100} ${115-boundary[0][1]*100}L${130+boundary[1][0]*100} ${115-boundary[1][1]*100}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4"/>`:'';
      $('[data-cs-neural-heatmap]').innerHTML=`<svg viewBox="0 0 270 250" role="img" aria-label="输入决策热图，当前输入 ${x1.toFixed(1)}、${x2.toFixed(1)}，输出 ${p.toFixed(3)}">${cells.join('')}${decision}<circle cx="${130+x1*100}" cy="${115-x2*100}" r="5" fill="#fff" stroke="#091b26" stroke-width="2"/><text x="125" y="242">x₁</text><text x="7" y="118">x₂</text><text x="23" y="230">−1</text><text x="221" y="230">1</text><text x="12" y="24">1</text></svg>`;
      $('[data-cs-neural-insight]').textContent = Math.abs(w1)+Math.abs(w2)===0 ? '所有权重为零时，输入不再改变输出，响应仅由偏置决定。' : `当前 p ${p>=.5?'≥':'<'} 0.5。${w1<0?'提高 x₁ 会压低输出。':w1>0?'提高 x₁ 会抬高输出。':'x₁ 暂时不影响输出。'} 增大权重绝对值会让过渡更陡。`;
    };
    $$('[data-cs-neural-input]').forEach(input=>on(input,'input',paintNeural));
    $$('[data-cs-neural-preset]').forEach(button=>on(button,'click',()=>{
      const presets={positive:{x1:.6,x2:.6,w1:3,w2:3,bias:-2},contrast:{x1:.6,x2:.3,w1:3,w2:-3,bias:0},zero:{x1:0,x2:0,w1:0,w2:0,bias:0}};
      for (const [key,value] of Object.entries(presets[button.dataset.csNeuralPreset])) $(`[data-cs-neural-input="${key}"]`).value=value;
      paintNeural();
    }));
    paintNeural();

    const broken = new Set();
    let packet = null, log = [];
    const networkState = () => ({source:$('[data-cs-network-source]').value,target:$('[data-cs-network-target]').value,ttl:Math.max(1,Math.min(12,Math.trunc(Number($('[data-cs-network-ttl]').value)||1)))});
    const addLog = message => { log.push(message); $('[data-cs-network-log]').innerHTML=log.map(item=>`<li>${escape(item)}</li>`).join(''); };
    const paintNetwork = () => {
      const {source,target}=networkState(), path = route(source,target,broken);
      const activeLinks=new Set(path.slice(1).map((id,index)=>linkKey(path[index],id)));
      const current=packet?packet.path[packet.position]:null;
      $('[data-cs-network-visual]').innerHTML=`<svg viewBox="0 0 710 285" role="img" aria-label="网络拓扑；${path.length?'路线 '+path.join(' 到 '):'源节点与目标节点不连通'}">${links.map(([a,b])=>{const first=nodes.find(node=>node.id===a),second=nodes.find(node=>node.id===b),key=linkKey(a,b);return `<line x1="${first.x}" y1="${first.y}" x2="${second.x}" y2="${second.y}" class="cs-network-link ${broken.has(key)?'cs-link-broken':activeLinks.has(key)?'cs-link-route':''}"/>`;}).join('')}${nodes.map(node=>`<g><circle cx="${node.x}" cy="${node.y}" r="23" class="cs-node ${node.id===source||node.id===target?'cs-node-active':''}"/><text x="${node.x}" y="${node.y+5}" text-anchor="middle">${node.id}</text>${current===node.id?`<circle cx="${node.x}" cy="${node.y-36}" r="7" class="cs-packet"/><text x="${node.x}" y="${node.y-49}" text-anchor="middle" class="cs-packet-label">TTL ${packet.ttl}</text>`:''}</g>`).join('')}</svg>`;
      if (!packet) $('[data-cs-network-status]').textContent=path.length?`当前最少跳数路线：${path.join(' → ')} · ${path.length-1} 跳`:'当前源节点与目标节点不连通，请恢复链路或更换节点。';
      $$('[data-cs-network-link]').forEach(button=>{const disconnected=broken.has(button.dataset.csNetworkLink);button.setAttribute('aria-pressed',String(disconnected));button.setAttribute('aria-label',`${disconnected?'恢复':'断开'}链路 ${button.dataset.csNetworkLink.replace('-',' 到 ')}`);});
    };
    const resetPacket = () => {pauseNetwork();packet=null;log=[];addLog('路由已更新，等待发送。');paintNetwork();};
    const startPacket = () => {
      pauseNetwork();log=[];$('[data-cs-network-log]').innerHTML='';
      const {source,target,ttl}=networkState(),path=route(source,target,broken);
      $('[data-cs-network-ttl]').value=ttl;
      if (!path.length) {packet=null;addLog('投递失败：源节点与目标节点不连通。');paintNetwork();return false;}
      packet={path,position:0,ttl,finished:source===target};
      addLog(`创建数据包：${source} → ${target}，初始 TTL ${ttl}。`);
      $('[data-cs-network-status]').textContent=source===target?'源节点就是目标节点：已本地投递。':`数据包就绪：${path.join(' → ')}`;
      if(source===target)addLog('已在源节点本地投递，无需经过链路。');
      paintNetwork();return !packet.finished;
    };
    const stepNetwork = () => {
      if (!packet||packet.finished) { if(!startPacket())return; }
      const previous=packet.path[packet.position];packet.position++;packet.ttl--;
      const current=packet.path[packet.position],delivered=packet.position===packet.path.length-1;
      addLog(`${previous} → ${current}，剩余 TTL ${packet.ttl}。`);
      if(delivered){packet.finished=true;pauseNetwork();addLog('投递成功：数据包已抵达目标。');$('[data-cs-network-status]').textContent=`投递成功 · ${packet.position} 跳 · 剩余 TTL ${packet.ttl}`;}
      else if(packet.ttl<=0){packet.finished=true;pauseNetwork();addLog(`投递失败：TTL 在 ${current} 耗尽，数据包已丢弃。`);$('[data-cs-network-status]').textContent=`投递失败 · TTL 在节点 ${current} 耗尽`;}
      else $('[data-cs-network-status]').textContent=`传输中：当前节点 ${current} · 剩余 TTL ${packet.ttl}`;
      paintNetwork();
    };
    on($('[data-cs-network-send]'),'click',()=>{if(startPacket())networkTimer=setInterval(stepNetwork,reducedMotion?1100:700);});
    on($('[data-cs-network-step]'),'click',()=>{pauseNetwork();stepNetwork();});
    on($('[data-cs-network-reset]'),'click',()=>{broken.clear();resetPacket();});
    $$('[data-cs-network-source],[data-cs-network-target],[data-cs-network-ttl]').forEach(input=>on(input,'change',resetPacket));
    $$('[data-cs-network-link]').forEach(button=>on(button,'click',()=>{const key=button.dataset.csNetworkLink;broken.has(key)?broken.delete(key):broken.add(key);resetPacket();}));
    resetPacket();
    const requestedLab = new URLSearchParams(location.hash.split('?')[1] || '').get('lab');
    const initialTab = { sorting: 'sort', neural: 'neural', network: 'network' }[requestedLab];
    if (initialTab) switchTab(initialTab);
    on(document,'visibilitychange',()=>{if(document.hidden){pauseSort();pauseNetwork();}});
  }

  window.ComputerLabs = {markup, mount, unmount:()=>cleanup()};
})();
