# 全项目消息反馈 · 现状与逐模块整改清单

日期：2026-10-26。用户已确认全项目范围及[第一张结构图](01-light-feedback.png)、[第二张结构图](02-decisions-and-processing.png)。本轮交付设计规范与实施清单，**业务代码尚未整改**；用户已授权提交及推送，实际状态以Git记录为准，本轮不部署站点。

本记录为源码核查，不是实际页面审计。截图中长条“登录成功”遮挡头图是用户提供的画面证据；当前`src/`未检索到该精确文案，来源、是否由原生层发送及是否取消均未确认。其他源码问题按其证据描述，不把风险推测写成实际已复现。

规范：[消息反馈全文](../../design/message-feedback-guidelines.md)、[DESIGN入口](../../../DESIGN.md#全项目消息反馈2026-10-26)、[三端交付](../../../HANDOFF.md#全项目消息反馈交付2026-10-26)。

## 一、源码现状与目标

| 模块 | 已观察到的实现 | 目标与保留项 | 主要入口 |
| --- | --- | --- | --- |
| 全局／首页 | `home-toast`按页面宽高50%居中；未开放反馈使用2500ms计时 | 统一Toast宿主和活动层避让；短反馈不盖头图、不撑开宫格；保留现有导航和布局 | [AppShell](../../../src/components/AppShell.jsx)、[app](../../../src/domain/app.js)、[styles](../../../src/styles/styles.css) |
| 相册／照片详情 | `album-toast`居中，消息和删除确认分开；已有删除成功不再Toast的规范 | 轻反馈迁移到公共宿主；读取／删除失败就近保留；不重新添加删除成功提示或破坏大图、管理及原列表位置 | [AlbumPage](../../../src/pages/AlbumPage.jsx)、[album样式](../../../src/styles/album.css)、[album域](../../../src/domain/album.js) |
| 个人证件照制作 | `camera-toast`为底部浮层；检测、制作失败已有CameraTaskSheet；制作中已有阻断状态 | 短消息按当前层避让，保留检测项配置、两类制作失败、制作Loading及双版本结果；不重做已确认的制作流程 | [CameraPage](../../../src/pages/CameraPage.jsx)、[CameraWorkflow](../../../src/components/CameraWorkflow.jsx)、[CameraTaskSheet](../../../src/components/CameraTaskSheet.jsx)、[camera样式](../../../src/styles/camera.css) |
| 六项常用工具 | 选图错误、`tool-error/tool-notice`、人像检查和完成页分别承载状态；部分重复成功消息已有抑制 | 字段／选图错误就近保留，完成页继续承载交付结果，不多弹成功Toast；处理动效仍限定照片范围 | [ToolsPage](../../../src/pages/ToolsPage.jsx)、[ToolPhotoSelection](../../../src/components/ToolPhotoSelection.jsx)、[PortraitPhotoCheck](../../../src/components/PortraitPhotoCheck.jsx)、[ToolResult](../../../src/components/ToolResult.jsx)、[tools样式](../../../src/styles/tools.css) |
| 冲印 | 全局错误、表单错误、报价错误、页面提示与抽屉提示有不同分支 | 按字段／模块／付款抽屉分类，报价异常与地址错误不可自动消失；保留裁剪、排版、金额及原单恢复，不重复付款 | [PrintPage](../../../src/pages/PrintPage.jsx)、[print域](../../../src/domain/print.js)、[print样式](../../../src/styles/print.css) |
| 我的订单 | CopyField已有就近复制状态、礼貌播报与失败说明；读取失败单独展示，普通notice在页面内 | 保护已有就近模式，不能为了统一而再加全局Toast；订单仍只承担交易及已确认履约动作，保持类型／状态单选与返回位置 | [OrdersPage](../../../src/pages/OrdersPage.jsx)、[OrderReceiptDialog](../../../src/components/OrderReceiptDialog.jsx)、[orders样式](../../../src/styles/orders.css) |
| 账号／登录／安全 | `account-message`共用notice和error容器；密码重置等还承担下一步说明 | 表单校验回到对应字段；“密码已重置，请重新登录”等有后续动作的提示不能一律删除；截图登录提示另定位 | [AccountPage](../../../src/pages/AccountPage.jsx)、[account域](../../../src/domain/account.js)、[account样式](../../../src/styles/account.css) |
| 我的／反馈／分享 | `notice/panelNotice`在若干方法中同时赋值；页面与抽屉存在独立消息位置 | 根据活动层单次投递，核对是否真实重复显示；复制失败保留手动复制，反馈附件错误就近，系统分享取消不报失败 | [MyPage](../../../src/pages/MyPage.jsx)、[SharePage](../../../src/components/SharePage.jsx)、[MySupportSheet](../../../src/components/MySupportSheet.jsx)、[my域](../../../src/domain/my.js) |
| 客服 | `copy-message`为容器内底部绝对定位，字号12px | 统一短复制反馈或就近状态；核对容器及安全区，不把源码坐标直接认定为实际遮挡 | [SupportPage](../../../src/pages/SupportPage.jsx)、[support样式](../../../src/styles/support.css)、[support域](../../../src/domain/support.js) |
| 专项项目／记录／服务 | CollectionNotice按状态栏下8px绝对定位，信息和警告共用容器、另有关闭／定时逻辑 | 分离短反馈和持续项目／模块状态；逐页校验导航与固定区域冲突，不一律移动同一个顶部浮层；保留任务状态含义 | [CollectionNotice](../../../src/components/CollectionNotice.jsx)、[CollectionPage](../../../src/pages/CollectionPage.jsx)、[collection域](../../../src/domain/collection.js)、[collection样式](../../../src/styles/collection.css) |
| 专项认证／支付／任务抽屉 | 认证输入与错误、支付错误、任务操作失败已有就近状态 | 沿用公共抽屉，字段错误关联字段，付款未知查原单；不叠Toast、不清空姓名／二维码／照片或有效设置 | [认证抽屉](../../../src/components/CollectionIdentityDrawer.jsx)、[支付抽屉](../../../src/components/CollectionPaymentDrawer.jsx)、[任务抽屉](../../../src/components/CollectionTaskDrawer.jsx) |
| 扫码采集 | 扫码权限／读取有独立状态，失败有专用抽屉，手电筒短消息复用`camera-toast` | 手电筒短反馈迁入公共宿主，原失败／帮助／返回规则保持；读取、关联、身份核验不可合并为同一成功Toast | [ScanPage](../../../src/pages/ScanPage.jsx)、[scan域](../../../src/domain/scan.js)、[scan样式](../../../src/styles/scan.css) |
| 规格／底色 | 选色说明及无有效配置状态位于相应页面／设置附近 | 保留就近反馈及按配置禁止制作；不把规格不可用变成稍纵即逝的Toast，也不改可选颜色规则 | [SpecificationsPage](../../../src/pages/SpecificationsPage.jsx)、[CameraConfirmationSettings](../../../src/components/CameraConfirmationSettings.jsx)、[CameraSizeOptions](../../../src/components/CameraSizeOptions.jsx) |
| 通知中心 | 项目、系统、采集状态是可回看的业务消息列表 | 保持业务记录、分类与目标跳转；本轮瞬时反馈规范不替代通知中心，也不接入未提供的推送服务 | [CollectionNotifications](../../../src/components/CollectionNotifications.jsx) |

## 二、执行顺序与逐项验收

所有条目当前均为**待实施**；本次只完成规范和清单。以下为可直接开展的工作包，具体落地只沿用已确认结构。出现实质结构变化先更新样图再确认；每项完成先交用户验收，确认后推进下一项。

| 顺序 | 工作包 | 前一步→当前→下一步的验收重点 |
| --- | --- | --- |
| 0 来源核查 | 定位截图“登录成功”的实际来源，不阻塞其余已确认整改 | 登录方式／入口→实际发送层和目标页→是否已有页面反馈；记录是否来自Web、原生壳或外部组件。取消提示的决定另行确认，不阻塞其余已确认样式工作 |
| 1 公共轻反馈 | 建立单一Toast宿主与活动层规则，先对齐首页／相册／相机／扫码已有Toast | 操作成功→单条短反馈→自动结束；重复触发不堆积、换路由不残留；菜单／底栏／键盘不被覆盖，抽屉内不向底页投递；当前业务布局不变 |
| 2 我的／客服／分享 | 短复制反馈与持续失败分类 | 点击复制→实际成功或失败→仅成功短反馈，失败可手动复制；当前页面／抽屉只展示一次；系统分享取消不报错，未完成发送不宣称已发送 |
| 3 账号／设置表单 | 校验与账号结果就近呈现 | 输入→提交校验→定位正确字段并保留其余输入；密码重置／绑定等需要下一步的信息保留；不擅自删除登录成功提示 |
| 4 工具／冲印／规格 | 选图、配置、地址、报价、保存错误分层 | 第一阶段照片及设置→检查／准备／付款→恢复；需处理错误不消失、完成页不重复成功；不改变工具保存目的地或后台配置底色 |
| 5 订单 | 保留就近复制与交易错误，消除额外重复反馈 | 查单／复制／确认收货→唯一反馈→保留筛选和位置；失败可原单重试，不新增付款、客服、看图或申请退款入口 |
| 6 专项页面 | 拆分短反馈与持续项目／模块异常，保留固定滚动责任 | 选择项目／记录→当前可用性与操作反馈→原认证／任务；信息不遮导航、不撑开只允许列表滚动的区域，不伪造项目已开放 |
| 7 确认与原因层 | 对齐现有删除／丢弃确认、检测／制作／扫码原因层的共同规范 | 发起操作→明确后果或实际原因→取消／恢复；不重复打开、多层遮罩不叠加，原照片／表单／任务保留；后台配置项不变 |
| 8 Loading与生命周期收尾 | 消息、处理和结果交接清理 | 开始请求→真实忙碌状态→成功／失败／中断；退出与切账号抑制迟到结果，关闭Loading后再给原因；工具不全改成阻断弹窗 |
| 9 三端及交付验收 | 原生消息适配与文档闭合 | 同一业务事实→各端实际反馈→安全区、字体放大、读屏与系统返回一致；最终记录真实组件和实现差异，不以源码检查替代手机视觉验收 |

## 三、保护既有流程

- 订单仅展示四种交易状态及已确认的冲印四段履约；消息样式不能恢复被删除的订单业务入口。
- 检测未通过仍按后台配置项展示；照片制作失败／服务不可用分别说明；检测通过直接继续，不补“检测通过”Toast。
- 个人证件照制作中不允许取消；其他工具的照片范围动效和就近状态保持，不把所有异步过程锁成全局Loading。
- 同一次制作只解锁一张；付款未知查询原单，已付未保存仅重试保存，不能用“重试”再次收费／重复归档。
- 相册删除成功只更新列表；完成页已有结果不再弹成功提示。下载及分享仍按实际能力描述。
- 扫码成功直接交接原项目认证阶段，不恢复“二维码读取成功”中转；权限拒绝不因关闭消息再次请求相机。
- 首页轮播、专项主卡和工具宫格保持已确认结构；不能通过增加永久Toast占位区压缩照片、卡片或侵入导航。

## 四、待明确与证据边界

- “登录成功”截图有视觉证据，当前`src/`无同文案证据。来源与取消策略待核查／单独确认；本轮不写成删除完成。
- 同时赋值两个消息状态不等于实际同时显示；具体整改前需核对活动页面／抽屉渲染条件。未自动查看浏览器，不能断言所有源码风险均已复现。
- 不新增真实网络诊断、系统推送、原生权限、付款或学信网核验能力；消息规范只表达已有业务结果。
- 当前截图不是本轮生成；本轮只原样归档已确认的两张结构样图，不另生成最终效果图或自动UI测试。

## 五、本轮文档检查

核对本地链接、已确认结构图复制一致性、Git差异和仅文档范围。未运行业务测试或构建，因为未改业务代码；文档提交／推送与业务UI实施、实际视觉验收分别记录。
