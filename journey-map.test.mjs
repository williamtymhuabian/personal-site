import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const {mount}=createRequire(import.meta.url)('./assets/journey-map.js');

function setup(){
  const layers=new Set(),pending=new Map(),created=[],attributes=new Set();let id=0,click;
  const map={createPane:()=>({style:{}}),hasLayer:layer=>layers.has(layer),removeLayer:layer=>layers.delete(layer),attributionControl:{addAttribution:value=>attributes.add(value),removeAttribution:value=>attributes.delete(value)}};
  const layer=()=>({handlers:{},on(name,fn){this.handlers[name]=fn;return this;},off(){this.handlers={};return this;},addTo(){layers.add(this);return this;},emit(name){this.handlers[name]?.();}});
  const land=layer(),L={geoJSON:()=>land,tileLayer:()=>{const tiles=layer();created.push(tiles);return tiles;}};
  const button={disabled:false,setAttribute(){},addEventListener(_,fn){click=fn;},removeEventListener(){click=null;}},container={dataset:{}},status={};
  const controller=new AbortController();
  const instance=mount({map,L,geometry:{},container,status,button,signal:controller.signal,setTimer:fn=>{pending.set(++id,fn);return id;},clearTimer:id=>pending.delete(id)});
  return {instance,controller,layers,land,created,container,status,button,pending,attributes,click:()=>click?.(),expire:()=>{const jobs=[...pending.values()];pending.clear();for(const fn of jobs)fn();}};
}

test('a tile error keeps a local map visible and stops the failed remote layer',()=>{
  const s=setup();assert(s.layers.has(s.land));assert.equal(s.container.dataset.basemap,'loading');
  s.created[0].emit('tileerror');
  assert.equal(s.container.dataset.basemap,'local');assert(s.layers.has(s.land));assert(!s.layers.has(s.created[0]));assert.equal(s.pending.size,0);assert.match(s.button.textContent,/加载道路底图/);
});
test('a connection that never settles falls back without waiting for an error event',()=>{
  const s=setup();s.expire();assert.equal(s.container.dataset.basemap,'local');assert.equal(s.layers.size,1);assert.match(s.status.textContent,/较慢/);
});
test('successful loading cancels the timeout; a later stalled viewport also falls back',()=>{
  const s=setup(),tiles=s.created[0];tiles.emit('loading');tiles.emit('tileload');tiles.emit('load');
  assert.equal(s.container.dataset.basemap,'online');assert.equal(s.pending.size,0);
  tiles.emit('loading');s.expire();assert.equal(s.container.dataset.basemap,'local');
});
test('manual retry can recover while a late callback from the old request is ignored',()=>{
  const s=setup(),old=s.created[0],late=old.handlers.load;old.emit('tileerror');s.click();
  assert.equal(s.created.length,2);late();assert.equal(s.container.dataset.basemap,'loading');
  const next=s.created[1];next.emit('tileload');next.emit('load');assert.equal(s.container.dataset.basemap,'online');assert(s.layers.has(s.land));
});
test('manual local mode stops requests and aborting navigation cleans timers and layers',()=>{
  const s=setup();s.click();assert.equal(s.container.dataset.basemap,'local');assert.equal(s.pending.size,0);
  s.click();assert.equal(s.pending.size,1);s.controller.abort();assert.equal(s.pending.size,0);assert.equal(s.layers.size,0);assert.equal(s.attributes.size,0);
  s.click();s.expire();assert.equal(s.created.length,2);
});
test('the packaged fallback contains usable closed polygon geometry with no remote dependency',async()=>{
  const context={window:{}};vm.runInNewContext(await readFile(new URL('./assets/journey-basemap.js',import.meta.url),'utf8'),context);
  const data=context.window.JourneyBasemap;assert.equal(data.type,'FeatureCollection');assert.equal(data.features.length,177);
  for(const feature of data.features){
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    for(const polygon of polygons)for(const ring of polygon){assert(ring.length>=4);assert.equal(JSON.stringify(ring[0]),JSON.stringify(ring.at(-1)));for(const [x,y]of ring){assert(Number.isFinite(x)&&x>=-180&&x<=180);assert(Number.isFinite(y)&&y>=-90&&y<=90);}}
  }
});
