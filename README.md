# 知拍 Zhipai

知拍 1.4.6 的 React 移动端交互原型，涵盖个人证件照制作、照片工具、冲印、专项采集及订单管理。

## 团队还原交付入口

iOS、Android、鸿蒙团队先读 [《知拍1.4.6三端还原交付说明》](HANDOFF.md)。其中统一说明阅读顺序、模块与源码入口、原型能力边界、平台适配、Impeccable协作、待补契约及验收方式。

当前仓库提供 Web 原型与还原依据，尚未包含三端原生工程或真实业务后端。交付基线与资料缺口以该入口为准。

V1.4.6第二阶段（11月4—10日）的[产品开发交接稿](docs/product/collection-week2-development-handoff-1.4.6.md)汇总通知、服务中心、登录及App更新的现有依据、接口需求、验收场景及待确认项。小程序由用户提供详细产品文档后另行规划，本轮暂不考虑；当前材料不代表原生开发、接口或验收已完成。

本轮改为按模块逐一梳理，先读[通知业务规则](docs/product/collection-notifications-1.4.6.md)：三类通知、五类采集结果、历史与已读、上网结果推送节奏及项目人工发布开关已单独归档，页面结构及配套规则已确认；正常原型已补齐本地历史／已读、公告全文及任务去向，真实后台发布与系统推送仍待接入。

[专项采集服务中心](docs/product/collection-services-1.4.6.md)已确认九项帮助、邮件咨询与恢复、任务定位、知拍客服统一协调机构，以及后台维护帮助和邮箱、三端读取同一份配置。页面结构已确认，九项帮助和共享联系抽屉已本地实现；后台配置、实际邮件应用与完整用户验收仍待接入或验证。

2026-11-03[原型文档工作区](docs/product/prototype-workbench.md)已按用户确认的首页完整正文与结构图修订：左侧连续阅读当前页全部区块，目录定位全文，抽屉定位父页章节并恢复阅读位置；当前[62份独立说明](docs/product/prototype-page-guide.md)按页面／步骤加载。通知、服务与登录演示分别归属对应页面／步骤，强更从顶部全局菜单进入；小于1000px保留手机预览。本次登记原型 **11.3-2**，在11.3-1基础上同步[第二阶段完整需求](docs/product/collection-stage2-1.4.6.md)、逐页说明和右侧通知／服务流程，登录保持A方案并完善重置单屏布局；账号测试依赖缓存与本地服务隔离。准确基线及Git结果以[交付台账](docs/releases/prototype-deliveries.md)和`prototype/2026/11.3-2`为准。完整画面及原生能力待验收，本次不部署站点，不代表真实后台、短信、推送或安装服务已接入。

当前交付登记为原型 **11.11-1**（2026-11-11，北京时间）。基于11.9-1（`5ea4217`），更新相册双卡与家人／证件管理、首页同款品牌头部、采集方式及拍摄准备抽屉、三类项目和采集记录紧凑页头，以及带数量胶囊的采集记录入口。准确基线通过 `prototype/2026/11.11-1` 解析，验证及待验收项见[原型交付台账](docs/releases/prototype-deliveries.md)。

## 版本与正式推送

原型采用 `月.日-当天序号`（如 `10.26-1`、`10.26-2`）；App、管理后台、后端和小程序采用独立三段式版本，以交付记录关联。**每次向原型主分支／团队交付分支正式推送都必须有版本、台账、不可变 Git 标签、变更说明及验证／待验收状态，文档更新也适用。** 规则见[版本编号与交付规则](docs/release-versioning.md)，历史与后续基线见[原型交付台账](docs/releases/prototype-deliveries.md)。台账在实际交付时填写，不因建立规则预填已发布版本。

## 本地运行

需要 Node.js 22.12+ 或受当前 Vite 版本支持的更高版本。

```bash
npm ci
npm run dev
```

访问 <http://127.0.0.1:4180/?page=home>。

服务监听 `0.0.0.0:4180`，同一局域网的设备可使用运行电脑的局域网 IP 访问。相机等能力受浏览器权限和安全上下文限制。

## 功能范围

- **首页**：知拍品牌与通知铃铛位于顶部，持相机小白熊与首张「证照采集」白卡相接。三个采集入口等宽并排、同屏展示，其后是八项常用工具和纪念品业务。
- **照片规格**：从首页进入三列九项的连贯宫格，选规格后在底部抽屉选底色，再去拍照或选图；参数带入现有制作页并可继续编辑，不增加二次确认。求职招聘采用已确认的二寸产品预设，不代表行业统一标准。
- **个人照片制作**：拍照或选图、制作前选择预设尺寸与背景、检测抽屉、约5秒同页Loading与原型结果弹窗选择、统一失败抽屉、只读成片、电子照片解锁及保存。确认页顶部返回退出制作，底部重新拍摄支持取消恢复；结果返回区分未解锁丢弃与已解锁保存退出。
- **常用工具**：照片精修、照片换装、修改尺寸、更换背景、格式转换及修改大小，与照片冲印统一直接进入工作页，同页选图、换图和预设参数；两种相册均开放。精修、换装、更换背景自动检测，冲印检查5∶7比例，其余三项不做内容检测。精修／换装沿用每次¥2.00服务，无处理券；修改大小确认处理后发起设备下载。真实AI、支付与后台未接入，详细边界见[本批产品说明](docs/product/personal-business-upgrade-20261104.md)。
- **冲印**：4 张二寸＋8 张一寸，或 8 张二寸两种背胶模切排版，每单固定一版；不限制照片内容，非5∶7比例需先手动裁剪，包含地址与付款流程。
- **专项采集**：项目分类、热门项目、身份认证、采集任务、状态跟踪、通知中心及服务中心。扫码支持两类显式演示码：机构码自动打开对应项目认证入口，学信网码直接进入本人信息核对第二步；含两类获取码帮助、权限及失败恢复。真实码解析与机构核验待接入。
- **个人中心与订单**：相册、分类订单、账号安全、客服抽屉与二维码分享海报。
- **设备预览**：统一的 iPhone 外壳、状态栏、安全区域及底部操作横杠。
- **桌面文档工作区**：62份按页／步骤组织的完整说明、实际区块目录、抽屉与来源阅读恢复，右侧保留可操作手机；通知及登录场景归属当前页，强更归属顶部全局菜单，内存演示不写业务数据。

支付、短信、身份认证、照片制作及精修／换装为原型演示，尚未接入真实业务后端。个人制作在「开始制作」后的弹窗选择五种检测场景，重试可重新选择，不使用专用测试网页；工具检查仍人工选择模拟结果，均不执行真实识别。修改尺寸、格式转换、压缩、下载及部分背景替换使用浏览器本地能力。

照片、草稿与演示订单存储在浏览器的 IndexedDB 或本地存储中；不同域名、IP 或端口的数据互不共享。仓库不包含运行时账号、照片与订单数据库。

## 技术与目录

项目使用 React 19、Vite 8、原生 CSS、Canvas 和 IndexedDB。界面由 React 渲染，页面状态通过 `useSyncExternalStore` 订阅；无 Alpine.js 运行依赖。

| 目录              | 内容                                  |
| ----------------- | ------------------------------------- |
| `src/pages/`      | 页面与业务交互                        |
| `src/components/` | 公共组件、导航和抽屉                  |
| `src/domain/`     | 状态、业务流程、存储及处理逻辑        |
| `src/runtime/`    | 状态订阅、生命周期、表单绑定和 Portal |
| `src/workbench/`  | 页面上下文、Markdown读取与隔离演示会话 |
| `src/styles/`     | 共享规范与页面样式                    |
| `public/assets/`  | 运行所需图片与图标                    |
| `public/vendor/`  | 本地二维码识别库                      |
| `tests/`          | 状态、业务流程与迁移对照检查          |
| `scripts/`        | 流程测试及历史迁移工具                |
| `docs/product/pages/` | 62份按页面／步骤组织的完整说明         |
| `docs/`           | 模块契约、设计依据与检查记录           |

产品定位、用户、能力边界和开放决策见 [PRODUCT.md](PRODUCT.md)；视觉规范见 [DESIGN.md](DESIGN.md)。

设计规则与实际代码值已合并归档至 [DESIGN.md](DESIGN.md)。Impeccable 的共享组件面板配置为 [.impeccable/design.json](.impeccable/design.json)；提取来源、实现差异及验证范围见 [设计系统提取记录](docs/design/design-system-source-map.md)。仅共享该面板文件，其他本机 Impeccable 状态继续忽略。

## 产品文档与审查

- [原型文档工作区契约](docs/product/prototype-workbench.md)及[62页文档目录](docs/product/prototype-page-guide.md)：连续全文、本页区块目录、父页抽屉定位、阅读恢复、页面场景与全局升级；[本轮实施](docs/reviews/page-documentation-20261103/implementation.md)与[文档收尾](docs/reviews/page-documentation-20261103/documentation.md)记录实际检查和待验收。[上一版工作区记录](docs/reviews/prototype-workbench-20261103/implementation.md)保留为历史，不作为本轮重跑结果。

- [账号登录契约](docs/product/account-login-1.4.6.md)：已确认A分步结构、记住成功号码、协议、密码找回、平台第三方及原业务返回；[独立收尾评审](docs/reviews/account-login-20261102/finish-review.md)仅在源码／状态范围可交付。当前仍为本地短信、授权和账号模拟，实际画面及三端体验待验收。

- [专项项目搜索契约](docs/product/collection-project-search-1.4.6.md)：全部项目独立搜索页、初始／结果／无结果状态及详情返回；三个分类列表保持原样。[实施与待验收记录](docs/reviews/collection-project-search-20261026/review.md)包含已确认结构图和验证范围。

- [全项目消息反馈规范](docs/design/message-feedback-guidelines.md)：六类消息、Toast位置、原因与Loading边界；[逐模块整改清单](docs/reviews/message-feedback-20261026/remediation.md)包含已确认结构图、源码现状和逐项验收顺序。当前为规范已确认、代码待实施。

- [扫码采集契约与演示码](docs/product/scan-collection-1.4.6.md)：两类扫码去向、帮助、登录／返回／权限、15 MB输入及真实服务边界；[本轮实施记录](docs/reviews/scan-collection-20261023/review.md)保留已确认结构图和验收项。

- [首页产品契约](docs/product/home-1.4.6.md)及[逐页说明](docs/product/pages/home.md)记录头部、通知、采集分类和各业务去向。原宣传轮播的[资产来源](docs/assets/home-hero-mature-20261020.md)保留作历史记录。
- [照片确认页与来源适配](docs/product/camera-confirmation-1.4.6.md)：流程内场景选择、制作前检测与统一失败抽屉、同页制作、只读结果、返回及付款保存保护；附交互式结构说明。
- [照片规格产品契约](docs/product/photo-specifications-1.4.6.md)与[交互线框](docs/product/photo-specifications-1.4.6.html)：九项目录、选色、现有相机与制作参数交接；[头图来源](docs/assets/specifications-hero-20261020.md)、[实施记录](docs/reviews/photo-specifications-20261020/review.md)、[独立收尾评审](docs/reviews/photo-specifications-20261020/finish-review.md)及[文档收尾](docs/reviews/photo-specifications-20261020/documentation.md)。首页与规格页共用[宫格样式](src/styles/utility-grid.css)。
- [订单产品与交互规范](docs/product/orders-1.4.6.md)：类型横滑Tab、状态单选胶囊、票据列表与详情、付款与返回规则；[隔离交互样例](http://127.0.0.1:4180/docs/product/orders-1.4.6.html)复用实际组件、只使用内存样例，不读取用户订单。
- [常用工具产品需求与验收](docs/product/common-tools-1.4.6.md)：冲印及六项工具的最新规则、逐页功能和前后步关系。
- [逐页交互式结构说明](docs/product/common-tools-1.4.6.html)：23个页面与抽屉的结构示意，可切换状态；不是实际页面截图或视觉定稿。本地服务运行时可访问 [结构说明页面](http://127.0.0.1:4180/docs/product/common-tools-1.4.6.html)。
- [六项工具完成页统一与交付校验](docs/reviews/tool-results-20261021/review.md)：2026-10-21更换背景设备交付、共用完成页、保存重试及待验收边界；[2026-10-19历史审查](docs/reviews/common-tools-20261019/review.md)保留早期检查证据。

## 构建与检查

```bash
npm run build
npm run preview
```

生产产物输出到 `dist/`，构建本身不会发布站点。

常用工具、冲印及相关业务检查：

```bash
node scripts/test-flows.mjs tools-flow.cjs
node scripts/test-flows.mjs print-flow.cjs
node scripts/test-flows.mjs album-flow.cjs
node scripts/test-flows.mjs camera-scan-flow.cjs
node --test tests/bindings.test.mjs tests/orders.test.mjs
```

上述检查为源码与模拟状态检查，不包含浏览器自动化或真机验收。

工作区针对性检查：`node --test tests/workbench-context.test.mjs tests/workbench-demo.test.mjs tests/workbench-pages.test.mjs tests/bindings.test.mjs`。本轮主任务22/22通过，包含全部62份文档与映射、场景归属、实际抽屉枚举、链接、唯一锚点、阅读恢复和数据隔离；生产构建通过，jsQR普通script与超过500kB分块提示保留。本轮未跑全量测试；此前24项相关回归及compat历史超时的范围仅见[上一版记录](docs/reviews/prototype-workbench-20261103/implementation.md)，不能称本轮已重跑或全量通过。[独立评审](docs/reviews/page-documentation-20261103/finish-review.md)为限定源码／状态／SSR的SHIP，强更上下文与真实相机弹层映射均resolved；文档收尾检查见[本轮记录](docs/reviews/page-documentation-20261103/implementation.md)。

历史实施记录中的「本地修改」「未推送」或站点版本号只描述当次状态，不作为最新交付结论。当前共享基线以实际 Git 分支、不可变标签及[交付台账](docs/releases/prototype-deliveries.md)为准；规则生效前的记录保留原提交，不补造日期版本。相关测试与构建的已执行结果见模块实施记录，不把文档整理视为重新运行全部检查或实际画面验收。

`npm test` 还包含历史迁移一致性检查，依赖原迁移项目及当时的基线；单独克隆本仓库时不能将这部分作为当前功能的通过标准。`migration-manifest.json` 与 `scripts/migrate-source.mjs` 保留迁移来源记录，正常开发直接维护 `src/`，不要重新运行迁移工具覆盖当前页面。
