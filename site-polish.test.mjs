import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {create}=createRequire(import.meta.url)('./assets/site-polish.js');

function setup({reduced=false,observe=true}={}){
  const motion=new EventTarget();motion.matches=reduced;
  const pointer=new EventTarget();pointer.matches=true;
  const animations=[],jobs=new Map(),seen=[],unobserved=[];let callback,disconnected=0,id=0;
  const element={animate(frames,options){const animation={frames,options,cancelled:false,cancel(){this.cancelled=true;this.oncancel?.();}};animations.push(animation);return animation;}};
  const scope={querySelectorAll(selector){return selector==='.compute-feature'?[]:[element];}};
  const polish=create({motion,finePointer:pointer,canObserve:()=>observe,createObserver:fn=>{callback=fn;return {observe:e=>seen.push(e),unobserve:e=>unobserved.push(e),disconnect(){disconnected++;}};},requestFrame:fn=>{jobs.set(++id,fn);return id;},cancelFrame:id=>jobs.delete(id)});
  return {polish,scope,motion,element,animations,seen,unobserved,jobs,enter(){callback?.([{target:element,isIntersecting:true}]);},leave(){callback?.([{target:element,isIntersecting:false}]);},get disconnected(){return disconnected;}};
}
test('reduced-motion preference avoids observers and scripted movement',()=>{
  const s=setup({reduced:true});s.polish.mount(s.scope);assert.equal(s.seen.length,0);s.enter();assert.equal(s.animations.length,0);
});
test('each element animates only once on entry and retains its natural resting styles',()=>{
  const s=setup();s.polish.mount(s.scope);s.leave();assert.equal(s.animations.length,0);s.enter();s.enter();assert.equal(s.animations.length,1);assert.equal(s.unobserved.length,1);assert.equal(s.animations[0].options.fill,undefined);assert.equal(s.element.style,undefined);
});
test('switching to reduced motion cancels in-flight animation and releases observation',()=>{
  const s=setup();s.polish.mount(s.scope);s.enter();s.motion.matches=true;s.motion.dispatchEvent(new Event('change'));assert.equal(s.animations[0].cancelled,true);assert.equal(s.disconnected,1);
});
test('route replacement cancels old animation and ignores stale observer callbacks',()=>{
  const s=setup();s.polish.mount(s.scope);s.enter();s.polish.unmount();s.enter();assert.equal(s.animations.length,1);assert.equal(s.animations[0].cancelled,true);
});
test('without IntersectionObserver the existing page remains usable without animation',()=>{
  const s=setup({observe:false});s.polish.mount(s.scope);assert.equal(s.seen.length,0);assert.equal(s.animations.length,0);s.polish.unmount();
});
test('hero tilt ignores touch and coarse pointers, bounds movement, and cancels pending work',()=>{
  const motion=new EventTarget();motion.matches=false;
  const finePointer=new EventTarget();finePointer.matches=false;
  const hero=new EventTarget(),values=new Map(),jobs=new Map();let id=0;
  hero.getBoundingClientRect=()=>({left:0,top:0,width:200,height:200});
  hero.style={setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)};
  const scope={querySelectorAll:selector=>selector==='.compute-feature'?[hero]:[]};
  const polish=create({motion,finePointer,canObserve:()=>false,requestFrame:fn=>{jobs.set(++id,fn);return id;},cancelFrame:id=>jobs.delete(id)});
  const move=pointerType=>hero.dispatchEvent(Object.assign(new Event('pointermove'),{pointerType,clientX:900,clientY:900}));
  polish.mount(scope);move('mouse');assert.equal(jobs.size,0);finePointer.matches=true;move('touch');assert.equal(jobs.size,0);
  move('mouse');[...jobs.values()].forEach(fn=>fn());jobs.clear();assert.equal(values.get('--tilt-x'),'-2.00deg');assert.equal(values.get('--tilt-y'),'2.00deg');
  move('mouse');polish.unmount();assert.equal(jobs.size,0);assert.equal(values.size,0);
});
