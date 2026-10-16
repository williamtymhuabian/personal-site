(() => {
  'use strict';
  const { profile, posts, projects } = JSON.parse(document.getElementById('site-data').textContent);
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
    robot: '<rect x="5" y="6" width="14" height="13" rx="4"/><path d="M12 2v4M2 10h3m14 0h3M8 19v3m8-3v3M9 15h6"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
    rss: '<path d="M4 4a16 16 0 0 1 16 16M4 11a9 9 0 0 1 9 9"/><circle cx="5" cy="19" r="1"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
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
  const navItems = [['/', 'home', '首页'], ['/labs', 'code', '计算机实验室'], ['/papers', 'note', '论文与研究'], ['/posts', 'book', '全部手记'], ['/projects', 'code', '项目与实践'], ['/awards', 'award', '竞赛与成果'], ['/journeys', 'pin', '竞赛足迹'], ['/publish', 'rss', '发布与订阅'], ['/community', 'github', '留言与交流'], ['/favorites', 'folder', '我的收藏'], ['/archives', 'archive', '文章归档'], ['/about', 'user', '关于我']];
  document.getElementById('main-nav').innerHTML = navItems.map(([route, symbol, label]) => `<a class="nav-link" href="#${route}" data-route="${route}">${icon(symbol)}<span>${label}</span></a>`).join('');
  document.getElementById('sidebar-socials').innerHTML = profile.socials.filter(s => safeUrl(s.url)).map(s => `<a class="social-icon" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${esc(s.name)} 主页">${icon(s.symbol)}</a>`).join('');
  document.getElementById('search-symbol').innerHTML = icon('search');
  document.getElementById('menu-toggle').innerHTML = icon('menu');
  document.querySelectorAll('.dialog-close').forEach(button => button.innerHTML = icon('close'));
  document.getElementById('copyright-year').textContent = new Date().getFullYear();

  function socials() {
    return `<div class="social-list">${profile.socials.map(s => safeUrl(s.url)
      ? `<a class="social-row" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${icon(s.symbol)}<strong>${esc(s.name)}</strong><span>${esc(s.label)} ↗</span></a>`
      : s.handle ? `<button class="social-row" data-copy-social="${esc(s.name)}">${icon(s.symbol)}<strong>${esc(s.name)}</strong><span>${esc(s.label)}</span></button>`
      : `<button class="social-row unconfigured" data-unconfigured="${esc(s.name)}">${icon(s.symbol)}<strong>${esc(s.name)}</strong><span>待添加</span></button>`).join('')}</div>`;
  }
  function postCard(post) {
    return `<article class="post-card"><a class="post-art ${categoryStyle(post.category)}" href="#/post/${esc(post.slug)}" aria-label="阅读：${esc(post.title)}">${icon(categoryIcon(post.category))}</a><div class="post-copy"><div class="post-kicker"><a href="${categoryUrl(post.category)}">${esc(post.category)}</a>${post.pinned ? `<span class="pin-label">${icon('pin')} 置顶</span>` : ''}</div><h3><a href="#/post/${esc(post.slug)}">${esc(post.title)}</a></h3><p class="post-summary">${esc(post.summary)}</p><div class="post-meta"><time datetime="${post.date}">${date(post.date)}</time><span>${post.readTime} 分钟阅读</span><span># ${esc(post.tags[0] || post.category)}</span>${window.Portfolio.actions('post:' + post.slug, {compact:true})}<a class="read-arrow" href="#/post/${esc(post.slug)}" aria-label="阅读全文：${esc(post.title)}">↗</a></div></div></article>`;
  }
  function awardMini(award) {
    return `<button class="award-mini" data-award="${esc(award.id)}"><span class="award-mini-top"><span>${award.year}</span>${icon('award')}</span><h3>${esc(award.title)}</h3><span class="prize">${esc(award.prize)}<span aria-hidden="true">↗</span></span></button>`;
  }
  function renderHome() {
    const selected = profile.awards.filter(a => a.featured && a.kind === 'award').slice(0, 3);
    return `<section class="hero hero-interactive"><div class="hero-copy"><p class="eyebrow">COMPUTER SCIENCE / EXPLORE & BUILD</p><h1>在计算的世界里，<br><em>保持探索。</em></h1><p class="hero-description">你好，我是 ${esc(profile.name)}。<br>${esc(profile.school)} · ${esc(profile.major)} · ${esc(profile.education)}<br>研究具身智能与 VLN，探索算法、人工智能与计算机系统。</p><a class="current-study-link" href="#/about?section=education">当前 · 苏州大学硕士在读 / 完整经历 ↗</a><div class="hero-actions"><a class="primary-link" href="#/labs">进入计算机实验室 ${icon('code')}</a><a class="text-link" href="#/posts">翻开手记 ${icon('arrow')}</a></div><div class="hero-research-tags"><span>算法与系统</span><span>AI / VLN</span><span>交互式学习</span></div></div><div class="hero-art"><div class="compute-feature"><div class="compute-feature-top"><span>COMPUTING FIELD / LIVE</span><i></i></div><div class="compute-orbit" aria-hidden="true"><span class="compute-ring r1"></span><span class="compute-ring r2"></span><span class="compute-ring r3"></span><span class="compute-core">W<span>COMPUTE / CONNECT</span></span><span class="compute-node n1">AI</span><span class="compute-node n2">SYS</span><span class="compute-node n3">ALG</span></div><p>每个问题，都是一个入口。</p><div class="compute-feature-bottom"><span>3 个新实验 · 保留具身导航</span><a href="#/labs">开始探索 ↗</a></div></div></div></section>
    <div class="intro-strip"><span>${icon('book')} ${posts.length} 篇手记<span>·</span>${profile.awards.filter(a => a.kind === 'award').length} 项竞赛获奖<span>·</span>${projects.length} 个项目记录</span><span class="intro-topics">ALGORITHMS / AI / SYSTEMS</span><span>${icon('clock')} 最近更新 ${date(latestDate)}</span></div>
    <div class="home-columns"><section><div class="section-heading"><h2>最近手记 <small>LATEST NOTES</small></h2><a href="#/posts">全部文章 ${icon('arrow')}</a></div><div>${posts.slice(0, 4).map(postCard).join('')}</div><a class="subscribe-inline" href="./feed.xml">${icon('rss')} 订阅最新手记 <span>RSS ↗</span></a></section>
    <aside class="home-aside" aria-label="手记分类与关注"><section class="side-section"><h2 class="side-title">${icon('folder')} 手记分类</h2><div class="category-list">${categories.map(c => `<a class="category-button" href="${categoryUrl(c)}"><span>${esc(c)}</span><span>${String(posts.filter(p => p.category === c).length).padStart(2, '0')}</span></a>`).join('')}</div></section>
    <section class="side-section currently"><span class="tiny-label">RESEARCH DIRECTION / 研究兴趣</span><p>具身智能<br>在行动中理解世界。</p><span>从一个可运行的小实验开始，<br>记录问题、过程与真实结果。</span><a class="text-link" href="#/lab" style="margin-top:12px">进入交互实验室 ↗</a></section><section class="side-section"><h2 class="side-title">${icon('external')} 在别处找到我</h2>${socials()}</section></aside></div>
    <section class="home-labs"><div class="section-heading"><h2>动手理解计算 <small>COMPUTER LABS</small></h2><a href="#/labs">全部实验 ↗</a></div><div class="lab-discovery-grid"><a href="#/labs?lab=sorting"><span>01 / ALGORITHMS</span><h3>让排序过程可见</h3><p>单步观察比较和交换，看看算法怎样推进。</p><strong>排序算法 ↗</strong></a><a href="#/labs?lab=neural"><span>02 / AI</span><h3>从输入到激活</h3><p>调节输入和权重，理解感知机的输出。</p><strong>神经网络 ↗</strong></a><a href="#/labs?lab=network"><span>03 / SYSTEMS</span><h3>追踪一个数据包</h3><p>改变网络链路，观察路由如何响应。</p><strong>计算机网络 ↗</strong></a></div></section><a class="journey-home-link" href="#/journeys"><div><strong>把竞赛，连成一幅足迹。</strong><p>西安、武汉、南昌、福州、长春、杭州，收藏赛场之外的见闻。</p></div><span>打开城市地图 ↗</span></a><section class="awards-preview"><div class="section-heading"><h2>走过的路 <small>SELECTED HONORS</small></h2><a href="#/awards">全部竞赛与成果 ${icon('arrow')}</a></div><div class="award-grid">${selected.map(awardMini).join('')}</div></section>`;
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
  const kindNames = { award: '竞赛获奖', participation: '参赛记录', certification: '专业认证', research: '科研成果' };
  function renderAwards(query) {
    const year = query.get('year') || '', kind = query.get('kind') || '', category = query.get('category') || '', record = query.get('record') === 'math-hubei-2023' ? 'math-national-2023' : query.get('record') || '';
    const keyword = query.get('q') || '';
    const years = [...new Set(profile.awards.map(a => a.year))].sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
    const awardCategories = [...new Set(profile.awards.map(a => a.category))];
    const filtered = profile.awards.filter(a => (!year || a.year === year) && (!kind || a.kind === kind) && (!category || a.category === category) && (!record || a.id === record) && (!keyword || `${a.title} ${a.prize} ${a.detail} ${a.category}`.toLowerCase().includes(keyword.toLowerCase())));
    const link = changes => { const next = new URLSearchParams(query); next.delete('record'); for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key); return '#/awards' + (next.size ? '?' + next : ''); };
    return `${pageHeader('MILESTONES & EVIDENCE', '竞赛、成果与成长记录', '当前就读苏州大学。历史竞赛按获奖时的赛事、赛段与组别整理；同一奖项的重复证明合并，参赛与认证单独列示。')}
    <div class="honor-stats">${Object.entries(kindNames).map(([key, label]) => `<a href="${link({ kind: key })}"><strong>${profile.awards.filter(a => a.kind === key).length}</strong><span>${label}</span></a>`).join('')}</div>
    <div class="evidence-banner"><div>${icon('award')}<div><strong>算法竞赛材料，完整展示。</strong><p>ICPC / CCPC 证书与奖牌保留原有竞赛信息；其他未公开材料继续按需申请核验。</p></div></div><button class="text-link" data-request="general">了解申请方式 ↗</button></div>
    <div class="filter-bar"><a class="filter ${!kind ? 'active' : ''}" href="${link({ kind: '' })}">全部经历</a>${Object.entries(kindNames).map(([key, label]) => `<a class="filter ${kind === key ? 'active' : ''}" href="${link({ kind: key })}">${label}</a>`).join('')}</div>
    <div class="honor-tools"><div class="year-filters"><a class="filter ${!year ? 'active' : ''}" href="${link({ year: '' })}">全部年份</a>${years.map(y => `<a class="filter ${year === y ? 'active' : ''}" href="${link({ year: y })}">${esc(y)}</a>`).join('')}</div><label class="sr-only" for="award-category">按领域筛选</label><select id="award-category"> <option value="">全部领域</option>${awardCategories.map(c => `<option value="${esc(c)}" ${c === category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <form id="award-search-form" class="award-search"><label class="sr-only" for="award-search-input">搜索赛事、名次或项目</label><input id="award-search-input" type="search" value="${esc(keyword)}" placeholder="搜索赛事、名次或项目名称"><button type="submit">搜索</button>${record || keyword || category ? '<a class="text-link" href="#/awards">清除筛选</a>' : ''}</form><p class="result-count">显示 ${filtered.length} 条记录${kind ? ' · ' + kindNames[kind] : ''}</p>
    ${window.Portfolio.certificateGallery(filtered.map(a => a.id))}<div class="award-records">${filtered.map(a => `<article class="award-row" id="record-${a.id}"><div class="award-emblem">${icon(a.kind === 'research' ? 'code' : 'award')}</div><div><div class="award-kicker">${esc(a.year)} / ${esc(a.category)} / ${esc(kindNames[a.kind])}</div><h3>${esc(a.title)}</h3><p>${esc(a.level)}<span class="footer-dot">·</span>${esc(a.phase)}</p></div><div class="award-row-prize"><strong>${esc(a.prize)}</strong><div class="award-actions"><button data-award="${a.id}">记录详情</button>${window.Portfolio.certificateButton(a.id)}${window.Journeys.awardLink(a.id)}<button data-request="${a.id}">申请原件 ↗</button></div></div></article>`).join('') || '<p class="empty-state">没有匹配的记录。可以清除筛选，或换个关键词。</p>'}</div>
    <div class="project-note"><h2>下一阶段，继续探索。</h2><p>苏州大学研究生阶段的竞赛、具身智能实践与有意思的新项目，会在这里继续更新。</p><a class="text-link" href="#/projects" style="margin-top:12px">看看项目与实践 ↗</a></div>`;
  }

  function renderProjects() {
    return `${pageHeader('LEARNING BY BUILDING', '项目与实践', '从竞赛作品到具身智能探索，把想法变成可以观察、讨论与复现的实践。')}
    <a class="lab-project-prompt" href="#/labs"><div>${icon('code')}<span><strong>计算机交互实验室</strong><small>算法、神经网络与网络路由，从操作中理解计算。</small></span></div><span>动手试试 ↗</span></a>
    <div class="projects-list">${projects.map((project, index) => `<article class="project-entry"><div class="project-entry-top"><span class="tiny-label">${String(index + 1).padStart(2, '0')} / ${esc(project.year)} · ${esc(project.type)}</span><span class="project-status">${esc(project.status)}</span></div><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="project-tags">${project.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div><div class="project-links">${safeUrl(project.repoUrl) ? `<a class="text-link" href="${esc(safeUrl(project.repoUrl))}" target="_blank" rel="noopener noreferrer">代码仓库 ${icon('github')}</a>` : ''}${safeUrl(project.demoUrl) ? `<a class="text-link" href="${esc(safeUrl(project.demoUrl))}" target="_blank" rel="noopener noreferrer">在线访问 ${icon('external')}</a>` : ''}${project.articleSlug ? `<a class="text-link" href="#/post/${esc(project.articleSlug)}">项目手记 ${icon('book')}</a>` : ''}${window.Portfolio.actions('project:' + project.id, {compact:true})}${project.awardIds.map(id => { const award = profile.awards.find(a => a.id === id); return `<button class="project-award-link" data-award="${id}">${esc(award.prize)} ↗</button>`; }).join('')}</div></article>`).join('')}</div>
    <div class="project-note"><h2>接下来：研究生阶段的新实践</h2><p>具身智能小实验、竞赛作品、读论文时跑通的代码，都可以成为新的项目记录。后续会补充经过整理的代码、演示与文章。</p><a class="text-link" style="margin-top:13px" href="${esc(safeUrl(profile.socials.find(s => s.name === 'GitHub')?.url))}" target="_blank" rel="noopener noreferrer">更多探索在 GitHub ${icon('external')}</a></div>`;
  }

  function educationMarkup() {
    return `<section id="education-history" class="education-history" aria-labelledby="education-heading"><h2 id="education-heading">教育经历</h2>${profile.educationHistory.map(entry => `<div class="education-step"><span>${esc(entry.start.replace('-', '.'))} — ${entry.current ? '至今' : esc(entry.end.replace('-', '.'))}</span><h3>${esc(entry.school)}${entry.current ? '<small class="education-current">当前在读</small>' : ''}</h3><p>${esc(entry.degree)} · ${esc(entry.major)}</p></div>`).join('')}</section>`;
  }
  function renderAbout() {
    return `${pageHeader('A LITTLE ABOUT ME', `你好，我是 ${esc(profile.name)}。`, `${esc(profile.school)} · ${esc(profile.major)} · ${esc(profile.education)}`)}<div class="about-layout"><div class="about-prose"><p class="lead">让智能走进世界，<br>让每次探索留下痕迹。</p><p>我在${esc(profile.school)}攻读${esc(profile.major)}硕士，当前关注${esc(profile.researchFocus)}。科研、技术学习和算法竞赛，是我的经历；历史和新技术，是我愿意继续探索的话题。</p>${educationMarkup()}<h2>从竞赛走向更长的探索</h2><p>这里整理了过往的程序设计、数学建模、信息安全和团队创作经历。历史奖项保留原有赛事与组别，后续也会继续更新研究生阶段的竞赛与项目。</p><a class="text-link" href="#/awards">查看竞赛与成果 ${icon('arrow')}</a><h2>用实践理解具身智能</h2><p>感知、决策与行动怎样连接？一个想法怎样在环境中得到反馈？我希望从具体的小实验开始，把问题、方法和结果写清楚。站内实验室提供一个可操作的二维导航示意，欢迎动手试试。</p><a class="text-link" href="#/lab">进入交互实验室 ${icon('robot')}</a><h2>文章、项目与核验申请</h2><p>GitHub 放代码，CSDN 分享技术文章，这个网站汇集自己的手记与实践。ICPC、CCPC 的证书与奖牌按本人选择完整展示竞赛信息；其他材料如需核验，可通过邮箱、GitHub 或 CSDN 提交用途，由我人工决定是否提供。</p><button class="text-link" data-request="general">申请核验材料 ${icon('arrow')}</button><h2>在别处找到我</h2><div class="about-socials">${socials()}<a class="social-row" href="mailto:${esc(profile.certificateContact.email)}">${icon('mail')}<strong>联系邮箱</strong><span>${esc(profile.certificateContact.email)}</span></a></div></div><aside class="about-facts"><div class="avatar" aria-hidden="true">W<span>_</span></div><dl><div><dt>UNIVERSITY / 学校</dt><dd>${esc(profile.school)}</dd></div><div><dt>ACADEMIC / 专业与阶段</dt><dd>${esc(profile.major)}<br>${esc(profile.education)}</dd></div><div><dt>RESEARCH / 关注方向</dt><dd>${esc(profile.researchFocus)}</dd></div><div><dt>INTERESTS / 兴趣</dt><dd>算法与技术实践<br>历史阅读</dd></div></dl><p class="sidebar-motto">${esc(profile.motto)}<br><span>Stay curious. Keep building.</span></p><a class="text-link" href="./feed.xml">${icon('rss')} 订阅最新手记</a></aside></div>`;
  }
  function renderComputerLabs() {
    return `${pageHeader('ALGORITHMS / AI / SYSTEMS', '计算机 · 交互实验室', '不只读结论。改变输入、观察过程，在可操作的小实验中理解计算。')}<div class="lab-hub-intro"><div><span class="tiny-label">03 NEW LABS / HANDS ON</span><h2>算法怎样运行？智能怎样计算？网络怎样连接？</h2><p>三个可交互的教学实验，分别从算法、人工智能与计算机系统切入。</p></div><a class="text-link" href="#/lab">保留实验：具身导航 ↗</a></div>${window.ComputerLabs.markup()}<div class="lab-bookmark-row">${['sorting','neural','network'].map((id,i) => `<div><span>${['排序算法','神经网络','网络路由'][i]}</span>${window.Portfolio.actions('lab:' + id,{compact:true})}</div>`).join('')}</div>`;
  }
  function renderLab() {
    return `${pageHeader('PERCEIVE / PLAN / ACT', '具身智能 · 交互实验室', '给机器人一个目标，改变环境，再观察行动如何发生。先从一个小实验，理解环境、规划与反馈之间的联系。')}<div class="lab-page-layout"><div>${window.EmbodiedLab.markup()}</div><aside class="lab-notes"><p class="tiny-label">TRY IT YOURSELF</p><h2>给它一个目标。</h2><ol><li>点击空白格设置目标。</li><li>点击“规划并移动”。</li><li>编辑障碍，再试一次。</li></ol><h3>这里可以观察什么？</h3><p>障碍会改变最短路径；目标被包围时，机器人会报告不可达。你也可以聚焦地图后，用方向键手动移动。</p><h3>实验的边界</h3><p>已知地图上的 BFS 导航演示，只用于交互解释。它不代表真实机器人控制、强化学习训练或个人科研成果。</p><a class="text-link" href="#/projects">更多项目与实践 ↗</a></aside></div>`;
  }
  function renderPublish(query) {
    const selected = posts.find(p => p.slug === query.get('post')) || posts[0];
    return `${pageHeader('WRITE ONCE / REVIEW / SHARE', '文章发布助手与订阅', '把站内文章整理成 CSDN、小红书和抖音草稿。先检查内容与素材，再由你确认发布。')}
    <section class="subscribe-panel"><div>${icon('rss')}<div><h2>持续订阅新手记</h2><p>将订阅地址添加到 RSS 阅读器，网站更新文章后可获取新内容。</p></div></div><a class="primary-link" href="./feed.xml">打开 RSS 订阅 ↗</a><button class="text-link" data-copy-feed>复制订阅地址</button></section>
    <div class="publish-layout"><div><label class="field-label" for="publish-post">选择站内文章</label><select id="publish-post">${posts.map(p => `<option value="${p.slug}" ${p === selected ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select><div class="publish-platforms" role="group" aria-label="选择发布平台"><button class="filter active" data-publish-platform="csdn" aria-pressed="true">CSDN</button><button class="filter" data-publish-platform="xiaohongshu" aria-pressed="false">小红书</button><button class="filter" data-publish-platform="douyin" aria-pressed="false">抖音</button></div><label class="field-label" for="publish-output">发布草稿 <span id="publish-format">Markdown 正文</span></label><textarea id="publish-output" class="publish-output" readonly></textarea><div class="publish-actions"><button class="primary-link" id="copy-publish">复制发布稿</button><button class="text-link" id="download-publish">下载草稿 ↓</button><a class="text-link" id="publish-original" href="#/post/${selected.slug}">查看原文 ↗</a></div></div><aside class="publish-notes"><h2>你确认，再发布。</h2><p>CSDN 草稿保留 Markdown 正文；小红书整理为短文结构；抖音整理为口播与画面建议。草稿来自当前公开文章，仍需要人工校对。</p><ol><li>确认标题、事实与引用。</li><li>补充自己的截图或演示。</li><li>到对应平台编辑并发布。</li></ol><a class="social-row" href="https://blog.csdn.net/Williamtym" target="_blank" rel="noopener noreferrer">${icon('code')}<strong>我的 CSDN</strong><span>访问主页 ↗</span></a><button class="social-row" data-copy-social="小红书">${icon('book')}<strong>小红书 · 哗变</strong><span>复制账号</span></button><button class="social-row" data-copy-social="抖音">${icon('video')}<strong>抖音 · williamtym</strong><span>复制账号</span></button><p class="publish-footnote">本助手不会登录账号或自动提交文章，也不保存私有草稿。</p></aside></div>`;
  }

  function renderArticle(slug) {
    const post = posts.find(p => p.slug === slug);
    if (!post) return notFound();
    document.title = `${post.title} — ${profile.name}`;
    return `<a href="#/posts" class="back-link">${icon('back')} 回到全部手记</a><article><header class="article-header"><div class="post-kicker"><a href="${categoryUrl(post.category)}">${esc(post.category)}</a></div><h1>${esc(post.title)}</h1><div class="post-meta"><span>${esc(profile.name)}</span><time datetime="${post.date}">${date(post.date)}</time><span>${post.readTime} 分钟阅读</span></div></header><div class="article-layout"><div><div class="article-body">${post.html}</div><div class="tag-cloud" style="margin-top:25px">${post.tags.map(t => `<a class="tag" href="#/posts?tag=${encodeURIComponent(t)}"># ${esc(t)}</a>`).join('')}</div>${window.Portfolio.actions('post:' + post.slug)}<footer class="article-end"><a href="#/publish?post=${post.slug}">整理为各平台发布稿 ↗</a><a href="#/posts">继续翻阅 →</a></footer></div><aside class="article-aside" aria-label="文章目录"><h2>文章目录 / CONTENTS</h2>${post.headings.map(h => `<button class="toc-button" data-anchor="${esc(h.id)}">${esc(h.text)}</button>`).join('')}</aside></div></article>`;
  }
  function notFound() { return `<section class="route-not-found"><p class="eyebrow">A PAGE YET TO BE WRITTEN</p><h1>404</h1><p>这一页还没有写下。先回到手记首页吧。</p><a class="primary-link" href="#/">返回首页 ${icon('arrow')}</a></section>`; }
  function render() {
    const raw = location.hash.slice(1) || '/';
    const splitAt = raw.indexOf('?');
    const route = splitAt < 0 ? raw : raw.slice(0, splitAt);
    const query = new URLSearchParams(splitAt < 0 ? '' : raw.slice(splitAt + 1));
    window.EmbodiedLab.unmount();
    window.ComputerLabs.unmount();
    window.Portfolio.unmount();
    window.Journeys.unmount();
    document.title = profile.siteTitle;
    let html;
    if (route === '/') html = renderHome();
    else if (route === '/posts') html = renderPosts(query);
    else if (route === '/archives') html = renderArchives();
    else if (route === '/projects') html = renderProjects();
    else if (route === '/awards') html = renderAwards(query);
    else if (route === '/journeys') html = window.Journeys.markup();
    else if (route === '/about') html = renderAbout();
    else if (route === '/lab') html = renderLab();
    else if (route === '/labs') html = renderComputerLabs();
    else if (route === '/papers') html = window.Portfolio.paperMarkup(query);
    else if (route === '/favorites') html = window.Portfolio.favoritesMarkup();
    else if (route === '/community') html = window.Portfolio.communityMarkup(query);
    else if (route === '/publish') html = renderPublish(query);
    else if (route.startsWith('/post/')) html = renderArticle(route.slice(6));
    else html = notFound();
    main.innerHTML = html;
    window.EmbodiedLab.mount(main);
    window.ComputerLabs.mount(main);
    window.Portfolio.mount(main);
    window.Journeys.mount(main, query);
    bindPageControls(query);
    const activeRoute = route.startsWith('/post/') ? '/posts' : route === '/lab' ? '/labs' : route;
    document.getElementById('page-label').textContent = navItems.find(n => n[0] === activeRoute)?.[2] || '页面未找到';
    document.querySelectorAll('.nav-link').forEach(link => { const active = link.dataset.route === activeRoute; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('menu-toggle').setAttribute('aria-label', '展开导航');
    document.getElementById('menu-toggle').innerHTML = icon('menu');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (route === '/about' && query.get('section') === 'education') document.getElementById('education-history')?.scrollIntoView({behavior:'instant',block:'start'});
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
    const index = [
      ...window.Portfolio.entries().filter(e => e.key.startsWith('lab:') || e.key.startsWith('paper:')).map(e => ({title:e.title,info:e.info,text:e.title,href:e.href})),
      ...posts.map(p => ({ title: p.title, info: `手记 · ${p.category} · ${date(p.date)}`, text: `${p.summary} ${p.tags.join(' ')} ${p.searchText}`, href: `#/post/${p.slug}` })),
      ...profile.awards.map(a => ({ title: a.title, info: `${kindNames[a.kind]} · ${a.year} · ${a.prize}`, text: `${a.detail} ${a.category}`, href: `#/awards?record=${a.id}` })),
      ...projects.map(p => ({ title: p.title, info: `项目 · ${p.year}`, text: `${p.description} ${p.tags.join(' ')}`, href: '#/projects' })),
    ];
    const results = keyword ? index.filter(item => `${item.title} ${item.info} ${item.text}`.toLocaleLowerCase().includes(keyword)) : index.slice(0, 4);
    document.getElementById('search-results').innerHTML = results.length ? results.slice(0, 16).map(item => `<a class="search-result" href="${esc(item.href)}"><strong>${esc(item.title)}</strong><span>${esc(item.info)}</span></a>`).join('') : '<p class="search-empty">没有找到匹配内容，换个关键词试试。</p>';
  }
  function openSearch() { if (searchDialog.open) return; searchInput.value = ''; updateSearch(); searchDialog.showModal(); searchInput.focus(); }
  document.getElementById('search-open').addEventListener('click', openSearch);
  searchInput.addEventListener('input', updateSearch);
  searchDialog.addEventListener('click', event => { if (event.target.closest('.search-result')) searchDialog.close(); });
  document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!document.querySelector('dialog[open]')) openSearch(); } });
  document.querySelectorAll('dialog').forEach(dialog => { dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }); });
  let toastTimer;
  function toast(text) { const element = document.getElementById('toast'); element.textContent = text; element.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 3000); }
  let selectedAwardId = '';
  let requestedAward = null;
  const requestDialog = document.getElementById('request-dialog');
  const requestPurpose = document.getElementById('request-purpose');
  const requestMessage = document.getElementById('request-message');
  async function copyText(value, success = '已复制。') {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(value); toast(success); return true;
    } catch {
      const helper = document.createElement('textarea'); helper.value = value; helper.style.cssText = 'position:fixed;opacity:0;left:-9999px'; document.body.append(helper); helper.select();
      let copied = false; try { copied = document.execCommand('copy'); } catch {} helper.remove();
      toast(copied ? success : `无法自动复制，请手动复制：${value.length < 80 ? value : '上方文本框中的内容'}`); return copied;
    }
  }
  function updateRequest() {
    const title = requestedAward ? `${requestedAward.year} · ${requestedAward.title} · ${requestedAward.prize}` : '竞赛或成果材料核验';
    document.getElementById('request-record').textContent = title;
    const message = `材料核验申请\n记录：${title}\n记录编号：${requestedAward?.id || '请注明要核验的记录'}\n查看用途：${requestPurpose.value.trim() || '请补充非敏感的用途说明'}\n\n我理解：申请不代表获批，材料由站主人工审核后决定是否私下提供。\n如使用 GitHub Issue，请勿在公开内容中填写私人联系方式或上传证书。`;
    requestMessage.value = message;
    const contact = profile.certificateContact;
    const issue = new URL(contact.githubIssueUrl); issue.searchParams.set('title', `[材料核验] ${requestedAward?.title || '竞赛或成果记录'}`); issue.searchParams.set('body', message);
    document.getElementById('request-channels').innerHTML = `${contact.email ? `<a class="request-channel" href="mailto:${esc(contact.email)}?subject=${encodeURIComponent('材料核验申请：' + title)}&body=${encodeURIComponent(message)}">${icon('mail')}<strong>邮件申请</strong><small>${esc(contact.email)}</small></a>` : ''}<a class="request-channel" href="${esc(issue.href)}" target="_blank" rel="noopener noreferrer">${icon('github')}<strong>GitHub 公开申请</strong><small>打开预填 Issue，由你确认提交</small></a><a class="request-channel" href="${esc(safeUrl(contact.csdnUrl))}" target="_blank" rel="noopener noreferrer">${icon('code')}<strong>CSDN 私信</strong><small>先复制申请内容，再到主页私信</small></a>${profile.socials.find(s => s.name === '抖音')?.handle ? `<button class="request-channel" data-copy-social="抖音">${icon('video')}<strong>复制抖音账号</strong><small>在抖音内搜索后发送私信</small></button>` : ''}`;
  }
  function openRequest(id) {
    requestedAward = profile.awards.find(a => a.id === id) || null;
    document.getElementById('detail-dialog').close(); document.getElementById('public-proof-dialog').close(); requestPurpose.value = ''; updateRequest(); requestDialog.showModal(); requestPurpose.focus();
  }
  requestPurpose.addEventListener('input', updateRequest);
  document.getElementById('detail-request').addEventListener('click', () => openRequest(selectedAwardId));
  document.getElementById('copy-request').addEventListener('click', () => copyText(requestMessage.value, '申请内容已复制，请选择联系渠道。'));

  function makePublishDraft(post, platform) {
    const canonical = `${profile.siteUrl.replace(/\/?$/, '/')}#/post/${post.slug}`;
    const markdown = post.markdown || post.searchText;
    const clean = text => text.replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, '[代码示例见原文]').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`>]/g, '').trim();
    const sections = markdown.split(/^##\s+/m).slice(1).map(section => { const i = section.indexOf('\n'); return { title: clean(section.slice(0, i)), body: clean(section.slice(i + 1)).split(/\n\s*\n/)[0].slice(0, 140) }; }).slice(0, 4);
    const topics = post.tags.slice(0, 4).map(tag => '#' + tag.replaceAll(' ', '')).join(' ');
    if (platform === 'csdn') return `# ${post.title}\n\n${markdown.trim()}\n\n---\n原文：${canonical}\n作者：${profile.name}\n`;
    if (platform === 'xiaohongshu') return `${post.title}\n\n${post.summary}\n\n${sections.map((section, i) => `${i + 1}. ${section.title}\n${section.body}`).join('\n\n')}\n\n完整步骤与代码见我的同名手记。发布前请结合实际补充截图，并核对文中结论。\n\n${topics}\n\n原文出处：${canonical}`;
    return `【标题】${post.title}\n\n【开场口播】\n这次聊一个问题：${post.title}。${post.summary}\n\n${sections.map((section, i) => `【第 ${i + 1} 段】\n口播：${section.title}。${section.body}\n画面建议：${post.category === '历史阅读' ? '展示阅读笔记与出处卡片' : '展示对应步骤的录屏、代码或示意图'}，用字幕强调这一段的要点。`).join('\n\n')}\n\n【结尾】\n完整过程整理在同名文章中。你还想了解哪一步？\n\n【发布前核对】\n补充自己的演示素材；调整为自然口语；检查事实和引用。此稿为结构化初稿，不代表已经实测或发布。\n\n${topics}\n原文：${canonical}`;
  }
  function bindPageControls(query) {
    const category = document.getElementById('award-category');
    if (category) category.addEventListener('change', () => { const next = new URLSearchParams(query); next.delete('record'); category.value ? next.set('category', category.value) : next.delete('category'); location.hash = '/awards' + (next.size ? '?' + next : ''); });
    document.getElementById('award-search-form')?.addEventListener('submit', event => { event.preventDefault(); const next = new URLSearchParams(query); next.delete('record'); const keyword = document.getElementById('award-search-input').value.trim(); keyword ? next.set('q', keyword) : next.delete('q'); location.hash = '/awards' + (next.size ? '?' + next : ''); });
    const postSelect = document.getElementById('publish-post');
    if (!postSelect) return;
    let platform = 'csdn';
    const selectedPost = () => posts.find(post => post.slug === postSelect.value) || posts[0];
    const update = () => { document.getElementById('publish-output').value = makePublishDraft(selectedPost(), platform); document.getElementById('publish-format').textContent = { csdn: 'Markdown 正文', xiaohongshu: '短文草稿', douyin: '口播与画面初稿' }[platform]; document.getElementById('publish-original').href = '#/post/' + selectedPost().slug; };
    postSelect.addEventListener('change', update);
    main.querySelectorAll('[data-publish-platform]').forEach(button => button.addEventListener('click', () => { platform = button.dataset.publishPlatform; main.querySelectorAll('[data-publish-platform]').forEach(item => { const current = item === button; item.classList.toggle('active', current); item.setAttribute('aria-pressed', String(current)); }); update(); }));
    document.getElementById('copy-publish').addEventListener('click', () => copyText(document.getElementById('publish-output').value, '发布稿已复制，请校对后到对应平台发布。'));
    document.getElementById('download-publish').addEventListener('click', () => { const blob = new Blob([document.getElementById('publish-output').value], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${selectedPost().slug}-${platform}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); });
    update();
  }
  document.addEventListener('click', event => {
    const award = event.target.closest('[data-award]');
    if (award) { const data = profile.awards.find(a => a.id === award.dataset.award); if (!data) return; selectedAwardId = data.id; document.getElementById('detail-title').textContent = `${data.title} · ${data.prize}`; document.getElementById('detail-body').textContent = data.detail; document.getElementById('detail-dialog').showModal(); }
    const request = event.target.closest('[data-request]');
    if (request) openRequest(request.dataset.request);
    const social = event.target.closest('[data-copy-social]');
    if (social) { const item = profile.socials.find(s => s.name === social.dataset.copySocial); if (item?.handle) copyText(item.handle, `${item.name}账号已复制，请在 App 中搜索 ${item.handle}。`); }
    if (event.target.closest('[data-copy-feed]')) copyText(profile.siteUrl.replace(/\/?$/, '/') + 'feed.xml', 'RSS 订阅地址已复制。');
    const missing = event.target.closest('[data-unconfigured]');
    if (missing) toast(`${missing.dataset.unconfigured}主页尚未添加，之后会在这里与你见面。`);
    const anchor = event.target.closest('[data-anchor]');
    if (anchor) document.getElementById(anchor.dataset.anchor)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  render();
})();
