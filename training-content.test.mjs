import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const read=file=>readFile(new URL(file,import.meta.url),'utf8');
const curriculum=JSON.parse(await read('./examples/embodied-training/curriculum.json'));
const books=JSON.parse(await read('./data/books.json'));
const research=JSON.parse(await read('./data/research-directions.json'));

test('training tasks reference existing books, chapters, directions and real entry points',async()=>{
  assert.equal(curriculum.tasks.length,10);
  assert.equal(new Set(curriculum.tasks.map(t=>t.id)).size,10);
  const limits={'ai-agents-in-depth':10,'essential-graphrag':8,'llm-from-scratch':7};
  for(const task of curriculum.tasks){
    for(const ref of task.books){
      assert(books.some(b=>b.id===ref.id));
      assert(ref.chapters.every(n=>Number.isInteger(n)&&n>=1&&n<=limits[ref.id]));
    }
    assert(task.direction_ids.every(id=>research.directions.some(d=>d.id===id)));
    if(task.entry)assert((await read('./examples/embodied-training/'+task.entry)).length>0);
  }
});

test('published download matches source, reviewed simulator and complete archive manifest',async()=>{
  const manifest=JSON.parse(await read('./downloads/embodied-training-lab.manifest.json'));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const archive=await readFile(new URL('./'+manifest.archive_path,import.meta.url));
  assert.equal(hash(archive),manifest.sha256);
  assert.equal(archive.length,manifest.bytes);
  for(const [name,expected] of Object.entries(manifest.files)){
    assert(name.startsWith('embodied-training-lab/'));
    const relative=name.slice('embodied-training-lab/'.length);
    assert(!/(^|\/)(\.private|__pycache__|runs|data)(\/|$)|\.(pdf|jpg|png|pyc)$/i.test(relative));
    const file=await readFile(new URL('./examples/embodied-training/'+relative,import.meta.url));
    assert.equal(hash(file),expected,'Stale download: '+relative);
  }
  assert.equal(manifest.files['embodied-training-lab/vendor/pickgo-core.js'],
    '29595a1803c2cfbb402c8a8af0f74651c869d5fcdc1fa7a651b734f5b8072a90');
});

test('learning entry points link to real posts and preserve unknown award details',async()=>{
  const slugs=['embodied-kaiwu-training-roadmap','embodied-parking-first-experiment','kaiwu-rl-server-practice'];
  const posts=await Promise.all(slugs.map(slug=>read('./content/'+slug+'.md')));
  for(const post of posts){
    assert.match(post,/research: rd-/);
    assert(!/[A-Z]:[\\/]Users|file:\/\//.test(post));
    for(const match of post.matchAll(/\]\(#\/post\/([a-z0-9-]+)\)/g))assert((await read('./content/'+match[1]+'.md')).length);
  }
  assert.match(posts[0],/线性代数/);
  assert.match(posts[0],/具体奖项仍需.*核对/);
  assert.match(posts[2],/不是开悟的峡谷漫步/);
  const hub=await read('./assets/research-hub.js');
  assert.match(hub,/开悟与课题训练/);
});

test('Kaiwu public evidence confirms two qualifying records without inventing award levels',async()=>{
  const evidence=JSON.parse(await read('./data/kaiwu-public-records.json'));
  const awards=JSON.parse(await read('./data/awards.json'));
  assert.equal(evidence.checkedAt,'2026-10-23');
  assert.deepEqual(evidence.records.map(r=>[r.year,r.competition_id,r.stage_id,r.result]),
    [[2023,82,10,'海选入围'],[2024,100,80,'中国内地赛区海选晋级']]);
  for(const record of evidence.records){
    assert.equal(record.team,'线性代数');
    assert.equal(record.award_level_verified,false);
    assert.equal(new URL(record.competition_page).hostname,'tencentarena.com');
    assert.equal(new URL(record.score_image_url).hostname,'kaiwu-prod-1252931805.cos.ap-shanghai.myqcloud.com');
    assert.match(record.image_sha256,/^[a-f0-9]{64}$/);
    assert(!Object.hasOwn(record,'prize'));
    const participation=awards.find(award=>award.id===record.recordId);
    assert(participation);
    assert.equal(participation.kind,'participation');
    assert.equal(participation.year,String(record.year));
    assert.equal(participation.prize,record.result);
  }
});
