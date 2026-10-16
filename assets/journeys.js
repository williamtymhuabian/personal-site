(() => {
  'use strict';
  const { journeys = [], profile, publicCertificates } = JSON.parse(document.querySelector('#site-data').textContent);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Public-domain Natural Earth 1:110m coastline, clipped to the displayed region.
  const coastline = "M246.96 518.73 L256.5 510.75 L277.64 505.82 L288.77 506.24 L293.1 512.95 L284.59 520.7 M501.51 430.26 L489.85 458.48 L481.56 472.92 L471.36 458.06 L469.15 445.01 L480.54 427.72 L496.03 414.4 L504.86 419.64 L501.51 430.26 M725.3 254.58 L702.39 262.87 L679.73 263.21 L699.36 276.16 L686.44 306.07 L673.93 313.48 L664.56 306.64 L669.31 290.78 L657.06 285.66 L649.2 273.59 L667.5 268.17 L677.65 257.1 L697.11 248.01 L711.31 235.97 M706.54 270.64 L717.25 260.14 L728.25 262.17 L736.21 254.78 M734.06 269.61 L724.13 273.7 L719.0 284.0 L706.38 278.99 L706.54 270.64 M729.1 106.12 L716.89 106.35 L704.74 97.79 L678.76 110.67 L675.74 116.53 L668.39 115.47 L659.99 121.43 L654.21 127.42 L654.94 140.06 L644.93 143.95 L641.49 147.06 L634.19 152.26 L621.3 155.15 L612.91 159.88 L612.3 167.5 L610.04 169.44 L617.74 172.3 L628.7 180.02 L645.41 200.79 L650.2 212.2 L650.35 232.47 L643.06 242.15 L625.53 245.53 L610.06 252.83 L592.63 254.34 L590.46 244.75 L594.05 231.55 L585.5 213.23 L599.87 210.27 L586.61 195.21 L577.21 191.86 L574.87 195.16 L569.2 196.62 L568.52 193.31 L563.5 191.7 L558.3 188.89 L563.6 181.15 L568.17 179.08 L566.44 175.87 L571.35 166.37 L570.09 163.5 L558.79 161.58 L549.66 156.86 L522.6 161.97 L508.35 170.2 L487.51 175.0 L497.79 166.85 L493.74 160.0 L509.07 148.17 L498.85 138.94 L481.97 145.16 L460.12 157.39 L448.2 168.76 L429.21 169.6 L419.34 177.82 L429.54 189.72 L445.38 192.61 L446.03 200.51 L461.34 205.65 L483.03 193.08 L500.22 199.93 L512.73 200.4 L515.87 209.62 L488.47 214.54 L479.43 224.04 L460.6 232.87 L450.67 245.19 L471.5 254.86 L479.1 272.17 L490.88 288.3 L504.03 301.82 L503.71 314.89 L491.57 319.7 L496.2 329.08 L507.59 334.55 L504.61 348.88 L499.7 362.83 L488.88 364.41 L474.75 383.46 L459.07 406.56 L441.1 427.57 L414.48 443.81 L387.56 458.62 L365.75 460.64 L353.92 468.46 L347.23 462.75 L336.28 471.5 L309.23 480.31 L288.75 483.01 L283.41 497.65 L282.14 501.6 L271.42 502.63 L266.34 489.86 L270.93 483.05 L244.96 477.41 L235.81 480.28 L209.97 495.34 L193.84 511.96 L189.59 524.18";
  let controller;
  const point = stop => [80 + (stop.longitude - 100) * 600 / 31, 50 + (46 - stop.latitude) * 440 / 25];
  // Leaders keep nearby cities independently selectable while dots retain their true coordinates.
  const labelOffsets = {xian:[-82,-24],wuhan:[-78,-20],nanchang:[-90,3],fuzhou:[-76,17],changchun:[18,-16],hangzhou:[40,10],huzhou:[40,-36],wenzhou:[32,18],qingdao:[20,-24],kunming:[-72,18],chongqing:[-78,-20],zhengzhou:[-80,-35],guangzhou:[20,16]};
  function mapMarkup() {
    const grid = [];
    for (let lon=100;lon<=130;lon+=5) { const [x]=point({longitude:lon,latitude:46});grid.push(`<path d="M${x} 50V490"/><text x="${x}" y="520">${lon}°E</text>`); }
    for (let lat=22;lat<=46;lat+=4) { const [,y]=point({longitude:100,latitude:lat});grid.push(`<path d="M80 ${y}H680"/><text x="45" y="${y+5}">${lat}°N</text>`); }
    return `<svg class="journey-map" viewBox="0 0 760 550" aria-label="历史参赛城市地图，可点击城市；坐标为城市中心示意" tabindex="0"><defs><clipPath id="journey-coast-clip"><rect x="80" y="50" width="600" height="440"/></clipPath></defs><g data-map-layer><path class="journey-coastline" d="${coastline}" clip-path="url(#journey-coast-clip)"/><g class="journey-grid">${grid.join('')}</g>${journeys.map(stop => {
      const [x,y]=point(stop), [dx,dy]=labelOffsets[stop.id] || [20,-16];
      const bx=x+dx, by=y+dy, endX=dx>0?bx:bx+62, endY=by+15;
      return `<g data-map-city="${esc(stop.id)}" class="journey-marker" role="button" tabindex="0" aria-label="查看${esc(stop.city)}的${stop.events.length}段经历" aria-pressed="false"><path class="journey-leader" d="M${x} ${y}L${endX} ${endY}"/><circle class="marker-target" cx="${x}" cy="${y}" r="11"/><circle class="marker-ring" cx="${x}" cy="${y}" r="7"/><circle class="marker-core" cx="${x}" cy="${y}" r="3"/><rect class="journey-marker-label" x="${bx}" y="${by}" width="62" height="30" rx="4"/><text x="${bx+31}" y="${by+21}" text-anchor="middle">${esc(stop.city)}</text></g>`;
    }).join('')}</g></svg>`;
  }
  function markup() {
    const total=journeys.reduce((n,s)=>n+s.events.length,0);
    return `<section class="page-header journey-page-header"><p class="eyebrow">COMPETITIONS / PLACES / MEMORIES</p><h1>从赛场，走向更大的世界。</h1><p>记下做过的题，也记下走过的城市、到访的学校和赛场里的瞬间。</p></section><div class="journey-overview"><span><strong>${journeys.length}</strong> 座城市</span><span><strong>${total}</strong> 段参赛经历</span><span class="journey-overview-note">不止奖牌，也收藏过程。</span></div><section class="journey-atlas" aria-label="竞赛足迹"><div class="journey-map-panel"><div class="journey-map-head"><span class="tiny-label">FIELD ATLAS / 城市坐标地图</span><span>N ↑</span></div><div class="journey-map-viewport">${mapMarkup()}</div><div class="journey-map-controls"><button type="button" data-map-zoom="in" aria-label="放大地图">＋</button><button type="button" data-map-zoom="out" aria-label="缩小地图">−</button><button type="button" data-map-reset>复位</button><span data-map-scale role="status">100%</span></div><p class="journey-map-note">点击城市查看经历 · 放大后拖动 · 城市中心示意，无实时定位 · <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a></p></div><aside class="journey-selector"><h2>选择一站</h2><div class="journey-city-list">${journeys.map((s,i)=>`<button data-journey-city="${esc(s.id)}" aria-pressed="false"><span class="journey-city-index">${String(i+1).padStart(2,'0')}</span><strong>${esc(s.city)}</strong><span>${s.events.length} 段经历 ↗</span></button>`).join('')}</div><label for="journey-kind">展示内容</label><select id="journey-kind"><option value="all">全部参赛经历</option><option value="award">获奖经历</option><option value="participation">参赛与现场记录</option></select><p>坐标只对应城市；地点依据竞赛材料与本人补充。相册将随整理逐步补充。</p></aside></section><section id="journey-detail" class="journey-detail" aria-label="当前城市的参赛经历" aria-live="polite"></section>`;
  }
  function eventMarkup(event) {
    const award=profile.awards.find(a=>a.id===event.awardId), proof=publicCertificates.find(p=>p.awardId===event.awardId);
    return `<article class="journey-event"><div class="journey-event-meta"><span>${esc(event.year || '年份待补充')}</span><span class="journey-event-kind">${event.kind==='award'?esc(award.prize):event.result==='no-award'?'参赛记录 · 无获奖':'参赛记录 · 成绩待补充'}</span></div><h3>${esc(event.title)}</h3>${event.school?`<p class="journey-school">到访学校 · ${esc(event.school)}</p>`:''}<p>${esc(event.summary)}</p>${event.photos.length?`<div class="journey-photos">${event.photos.map(photo=>`<figure><a href="./${esc(photo.image)}" target="_blank" rel="noopener noreferrer" aria-label="原尺寸查看：${esc(photo.alt)}"><img src="./${esc(photo.image)}" alt="${esc(photo.alt)}" loading="lazy"></a><figcaption>${esc(photo.caption)}</figcaption></figure>`).join('')}</div>`:`<div class="journey-photo-note"><span>FIELD NOTES / 待续</span><p>${event.kind==='participation'?'现场物料、赛场氛围与见闻，留待整理后分享。':'到访学校与城市的照片，将在整理后补充到这一站。'}</p></div>`}<div class="journey-event-links">${award?`<a class="text-link" href="#/awards?record=${esc(award.id)}">查看奖项记录 ↗</a>`:''}${proof?`<button class="text-link" data-public-proof="${esc(proof.awardId)}">查看证书与奖牌 ↗</button>`:''}</div></article>`;
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
