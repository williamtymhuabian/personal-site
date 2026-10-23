'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, makeDataset, simulate, endpointCheck, replay } = require('../scripts/pickgo_dataset.cjs');
const { S } = loadCore();

test('dataset is reproducible and scene groups are disjoint', () => {
  const data = makeDataset(S);
  assert.deepEqual(data, makeDataset(S));
  assert.equal(new Set(data.scenes.map(scene => scene.id)).size, 192);
  const cells = new Set(data.scenes.filter(scene => scene.split !== 'ood').map(scene => scene.id));
  assert.equal(cells.size, 160);
});
test('baseline reproduces success and the previous out-of-reach failure', () => {
  const fixed = { x: -1.48, y: .32, yaw: Math.PI / 2 };
  assert.equal(simulate(S, { target: { x: -1.48, y: .76, z: .375 } }, fixed).status, 'SUCCEEDED');
  const far = simulate(S, { target: { x: -1.48, y: .96, z: .375 } }, fixed);
  assert.equal(far.status, 'FAILED');
  assert.match(far.phase, /OUT_OF_REACH/);
});
test('occupied base is rejected even if an arm endpoint could be reached', () => {
  assert.equal(endpointCheck(S, { x: -1.25, y: .76, z: .375 }, { x: -1.25, y: .96, yaw: 0 }).reason, 'BASE_CLEARANCE');
});
test('validated selection rejects a candidate rather than issuing an invalid simulation command', () => {
  const dataset = makeDataset(S);
  const scene = dataset.scenes.find(scene => scene.split === 'ood');
  const rows = replay(S, dataset, [{ scene_id: scene.id, method: 'mlp_verified', verify: true,
    candidate_ids: scene.candidates.map(candidate => candidate.id) }]);
  assert.equal(rows[0].status, 'REJECTED');
  assert.equal(rows[0].checks, 48);
});
test('training scenes cannot enter held-out replay', () => {
  const dataset = makeDataset(S);
  assert.throws(() => replay(S, dataset, [{ scene_id: dataset.scenes[0].id, method: 'fixed' }]), /non-held-out/);
});
