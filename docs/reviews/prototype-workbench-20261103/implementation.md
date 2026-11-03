# 原型文档工作区实施与验证

日期：2026-11-03。状态：本地实施完成，源码／状态／SSR范围收尾通过，实际画面待用户验收。本次未提交、推送、创建发布标签或部署，未分配新正式原型版本。

## 1. 确认依据与范围

用户已明确确认桌面左侧页面说明、上下文场景按钮与来源，右侧可操作既有手机，以及地址、关键步骤和抽屉联动。确认参考原样保存在[双栏结构](approved-structure.svg)及[状态联动结构](approved-state-linked.svg)，对应本机结构预览目录中的原始SVG；不是运行截图。

方向契约为`.impeccable/surfaces/prototype-workbench.md`中的Read／Operate，沿用知拍蓝白、深蓝字、系统字体及炭灰设备舞台。小于1000px保留原手机，没有增加未经确认的小屏文档页。详细产品规则见[工作区契约](../../product/prototype-workbench.md)，不以实施记录新增业务规则。

本次先做查看工作区，保留此前未提交的通知、服务及登录工作。登录A已本地实现待验收；通知和服务新结构与配套规则已确认，正式业务UI仍待补齐。隔离通知、登录和升级样例不等于三块正式业务完成。

## 2. 实现入口

| 文件 | 实现职责 |
| --- | --- |
| `src/components/PrototypeWorkbench.jsx` | 64px顶栏、桌面3∶2双栏、说明章节与固定来源；观察页面上下文、文档读取、场景选择、恢复和仅看原型 |
| `src/workbench/context.js` | 从当前URL、业务活跃scope和关键UI状态解析页面、步骤、抽屉、来源、忙碌状态；允许列表生成左侧脱敏地址 |
| `src/workbench/documentation.js` | 解析逐页四节摘要、缺失页回退、完整模块与PRODUCT／DESIGN按需读取、安全链接解析 |
| `src/workbench/GuideMarkdown.jsx` | 使用React文本节点显示Markdown标题、段落、表格、列表、代码及链接；文档内锚点命名空间，不执行HTML |
| `src/workbench/demo-sessions.js` | 虚构通知及任务、内存账号、强更结果会话；样例返回、列表位置／焦点恢复及dispose |
| `src/workbench/ScenarioHost.jsx`、`WorkspaceContext.jsx` | 在手机内部承载演示，复用通知、任务和登录组件；演示抽屉局部语义、底页inert与焦点入口 |
| `src/styles/prototype-workbench.css` | 工作区局部颜色、字排、双栏、独立滚动、1000／1150px桌面条件、仅看原型和减少动态效果 |
| `src/App.jsx`、`src/components/AppShell.jsx`、`src/main.jsx` | 外层工作区与现有DevicePreview／AppShell接续、手机底页inert、样式加载及ScenarioHost挂载 |
| `src/runtime/state.js` | 普通控制器活跃scope只读观察；start注册、stop清理；分离演示仅创建工厂和覆盖项，不调用真实init或注册业务实例 |
| `docs/product/prototype-page-guide.md` | 当前36条页面摘要，各有页面说明、操作流程、状态与异常、验收要点；缺失独立契约明确标注 |

真实通知／任务／登录共享组件只加入可复用的演示边界和ID命名空间；默认真实业务模态保持。手机保持402×874逻辑画布，DevicePreview按右侧舞台可用区域缩放；未改成双栏内重新排版的手机页面。

## 3. 已完成行为

- 当前`location.search`与路由事件、活跃控制器订阅共同驱动左侧说明，工具步骤和同址抽屉变化不依赖顶层page改变。关闭抽屉恢复底页，来源文档和章节随上下文重置。
- 演示使用独立内存样例，真实业务底页保留挂载但不可交互；业务忙碌时禁止演示切入。恢复、URL跳转、仅看原型和缩到1000px以下销毁会话并释放倒计时，不改原业务账号、照片、任务或交易。
- 通知演示保留历史和只读任务详情、公告、原因与读取重试；返回恢复筛选、列表scrollTop和源卡片焦点。登录复用账号工厂和真实表单，注入memoryAccount并跳过init，短信和第三方SDK不接入。
- 强更手机内无取消或跳过；左侧控制入口失败、仍旧版及模拟完成。模拟更新不调用商店或安装，不改变真实安装版本；外层恢复不是正式App绕过强更的能力。
- 完整模块及PRODUCT／DESIGN只读按需加载，读取有忙碌、失败、重试与过期请求隔离。地址展示屏蔽账号、照片、任务、订单及返回引用；文档HTML不执行，锚点不写业务URL。
- 演示任务及登录抽屉采用局部`aria-modal=false`并使手机内底页inert，外侧控件继续可操作。首按钮焦点、Escape／关闭恢复、真实与演示ID命名空间已补齐。

## 4. 独立评审与修复

[独立收尾评审](finish-review.md)首轮发现三项P2：演示抽屉语义与锁定范围不一致、登录双实例表单ID重复、通知详情返回丢失列表位置。对应修复已经独立复核，三项均为resolved，未新增未解决P2。

评审处置为**SHIP，仅限三项修复的源码／状态／SSR证据范围**。没有recapture、实际截图或浏览器操作；不表示整体视觉审美、运行画面、实际键盘／鼠标手感、触摸或读屏已通过。不以工作区评审替代此前通知、服务或登录正式业务的完成结论。

## 5. 实际验证

下表记录本轮已执行结果；文档收尾复核另见[documentation.md](documentation.md)。源码与静态渲染检查不等于自动UI测试。

| 检查 | 已执行结果与证据范围 |
| --- | --- |
| `node --test tests/workbench-context.test.mjs tests/workbench-demo.test.mjs tests/bindings.test.mjs` | 17/17通过；上下文／步骤／抽屉、地址脱敏、Markdown、文档读取、演示数据隔离、账号内存存储、局部抽屉语义、唯一ID、列表位置与焦点、注册表清理及绑定检查 |
| `node --test tests/runtime.test.mjs tests/account-login.test.mjs tests/account-settings.test.mjs tests/device-preview.test.mjs` | 24/24通过；相关运行时、账号登录／设置及设备几何回归 |
| `node scripts/test-flows.mjs account-collection-flow.cjs` | 历史账号／采集流程检查通过；为模拟业务检查，不包含真实认证或原生设备 |
| `npm run build` | 通过；仍提示`vendor/jsQR.js`普通script不能按模块打包，以及部分产物超过500kB。本轮未把这些提示写成已消除或构建失败 |
| `git diff --check` | 通过；只证明差异格式检查，不表示其他未提交工作已经验收 |
| 本地HTTP | `http://127.0.0.1:4180/?page=home`返回200；未操作浏览器，不等于实际画面已检查 |

全量测试曾在`compat-state.test.mjs`停滞，未取得完整通过结果。为缩小影响范围，在临时隔离src中比较「当前src＋当前runtime」与「当前src仅将runtime/state.js替换为HEAD版本」：两组均在8秒超时后终止。该受限对照只能证明旧runtime替换组也同样超时，**不是完整Git基线对照，不能据此称问题在全Git基线上已复现或全量测试通过**。本轮未继续运行悬挂测试。

## 6. 待用户验收与未执行项

| 范围 | 当前状态 |
| --- | --- |
| 桌面实际视觉 | 文档折行、短窗口、双栏比例、按钮密度、固定来源与手机缩放待用户查看 |
| 实际交互与辅助能力 | 鼠标、键盘、抽屉打开关闭、列表返回手感、读屏、字体放大待验收 |
| 响应式 | 1000px以下只保留原手机及退出演示已有源码规则；未新增或验收小屏文档界面 |
| 业务范围 | 通知／服务正式业务UI仍待补齐，登录A待验收；未提供专用场景的业务在手机正常操作，不宣告全场景覆盖 |
| 真实服务 | 系统推送、后台配置、短信、认证、第三方SDK、邮件、商店和App安装未因本轮工作区接入 |
| Git与发布 | 未提交、未推送、未新增正式日期版本／台账／不可变标签、未部署；不改既有10.26-1登记 |

遵守项目边界，本轮未自动操作浏览器、截图或运行自动UI测试；默认最终交付不附运行效果图。用户验收与之后的正式Git交付、部署及三端发布分别记录。
