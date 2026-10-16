(() => {
  'use strict';
  const data=JSON.parse(document.querySelector('#site-data').textContent),cfg=data.community;
  // giscus returns from GitHub to the URL without its hash. Restore the topic
  // before the hash router starts; the official client consumes the session.
  if(new URL(location.href).searchParams.has('giscus')){
    let key='general';try{const saved=sessionStorage.getItem('william-community-topic');if(window.TopicModel.entries(data).some(e=>e.key===saved))key=saved;}catch{}
    const url=new URL(location.href);url.hash='/community?topic='+encodeURIComponent(key);history.replaceState(history.state,'',url);
  }
  let controller=null,observer=null,timers=new Set();
  function mount(root){
    const host=root.querySelector('#discussion-host');if(!host)return;
    controller=new AbortController();const current=controller,signal=current.signal;
    const $=s=>root.querySelector(s),on=(el,event,fn)=>el.addEventListener(event,fn,{signal});
    const entry=window.TopicModel.entries(data).find(e=>e.key===host.dataset.topic),hash=data.communityHashes[entry.key];
    try{sessionStorage.setItem('william-community-topic',entry.key);}catch{}
    const backlink=document.createElement('meta');backlink.name='giscus:backlink';backlink.content=data.profile.siteUrl.replace(/\/?$/,'/')+entry.href;document.head.append(backlink);
    signal.addEventListener('abort',()=>backlink.remove(),{once:true});
    const message=$('#community-message'),details=$('#discussion-fallback'),state=$('#community-connection'),retry=$('[data-community-retry]');
    let pending=false;
    function setState(text){if(!signal.aborted)state.textContent=text;}
    function updateLinks(){
      const links=window.TopicModel.links({profile:data.profile,community:cfg,entry,hash,message:message.value});
      $('#community-publish').href=links.create;$('#community-email').href=links.email;
      $('#community-publish').setAttribute('aria-disabled',String(!message.value.trim()));
      $('#community-count').textContent=`${message.value.length} / 600`;
      return links;
    }
    function fallback(text){if(signal.aborted)return;observer?.disconnect();for(const id of timers)clearTimeout(id);timers.clear();host.hidden=true;host.replaceChildren();details.open=true;setState(text);retry.disabled=false;pending=false;}
    const schedule=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
    const cancel=id=>{clearTimeout(id);timers.delete(id);};
    async function connect(){
      if(pending||signal.aborted)return;pending=true;retry.disabled=true;
      if(!cfg.enabled){fallback('当前通过 GitHub 讨论区交流。站内留言开通后，将显示在这里。');return;}
      setState('正在连接留言服务…');
      const request=new AbortController();const abort=()=>request.abort();signal.addEventListener('abort',abort,{once:true});const timeout=schedule(abort,10000);
      try{
        const response=await fetch('https://giscus.app/api/discussions/categories?repo='+encodeURIComponent(cfg.repo),{signal:request.signal,credentials:'omit'});
        const result=await response.json();if(signal.aborted)return;
        if(!response.ok){fallback(typeof result.error==='string'&&result.error.includes('not installed')?'站内留言尚未开通。你现在可以通过下方 GitHub 入口留言和点赞。':'留言服务暂时不可用，可通过下方 GitHub 入口继续交流。');return;}
        const category=result.categories?.find(c=>c.id===cfg.categoryId)||result.categories?.find(c=>c.name===cfg.category);
        if(result.repositoryId!==cfg.repoId||!category||!/^DIC_[\w-]+$/.test(category.id)){fallback('留言分类暂时无法确认，可先通过 GitHub 入口交流。');return;}
        host.hidden=false;host.replaceChildren();
        const script=document.createElement('script');script.src='https://giscus.app/client.js';script.async=true;script.crossOrigin='anonymous';
        const attrs={repo:cfg.repo,'repo-id':result.repositoryId,category:category.name,'category-id':category.id,mapping:'specific',term:window.TopicModel.term(entry.key),strict:'1','reactions-enabled':'1','emit-metadata':'1','input-position':'top',theme:document.documentElement.dataset.theme==='dark'?'dark_dimmed':'light',lang:'zh-CN',loading:'eager'};
        for(const [key,value]of Object.entries(attrs))script.setAttribute('data-'+key,value);
        let loadTimer=schedule(()=>fallback('连接留言区超时。你可以重新连接，或到 GitHub 继续交流。'),18000);
        function ready(){if(signal.aborted)return;cancel(loadTimer);setState('留言区已加载。使用 GitHub 登录后可公开留言或点赞。');retry.disabled=false;pending=false;if(!message.value.trim()&&!details.contains(document.activeElement))details.open=false;}
        observer?.disconnect();observer=new MutationObserver(()=>{const iframe=host.querySelector('iframe');if(iframe&&!iframe.dataset.communityObserved){iframe.dataset.communityObserved='true';iframe.title='当前话题的 GitHub 留言与点赞';const url=new URL(location.href);url.hash='/community?topic='+encodeURIComponent(entry.key);history.replaceState(history.state,'',url);on(iframe,'load',()=>{if(host.contains(iframe))ready();});}});observer.observe(host,{childList:true});
        on(script,'error',()=>{cancel(loadTimer);fallback('留言组件未能加载，可重新连接或到 GitHub 交流。');});
        host.append(script);
      }catch{if(!signal.aborted)fallback('网络暂时无法连接留言服务，可先通过 GitHub 入口交流。');}
      finally{cancel(timeout);signal.removeEventListener('abort',abort);}
    }
    on(message,'input',updateLinks);
    on($('#community-publish'),'click',event=>{if(!message.value.trim()){event.preventDefault();setState('先写下想交流的内容，再到 GitHub 确认发布。');message.focus();}});
    on($('#community-copy'),'click',async()=>{if(!message.value.trim()){message.focus();setState('先写下想交流的内容。');return;}const text=message.value.trim()+'\n\n'+updateLinks().backlink;try{await navigator.clipboard.writeText(text);setState('已复制留言和页面链接。');}catch{message.focus();message.select();setState('请复制选中的留言文字。');}});
    on(retry,'click',connect);
    on($('#community-topic'),'change',event=>{location.hash='/community?topic='+encodeURIComponent(event.target.value);});
    on(window,'message',event=>{
      const iframe=host.querySelector('iframe');if(event.origin!=='https://giscus.app'||event.source!==iframe?.contentWindow||!event.data||typeof event.data!=='object'||!event.data.giscus)return;
      const payload=event.data.giscus;
      if(payload.error){if(typeof payload.error==='string'&&payload.error.toLowerCase().includes('discussion not found')){setState('这个话题尚无留言，登录后可发起交流。');return;}fallback('留言服务返回连接问题。可重新连接，或在 GitHub 中查看与回复。');return;}
      const url=payload.discussion?.url;
      if(typeof url==='string')try{const parsed=new URL(url);if(parsed.origin==='https://github.com'&&new RegExp('^/'+cfg.repo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/discussions/\\d+$').test(parsed.pathname)){$('#community-thread').href=parsed.href;$('#community-thread').textContent='查看与回复已有留言 ↗';}}catch{}
    });
    updateLinks();connect();
  }
  function unmount(){controller?.abort();controller=null;observer?.disconnect();observer=null;for(const id of timers)clearTimeout(id);timers.clear();}
  window.CommunityClient={mount,unmount};
})();
