const categories=['systems','network','security','software','data','theory','graphics','ai','hci','interdisciplinary'];
function object(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw new Error('研究导航含未知字段。');}
const text=v=>typeof v==='string'&&v.trim();
const identifier=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]*$/.test(v);
function url(value,empty=false){if(empty&&value==='')return;try{if(typeof value!=='string'||!['https:','http:'].includes(new URL(value).protocol))throw new Error();}catch{throw new Error('研究导航链接无效。');}}
export function validateExplore({fields,friends,ccfCatalog}){
  if(!Array.isArray(fields)||fields.length!==categories.length||new Set(fields.map(f=>f.id)).size!==categories.length)throw new Error('计算机导航需要十个独立主方向。');
  const demos=['scheduler','legacy-network','access','state','index','legacy-sort','bezier','legacy-neural','fitts','montecarlo'];
  for(const field of fields){object(field,['id','title','ccfName','intro','topics','experiment','demo']);if(!categories.includes(field.id)||!demos.includes(field.demo)||!['title','ccfName','intro','experiment'].every(k=>text(field[k]))||!Array.isArray(field.topics)||!field.topics.length||!field.topics.every(text))throw new Error('计算机方向内容无效。');}
  if(!Array.isArray(friends))throw new Error('朋友需要为数组。');const friendIds=new Set();
  for(const friend of friends){object(friend,['id','nickname','bio','url']);if(!identifier(friend.id)||friendIds.has(friend.id)||!text(friend.nickname)||!text(friend.bio))throw new Error('朋友记录无效或重复。');friendIds.add(friend.id);url(friend.url,true);if(/(?<!\d)1[3-9]\d{9}(?!\d)|(?<!\d)[1-9]\d{16}[\dXx](?!\d)|[A-Za-z]:[\\/]/.test(JSON.stringify(friend)))throw new Error('朋友记录疑似含私人编号或路径。');}
  object(ccfCatalog,['edition','updatedAt','checkedAt','sourceUrl','sourcePdfUrl','sourceMirrorPage','sourceNote','sourceSha256','categories','venues']);
  for(const key of ['edition','sourceNote'])if(!text(ccfCatalog[key]))throw new Error('CCF目录需要版本与来源说明。');
  for(const key of ['updatedAt','checkedAt'])if(!/^20\d{2}-\d{2}-\d{2}$/.test(ccfCatalog[key]))throw new Error('CCF目录日期无效。');
  for(const key of ['sourceUrl','sourcePdfUrl','sourceMirrorPage'])url(ccfCatalog[key]);
  if(new URL(ccfCatalog.sourceUrl).hostname!=='www.ccf.org.cn'||!/^[a-f0-9]{64}$/.test(ccfCatalog.sourceSha256))throw new Error('CCF目录需要官方来源与原文件摘要。');
  if(!Array.isArray(ccfCatalog.categories)||ccfCatalog.categories.length!==categories.length||new Set(ccfCatalog.categories.map(c=>c.id)).size!==categories.length)throw new Error('CCF方向分类不完整。');
  for(const category of ccfCatalog.categories){object(category,['id','name']);if(!categories.includes(category.id)||!text(category.name))throw new Error('CCF方向无效。');}
  if(!Array.isArray(ccfCatalog.venues)||!ccfCatalog.venues.length)throw new Error('CCF目录为空。');const ids=new Set();
  for(const venue of ccfCatalog.venues){object(venue,['id','categoryId','type','rank','abbr','name','publisher','url','note']);if(!identifier(venue.id)||ids.has(venue.id)||!categories.includes(venue.categoryId)||!['journal','conference'].includes(venue.type)||!['A','B','C'].includes(venue.rank)||!text(venue.name)||!text(venue.publisher)||typeof venue.abbr!=='string'||venue.note!==undefined&&!text(venue.note))throw new Error('CCF条目无效或重复。');ids.add(venue.id);url(venue.url,true);if(!venue.url&&!venue.note)throw new Error('目录未提供网址时需要明确说明。');}
  for(const category of categories)for(const type of ['journal','conference'])for(const rank of ['A','B','C'])if(!ccfCatalog.venues.some(v=>v.categoryId===category&&v.type===type&&v.rank===rank))throw new Error('CCF目录分类区块缺失。');
}
