import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateExplore } from './explore-validation.mjs';
const read=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const data={fields:await read('./data/fields.json'),friends:await read('./data/friends.json'),ccfCatalog:await read('./data/ccf-catalog.json')};
test('the reviewed original CCF edition has complete categories and records',()=>{
  assert.doesNotThrow(()=>validateExplore(data));
  assert.equal(data.ccfCatalog.venues.length,681);
  assert.equal(data.ccfCatalog.venues.filter(v=>v.type==='journal').length,295);
  assert.equal(data.ccfCatalog.venues.filter(v=>v.type==='conference').length,386);
  assert.equal(data.ccfCatalog.updatedAt,'2026-04-09');
  assert.equal(data.ccfCatalog.venues.filter(v=>!v.url).length,2);
});
test('unreviewed schema fields, scripts, duplicate or unrelated venues are rejected',()=>{
  for(const change of [d=>d.friends=[{id:'friend',nickname:'Example',bio:'Public introduction',url:'javascript:alert(1)'}],d=>d.friends=[{id:'friend',nickname:'Example',bio:'Public introduction',url:'',phone:'private'}],d=>d.ccfCatalog.venues[0].categoryId='unknown',d=>d.ccfCatalog.venues.push(d.ccfCatalog.venues[0]),d=>d.ccfCatalog.sourceUrl='https://example.org/',d=>d.fields[0].demo='unknown']){
    const value=structuredClone(data);change(value);assert.throws(()=>validateExplore(value));
  }
});
test('full source names remain available when the original has no abbreviation',()=>{
  for(const venue of data.ccfCatalog.venues.filter(v=>!v.abbr))assert(venue.name.trim().length>3);
});
