(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.JourneyMapBase=factory();})(globalThis,()=>{
  'use strict';
  function mount({map,L,geometry,container,status,button,signal,setTimer=setTimeout,clearTimer=clearTimeout}){
    let tiles=null,timer=null,disposed=false,mode='local';
    const pane=map.createPane('journey-land');pane.style.zIndex='150';pane.style.pointerEvents='none';
    const land=L.geoJSON(geometry,{pane:'journey-land',interactive:false,style:{color:'#a8b8ae',weight:1,fillColor:'#f0f2e8',fillOpacity:1}}).addTo(map);
    const attribution='Made with <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>';
    map.attributionControl.addAttribution(attribution);
    const cancelTimer=()=>{if(timer!==null)clearTimer(timer);timer=null;};
    const removeTiles=()=>{if(tiles){const previous=tiles;tiles=null;if(map.hasLayer(previous))map.removeLayer(previous);previous.off();}};
    function local(message='正在使用本地简图，可切换道路底图查看街道细节。'){
      if(disposed)return;
      mode='local';cancelTimer();removeTiles();container.dataset.basemap='local';
      button.disabled=false;button.textContent='加载道路底图';button.setAttribute('aria-label','重新加载道路底图');
      status.hidden=false;status.textContent=message;
    }
    function online(){
      if(disposed)return;
      cancelTimer();removeTiles();mode='loading';container.dataset.basemap='loading';
      button.disabled=false;button.textContent='使用本地简图';button.setAttribute('aria-label','切换到本地简图');
      status.hidden=false;status.textContent='正在加载道路底图，本地简图已可查看。';
      let loaded=0;
      const current=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,keepBuffer:1,updateWhenIdle:true,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      });
      tiles=current;
      const active=()=>!disposed&&tiles===current;
      current.on('loading',()=>{
        if(!active())return;
        loaded=0;cancelTimer();mode='loading';container.dataset.basemap='loading';
        status.textContent='正在加载道路底图，本地简图已可查看。';
        timer=setTimer(()=>{if(active())local('道路底图加载较慢，已使用本地简图；城市选择和缩放仍可使用。');},8000);
      });
      current.on('tileload',()=>{if(active())loaded++;});
      current.on('tileerror',()=>{if(active())local('道路底图暂时无法连接，已使用本地简图；可稍后重新加载道路底图。');});
      current.on('load',()=>{
        if(!active())return;
        if(!loaded){local('道路底图未能加载，已使用本地简图。');return;}
        cancelTimer();mode='online';container.dataset.basemap='online';status.textContent='正在使用道路底图。';
      });
      timer=setTimer(()=>{if(active())local('道路底图加载较慢，已使用本地简图；城市选择和缩放仍可使用。');},8000);
      current.addTo(map);
    }
    function dispose(){
      if(disposed)return;
      disposed=true;cancelTimer();removeTiles();
      if(map.hasLayer(land))map.removeLayer(land);
      map.attributionControl.removeAttribution(attribution);
      button.removeEventListener('click',toggle);
      signal?.removeEventListener('abort',dispose);
    }
    function toggle(){if(mode==='local')online();else local();}
    button.addEventListener('click',toggle);
    signal?.addEventListener('abort',dispose,{once:true});
    if(signal?.aborted)dispose();else online();
    return {dispose};
  }
  return {mount};
});
