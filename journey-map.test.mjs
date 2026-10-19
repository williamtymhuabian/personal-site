import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const {mount,loadTile,viewport}=createRequire(import.meta.url)('./assets/journey-map.js');
function node(){return {children:[],setAttribute(){},removeAttribute(name){delete this[name];},appendChild(child){this.children.push(child);}};}
function loader(){
  const images=[],pending=new Map(),results=[];let id=0;
  const tile=node(),cancel=loadTile({tile,urls:['primary','backup','primary'],createImage:()=>{const image=node();images.push(image);return image;},done:(error,value)=>results.push({error,value}),setTimer:fn=>{pending.set(++id,fn);return id;},clearTimer:id=>pending.delete(id)});
  return {images,pending,results,tile,cancel,expire(){const jobs=[...pending.values()];pending.clear();for(const fn of jobs)fn();}};
}
test('a failed primary tile gets a full road tile from the backup source',()=>{
  const s=loader(),late=s.images[0].onload;s.images[0].onerror();assert.equal(s.images[1].src,'backup');
  late();assert.equal(s.results.length,0);s.images[1].onload();assert.equal(s.results.length,1);assert.equal(s.results[0].error,null);assert.equal(s.tile.children[0],s.images[1]);assert.equal(s.pending.size,0);
});
test('stalled tiles try both road sources and one bounded retry before reporting failure',()=>{
  const s=loader();s.expire();assert.equal(s.images[1].src,'backup');s.expire();assert.equal(s.images[2].src,'primary');s.expire();assert.equal(s.results.length,1);assert(s.results[0].error);assert.equal(s.pending.size,0);
});
test('unloading a pending tile cancels its retry and ignores late success',()=>{
  const s=loader(),late=s.images[0].onload;s.cancel();s.expire();late();assert.equal(s.results.length,0);assert.equal(s.images.length,1);assert.equal(s.pending.size,0);
});
function setup(){
  const layers=new Set(),pending=new Map(),created=[],attributes=new Set(),images=[];let id=0,click,change;
  const map={createPane:()=>({style:{}}),hasLayer:layer=>layers.has(layer),removeLayer:layer=>layers.delete(layer),attributionControl:{addAttribution:value=>attributes.add(value),removeAttribution:value=>attributes.delete(value)}};
  const layer=()=>({handlers:{},on(name,fn){this.handlers[name]=fn;return this;},off(){this.handlers={};return this;},addTo(){layers.add(this);return this;},emit(name,event){this.handlers[name]?.(event);}});
  const land=layer(),L={geoJSON:()=>land,tileLayer:url=>{const tiles=layer();tiles.url=url;created.push(tiles);return tiles;},Util:{template:(url,coords)=>url.replace(/\{(\w+)\}/g,(_,key)=>coords[key])}};
  const button={setAttribute(){},addEventListener(_,fn){click=fn;},removeEventListener(){click=null;}},source={value:'standard',addEventListener(_,fn){change=fn;},removeEventListener(){change=null;}},container={dataset:{}},status={};
  const controller=new AbortController();
  mount({map,L,geometry:{},container,status,button,source,signal:controller.signal,createElement:tag=>{const el=node();if(tag==='img')images.push(el);return el;},setTimer:fn=>{pending.set(++id,fn);return id;},clearTimer:id=>pending.delete(id)});
  return {controller,layers,land,created,container,status,button,source,pending,attributes,images,click:()=>click?.(),choose(value){source.value=value;change?.();}};
}
test('one failed tile does not discard the road layer or select the simplified map',()=>{
  const s=setup(),tiles=s.created[0];tiles.emit('tileload');tiles.emit('tileerror');tiles.emit('load');
  assert.equal(s.container.dataset.basemap,'partial');assert(s.layers.has(tiles));assert.equal(s.source.value,'standard');assert.match(s.status.textContent,/切换道路来源/);
});
test('total road failure is reported honestly without claiming a successful local substitution',()=>{
  const s=setup(),tiles=s.created[0];tiles.emit('tileerror');tiles.emit('load');assert.equal(s.container.dataset.basemap,'unavailable');assert(s.layers.has(tiles));assert.equal(s.source.value,'standard');
});
test('only explicit selection switches to the overview, and retry restores a road source',()=>{
  const s=setup();s.choose('backup');assert.match(s.created[1].url,/openstreetmap\.fr/);s.choose('local');assert.equal(s.container.dataset.basemap,'local');assert.equal(s.layers.size,1);s.click();assert.equal(s.source.value,'standard');assert.equal(s.created.length,3);
});
test('navigation cancels active images, retries, handlers and layers',()=>{
  const s=setup();s.created[0].createTile({x:1,y:2,z:3},()=>{});assert.equal(s.pending.size,1);const late=s.images[0].onload;s.controller.abort();late();assert.equal(s.pending.size,0);assert.equal(s.layers.size,0);assert.equal(s.attributes.size,0);s.click();assert.equal(s.created.length,1);
});

test('the packaged fallback contains usable closed polygon geometry with no remote dependency',async()=>{
  const context={window:{}};vm.runInNewContext(await readFile(new URL('./assets/journey-basemap.js',import.meta.url),'utf8'),context);
  const data=context.window.JourneyBasemap;assert.equal(data.type,'FeatureCollection');assert.equal(data.features.length,177);
  for(const feature of data.features){
    const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
    for(const polygon of polygons)for(const ring of polygon){assert(ring.length>=4);assert.equal(JSON.stringify(ring[0]),JSON.stringify(ring.at(-1)));for(const [x,y]of ring){assert(Number.isFinite(x)&&x>=-180&&x<=180);assert(Number.isFinite(y)&&y>=-90&&y<=90);}}
  }
});

function viewportSetup(){
  const events={},calls=[],jobs=new Map();let id=0,points=[[30,110],[40,120]],zoom=4;
  const map={on:(name,fn)=>{events[name]=fn;},off:name=>{delete events[name];},stop(){},
    fitBounds(value,options){calls.push(['fit',value,options]);events.zoomstart?.();},
    setView(point,value){zoom=value;calls.push(['focus',point,value]);events.zoomstart?.();},
    getZoom:()=>zoom,getMaxZoom:()=>16,invalidateSize:options=>calls.push(['resize',options])};
  const view=viewport({map,getPoints:()=>points,requestFrame:fn=>{jobs.set(++id,fn);return id;},cancelFrame:id=>jobs.delete(id)});
  return {view,events,calls,jobs,setPoints(value){points=value;},flush(){const pending=[...jobs.values()];jobs.clear();pending.forEach(fn=>fn());}};
}
test('resizing an overview reframes all current cities and batches observer notifications',()=>{
  const s=viewportSetup();s.view.fit();s.calls.length=0;s.setPoints([[25,102],[44,126]]);
  s.view.resize();s.view.resize();assert.equal(s.jobs.size,1);s.flush();
  assert.deepEqual(s.calls.map(c=>c[0]),['resize','fit']);assert.deepEqual(s.calls[1][1],[[25,102],[44,126]]);
});
test('city focus or manual exploration survives expansion, rotation and shrinking',()=>{
  const s=viewportSetup();s.view.fit();s.view.focus([31,118]);assert.equal(s.calls.at(-1)[2],9);
  s.calls.length=0;s.view.resize();s.flush();assert.deepEqual(s.calls.map(c=>c[0]),['resize']);
  s.view.fit();s.events.dragstart();s.calls.length=0;s.view.resize();s.flush();assert.deepEqual(s.calls.map(c=>c[0]),['resize']);
});
test('leaving the map cancels a queued resize and detaches movement listeners',()=>{
  const s=viewportSetup();s.view.resize();s.view.dispose();s.flush();s.view.resize();assert.equal(s.calls.length,0);assert.equal(s.jobs.size,0);assert.deepEqual(Object.keys(s.events),[]);
});
