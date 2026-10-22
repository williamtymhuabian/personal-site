(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ResearchModel=factory();})(globalThis,()=>{
  'use strict';
  const schema='william-learning-v1';
  const types={reading:'阅读',note:'笔记',experiment:'练习 / 实验',paper:'论文研读'};
  const validDate=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  function checkRecord(r,{directions,posts=[],books=[]}){
    const allowed=['id','directionIds','date','type','title','note','postSlug','bookId'];
    if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!allowed.includes(k)))throw new Error('学习记录结构不正确。');
    if(typeof r.id!=='string'||!/^learn-[a-z0-9-]{1,100}$/.test(r.id))throw new Error('学习记录标识无效。');
    const ids=new Set(directions.map(d=>d.id));
    if(!Array.isArray(r.directionIds)||!r.directionIds.length||r.directionIds.length>5||new Set(r.directionIds).size!==r.directionIds.length||r.directionIds.some(id=>!ids.has(id)))throw new Error('每条记录需关联 1—5 个有效研究方向。');
    if(!validDate(r.date)||!Object.hasOwn(types,r.type))throw new Error('学习日期或类型无效。');
    if(typeof r.title!=='string'||!r.title.trim()||r.title.length>160||typeof r.note!=='string'||!r.note.trim()||r.note.length>2000)throw new Error('请填写学习主题和具体收获（主题最多160字，收获最多2000字）。');
    if(typeof r.postSlug!=='string'||(r.postSlug&&!posts.some(p=>p.slug===r.postSlug))||typeof r.bookId!=='string'||(r.bookId&&!books.some(b=>b.id===r.bookId)))throw new Error('关联文章或书目不存在。');
    if(r.postSlug&&r.bookId){const p=posts.find(p=>p.slug===r.postSlug);if(p.book&&p.book!==r.bookId)throw new Error('文章与书目不匹配。');}
    return {...r,directionIds:[...r.directionIds],title:r.title.trim(),note:r.note.trim()};
  }
  function parse(raw,context){
    if(typeof raw!=='string'||raw.length>2000000)throw new Error('备份文件过大或格式无效。');
    const value=JSON.parse(raw);
    if(!value||Array.isArray(value)||value.schema!==schema||!Array.isArray(value.records)||value.records.length>500||Object.keys(value).some(k=>!['schema','records'].includes(k)))throw new Error('不是有效的学习记录备份（最多500条）。');
    const records=value.records.map(r=>checkRecord(r,context));
    if(new Set(records.map(r=>r.id)).size!==records.length)throw new Error('备份中存在重复记录标识。');
    return records;
  }
  function merge(current,incoming){
    const result=new Map(current.map(r=>[r.id,r]));
    for(const r of incoming){if(result.has(r.id)&&JSON.stringify(result.get(r.id))!==JSON.stringify(r))throw new Error('相同标识存在不同内容，请先核对备份；现有记录未改变。');result.set(r.id,r);}
    if(result.size>500)throw new Error('合并后超过500条，请先整理。');
    return [...result.values()];
  }
  function ranked(directions,countFor){
    const rows=directions.map(d=>({...d,count:countFor(d.id)})).sort((a,b)=>(b.count??-1)-(a.count??-1)||a.number-b.number);
    let previous=null,rank=0;
    return rows.map((d,index)=>{if(d.count!==previous){rank=index+1;previous=d.count;}return {...d,rank:d.count>0?rank:null};});
  }
  function personal(directions,records){return ranked(directions,id=>records.filter(r=>r.directionIds.includes(id)).length);}
  function publicCount(payload,repo){
    const d=payload?.discussion;
    if(!d||d.repository?.nameWithOwner?.toLowerCase()!==repo.toLowerCase())throw new Error('公开互动返回了不匹配的讨论。');
    let url;try{url=new URL(d.url);}catch{throw new Error('讨论地址无效。');}
    const prefix='/'+repo.toLowerCase()+'/discussions/';
    if(url.origin!=='https://github.com'||!url.pathname.toLowerCase().startsWith(prefix)||!/^\d+$/.test(url.pathname.slice(prefix.length)))throw new Error('讨论地址不属于本站。');
    const count=d.reactions?.THUMBS_UP?.count;
    if(!Number.isSafeInteger(count)||count<0)throw new Error('公开票数格式不正确。');
    return {count,url:url.href};
  }
  function citation(direction,siteUrl){return `[${direction.title} · ${direction.id}](${siteUrl.replace(/\/?$/,'/')}#/research?direction=${direction.id})`;}
  return {schema,types,validDate,checkRecord,parse,merge,ranked,personal,publicCount,citation};
});
