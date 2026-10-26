(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SitePolish=api.create({motion:matchMedia('(prefers-reduced-motion: reduce)'),finePointer:matchMedia('(hover: hover) and (pointer: fine)')});
})(globalThis,()=>{
  'use strict';
  const targets='.hero-copy,.page-header,.article-header,.post-card,.project-entry,.paper-card,.book-entry,.research-entry,.friend-card,.favorite-card,.award-mini,.journey-event,.kaiwu-record';
  const easing='cubic-bezier(0.22,1,0.36,1)';
  function create({motion,finePointer,createObserver=callback=>new IntersectionObserver(callback,{threshold:0.08}),canObserve=()=>typeof IntersectionObserver==='function',requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame}){
    let controller=null,observer=null,frame=null;
    const animations=new Set(),tilted=new Set();
    function stopMotion(){
      observer?.disconnect();observer=null;
      for(const animation of animations)animation.cancel();animations.clear();
      if(frame!==null)cancelFrame(frame);frame=null;
      for(const element of tilted){element.style.removeProperty('--tilt-x');element.style.removeProperty('--tilt-y');}tilted.clear();
    }
    function unmount(){controller?.abort();controller=null;stopMotion();}
    function mount(scope){
      unmount();controller=new AbortController();
      const {signal}=controller;
      const changed=()=>{if(motion.matches||!finePointer.matches)stopMotion();};
      motion.addEventListener('change',changed,{signal});finePointer.addEventListener('change',changed,{signal});
      if(motion.matches)return;
      // Elements retain their normal visible styles. Only animate after entry;
      // unsupported APIs or a stalled observer can never hide content.
      if(canObserve()){
        const seen=new WeakSet();
        observer=createObserver(entries=>{
          if(signal.aborted||motion.matches)return;
          let order=0;
          for(const {target,isIntersecting} of entries){
            if(!isIntersecting||seen.has(target))continue;
            seen.add(target);observer?.unobserve(target);
            if(typeof target.animate!=='function')continue;
            try{
              const animation=target.animate([{opacity:0.55,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:Math.min(order++*60,180),easing});
              animations.add(animation);const finish=()=>animations.delete(animation);
              animation.onfinish=finish;animation.oncancel=finish;
            }catch{/* Keep the already visible element when animation is unavailable. */}
          }
        });
        for(const element of [...scope.querySelectorAll(targets)].slice(0,48))observer.observe(element);
      }
      // Pointer response belongs only to the existing decorative hero card.
      // No document-wide pointer/scroll loop and no touch-device tilt.
      for(const element of scope.querySelectorAll('.compute-feature')){
        element.addEventListener('pointermove',event=>{
          if(motion.matches||!finePointer.matches||event.pointerType==='touch')return;
          const bounds=element.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
          const x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
          const y=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1));
          if(frame!==null)cancelFrame(frame);
          frame=requestFrame(()=>{frame=null;if(signal.aborted||motion.matches||!finePointer.matches)return;
            element.style.setProperty('--tilt-x',(-y*2).toFixed(2)+'deg');element.style.setProperty('--tilt-y',(x*2).toFixed(2)+'deg');tilted.add(element);
          });
        },{signal,passive:true});
        element.addEventListener('pointerleave',()=>{if(frame!==null)cancelFrame(frame);frame=null;element.style.removeProperty('--tilt-x');element.style.removeProperty('--tilt-y');tilted.delete(element);},{signal});
      }
    }
    return {mount,unmount};
  }
  return {create};
});
