(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.JourneyMapBase=factory();})(globalThis,()=>{
  'use strict';
  const providers=[
    {id:'standard',name:'标准道路地图',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png'},
    {id:'backup',name:'备用道路地图',url:'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'}
  ];
  function viewport({map,getPoints,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame}){
    let overview=true,frame=null,disposed=false;
    const moved=()=>{overview=false;};
    map.on('dragstart',moved);map.on('zoomstart',moved);
    function fit(){
      if(disposed)return;
      map.stop();map.fitBounds(getPoints(),{padding:[18,24],maxZoom:6,animate:false});overview=true;
    }
    function focus(point){
      if(disposed)return;
      overview=false;map.stop();map.setView(point,Math.min(map.getMaxZoom(),Math.max(map.getZoom(),9)),{animate:false});
    }
    function resize(){
      if(disposed||frame!==null)return;
      frame=requestFrame(()=>{frame=null;if(disposed)return;map.invalidateSize({animate:false,debounceMoveend:true});if(overview)fit();});
    }
    function dispose(){disposed=true;if(frame!==null)cancelFrame(frame);frame=null;map.off('dragstart',moved);map.off('zoomstart',moved);}
    return {fit,focus,resize,dispose};
  }
  // Retry only the failed tile; successful road tiles stay intact.
  function loadTile({tile,urls,done,createImage=()=>document.createElement('img'),setTimer=setTimeout,clearTimer=clearTimeout,onBackup=()=>{}}){
    let image=null,timer=null,index=0,closed=false,generation=0;
    const release=()=>{if(timer!==null)clearTimer(timer);timer=null;if(image){image.onload=null;image.onerror=null;image.removeAttribute('src');image=null;}};
    function attempt(){
      if(closed)return;
      release();
      if(index>=urls.length){closed=true;done(new Error('Road map tile unavailable'),tile);return;}
      const current=++generation,url=urls[index++];
      image=createImage();const candidate=image;candidate.alt='';candidate.setAttribute('role','presentation');candidate.decoding='async';
      const active=()=>!closed&&generation===current;
      candidate.onload=()=>{
        if(!active())return;
        closed=true;if(timer!==null)clearTimer(timer);timer=null;candidate.onload=null;candidate.onerror=null;
        tile.appendChild(candidate);done(null,tile);
      };
      const failed=()=>{if(!active())return;release();if(index<urls.length)onBackup();attempt();};
      candidate.onerror=failed;timer=setTimer(failed,10000);candidate.src=url;
    }
    attempt();
    return ()=>{if(closed)return;closed=true;generation++;release();};
  }
  function mount({map,L,geometry,container,status,button,source,signal,setTimer=setTimeout,clearTimer=clearTimeout,createElement=tag=>document.createElement(tag)}){
    let tiles=null,disposed=false,localMode=false;const pending=new Map();
    const pane=map.createPane('journey-land');pane.style.zIndex='150';pane.style.pointerEvents='none';
    const land=L.geoJSON(geometry,{pane:'journey-land',interactive:false,style:{color:'#a8b8ae',weight:1,fillColor:'#f0f2e8',fillOpacity:1}}).addTo(map);
    const attribution='Made with <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>';
    map.attributionControl.addAttribution(attribution);
    function stopTiles(){
      for(const cancel of pending.values())cancel();pending.clear();
      if(tiles){const previous=tiles;tiles=null;if(map.hasLayer(previous))map.removeLayer(previous);previous.off();}
    }
    function showLocal(){
      if(disposed)return;
      localMode=true;stopTiles();container.dataset.basemap='local';
      button.textContent='恢复道路地图';status.hidden=false;status.textContent='手动选择了简图；它只显示地理轮廓，不含道路细节。';
    }
    function online(){
      if(disposed)return;
      stopTiles();localMode=false;container.dataset.basemap='loading';button.textContent='重新加载地图';
      const preferred=providers.find(p=>p.id===source.value)||providers[0],other=providers.find(p=>p!==preferred);
      let loaded=0,failed=0,usedBackup=false;
      status.hidden=false;status.textContent='正在加载'+preferred.name+'，失败图块会自动尝试备用道路服务。';
      const current=L.tileLayer(preferred.url,{
        maxZoom:19,keepBuffer:0,updateWhenIdle:true,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.fr/" target="_blank" rel="noopener noreferrer">OSM France</a> / <a href="https://www.hotosm.org/" target="_blank" rel="noopener noreferrer">HOT</a>'
      });
      tiles=current;const active=()=>!disposed&&tiles===current;
      current.createTile=function(coords,done){
        const tile=createElement('div');tile.setAttribute('role','presentation');
        const url=provider=>L.Util.template(provider.url,coords);
        const cancel=loadTile({tile,urls:[url(preferred),url(other),url(preferred)],setTimer,clearTimer,createImage:()=>createElement('img'),
          onBackup:()=>{if(active()){usedBackup=true;status.textContent='部分图块正在切换备用道路服务，已显示的地图会保留。';}},
          done:(error,node)=>{pending.delete(tile);if(active())done(error,node);}
        });
        pending.set(tile,cancel);return tile;
      };
      current.on('tileunload',event=>{pending.get(event.tile)?.();pending.delete(event.tile);});
      current.on('loading',()=>{if(active()){loaded=0;failed=0;container.dataset.basemap='loading';}});
      current.on('tileload',()=>{if(active()){loaded++;container.dataset.basemap='online';}});
      current.on('tileerror',()=>{if(active()){failed++;status.textContent='个别区域仍未连接，正在保留已加载的道路地图。';}});
      current.on('load',()=>{
        if(!active())return;
        container.dataset.basemap=failed?(loaded?'partial':'unavailable'):'online';
        status.textContent=failed?'部分道路图块暂时无法连接，可重新加载或切换道路来源。':usedBackup?'道路地图已加载，故障图块由备用道路服务补充。':'正在使用'+preferred.name+'。';
      });
      current.addTo(map);
    }
    function selectSource(){if(source.value==='local')showLocal();else online();}
    function retry(){if(localMode)source.value='standard';online();}
    function dispose(){
      if(disposed)return;disposed=true;stopTiles();if(map.hasLayer(land))map.removeLayer(land);
      map.attributionControl.removeAttribution(attribution);button.removeEventListener('click',retry);source.removeEventListener('change',selectSource);signal?.removeEventListener('abort',dispose);
    }
    button.addEventListener('click',retry);source.addEventListener('change',selectSource);signal?.addEventListener('abort',dispose,{once:true});
    if(signal?.aborted)dispose();else online();
    return {dispose};
  }
  return {mount,loadTile,viewport};
});
