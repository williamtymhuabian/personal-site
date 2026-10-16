import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateJourneys } from './journey-validation.mjs';
const read = async file => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
const stops = await read('./data/journeys.json'), awards = await read('./data/awards.json');

test('current city records link to the correct award years', () => assert.doesNotThrow(() => validateJourneys(stops, awards)));
test('tourism records remain separate from competition results', () => {
  for (const city of ['yichang','wuxi','beijing']) {
    const stop=stops.find(s=>s.id===city);assert(stop);
    for (const event of stop.events) {assert.equal(event.kind,'travel');assert.equal(event.awardId,'');assert.equal(event.year,'');assert.equal(event.result,undefined);}
  }
  for (const patch of [{awardId:'icpc-2025-xian-regional'},{result:'no-award'}]) {
    const data=structuredClone(stops);Object.assign(data.find(s=>s.id==='yichang').events[0],patch);
    assert.throws(()=>validateJourneys(data,awards));
  }
});
test('the added destinations link to the corresponding existing competitions', () => {
  for (const [city, awardId] of [['qingdao','raicom-2024-cloud-national'],['kunming','iscc-2025-national'],['wuhan','maker-2025-wuhan'],['huzhou','logistics-2025'],['wenzhou','network-2025-national']]) {
    assert(stops.find(s=>s.id===city).events.some(e=>e.awardId===awardId));
  }
});
test('repeat visits remain separate without inventing years or results', () => {
  for (const [city, count] of [['chongqing',2],['zhengzhou',2],['guangzhou',1]]) {
    const events=stops.find(s=>s.id===city).events;
    assert.equal(events.length,count);
    for (const event of events) {assert.equal(event.kind,'participation');assert.equal(event.year,'');assert.equal(event.result,'unconfirmed');assert.equal(event.awardId,'');}
  }
  const data=structuredClone(stops);delete data.find(s=>s.id==='guangzhou').events[0].result;
  assert.throws(()=>validateJourneys(data,awards));
});
test('participation cannot be relabelled as an award', () => {
  const data=structuredClone(stops), event=data.find(s=>s.id==='hangzhou').events[0];
  assert.equal(event.kind,'participation');assert.equal(event.awardId,'');
  event.kind='award';assert.throws(() => validateJourneys(data, awards));
});
test('private fields, unreviewed photos and broken references are rejected', () => {
  for (const mutate of [
    s=>s[0].events[0].sourcePath='private.jpg',
    s=>s[0].events[0].awardId='missing',
    s=>s[0].events[0].photos.push({image:'assets/journeys/raw.webp',alt:'Unreviewed',caption:'Raw'}),
    s=>s[0].events[0].summary='13800000000',
    s=>s[0].longitude=Infinity,
    s=>s[0].events.push(s[0].events[0]),
  ]) {
    const data=structuredClone(stops);mutate(data);assert.throws(() => validateJourneys(data,awards));
  }
});
