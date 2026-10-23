import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Model from './assets/research-model.js';
import {validateResearch} from './research-validation.mjs';

const read=async file=>readFile(new URL(file,import.meta.url),'utf8');
const books=JSON.parse(await read('./data/books.json'));
const book=books.find(b=>b.id==='ai-agents-in-depth');
const lessons=['agent_loop.py','context_pack.py','memory_retrieval.py','tool_contract.py',
  'patch_verification.py','evaluation_rubric.py','training_objectives.py',
  'evolution_gate.py','realtime_epochs.py','handoff_contract.py'];
const chapterPosts=await Promise.all(book.chapters.map(async chapter=>{
  const raw=(await read('./content/'+chapter.postSlug+'.md')).replaceAll('\r\n','\n');
  const [,frontmatter,body]=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)||[];
  assert(frontmatter&&body,'Each chapter needs front matter and a body.');
  const meta=Object.fromEntries(frontmatter.split('\n').map(line=>{const i=line.indexOf(':');return [line.slice(0,i).trim(),line.slice(i+1).trim()];}));
  return {...meta,slug:chapter.postSlug,research:meta.research.split(',').map(s=>s.trim()),body};
}));

test('the book has ten real chapter articles with matching metadata and research references',async()=>{
  assert.equal(book.totalChapters,10);
  assert.deepEqual(book.chapters.map(c=>c.number),[1,2,3,4,5,6,7,8,9,10]);
  const research=JSON.parse(await read('./data/research-directions.json'));
  const fields=JSON.parse(await read('./data/fields.json'));
  assert.doesNotThrow(()=>validateResearch({research,books,fields,posts:chapterPosts}));
  for(const p of chapterPosts){
    assert.equal(p.book,book.id);
    assert(p.body.includes('v1.3'));
    assert(p.body.includes('https://github.com/bojieli/ai-agent-book'));
    assert(!p.body.includes('__LESSON_CODE__'));
  }
});

test('every published exercise matches its runnable Python source',async()=>{
  for(const [index,p] of chapterPosts.entries()){
    const code=(await read('./examples/agent-reading/'+lessons[index])).replaceAll('\r\n','\n').trimEnd();
    const blocks=[...p.body.matchAll(/```python\n([\s\S]*?)\n```/g)].map(m=>m[1]);
    assert(blocks.includes(code),'Article source differs from '+lessons[index]);
  }
});

test('chapter navigation preserves the first and last boundaries and numeric order',()=>{
  const first=Model.chapterNeighbors(book,book.chapters[0].postSlug);
  assert.equal(first.previous,null);assert.equal(first.next.number,2);
  const middle=Model.chapterNeighbors(book,book.chapters[5].postSlug);
  assert.equal(middle.previous.number,5);assert.equal(middle.next.number,7);
  const last=Model.chapterNeighbors(book,book.chapters[9].postSlug);
  assert.equal(last.previous.number,9);assert.equal(last.next,null);
  assert.deepEqual(Model.chapterNeighbors(book,'missing'),{previous:null,next:null});
  assert.deepEqual(Model.chapterNeighbors(null,'missing'),{previous:null,next:null});
});

test('chapter validation rejects duplicate numbering and a mismatched parent-book direction',async()=>{
  const research=JSON.parse(await read('./data/research-directions.json'));
  const fields=JSON.parse(await read('./data/fields.json'));
  for(const change of [b=>b[0].chapters[2].number=2,b=>b[0].directionIds=b[0].directionIds.filter(id=>id!=='rd-070')]){
    const changed=structuredClone(books);change(changed);
    assert.throws(()=>validateResearch({research,books:changed,fields,posts:chapterPosts}));
  }
});
