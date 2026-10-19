(() => {
  'use strict';
  const { journeys = [], profile, publicCertificates } = JSON.parse(document.querySelector('#site-data').textContent);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let controller, streetMap;
  function mapMarkup() {
    return '<div id="journey-street-map" class="journey-map" role="region" aria-label="城市足迹地图，绿色标记为已到访城市，橙色为当前选择"></div>';
  }
  const isCompetition = event => event.kind !== 'travel';
  function markup(query = new URLSearchParams()) {
    const competitions=journeys.reduce((n,s)=>n+s.events.filter(isCompetition).length,0);
    const competitionCities=journeys.filter(s=>s.events.some(isCompetition)).length;
    const view=query.get('view')==='competition'?'competition':'travel';
    const video=profile.socials.find(s=>s.name==='视频号' && s.handle);
    return `<section class="page-header journey-page-header"><p class="eyebrow">TRAVEL / COMPETITIONS / MEMORIES</p><h1>走向赛场，也走向远方。</h1><p>比赛也是一次旅行。把到访的城市、学校与沿途风景，慢慢收进同一幅地图。</p></section><div class="journey-overview"><span><strong>${journeys.length}</strong> 座到访城市</span><span><strong>${competitions}</strong> 段参赛经历</span><span class="journey-overview-note">赛场与远方，都值得记录。</span></div><section class="journey-atlas" data-journey-view="${view}" aria-label="旅行与竞赛足迹"><div class="journey-mode-tabs" role="group" aria-label="选择足迹地图"><button type="button" data-journey-view="travel" aria-pressed="${view==='travel'}">旅行地图 <span>${journeys.length} 城</span></button><button type="button" data-journey-view="competition" aria-pressed="${view==='competition'}">竞赛地图 <span>${competitionCities} 城</span></button><p>比赛到访的城市，也在旅行足迹里。</p></div><div class="journey-map-panel"><div class="journey-map-head"><span class="tiny-label" data-map-heading>TRAVEL ATLAS / 旅行足迹</span><div class="journey-map-head-actions"><span>N ↑</span><button type="button" data-map-expand aria-haspopup="dialog">展开地图 ↗</button></div></div><div class="journey-map-viewport">${mapMarkup()}</div><div class="journey-map-controls"><button type="button" data-map-zoom="in" aria-label="放大地图">＋</button><button type="button" data-map-zoom="out" aria-label="缩小地图">−</button><button type="button" data-map-reset>复位</button><span data-map-scale role="status">地图加载中</span></div><div class="journey-basemap-controls"><label>地图来源<select data-map-source aria-label="选择地图底图"><option value="standard">标准道路地图</option><option value="backup">备用道路地图</option><option value="local">简图（无道路细节）</option></select></label><button type="button" data-map-basemap>重新加载地图</button><span>手机与电脑使用相同的道路底图</span></div><div class="journey-map-legend"><span><i></i> 已到访城市</span><span><i class="legend-selected"></i> 当前选中</span></div><p class="journey-map-status" data-map-status role="status" hidden></p><p class="journey-map-note">拖动或双指缩放查看，点选城市后放大到当地；“复位”返回全部足迹。可展开地图，横屏查看更宽视野。仅展示历史到访，不采集定位。</p></div><aside class="journey-selector"><h2>选择一站</h2><div class="journey-city-list">${journeys.map((stop,i)=>`<button data-journey-city="${esc(stop.id)}" aria-pressed="false"><span class="journey-city-index">${String(i+1).padStart(2,'0')}</span><strong>${esc(stop.city)}</strong><span>${stop.events.length} 条记录 ↗</span></button>`).join('')}</div><label for="journey-kind">展示内容</label><select id="journey-kind"><option value="all">全部记录</option><option value="award">获奖经历</option><option value="participation">参赛与现场记录</option><option value="travel">旅行补充记录</option></select><p>旅行地图收录全部到访城市，竞赛地图只展示参赛地点。相册将随整理逐步补充。</p></aside><dialog class="journey-map-dialog" aria-labelledby="journey-map-dialog-title"><header><h2 id="journey-map-dialog-title" data-map-dialog-title>足迹地图</h2><button type="button" data-map-close aria-label="收起地图">收起地图 ×</button></header><div data-map-dialog-body></div></dialog></section><section id="journey-detail" class="journey-detail" aria-label="当前城市的到访记录" aria-live="polite"></section>${video?`<section class="journey-video-note"><div><span class="tiny-label">MORE MOMENTS / 影像记录</span><h2>让旅途，也留下影像。</h2><p>视频号账号：<code>${esc(video.handle)}</code></p></div><button type="button" class="text-link" data-copy-social="视频号">复制视频号账号 ↗</button></section>`:''}`;
  }
  function eventMarkup(event) {
    const award=profile.awards.find(a=>a.id===event.awardId), proof=publicCertificates.find(p=>p.awardId===event.awardId);
    return `<article class="journey-event"><div class="journey-event-meta"><span>${esc(event.year || '年份待补充')}</span><span class="journey-event-kind">${event.kind==='travel'?'旅行记录':event.kind==='award'?esc(award.prize):event.result==='no-award'?'参赛记录 · 无获奖':'参赛记录 · 成绩待补充'}</span></div><h3>${esc(event.title)}</h3>${event.school?`<p class="journey-school">到访学校 · ${esc(event.school)}</p>`:''}<p>${esc(event.summary)}</p>${event.photos.length?`<div class="journey-photos">${event.photos.map(photo=>`<figure><a href="./${esc(photo.image)}" target="_blank" rel="noopener noreferrer" aria-label="原尺寸查看：${esc(photo.alt)}"><img src="./${esc(photo.image)}" alt="${esc(photo.alt)}" loading="lazy"></a><figcaption>${esc(photo.caption)}</figcaption></figure>`).join('')}</div>`:`<div class="journey-photo-note"><span>FIELD NOTES / 待续</span><p>${event.kind==='travel'?'风景、街巷与旅途见闻，将随照片一起补充。':event.kind==='participation'?'现场物料、赛场氛围与旅途见闻，留待整理后分享。':'赛场、到访学校与城市风景的照片，将在整理后补充到这一站。'}</p></div>`}<div class="journey-event-links">${award?`<a class="text-link" href="#/awards?record=${esc(award.id)}">查看奖项记录 ↗</a>`:''}${proof?`<button class="text-link" data-public-proof="${esc(proof.awardId)}">查看证书与奖牌 ↗</button>`:''}</div></article>`;
  }
  function mount(scope, query) {
    const atlas=scope.querySelector('.journey-atlas');if(!atlas)return;
    controller=new AbortController();const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal});
    let view=atlas.dataset.journeyView,kind='all';
    const visibleStop=stop=>view==='travel'||stop.events.some(isCompetition);
    const matchesEvent=event=>(view==='travel'||isCompetition(event))&&(kind==='all'||event.kind===kind);
    let selected=journeys.find(stop=>stop.id===query.get('city')&&visibleStop(stop))||journeys.find(visibleStop);
    const markers=new Map(),mapStatus=atlas.querySelector('[data-map-status]');
    const panel=atlas.querySelector('.journey-map-panel'),dialog=atlas.querySelector('.journey-map-dialog');
    let mapViewport=null,placeholder=null;
    const restorePanel=()=>{
      if(placeholder){placeholder.replaceWith(panel);placeholder=null;}
      document.documentElement.classList.remove('journey-map-open');mapViewport?.resize();
    };
    on(dialog,'close',restorePanel);
    const expandMap=()=>{
      if(dialog.open)return;
      placeholder=document.createComment('map-panel');panel.before(placeholder);
      dialog.querySelector('[data-map-dialog-body]').append(panel);
      document.documentElement.classList.add('journey-map-open');dialog.showModal();mapViewport?.resize();
    };
    controller.signal.addEventListener('abort',()=>{if(dialog.open)dialog.close();restorePanel();mapViewport?.dispose();},{once:true});
    const updateMap=()=>{
      atlas.querySelector('[data-map-scale]').textContent=streetMap?'缩放 '+streetMap.getZoom()+' 级':'底图不可用';
      atlas.querySelector('[data-map-zoom="in"]').disabled=!streetMap||streetMap.getZoom()>=streetMap.getMaxZoom();
      atlas.querySelector('[data-map-zoom="out"]').disabled=!streetMap||streetMap.getZoom()<=streetMap.getMinZoom();
    };
    const fitMap=()=>mapViewport?.fit();
    const update=()=>{
      atlas.dataset.journeyView=view;
      for(const button of atlas.querySelectorAll('button[data-journey-view]'))button.setAttribute('aria-pressed',String(button.dataset.journeyView===view));
      atlas.querySelector('[data-map-heading]').textContent=view==='travel'?'TRAVEL MAP / 旅行足迹':'COMPETITION MAP / 竞赛足迹';
      atlas.querySelector('[data-map-dialog-title]').textContent=view==='travel'?'旅行足迹地图':'竞赛足迹地图';
      atlas.querySelector('option[value="all"]').textContent=view==='travel'?'全部记录':'全部参赛经历';
      const travelOption=atlas.querySelector('option[value="travel"]');travelOption.hidden=view==='competition';travelOption.disabled=view==='competition';
      for(const stop of journeys){
        const marker=markers.get(stop.id);
        if(marker&&streetMap){
          if(visibleStop(stop)&&!streetMap.hasLayer(marker))marker.addTo(streetMap);
          if(!visibleStop(stop)&&streetMap.hasLayer(marker))streetMap.removeLayer(marker);
        }
      }
      for(const button of atlas.querySelectorAll('[data-journey-city],[data-map-city]')){
        const id=button.dataset.journeyCity||button.dataset.mapCity,stop=journeys.find(s=>s.id===id);
        button.toggleAttribute('hidden',!visibleStop(stop));
        button.setAttribute('aria-pressed',String(id===selected.id));
        button.classList.toggle('is-selected',id===selected.id);
        button.classList.toggle('is-muted',!stop.events.some(matchesEvent));
      }
      const events=selected.events.filter(matchesEvent);
      const note=view==='travel'?`<p class="journey-city-story">${selected.events.some(isCompetition)?'因比赛来到'+esc(selected.city)+'，赛场之外的城市风景与沿途见闻，也收录在这一站。':'把'+esc(selected.city)+'留在旅行地图里。照片、时间与旅途故事，将在整理后补充。'}</p>`:'';
      scope.querySelector('#journey-detail').innerHTML=`<div class="section-heading"><h2>${esc(selected.city)} <small>${events.length} 条记录</small></h2><span>${view==='travel'?'到访 · 风景 · 记忆':'参赛 · 探索 · 再出发'}</span></div>${note}<div class="journey-events">${events.length?events.map(eventMarkup).join(''):'<p class="journey-empty">这一站没有符合当前筛选的记录。试试切换展示内容或选择另一座城市。</p>'}</div><div class="journey-discussion">${window.Portfolio.actions('journey:'+selected.id)}</div>`;
    };
    const updateUrl=()=>history.replaceState(null,'',`#/journeys?view=${view}&city=${encodeURIComponent(selected.id)}`);
    const select=id=>{
      const stop=journeys.find(s=>s.id===id&&visibleStop(s));if(!stop)return;
      selected=stop;update();updateUrl();
      if(mapViewport){mapViewport.focus([stop.latitude,stop.longitude]);if(!dialog.open&&window.matchMedia('(max-width:800px)').matches)panel.scrollIntoView({block:'start',behavior:'auto'});}
      for(const [city,marker]of markers)if(city===id)marker.openTooltip();else marker.closeTooltip();
    };
    if(window.L){
      streetMap=L.map(atlas.querySelector('#journey-street-map'),{zoomControl:false,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,minZoom:3,maxZoom:16,zoomSnap:0.5});
      mapViewport=window.JourneyMapBase.viewport({map:streetMap,getPoints:()=>journeys.filter(visibleStop).map(stop=>[stop.latitude,stop.longitude])});
      window.JourneyMapBase.mount({map:streetMap,L,geometry:window.JourneyBasemap,container:atlas.querySelector('#journey-street-map'),status:mapStatus,button:atlas.querySelector('[data-map-basemap]'),source:atlas.querySelector('[data-map-source]'),signal:controller.signal});
      if(window.ResizeObserver){
        const observer=new ResizeObserver(()=>mapViewport?.resize());
        observer.observe(atlas.querySelector('#journey-street-map'));
        controller.signal.addEventListener('abort',()=>observer.disconnect(),{once:true});
      }
      for(const stop of journeys){
        const marker=L.marker([stop.latitude,stop.longitude],{
          icon:L.divIcon({className:'journey-city-marker',html:'<span class="journey-visited-dot"></span>',iconSize:[22,22],iconAnchor:[11,11]}),
          title:stop.city,keyboard:true,riseOnHover:true
        }).bindTooltip(esc(stop.city),{direction:'top',offset:[0,-8],className:'journey-city-tooltip'});
        marker.on('add',()=>{const el=marker.getElement();el.dataset.mapCity=stop.id;el.setAttribute('aria-label','查看'+stop.city+'的'+stop.events.length+'条记录');});
        marker.on('click',()=>select(stop.id));markers.set(stop.id,marker);
      }
      streetMap.on('zoomend',updateMap);fitMap();
    }else{mapStatus.hidden=false;mapStatus.textContent='底图未能加载，仍可从城市列表查看记录。';atlas.querySelector('[data-map-basemap]').disabled=true;}
    on(atlas,'click',e=>{
      if(e.target.closest('[data-map-expand]')){expandMap();return;}
      if(e.target.closest('[data-map-close]')){dialog.close();return;}
      const mode=e.target.closest('button[data-journey-view]');
      if(mode){view=mode.dataset.journeyView;kind='all';atlas.querySelector('#journey-kind').value='all';if(!visibleStop(selected))selected=journeys.find(visibleStop);update();updateUrl();fitMap();return;}
      const city=e.target.closest('[data-journey-city]');if(city)select(city.dataset.journeyCity);
      const control=e.target.closest('[data-map-zoom]');if(control&&streetMap)control.dataset.mapZoom==='in'?streetMap.zoomIn():streetMap.zoomOut();
      if(e.target.closest('[data-map-reset]'))fitMap();
    });
    on(atlas,'keydown',e=>{const marker=e.target.closest('[data-map-city]');if(marker&&e.key===' '){e.preventDefault();select(marker.dataset.mapCity);}});
    on(atlas.querySelector('#journey-kind'),'change',e=>{kind=e.target.value;if(!selected.events.some(matchesEvent)){const match=journeys.find(stop=>visibleStop(stop)&&stop.events.some(matchesEvent));if(match){select(match.id);return;}}update();});
    update();updateMap();
  }
  function awardLink(awardId) {
    const stop=journeys.find(s=>s.events.some(e=>e.awardId===awardId));
    return stop ? `<a href="#/journeys?view=competition&city=${esc(stop.id)}">城市足迹 ↗</a>` : '';
  }
  window.Journeys={markup,mount,awardLink,unmount(){controller?.abort();controller=null;streetMap?.remove();streetMap=null;}};
})();
