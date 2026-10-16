import { approvedProofs } from './public-honors.mjs';

function fields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必须是对象。`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label} 含未允许公开的字段：${key}`);
}
function text(value, label) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空。`); }
function https(value) { if (value === '') return; if (typeof value !== 'string' || !/^https:\/\//.test(value) || new URL(value).protocol !== 'https:') throw new Error('论文链接必须是完整 HTTPS 地址。'); }
export function validatePortfolio({ papers, publicCertificates, community, awards }) {
  if (!Array.isArray(papers) || !Array.isArray(publicCertificates)) throw new Error('论文和公开副本需要为数组。');
  const ids = new Set();
  for (const paper of papers) {
    fields(paper, ['id','title','authors','year','venue','status','abstract','tags','doiUrl','pdfUrl','codeUrl','bibtex'], '论文');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(paper.id) || ids.has(paper.id)) throw new Error('论文 id 无效或重复。');
    ids.add(paper.id);
    for (const key of ['title','year','venue','abstract']) text(paper[key], `论文 ${key}`);
    if (!/^20\d{2}$/.test(paper.year) || !['published','preprint'].includes(paper.status)) throw new Error('论文年份或发表状态无效。');
    for (const key of ['authors','tags']) if (!Array.isArray(paper[key]) || !paper[key].length || !paper[key].every(v => typeof v === 'string' && v.trim())) throw new Error(`论文 ${key} 需要非空文字数组。`);
    for (const key of ['doiUrl','pdfUrl','codeUrl']) https(paper[key]);
    if (typeof paper.bibtex !== 'string') throw new Error('BibTeX 需要为文字。');
    if (/(?:^|["\s])[A-Za-z]:[\\/]|\\\\Users\\/i.test(JSON.stringify(paper))) throw new Error('论文数据不能含本地路径。');
  }
  const certIds = new Set();
  for (const proof of publicCertificates) {
    fields(proof, ['awardId','title','image','alt'], '公开证书');
    if (!awards.some(a => a.id === proof.awardId && /^(icpc|ccpc)-/.test(a.id)) || certIds.has(proof.awardId)) throw new Error('公开证书关联无效或重复。');
    certIds.add(proof.awardId);
    if (!(proof.image in approvedProofs) || proof.image !== `assets/public-honors/${proof.awardId}.webp`) throw new Error('仅允许已经审核的脱敏图片。');
    text(proof.title, '公开副本标题'); text(proof.alt, '公开副本说明');
  }
  fields(community, ['provider','repo','repoId','category','categoryId','enabled'], '交流设置');
  if (community.provider !== 'giscus' || community.repo !== 'williamtymhuabian/personal-site' || typeof community.enabled !== 'boolean') throw new Error('交流服务设置无效。');
  if (community.enabled && (!/^R_[a-zA-Z0-9_-]+$/.test(community.repoId) || !/^DIC_[a-zA-Z0-9_-]+$/.test(community.categoryId))) throw new Error('请先完成 Discussions 与 giscus 授权并填写真实分类 ID。');
}
