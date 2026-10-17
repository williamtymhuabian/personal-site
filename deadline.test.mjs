import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Model from './assets/deadline-model.js';
import {validateDeadlines} from './deadline-validation.mjs';
const data=JSON.parse(await readFile(new URL('./data/venue-deadlines.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('./data/ccf-catalog.json',import.meta.url),'utf8'));
const ids=new Set(catalog.venues.map(v=>v.id));
const cvpr=data.records.find(r=>r.id==='cvpr-2027-paper');
test('verified reference entries cover ten CS fields and carry dated sources',()=>{
  assert.doesNotThrow(()=>validateDeadlines(data,catalog));
  assert.equal(new Set(data.records.map(r=>catalog.venues.find(v=>v.id===r.venueId).categoryId)).size,10);
  assert.equal(data.records.length,18);
  for(const r of data.records)assert.match(r.sourceUrl,/^https:\/\//);
});
test('AoE and fixed UTC offsets convert independently of the computer timezone',()=>{
  assert.equal(new Date(Model.instant(cvpr)).toISOString(),'2026-11-17T11:59:00.000Z');
  const r={...cvpr,zone:'UTC+8',localDateTime:'2026-11-17T19:59'};assert.equal(Model.instant(cvpr),Model.instant(r));
  assert.equal(new Date(Model.instant({...cvpr,zone:'UTC-7',localDateTime:'2026-09-15T23:59:59'})).toISOString(),'2026-09-16T06:59:59.000Z');
  for(const localDateTime of ['2026-02-30T23:59','2026-13-01T23:59','2026-10-17T24:00','2026-10-17T23:60','2026-10-17T23:59:60'])assert(Number.isNaN(Model.instant({...cvpr,localDateTime})));
});
test('date boundary and record modes do not turn a journal guide into a countdown',()=>{
  const t=Model.instant(cvpr);assert.equal(Model.state(cvpr,t-1),'soon');assert.equal(Model.state(cvpr,t+1),'expired');
  assert.equal(Model.state({...cvpr,done:true},t+1),'done');
  assert.equal(Model.state(data.records.find(r=>r.mode==='rolling')),'rolling');
  assert.equal(Model.state(data.records.find(r=>r.mode==='pending')),'pending');
  assert.throws(()=>Model.validate({...cvpr,mode:'pending'},ids));
});
test('malformed backup imports and unsafe source links are rejected before records are changed',()=>{
  const text=records=>JSON.stringify({schema:'william-deadlines-v1',records});
  assert.deepEqual(Model.parseBackup(text([cvpr]),ids),[cvpr]);
  for(const sourceUrl of ['javascript:alert(1)','http://example.org','https://user:secret@example.org','https://example.org/\r\nBEGIN:VEVENT'])assert.throws(()=>Model.parseBackup(text([{...cvpr,sourceUrl}]),ids));
  assert.throws(()=>Model.parseBackup(text([cvpr,cvpr]),ids));
  assert.throws(()=>Model.parseBackup(text([{...cvpr,sourcePath:'private.pdf'}]),ids));
  assert.throws(()=>Model.parseBackup(text([{...cvpr,venueId:'unknown'}]),ids));
  assert.throws(()=>Model.parseBackup(text([{...cvpr,zone:'PST-maybe'}]),ids));
});
test('calendar export preserves UTC, notes and alarms, excluding undated and completed items',()=>{
  const r={...cvpr,note:'中文测试；第一行\n第二行,另一个分号;'+('很长的记事'.repeat(40))};
  const ics=Model.calendar([r,{...r,id:'complete',done:true},...data.records.filter(r=>r.mode==='rolling'||r.mode==='pending')],Date.UTC(2026,9,17));
  assert.match(ics,/DTSTART:20261117T115900Z/);assert.match(ics,/TRIGGER:-P3D/);assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,1);
  for(const line of ics.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);
  assert.match(ics.replace(/\r\n /g,''),/第一行\\n第二行\\,另一个分号\\;/);
});
