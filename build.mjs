import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

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
    posts.push({ slug, ...meta, tags: (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean), pinned: meta.pinned === 'true', readTime: Math.max(1, Math.ceil(match[2].length / 500)), searchText: match[2].replace(/[#*`~>]/g, ''), ...rendered });
  }
  if (!posts.length) throw new Error('请至少保留一篇文章。');
  posts.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const template = await readFile(path.join(root, 'src', 'template.html'), 'utf8');
  const serialized = JSON.stringify({ profile, posts }).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const replacements = { TITLE: escapeHtml(profile.siteTitle), DESCRIPTION: escapeHtml(profile.description), NAME: escapeHtml(profile.name), ROLE: escapeHtml(profile.role).replace(' · ', '<br>'), MOTTO: escapeHtml(profile.motto), SITE_DATA: serialized };
  const html = template.replace(/\{\{(TITLE|DESCRIPTION|NAME|ROLE|MOTTO|SITE_DATA)\}\}/g, (_, key) => replacements[key]);
  await writeFile(path.join(root, 'index.html'), html, 'utf8');
  console.log(`已生成 index.html：${posts.length} 篇文章，${profile.awards.length} 条获奖记录。`);
}
await build();
if (process.argv.includes('--serve')) {
  const port = Number(process.env.PORT || 4173);
  const allowed = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/index.html', ['index.html', 'text/html; charset=utf-8']], ['/assets/app.js', ['assets/app.js', 'text/javascript; charset=utf-8']], ['/assets/style.css', ['assets/style.css', 'text/css; charset=utf-8']], ['/assets/favicon.svg', ['assets/favicon.svg', 'image/svg+xml']]]);
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
