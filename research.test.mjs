import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Model from './assets/research-model.js';
import Topics from './assets/topic-model.js';
import {validateResearch} from './research-validation.mjs';
const read=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const research=await read('./data/research-directions.json'),books=await read('./data/books.json'),fields=await read('./data/fields.json');
const posts=books.flatMap(b=>b.chapters.map(c=>({slug:c.postSlug,title:c.title,book:b.id,chapter:c.number,research:c.directionIds})));
const context={directions:research.directions,books,posts};
const sample=(id='learn-example',ids=['rd-011'])=>({id,directionIds:ids,date:'2026-10-22',type:'reading',title:'工具调用与反馈',note:'区分调用请求与工具的真实执行结果。',postSlug:posts[0].slug,bookId:books[0].id});
test('100 stable research IDs connect to real CCF categories, books and chapter posts',()=>{
  assert.doesNotThrow(()=>validateResearch({research,books,fields,posts}));
  assert.equal(new Set(research.directions.map(d=>d.number)).size,100);
  assert.equal(books[0].chapters.length,10);
  const damaged=structuredClone(books);damaged[0].chapters[0].postSlug='missing';assert.throws(()=>validateResearch({research,books:damaged,fields,posts}));
});
test('personal counts use confirmed records only and handle overlap and ties',()=>{
  const empty=Model.personal(context.directions,[]);assert(empty.every(d=>d.count===0&&d.rank===null));
  const records=[sample('learn-one',['rd-011','rd-014']),sample('learn-two',['rd-015'])];
  const ranked=Model.personal(context.directions,records);
  assert.deepEqual(ranked.slice(0,3).map(d=>[d.id,d.count,d.rank]),[['rd-011',1,1],['rd-014',1,1],['rd-015',1,1]]);
});
test('backup validation rejects broken references, invalid dates, unknown fields and duplicates',()=>{
  for(const mutate of [r=>r.directionIds=['rd-999'],r=>r.directionIds=['rd-011','rd-011'],r=>r.date='2026-02-30',r=>r.note='',r=>r.postSlug='missing',r=>r.bookId='missing',r=>r.privatePath='private',r=>r.directionIds=research.directions.slice(0,6).map(d=>d.id)]){
    const r=sample();mutate(r);assert.throws(()=>Model.parse(JSON.stringify({schema:Model.schema,records:[r]}),context));
  }
  assert.throws(()=>Model.parse(JSON.stringify({schema:Model.schema,records:[sample(),sample()]}),context));
  assert.deepEqual(Model.parse(JSON.stringify({schema:Model.schema,records:[sample()]}),context),[sample()]);
});
test('merge is idempotent and conflicts do not mutate existing records',()=>{
  const current=[sample()];assert.equal(Model.merge(current,[sample()]).length,1);
  assert.throws(()=>Model.merge(current,[{...sample(),note:'conflicting'}]));assert.equal(current[0].note,sample().note);
});
test('public vote count uses only top-level thumbs-up and verifies the repository',()=>{
  const payload={discussion:{repository:{nameWithOwner:'owner/site'},url:'https://github.com/owner/site/discussions/1',reactionCount:20,reactions:{THUMBS_UP:{count:3},HEART:{count:17}}}};
  assert.equal(Model.publicCount(payload,'owner/site').count,3);
  const wrong=structuredClone(payload);wrong.discussion.repository.nameWithOwner='other/site';assert.throws(()=>Model.publicCount(wrong,'owner/site'));
  const unknown=structuredClone(payload);delete unknown.discussion.reactions.THUMBS_UP;assert.throws(()=>Model.publicCount(unknown,'owner/site'));
  const rows=Model.ranked(context.directions,id=>id==='rd-061'?0:null);assert.equal(rows[0].id,'rd-061');assert.equal(rows[0].rank,null);assert.equal(rows[1].count,null);
});
test('research references and discussions remain distinct from lab and venue topics',()=>{
  const entries=Topics.entries({research,books,posts,fields});assert.equal(new Set(entries.map(e=>e.key)).size,entries.length);
  assert.equal(entries.filter(e=>e.key.startsWith('research:')).length,100);
  assert(entries.some(e=>e.key==='research:rd-011'&&e.href==='#/research?direction=rd-011'));
  assert(entries.some(e=>e.key==='lab:neural'));
  assert.match(Model.citation(research.directions[10],'https://example.org/blog/'),/https:\/\/example.org\/blog\/#\/research\?direction=rd-011/);
});
test('public metadata contains no local PDF paths or fabricated personal learning history',()=>{
  assert(!/(?:^|["\s])[A-Z]:[\\/]|file:\/\//i.test(JSON.stringify({research,books})));
  assert(!Object.hasOwn(research,'records'));
  assert(!Object.hasOwn(research,'votes'));
});
