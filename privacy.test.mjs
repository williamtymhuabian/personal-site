import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePublicData, validatePublishPaths } from './privacy.mjs';
const profile = JSON.parse(await readFile(new URL('./profile.json', import.meta.url), 'utf8'));
const awards = JSON.parse(await readFile(new URL('./data/awards.json', import.meta.url), 'utf8'));
const projects = JSON.parse(await readFile(new URL('./data/projects.json', import.meta.url), 'utf8'));
const dataset = () => structuredClone({ profile, awards, projects });
test('approved public dataset and explicitly published social handles pass', () => assert.doesNotThrow(() => validatePublicData(dataset())));
test('education history rejects private fields and invalid month ranges', () => {
  for (const mutate of [p=>p.educationHistory[0].studentId='private',p=>p.educationHistory[0].start='2026-13',p=>p.educationHistory[1].end='2020-07',p=>p.educationHistory[1].current=true]) {
    const value=dataset();mutate(value.profile);assert.throws(() => validatePublicData(value));
  }
});
test('certificate paths and original URLs cannot be added to award data', () => {
  for (const key of ['sourcePath', 'certificateUrl', 'ocrText']) {
    const value = dataset(); value.awards[0][key] = 'private-original';
    assert.throws(() => validatePublicData(value), /未允许公开/);
  }
});
test('sensitive identifiers and local paths are rejected', () => {
  for (const detail of ['110101199001010000', '13800000000', 'C:\\Users\\Example\\original.pdf']) {
    const value = dataset(); value.awards[0].detail = detail;
    assert.throws(() => validatePublicData(value));
  }
});
test('private indexes, raw PDFs and certificate images cannot be published', () => {
  for (const file of ['.private/certificate-index.json', 'assets/证书.png', 'awards.pdf', 'assets/photo.jpg', 'assets/projects/certificate.jpg']) assert.throws(() => validatePublishPaths([file]));
  assert.doesNotThrow(() => validatePublishPaths(['index.html', 'feed.xml', 'assets/projects/robot-demo.png', '.github/ISSUE_TEMPLATE/certificate-request.md']));
});
test('duplicate record ids and broken project associations are rejected', () => {
  const duplicate = dataset(); duplicate.awards.push(duplicate.awards[0]); assert.throws(() => validatePublicData(duplicate), /重复/);
  const broken = dataset(); broken.projects[0].awardIds = ['missing']; assert.throws(() => validatePublicData(broken), /不存在/);
});
