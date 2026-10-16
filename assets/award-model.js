(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AwardModel=factory();})(globalThis,()=>{
  'use strict';
  const scopeOrder={'全国总决赛':0,'全国赛':0,'全国邀请赛':0,'亚洲区域赛':1,'国际赛':1,'省赛':2,'区域赛':2,'地区赛':2,'赛区赛':2,'分赛区选拔赛':2};
  const groupNames=['全国赛与全国邀请赛','国际与亚洲区域赛事','省级与地区赛事','其他赛事奖项','参赛记录','专业认证','科研成果'];
  const group=a=>a.kind==='award'?(scopeOrder[a.level]??3):({participation:4,certification:5,research:6}[a.kind]??6);
  const prize=a=>/一等奖|金奖/.test(a.prize)?0:/二等奖|银奖/.test(a.prize)?1:/三等奖|铜奖/.test(a.prize)?2:3;
  const compare=(a,b)=>group(a)-group(b)||prize(a)-prize(b)||(parseInt(b.year)||0)-(parseInt(a.year)||0)||a.id.localeCompare(b.id);
  const find=(awards,id)=>awards.find(a=>a.id===id||(a.stages||[]).some(s=>s.id===id))||(id==='math-hubei-2023'?awards.find(a=>a.id==='math-national-2023'):undefined);
  const searchable=a=>[a.title,a.prize,a.detail,a.category,...(a.stages||[]).flatMap(s=>[s.level,s.prize,s.detail])].join(' ').toLowerCase();
  return {compare,find,group,groupNames,searchable};
});
