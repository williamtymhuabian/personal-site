(() => {
  'use strict';
  const { fields } = JSON.parse(document.querySelector('#site-data').textContent);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let controller;
  const slider=(key,label,min,max,value,step=1)=>`<label>${label}<input type="range" data-field-value="${key}" min="${min}" max="${max}" value="${value}" step="${step}"><output data-field-output="${key}">${value}</output></label>`;
  const select=(key,label,items)=>`<label>${label}<select data-field-value="${key}">${items.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
  function controls(demo) {
    if(demo==='scheduler')return `<label>任务运行时长（同时到达）<input data-field-value="jobs" value="5,3,8,4" maxlength="80"></label>${slider('quantum','时间片',1,8,2)}`;
    if(demo==='access')return `${select('role','角色',[['viewer','读者'],['editor','编辑'],['admin','管理员']])}${select('resource','资源',[['private','私有'],['public','公开']])}${select('action','操作',[['write','写入'],['read','读取']])}<label class="field-check"><input type="checkbox" data-field-value="owner">我是资源所有者</label>`;
    if(demo==='state')return `<div class="field-button-row">${[['submit','提交审核'],['approve','审核通过'],['reject','退回修改'],['revise','重新修订'],['reset','重置']].map(([id,t])=>`<button type="button" data-state-event="${id}">${t}</button>`).join('')}</div>`;
    if(demo==='index')return `${select('size','有序数据规模',[['100','100 条'],['1000','1000 条'],['10000','10000 条']])}<label>要查找的整数<input type="number" data-field-value="target" min="1" max="10000" value="73"></label>`;
    if(demo==='bezier')return `${slider('y1','控制点 P₁ 高度',0,280,30)}${slider('y2','控制点 P₂ 高度',0,280,30)}${slider('t','曲线参数 t',0,1,.5,.01)}`;
    if(demo==='fitts')return `${slider('distance','起点到目标中心距离 D',80,480,240)}${slider('width','目标直径 W',16,100,48)}<button type="button" data-fitts-start>开始一次点击</button>`;
    if(demo==='montecarlo')return `<div class="field-button-row"><button type="button" data-sample="100">增加 100 个样本</button><button type="button" data-sample="1000">增加 1000 个样本</button><button type="button" data-sample="reset">重新开始</button></div>`;
    return '';
  }
  const explanations={scheduler:'所有任务在时刻 0 到达，按输入顺序入队；采用时间片轮转，不计上下文切换开销。等待时间 = 完成时间 − 运行时长。',access:'教学策略：公开资源可读取；管理员可访问全部资源；编辑仅可访问自己拥有的资源；其他情况拒绝。实际系统还需认证、服务端执行和审计。',state:'三个状态：草稿、审核中、已发布。只有声明过的转移才有效；无效操作不会改变状态。此例帮助理解状态建模与测试路径。',index:'数据为从 1 开始的有序整数数组。逐行扫描与二分查找均计数实际比较次数；它演示索引思想，并非完整数据库或 B+ 树性能测试。',bezier:'固定起点和终点，改变两个控制点及 t。辅助折线展示 de Casteljau 逐层线性插值；曲线由同一组控制点生成。',fitts:'困难度 ID = log₂(D/W + 1)。数值用于比较目标任务，不直接预测个人耗时；点击图中起点，再点击目标，可观察这一次实际用时。',montecarlo:'在正方形中采样，以圆内比例估计 π。使用固定伪随机种子，便于复现；图中最多保留最近 1000 个点，指标按全部样本计算。'};
  function markup(query) {
    const legacy={sorting:'theory',neural:'ai',network:'network'};
    const selected=fields.find(f=>f.id===(query.get('field')||legacy[query.get('lab')]))||fields[0];
    const experiment=selected.demo.startsWith('legacy-')?`<div class="field-legacy">${window.ComputerLabs.markup()}</div>`:`<section class="field-experiment" data-field-demo="${selected.demo}"><div class="field-controls">${controls(selected.demo)}</div><div class="field-visual" data-field-visual></div><div class="field-result" data-field-result role="status" aria-live="polite"></div><p class="field-explanation">${explanations[selected.demo]}</p></section>`;
    return `<section class="page-header"><p class="eyebrow">COMPUTING / EXPERIMENTS / RESEARCH</p><h1>计算机方向与交互实验室</h1><p>按十个主要领域探索计算。每个方向从一个可操作示例进入，再连接到相关研究与期刊会议。</p></section><div class="field-layout"><aside class="field-rail"><label for="field-search">查找方向或主题</label><input id="field-search" type="search" placeholder="如：VLN、数据库、编译"><nav aria-label="计算机研究方向">${fields.map((field,i)=>`<a href="#/labs?field=${field.id}" class="field-option ${field===selected?'active':''}" data-field-search="${esc([field.title,...field.topics].join(' '))}" ${field===selected?'aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(field.title)}</strong></a>`).join('')}</nav><p class="field-search-empty" hidden>没有匹配方向，试试其他关键词。</p><a class="text-link" href="#/lab">保留实验：具身导航 ↗</a></aside><div class="field-workbench" data-active-field="${selected.id}"><div class="field-intro"><span class="tiny-label">${esc(selected.ccfName)}</span><h2>${esc(selected.title)}</h2><p>${esc(selected.intro)}</p><div class="field-topics">${selected.topics.map(topic=>`<span>${esc(topic)}</span>`).join('')}</div><a class="text-link" href="#/venues?category=${selected.id}">查看这个领域的 CCF 期刊与会议 ↗</a></div><div class="section-heading"><h2>${esc(selected.experiment)}</h2><span>交互教学示例</span></div>${experiment}<div class="field-discussion">${window.Portfolio.actions(window.TopicModel.fieldKey(selected.id))}</div><p class="field-scope">方向导航参照 CCF 的十类目录组织，主题用于探索入口；单个教学示例不代表整个领域，也不表示站主已在所有方向完成研究。</p></div></div>`;
  }
  function mount(root) {
    const host=root.querySelector('.field-workbench');if(!host)return;
    controller=new AbortController();const on=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});
    const search=root.querySelector('#field-search');
    on(search,'input',()=>{const q=search.value.trim().toLowerCase();let visible=0;root.querySelectorAll('.field-option').forEach(a=>{a.hidden=!a.dataset.fieldSearch.toLowerCase().includes(q);if(!a.hidden)visible++;});root.querySelector('.field-search-empty').hidden=visible!==0;});
    const active=fields.find(f=>f.id===host.dataset.activeField);
    if(active.demo.startsWith('legacy-')){host.querySelector(`[data-cs-tab="${{'legacy-sort':'sort','legacy-neural':'neural','legacy-network':'network'}[active.demo]}"]`).click();return;}
    const visual=host.querySelector('[data-field-visual]'),result=host.querySelector('[data-field-result]'),demo=active.demo;
    const val=key=>host.querySelector(`[data-field-value="${key}"]`);
    let state='draft',logs=[],seed=42,total=0,inside=0,samples=[],started=null;
    const stateNames={draft:'草稿',review:'审核中',published:'已发布'};
    const transitions={draft:{submit:'review'},review:{approve:'published',reject:'draft'},published:{revise:'draft'}};
    const metric=(name,value)=>`<div><span>${name}</span><strong>${value}</strong></div>`;
    const svg=(body,label='交互实验图')=>`<svg viewBox="0 0 640 280" role="img" aria-label="${esc(label)}">${body}</svg>`;
    function paint(){
      host.querySelectorAll('[data-field-output]').forEach(out=>out.textContent=val(out.dataset.fieldOutput).value);
      if(demo==='scheduler'){
        const raw=val('jobs').value.trim(),tokens=raw.split(/[,，\s]+/);const jobs=tokens.map(Number),q=Number(val('quantum').value);
        if(!raw||jobs.length>8||jobs.some(n=>!Number.isInteger(n)||n<1||n>20)){visual.innerHTML='';result.textContent='请输入 1—8 个任务，时长为 1—20 的整数，用逗号分隔。';return;}
        const left=[...jobs],segments=[],finish=[];let time=0;
        while(left.some(n=>n>0)){left.forEach((n,i)=>{if(n<=0)return;const run=Math.min(n,q);segments.push({i,start:time,run});time+=run;left[i]-=run;if(!left[i])finish[i]=time;});}
        visual.innerHTML=svg(`<path d="M20 190H620" class="field-line"/>${segments.map(s=>{const x=20+s.start/time*600,w=s.run/time*600;return `<rect x="${x}" y="80" width="${w}" height="80" fill="var(--accent)" opacity="${.35+s.i/jobs.length*.6}" stroke="var(--paper)"/>${w>20?`<text x="${x+w/2}" y="125" text-anchor="middle" fill="var(--bg)">${String.fromCharCode(65+s.i)}</text>`:''}`;}).join('')}<text x="20" y="215">0</text><text x="620" y="215" text-anchor="end">${time}</text>`, '时间片轮转调度甘特图');
        result.innerHTML=metric('总运行时长',time)+metric('平均等待时间',((finish.reduce((a,b)=>a+b,0)-time)/jobs.length).toFixed(2))+metric('平均周转时间',(finish.reduce((a,b)=>a+b,0)/jobs.length).toFixed(2));
      }else if(demo==='access'){
        const role=val('role').value,resource=val('resource').value,action=val('action').value,owner=val('owner').checked;
        const allow=(r,o)=>resource==='public'&&action==='read'||r==='admin'||r==='editor'&&o;
        const reason=resource==='public'&&action==='read'?'公开资源允许读取':role==='admin'?'管理员策略允许':role==='editor'&&owner?'编辑拥有该资源':'没有匹配的允许策略';
        visual.innerHTML=`<div class="field-policy"><h3>${allow(role,owner)?'允许访问':'拒绝访问'}</h3><p>${reason}</p><div class="field-policy-grid">${['viewer','editor','admin'].map(r=>`<div><strong>${{viewer:'读者',editor:'编辑',admin:'管理员'}[r]}</strong><p>非所有者：${allow(r,false)?'允许':'拒绝'}</p><p>所有者：${allow(r,true)?'允许':'拒绝'}</p></div>`).join('')}</div></div>`;result.innerHTML=metric('当前操作',action==='read'?'读取':'写入')+metric('资源范围',resource==='public'?'公开':'私有');
      }else if(demo==='state'){
        visual.innerHTML=`<div class="field-state-track">${Object.entries(stateNames).map(([id,name])=>`<span class="${state===id?'active':''}">${name}</span>`).join('<b>→</b>')}</div><ol class="field-state-log">${logs.slice(-6).map(log=>`<li>${esc(log)}</li>`).join('')||'<li>点击操作按钮，观察状态变化。</li>'}</ol>`;result.innerHTML=metric('当前状态',stateNames[state])+metric('有效转移次数',logs.filter(l=>l.startsWith('有效')).length);
      }else if(demo==='index'){
        const n=Number(val('size').value),target=Number(val('target').value);if(!Number.isInteger(target)||target<1||target>10000){visual.innerHTML='';result.textContent='查找值应为 1—10000 的整数。';return;}
        let low=1,high=n,count=0,found=false;const trace=[];
        while(low<=high){const mid=Math.floor((low+high)/2);count++;trace.push(`第 ${count} 次：区间 [${low}, ${high}]，检查 ${mid}`);if(mid===target){found=true;break;}if(mid<target)low=mid+1;else high=mid-1;}
        visual.innerHTML=`<div class="field-index-track"><span>范围：1—${n}</span><strong>${found?'找到 '+target:'未找到 '+target}</strong><ol>${trace.map(t=>`<li>${t}</li>`).join('')}</ol></div>`;result.innerHTML=metric('顺序扫描比较',target<=n?target:n)+metric('二分查找比较',count);
      }else if(demo==='bezier'){
        const t=Number(val('t').value),ps=[[50,230],[160,Number(val('y1').value)],[480,Number(val('y2').value)],[590,230]];
        const mix=(a,b)=>a.map((x,i)=>x*(1-t)+b[i]*t),a=ps.slice(0,3).map((p,i)=>mix(p,ps[i+1])),b=[mix(a[0],a[1]),mix(a[1],a[2])],point=mix(b[0],b[1]);
        visual.innerHTML=svg(`<polyline points="${ps.map(p=>p.join(',')).join(' ')}" class="field-line"/><path d="M${ps[0]} C${ps[1]} ${ps[2]} ${ps[3]}" fill="none" stroke="var(--accent)" stroke-width="3"/><polyline points="${a.map(p=>p.join(',')).join(' ')}" class="field-line"/><path d="M${b[0]}L${b[1]}" class="field-line"/>${ps.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="var(--muted)"/>`).join('')}<circle cx="${point[0]}" cy="${point[1]}" r="8" fill="var(--accent)"/>`,'贝塞尔曲线与逐层插值');result.innerHTML=metric('当前 x',point[0].toFixed(2))+metric('当前 y',point[1].toFixed(2))+metric('参数 t',t.toFixed(2));
      }else if(demo==='fitts'){
        const d=Number(val('distance').value),w=Number(val('width').value);
        visual.innerHTML=svg(`<path d="M40 140H${40+d}" class="field-line"/><circle data-fitts-origin cx="40" cy="140" r="12" fill="var(--muted)" role="button" tabindex="0" aria-label="点击起点开始计时"/><circle class="field-click-target" data-fitts-target cx="${40+d}" cy="140" r="${w/2}" fill="var(--accent)" role="button" tabindex="0" aria-label="点击实验目标"/><text x="40" y="225">起点</text><text x="${40+d}" y="225" text-anchor="middle">目标</text>`,'点击距离与目标宽度示意');result.innerHTML=metric('困难度 ID',(Math.log2(d/w+1)).toFixed(3))+'<div><span>本次实际用时</span><strong data-fitts-time>点击起点，再点击目标</strong></div>';
      }else if(demo==='montecarlo'){
        visual.innerHTML=svg(`<rect x="200" y="20" width="240" height="240" fill="none" stroke="var(--line)"/><circle cx="320" cy="140" r="120" fill="none" stroke="var(--accent)"/>${samples.map(p=>`<circle cx="${320+p.x*120}" cy="${140+p.y*120}" r="1.5" fill="${p.inside?'var(--accent)':'var(--muted)'}" opacity=".55"/>`).join('')}`,'蒙特卡洛圆面积采样');result.innerHTML=metric('样本数',total)+metric('圆内样本',inside)+metric('π 估计',total?(4*inside/total).toFixed(5):'等待采样');
      }
    }
    on(host,'input',e=>{if(e.target.matches('[data-field-value]')){started=null;paint();}});
    on(host,'change',e=>{if(e.target.matches('[data-field-value]')){started=null;paint();}});
    const hit=()=>{if(started===null)return;host.querySelector('[data-fitts-time]').textContent=((performance.now()-started)/1000).toFixed(3)+' 秒';started=null;};
    on(host,'click',e=>{
      const event=e.target.closest('[data-state-event]');if(event){const action=event.dataset.stateEvent;if(action==='reset'){state='draft';logs=[];}else{const next=transitions[state][action];logs.push(next?`有效：${stateNames[state]} → ${stateNames[next]}`:`无效：${stateNames[state]}不接受该操作`);if(next)state=next;}paint();}
      if(e.target.closest('[data-fitts-start]')){started=null;host.querySelector('[data-fitts-time]').textContent='先点击图中起点，再点击目标';}
      if(e.target.closest('[data-fitts-origin]')){started=performance.now();host.querySelector('[data-fitts-time]').textContent='计时中，请点击目标';}
      if(e.target.closest('[data-fitts-target]'))hit();
      const sample=e.target.closest('[data-sample]');if(sample){if(sample.dataset.sample==='reset'){seed=42;total=inside=0;samples=[];}else{const n=Math.min(Number(sample.dataset.sample),10000-total);const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<n;i++){const x=rand()*2-1,y=rand()*2-1,hit=x*x+y*y<=1;total++;if(hit)inside++;samples.push({x,y,inside:hit});}samples=samples.slice(-1000);}paint();host.querySelectorAll('[data-sample]').forEach(b=>b.disabled=total>=10000&&b.dataset.sample!=='reset');}
    });
    on(host,'keydown',e=>{if(['Enter',' '].includes(e.key)){if(e.target.matches('[data-fitts-target]')){e.preventDefault();hit();}if(e.target.matches('[data-fitts-origin]')){e.preventDefault();started=performance.now();host.querySelector('[data-fitts-time]').textContent='计时中，请点击目标';}}});
    paint();
  }
  window.FieldLabs={markup,mount,unmount(){controller?.abort();controller=null;}};
})();
