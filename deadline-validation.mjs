import DeadlineModel from './assets/deadline-model.js';
export function validateDeadlines(data,catalog){
  if(!data||typeof data!=='object'||Object.keys(data).some(k=>!['checkedAt','records'].includes(k))||!/^20\d{2}-\d{2}-\d{2}$/.test(data.checkedAt)||!Array.isArray(data.records))throw new Error('DDL 官方参考格式错误。');
  const venues=new Map(catalog.venues.map(v=>[v.id,v])),ids=new Set(venues.keys()),seen=new Set();
  for(const row of data.records){
    DeadlineModel.validate(row,ids);
    if(seen.has(row.id)||!row.venueId||row.done||row.seedId||row.checkedAt!==data.checkedAt||venues.get(row.venueId)?.type!==row.type)throw new Error('DDL 官方参考标识、分类或核对日期无效。');
    seen.add(row.id);
    if(/(?:^|["\s])[A-Za-z]:[\\/]|(?<!\d)1[3-9]\d{9}(?!\d)|(?<!\d)[1-9]\d{16}[\dXx](?!\d)/.test(JSON.stringify(row)))throw new Error('公开 DDL 数据疑似含私有路径或私人编号。');
  }
}
