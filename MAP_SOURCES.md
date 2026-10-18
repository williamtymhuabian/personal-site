# 足迹地图数据与加载方式

道路底图由 OpenStreetMap 按当前视口请求，遵守浏览器缓存行为，不预下载或批量存储地图瓦片。[数据署名](https://www.openstreetmap.org/copyright)、[瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)。

`assets/journey-basemap.js` 随网站提供世界陆地与国家轮廓，数据来自 Natural Earth 1:110m Admin 0 Countries。仅保留几何坐标，四舍五入至四位小数，移除不使用的属性。它用于城市足迹概览，不包含街道或导航细节。

- [原始数据](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)
- [公共领域使用说明](https://www.naturalearthdata.com/about/terms-of-use/)
- 获取日期：2026-10-18。

本地简图先显示在道路图层下方。道路瓦片发生错误或连续 8 秒未完成当前视口加载时，页面停止该次道路图层加载并切换到本地简图；按钮允许手动重新加载道路图或主动使用本地简图。城市点、点选和足迹记录不依赖外部地图服务，也不获取访客位置。
