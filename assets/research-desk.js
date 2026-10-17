(() => {
  'use strict';
  const { ccfCatalog:catalog, friends, venueDeadlines:reference }=JSON.parse(document.querySelector('#site-data').textContent);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId=new Map(catalog.venues.map(v=>[v.id,v]));
  const categoryName=id=>catalog.categories.find(c=>c.id===id)?.name||id;
  const typeName=type=>type==='journal'?'期刊':'会议';
  const name=venue=>venue.abbr||venue.name;
  const officialLink=id=>{const row=reference.records.find(r=>r.venueId===id);return row?`<a href="${esc(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">官网 / 征稿指南 ↗</a>`:'';};
  const indexLink=venue=>venue.url?`<a href="${esc(venue.url)}" target="_blank" rel="noopener noreferrer">目录文献索引 ↗</a>`:'<span class="venue-publisher">目录未提供网址</span>';
  const checklist=['范围与近期论文相符','已核对当届官网或作者指南','已核对截稿时间及其时区','已核对匿名、预印本与重复投稿政策','已核对篇幅、版式与费用','已与合作者确认署名和时间安排'];
  const storageKey='william-venue-preparation-v1';
  let saved=new Set(),plans={},controller,storageWorks=true;
  const validDate=date=>typeof date==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
  const https=value=>{try{return new URL(value).protocol==='https:';}catch{return false;}};
  try{
    const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');
    saved=new Set((Array.isArray(stored.saved)?stored.saved:[]).filter(id=>byId.has(id)));
    if(stored.plans&&typeof stored.plans==='object')for(const [id,plan] of Object.entries(stored.plans))if(byId.has(id)&&plan&&typeof plan==='object')plans[id]={note:typeof plan.note==='string'?plan.note.slice(0,2000):'',date:validDate(plan.date)?plan.date:'',source:https(plan.source)?plan.source:'',checks:Array.isArray(plan.checks)?plan.checks.filter(n=>Number.isInteger(n)&&n>=0&&n<checklist.length):[]};
  }catch{storageWorks=false;}
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify({saved:[...saved],plans}));return true;}catch{storageWorks=false;return false;}}
  function markup(query){
    const option=(value,label,selected)=>`<option value="${esc(value)}" ${selected===value?'selected':''}>${esc(label)}</option>`;
    return `<section class="page-header"><p class="eyebrow">VENUES / READING / PREPARATION</p><h1>期刊与会议研究台</h1><p>从研究方向找出版场所，整理候选与准备事项。推荐类别帮助导航，研究匹配度仍要结合范围和近期论文判断。</p></section><div class="venue-source"><div><strong>CCF ${esc(catalog.edition)}</strong><p>目录版本：${esc(catalog.updatedAt)} · 本站核对：${esc(catalog.checkedAt)} · ${catalog.venues.length} 条 · ${catalog.categories.length} 类</p></div><a href="${esc(catalog.sourceUrl)}" target="_blank" rel="noopener noreferrer">CCF 官方说明 ↗</a><a href="${esc(catalog.sourcePdfUrl)}" target="_blank" rel="noopener noreferrer">正式目录 PDF（高校转载）↗</a></div><p class="venue-source-note">依据高校图书馆转载的 CCF 正式目录整理。参考网址多为 DBLP 文献索引，不是当届投稿官网；具体要求请查场所官网。 A/B/C 是 CCF 推荐类别，不是影响因子或期刊分区；目录不宜简单代替学术成果评价。会议推荐范围为正式长文，不自动涵盖短文、Findings 或 Workshop；论文之外的软件、系统等同样是学术成果。</p><section class="venue-filters" aria-label="筛选期刊会议"><label>关键词<input id="venue-search" type="search" maxlength="100" value="${esc(query.get('q')||'')}" placeholder="简称、全称、出版社"></label><label>方向<select id="venue-category">${option('','全部方向',query.get('category'))}${catalog.categories.map(c=>option(c.id,c.name,query.get('category'))).join('')}</select></label><label>推荐类别<select id="venue-rank">${option('','全部',query.get('rank'))}${['A','B','C'].map(r=>option(r,r,query.get('rank'))).join('')}</select></label><label>类型<select id="venue-type">${option('','期刊与会议',query.get('type'))}${option('journal','期刊',query.get('type'))}${option('conference','会议',query.get('type'))}</select></label><label class="venue-saved-filter"><input id="venue-saved-only" type="checkbox">只看我的候选</label><button type="button" class="text-link" data-venue-reset>重置</button></section><div class="venue-toolbar"><p id="venue-count" role="status"></p><button type="button" class="text-link" data-export-candidates>导出候选 CSV ↓</button></div><p id="venue-status" class="venue-status" role="status"></p><div id="venue-results" class="venue-results"></div><div class="venue-pagination"><button type="button" data-venue-page="prev">上一页</button><span id="venue-page"></span><button type="button" data-venue-page="next">下一页</button></div><section id="venue-comparison" class="venue-comparison" aria-label="候选对比"></section><section class="venue-preparation" id="venue-preparation"><div class="section-heading"><h2>我的准备台</h2><button type="button" class="text-link" data-export-calendar>导出准备日历 ↓</button></div><p>候选、笔记和检查项保存在本浏览器，不会提交到网站。准备日期由你设置，属于个人计划；日历文件需导入日历应用，网页不会在后台发送通知。</p><label for="venue-plan-select">选择要准备的期刊或会议</label><select id="venue-plan-select"></select><div id="venue-plan-editor" hidden><div class="venue-plan-fields"><label>个人准备日期<input type="date" id="venue-plan-date" min="2000-01-01" max="2099-12-31"></label><label>已核对的当届官网 / 作者指南<input type="url" id="venue-plan-source" maxlength="1000" placeholder="https://"></label></div><label>匹配理由与准备笔记<textarea id="venue-plan-note" maxlength="2000" placeholder="研究主题、近期相关文章、实验与写作计划……"></textarea></label><div class="venue-checklist">${checklist.map((text,i)=>`<label><input type="checkbox" data-venue-check="${i}">${text}</label>`).join('')}</div><p id="venue-plan-saved" role="status"></p></div></section>`;
  }
  function friendsMarkup(){return `<section class="page-header"><p class="eyebrow">FRIENDS / BUILD TOGETHER</p><h1>朋友们</h1><p>一起讨论问题、参与项目，也分享各自记录世界的方式。</p></section>${friends.length?`<div class="friends-grid">${friends.map(friend=>`<article class="friend-card"><span class="friend-monogram" aria-hidden="true">${esc([...friend.nickname][0])}</span><div><h2>${esc(friend.nickname)}</h2><p>${esc(friend.bio)}</p>${friend.url?`<a class="text-link" href="${esc(friend.url)}" target="_blank" rel="noopener noreferrer">访问朋友的主页 ↗</a>`:'<span class="friend-pending">主页待补充</span>'}</div></article>`).join('')}</div>`:'<div class="friends-empty"><span class="tiny-label">TO BE CONTINUED</span><h2>朋友名单，慢慢整理。</h2><p>昵称、主页和一句介绍，等朋友确认愿意公开后，再把这扇门打开。</p></div>'}`;}
  function mount(root){
    if(!root.querySelector('#venue-results'))return;
    controller=new AbortController();const on=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});const $=selector=>root.querySelector(selector);
    let page=0,comparison=new Set(),activePlan='';const pageSize=24;
    const status=text=>$('#venue-status').textContent=text;
    function filters(){return {q:$('#venue-search').value.trim(),category:$('#venue-category').value,rank:$('#venue-rank').value,type:$('#venue-type').value,savedOnly:$('#venue-saved-only').checked};}
    function matches(v,f){const text=[v.abbr,v.name,v.publisher,categoryName(v.categoryId)].join(' ').toLowerCase();return(!f.category||v.categoryId===f.category)&&(!f.rank||v.rank===f.rank)&&(!f.type||v.type===f.type)&&(!f.savedOnly||saved.has(v.id))&&f.q.toLowerCase().split(/\s+/).every(term=>text.includes(term));}
    function paintComparison(){const venues=[...comparison].map(id=>byId.get(id));$('#venue-comparison').innerHTML=venues.length?`<div class="section-heading"><h2>候选对比 <small>最多 3 项</small></h2></div><div class="venue-compare-grid">${venues.map(v=>`<article><span class="venue-badge">${v.rank} · ${typeName(v.type)}</span><h3>${esc(name(v))}</h3><p>${esc(v.name)}</p><dl><div><dt>方向</dt><dd>${esc(categoryName(v.categoryId))}</dd></div><div><dt>出版社 / 组织</dt><dd>${esc(v.publisher||'目录未注明')}</dd></div></dl>${indexLink(v)}<button type="button" data-venue-compare="${v.id}">移出对比</button></article>`).join('')}</div>`:'';}
    function paintResults(){
      const f=filters(),rows=catalog.venues.filter(v=>matches(v,f));page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));
      $('#venue-count').textContent=`${rows.length} 条匹配 · 我的候选 ${saved.size} 项`;
      $('#venue-results').innerHTML=rows.slice(page*pageSize,(page+1)*pageSize).map(v=>`<article class="venue-card"><div class="venue-card-meta"><span class="venue-badge">${v.rank} · ${typeName(v.type)}</span><span>${esc(categoryName(v.categoryId))}</span></div><h2>${esc(name(v))}</h2><p>${esc(v.name)}</p><span class="venue-publisher">${esc(v.publisher||'目录未注明出版方')}</span>${v.note?`<p class="venue-entry-note">${esc(v.note)}</p>`:''}<div class="venue-card-links">${officialLink(v.id)}${indexLink(v)}<button type="button" data-venue-save="${v.id}" aria-pressed="${saved.has(v.id)}">${saved.has(v.id)?'已加入候选':'加入候选'}</button><button type="button" data-venue-compare="${v.id}" aria-pressed="${comparison.has(v.id)}">${comparison.has(v.id)?'移出对比':'对比'}</button><button type="button" data-venue-plan="${v.id}">准备笔记</button><a href="#/community?topic=${encodeURIComponent('venue:'+v.id)}">交流这个场所 ↗</a></div></article>`).join('')||'<p class="venue-empty">没有匹配记录。试试调整方向、推荐类别或关键词；目录未收录不表示场所没有学术价值。</p>';
      $('#venue-page').textContent=`${rows.length?page+1:0} / ${Math.ceil(rows.length/pageSize)} 页`;
      $('[data-venue-page="prev"]').disabled=page===0;$('[data-venue-page="next"]').disabled=(page+1)*pageSize>=rows.length;
      const query=new URLSearchParams();for(const key of ['q','category','rank','type'])if(f[key])query.set(key,f[key]);history.replaceState(null,'','#/venues'+(query.size?'?'+query:''));
      paintComparison();
    }
    function paintPlan(){
      if(!saved.has(activePlan))activePlan=[...saved][0]||'';
      $('#venue-plan-select').innerHTML=saved.size?[...saved].map(id=>`<option value="${id}" ${activePlan===id?'selected':''}>${esc(name(byId.get(id)))} · ${byId.get(id).rank}</option>`).join(''):'<option value="">先把感兴趣的期刊或会议加入候选</option>';
      $('#venue-plan-select').disabled=!saved.size;$('#venue-plan-editor').hidden=!activePlan;
      if(!activePlan)return;
      const plan=plans[activePlan]||{date:'',note:'',source:'',checks:[]};
      $('#venue-plan-date').value=plan.date;$('#venue-plan-source').value=plan.source;$('#venue-plan-note').value=plan.note;
      root.querySelectorAll('[data-venue-check]').forEach(el=>el.checked=plan.checks.includes(Number(el.dataset.venueCheck)));
      $('#venue-plan-saved').textContent=storageWorks?'仅保存于本浏览器。':'浏览器存储不可用；当前记录仅在本次页面会话中保留。';
    }
    function savePlan(){if(!activePlan)return;const source=$('#venue-plan-source').value.trim(),date=$('#venue-plan-date').value;if(source&&!https(source)){$('#venue-plan-saved').textContent='来源链接需填写完整 HTTPS 地址。';return;}if(date&&!validDate(date)){$('#venue-plan-saved').textContent='请检查准备日期。';return;}plans[activePlan]={date,note:$('#venue-plan-note').value,source,checks:[...root.querySelectorAll('[data-venue-check]:checked')].map(el=>Number(el.dataset.venueCheck))};$('#venue-plan-saved').textContent=persist()?'已保存于本浏览器。':'浏览器存储不可用；当前记录仅在本次页面会话中保留。';}
    function download(filename,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
    const csv=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    function exportCsv(){if(!saved.size){status('先加入至少一个候选。');return;}const rows=[['简称','名称','方向','类型','CCF推荐类别','目录文献索引','个人准备日期'],...[...saved].map(id=>{const v=byId.get(id);return[name(v),v.name,categoryName(v.categoryId),typeName(v.type),v.rank,v.url,plans[id]?.date||''];})];download('ccf-candidates.csv','\uFEFF'+rows.map(r=>r.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
    const icsEscape=value=>String(value).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
    const fold=line=>{let out='',part='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>73){out+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=size;}return out+part;};
    function exportCalendar(){const entries=[...saved].filter(id=>validDate(plans[id]?.date));if(!entries.length){status('先为候选设置个人准备日期，再导出日历。');return;}const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Williamtym//Research Preparation//ZH','CALSCALE:GREGORIAN'];for(const id of entries){const v=byId.get(id),plan=plans[id],date=plan.date.replaceAll('-',''),next=new Date(plan.date+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);lines.push('BEGIN:VEVENT',`UID:${id}-preparation@williamtym.local`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${date}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replaceAll('-','')}`,`SUMMARY:${icsEscape('准备：'+name(v))}`,`DESCRIPTION:${icsEscape('个人准备计划，非官方截稿日期。\n'+v.name+'\n'+(plan.source||v.url)+'\n'+plan.note)}`,'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEscape('个人准备：'+name(v))}`,'TRIGGER:-P1D','END:VALARM','END:VEVENT');}lines.push('END:VCALENDAR');download('research-preparation.ics',lines.map(fold).join('\r\n')+'\r\n','text/calendar;charset=utf-8');status('已导出个人准备日历；请导入日历应用，并检查提醒设置。');}
    for(const selector of ['#venue-search','#venue-category','#venue-rank','#venue-type','#venue-saved-only'])on($(selector),selector==='#venue-search'?'input':'change',()=>{page=0;paintResults();});
    on($('#venue-plan-select'),'change',()=>{activePlan=$('#venue-plan-select').value;paintPlan();});
    on($('#venue-plan-editor'),'input',savePlan);on($('#venue-plan-editor'),'change',savePlan);
    on(root,'click',e=>{
      const save=e.target.closest('[data-venue-save]');if(save){const id=save.dataset.venueSave;saved.has(id)?saved.delete(id):saved.add(id);persist();paintResults();paintPlan();}
      const compare=e.target.closest('[data-venue-compare]');if(compare){const id=compare.dataset.venueCompare;if(comparison.has(id))comparison.delete(id);else if(comparison.size<3)comparison.add(id);else{status('一次最多对比 3 项。移出一项后再添加。');return;}paintResults();}
      const plan=e.target.closest('[data-venue-plan]');if(plan){activePlan=plan.dataset.venuePlan;saved.add(activePlan);persist();paintResults();paintPlan();$('#venue-preparation').scrollIntoView({behavior:'instant',block:'start'});}
      const pager=e.target.closest('[data-venue-page]');if(pager){page+=pager.dataset.venuePage==='next'?1:-1;paintResults();$('#venue-results').scrollIntoView({behavior:'instant',block:'start'});}
      if(e.target.closest('[data-venue-reset]')){$('#venue-search').value='';for(const key of ['category','rank','type'])$('#venue-'+key).value='';$('#venue-saved-only').checked=false;page=0;paintResults();}
      if(e.target.closest('[data-export-candidates]'))exportCsv();if(e.target.closest('[data-export-calendar]'))exportCalendar();
    });
    paintResults();paintPlan();
  }
  window.ResearchDesk={markup,mount,friendsMarkup,unmount(){controller?.abort();controller=null;}};
})();
