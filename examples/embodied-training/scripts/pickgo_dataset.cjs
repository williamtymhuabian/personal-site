'use strict';
// Offline adapter: require only the existing mathematical core, never app.py or camera code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

function loadCore(filename) {
  const file = path.resolve(filename || path.join(root, 'vendor/pickgo-core.js'));
  return { S: require(file), hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
}
function rng(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function endpointCheck(S, target, base) {
  if (S.blocked(base)) return { feasible: false, reason: 'BASE_CLEARANCE' };
  // Endpoint IK only: neither swept-arm collision nor dynamics are represented.
  const points = [S.local(base, .18, 0, .49), { ...target, z: target.z + .10 }, target,
    S.local(base, -.15, 0, .36), S.local(base, -.15, 0, .235)];
  try { points.forEach(point => S.ik(base, point)); }
  catch (error) { return { feasible: false, reason: error.message.split('：')[0] }; }
  return { feasible: true, reason: 'ENDPOINT_IK_OK' };
}
const FEATURES = ['target_x', 'target_y', 'base_x', 'base_y', 'relative_x', 'relative_y', 'radius', 'radius_squared'];
function features(target, base) {
  const dx = target.x - base.x, dy = target.y - base.y, r = Math.hypot(dx, dy);
  return [target.x, target.y, base.x, base.y, dx, dy, r, r * r];
}
function makeDataset(S, seed = 20261023) {
  const random = rng(seed), cells = [];
  for (let x = 0; x < 16; x++) for (let y = 0; y < 10; y++) cells.push({ x, y });
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const scenes = cells.map((cell, i) => ({
    id: `cell-${cell.x}-${cell.y}`, split: i < 96 ? 'train' : i < 128 ? 'validation' : 'test',
    target: { x: -1.62 + (cell.x + .2 + random() * .6) * .74 / 16,
      y: .70 + (cell.y + .2 + random() * .6) * .30 / 10, z: .375 },
  }));
  for (let i = 0; i < 32; i++) scenes.push({ id: `ood-${i}`, split: 'ood',
    target: { x: -1.62 + random() * .74, y: 1.02 + random() * .14, z: .375 } });
  for (const scene of scenes) {
    scene.fixed_base = { x: scene.target.x, y: .32, yaw: Math.PI / 2 };
    scene.candidates = [];
    for (const dx of [-.30, -.18, -.06, .06, .18, .30]) {
      for (const dy of [.30, .35, .40, .45, .50, .55, .60, .65]) {
        const base = { x: scene.target.x + dx, y: scene.target.y - dy, yaw: Math.PI / 2 };
        scene.candidates.push({ id: scene.candidates.length, base, features: features(scene.target, base),
          ...endpointCheck(S, scene.target, base) });
      }
    }
  }
  return { schema: 1, seed, feature_names: FEATURES, label: 'base clearance and listed endpoint IK only',
    split_unit: 'target spatial cell; every candidate of a target stays in one split', scenes };
}
function simulate(S, scene, base) {
  const sim = new S.Simulation();
  Object.assign(sim.objects.find(object => object.id === 'red'), scene.target);
  sim.start('red');
  Object.assign(sim.queue.find(action => action.type === 'nav').goal, base);
  let ticks = 0;
  while (sim.status === 'RUNNING' && ticks < 6000) { sim.tick(.04); ticks++; }
  return { status: sim.status === 'RUNNING' ? 'TIME_LIMIT' : sim.status,
    phase: sim.phase, simulation_time_s: Number(sim.time.toFixed(2)) };
}
function replay(S, dataset, requests) {
  const result = [];
  const sceneMap = new Map(dataset.scenes.map(scene => [scene.id, scene]));
  for (const request of requests) {
    const scene = sceneMap.get(request.scene_id);
    if (!scene || !['test', 'ood'].includes(scene.split)) throw Error('Unknown or non-held-out scene');
    const candidates = new Map(scene.candidates.map(candidate => [candidate.id, candidate]));
    let selected, checks = 0;
    if (request.method === 'fixed') selected = { id: null, base: scene.fixed_base };
    else {
      for (const id of request.candidate_ids) {
        const candidate = candidates.get(id);
        if (!candidate) throw Error('Unknown candidate');
        if (request.verify) {
          checks++;
          if (!endpointCheck(S, scene.target, candidate.base).feasible) continue;
        }
        selected = candidate; break;
      }
    }
    result.push({ scene_id: scene.id, split: scene.split, method: request.method, checks,
      candidate_id: selected?.id ?? null,
      ...(selected ? simulate(S, scene, selected.base) : { status: 'REJECTED', phase: 'NO_VALID_CANDIDATE' }) });
  }
  return result;
}
function writeNew(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
if (require.main === module) {
  const [mode, ...args] = process.argv.slice(2);
  const { S, hash } = loadCore(process.env.PICKGO_CORE);
  if (mode === 'generate') {
    const dataset = { ...makeDataset(S), core_sha256: hash };
    writeNew(path.resolve(args[0] || path.join(root, 'data/parking-v1.json')), dataset);
    console.log(JSON.stringify({ scenes: dataset.scenes.length, candidates: dataset.scenes.length * 48, core_sha256: hash }));
  } else if (mode === 'replay') {
    const dataset = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    if (dataset.core_sha256 !== hash) throw Error('Simulator changed: regenerate data and retrain');
    const requests = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const rows = replay(S, dataset, requests);
    writeNew(path.resolve(args[2]), { core_sha256: hash, timestep_s: .04, rows });
    console.log(JSON.stringify({ replays: rows.length }));
  } else throw Error('Use: generate [new-data.json] | replay data.json requests.json new-result.json');
}
module.exports = { loadCore, rng, endpointCheck, features, makeDataset, simulate, replay, FEATURES };
