# 足迹地图数据与加载方式

道路底图由 OpenStreetMap 按当前视口请求，遵守浏览器缓存行为，不预下载或批量存储地图瓦片。[数据署名](https://www.openstreetmap.org/copyright)、[瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)。

`assets/journey-basemap.js` 随网站提供世界陆地与国家轮廓，数据来自 Natural Earth 1:110m Admin 0 Countries。仅保留几何坐标，四舍五入至四位小数，移除不使用的属性。它用于城市足迹概览，不包含街道或导航细节。

- [原始数据](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)
- [公共领域使用说明](https://www.naturalearthdata.com/about/terms-of-use/)
- 获取日期：2026-10-18。

道路图块优先使用标准 OpenStreetMap；失败或 10 秒无响应时，按图块尝试 OSM France / HOT 道路服务，再重试首选来源一次。成功图块保留，不能因单块失败而移除整张道路图层。两路均不可用时明确显示连接状态，不把简图当作道路地图已加载。

手机与电脑采用同一来源和加载逻辑。页面可选择标准道路、备用道路，或主动选择简图；简图不再自动替换整张道路图层。缩放和切换城市只请求当前视口需要的图块，不批量下载。

备用服务：[OSM France 底图](https://www.openstreetmap.fr/fonds-de-carte/)、[服务使用说明](https://www.openstreetmap.fr/usage/)、[公开图块接口](https://wiki.openstreetmap.org/wiki/FR:Serveurs/tile.openstreetmap.fr)。当前站点为公开、低流量的个人记录网站；如后续转为商业地图服务，应重新核对相应服务条件。
