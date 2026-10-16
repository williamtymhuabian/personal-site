(() => {
  'use strict';
  const { profile, posts, projects, papers = [], publicCertificates = [], community = {} } = JSON.parse(document.querySelector('#site-data').textContent);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4Z"/>', chat: '<path d="M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', paper: '<path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8m-8 4h6"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.paper}</svg>`;
  const labEntries = [
    { key: 'lab:sorting', title: '排序算法实验室', info: '单步比较、播放与算法切换', href: '#/labs?lab=sorting' },
    { key: 'lab:neural', title: '神经网络感知实验室', info: '输入、权重与激活函数', href: '#/labs?lab=neural' },
    { key: 'lab:network', title: '网络路由实验室', info: '链路、数据包与最短路径', href: '#/labs?lab=network' },
    { key: 'lab:embodied', title: '具身导航实验室', info: '保留的机器人路径规划实验', href: '#/lab' }
  ];
  const entries = () => [
    ...posts.map(p => ({ key: 'post:' + p.slug, title: p.title, info: `手记 · ${p.category}`, href: '#/post/' + p.slug })),
    ...projects.map(p => ({ key: 'project:' + p.id, title: p.title, info: `项目 · ${p.year}`, href: '#/projects' })),
    ...papers.map(p => ({ key: 'paper:' + p.id, title: p.title, info: `论文 · ${p.year} · ${p.venue}`, href: '#/papers?paper=' + p.id })),
    ...labEntries
  ];
  let saved = new Set();
  function readSaved() { try { const ids = JSON.parse(localStorage.getItem('william-bookmarks') || '[]'); saved = new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []); } catch { saved = new Set(); } }
  readSaved();
  function actions(key, { compact = false } = {}) {
    const exists = saved.has(key);
    return `<div class="engagement-actions ${compact ? 'engagement-compact' : ''}"><button type="button" data-bookmark="${esc(key)}" aria-pressed="${exists}">${icon('save')}<span>${exists ? '已收藏' : '收藏'}</span></button><a href="#/community?topic=${encodeURIComponent(key)}" aria-label="点赞或留言：${esc(entries().find(e => e.key === key)?.title || '网站交流')}">${icon('heart')}<span>点赞</span><span class="engagement-divider">/</span>${icon('chat')}<span>留言</span></a></div>`;
  }
  function paperMarkup(query = new URLSearchParams()) {
    const keyword = (query.get('q') || '').toLowerCase();
    const selected = query.get('paper') || '';
    const filtered = papers.filter(p => (!selected || selected === p.id) && (!keyword || `${p.title} ${p.authors.join(' ')} ${p.venue} ${p.tags.join(' ')}`.toLowerCase().includes(keyword)));
    const states = { published: '已发表', preprint: '预印本' };
    return `<header class="page-header"><p class="eyebrow">RESEARCH / PUBLICATIONS</p><h1>论文与研究</h1><p>记录公开的研究成果、方法与可复现材料，连接论文、代码和实验。</p></header><div class="research-banner"><div><span class="tiny-label">RESEARCH FOCUS</span><h2>从问题出发，用实验求证。</h2><p>当前关注具身智能与视觉语言导航（VLN），也探索算法、人工智能与计算机系统。</p></div><div class="paper-count"><strong>${papers.length.toString().padStart(2, '0')}</strong><span>公开论文记录</span></div></div>${papers.length ? `<form id="paper-search-form" class="award-search"><label class="sr-only" for="paper-search">搜索论文</label><input id="paper-search" type="search" value="${esc(query.get('q') || '')}" placeholder="搜索标题、作者、会议或关键词"><button type="submit">搜索</button>${selected || keyword ? '<a href="#/papers" class="text-link">查看全部</a>' : ''}</form><div class="papers-list">${filtered.map(p => `<article class="paper-card" id="paper-${esc(p.id)}"><div class="paper-meta"><span>${esc(p.year)} · ${esc(p.venue)}</span><span class="tag">${states[p.status]}</span></div><h2>${esc(p.title)}</h2><p class="paper-authors">${p.authors.map(esc).join(' · ')}</p><p>${esc(p.abstract)}</p><div class="project-tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div><div class="paper-links">${[['doiUrl', '论文主页'], ['pdfUrl', '公开全文'], ['codeUrl', '代码']].filter(([k]) => p[k]).map(([k, label]) => `<a href="${esc(p[k])}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')}${p.bibtex ? `<button data-bibtex="${esc(p.id)}">复制 BibTeX</button>` : ''}</div>${actions('paper:' + p.id)}</article>`).join('') || '<p class="empty-state">没有找到匹配的论文。</p>'}</div>` : `<section class="research-empty"><span class="research-empty-symbol">${icon('paper')}</span><h2>第一篇公开成果，留在这里。</h2><p>论文页面已准备好。后续发表或公开预印本时，会补充作者、会议或期刊、摘要、论文链接、代码与引用格式。</p><a class="primary-link" href="#/labs">先看看可操作的实验 ${icon('arrow')}</a></section>`}<p class="research-note">预印本与正式发表会明确区分；研究生阶段的新成果会持续更新。</p>`;
  }
  function favoritesMarkup() {
    readSaved();
    const favorites = entries().filter(e => saved.has(e.key));
    return `<header class="page-header"><p class="eyebrow">YOUR READING DESK</p><h1>我的收藏</h1><p>留住想再读的文章、想继续尝试的实验和感兴趣的项目。收藏保存在当前浏览器，清除浏览器数据会一并清除。</p></header><div class="favorites-list">${favorites.map(e => `<article class="favorite-card"><div><span class="tiny-label">${esc(e.info)}</span><h2><a href="${esc(e.href)}">${esc(e.title)} ↗</a></h2></div><button data-bookmark="${esc(e.key)}" aria-pressed="true" aria-label="取消收藏：${esc(e.title)}">${icon('save')} 取消收藏</button></article>`).join('') || '<div class="research-empty"><h2>给好奇心留个位置。</h2><p>点击文章、项目或实验下方的“收藏”，下次可以在这里继续。</p><a class="primary-link" href="#/labs">探索实验室 ↗</a></div>'}</div>`;
  }
  function communityMarkup(query = new URLSearchParams()) {
    const topicKey = query.get('topic') || 'general';
    const topic = entries().find(e => e.key === topicKey);
    const validKey = topic?.key || 'general';
    const title = topic?.title || '网站交流';
    const issue = new URL('https://github.com/' + community.repo + '/discussions/new');
    issue.searchParams.set('category', 'general');
    issue.searchParams.set('title', 'Williamtym · ' + validKey);
    issue.searchParams.set('body', `交流主题：${title}\n页面：${profile.siteUrl}${topic?.href || '#/community'}\n\n我想讨论：\n`);
    return `<header class="page-header"><p class="eyebrow">IDEAS ARE BETTER TOGETHER</p><h1>留言与交流</h1><p>聊一个问题，分享一个思路，或者告诉我你想看到怎样的实验。</p></header><section class="community-context"><span class="tiny-label">CURRENT CONVERSATION</span><h2>${esc(title)}</h2><div>${topic ? `<a class="text-link" href="${esc(topic.href)}">回到对应内容 ↗</a>` : ''}<a class="text-link" href="#/community">网站公共留言板 ↗</a></div></section><div class="community-notice">留言与点赞公开展示，请围绕内容交流。请勿填写手机号、住址或证件信息。</div><section class="community-panel" aria-label="留言与点赞"><div id="discussion-host" data-topic="${esc(validKey)}"><p class="discussion-loading">正在准备留言区…</p></div><div id="discussion-fallback" ${community.enabled ? 'hidden' : ''}><h2>到 GitHub 继续交流</h2><p>${community.enabled ? '留言组件暂时无法加载，可以打开 GitHub 交流页继续留言。' : '当前通过 GitHub 讨论区交流，登录后可留言或用表情点赞。站内评论将后续开放。'}</p><div class="hero-actions"><a class="primary-link" href="${esc(issue.href)}" target="_blank" rel="noopener noreferrer">GitHub 留言 ↗</a><a class="text-link" href="https://github.com/${esc(community.repo)}/discussions" target="_blank" rel="noopener noreferrer">查看讨论与点赞 ↗</a><a class="text-link" href="mailto:${esc(profile.certificateContact.email)}">邮件联系 ↗</a></div></div></section><p class="research-note">公开留言与点赞使用 GitHub 身份；收藏无需登录，只保存在你的浏览器。</p>`;
  }
  function certificateButton(id) { return publicCertificates.some(c => c.awardId === id) ? `<button data-public-proof="${esc(id)}">公开证书 ↗</button>` : ''; }
  function certificateGallery() {
    return publicCertificates.length ? `<section class="public-honors"><div class="section-heading"><h2>ICPC / CCPC 公开证书 <small>REDACTED COPIES</small></h2><span>${publicCertificates.length} 份</span></div><p>保留本人姓名和赛事奖项。其他人员信息、编号与二维码已永久遮盖；原件仍按需申请核验。</p><div class="certificate-grid">${publicCertificates.map(c => `<button class="certificate-card" data-public-proof="${esc(c.awardId)}"><img src="./${esc(c.image)}" alt="${esc(c.alt)}" loading="lazy" width="720" height="510"><span>${esc(c.title)}</span><small>查看公开脱敏副本 ↗</small></button>`).join('')}</div></section>` : '';
  }
  let root = null, observer = null, timer = 0;
  function mount(target) {
    root = target;
    readSaved();
    root.querySelector('#paper-search-form')?.addEventListener('submit', event => { event.preventDefault(); const value = root.querySelector('#paper-search').value.trim(); location.hash = '/papers' + (value ? '?q=' + encodeURIComponent(value) : ''); });
    const host = root.querySelector('#discussion-host');
    if (host) {
      if (!community.enabled || !community.repoId || !community.categoryId) host.hidden = true;
      else {
        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js'; script.async = true; script.crossOrigin = 'anonymous';
        const attributes = { repo: community.repo, 'repo-id': community.repoId, category: community.category, 'category-id': community.categoryId, mapping: 'specific', term: 'Williamtym · ' + host.dataset.topic, strict: '1', 'reactions-enabled': '1', 'emit-metadata': '0', 'input-position': 'top', theme: document.documentElement.dataset.theme === 'dark' ? 'dark_dimmed' : 'light', lang: 'zh-CN', loading: 'lazy' };
        for (const [key, value] of Object.entries(attributes)) script.setAttribute('data-' + key, value);
        script.addEventListener('error', showFallback);
        host.replaceChildren(script);
        timer = setTimeout(showFallback, 16000);
        observer = new MutationObserver(() => { const iframe = host.querySelector('iframe'); if (iframe) { iframe.title = 'GitHub 留言与点赞'; clearTimeout(timer); } });
        observer.observe(host, { childList: true });
      }
    }
  }
  function showFallback() { if (root?.querySelector('#discussion-fallback')) root.querySelector('#discussion-fallback').hidden = false; }
  function unmount() { observer?.disconnect(); observer = null; clearTimeout(timer); root = null; }
  const announce = text => { const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 3000); };
  document.addEventListener('click', event => {
    const bookmark = event.target.closest('[data-bookmark]');
    if (bookmark) {
      const key = bookmark.dataset.bookmark;
      if (!entries().some(e => e.key === key)) return;
      readSaved(); saved.has(key) ? saved.delete(key) : saved.add(key);
      try { localStorage.setItem('william-bookmarks', JSON.stringify([...saved])); }
      catch { readSaved(); announce('浏览器未允许保存收藏，请检查存储设置。'); return; }
      root?.querySelectorAll('[data-bookmark]').forEach(b => { const active = saved.has(b.dataset.bookmark); b.setAttribute('aria-pressed', String(active)); const span = b.querySelector('span'); if (span) span.textContent = active ? '已收藏' : '收藏'; });
      announce(saved.has(key) ? '已收藏，可在“我的收藏”中找到。' : '已取消收藏。');
      if (location.hash.startsWith('#/favorites')) window.dispatchEvent(new Event('hashchange'));
    }
    const proof = event.target.closest('[data-public-proof]');
    if (proof) {
      const record = publicCertificates.find(c => c.awardId === proof.dataset.publicProof);
      if (!record) return;
      const dialog = document.querySelector('#public-proof-dialog');
      dialog.querySelector('#public-proof-title').textContent = record.title;
      const image = dialog.querySelector('img'); image.src = './' + record.image; image.alt = record.alt;
      const download = dialog.querySelector('[download]'); download.href = './' + record.image; download.download = record.awardId + '-public.webp';
      dialog.showModal();
    }
    const citation = event.target.closest('[data-bibtex]');
    if (citation) {
      const value = papers.find(p => p.id === citation.dataset.bibtex)?.bibtex;
      if (value && navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(() => announce('BibTeX 已复制。')).catch(() => announce('复制失败，请通过论文主页获取引用。'));
      else announce('当前浏览器无法复制，请通过论文主页获取引用。');
    }
  });
  new MutationObserver(() => {
    const iframe = document.querySelector('#discussion-host iframe');
    iframe?.contentWindow?.postMessage({ giscus: { setConfig: { theme: document.documentElement.dataset.theme === 'dark' ? 'dark_dimmed' : 'light' } } }, 'https://giscus.app');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('storage', e => { if (e.key === 'william-bookmarks') { readSaved(); window.dispatchEvent(new Event('hashchange')); } });
  window.Portfolio = { actions, paperMarkup, communityMarkup, favoritesMarkup, certificateButton, certificateGallery, mount, unmount, entries };
})();
