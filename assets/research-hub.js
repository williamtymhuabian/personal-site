(() => {
  'use strict';
  const data=JSON.parse(document.getElementById('site-data').textContent);
  const {research,books,posts,profile,fields,community}=data,model=window.ResearchModel;
  const directions=research.directions,byId=new Map(directions.map(d=>[d.id,d]));
  const context={directions,books,posts},key='william-learning-v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const route=id=>'#/research?direction='+id;
  const chips=ids=>`<div class="research-chips">${ids.map(id=>`<a href="${route(id)}">${esc(byId.get(id).title)}</a>`).join('')}</div>`;
  const bookLink=b=>`<a href="#/books?book=${b.id}">${esc(b.title)}</a>`;
  const relatedPosts=id=>posts.filter(p=>p.research.includes(id));
  let controller,publicVotes=new Map(),loading=false,generation=0;
  const publicStatus={checked:0,finished:false,error:''};
  function dialog(){return `<dialog id="learning-dialog" class="learning-dialog" aria-labelledby="learning-heading"><form id="learning-form"><div class="section-heading"><h2 id="learning-heading">记录本次学习</h2><button type="button" class="text-link" data-learning-close>关闭</button></div><p>留下今天真正学到的内容，保存后才会计入个人学习榜。</p><label>学习主题<input id="learning-title" required maxlength="160" placeholder="例如：工具结果为什么要回传给模型"></label><div class="learning-form-grid"><label>学习日期<input id="learning-date" type="date" min="2000-01-01" max="2099-12-31" required></label><label>记录类型<select id="learning-type">${Object.entries(model.types).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label></div><label>关联研究方向（1—5项）<select id="learning-directions" multiple size="6" required>${directions.map(d=>`<option value="${d.id}">${d.id} · ${esc(d.title)}</option>`).join('')}</select></label><p class="learning-hint">电脑按 Ctrl / ⌘ 可多选；手机可使用系统多选。一次学习关联多个方向时，每个方向各记1条。</p><div class="learning-form-grid"><label>关联书目<select id="learning-book"><option value="">不关联书目</option>${books.map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select></label><label>关联站内文章<select id="learning-post"><option value="">不关联文章</option>${posts.map(p=>`<option value="${p.slug}">${esc(p.title)}</option>`).join('')}</select></label></div><label>学到了什么 / 练习结果<textarea id="learning-note" required maxlength="2000" rows="5" placeholder="写清概念、例子、结果或还没解决的问题。不要只写“已读”。"></textarea></label><p id="learning-form-status" role="status"></p><div class="hero-actions"><button type="submit" class="primary-link">保存学习记录</button><button type="button" class="text-link" data-learning-close>取消</button></div></form></dialog>`;}
  function backups(){return `<div class="research-backups"><button type="button" data-learning-export>导出学习记录</button><button type="button" data-learning-import>导入学习记录</button><input id="learning-import-file" type="file" accept=".json,application/json" hidden><button type="button" data-learning-undo hidden>撤销删除</button></div>`;}
  function sourceLinks(group){return `<div class="research-sources">${group.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>`).join('')}</div>`;}
  function directionDetail(d){
    const group=research.groups.find(g=>g.id===d.groupId),articles=relatedPosts(d.id),relatedBooks=books.filter(b=>b.directionIds.includes(d.id));
    return `<a class="back-link" href="#/research">← 全部研究方向</a><header class="page-header"><p class="eyebrow">RESEARCH / ${d.id.toUpperCase()}</p><h1>${esc(d.title)}</h1><p>${esc(d.keywords)}</p></header><div class="research-question"><span class="tiny-label">研究什么</span><p>${esc(d.question)}</p><div class="hero-actions"><button type="button" class="primary-link" data-learning-direction="${d.id}">记录这方面的学习</button><button type="button" class="text-link" data-research-cite="${d.id}">复制方向引用</button><a class="text-link" href="#/community?topic=${encodeURIComponent('research:'+d.id)}">公开投票与讨论 ↗</a></div></div><p class="research-note">公开票数统计方向主帖的「+1 / 赞」表情；评论里的表情不计票，同一 GitHub 账号可撤回自己的赞。</p><div class="research-links">${d.fieldIds.map(id=>`<a href="#/venues?category=${id}">${esc(fields.find(f=>f.id===id).title)} · 期刊会议 ↗</a><a href="#/notebook?category=${id}">对应 DDL ↗</a>`).join('')}</div><section class="research-related"><h2>相关学习文章 <span>${articles.length}</span></h2>${articles.length?articles.map(p=>`<article><h3><a href="#/post/${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p></article>`).join(''):'<p>这里还没有关联文章。你可以先做一次学习记录，再把笔记整理成文章。</p>'}<h2>推荐书目</h2>${relatedBooks.length?relatedBooks.map(b=>`<p>${bookLink(b)} · ${esc(b.authors)}</p>`).join(''):'<p>这一方向的书目待补充。</p>'}</section><section><h2>我的相关学习记录</h2><div id="learning-records" data-direction="${d.id}"></div></section><details class="research-source-disclosure"><summary>这个方向的领域来源</summary>${sourceLinks(group)}</details>`;
  }
  function markup(query){
    const d=byId.get(query.get('direction')),view=['personal','public'].includes(query.get('view'))?query.get('view'):'explore';
    return `<div class="research-surface" id="research-hub" data-view="${view}">${d?directionDetail(d):`<header class="page-header"><p class="eyebrow">RESEARCH / LEARN / CONNECT</p><h1>研究方向与学习榜</h1><p>从100个方向里找到问题，把阅读、练习和文章连成自己的研究路径。</p></header><nav class="research-tabs" aria-label="研究方向视图"><a href="#/research" ${view==='explore'?'aria-current="page"':''}>方向地图</a><a href="#/research?view=personal" ${view==='personal'?'aria-current="page"':''}>我的学习榜</a><a href="#/research?view=public" ${view==='public'?'aria-current="page"':''}>公开热度榜</a><a href="#/books">推荐书目 ↗</a><a href="#/post/embodied-kaiwu-training-roadmap">课题训练 ↗</a></nav><p class="research-note">${view==='public'?'按本站 GitHub 方向主帖的「+1 / 赞」数量排序。点击刷新读取公开票数，未读取或读取失败显示“未获取”，不记为0票。':view==='personal'?'按你确认保存的学习记录数量排序；同一记录关联多个方向时分别计入。文章上线不会自动替你打卡。':'编号是稳定引用索引，不是全球热度排名。每个方向都可以关联学习记录、文章、书目和期刊会议。'}</p>${view==='public'?'<div class="hero-actions"><button type="button" class="primary-link" data-public-refresh>刷新全部100项公开票数</button><span id="public-progress" role="status"></span></div>':'<div class="hero-actions"><button type="button" class="primary-link" data-learning-new>＋ 记录本次学习</button></div>'}<div class="research-filters"><label>搜索方向<input id="research-search" type="search" maxlength="100" placeholder="名称、英文词、研究问题"></label><label>研究分组<select id="research-group"><option value="">全部10组</option>${research.groups.map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select></label></div><p id="research-count" role="status"></p><div id="research-results" class="research-results"></div><div class="research-pagination"><button type="button" data-research-page="prev">上一页</button><span id="research-page"></span><button type="button" data-research-page="next">下一页</button></div>${view==='personal'?'<section><h2>我的学习记录</h2><div id="learning-records"></div></section>':''}<details class="research-source-disclosure"><summary>资料范围与来源（核对 ${research.checkedAt}）</summary><p>${esc(research.methodology)}</p>${research.groups.map(g=>`<h3>${esc(g.title)}</h3>${sourceLinks(g)}`).join('')}</details>`}<p class="research-status" data-research-status role="status"></p>${backups()}<p class="research-note">个人记录仅保存在本浏览器，可导出备份；公开投票通过 GitHub 登录后由你提交，所有访客读取同一讨论的数据。这里的“榜”用于学习交流，不代表学术能力或全球研究热度。</p>${dialog()}</div>`;
  }
  function practicePlatformsMarkup(book){
    if(!book.practicePlatforms?.length)return '';
    return `<section class="algorithm-practice" aria-label="算法练习与比赛"><h3>算法练习与比赛</h3><p>读一个专题，独立实现，再选题练习；把思路、复杂度和错题原因写进学习记录。</p><div class="algorithm-platforms">${book.practicePlatforms.map(p=>`<article class="algorithm-platform"><h4><a href="${esc(p.officialUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.name)} ↗</a></h4><p>${esc(p.description)}</p>${p.notice?`<p class="algorithm-platform-notice">${esc(p.notice)}</p>`:''}<div class="research-links"><a href="${esc(p.practiceUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.practiceLabel||'练习入口')} ↗</a>${p.contestsUrl?`<a href="${esc(p.contestsUrl)}" target="_blank" rel="noopener noreferrer">比赛列表 ↗</a>`:''}${p.legacyUrl?`<a href="${esc(p.legacyUrl)}" target="_blank" rel="noopener noreferrer">历史入口（HTTP） ↗</a>`:''}</div></article>`).join('')}</div></section>`;
  }
  function booksMarkup(query){
    const selected=books.find(b=>b.id===query.get('book'));
    const list=selected?[selected]:books;
    return `<div class="research-surface" id="bookshelf"><header class="page-header"><p class="eyebrow">READ / PRACTICE / SHARE</p><h1>${selected?esc(selected.title):'推荐书目与共读'}</h1><p>从 Agent、检索与模型实现，到 OI Wiki 算法基础与刷题练习，按自己的问题选择阅读路径。</p></header><nav class="research-tabs"><a href="#/research">研究方向 ↗</a><a href="#/research?view=personal">我的学习榜 ↗</a><a href="#/post/embodied-kaiwu-training-roadmap">开悟与课题训练 ↗</a>${selected?.id!=='oi-wiki'?'<a href="#/books?book=oi-wiki">算法学习与刷题 ↗</a>':''}${selected?'<a href="#/books">全部书目</a>':''}</nav><div class="books-list">${list.map((b,i)=>`<article class="book-entry" id="book-${b.id}"><div class="book-spine" aria-hidden="true">${String(books.indexOf(b)+1).padStart(2,'0')}</div><div><span class="tiny-label">${b.chapters.length?(b.totalChapters&&b.chapters.length===b.totalChapters?'全书'+b.totalChapters+'章导读已更新':'已更新'+b.chapters.length+'章导读'):b.format==='online-handbook'?'在线算法手册 · 边读边练':'推荐阅读 · 导读待整理'}</span><h2>${bookLink(b)}</h2><p class="book-author">${esc(b.authors)} · ${esc(b.edition)}</p><p>${esc(b.description)}</p><p><strong>阅读准备：</strong>${esc(b.prerequisites)}</p>${chips(b.directionIds)}<div class="research-links"><a href="${esc(b.sourceUrl)}" target="_blank" rel="noopener noreferrer">${b.format==='online-handbook'?'社区与源代码':'作者 / 出版方'} ↗</a><a href="${esc(b.readingUrl)}" target="_blank" rel="noopener noreferrer">${b.format==='online-handbook'?'前往 OI Wiki 学习':'阅读与配套资源'} ↗</a>${b.roadmapUrl?`<a href="${esc(b.roadmapUrl)}" target="_blank" rel="noopener noreferrer">官方学习路线 ↗</a>`:''}<button type="button" data-learning-book="${b.id}">记录阅读收获</button></div>${b.chapters.length?`<ol class="book-chapters">${b.chapters.map(c=>`<li><h3><a href="#/post/${c.postSlug}">第${c.number}章 · ${esc(c.title)} →</a></h3><p>${esc(c.goal)}</p><small>${esc(c.pages)}</small>${chips(c.directionIds)}</li>`).join('')}</ol>`:''}${practicePlatformsMarkup(b)}</div></article>`).join('')}</div><p class="research-note">页面提供书目介绍、原创导读和正规阅读入口。学习记录由本人阅读后确认，不预设已读状态。</p><p class="research-status" data-research-status role="status"></p>${backups()}${dialog()}</div>`;
  }
  function articleMarkup(post){
    if(!post.research.length)return '';
    const book=books.find(b=>b.id===post.book);
    const {previous,next}=model.chapterNeighbors(book,post.slug);
    const navigation=book?`<nav class="research-links" aria-label="共读章节导航">${previous?`<a href="#/post/${previous.postSlug}" rel="prev">← 第${previous.number}章 · ${esc(previous.title)}</a>`:''}<a href="#/books?book=${book.id}">全书章节索引</a>${next?`<a href="#/post/${next.postSlug}" rel="next">第${next.number}章 · ${esc(next.title)} →</a>`:''}</nav>`:'';
    return `<section class="research-surface article-research" aria-label="文章关联研究方向"><span class="tiny-label">这次学习关联到哪里</span>${chips(post.research)}${book?`<p>共读：${bookLink(book)} · 第${esc(post.chapter)}章</p>`:''}${navigation}<div class="research-links"><button type="button" data-learning-post="${post.slug}">读完后记录学习收获</button><a href="#/research?view=personal">查看我的学习榜 ↗</a></div><p data-research-status role="status"></p>${dialog()}</section>`;
  }
  function mount(root){
    if(!root.querySelector('.research-surface'))return;
    controller=new AbortController();const signal=controller.signal,$=s=>root.querySelector(s),on=(el,type,fn)=>el?.addEventListener(type,fn,{signal});
    let records=[],storageError=false,editing='',deleted=null,page=0;
    const status=text=>{const el=$('[data-research-status]');if(el)el.textContent=text;};
    try{const raw=localStorage.getItem(key);records=raw?model.parse(raw,context):[];}catch{storageError=true;status('现有学习存储无法读取，已保留原数据。请先导出原始备份，再核对导入。');}
    function persist(next){
      if(storageError){status('现有存储无法读取，未覆盖原数据。请先导出原始备份。');return false;}
      try{localStorage.setItem(key,JSON.stringify({schema:model.schema,records:next}));records=next;return true;}catch{status('浏览器未能保存，记录没有计入榜单。请检查存储权限或先导出备份。');return false;}
    }
    const view=$('#research-hub')?.dataset.view||'explore';
    function paintRecords(){
      const host=$('#learning-records');if(!host)return;
      const shown=records.filter(r=>!host.dataset.direction||r.directionIds.includes(host.dataset.direction)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
      host.innerHTML=shown.length?shown.map(r=>`<article class="learning-record"><div><time>${r.date}</time> · ${model.types[r.type]}</div><h3>${esc(r.title)}</h3><p>${esc(r.note)}</p>${chips(r.directionIds)}<div class="research-links">${r.postSlug?`<a href="#/post/${r.postSlug}">关联文章 ↗</a>`:''}${r.bookId?bookLink(books.find(b=>b.id===r.bookId)):''}<button type="button" data-learning-edit="${r.id}">编辑</button><button type="button" data-learning-delete="${r.id}">删除</button></div></article>`).join(''):'<p class="empty-state">还没有学习记录。读完、写完或练习过，再把真实收获留在这里。</p>';
    }
    function paint(){
      paintRecords();const host=$('#research-results');if(!host)return;
      const q=$('#research-search').value.trim().toLowerCase(),group=$('#research-group').value;
      let rows=view==='personal'?model.personal(directions,records):view==='public'?model.ranked(directions,id=>publicVotes.get(id)?.count??null):directions;
      const known=directions.filter(d=>publicVotes.has(d.id)).length;
      if(view==='public'){$('[data-public-refresh]').disabled=loading;$('#public-progress').textContent=loading?`正在读取 ${publicStatus.checked} / 100`:known===100?'100项已核对 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):known?`仅已获取 ${known}/100项，排序不完整${publicStatus.error?' · '+publicStatus.error:''}`:publicStatus.error||'尚未读取公开票数';}
      rows=rows.filter(d=>(!group||d.groupId===group)&&(!q||[d.title,d.keywords,d.question,d.id].join(' ').toLowerCase().includes(q)));
      page=Math.min(page,Math.max(0,Math.ceil(rows.length/12)-1));
      $('#research-count').textContent=`${rows.length} 个方向${view==='personal'?' · '+records.length+'条学习记录':''}${view==='public'&&known<100?' · 尚非完整热度排名':''}`;
      host.innerHTML=rows.slice(page*12,page*12+12).map(d=>`<article class="research-entry"><div class="research-entry-meta"><span>${d.id} · ${esc(research.groups.find(g=>g.id===d.groupId).title)}</span>${view==='personal'?`<span>${d.rank?'并列序位 '+d.rank+' · ':''}${d.count} 条学习</span>`:view==='public'?`<span>${d.rank?'并列序位 '+d.rank+' · ':''}${d.count===null?'未获取':d.count+' 票'}</span>`:`<span>${relatedPosts(d.id).length} 篇关联文章</span>`}</div><h2><a href="${route(d.id)}">${esc(d.title)}</a></h2><p class="research-keywords">${esc(d.keywords)}</p><p>${esc(d.question)}</p><div class="research-links"><a href="${route(d.id)}">学习与引用 →</a><button type="button" data-learning-direction="${d.id}">记一条学习</button>${view==='public'?`<a href="#/community?topic=${encodeURIComponent('research:'+d.id)}">去投票 ↗</a>`:''}</div></article>`).join('')||'<p class="empty-state">没有匹配的方向，换个关键词试试。</p>';
      $('#research-page').textContent=`${rows.length?page+1:0} / ${Math.ceil(rows.length/12)} 页`;$('[data-research-page="prev"]').disabled=page===0;$('[data-research-page="next"]').disabled=(page+1)*12>=rows.length;
    }
    function open({directionId='',bookId='',postSlug='',record=null}={}){
      if(storageError){status('请先导出并恢复现有学习存储，未创建空白记录。');return;}
      editing=record?.id||'';const post=posts.find(p=>p.slug===(record?.postSlug||postSlug)),book=books.find(b=>b.id===(record?.bookId||bookId||post?.book));
      $('#learning-form').reset();$('#learning-heading').textContent=record?'编辑学习记录':'记录本次学习';
      $('#learning-date').value=record?.date||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
      $('#learning-title').value=record?.title||post?.title||(book?'阅读《'+book.title+'》':'');
      $('#learning-note').value=record?.note||'';$('#learning-type').value=record?.type||'reading';
      $('#learning-book').value=book?.id||'';$('#learning-post').value=post?.slug||'';
      const selected=record?.directionIds||(directionId?[directionId]:post?.research||book?.directionIds.slice(0,5)||[]);
      for(const option of $('#learning-directions').options)option.selected=selected.includes(option.value);
      $('#learning-form-status').textContent='';$('#learning-dialog').showModal();$('#learning-note').focus();
    }
    on($('#learning-form'),'submit',event=>{
      event.preventDefault();try{
        const r=model.checkRecord({id:editing||'learn-'+(crypto.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),date:$('#learning-date').value,type:$('#learning-type').value,title:$('#learning-title').value,note:$('#learning-note').value,directionIds:[...$('#learning-directions').selectedOptions].map(o=>o.value),postSlug:$('#learning-post').value,bookId:$('#learning-book').value},context);
        if(!editing&&records.length>=500)throw new Error('最多保存500条记录，请先整理并备份。');
        if(r.date>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date()))throw new Error('已完成的学习记录不能填写未来日期。');
        const next=editing?records.map(old=>old.id===editing?r:old):[...records,r];
        if(persist(next)){$('#learning-dialog').close();paint();status('已保存，本次学习已计入对应方向。');}
        else $('#learning-form-status').textContent='保存失败，表单仍在。请检查页面中的存储提示。';
      }catch(error){$('#learning-form-status').textContent=error.message;}
    });
    on($('#learning-post'),'change',()=>{const p=posts.find(p=>p.slug===$('#learning-post').value);if(p?.book)$('#learning-book').value=p.book;});
    function download(text){const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='learning-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    on($('#learning-import-file'),'change',async event=>{
      const file=event.target.files[0];if(!file)return;
      try{if(file.size>2000000)throw new Error('备份不能超过2MB。');const incoming=model.parse(await file.text(),context),next=model.merge(records,incoming);if(signal.aborted)return;
        if(storageError){throw new Error('原存储异常。已保留原数据，请先导出原始备份并修复后再导入。');}
        if(persist(next)){paint();status(`已合并导入，现有 ${records.length} 条记录。`);}
      }catch(error){status('导入失败：'+error.message+' 现有记录未改变。');}finally{event.target.value='';}
    });
    async function refreshPublic(){
      if(loading)return;const run=++generation;loading=true;publicVotes=new Map();publicStatus.checked=0;publicStatus.finished=false;publicStatus.error='';paint();
      let cursor=0,stopped=false;
      async function worker(){while(cursor<directions.length&&!stopped&&!signal.aborted){const d=directions[cursor++],url=new URL('https://giscus.app/api/discussions');
        for(const [k,v]of Object.entries({repo:community.repo,term:window.TopicModel.term('research:'+d.id),number:'0',category:community.category,strict:'true',first:'1'}))url.searchParams.set(k,v);
        const local=new AbortController(),abort=()=>local.abort();signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(()=>local.abort(),12000);
        try{const response=await fetch(url,{signal:local.signal,credentials:'omit',referrerPolicy:'no-referrer'});const payload=await response.json();
          if(signal.aborted)return;
          if(response.status===404&&payload.error==='Discussion not found')publicVotes.set(d.id,{count:0,url:''});
          else if(response.ok)publicVotes.set(d.id,model.publicCount(payload,community.repo));
          else throw new Error(response.status===429?'服务限流，请稍后刷新':'公开服务暂时不可用');
        }catch(error){if(!signal.aborted){stopped=true;publicStatus.error=error.name==='AbortError'?'连接超时，请稍后刷新':error.message;}}
        finally{clearTimeout(timer);signal.removeEventListener('abort',abort);if(!signal.aborted){publicStatus.checked++;paint();}}
        if(!stopped&&!signal.aborted&&cursor<directions.length)await new Promise(resolve=>{let pause;const done=()=>{clearTimeout(pause);signal.removeEventListener('abort',done);resolve();};pause=setTimeout(done,2200);signal.addEventListener('abort',done,{once:true});});
      }}
      try{await worker();}finally{if(run===generation){loading=false;publicStatus.finished=publicVotes.size===100;if(!signal.aborted)paint();}}
    }
    on($('#research-search'),'input',()=>{page=0;paint();});on($('#research-group'),'change',()=>{page=0;paint();});
    on(root,'click',async event=>{
      const el=event.target.closest('button');if(!el)return;
      if(el.hasAttribute('data-learning-close'))$('#learning-dialog').close();
      if(el.hasAttribute('data-learning-new'))open();
      if(el.dataset.learningDirection)open({directionId:el.dataset.learningDirection});
      if(el.dataset.learningBook)open({bookId:el.dataset.learningBook});
      if(el.dataset.learningPost)open({postSlug:el.dataset.learningPost});
      if(el.dataset.learningEdit)open({record:records.find(r=>r.id===el.dataset.learningEdit)});
      if(el.dataset.learningDelete){const removed=records.find(r=>r.id===el.dataset.learningDelete);if(persist(records.filter(r=>r.id!==removed.id))){deleted=removed;$('[data-learning-undo]').hidden=false;paint();status('已删除，可撤销。');}}
      if(el.hasAttribute('data-learning-undo')&&deleted){if(persist([...records,deleted])){deleted=null;el.hidden=true;paint();status('已恢复学习记录。');}}
      if(el.hasAttribute('data-learning-export')){try{download(storageError?localStorage.getItem(key)||'':JSON.stringify({schema:model.schema,records},null,2));status(storageError?'已导出原始数据，请保留用于恢复。':'已导出学习记录，请妥善保存个人笔记。');}catch{status('未能读取或导出学习记录。');}}
      if(el.hasAttribute('data-learning-import'))$('#learning-import-file').click();
      if(el.dataset.researchCite){try{await navigator.clipboard.writeText(model.citation(byId.get(el.dataset.researchCite),profile.siteUrl));status('已复制可发布的 Markdown 引用。');}catch{status('复制未完成，可直接复制当前方向页面链接。');}}
      if(el.dataset.researchPage){page+=el.dataset.researchPage==='next'?1:-1;paint();$('#research-results').scrollIntoView({block:'start'});}
      if(el.hasAttribute('data-public-refresh'))refreshPublic();
    });
    on(window,'storage',event=>{if(event.key!==key)return;try{records=event.newValue?model.parse(event.newValue,context):[];storageError=false;paint();status('已同步同浏览器其他标签页的学习记录。');}catch{storageError=true;status('其他标签页的学习数据无法读取，当前记录未被覆盖。');}});
    paint();
  }
  window.ResearchHub={markup,booksMarkup,articleMarkup,mount,unmount(){generation++;controller?.abort();controller=null;loading=false;}};
})();
