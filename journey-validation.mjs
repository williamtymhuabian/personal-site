import { approvedTravelPhotos } from './travel-media.mjs';

export function validateJourneys(stops, awards) {
  const allowed = (obj, keys) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).some(k => !keys.includes(k))) throw new Error('足迹含未允许公开的字段。');
  };
  const text = v => typeof v === 'string' && v.trim();
  const id = v => typeof v === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(v);
  if (!Array.isArray(stops)) throw new Error('足迹需要为数组。');
  const cities = new Set(), events = new Set(), photos = new Set();
  for (const stop of stops) {
    allowed(stop, ['id','city','longitude','latitude','events']);
    if (!id(stop.id) || cities.has(stop.id) || !text(stop.city)) throw new Error('足迹城市无效或重复。');
    cities.add(stop.id);
    if (!Number.isFinite(stop.longitude) || !Number.isFinite(stop.latitude) || Math.abs(stop.longitude)>180 || Math.abs(stop.latitude)>85) throw new Error('城市坐标无效。');
    if (stop.longitude<100 || stop.longitude>131 || stop.latitude<21 || stop.latitude>46) throw new Error('新城市超出当前地图范围，请同步扩展地图投影与海岸线。');
    if (!Array.isArray(stop.events) || !stop.events.length) throw new Error('足迹城市需要关联经历。');
    for (const event of stop.events) {
      allowed(event, ['id','awardId','title','year','kind','school','summary','photos','result']);
      if (!id(event.id) || events.has(event.id) || !text(event.title) || !text(event.summary)) throw new Error('足迹经历无效或重复。');
      events.add(event.id);
      if (!['award','participation'].includes(event.kind) || (event.year!=='' && !/^20\d{2}$/.test(event.year)) || typeof event.school!=='string') throw new Error('足迹类型、年份或学校无效。');
      if (event.kind==='participation' && !['no-award','unconfirmed'].includes(event.result)) throw new Error('参赛记录需要明确成绩已确认未获奖或尚待补充。');
      if (event.kind==='award' && event.result!==undefined) throw new Error('获奖记录使用关联奖项中的成绩。');
      const award = awards.find(a => a.id===event.awardId);
      if (event.kind==='award' && (!award || award.kind!=='award' || award.year!==event.year)) throw new Error('足迹关联的奖项不存在或不匹配。');
      if (event.kind==='participation' && event.awardId!=='' && (!award || award.kind!=='participation')) throw new Error('参赛记录不能关联获奖。');
      if (!Array.isArray(event.photos)) throw new Error('足迹照片需要为数组。');
      for (const photo of event.photos) {
        allowed(photo, ['image','alt','caption']);
        if (!Object.hasOwn(approvedTravelPhotos, photo.image) || !photo.image.startsWith(`assets/journeys/${stop.id}-`) || !photo.image.endsWith(`-${approvedTravelPhotos[photo.image].slice(0,10)}.webp`) || photos.has(photo.image) || !text(photo.alt) || !text(photo.caption)) throw new Error('足迹照片未经审核、重复或缺少说明。');
        photos.add(photo.image);
      }
      const serialized=JSON.stringify(event);
      if (/[A-Za-z]:[\\/]|(?<!\d)1[3-9]\d{9}(?!\d)|(?<!\d)[1-9]\d{16}[\dXx](?!\d)/.test(serialized)) throw new Error('足迹中含本地路径或疑似私人编号。');
    }
  }
  if (photos.size!==Object.keys(approvedTravelPhotos).length) throw new Error('足迹照片白名单存在未使用的图片。');
}
