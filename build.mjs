import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { validatePublicData, checkPublicFiles } from './privacy.mjs';
import { validatePortfolio } from './portfolio-validation.mjs';
import { validateJourneys } from './journey-validation.mjs';
import { validateExplore } from './explore-validation.mjs';
import TopicModel from './assets/topic-model.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function inline(text) {
  const saved = [];
  const token = html => `\u0000${saved.push(html) - 1}\u0000`;
  let result = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => token(`<code>${code}</code>`));
  result = result.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
    const decoded = href.replaceAll('&amp;', '&');
    if (!/^https?:\/\//i.test(decoded)) return label;
    return token(`<a href="${escapeHtml(decoded)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return result.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)]);
}
function markdown(source) {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const html = [], headings = [];
  let paragraph = [], list = null, quote = [], code = [], fence = null, language = '';
  const flushParagraph = () => { if (paragraph.length) { html.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } };
  const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`); quote = []; } };
  const flush = () => { flushParagraph(); closeList(); flushQuote(); };
  for (const line of lines) {
    const marker = line.match(/^(`{3,}|~{3,})([\w+-]*)\s*$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) { html.push(`<pre><code class="language-${language}">${escapeHtml(code.join('\n'))}</code></pre>`); code = []; fence = null; }
      else code.push(line);
      continue;
    }
    if (marker) { flush(); fence = marker[1]; language = marker[2]; continue; }
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      const level = Math.max(2, heading[1].length);
      const id = `section-${headings.length + 1}`;
      if (level === 2) headings.push({ id, text: heading[2].replaceAll('`', '').replaceAll('**', '') });
      else headings.push({ id, text: heading[2].replaceAll('`', '').replaceAll('**', ''), sub: true });
      html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`); continue;
    }
    if (/^---+$/.test(line)) { flush(); html.push('<hr>'); continue; }
    if (line.startsWith('> ')) { flushParagraph(); closeList(); quote.push(line.slice(2)); continue; }
    flushQuote();
    const item = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (item) { flushParagraph(); const type = /^\d/.test(item[1]) ? 'ol' : 'ul'; if (list !== type) { closeList(); html.push(`<${type}>`); list = type; } html.push(`<li>${inline(item[2])}</li>`); continue; }
    closeList(); paragraph.push(line.trim());
  }
  flush();
  if (fence) throw new Error('文章的代码块没有闭合。');
  return { html: html.join('\n'), headings: headings.filter(h => !h.sub) };
}
async function build() {
  const profile = JSON.parse(await readFile(path.join(root, 'profile.json'), 'utf8'));
  const awards = JSON.parse(await readFile(path.join(root, 'data', 'awards.json'), 'utf8'));
  const projects = JSON.parse(await readFile(path.join(root, 'data', 'projects.json'), 'utf8'));
  const papers = JSON.parse(await readFile(path.join(root, 'data', 'papers.json'), 'utf8'));
  const publicCertificates = JSON.parse(await readFile(path.join(root, 'data', 'public-certificates.json'), 'utf8'));
  const community = JSON.parse(await readFile(path.join(root, 'data', 'community.json'), 'utf8'));
  const journeys = JSON.parse(await readFile(path.join(root, 'data', 'journeys.json'), 'utf8'));
  const fields = JSON.parse(await readFile(path.join(root, 'data', 'fields.json'), 'utf8'));
  const friends = JSON.parse(await readFile(path.join(root, 'data', 'friends.json'), 'utf8'));
  const ccfCatalog = JSON.parse(await readFile(path.join(root, 'data', 'ccf-catalog.json'), 'utf8'));
  validateExplore({ fields, friends, ccfCatalog });
  validatePublicData({ profile, awards, projects });
  validatePortfolio({ papers, publicCertificates, community, awards });
  validateJourneys(journeys, awards);
  await checkPublicFiles(root);
  const directory = path.join(root, 'content');
  const files = (await readdir(directory)).filter(f => f.endsWith('.md')).sort();
  const posts = [];
  for (const filename of files) {
    const raw = (await readFile(path.join(directory, filename), 'utf8')).replaceAll('\r\n', '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${filename} 缺少文章信息区。`);
    const meta = Object.fromEntries(match[1].split('\n').filter(l => l.trim()).map(line => { const i = line.indexOf(':'); if (i < 1) throw new Error(`${filename} 的文章信息格式有误：${line}`); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }));
    for (const field of ['title', 'date', 'category', 'summary']) if (!meta[field]) throw new Error(`${filename} 缺少 ${field}。`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || Number.isNaN(Date.parse(meta.date))) throw new Error(`${filename} 日期须为 YYYY-MM-DD。`);
    const slug = filename.slice(0, -3);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`文章文件名请用小写英文、数字和短横线：${filename}`);
    const rendered = markdown(match[2]);
    posts.push({ slug, ...meta, tags: (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean), pinned: meta.pinned === 'true', readTime: Math.max(1, Math.ceil(match[2].length / 500)), searchText: match[2].replace(/[#*`~>]/g, ''), markdown: match[2], ...rendered });
  }
  if (!posts.length) throw new Error('请至少保留一篇文章。');
  posts.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const template = await readFile(path.join(root, 'src', 'template.html'), 'utf8');
  const communityEntries=TopicModel.entries({profile,posts,projects,papers,fields,journeys,ccfCatalog});
  if(new Set(communityEntries.map(e=>e.key)).size!==communityEntries.length)throw new Error('交流话题标识重复。');
  const communityHashes=Object.fromEntries(communityEntries.map(e=>[e.key,createHash('sha1').update(TopicModel.term(e.key)).digest('hex')]));
  const serialized = JSON.stringify({ profile: { ...profile, awards }, posts, projects, papers, publicCertificates, community, journeys, fields, friends, ccfCatalog, communityHashes }).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const assetHash = createHash('sha256');
  for (const file of ['app.js', 'lab.js', 'background.js', 'computer-labs.js', 'portfolio.js', 'honors.js', 'honors.css', 'style.css', 'computer-labs.css', 'portfolio.css', 'journeys.js', 'journeys.css', 'field-labs.js', 'research-desk.js', 'explore.css', 'topic-model.js', 'community.js', 'community.css']) assetHash.update(await readFile(path.join(root, 'assets', file)));
  const replacements = { TITLE: escapeHtml(profile.siteTitle), DESCRIPTION: escapeHtml(profile.description), NAME: escapeHtml(profile.name), ROLE: profile.role.split(' · ').map(escapeHtml).join('<br>'), MOTTO: escapeHtml(profile.motto), SITE_DATA: serialized, ASSET_VERSION: assetHash.digest('hex').slice(0, 10) };
  const html = template.replace(/\{\{(TITLE|DESCRIPTION|NAME|ROLE|MOTTO|SITE_DATA|ASSET_VERSION)\}\}/g, (_, key) => replacements[key]);
  await writeFile(path.join(root, 'index.html'), html, 'utf8');
  const siteUrl = profile.siteUrl.replace(/\/?$/, '/');
  const xml = value => String(value).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
  const chronological = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${xml(profile.siteTitle)}</title><link>${xml(siteUrl)}</link><description>${xml(profile.description)}</description><language>zh-cn</language><atom:link href="${xml(siteUrl)}feed.xml" rel="self" type="application/rss+xml"/>${chronological.map(post => `<item><title>${xml(post.title)}</title><link>${xml(siteUrl)}#/post/${post.slug}</link><guid isPermaLink="true">${xml(siteUrl)}#/post/${post.slug}</guid><pubDate>${new Date(`${post.date}T00:00:00+08:00`).toUTCString()}</pubDate><description>${xml(post.summary)}</description><content:encoded>${xml(post.html)}</content:encoded></item>`).join('')}</channel></rss>\n`;
  await writeFile(path.join(root, 'feed.xml'), rss, 'utf8');
  console.log(`公开数据检查通过。已生成 ${posts.length} 篇文章、${awards.length} 条经历、${projects.length} 个项目和 RSS 订阅。`);
}
await build();
if (process.argv.includes('--serve')) {
  const port = Number(process.env.PORT || 4173);
  const allowed = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/feed.xml', ['feed.xml', 'application/rss+xml; charset=utf-8']], ['/assets/app.js', ['assets/app.js', 'text/javascript; charset=utf-8']], ['/assets/lab.js', ['assets/lab.js', 'text/javascript; charset=utf-8']], ['/assets/background.js', ['assets/background.js', 'text/javascript; charset=utf-8']], ['/assets/style.css', ['assets/style.css', 'text/css; charset=utf-8']], ['/assets/favicon.svg', ['assets/favicon.svg', 'image/svg+xml']]]);
  for (const file of ['computer-labs.js','portfolio.js','honors.js','computer-labs.css','portfolio.css','honors.css','journeys.js','journeys.css','field-labs.js','research-desk.js','explore.css', 'topic-model.js', 'community.js', 'community.css']) allowed.set('/assets/' + file, ['assets/' + file, file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8']);
  const publicProofs = JSON.parse(await readFile(path.join(root, 'data', 'public-certificates.json'), 'utf8'));
  for (const proof of publicProofs) for (const item of proof.items) allowed.set('/' + item.image, [item.image, 'image/webp']);
  const journeys = JSON.parse(await readFile(path.join(root, 'data', 'journeys.json'), 'utf8'));
  for (const stop of journeys) for (const event of stop.events) for (const photo of event.photos) allowed.set('/' + photo.image, [photo.image, 'image/webp']);
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const entry = allowed.get(pathname);
    if (!entry || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end('Not found'); return; }
    try { const content = await readFile(path.join(root, entry[0])); response.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' }); response.end(request.method === 'HEAD' ? undefined : content); }
    catch { response.writeHead(500); response.end('Unable to load file'); }
  });
  server.on('error', error => { console.error(`预览服务启动失败：${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}\n按 Ctrl+C 停止。修改文章后重新执行 node build.mjs，再刷新网页。`));
}
