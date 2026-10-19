# 足迹地图数据与加载方式

道路底图由OpenStreetMap按当前视口请求，遵守浏览器缓存行为，不预下载或批量存储地图瓦片。[数据署名](https://www.openstreetmap.org/copyright)、[瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)。

`assets/journey-basemap.js` 随网站提供世界陆地与国家轮廓，数据来自Natural Earth 1:110m Admin 0 Countries。仅保留几何坐标，四舍五入至四位小数，移除不使用的属性。它用于城市足迹概览，不包含街道或导航细节。

- [原始数据](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)
- [公共领域使用说明](https://www.naturalearthdata.com/about/terms-of-use/)
- 获取日期：2026-10-18。

道路图块优先使用标准OpenStreetMap；失败或10秒无响应时，按图块尝试OSM France / HOT道路服务，再重试首选来源一次。成功图块保留，不能因单块失败而移除整张道路图层。两路均不可用时明确显示连接状态，不把简图当作道路地图已加载。

手机与电脑采用同一来源和加载逻辑。页面可选择标准道路、备用道路，或主动选择简图；简图不再自动替换整张道路图层。缩放和切换城市只请求当前视口需要的图块，不批量下载。

手机端减少地图两侧留白并增加显示高度，使用半级缩放让全部城市更贴合视口。点击城市会放大到当地，复位返回全部足迹。展开地图时复用同一个Leaflet实例和图层，不另建一份地图；收起后保留手动浏览的视野。

窗口或横竖屏尺寸改变时，总览状态重新适配所有当前城市；已经手动放大、拖动或选定城市后，尺寸变化只调整地图容器，不强制返回总览。展开采用页面内对话框，不依赖系统全屏权限。

备用服务：[OSM France底图](https://www.openstreetmap.fr/fonds-de-carte/)、[服务使用说明](https://www.openstreetmap.fr/usage/)、[公开图块接口](https://wiki.openstreetmap.org/wiki/FR:Serveurs/tile.openstreetmap.fr)。当前站点为公开、低流量的个人记录网站；如后续转为商业地图服务，应重新核对相应服务条件。
