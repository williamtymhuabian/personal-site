(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const states = new Map();
  const label = item => item.kind === 'medal' ? '实物奖牌' : '公开证书';
  const items = group => group.items || [{ image: group.image, alt: group.alt, kind: 'certificate', width: 720, height: 510 }];
  function figure(group, item, index, detail, slide = false, active = false) {
    const image = `<img src="./${esc(item.image)}" alt="${esc(item.alt)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async" draggable="false">`;
    return `<figure class="honor-figure" style="--media-ratio:${(item.width / item.height).toFixed(4)}" ${slide ? `data-honor-slide ${active ? '' : 'hidden'} role="group" aria-roledescription="幻灯片" aria-label="第 ${index + 1} 张，共 ${items(group).length} 张"` : ''}>${detail ? `<a class="honor-image-open" href="./${esc(item.image)}" target="_blank" rel="noopener noreferrer" aria-label="原尺寸查看${label(item)}">${image}</a>` : `<button type="button" class="honor-image-open" data-public-proof="${esc(group.awardId)}" data-proof-index="${index}" aria-label="查看${esc(group.title)}的${label(item)}">${image}</button>`}<figcaption><span>${label(item)}</span>${detail ? `<a href="./${esc(item.image)}" download="${esc(group.awardId)}-${index + 1}-public.webp">下载此图 ↓</a>` : '<span aria-hidden="true">放大 ↗</span>'}</figcaption></figure>`;
  }
  function markup(group, { detail = false, initial = 0 } = {}) {
    const media = items(group), count = media.length;
    initial = Math.max(0, Math.min(Number(initial) || 0, count - 1));
    if (count < 3) return `<div class="honor-media ${count === 2 ? 'honor-pair' : 'honor-single'}">${media.map((item, index) => figure(group, item, index, detail)).join('')}</div>`;
    return `<div class="honor-carousel" data-honor-carousel data-initial="${initial}" tabindex="0" role="region" aria-roledescription="轮播图" aria-label="${esc(group.title)}的${count}张图片"><div class="honor-stage" data-honor-stage>${media.map((item, index) => figure(group, item, index, detail, true, index === initial)).join('')}</div><div class="honor-carousel-controls"><button type="button" data-honor-prev aria-label="上一张">←</button><span class="honor-counter" data-honor-count aria-live="polite">${initial + 1} / ${count}</span><button type="button" data-honor-next aria-label="下一张">→</button><div class="honor-dots" aria-label="选择图片">${media.map((_, index) => `<button type="button" data-honor-go="${index}" aria-label="查看第${index + 1}张" aria-current="${index === initial ? 'true' : 'false'}"></button>`).join('')}</div><button type="button" class="honor-play" data-honor-play aria-pressed="false">播放轮播</button></div></div>`;
  }
  function section(groups,{title='奖牌与证书',subtitle='HONORS IN PICTURES',description='同一奖项的材料合并展示：两图并列，三图及以上可轮播。ICPC / CCPC 保留原有竞赛信息；计算机设计大赛同样保留原有竞赛信息，包含赛区晋级材料。未公开材料可申请核验。'}={}) {
    if (!groups.length) return '';
    const total = groups.reduce((sum, group) => sum + items(group).length, 0);
    return `<section class="public-honors"><div class="section-heading"><h2>${esc(title)} <small>${esc(subtitle)}</small></h2><span>${groups.length} 项 · ${total} 张图</span></div><p>${esc(description)}</p><div class="honor-masonry">${groups.map(group => `<article class="honor-group"><header><h3><button type="button" data-public-proof="${esc(group.awardId)}">${esc(group.title)}</button></h3><span>${items(group).length} 张图</span></header>${markup(group)}<footer><button type="button" class="text-link" data-public-proof="${esc(group.awardId)}">查看这一项的全部图片 ↗</button></footer></article>`).join('')}</div></section>`;
  }
  function setIndex(element, index) {
    const state = states.get(element);
    if (!state) return;
    const slides = [...element.querySelectorAll('[data-honor-slide]')];
    state.index = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== state.index; });
    element.querySelector('[data-honor-count]').textContent = `${state.index + 1} / ${slides.length}`;
    element.querySelectorAll('[data-honor-go]').forEach((button, i) => button.setAttribute('aria-current', String(i === state.index)));
  }
  function pause(element) {
    const state = states.get(element);
    if (!state) return;
    clearInterval(state.timer); state.timer = null;
    const play = element.querySelector('[data-honor-play]');
    play.textContent = '播放轮播'; play.setAttribute('aria-pressed', 'false');
    element.querySelector('[data-honor-count]').setAttribute('aria-live', 'polite');
  }
  function destroy(scope) {
    for (const [element, state] of states) if (!scope || scope.contains(element)) { pause(element); state.controller.abort(); states.delete(element); }
  }
  function mount(scope) {
    for (const element of scope.querySelectorAll('[data-honor-carousel]')) {
      if (states.has(element)) continue;
      const controller = new AbortController();
      const state = { index: Number(element.dataset.initial) || 0, timer: null, controller, start: null, suppressClick: 0 };
      states.set(element, state);
      const on = (target, event, handler) => target.addEventListener(event, handler, { signal: controller.signal });
      on(element, 'keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); pause(element);
        setIndex(element, event.key === 'Home' ? 0 : event.key === 'End' ? element.querySelectorAll('[data-honor-slide]').length - 1 : state.index + (event.key === 'ArrowRight' ? 1 : -1));
      });
      on(element, 'pointerenter', () => pause(element));
      on(element, 'focusin', () => pause(element));
      const stage = element.querySelector('[data-honor-stage]');
      on(stage, 'dragstart', event => event.preventDefault());
      on(stage, 'pointerdown', event => { state.start = [event.clientX, event.clientY]; });
      on(stage, 'pointerup', event => {
        if (!state.start) return;
        const dx = event.clientX - state.start[0], dy = event.clientY - state.start[1]; state.start = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { pause(element); setIndex(element, state.index + (dx < 0 ? 1 : -1)); state.suppressClick = Date.now() + 300; }
      });
    }
  }
  function open(group, index = 0) {
    const dialog = document.querySelector('#public-proof-dialog');
    destroy(dialog);
    dialog.querySelector('#public-proof-title').textContent = group.title;
    dialog.querySelector('#public-proof-note').textContent = group.disclosure === 'complete' ? '公开展示副本 · 保留证书与奖牌上的原有竞赛信息。' : '公开脱敏副本 · 依据站主选择遮盖相应信息。';
    dialog.querySelector('#public-proof-media').innerHTML = markup(group, { detail: true, initial: index });
    dialog.querySelector('[data-request]').dataset.request = group.awardId;
    mount(dialog);
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener('click', event => {
    const carousel = event.target.closest('[data-honor-carousel]');
    const state = states.get(carousel);
    if (!state) return;
    if (state.suppressClick > Date.now()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (event.target.closest('[data-honor-prev]')) { pause(carousel); setIndex(carousel, state.index - 1); }
    if (event.target.closest('[data-honor-next]')) { pause(carousel); setIndex(carousel, state.index + 1); }
    const go = event.target.closest('[data-honor-go]');
    if (go) { pause(carousel); setIndex(carousel, Number(go.dataset.honorGo)); }
    if (event.target.closest('[data-honor-play]')) {
      if (state.timer) pause(carousel);
      else {
        event.target.closest('[data-honor-play]').textContent = '暂停轮播';
        event.target.closest('[data-honor-play]').setAttribute('aria-pressed', 'true');
        carousel.querySelector('[data-honor-count]').setAttribute('aria-live', 'off');
        state.timer = setInterval(() => setIndex(carousel, state.index + 1), 5000);
      }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) for (const element of states.keys()) pause(element); });
  document.querySelector('#public-proof-dialog').addEventListener('close', event => destroy(event.target));
  window.HonorGallery = { markup, section, mount, open, unmount: () => destroy() };
})();
