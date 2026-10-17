(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DeadlineModel=factory();})(globalThis,()=>{
  'use strict';
  const zones=[['AoE','AoE · UTC−12',-720],['UTC','UTC · UTC+00',0],['UTC+8','北京时间 · UTC+08',480],['UTC-8','UTC−08',-480],['UTC-7','UTC−07',-420],['UTC-5','UTC−05',-300],['UTC-4','UTC−04',-240],['UTC+1','UTC+01',60],['UTC+2','UTC+02',120],['UTC+5:30','UTC+05:30',330],['UTC+9','UTC+09',540],['UTC+12','UTC+12',720]];
  const instant=record=>{
    const match=/^(20\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(record.localDateTime||''),zone=zones.find(z=>z[0]===record.zone);
    if(!match||!zone)return NaN;
    const [year,month,day,hour,minute,second]=match.slice(1).map(n=>Number(n||0));
    const utc=Date.UTC(year,month-1,day,hour,minute,second),date=new Date(utc);
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day||hour>23||minute>59||second>59)return NaN;
    return utc-zone[2]*60000;
  };
  function validate(record,venueIds){
    const keys=['id','venueId','title','type','mode','localDateTime','zone','sourceUrl','note','checkedAt','seedId','done','reminderDays'];
    if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!keys.includes(k)))throw new Error('记事含未知字段。');
    if(typeof record.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(record.id)||typeof record.venueId!=='string'||record.venueId&&!venueIds.has(record.venueId))throw new Error('记事或场所标识无效。');
    for(const [key,max]of [['title',160],['note',2000],['sourceUrl',1000],['seedId',100]])if(typeof record[key]!=='string'||record[key].length>max)throw new Error('记事文字过长或格式错误。');
    if(!record.title.trim()||!['journal','conference'].includes(record.type)||!['deadline','pending','rolling','plan'].includes(record.mode)||typeof record.done!=='boolean'||![0,1,3,7].includes(record.reminderDays))throw new Error('请核对事项名称、类型与提醒设置。');
    if(!zones.some(z=>z[0]===record.zone))throw new Error('请选择支持的 UTC 时区。');
    let url;try{url=new URL(record.sourceUrl);}catch{throw new Error('请填写完整 HTTPS 官网或来源链接。');}
    if(url.protocol!=='https:'||url.username||url.password||/[\u0000-\u0020\u007f]/.test(record.sourceUrl))throw new Error('来源链接需为不带登录凭据或空白控制字符的 HTTPS 地址。');
    if(record.mode==='deadline'||record.mode==='plan'){if(!Number.isFinite(instant(record)))throw new Error('请核对截止日期、时间和 UTC 时区。');}
    else if(record.localDateTime!=='')throw new Error('待核对与常规投稿记录不应附带未经确认的日期。');
    if(record.checkedAt!==''&&(!/^20\d{2}-\d{2}-\d{2}$/.test(record.checkedAt)||!Number.isFinite(instant({localDateTime:record.checkedAt+'T00:00',zone:'UTC'}))))throw new Error('核对日期无效。');
    return record;
  }
  const state=(record,now=Date.now())=>record.done?'done':record.mode==='pending'?'pending':record.mode==='rolling'?'rolling':instant(record)<now?'expired':instant(record)-now<=7*86400000?'soon':'open';
  const compare=(a,b,now=Date.now())=>{const order={soon:0,open:0,pending:1,rolling:2,expired:3,done:4},sa=state(a,now),sb=state(b,now);return order[sa]-order[sb]||(Number.isFinite(instant(a))&&Number.isFinite(instant(b))?(sa==='expired'?instant(b)-instant(a):instant(a)-instant(b)):0)||a.title.localeCompare(b.title);};
  function parseBackup(text,venueIds){
    const value=JSON.parse(text);
    if(!value||value.schema!=='william-deadlines-v1'||!Array.isArray(value.records)||value.records.length>500)throw new Error('请选择本站导出的 DDL 备份，最多 500 条。');
    const ids=new Set();for(const record of value.records){validate(record,venueIds);if(ids.has(record.id))throw new Error('备份含重复记事标识。');ids.add(record.id);}
    return value.records;
  }
  const escape=value=>String(value).replaceAll('\\','\\\\').replaceAll('\r','').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
  const stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const fold=line=>{let part='',bytes=0,out='';for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>73){out+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=size;}return out+part;};
  function calendar(records,now=Date.now()){
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Williamtym//Deadline Notebook//ZH','CALSCALE:GREGORIAN'];
    for(const record of records.filter(r=>!r.done&&Number.isFinite(instant(r)))){
      lines.push('BEGIN:VEVENT',`UID:${record.id}@williamtym-deadline.local`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(instant(record))}`,`DTEND:${stamp(instant(record)+60000)}`,`SUMMARY:${escape((record.mode==='plan'?'个人计划：':'DDL：')+record.title)}`,`URL:${record.sourceUrl}`,`DESCRIPTION:${escape('时间：'+record.localDateTime+' '+record.zone+'\n来源：'+record.sourceUrl+'\n'+record.note)}`);
      if(record.reminderDays)lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escape(record.title)}`,`TRIGGER:-P${record.reminderDays}D`,'END:VALARM');
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
  }
  return {zones,instant,validate,state,compare,parseBackup,calendar};
});
