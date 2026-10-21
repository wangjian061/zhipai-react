# 证照规格 · 文档收尾

2026-10-20。Impeccable documenter 依据当前源码及已完成的[实施记录](review.md)、[独立收尾评审](finish-review.md)合并文档。范围为已确认模块的补充与旧状态纠正，没有重新探索视觉方向、修改业务代码／测试／图片或执行Git操作。

## 文档闭合

| 文件 | 本次同步 |
| --- | --- |
| [DESIGN](../../../DESIGN.md) | 保留原有世界与历史；补充首页／规格共用的连贯宫格、三列九项、浅蓝白小幅头图及公共选色抽屉；制作文案更新为「照片规格／更多规格／选择规格／使用此规格／预设规格」 |
| [PRODUCT](../../../PRODUCT.md)、[README](../../../README.md)、[HANDOFF](../../../HANDOFF.md) | 增加规格模块、文档与源码索引，纠正未开放状态；明确参数接续、产品预设与官方受理边界，以及本地实现和发布状态 |
| [首页契约](../../product/home-1.4.6.md) | 证照规格由未开放提示改为有效入口，记录搜索同入口、来源返回与共享宫格 |
| [制作MD](../../product/camera-confirmation-1.4.6.md)与[HTML](../../product/camera-confirmation-1.4.6.html) | 快捷三项保持，更多规格同步九项目录；保留制作布局，补入口参数、用途名、重拍／恢复与普通／专项隔离；HTML目录和术语同步，仍为文档示意 |
| [规格MD](../../product/photo-specifications-1.4.6.md)与[HTML](../../product/photo-specifications-1.4.6.html) | 补齐上下游、源码、资产与评审链接；HTML根据单色／多色展示实际抽屉说明；保持宫格下无操作说明 |

目录依据[photo-specifications.js](../../../src/domain/photo-specifications.js)，共有一寸、二寸、小二寸、大一寸、求职招聘、四六级考试、驾驶证、身份证、中国护照九项。求职招聘采用用户确认的35×49mm、413×579px、蓝／白／红产品预设，不构成招聘行业通用标准。已有资料出处沿用[规格文档](../../product/photo-specifications-1.4.6.md#资料出处与取值边界)，本次未重新进行外部政策核验，也未新增官方受理能力。

## 交互与资产依据

- [SpecificationsPage](../../../src/pages/SpecificationsPage.jsx)、[SpecificationIcon](../../../src/components/SpecificationIcon.jsx)、[共享宫格](../../../src/styles/utility-grid.css)及[页面样式](../../../src/styles/specifications.css)：单白卡、三列九项、零间隙、1px `#F1F4F8`、12px网格外圆角、16px留白、13px名称、24px图形与32px容器；页面全高，不保留84px菜单空位，不恢复已删除的宫格下说明。
- [specifications.js](../../../src/domain/specifications.js)与[camera.js](../../../src/domain/camera.js)：规格→底色→相机拍摄／相册→既有制作；稳定ID及参数带入且可编辑，无二次确认、无自定义；正常关闭与进入相机交接焦点，刷新／前进清理旧抽屉标记。制作结果丢弃、付费保存及原型检测／结果选择沿用原流程。
- 出货[浅色JPEG](../../../public/assets/specifications-hero-light-20261020.jpg)为1000×582、51128bytes；完整prompt、生成及编码链见[资产MD](../../assets/specifications-hero-20261020.md)和[JSON](../../assets/specifications-hero-20261020.json)。用户拒绝的深色写实PNG已从public移除，外部生成原图保留；本次未改动资产。独立评审已检查实际JPEG，本次只对照来源记录与源码引用，不宣称重做资产视觉评审。

## 长名称与数字尺寸可见性跟进

用户反馈长名称换行后数字尺寸消失。当前源码通过`specificationDimensions(spec)`区分显示值：物理预设显示数字毫米，四六级考试显示144×192px、中国护照显示600×800px；用途说明保留在抽屉及ARIA。名称独立使用`utility-grid-item-label`，最小40px高、20px行高，可自然换行；`utility-grid-detail`独立块、不可收缩、最小18px高。没有最大高度、行数截断或字号缩小，宫格自然增高；首页未使用名称块类，保持原名称布局。

本次只同步DESIGN、规格MD／HTML及本模块两份记录；线框继续导入共享CSS，名称类与数字尺寸helper对应当前源码，未恢复宫格下说明。修复的18项目标检查通过、生产构建完成，依据来自本轮实施结果；文档跟进未重跑业务测试、构建、全量259处链接或相机目录检查。聚焦检查通过：规格HTML脚本语法、九项数字显示值与源码helper一致、名称与尺寸类及共享CSS的40／18px最小高度与不收缩规则对应；五份修改文档无行尾空白、冲突标记或禁用措辞。未执行DOM、浏览器或视觉测试。

## 检查结果与限制

此前文档检查通过：10份文档的259处本地链接／资源目标均存在，两份HTML内联脚本语法通过；两份HTML的九项目录名称、说明、宽高与共享源码逐项一致，规格线框的初始颜色列表也一致。已核对有效规格入口、旧界面标签清理与宫格下说明删除；文件无行尾空白、冲突标记、末尾换行缺失或用户禁用措辞。链接检查仅核对本地目标存在，不代表远程网页重新验证、文档已在站点部署或浏览器交互已验收。

已执行的业务证据仍以[review.md](review.md)为准：37项目标检查通过，最后删除说明后7项规格检查再次通过，相机及工具状态流程通过，生产构建通过；保留jsQR非module及主JS约500KB的体积提示。本次只做文档检查，没有重跑业务测试、构建、detector或资产扫描。

前次独立收尾结论为ship；本次修复的独立结果以[最新收尾评审](finish-review.md)为准，范围仍限定源码与出货资产。没有自动浏览器、截图或自动UI测试；实际组合画面、cover裁切、滚动、触摸、字体放大、读屏、相机权限及三端原生生命周期仍待用户与端上验收。既有公开站点为此前部署的版本23，本次规格修改仍在本地，未再次部署、提交或推送。

既有`DESIGN.md`尚无规范YAML frontmatter，`.impeccable/design.json`缺失。本轮是既有视觉世界的普通扩展，按范围只补充有源码依据的规则，未重排历史文档、补建sidecar或将既有漂移固化为新规范。
