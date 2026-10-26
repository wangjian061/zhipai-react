# 知拍 Zhipai

知拍 1.4.6 的 React 移动端交互原型，涵盖个人证件照制作、照片工具、冲印、专项采集及订单管理。

## 团队还原交付入口

iOS、Android、鸿蒙团队先读 [《知拍1.4.6三端还原交付说明》](HANDOFF.md)。其中统一说明阅读顺序、模块与源码入口、原型能力边界、平台适配、Impeccable协作、待补契约及验收方式。

当前仓库提供 Web 原型与还原依据，尚未包含三端原生工程或真实业务后端。交付基线与资料缺口以该入口为准。

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

- **首页**：专项采集（默认）、证件照制作、照片精修三张完整摄影轮播，分别进入专区、现有拍摄／选图与精修选图。保留搜索下方专项主卡、八工具顺序和底部导航；工具采用简化蓝灰图形，末尾与导航保持40px可达净距。
- **证照规格**：首页与搜索进入三列九项的连贯宫格，选规格后在底部抽屉选底色，再去拍照或选图；参数带入现有制作页并可继续编辑，不增加二次确认。求职招聘采用已确认的二寸产品预设，不代表行业统一标准。
- **个人照片制作**：拍照或选图、制作前选择预设尺寸与背景、检测抽屉、约5秒同页Loading与原型结果弹窗选择、统一失败抽屉、只读成片、电子照片解锁及保存。确认页顶部返回退出制作，底部重新拍摄支持取消恢复；结果返回区分未解锁丢弃与已解锁保存退出。
- **常用工具**：照片精修、换装、裁剪、背景更换、格式转换及文件体积调整。工具直接进入选图；换装最新规则仅允许知拍相册、禁用手机相册（已确认，待代码实施），其他工具支持两种相册。精修、换装、更换背景需要通过原型证件照检查，其他工具不限制照片内容。更换背景、裁剪、格式转换和体积调整通过浏览器发起设备下载；精修、换装付款处理后保存至知拍相册。六项复用统一完成页。
- **冲印**：4 张二寸＋8 张一寸，或 8 张二寸两种背胶模切排版，每单固定一版；不限制照片内容，非5∶7比例需先手动裁剪，包含地址与付款流程。
- **专项采集**：项目分类、热门项目、身份认证、采集任务、状态跟踪、通知中心及服务中心。扫码支持两类显式演示码：机构码自动打开对应项目认证入口，学信网码直接进入本人信息核对第二步；含两类获取码帮助、权限及失败恢复。真实码解析与机构核验待接入。
- **个人中心与订单**：相册、分类订单、账号安全、客服抽屉与二维码分享海报。
- **设备预览**：统一的 iPhone 外壳、状态栏、安全区域及底部操作横杠。

支付、短信、身份认证、照片制作及精修／换装为原型演示，尚未接入真实业务后端。个人制作在「开始制作」后的弹窗选择五种检测场景，重试可重新选择，不使用专用测试网页；工具检查仍人工选择模拟结果，均不执行真实识别。照片裁剪、格式转换、压缩、下载及部分背景替换使用浏览器本地能力。

照片、草稿与演示订单存储在浏览器的 IndexedDB 或本地存储中；不同域名、IP 或端口的数据互不共享。仓库不包含运行时账号、照片与订单数据库。

## 技术与目录

项目使用 React 19、Vite 8、原生 CSS、Canvas 和 IndexedDB。界面由 React 渲染，页面状态通过 `useSyncExternalStore` 订阅；无 Alpine.js 运行依赖。

| 目录              | 内容                                  |
| ----------------- | ------------------------------------- |
| `src/pages/`      | 页面与业务交互                        |
| `src/components/` | 公共组件、导航和抽屉                  |
| `src/domain/`     | 状态、业务流程、存储及处理逻辑        |
| `src/runtime/`    | 状态订阅、生命周期、表单绑定和 Portal |
| `src/styles/`     | 共享规范与页面样式                    |
| `public/assets/`  | 运行所需图片与图标                    |
| `public/vendor/`  | 本地二维码识别库                      |
| `tests/`          | 状态、业务流程与迁移对照检查          |
| `scripts/`        | 流程测试及历史迁移工具                |
| `docs/`           | 项目说明                              |

产品定位、用户、能力边界和开放决策见 [PRODUCT.md](PRODUCT.md)；视觉规范见 [DESIGN.md](DESIGN.md)。

设计规则与实际代码值已合并归档至 [DESIGN.md](DESIGN.md)。Impeccable 的共享组件面板配置为 [.impeccable/design.json](.impeccable/design.json)；提取来源、实现差异及验证范围见 [设计系统提取记录](docs/design/design-system-source-map.md)。仅共享该面板文件，其他本机 Impeccable 状态继续忽略。

## 产品文档与审查

- [专项项目搜索契约](docs/product/collection-project-search-1.4.6.md)：全部项目独立搜索页、初始／结果／无结果状态及详情返回；三个分类列表保持原样。[实施与待验收记录](docs/reviews/collection-project-search-20261026/review.md)包含已确认结构图和验证范围。

- [全项目消息反馈规范](docs/design/message-feedback-guidelines.md)：六类消息、Toast位置、原因与Loading边界；[逐模块整改清单](docs/reviews/message-feedback-20261026/remediation.md)包含已确认结构图、源码现状和逐项验收顺序。当前为规范已确认、代码待实施。

- [扫码采集契约与演示码](docs/product/scan-collection-1.4.6.md)：两类扫码去向、帮助、登录／返回／权限、15 MB输入及真实服务边界；[本轮实施记录](docs/reviews/scan-collection-20261023/review.md)保留已确认结构图和验收项。

- [首页产品契约](docs/product/home-1.4.6.md)：完整图片轮播、图内系统安静区、保留专项主卡、工具与导航入口；[实施复核](docs/reviews/home-mature-carousel-tools-20261020/review.md)、[独立收尾评审](docs/reviews/home-mature-carousel-tools-20261020/finish-review.md)及[资产来源](docs/assets/home-hero-mature-20261020.md)记录源码与出货资产检查。实际页面和三端设备效果仍待验收；此前专项主卡与布局评审保留为历史。
- [照片确认页与来源适配](docs/product/camera-confirmation-1.4.6.md)：流程内场景选择、制作前检测与统一失败抽屉、同页制作、只读结果、返回及付款保存保护；附交互式结构说明。
- [证照规格产品契约](docs/product/photo-specifications-1.4.6.md)与[交互线框](docs/product/photo-specifications-1.4.6.html)：九项目录、选色、现有相机与制作参数交接；[头图来源](docs/assets/specifications-hero-20261020.md)、[实施记录](docs/reviews/photo-specifications-20261020/review.md)、[独立收尾评审](docs/reviews/photo-specifications-20261020/finish-review.md)及[文档收尾](docs/reviews/photo-specifications-20261020/documentation.md)。首页与规格页共用[宫格样式](src/styles/utility-grid.css)。
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

历史实施记录中的「本地修改」「未推送」或站点版本号只描述当次状态，不作为最新交付结论。当前共享基线以实际 Git 分支、不可变标签及[交付台账](docs/releases/prototype-deliveries.md)为准；规则生效前的记录保留原提交，不补造日期版本。相关测试与构建的已执行结果见模块实施记录，不把文档整理视为重新运行全部检查或实际画面验收。

`npm test` 还包含历史迁移一致性检查，依赖原迁移项目及当时的基线；单独克隆本仓库时不能将这部分作为当前功能的通过标准。`migration-manifest.json` 与 `scripts/migrate-source.mjs` 保留迁移来源记录，正常开发直接维护 `src/`，不要重新运行迁移工具覆盖当前页面。
