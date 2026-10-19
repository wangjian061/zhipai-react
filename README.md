# 知拍 Zhipai

知拍 1.4.6 的 React 移动端交互原型，涵盖个人证件照制作、照片工具、冲印、专项采集及订单管理。

## 本地运行

需要 Node.js 22.12+ 或受当前 Vite 版本支持的更高版本。

```bash
npm ci
npm run dev
```

访问 <http://127.0.0.1:4180/?page=home>。

服务监听 `0.0.0.0:4180`，同一局域网的设备可使用运行电脑的局域网 IP 访问。相机等能力受浏览器权限和安全上下文限制。

## 功能范围

- **个人照片制作**：拍照、确认效果、制作过渡、结果预览、尺寸与背景调整、电子照片解锁及保存。
- **常用工具**：照片精修、换装、裁剪、背景更换、格式转换及文件体积调整。工具直接进入选图，均支持知拍相册与手机相册；精修、换装、更换背景需要通过原型证件照检查。其他工具不限制照片内容。更换背景结果保存至知拍相册，裁剪、格式转换和体积调整保存至设备。
- **冲印**：4 张二寸＋8 张一寸，或 8 张二寸两种背胶模切排版，每单固定一版；不限制照片内容，非5∶7比例需先手动裁剪，包含地址与付款流程。
- **专项采集**：项目分类、热门项目、身份认证、采集任务、状态跟踪、通知中心及服务中心。
- **个人中心与订单**：相册、分类订单、账号安全、客服抽屉与二维码分享海报。
- **设备预览**：统一的 iPhone 外壳、状态栏、安全区域及底部操作横杠。

支付、短信、身份认证、照片制作及精修／换装为原型演示，尚未接入真实业务后端。照片检查通过人工选择模拟结果，不执行真实人像识别。照片裁剪、格式转换、压缩、下载及部分背景替换使用浏览器本地能力。

照片、草稿与演示订单存储在浏览器的 IndexedDB 或本地存储中；不同域名、IP 或端口的数据互不共享。仓库不包含运行时账号、照片与订单数据库。

## 技术与目录

项目使用 React 19、Vite 8、原生 CSS、Canvas 和 IndexedDB。界面由 React 渲染，页面状态通过 `useSyncExternalStore` 订阅；无 Alpine.js 运行依赖。

| 目录 | 内容 |
| --- | --- |
| `src/pages/` | 页面与业务交互 |
| `src/components/` | 公共组件、导航和抽屉 |
| `src/domain/` | 状态、业务流程、存储及处理逻辑 |
| `src/runtime/` | 状态订阅、生命周期、表单绑定和 Portal |
| `src/styles/` | 共享规范与页面样式 |
| `public/assets/` | 运行所需图片与图标 |
| `public/vendor/` | 本地二维码识别库 |
| `tests/` | 状态、业务流程与迁移对照检查 |
| `scripts/` | 流程测试及历史迁移工具 |
| `docs/` | 项目说明 |

设计规范见 [DESIGN.md](DESIGN.md)。

## 产品文档与审查

- [照片确认页与来源适配](docs/product/camera-confirmation-1.4.6.md)：拍照及相册入口、返回与重新选择、制作前尺寸底色设置、异常恢复；附交互式结构说明。

- [常用工具产品需求与验收](docs/product/common-tools-1.4.6.md)：冲印及六项工具的最新规则、逐页功能和前后步关系。
- [逐页交互式结构说明](docs/product/common-tools-1.4.6.html)：23个页面与抽屉的结构示意，可切换状态；不是实际页面截图或视觉定稿。本地服务运行时可访问 [结构说明页面](http://127.0.0.1:4180/docs/product/common-tools-1.4.6.html)。
- [逻辑校验与 oil-ui-pro 视觉规范审查](docs/reviews/common-tools-20261019/review.md)：三轮检查证据、问题分级、整改方案与待验收边界。

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

`npm test` 还包含历史迁移一致性检查，依赖原迁移项目及当时的基线；单独克隆本仓库时不能将这部分作为当前功能的通过标准。`migration-manifest.json` 与 `scripts/migrate-source.mjs` 保留迁移来源记录，正常开发直接维护 `src/`，不要重新运行迁移工具覆盖当前页面。
