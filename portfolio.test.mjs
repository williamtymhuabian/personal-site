import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validatePortfolio } from './portfolio-validation.mjs';
import { validatePublishPaths, checkPublicFiles } from './privacy.mjs';
import { approvedProofs } from './public-honors.mjs';
const read = async file => JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
const data = { papers: await read('./data/papers.json'), publicCertificates: await read('./data/public-certificates.json'), community: await read('./data/community.json'), awards: await read('./data/awards.json') };
const samplePaper = { id:'research-example',title:'A research record',authors:['Williamtym'],year:'2026',venue:'Public preprint',status:'preprint',abstract:'Example used only in validation tests.',tags:['VLN'],doiUrl:'https://example.org/paper',pdfUrl:'',codeUrl:'',bibtex:'' };

test('current portfolio has only reviewed public evidence and valid research settings', () => assert.doesNotThrow(() => validatePortfolio(data)));
test('only reviewed certificate and medal images pass the public path guard', () => {
  assert.equal(Object.keys(approvedProofs).length, new Set(data.publicCertificates.flatMap(group => group.items.map(item => item.image))).size);
  assert.doesNotThrow(() => validatePublishPaths(Object.keys(approvedProofs)));
  for (const file of ['assets/public-honors/new.webp','assets/public-honors/original.png','assets/public-honors/../original.webp']) assert.throws(() => validatePublishPaths([file]));
});
test('unreviewed, duplicate and unrelated gallery images cannot be published', () => {
  for (const change of [g => g.items.push(g.items[0]),g => g.items[0].image='assets/public-honors/raw.webp',g => g.items[0].sourcePath='private.jpg',g => g.items[0].kind='original']) {
    const value=structuredClone(data);change(value.publicCertificates[0]);assert.throws(() => validatePortfolio(value));
  }
});
test('the 2023 mathematics certificates count as one award', () => {
  assert.equal(data.awards.filter(a => a.id==='math-national-2023').length,1);
  assert.equal(data.awards.filter(a => a.id==='math-hubei-2023').length,0);
  assert.match(data.awards.find(a => a.id==='math-national-2023').detail,/两份证书合并/);
});
test('certificate image bytes still match the reviewed public copies', async () => await checkPublicFiles(fileURLToPath(new URL('.', import.meta.url))));
test('each honor group explicitly selects its approved disclosure policy', () => {
  for (const disclosure of [undefined,'private','raw-original']) {
    const value=structuredClone(data);value.publicCertificates[0].disclosure=disclosure;assert.throws(() => validatePortfolio(value));
  }
});
test('unreviewed evidence, unrelated awards and hidden source fields are rejected', () => {
  for (const change of [p => p.image='https://example.org/original.jpg',p => p.awardId='unknown',p => p.sourcePath='original.pdf']) {
    const value=structuredClone(data); change(value.publicCertificates[0]); assert.throws(() => validatePortfolio(value));
  }
});
test('papers require explicit public status and HTTPS links', () => {
  assert.doesNotThrow(() => validatePortfolio({...data,papers:[samplePaper]}));
  for (const patch of [{status:'submitted'},{pdfUrl:'javascript:alert(1)'},{codeUrl:'C:/Users/private'},{sourcePath:'private.pdf'}]) assert.throws(() => validatePortfolio({...data,papers:[{...samplePaper,...patch}]}));
});
test('enabled comments require real IDs and the intended repository', () => {
  for (const patch of [{enabled:true,repoId:''},{enabled:true,categoryId:''},{repo:'someone/else'}]) assert.throws(() => validatePortfolio({...data,community:{...data.community,...patch}}));
});
