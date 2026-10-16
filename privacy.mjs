import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const fields = {
  profile: ['name', 'siteTitle', 'description', 'role', 'motto', 'socials', 'school', 'major', 'education', 'researchFocus', 'siteUrl', 'certificateContact'],
  social: ['name', 'label', 'url', 'symbol', 'handle'],
  contact: ['mode', 'githubIssueUrl', 'csdnUrl', 'email', 'douyinUrl'],
  award: ['id', 'year', 'title', 'prize', 'category', 'level', 'detail', 'kind', 'phase', 'featured'],
  project: ['id', 'title', 'year', 'type', 'status', 'description', 'tags', 'repoUrl', 'demoUrl', 'articleSlug', 'awardIds'],
};
function knownFields(object, type) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error(`${type} 必须为对象。`);
  for (const key of Object.keys(object)) if (!fields[type].includes(key)) throw new Error(`${type} 含未允许公开的字段：${key}。原件路径与核验资料请存入 .private。`);
}
function text(value, name) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} 需要填写文字。`); }
function id(value) { if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(value)) throw new Error('记录 id 只能使用小写英文、数字和短横线。'); }
function url(value, name, allowEmpty = true) {
  if (allowEmpty && value === '') return;
  try { if (typeof value !== 'string' || new URL(value).protocol !== 'https:') throw new Error(); }
  catch { throw new Error(`${name} 必须是完整 HTTPS 地址。`); }
}
function publicText(object) {
  const content = JSON.stringify(object);
  if (/(?:[A-Za-z]:\\|[A-Za-z]:\/Users\/|\\\\Users\\)/i.test(content.replaceAll('\\\\', '\\'))) throw new Error('公开数据含本地文件路径。');
  if (/(?<!\d)[1-9]\d{16}[\dXx](?!\d)/.test(content)) throw new Error('公开数据疑似含身份证号或长证件编号。');
  if (/(?<!\d)1[3-9]\d{9}(?!\d)/.test(content)) throw new Error('奖项或项目文字疑似含手机号，请先核对。');
}
export function validatePublicData({ profile, awards, projects }) {
  knownFields(profile, 'profile');
  for (const field of ['name', 'siteTitle', 'description', 'role', 'school', 'major', 'education']) text(profile[field], field);
  url(profile.siteUrl, 'siteUrl', false);
  if (!Array.isArray(profile.socials)) throw new Error('socials 需要为数组。');
  profile.socials.forEach(s => { knownFields(s, 'social'); text(s.name, '平台名'); url(s.url, s.name); if (s.handle !== undefined && typeof s.handle !== 'string') throw new Error('平台账号需要为文字。'); });
  knownFields(profile.certificateContact, 'contact');
  const contact = profile.certificateContact;
  if (contact.mode !== 'manual') throw new Error('本站仅支持人工审批，不能配置前端自动授权。');
  for (const key of ['githubIssueUrl', 'csdnUrl', 'douyinUrl']) url(contact[key], key);
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error('公开联系邮箱格式不正确。');
  if (!Array.isArray(awards) || !Array.isArray(projects)) throw new Error('奖项和项目需要为数组。');
  const ids = new Set();
  awards.forEach(a => {
    knownFields(a, 'award'); id(a.id);
    if (ids.has(a.id)) throw new Error(`奖项 id 重复：${a.id}`);
    ids.add(a.id);
    for (const key of ['year', 'title', 'prize', 'category', 'level', 'detail', 'phase']) text(a[key], `奖项 ${a.id} 的 ${key}`);
    if (!/^20\d{2}$/.test(a.year) && a.year !== '未注明') throw new Error(`奖项年份无效：${a.id}`);
    if (!['award', 'participation', 'certification', 'research'].includes(a.kind)) throw new Error(`奖项种类无效：${a.id}`);
    if (typeof a.featured !== 'boolean') throw new Error('featured 需要为 true 或 false。');
    publicText(a);
  });
  const projectIds = new Set();
  projects.forEach(p => {
    knownFields(p, 'project'); id(p.id);
    if (projectIds.has(p.id)) throw new Error(`项目 id 重复：${p.id}`);
    projectIds.add(p.id);
    for (const key of ['title', 'year', 'type', 'status', 'description']) text(p[key], `项目 ${p.id} 的 ${key}`);
    if (!Array.isArray(p.tags) || !p.tags.every(t => typeof t === 'string') || !Array.isArray(p.awardIds)) throw new Error(`项目标签和关联奖项需要为数组：${p.id}`);
    for (const awardId of p.awardIds) if (!ids.has(awardId)) throw new Error(`项目关联了不存在的奖项：${awardId}`);
    url(p.repoUrl, '项目代码地址'); url(p.demoUrl, '项目演示地址');
    publicText(p);
  });
}
export function validatePublishPaths(files) {
  for (const input of files) {
    const name = input.replaceAll('\\', '/');
    if (/(^|\/)(\.private|certificates|certificate-originals|获奖证书)(\/|$)|\.private\.(json|txt)$|证书|certificate(?!-request)/i.test(name)) throw new Error(`禁止将证书或私有索引放入公开发布文件：${name}`);
    if (/\.(pdf|docx?|heic|tiff?)$/i.test(name)) throw new Error(`公开站点不接收原始文档：${name}。请将核验材料保留在站点外。`);
    if (/\.(png|jpe?g|gif|webp)$/i.test(name) && !name.startsWith('assets/projects/')) throw new Error(`图片仅允许存放公开项目插图目录 assets/projects/：${name}。证书请勿放入该目录。`);
  }
}
async function publicFiles(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', '.private', 'node_modules', '.vscode', '.idea'].includes(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`公开项目不接受符号链接：${relative}`);
    if (entry.isDirectory()) found.push(...await publicFiles(path.join(directory, entry.name), relative));
    else found.push(relative);
  }
  return found;
}
export async function checkPublicFiles(root) {
  validatePublishPaths(await publicFiles(root));
  let tracked;
  try { tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean); }
  catch { return; }
  validatePublishPaths(tracked);
}
