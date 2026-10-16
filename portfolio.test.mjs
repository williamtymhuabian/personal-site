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
test('only the six reviewed certificate images pass the public path guard', () => {
  assert.equal(Object.keys(approvedProofs).length, 6);
  assert.doesNotThrow(() => validatePublishPaths(Object.keys(approvedProofs)));
  for (const file of ['assets/public-honors/new.webp','assets/public-honors/original.png','assets/public-honors/../original.webp']) assert.throws(() => validatePublishPaths([file]));
});
test('certificate image bytes still match the reviewed redacted copies', async () => await checkPublicFiles(fileURLToPath(new URL('.', import.meta.url))));
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
