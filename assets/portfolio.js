(() => {
  'use strict';
  const siteData=JSON.parse(document.querySelector('#site-data').textContent);
  const { profile, posts, projects, papers = [], publicCertificates = [], community = {}, communityHashes }=siteData;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4Z"/>', chat: '<path d="M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', paper: '<path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8m-8 4h6"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.paper}</svg>`;
  const entryList=window.TopicModel.entries(siteData);
  const entryIndex=new Map(entryList.map(entry=>[entry.key,entry]));
  const entries=()=>entryList;
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
    const requested=query.get('topic')||'general',entry=entryIndex.get(requested)||entryIndex.get('general');
    const links=window.TopicModel.links({profile,community,entry,hash:communityHashes[entry.key]});
    const topics=entryList.filter(e=>!e.key.startsWith('venue:')||e.key===entry.key);
    return `<header class="page-header"><p class="eyebrow">QUESTIONS / NOTES / CONVERSATIONS</p><h1>留言与交流</h1><p>交流文章、实验和旅途见闻。讨论期刊与会议时，也欢迎附上可核对的官方来源。</p></header><section class="community-context"><span class="tiny-label">CURRENT CONVERSATION</span><h2>${esc(entry.title)}</h2><label for="community-topic">选择话题</label><select id="community-topic">${topics.map(e=>`<option value="${esc(e.key)}" ${e.key===entry.key?'selected':''}>${esc(e.title)}</option>`).join('')}</select><div>${entry.key!=='general'?`<a class="text-link" href="${esc(entry.href)}">回到对应内容 ↗</a>`:''}<a class="text-link" href="#/community">网站公共留言板 ↗</a></div></section>${requested!==entry.key?'<p class="community-notice">未找到这个话题，已回到公共留言板。</p>':''}<p class="community-notice">留言与表情点赞使用 GitHub 身份，内容公开。请勿填写私人联系方式、住址或证件信息；材料核验请使用邮件。</p><section class="community-panel" aria-label="留言与点赞"><div class="community-connection"><p id="community-connection" role="status">正在准备留言区…</p><button type="button" class="text-link" data-community-retry>重新连接</button></div><div id="discussion-host" data-topic="${esc(entry.key)}" hidden></div><div class="community-thread-links"><a id="community-thread" class="text-link" href="${esc(links.search)}" target="_blank" rel="noopener noreferrer">查找这个话题的已有留言 ↗</a><a class="text-link" href="https://github.com/${esc(community.repo)}/discussions" target="_blank" rel="noopener noreferrer">全部讨论 ↗</a></div><details id="discussion-fallback" open><summary>通过 GitHub 或邮件交流</summary><p>先查看已有留言，回复对应话题；尚无讨论时，可以在下面写好内容，再到 GitHub 确认发起。</p><label for="community-message">想交流的内容 <span id="community-count">0 / 600</span></label><textarea id="community-message" maxlength="600" placeholder="例如：实验在哪一步遇到问题？你尝试过什么？希望继续讨论哪篇论文？"></textarea><div class="hero-actions"><a id="community-publish" class="primary-link" aria-disabled="true" href="${esc(links.create)}" target="_blank" rel="noopener noreferrer">在 GitHub 确认发布 ↗</a><button type="button" class="text-link" id="community-copy">复制留言</button><a id="community-email" class="text-link" href="${esc(links.email)}">改用邮件联系 ↗</a></div></details></section><p class="research-note">网页不会代替你提交留言。首次站内留言或表情回应会创建相应 GitHub 讨论；收藏仍只保存在你的浏览器。</p>`;
  }
  function certificateButton(id) {
    const group = publicCertificates.find(c => c.awardId === id);
    return group ? `<button data-public-proof="${esc(id)}">查看图片 · ${group.items.length} 张 ↗</button>` : '';
  }
  function certificateGallery(awardIds,options) {
    return window.HonorGallery.section((awardIds?awardIds.map(id=>publicCertificates.find(group=>group.awardId===id)).filter(Boolean):publicCertificates),options);
  }
  let root = null;
  function mount(target) {
    root = target;
    window.HonorGallery.mount(root);
    readSaved();
    root.querySelector('#paper-search-form')?.addEventListener('submit', event => { event.preventDefault(); const value = root.querySelector('#paper-search').value.trim(); location.hash = '/papers' + (value ? '?q=' + encodeURIComponent(value) : ''); });
    window.CommunityClient.mount(root);
  }
  function unmount(){window.HonorGallery.unmount();window.CommunityClient.unmount();root=null;}
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
      window.HonorGallery.open(record, Number(proof.dataset.proofIndex) || 0);
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
