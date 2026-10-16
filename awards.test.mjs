import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import AwardModel from './assets/award-model.js';
import {validatePublicData} from './privacy.mjs';
import {validatePortfolio} from './portfolio-validation.mjs';
const read=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const data={profile:await read('./profile.json'),awards:await read('./data/awards.json'),projects:await read('./data/projects.json')};
const portfolio={awards:data.awards,papers:await read('./data/papers.json'),publicCertificates:await read('./data/public-certificates.json'),community:await read('./data/community.json')};

test('eight verified progression pairs preserve both results and resolve old regional links',()=>{
  const merged=data.awards.filter(a=>a.stages);
  assert.equal(merged.length,8);
  assert.equal(data.awards.filter(a=>a.kind==='award').length,42);
  for(const a of merged){
    assert.equal(a.stages.length,2);
    assert.equal(AwardModel.find(data.awards,a.stages[0].id),a);
    assert.equal(data.awards.some(other=>other.id===a.stages[0].id),false);
    assert.equal(a.stages.at(-1).prize,a.prize);
  }
  const design=AwardModel.find(data.awards,'design-2025-ocean-regional');
  assert.equal(design.id,'design-2025-national');
  assert.deepEqual(design.stages.map(s=>s.prize),['中南地区赛一等奖','全国二等奖']);
  assert.equal(data.awards.some(a=>a.id==='adpc-2025-spring'),false);
});
test('national results precede provincial awards without relabelling the ICPC regional or participation records',()=>{
  const ranked=[...data.awards].sort(AwardModel.compare);
  const national=ranked.filter(a=>AwardModel.group(a)===0);
  const province=ranked.filter(a=>AwardModel.group(a)===2);
  assert(national.length&&province.length);
  assert(ranked.indexOf(national.at(-1))<ranked.indexOf(province[0]));
  assert.equal(national[0].id,'iscc-2025-national');
  assert.equal(AwardModel.find(data.awards,'icpc-2025-xian-regional').level,'亚洲区域赛');
  assert.equal(AwardModel.find(data.awards,'mcm-2025').kind,'participation');
});
test('programming disciplines join algorithms while cloud and visual design keep their own fields',()=>{
  for(const id of ['lanqiao-2025-national','lanqiao-2024-hubei','raicom-2025-programming','raicom-2024-programming-national','matibei-2025-national','gplt-2025-hubei','computer-challenge-2023-cpp'])assert.equal(AwardModel.find(data.awards,id).category,'算法竞赛');
  assert.equal(AwardModel.find(data.awards,'raicom-2024-cloud-national').category,'网络技术');
  assert.equal(AwardModel.find(data.awards,'lanqiao-2025-industrial').category,'创新设计');
});
test('progression stages reject private fields, conflicting IDs and mismatched final results',()=>{
  for(const mutate of [a=>a.stages[0].sourcePath='private.jpg',a=>a.stages[0].id='mcm-2025',a=>a.stages[0].detail='C:/Users/private',a=>a.stages.at(-1).prize='一等奖']){
    const copy=structuredClone(data);mutate(copy.awards.find(a=>a.stages));assert.throws(()=>validatePublicData(copy));
  }
});
test('computer-design material includes both certificates and medal under its redacted disclosure policy',()=>{
  const proof=portfolio.publicCertificates.find(g=>g.awardId==='design-2025-national');
  assert.equal(proof.disclosure,'redacted');
  assert.deepEqual(proof.items.map(i=>i.kind),['certificate','medal','certificate']);
  const copy=structuredClone(portfolio);copy.publicCertificates.find(g=>g.awardId===proof.awardId).disclosure='complete';assert.throws(()=>validatePortfolio(copy));
});
