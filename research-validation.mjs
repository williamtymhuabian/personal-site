import ResearchModel from './assets/research-model.js';
export function validateResearch({research,books,posts,fields}){
  const fail=message=>{throw new Error('研究方向数据：'+message);};
  if(!research||!ResearchModel.validDate(research.checkedAt)||research.groups.length!==10||research.directions.length!==100)fail('需要10个分组和100个方向。');
  const groups=new Set(research.groups.map(g=>g.id)),ids=new Set(research.directions.map(d=>d.id)),fieldIds=new Set(fields.map(f=>f.id));
  if(groups.size!==10||ids.size!==100)fail('标识重复。');
  for(const g of research.groups)for(const s of g.sources)if(new URL(s.url).protocol!=='https:')fail('来源需为HTTPS。');
  for(const d of research.directions){
    if(!/^rd-\d{3}$/.test(d.id)||d.id!=='rd-'+String(d.number).padStart(3,'0')||!groups.has(d.groupId)||!d.title||!d.question||!d.keywords||!d.fieldIds.length||d.fieldIds.some(id=>!fieldIds.has(id)))fail('方向内容或分类无效：'+d.id);
  }
  const bookIds=new Set(books.map(b=>b.id));if(bookIds.size!==books.length)fail('书目标识重复。');
  const privateText=JSON.stringify({research,books});if(/(?:^|["\s])[A-Z]:[\\/]|file:\/\//i.test(privateText))fail('不可包含本地文件路径。');
  for(const b of books){
    if(!/^[a-z0-9-]+$/.test(b.id)||!b.title||!b.authors||!b.description||!b.prerequisites||!b.directionIds.length||b.directionIds.some(id=>!ids.has(id)))fail('书目内容无效。');
    for(const url of [b.sourceUrl,b.readingUrl])if(new URL(url).protocol!=='https:')fail('书目链接无效。');
    if(b.format!==undefined&&b.format!=='online-handbook')fail('书目资源类型无效。');
    if(b.roadmapUrl!==undefined&&new URL(b.roadmapUrl).protocol!=='https:')fail('学习路线链接无效。');
    if(b.practicePlatforms!==undefined){
      if(!Array.isArray(b.practicePlatforms)||new Set(b.practicePlatforms.map(p=>p.name)).size!==b.practicePlatforms.length)fail('练习平台列表无效。');
      for(const p of b.practicePlatforms){
        if(!p.name||!p.description)fail('练习平台介绍缺失。');
        for(const url of [p.officialUrl,p.practiceUrl,p.contestsUrl])if(new URL(url).protocol!=='https:')fail('练习平台链接无效。');
      }
    }
    if(!Array.isArray(b.chapters)||new Set(b.chapters.map(c=>c.number)).size!==b.chapters.length||new Set(b.chapters.map(c=>c.postSlug)).size!==b.chapters.length)fail('章节索引重复或格式无效。');
    if(b.totalChapters!==undefined&&(!Number.isInteger(b.totalChapters)||b.totalChapters<1||b.chapters.length>b.totalChapters))fail('全书章节数量无效。');
    for(const [index,c] of b.chapters.entries()){const p=posts.find(p=>p.slug===c.postSlug);if(c.number!==index+1||!p||p.book!==b.id||Number(p.chapter)!==c.number||!c.pages||!c.title||!c.goal||!c.directionIds.length||c.directionIds.some(id=>!ids.has(id)||!p.research.includes(id)||!b.directionIds.includes(id)))fail('章节或文章关联错误。');}
  }
  for(const p of posts){if(!Array.isArray(p.research)||p.research.some(id=>!ids.has(id))||new Set(p.research).size!==p.research.length)fail('文章关联方向错误：'+p.slug);if(p.book&&!bookIds.has(p.book))fail('文章关联书目不存在。');}
}
