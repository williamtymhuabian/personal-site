import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import TopicModel from './assets/topic-model.js';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const data={profile:await read('./profile.json'),community:await read('./data/community.json'),fields:await read('./data/fields.json'),journeys:await read('./data/journeys.json'),ccfCatalog:await read('./data/ccf-catalog.json'),projects:await read('./data/projects.json'),posts:[{slug:'first-push',title:'First push',category:'建站'}],papers:[]};
const entries=TopicModel.entries(data);
test('all content types get distinct stable topics, preserving the old lab keys',()=>{
  assert.equal(new Set(entries.map(e=>e.key)).size,entries.length);
  for(const key of ['general','lab:sorting','lab:neural','lab:network','lab:embodied','lab:security','journey:wuhan','post:first-push'])assert(entries.some(e=>e.key===key));
  assert.equal(entries.filter(e=>e.key.startsWith('venue:')).length,681);
});
test('GitHub fallback bodies use the exact same SHA1 marker as giscus strict mapping',()=>{
  for(const key of ['general','post:first-push','lab:systems','journey:wuhan']){
    const entry=entries.find(e=>e.key===key),hash=createHash('sha1').update(TopicModel.term(entry.key)).digest('hex');
    const links=TopicModel.links({...data,entry,hash,message:'这是一条待确认的交流内容 & 中文。'});
    const url=new URL(links.create);
    assert.equal(url.origin,'https://github.com');assert.equal(url.searchParams.get('title'),TopicModel.term(key));assert(url.searchParams.get('body').includes(`<!-- sha1: ${hash} -->`));assert(url.searchParams.get('body').includes('待确认'));
    assert.equal(new URL(links.search).searchParams.get('discussions_q'),'in:body '+hash);
  }
});
test('message previews remain bounded and identifiers cannot be omitted',()=>{
  const entry=entries[0],hash=createHash('sha1').update(TopicModel.term(entry.key)).digest('hex');
  const links=TopicModel.links({...data,entry,hash,message:'😀'.repeat(1000)});
  assert.equal((links.body.match(/😀/gu)||[]).length,600);
  assert.equal((new URL(links.email).searchParams.get('body').match(/😀/gu)||[]).length,600);
  assert.throws(()=>TopicModel.links({...data,entry,hash:'not-a-hash'}));
});
