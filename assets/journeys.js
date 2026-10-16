(() => {
  'use strict';
  const { journeys = [], profile, publicCertificates } = JSON.parse(document.querySelector('#site-data').textContent);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Public-domain Natural Earth 1:110m coastline, clipped to the displayed region.
  const coastline = "M458.67 482.11 L444.22 514.18 M421.28 513.7 L418.55 498.87 L432.67 479.23 L451.88 464.09 L462.83 470.05 L458.67 482.11 M736.17 282.48 L707.76 291.9 L679.67 292.28 L704.0 307.0 L687.99 340.99 L672.47 349.41 L660.86 341.64 L666.74 323.61 L651.55 317.79 L641.8 304.08 L664.49 297.92 L677.08 285.35 L701.22 275.01 L718.82 261.33 M712.91 300.73 L726.18 288.79 L739.83 291.11 L749.7 282.7 M747.03 299.56 L734.73 304.21 L728.36 315.91 L712.71 310.21 L712.91 300.73 M740.89 113.77 L725.75 114.03 L710.67 104.31 L678.46 118.94 L674.72 125.6 L665.6 124.4 L655.18 131.17 L648.02 137.98 L648.92 152.34 L636.51 156.76 L632.25 160.29 L623.2 166.2 L607.22 169.49 L596.8 174.86 L596.05 183.52 L593.25 185.73 L602.8 188.98 L616.39 197.76 L637.11 221.35 L643.05 234.32 L643.24 257.36 L634.19 268.35 L612.46 272.19 L593.28 280.49 L571.66 282.2 L568.97 271.31 L573.42 256.31 L562.82 235.49 L580.64 232.12 L564.19 215.01 L552.54 211.2 L549.64 214.96 L542.61 216.62 L541.76 212.86 L535.54 211.02 L529.09 207.83 L535.66 199.03 L541.33 196.68 L539.19 193.03 L545.28 182.24 L543.71 178.97 L529.7 176.79 L518.38 171.43 L484.82 177.24 L467.15 186.59 L441.31 192.05 L454.06 182.78 L449.04 174.99 L468.05 161.55 L455.37 151.07 L434.45 158.13 L407.35 172.04 L392.56 184.95 L369.03 185.91 L356.78 195.25 L369.43 208.77 L389.08 212.05 L389.88 221.03 L408.87 226.87 L435.76 212.59 L457.07 220.38 L472.59 220.91 L476.48 231.39 L442.5 236.97 L431.29 247.77 L407.95 257.8 L395.63 271.8 L421.46 282.79 L430.89 302.47 L445.5 320.79 L461.8 336.16 L461.41 351.01 L446.34 356.47 L452.08 367.14 L466.21 373.35 L462.52 389.64 L456.43 405.49 L443.02 407.29 L425.49 428.94 L406.05 455.18 L383.76 479.05 L350.76 497.51 L317.38 514.34 L290.33 516.64 L275.66 525.52 L267.36 519.03 L253.79 528.97";
  let controller;
  const point = stop => [80 + (stop.longitude - 106) * 24, 50 + (46 - stop.latitude) * 20];
  function mapMarkup() {
    const grid = [];
    for (let lon=106;lon<=130;lon+=4) { const x=80+(lon-106)*24;grid.push(`<path d="M${x} 50V490"/><text x="${x}" y="520">${lon}°E</text>`); }
    for (let lat=26;lat<=46;lat+=4) { const y=50+(46-lat)*20;grid.push(`<path d="M80 ${y}H680"/><text x="45" y="${y+5}">${lat}°N</text>`); }
    return `<svg class="journey-map" viewBox="0 0 760 550" aria-label="历史参赛城市地图，可点击城市；坐标为城市中心示意" tabindex="0"><defs><clipPath id="journey-coast-clip"><rect x="80" y="50" width="600" height="440"/></clipPath></defs><g data-map-layer><path class="journey-coastline" d="${coastline}" clip-path="url(#journey-coast-clip)"/><g class="journey-grid">${grid.join('')}</g>${journeys.map(stop => {
      const [x,y]=point(stop), left=stop.id==='wuhan';
      return `<g data-map-city="${esc(stop.id)}" class="journey-marker" role="button" tabindex="0" aria-label="查看${esc(stop.city)}的${stop.events.length}段经历" aria-pressed="false" transform="translate(${x} ${y})"><circle class="marker-target" r="22"/><circle class="marker-ring" r="12"/><circle class="marker-core" r="5"/><text x="${left?-20:20}" y="${left?-16:5}" text-anchor="${left?'end':'start'}">${esc(stop.city)}</text></g>`;
    }).join('')}</g></svg>`;
  }
  function markup() {
    const total=journeys.reduce((n,s)=>n+s.events.length,0);
    return `<section class="page-header journey-page-header"><p class="eyebrow">COMPETITIONS / PLACES / MEMORIES</p><h1>从赛场，走向更大的世界。</h1><p>记下做过的题，也记下走过的城市、到访的学校和赛场里的瞬间。</p></section><div class="journey-overview"><span><strong>${journeys.length}</strong> 座城市</span><span><strong>${total}</strong> 段参赛经历</span><span class="journey-overview-note">不止奖牌，也收藏过程。</span></div><section class="journey-atlas" aria-label="竞赛足迹"><div class="journey-map-panel"><div class="journey-map-head"><span class="tiny-label">FIELD ATLAS / 城市坐标地图</span><span>N ↑</span></div><div class="journey-map-viewport">${mapMarkup()}</div><div class="journey-map-controls"><button type="button" data-map-zoom="in" aria-label="放大地图">＋</button><button type="button" data-map-zoom="out" aria-label="缩小地图">−</button><button type="button" data-map-reset>复位</button><span data-map-scale role="status">100%</span></div><p class="journey-map-note">点击城市查看经历 · 放大后拖动 · 城市中心示意，无实时定位 · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a></p></div><aside class="journey-selector"><h2>选择一站</h2><div class="journey-city-list">${journeys.map((s,i)=>`<button data-journey-city="${esc(s.id)}" aria-pressed="false"><span class="journey-city-index">${String(i+1).padStart(2,'0')}</span><strong>${esc(s.city)}</strong><span>${s.events.length} 段经历 ↗</span></button>`).join('')}</div><label for="journey-kind">展示内容</label><select id="journey-kind"><option value="all">全部参赛经历</option><option value="award">获奖经历</option><option value="participation">参赛与现场记录</option></select><p>坐标只对应城市；学校名称依据现有竞赛材料。相册将随整理逐步补充。</p></aside></section><section id="journey-detail" class="journey-detail" aria-label="当前城市的参赛经历" aria-live="polite"></section>`;
  }
  function eventMarkup(event) {
    const award=profile.awards.find(a=>a.id===event.awardId), proof=publicCertificates.find(p=>p.awardId===event.awardId);
    return `<article class="journey-event"><div class="journey-event-meta"><span>${esc(event.year || '年份待补充')}</span><span class="journey-event-kind">${event.kind==='award'?esc(award.prize):'参赛记录 · 无获奖'}</span></div><h3>${esc(event.title)}</h3>${event.school?`<p class="journey-school">到访学校 · ${esc(event.school)}</p>`:''}<p>${esc(event.summary)}</p>${event.photos.length?`<div class="journey-photos">${event.photos.map(photo=>`<figure><a href="./${esc(photo.image)}" target="_blank" rel="noopener noreferrer" aria-label="原尺寸查看：${esc(photo.alt)}"><img src="./${esc(photo.image)}" alt="${esc(photo.alt)}" loading="lazy"></a><figcaption>${esc(photo.caption)}</figcaption></figure>`).join('')}</div>`:`<div class="journey-photo-note"><span>FIELD NOTES / 待续</span><p>${event.kind==='participation'?'现场物料、赛场氛围与见闻，留待整理后分享。':'到访学校与城市的照片，将在整理后补充到这一站。'}</p></div>`}<div class="journey-event-links">${award?`<a class="text-link" href="#/awards?record=${esc(award.id)}">查看奖项记录 ↗</a>`:''}${proof?`<button class="text-link" data-public-proof="${esc(proof.awardId)}">查看证书与奖牌 ↗</button>`:''}</div></article>`;
  }
  function mount(scope, query) {
    const atlas=scope.querySelector('.journey-atlas');if(!atlas)return;
    controller=new AbortController();const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal});
    let selected=journeys.find(s=>s.id===query.get('city')) || journeys[0], kind='all', zoom=1, tx=0, ty=0, drag=null;
    const svg=atlas.querySelector('svg'), layer=svg.querySelector('[data-map-layer]');
    const updateMap=()=>{
      const maxX=380*(zoom-1),maxY=275*(zoom-1);
      tx=Math.max(-maxX,Math.min(maxX,tx));ty=Math.max(-maxY,Math.min(maxY,ty));
      layer.setAttribute('transform',`translate(${380*(1-zoom)+tx} ${275*(1-zoom)+ty}) scale(${zoom})`);
      atlas.querySelector('[data-map-scale]').textContent=`${Math.round(zoom*100)}%`;
      atlas.querySelector('[data-map-zoom="in"]').disabled=zoom===3;
      atlas.querySelector('[data-map-zoom="out"]').disabled=zoom===1;
    };
    const update=()=>{
      for(const button of atlas.querySelectorAll('[data-journey-city],[data-map-city]')) {
        const city=button.dataset.journeyCity || button.dataset.mapCity, stop=journeys.find(s=>s.id===city);
        const matches=stop.events.some(e=>kind==='all'||e.kind===kind);
        button.setAttribute('aria-pressed',String(city===selected.id));
        button.classList.toggle('is-muted',!matches);
      }
      const events=selected.events.filter(e=>kind==='all'||e.kind===kind);
      scope.querySelector('#journey-detail').innerHTML=`<div class="section-heading"><h2>${esc(selected.city)} <small>${selected.events.length} 段经历</small></h2><span>到访 · 记录 · 再出发</span></div><div class="journey-events">${events.length?events.map(eventMarkup).join(''):'<p class="journey-empty">这一站没有符合当前筛选的记录。试试切换展示内容或选择另一座城市。</p>'}</div>`;
    };
    const select=id=>{
      selected=journeys.find(s=>s.id===id);update();
      history.replaceState(null,'',`#/journeys?city=${encodeURIComponent(id)}`);
    };
    on(atlas,'click',e=>{
      const city=e.target.closest('[data-journey-city],[data-map-city]');
      if(city)select(city.dataset.journeyCity||city.dataset.mapCity);
      const control=e.target.closest('[data-map-zoom]');
      if(control){zoom=Math.max(1,Math.min(3,zoom+(control.dataset.mapZoom==='in'?.5:-.5)));updateMap();}
      if(e.target.closest('[data-map-reset]')){zoom=1;tx=ty=0;updateMap();}
    });
    on(atlas,'keydown',e=>{const marker=e.target.closest('[data-map-city]');if(marker&&['Enter',' '].includes(e.key)){e.preventDefault();select(marker.dataset.mapCity);}});
    on(atlas.querySelector('#journey-kind'),'change',e=>{kind=e.target.value;if(!selected.events.some(event=>kind==='all'||event.kind===kind)){const match=journeys.find(stop=>stop.events.some(event=>kind==='all'||event.kind===kind));if(match){select(match.id);return;}}update();});
    on(svg,'pointerdown',e=>{if(zoom===1 || e.target.closest('[data-map-city]') || e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,tx,ty};svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');});
    on(svg,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const r=svg.getBoundingClientRect(),ratio=Math.min(r.width/760,r.height/550);tx=drag.tx+(e.clientX-drag.x)/ratio;ty=drag.ty+(e.clientY-drag.y)/ratio;updateMap();});
    const release=()=>{drag=null;svg.classList.remove('dragging');};
    on(svg,'pointerup',release);on(svg,'pointercancel',release);on(svg,'lostpointercapture',release);
    on(svg,'keydown',e=>{if(e.target!==svg || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) || zoom===1)return;e.preventDefault();tx+=e.key==='ArrowLeft'?30:e.key==='ArrowRight'?-30:0;ty+=e.key==='ArrowUp'?30:e.key==='ArrowDown'?-30:0;updateMap();});
    update();updateMap();
  }
  function awardLink(awardId) {
    const stop=journeys.find(s=>s.events.some(e=>e.awardId===awardId));
    return stop ? `<a href="#/journeys?city=${esc(stop.id)}">城市足迹 ↗</a>` : '';
  }
  window.Journeys={markup,mount,awardLink,unmount(){controller?.abort();controller=null;}};
})();
