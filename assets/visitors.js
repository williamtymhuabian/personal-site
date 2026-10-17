(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const banner = $('visitor-welcome');
  let returning = null;
  try {
    const session = sessionStorage.getItem('william-visit-returning');
    returning = session === null ? localStorage.getItem('william-visited') === 'yes' : session === 'yes';
    sessionStorage.setItem('william-visit-returning', returning ? 'yes' : 'no');
    localStorage.setItem('william-visited', 'yes');
    banner.hidden = sessionStorage.getItem('william-welcome-dismissed') === 'yes';
  } catch { /* The welcome still works when browser storage is unavailable. */ }
  const hour = new Date().getHours();
  const greeting = hour < 5 ? '夜深了' : hour < 11 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  $('visitor-greeting').textContent = `${greeting}，欢迎${returning ? '回来' : '来到这里'}。`;
  $('visitor-message').textContent = returning === true
    ? '继续上次的探索吧。新的技术手记、项目和旅途记录，都在这里慢慢更新。'
    : returning === false
      ? '初次见面，我是 Williamtym。这里记录技术实践、科研探索与旅途，也欢迎留下你的想法。'
      : '我是 Williamtym。欢迎翻阅技术手记、体验小实验，也欢迎留下你的想法。';
  $('welcome-close').addEventListener('click', () => {
    banner.hidden = true;
    $('main').focus({ preventScroll: true });
    try { sessionStorage.setItem('william-welcome-dismissed', 'yes'); } catch {}
  });

  const value = $('visitor-count');
  const preference = $('visitor-statistics-toggle');
  const service = 'https://bsz.iirose.cn/api';
  const { profile } = JSON.parse($('site-data').textContent);
  const canonical = new URL(profile.siteUrl);
  canonical.search = ''; canonical.hash = '';
  const isPublicSite = location.protocol === 'https:' && location.origin === canonical.origin
    && (location.pathname === canonical.pathname || location.pathname === canonical.pathname + 'index.html');
  const privateMode = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  let disabled = false, attempted = false, controller;
  try { disabled = localStorage.getItem('william-statistics-disabled') === 'yes'; } catch {}
  const updatePreference = () => {
    preference.textContent = disabled ? '允许本浏览器参与统计' : '停止本浏览器后续统计';
    preference.setAttribute('aria-pressed', String(disabled));
  };
  async function countVisit() {
    if (!isPublicSite) { value.textContent = '本地预览不计数'; return; }
    if (privateMode) { value.textContent = '已尊重浏览器隐私设置'; return; }
    if (disabled) { value.textContent = '本浏览器已停用统计'; return; }
    // One request per document load; hash navigation must not inflate page views.
    if (attempted) { value.textContent = '将在下次打开页面时恢复'; return; }
    attempted = true;
    value.textContent = '读取中…';
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(service, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'origin', headers: { 'x-bsz-referer': canonical.href },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Counter unavailable');
      const result = await response.json();
      const count = result?.data?.site_pv;
      if (result.success !== true || !Number.isSafeInteger(count) || count < 0) throw new Error('Invalid count');
      if (!disabled) value.textContent = `${count.toLocaleString('zh-CN')} 次`;
    } catch {
      if (!disabled) value.textContent = '暂时无法读取';
    } finally { clearTimeout(timeout); }
  }
  preference.addEventListener('click', () => {
    disabled = !disabled;
    try { localStorage.setItem('william-statistics-disabled', disabled ? 'yes' : 'no'); } catch {}
    if (disabled) controller?.abort();
    updatePreference();
    countVisit();
  });
  updatePreference();
  countVisit();
})();
