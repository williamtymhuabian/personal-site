import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateJourneys } from './journey-validation.mjs';
const read = async file => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
const stops = await read('./data/journeys.json'), awards = await read('./data/awards.json');

test('current city records link to the correct award years', () => assert.doesNotThrow(() => validateJourneys(stops, awards)));
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
