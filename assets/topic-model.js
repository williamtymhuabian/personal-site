(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TopicModel=factory();})(globalThis,()=>{
  'use strict';
  const fieldKeys={theory:'sorting',ai:'neural',network:'network'};
  function entries({posts=[],projects=[],papers=[],fields=[],journeys=[],ccfCatalog={venues:[]}}){
    return [
      {key:'general',title:'网站公共留言板',info:'网站交流',href:'#/community'},
      ...posts.map(p=>({key:'post:'+p.slug,title:p.title,info:'手记 · '+p.category,href:'#/post/'+p.slug})),
      ...projects.map(p=>({key:'project:'+p.id,title:p.title,info:'项目 · '+p.year,href:'#/projects'})),
      ...papers.map(p=>({key:'paper:'+p.id,title:p.title,info:'论文 · '+p.year+' · '+p.venue,href:'#/papers?paper='+p.id})),
      ...fields.map(f=>({key:'lab:'+(fieldKeys[f.id]||f.id),title:f.title+'实验室',info:'计算机方向 · '+f.experiment,href:'#/labs?field='+f.id})),
      {key:'lab:embodied',title:'具身导航实验室',info:'机器人路径规划教学示例',href:'#/lab'},
      ...journeys.map(s=>({key:'journey:'+s.id,title:s.city+' · 足迹与旅行',info:'城市见闻与参赛交流',href:'#/journeys?city='+s.id})),
      ...ccfCatalog.venues.map(v=>({key:'venue:'+v.id,title:(v.abbr?v.abbr+' · ':'')+v.name,info:'CCF '+v.rank+' · '+(v.type==='journal'?'期刊':'会议'),href:'#/venues?category='+v.categoryId+'&q='+encodeURIComponent(v.name)}))
    ];
  }
  function term(key){return 'Williamtym · '+key;}
  function links({profile,community,entry,hash,message=''}){
    if(!/^[a-f0-9]{40}$/.test(hash))throw new Error('话题缺少有效的严格匹配标识。');
    const title=term(entry.key),backlink=profile.siteUrl.replace(/\/?$/,'/')+entry.href;
    const text=[...String(message).trim()].slice(0,600).join('');
    const body=`交流主题：${[...entry.title].slice(0,100).join('')}\n页面：${backlink}\n\n${text||'我想讨论：\n'}\n\n<!-- sha1: ${hash} -->`;
    const create=new URL(`https://github.com/${community.repo}/discussions/new`);
    create.searchParams.set('category',community.category.toLowerCase().replaceAll(' ','-'));create.searchParams.set('title',title);create.searchParams.set('body',body);
    const search=new URL(`https://github.com/${community.repo}/discussions`);search.searchParams.set('discussions_q','in:body '+hash);
    const email=new URL('mailto:'+profile.certificateContact.email);email.searchParams.set('subject','网站交流：'+[...entry.title].slice(0,80).join(''));email.searchParams.set('body',`主题：${entry.title}\n页面：${backlink}\n\n${text}`);
    return {create:create.href,search:search.href,email:email.href,backlink,body,title};
  }
  return {entries,term,links,fieldKey:id=>'lab:'+(fieldKeys[id]||id)};
});
