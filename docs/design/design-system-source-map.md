# 知拍设计系统提取与合并记录

日期：2026-10-22。任务：Impeccable document，用户选择「合并整理，保留已确认规则」。本轮只修改文档、组件面板与其Git共享白名单，不修改业务UI、路由、支付或本地业务数据。

## 阅读与维护

- [根设计规范](../../DESIGN.md)：标准八节、机器可读令牌、已确认的模块细则与原章节锚点。
- [Impeccable面板文件](../../.impeccable/design.json)：schemaVersion 2，色带元信息、阴影、动效、局部断点、10个独立HTML/CSS组件与同源叙述。
- [产品上下文](../../PRODUCT.md)与[三端还原入口](../../HANDOFF.md)：功能边界、模拟能力、还原与验收契约。

根文档的设计语言来自已确认的浅蓝白、清楚对齐、照片完整展示和少打扰要求；「清晰、克制的证件照工作台」是对既有方向的归纳，不是新品牌提案。不新增字体、配色、图形风格或业务步骤。

## 规则保留与兼容

合并前DESIGN.md共269行，SHA-256为：

```text
6158d94a36c017e2465c1f13cee44bb80db290c1c518879333889186a9800c6a
```

原14个二级模块标题调整为三级标题，原有子标题视位置调整级别；标题文字未改，原章节锚点保留。旧H1另提供显式兼容锚点。原有156行非空正文、列表与表格逐行核对保留；其中仅一处明确更新：订单购买内容的「精修为照片规格」补充为「照片规格及已记录的背景颜色」，对齐已确认且已实现的精修底色快照。没有重写或删除其他已确认模块规则。

首页／字体／订单／检测抽屉等已有章节链接继续可用。历史章节中的「本轮」「本地未发布」「未自动浏览器验证」仍归属于该段原日期，本次不把它们当成当前分支、发布或验证状态。

## 提取来源

| 提取对象 | 源码 |
| --- | --- |
| 通用颜色、按钮、卡片及抽屉基础值 | [src/styles/ui-foundations.css](../../src/styles/ui-foundations.css#L2) |
| 字体栈、品牌蓝、全局按钮、主导航阴影与首页后置覆盖 | [src/styles/styles.css](../../src/styles/styles.css#L1) |
| 导航52px／返回44px／标题17px | [src/styles/tool-navigation.css](../../src/styles/tool-navigation.css#L1) |
| 步骤圆24px、连接线与下方12px文字 | [src/styles/tool-stepper.css](../../src/styles/tool-stepper.css#L1) |
| 公共抽屉固定头尾、独立滚动正文、安全区 | [src/styles/ui-sheets.css](../../src/styles/ui-sheets.css#L2) |
| 宫格20px外卡／16px内距／极淡连线及长名称 | [src/styles/utility-grid.css](../../src/styles/utility-grid.css#L2) |
| 精修底色单选、禁用与焦点样式 | [src/styles/tools.css](../../src/styles/tools.css#L28)；[src/components/RepairBackgroundOptions.jsx](../../src/components/RepairBackgroundOptions.jsx#L3) |
| 实际精修照片底色配置 | [src/domain/tools.js](../../src/domain/tools.js#L412) |
| 认证抽屉输入44px／16px字 | [src/styles/collection-auth.css](../../src/styles/collection-auth.css#L40) |
| 普通16px卡的实际实例 | [src/styles/my.css](../../src/styles/my.css#L13) |
| 订单磨砂、类型Tab、状态胶囊与票据 | [src/styles/orders.css](../../src/styles/orders.css#L38)；[src/styles/orders.css](../../src/styles/orders.css#L227) |
| 照片完整展示与订单缩略图后置覆盖 | [src/styles/photo-previews.css](../../src/styles/photo-previews.css#L3)；[src/styles/photo-previews.css](../../src/styles/photo-previews.css#L141) |
| 首页八项真实SVG图形 | [src/components/HomeToolIcon.jsx](../../src/components/HomeToolIcon.jsx#L4) |
| 无照片占位图与只读照片语义 | [src/components/OrderThumbnail.jsx](../../src/components/OrderThumbnail.jsx#L4) |

样式入口以[main.jsx](../../src/main.jsx)和组件内导入共同决定。入口当前导入顺序：

```text
styles/styles.css
styles/ui-foundations.css
styles/support.css
styles/album.css
styles/camera.css
styles/album-flows.css
styles/my.css
styles/print.css
styles/tools.css
styles/service-home.css
styles/liquid-tabs.css
styles/account.css
styles/collection.css
styles/collection-auth.css
styles/collection-task.css
styles/device-preview.css
styles/ui-sheets.css
styles/share.css
styles/orders.css
styles/photo-previews.css
styles/specifications.css
styles/utility-grid.css
```

例如工具导航与步骤条由组件导入单独样式；不能只扫描main.jsx或只看全局CSS开头。判定最终生效值时，同时检查作用域、自定义属性继承、选择器优先级、媒体条件及后置覆盖。

## 组件样例的范围

| 面板组件 | 来源与保留的关键状态 |
| --- | --- |
| 知拍蓝主按钮 | tools.css普通主操作，至少48px、15px字、14px角；禁用、按压、焦点、减少动态 |
| 浅底次按钮 | tools.css次要操作；工作步的上一步不迁移到终态 |
| 认证抽屉输入 | collection-auth.css的44px输入，聚焦边框和16px输入文字 |
| 任务导航 | ToolNavigation的44／52／17px组合，禁用返回和焦点 |
| 已支付状态胶囊 | 订单单选状态的24px可见胶囊与44px触控区 |
| 个人中心快捷卡 | my-quick-card实际16px内容卡；数字是静态示意 |
| 首页连贯八宫格 | 复用当前HomeToolIcon图形、极淡网格与无缩放按压 |
| 工具步骤进度 | 完成、当前、未开始；无点击跳步 |
| 精修必选背景色 | 初始不选；原生radio、蓝圈与勾、白灰色蓝勾、禁用和焦点 |
| 只读照片订单票据 | 无照片占位态、虚线缺口、金额层级；整卡无缩放，照片无独立操作 |

面板不依赖React、外部图像、字体或图标包；类名均为ds-前缀，CSS使用实际变量并提供回退。HTML为样式标本，未接入页面路由、支付、识别、保存或数据订阅。精修示例的选项可原生勾选，但静态「请选择一种」不会模拟React状态回显；业务必须继续使用原组件。订单示例仅演示缺图占位，真实订单必须优先本单照片。

19个颜色令牌仅提取已存在用途，未引入新的辅助品牌色。每个令牌的8阶OKLCH色带根据原色的色相与色度衍生、仅变化明度（15%—95%），专供面板预览；不是经用户确认的生产颜色，极端明暗颜色由浏览器映射到可显示色域。颜色原值仅在DESIGN.md前置元数据定义，侧文件不建立重复tokens数组。

## 已发现差异与适用边界

| 项目 | 已确认规则／当前实现 | 本轮处理 |
| --- | --- | --- |
| 首页两卡阴影 | 规则要求公共极轻阴影；专项卡实际为--ui-card-shadow，宫格外卡被utility-grid.css改为另一轻阴影 | 两值及来源均记录；不将当前差异定为新规范、不改页面 |
| 订单缩略图 | 模块保留56×78px、#F1F5FB的旧描述；后加载photo-previews.css实际改为56px宽、5∶7比例、#F1F2F4留白 | 保留原规则并明示差异；实际比例下高度约78.4px，不写成严格固定78px |
| 工具照片卡 | 早期tools.css含白底与阴影；photo-previews.css后置改为透明、无阴影 | 记录最终覆盖，避免重新包回白卡 |
| 精修／换装预览 | 通用预览规则与更具体的工具选择器并存，最大高度还有窄宽度修正 | 不宣称一个宽度或最大高度适用于所有照片 |
| 正文与输入 | 浏览器body是16px；任务正文14px；认证抽屉输入16px／44px，全屏账号输入15px／54px | 按角色提取，不做一刀切统一 |
| 动效 | 工具按钮按压为0.98、圆底返回0.96；相册对话框180ms与工具抽屉230ms | 按组件记录，不概括成统一遮罩动画 |
| 状态颜色 | 付款状态、审核流程与照片输出底色用途不同 | 保留场景语义，不复用一个通用状态色表 |
| README结果交付摘要 | 旧摘要将更换背景写为知拍相册交付，与2026-10-21后的统一完成页规则不同 | 已对齐PRODUCT：背景、裁剪、格式、体积发起设备下载；精修、换装付款处理后保存知拍相册，未改变业务代码 |

## 实际页面抽样

本轮只读抽样本地首页、照片精修未选图工作页、订单列表的浏览器最终计算样式，不做支付、选图、删除或账号变更；未运行自动UI测试，未生成最终截图。检查用临时页签已关闭。

抽样确认导航17px／44px、主按钮48px／15px／14px、首页16px留白与标题、宫格极淡边线、两卡实际阴影差异、订单24px磨砂及胶囊／票据层级。此证据仅对应这三个状态，不代表全部抽屉、付费步骤、真实字体缩放或三端真机验收。

## 共享与后续更新

仅放行.impeccable/design.json进入Git；briefs、critique、live、config与缓存继续忽略。团队克隆代码后可同时获得根设计规范和组件面板配置；不包含本机业务照片或订单数据。本轮未自动提交、推送或部署。

后续经用户确认的组件修改，应同步根文档的对应令牌／模块段、侧文件相关样例和本提取记录。生产CSS仍在原位置，面板文件不参与运行时注入。新设计继续遵守先展示结构样图、确认后实现的全局规则；本轮只整理已存在设计，不触发页面重设计。

## 本轮验证

2026-10-22完成以下验证：

- YAML安全解析及标准八节顺序通过；19个颜色、9个字排角色、7个圆角、7个间距及10个组件配置的引用、值类型与允许属性检查通过。
- 23个原标题锚点保留；156行原非空正文逐行核对通过，仅包含上述明确登记的精修底色补充。
- schemaVersion 2侧文件通过JSON解析、元信息与前置令牌名称对应、叙述逐字对应及8阶色带顺序检查，不含重复tokens数组。
- 10个独立组件的HTML标签闭合、ds-类名前缀、无外部资产依赖和CSS变量回退通过；128条CSS规则经PostCSS语法解析。精修示例四个radio均未默认勾选。
- 89处本地文档／源码／资产链接检查通过，无缺失文件或章节锚点；Git差异空白检查通过。
- Git共享白名单验证通过：design.json可共享，config、缓存、briefs与critique仍忽略。变更仅为DESIGN、README、提取记录、侧文件与.gitignore，无业务源码改动。

这些检查验证文档格式、来源、引用与样例语法，不等同于业务代码测试、组件面板实际渲染验收或三端真机验收。本轮未重跑应用构建与业务测试。
