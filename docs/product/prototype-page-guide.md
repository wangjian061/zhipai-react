# 知拍原型逐页文档目录

更新：2026-11-03。当前共62份独立页面／步骤说明，正文位于`docs/product/pages/*.md`。本文件供团队查找、维护及在左侧手动阅读，不用于生成运行时页面正文；左侧按当前`context.guide`直接按需加载对应全文，目录从该文件的`##`章节生成。

每份说明按当前页实际区块从上到下讲清任务、内容、输入输出、动作去向、返回与取消、状态异常及相邻功能差别。首页完整样例和两张结构图已获用户确认，后续页面沿用同一粒度。已确认规则、当前实现与待整改差异分别标明，不从源码补造未确认业务。

## 首页、搜索、规格与扫码

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `home` | [首页](pages/home.md) |
| `search` | [照片工具搜索](pages/search.md) |
| `specifications` | [证照规格](pages/specifications.md) |
| `scan` | [扫码采集](pages/scan.md) |

## 个人证件照制作

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `camera.capture` | [拍摄或选择照片](pages/camera.capture.md) |
| `camera.confirm` | [证件照制作](pages/camera.confirm.md) |
| `camera.editor` | [选择照片版本](pages/camera.editor.md) |
| `camera.saved` | [制作完成](pages/camera.saved.md) |

## 六项常用工具

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `tool.repair.select` | [照片精修 · 选照片](pages/tool.repair.select.md) |
| `tool.repair.settings` | [照片精修 · 处理设置](pages/tool.repair.settings.md) |
| `tool.repair.result` | [照片精修 · 处理完成](pages/tool.repair.result.md) |
| `tool.outfit.select` | [照片换装 · 选照片](pages/tool.outfit.select.md) |
| `tool.outfit.settings` | [照片换装 · 处理设置](pages/tool.outfit.settings.md) |
| `tool.outfit.result` | [照片换装 · 处理完成](pages/tool.outfit.result.md) |
| `tool.background.select` | [更换背景 · 选照片](pages/tool.background.select.md) |
| `tool.background.settings` | [更换背景 · 处理设置](pages/tool.background.settings.md) |
| `tool.background.result` | [更换背景 · 处理完成](pages/tool.background.result.md) |
| `tool.crop.select` | [照片裁剪 · 选照片](pages/tool.crop.select.md) |
| `tool.crop.settings` | [照片裁剪 · 处理设置](pages/tool.crop.settings.md) |
| `tool.crop.result` | [照片裁剪 · 处理完成](pages/tool.crop.result.md) |
| `tool.format.select` | [格式转换 · 选照片](pages/tool.format.select.md) |
| `tool.format.settings` | [格式转换 · 处理设置](pages/tool.format.settings.md) |
| `tool.format.result` | [格式转换 · 处理完成](pages/tool.format.result.md) |
| `tool.resize.select` | [修改体积 · 选照片](pages/tool.resize.select.md) |
| `tool.resize.settings` | [修改体积 · 处理设置](pages/tool.resize.settings.md) |
| `tool.resize.result` | [修改体积 · 处理完成](pages/tool.resize.result.md) |

## 冲印及地址

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `print.select` | [冲印照片 · 选择照片](pages/print.select.md) |
| `print.crop` | [冲印照片 · 裁剪照片](pages/print.crop.md) |
| `print.layouts` | [冲印照片 · 选择排版](pages/print.layouts.md) |
| `print.confirm` | [冲印照片 · 确认订单](pages/print.confirm.md) |
| `print.complete` | [冲印订单已确认](pages/print.complete.md) |
| `print.addresses` | [收货地址](pages/print.addresses.md) |
| `print.address` | [编辑收货地址](pages/print.address.md) |

## 相册与订单

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `album.library` | [知拍相册](pages/album.library.md) |
| `album.detail` | [照片详情](pages/album.detail.md) |
| `orders.list` | [我的订单](pages/orders.list.md) |
| `orders.detail` | [订单详情](pages/orders.detail.md) |

## 专项采集

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `collection.home` | [专项采集首页](pages/collection.home.md) |
| `collection.projects` | [分类采集项目](pages/collection.projects.md) |
| `collection.search` | [项目搜索](pages/collection.search.md) |
| `collection.project` | [采集项目详情](pages/collection.project.md) |
| `collection.records` | [采集记录](pages/collection.records.md) |
| `collection.detail` | [采集任务详情](pages/collection.detail.md) |
| `collection.camera.capture` | [专项采集 · 拍摄照片](pages/collection.camera.capture.md) |
| `collection.camera.confirm` | [专项采集 · 证件照制作](pages/collection.camera.confirm.md) |
| `collection.notifications` | [通知中心](pages/collection.notifications.md) |
| `collection.services` | [专项采集服务中心](pages/collection.services.md) |

## 账号登录与安全

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `account.login` | [手机号登录](pages/account.login.md) |
| `account.code` | [输入验证码](pages/account.code.md) |
| `account.password` | [密码登录](pages/account.password.md) |
| `account.forgot` | [找回密码](pages/account.forgot.md) |
| `account.bind` | [绑定手机号](pages/account.bind.md) |
| `account.reset` | [重置密码](pages/account.reset.md) |
| `account.set` | [设置密码](pages/account.set.md) |
| `account.change` | [修改密码](pages/account.change.md) |
| `account.security` | [账号安全](pages/account.security.md) |
| `account.privacy` | [隐私协议](pages/account.privacy.md) |

## 个人中心与客服

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `my` | [我的](pages/my.md) |
| `my.share` | [分享知拍](pages/my.share.md) |
| `support` | [通用客服中心](pages/support.md) |

## 公告与全局升级

| 上下文标识 | 完整页面说明 |
| --- | --- |
| `notification.detail` | [通知详情](pages/notification.detail.md) |
| `update.demo` | [全局强制更新演示](pages/update.demo.md) |

## 页面、步骤与抽屉的归属

- 真实页面或关键步骤改变时切换到该页独立全文；六种工具分别拥有选图、设置、结果三页，不能共用一段通用工具说明。
- 个人制作四页与专项拍摄／制作两页独立。专项规格及参数来自原项目，成功回传原任务，不进入个人普通版／精修版购买。
- 冲印完成仍使用原confirm地址，状态对应`print.complete`，不得因URL未换就继续展示付款前确认说明。
- 抽屉属于父页章节，不新增`collection.auth`、`collection.payment`、`collection.submit`等短文页。打开以`context.section`定位本页相关章节，关闭恢复打开前阅读位置。
- 通知演示只在通知中心，验证码／密码错误演示只在对应登录步骤；公告详情、任务详情、服务和首页不提供通知演示。强更从工作区顶部全局菜单进入。

## 文档维护与缺失处理

1. 新增或变更正常页面／步骤，先同步对应文件和`src/workbench/context.js`映射，再更新本目录；文件名与guide稳定对应，不能按URL大类猜测共用说明。
2. 首行使用唯一页面名称，`##`用于本页目录，`###`说明区块内细项；标题清楚表达真实区块。正文中的来源链接必须是可追溯文件，价格、保存目的地、付款权益和三端能力以已确认契约为准。
3. 文件不存在必须报错并保留重试，不加载其他页面或通用内容顶替。当前读取失败显示「暂时无法读取本页完整说明，请重试。」；维护时补齐缺失文件与映射，不掩盖缺口。
4. Markdown以文本节点渲染，文档锚点独立于手机URL；标题重复时生成唯一ID。模块文档及PRODUCT／DESIGN仍可只读按需打开，返回恢复本页阅读位置。
5. 页文档覆盖不表示真实业务、接口或三端实现完成。通知历史／已读、服务九项帮助及后台配置仍待正常业务补齐；换装仅知拍相册是已确认待代码落实限制。实际视觉和真机另验收。

依据：[工作区契约](prototype-workbench.md)、[产品上下文](../../PRODUCT.md)、[设计规范](../../DESIGN.md)、[本轮实施记录](../reviews/page-documentation-20261103/implementation.md)、[本轮文档收尾](../reviews/page-documentation-20261103/documentation.md)。
