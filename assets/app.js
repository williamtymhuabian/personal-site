(() => {
  'use strict';
  const { profile, posts } = JSON.parse(document.getElementById('site-data').textContent);
  const main = document.getElementById('main');
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView({ behavior: 'instant' }); });
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-6-1-10 1Z"/>',
    archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M10 12h4"/>',
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9M10 8h4m-2-2v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
    moon: '<path d="M20.5 14a9 9 0 0 1-10.8-11A9.2 9.2 0 1 0 20.5 14Z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    pin: '<path d="m9 3 12 12-5 1-4 5-1-7-7-1 5-4Z"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11H3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
    history: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5M3 5h2m-2 4h2m-2 4h2m-2 4h2"/>',
    git: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 7v10m2-3c10 0 10-2 10-6"/>',
    note: '<path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8m-8 4h6"/>',
    github: '<path d="M9 19c-4 1-4-2-6-2m12 4v-3.5c0-1 .1-1.5-.5-2.2 3-.3 6-1.5 6-6a4.6 4.6 0 0 0-1.3-3.2 4.1 4.1 0 0 0-.1-3.1s-1.1-.3-3.4 1.2a12 12 0 0 0-6.4 0C7 2.7 5.9 3 5.9 3a4.1 4.1 0 0 0-.1 3.1 4.6 4.6 0 0 0-1.3 3.2c0 4.5 3 5.7 6 6-.6.7-.6 1.5-.5 2.2V21"/>',
  };
  const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.note}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = url => { try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : ''; } catch { return ''; } };
  const date = value => value.replaceAll('-', '.');
  const categories = [...new Set(posts.map(p => p.category))];
  const latestDate = posts.map(post => post.date).sort().at(-1);
  const categoryIcon = category => ({ '建站手记': 'git', '技术实践': 'code', '历史阅读': 'history', '随记': 'note' }[category] || 'note');
  const categoryStyle = category => ({ '建站手记': 'git', '技术实践': 'tech', '历史阅读': 'history', '随记': 'note' }[category] || 'note');
  const categoryUrl = category => `#/posts?category=${encodeURIComponent(category)}`;
  const navItems = [['/', 'home', '首页'], ['/posts', 'book', '全部手记'], ['/archives', 'archive', '文章归档'], ['/projects', 'code', '项目与实践'], ['/awards', 'award', '获奖经历'], ['/about', 'user', '关于我']];
  document.getElementById('main-nav').innerHTML = navItems.map(([route, symbol, label]) => `<a class="nav-link" href="#${route}" data-route="${route}">${icon(symbol)}<span>${label}</span></a>`).join('');
  document.getElementById('sidebar-socials').innerHTML = profile.socials.filter(s => safeUrl(s.url)).map(s => `<a class="social-icon" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${esc(s.name)} 主页">${icon(s.symbol)}</a>`).join('');
  document.getElementById('search-symbol').innerHTML = icon('search');
  document.getElementById('menu-toggle').innerHTML = icon('menu');
  document.querySelectorAll('.dialog-close').forEach(button => button.innerHTML = icon('close'));
  document.getElementById('copyright-year').textContent = new Date().getFullYear();

  function socials() {
    return `<div class="social-list">${profile.socials.map(s => safeUrl(s.url)
      ? `<a class="social-row" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${icon(s.symbol)}<strong>${esc(s.name)}</strong><span>${esc(s.label)} ↗</span></a>`
      : `<button class="social-row unconfigured" data-unconfigured="${esc(s.name)}">${icon(s.symbol)}<strong>${esc(s.name)}</strong><span>待添加</span></button>`).join('')}</div>`;
  }
  function postCard(post) {
    return `<article class="post-card"><a class="post-art ${categoryStyle(post.category)}" href="#/post/${esc(post.slug)}" aria-label="阅读：${esc(post.title)}">${icon(categoryIcon(post.category))}</a><div class="post-copy"><div class="post-kicker"><a href="${categoryUrl(post.category)}">${esc(post.category)}</a>${post.pinned ? `<span class="pin-label">${icon('pin')} 置顶</span>` : ''}</div><h3><a href="#/post/${esc(post.slug)}">${esc(post.title)}</a></h3><p class="post-summary">${esc(post.summary)}</p><div class="post-meta"><time datetime="${post.date}">${date(post.date)}</time><span>${post.readTime} 分钟阅读</span><span># ${esc(post.tags[0] || post.category)}</span><a class="read-arrow" href="#/post/${esc(post.slug)}" aria-label="阅读全文：${esc(post.title)}">↗</a></div></div></article>`;
  }
  function awardMini(award, index) {
    return `<button class="award-mini" data-award="${index}"><span class="award-mini-top"><span>${award.year}</span>${icon('award')}</span><h3>${esc(award.title)}</h3><span class="prize">${esc(award.prize)}<span aria-hidden="true">↗</span></span></button>`;
  }
  const orbitArt = `<svg class="orbit-art" viewBox="0 0 340 285" fill="none" aria-hidden="true"><defs><pattern id="grid" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".12"/></pattern></defs><rect x="10" y="5" width="320" height="270" fill="url(#grid)"/><circle cx="171" cy="141" r="104" class="diagram-fill"/><circle cx="171" cy="141" r="104" stroke="currentColor" opacity=".13"/><circle cx="171" cy="141" r="72" stroke="currentColor" opacity=".2" stroke-dasharray="3 7"/><path d="M47 141h250M171 17v248" class="diagram-line"/><path d="m102 192 69-101 71 101Z" stroke="currentColor" opacity=".5"/><circle cx="171" cy="91" r="17" class="diagram-paper" stroke="currentColor"/><path d="m165 91 4 4 8-8" stroke="currentColor" stroke-width="1.7"/><circle cx="102" cy="192" r="17" class="diagram-paper" stroke="currentColor"/><path d="m99 186-5 6 5 6m6-12 5 6-5 6" stroke="currentColor" stroke-width="1.4"/><circle cx="242" cy="192" r="17" class="diagram-paper" stroke="currentColor"/><path d="M236 185h12v14h-12zm3 4h6m-6 4h6" stroke="currentColor" stroke-width="1.2"/><rect x="143" y="50" width="56" height="20" rx="3" class="diagram-paper"/><text x="171" y="63" text-anchor="middle" class="diagram-title">好奇 / ASK</text><rect x="57" y="218" width="85" height="20" rx="3" class="diagram-paper"/><text x="99" y="231" text-anchor="middle" class="diagram-title">实践 / BUILD</text><rect x="202" y="218" width="81" height="20" rx="3" class="diagram-paper"/><text x="242" y="231" text-anchor="middle" class="diagram-title">记录 / WRITE</text><text x="171" y="149" text-anchor="middle" font-size="12" letter-spacing="3">STAY CURIOUS</text><text x="17" y="266">FIG. 01 — AN OPEN LOOP</text><circle cx="274" cy="120" r="4" fill="#b69a62"/><circle cx="70" cy="127" r="3" fill="currentColor" opacity=".4"/><path d="M298 44v12m-6-6h12" stroke="currentColor" opacity=".4"/></svg>`;

  function renderHome() {
    return `<section class="hero"><div class="hero-copy"><p class="eyebrow">A PERSONAL FIELD JOURNAL</p><h1>写代码，也读历史。<br>让好奇心，<em>留下痕迹。</em></h1><p class="hero-description">你好，我是 ${esc(profile.name)}，一名计算机专业的硕士研究生。<br>在这里记录技术实践、算法思考，还有对历史的好奇。<br>慢慢探索，也把走过的路写下来。</p><div class="hero-actions"><a class="primary-link" href="#/posts">翻开我的手记 ${icon('arrow')}</a><a class="text-link" href="#/about">认识一下 ${icon('external')}</a></div></div><div class="hero-art">${orbitArt}</div></section><div class="intro-strip"><span>${icon('book')} ${posts.length} 篇手记<span>·</span>${categories.length} 个分类<span>·</span>一个持续生长的知识角落</span><span class="intro-topics">COMPUTER SCIENCE / TECHNOLOGY / HISTORY</span><span>${icon('clock')} 最近更新 ${date(latestDate)}</span></div><div class="home-columns"><section><div class="section-heading"><h2>最近手记 <small>LATEST NOTES</small></h2><a href="#/posts">全部文章 ${icon('arrow')}</a></div><div>${posts.slice(0, 4).map(postCard).join('')}</div></section><aside class="home-aside" aria-label="手记分类与关注"><section class="side-section"><h2 class="side-title">${icon('folder')} 手记分类</h2><div class="category-list">${categories.map(c => `<a class="category-button" href="${categoryUrl(c)}"><span>${esc(c)}</span><span>${String(posts.filter(p => p.category === c).length).padStart(2, '0')}</span></a>`).join('')}</div></section><section class="side-section currently"><span class="tiny-label">ON MY RADAR / 关注中</span><p>技术怎样落地，<br>历史怎样被理解。</p><span>从一个小问题开始，<br>在实践和阅读中寻找答案。</span></section><section class="side-section"><h2 class="side-title">${icon('external')} 在别处找到我</h2>${socials()}</section></aside></div><section class="awards-preview"><div class="section-heading"><h2>走过的路 <small>SELECTED HONORS</small></h2><a href="#/awards">获奖经历 ${icon('arrow')}</a></div><div class="award-grid">${profile.awards.slice(0, 3).map(awardMini).join('')}</div></section>`;
  }
  function pageHeader(kicker, title, description) { return `<header class="page-header"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${description}</p></header>`; }
  function renderPosts(query) {
    const category = query.get('category') || '';
    const tag = query.get('tag') || '';
    const filtered = posts.filter(p => (!category || p.category === category) && (!tag || p.tags.includes(tag)));
    return `${pageHeader('THE NOTEBOOK', '全部手记', `把遇到的问题、做过的尝试和想明白的事，留在这里。${tag ? ` 当前标签：${esc(tag)}` : ''}`)}<div class="filter-bar"><a class="filter ${!category && !tag ? 'active' : ''}" href="#/posts">全部 ${posts.length}</a>${categories.map(c => `<a class="filter ${category === c ? 'active' : ''}" href="${categoryUrl(c)}">${esc(c)} ${posts.filter(p => p.category === c).length}</a>`).join('')}</div>${filtered.length ? filtered.map(postCard).join('') : '<p class="empty-state">这个分类还没有手记。<a href="#/posts">查看全部文章 →</a></p>'}`;
  }
  function renderArchives() {
    const years = [...new Set(posts.map(p => p.date.slice(0, 4)))].sort().reverse();
    return `${pageHeader('A TRAIL OF THOUGHTS', '文章归档', `沿着时间，回看每一次探索。目前共 ${posts.length} 篇手记。`)}${years.map(year => `<section class="archive-year"><h2>${year}</h2><div class="archive-list">${posts.filter(p => p.date.startsWith(year)).map(p => `<article class="archive-item"><time datetime="${p.date}">${p.date.slice(5).replace('-', '.')}</time><div><h3><a href="#/post/${p.slug}">${esc(p.title)}</a></h3><span class="tiny-label">${esc(p.category)}</span></div></article>`).join('')}</div></section>`).join('')}`;
  }
  function renderAwards(query) {
    const year = query.get('year') || '';
    const years = [...new Set(profile.awards.map(a => a.year))].sort().reverse();
    return `${pageHeader('MILESTONES ALONG THE WAY', '获奖经历', '一些来自算法竞赛、数学建模与团队创作的里程碑。这里选录已经核对证书的代表性奖项。')}<div class="filter-bar"><a class="filter ${!year ? 'active' : ''}" href="#/awards">全部年份</a>${years.map(y => `<a class="filter ${year === y ? 'active' : ''}" href="#/awards?year=${y}">${y}</a>`).join('')}</div>${profile.awards.map((a, index) => ({ ...a, index })).filter(a => !year || a.year === year).map(a => `<article class="award-row"><div class="award-emblem">${icon('award')}</div><div><h3>${esc(a.title)}</h3><p>${a.year}<span class="footer-dot">/</span>${esc(a.category)}</p></div><div class="award-row-prize">${esc(a.prize)}<button data-award="${a.index}">查看记录 ↗</button></div></article>`).join('') || '<p class="empty-state">这个年份尚无获奖记录。</p>'}`;
  }
  function renderProjects() {
    return `${pageHeader('LEARNING BY BUILDING', '项目与实践', '把想法变成能看见、能使用的东西。也给每一次团队实践，留一个位置。')}<article class="project-feature"><div class="project-visual"><div class="mini-browser" aria-hidden="true"><div class="mini-dots"><i></i><i></i><i></i></div><strong>${esc(profile.name)}<span style="color:var(--accent)">.</span></strong><p>让好奇心，留下痕迹。</p><div class="mini-lines"><i></i><i></i><i></i></div></div></div><div class="project-info"><span class="tiny-label">01 / PERSONAL WEBSITE</span><h2>探索手记 · 个人知识站</h2><p>汇集技术笔记、项目实践与获奖经历。用 Markdown 写作，把不同平台的内容连接回自己的小天地。</p><div class="project-tags"><span class="tag">静态博客</span><span class="tag">Markdown</span><span class="tag">GitHub Pages</span></div><a class="text-link" href="#/post/first-push">阅读建站与发布手记 ${icon('arrow')}</a></div></article><article class="project-note"><span class="tiny-label">02 / TEAM WORK · 2025</span><h2>汲古澄源 碧境新生——海洋水体富营养化修复系统</h2><p>团队作品，获第 18 届中国大学生计算机设计大赛全国二等奖，作品类别为数媒静态设计—产品设计专业组。项目介绍暂依据获奖证书整理，暂未展示代码仓库和个人分工。</p><button class="text-link" style="margin-top:13px" data-award="2">查看获奖记录 ${icon('arrow')}</button></article><div class="project-note"><h2>更多代码与探索</h2><p>持续积累的小项目和代码，可以到我的 GitHub 主页查看。</p><a class="text-link" style="margin-top:13px" href="${esc(safeUrl(profile.socials.find(s => s.name === 'GitHub')?.url))}" target="_blank" rel="noopener noreferrer">前往 GitHub ${icon('external')}</a></div>`;
  }
  function renderAbout() {
    return `${pageHeader('A LITTLE ABOUT ME', `你好，我是 ${esc(profile.name)}。`, '一名计算机研究生，也是一名对技术和历史都保持好奇的学习者。')}<div class="about-layout"><div class="about-prose"><p class="lead">在代码里解决问题，<br>在历史里多问一个为什么。</p><p>我正在攻读计算机科学与技术硕士。科研、技术学习和算法竞赛，是我经历的一部分；历史和新技术，是我愿意继续探索的话题。</p><h2>为什么有这本手记</h2><p>学习中总有一些值得记下来的瞬间：一个终于理解的概念，一次小实验，一段读完仍想追问的历史。我想给它们一个固定的地方，也在表达和分享中慢慢发现自己的能力。</p><p>这里会记录技术实践、算法思考与阅读笔记。我希望文章能把问题、过程和依据说清楚，也给不确定的地方留出继续探索的空间。</p><h2>从竞赛走向更长的探索</h2><p>我参与过程序设计、数学建模和团队作品竞赛。主页选录了 ICPC 南昌邀请赛银奖、蓝桥杯全国总决赛二等奖等获奖经历。接下来，也希望把实践积累整理成更容易理解、可以复用的内容。</p><a class="text-link" href="#/awards">查看获奖经历 ${icon('arrow')}</a><h2>在这里，也在别处</h2><p>GitHub 放代码，CSDN 写技术文章。这个网站是我的个人入口，也是一片可以慢慢整理、持续生长的小天地。</p><div class="about-socials">${socials()}</div></div><aside class="about-facts"><div class="avatar" aria-hidden="true">W<span>_</span></div><dl><div><dt>IDENTITY / 身份</dt><dd>计算机科学与技术<br>硕士研究生</dd></div><div><dt>INTERESTS / 兴趣</dt><dd>技术实践 · 算法<br>历史阅读 · 新技术</dd></div><div><dt>THIS SPACE / 这里</dt><dd>学习、实践、表达<br>每次积累一点点</dd></div></dl><p class="sidebar-motto">${esc(profile.motto)}<br><span>Stay curious. Keep building.</span></p></aside></div>`;
  }
  function renderArticle(slug) {
    const post = posts.find(p => p.slug === slug);
    if (!post) return notFound();
    document.title = `${post.title} — ${profile.name}`;
    return `<a href="#/posts" class="back-link">${icon('back')} 回到全部手记</a><article><header class="article-header"><div class="post-kicker"><a href="${categoryUrl(post.category)}">${esc(post.category)}</a></div><h1>${esc(post.title)}</h1><div class="post-meta"><span>${esc(profile.name)}</span><time datetime="${post.date}">${date(post.date)}</time><span>${post.readTime} 分钟阅读</span></div></header><div class="article-layout"><div><div class="article-body">${post.html}</div><div class="tag-cloud" style="margin-top:25px">${post.tags.map(t => `<a class="tag" href="#/posts?tag=${encodeURIComponent(t)}"># ${esc(t)}</a>`).join('')}</div><footer class="article-end"><span>感谢阅读。把探索，慢慢写下来。</span><a href="#/posts">继续翻阅 →</a></footer></div><aside class="article-aside" aria-label="文章目录"><h2>文章目录 / CONTENTS</h2>${post.headings.map(h => `<button class="toc-button" data-anchor="${esc(h.id)}">${esc(h.text)}</button>`).join('')}</aside></div></article>`;
  }
  function notFound() { return `<section class="route-not-found"><p class="eyebrow">A PAGE YET TO BE WRITTEN</p><h1>404</h1><p>这一页还没有写下。先回到手记首页吧。</p><a class="primary-link" href="#/">返回首页 ${icon('arrow')}</a></section>`; }
  function render() {
    const raw = location.hash.slice(1) || '/';
    const splitAt = raw.indexOf('?');
    const route = splitAt < 0 ? raw : raw.slice(0, splitAt);
    const query = new URLSearchParams(splitAt < 0 ? '' : raw.slice(splitAt + 1));
    document.title = profile.siteTitle;
    let html;
    if (route === '/') html = renderHome();
    else if (route === '/posts') html = renderPosts(query);
    else if (route === '/archives') html = renderArchives();
    else if (route === '/projects') html = renderProjects();
    else if (route === '/awards') html = renderAwards(query);
    else if (route === '/about') html = renderAbout();
    else if (route.startsWith('/post/')) html = renderArticle(route.slice(6));
    else html = notFound();
    main.innerHTML = html;
    const activeRoute = route.startsWith('/post/') ? '/posts' : route;
    document.getElementById('page-label').textContent = navItems.find(n => n[0] === activeRoute)?.[2] || '页面未找到';
    document.querySelectorAll('.nav-link').forEach(link => { const active = link.dataset.route === activeRoute; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('menu-toggle').setAttribute('aria-label', '展开导航');
    document.getElementById('menu-toggle').innerHTML = icon('menu');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.addEventListener('hashchange', () => { render(); main.focus({ preventScroll: true }); });

  const themeButton = document.getElementById('theme-toggle');
  function updateThemeButton() { const dark = document.documentElement.dataset.theme === 'dark'; themeButton.innerHTML = icon(dark ? 'sun' : 'moon'); themeButton.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题'); }
  themeButton.addEventListener('click', () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('william-theme', theme); } catch {} updateThemeButton(); });
  updateThemeButton();
  document.getElementById('menu-toggle').addEventListener('click', event => { const open = document.querySelector('.sidebar').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); event.currentTarget.setAttribute('aria-label', open ? '收起导航' : '展开导航'); event.currentTarget.innerHTML = icon(open ? 'close' : 'menu'); });

  const searchDialog = document.getElementById('search-dialog');
  const searchInput = document.getElementById('search-input');
  function updateSearch() {
    const keyword = searchInput.value.trim().toLocaleLowerCase();
    const results = keyword ? posts.filter(p => `${p.title} ${p.summary} ${p.category} ${p.tags.join(' ')} ${p.searchText}`.toLocaleLowerCase().includes(keyword)) : posts;
    document.getElementById('search-results').innerHTML = results.length ? results.map(p => `<a class="search-result" href="#/post/${p.slug}"><strong>${esc(p.title)}</strong><span>${esc(p.category)} · ${date(p.date)} · ${p.readTime} 分钟阅读</span></a>`).join('') : '<p class="search-empty">没有找到匹配的手记，换个关键词试试。</p>';
  }
  function openSearch() { if (searchDialog.open) return; searchInput.value = ''; updateSearch(); searchDialog.showModal(); searchInput.focus(); }
  document.getElementById('search-open').addEventListener('click', openSearch);
  searchInput.addEventListener('input', updateSearch);
  searchDialog.addEventListener('click', event => { if (event.target.closest('.search-result')) searchDialog.close(); });
  document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!document.getElementById('detail-dialog').open) openSearch(); } });
  document.querySelectorAll('dialog').forEach(dialog => { dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }); });
  let toastTimer;
  function toast(text) { const element = document.getElementById('toast'); element.textContent = text; element.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 3000); }
  document.addEventListener('click', event => {
    const award = event.target.closest('[data-award]');
    if (award) { const data = profile.awards[Number(award.dataset.award)]; if (!data) return; document.getElementById('detail-title').textContent = `${data.title} · ${data.prize}`; document.getElementById('detail-body').textContent = data.detail; document.getElementById('detail-dialog').showModal(); }
    const missing = event.target.closest('[data-unconfigured]');
    if (missing) toast(`${missing.dataset.unconfigured}主页尚未添加，之后会在这里与你见面。`);
    const anchor = event.target.closest('[data-anchor]');
    if (anchor) document.getElementById(anchor.dataset.anchor)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  render();
})();
