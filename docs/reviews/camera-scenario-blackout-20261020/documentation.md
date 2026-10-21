# 开始制作黑屏修复记录

2026-10-20。范围：既有证件照流程的运行时缺陷修复。

- 根因：真实 `observable` 包装冻结场景数组与检测配置后，读取不可配置、不可写的数据属性时返回新 Proxy，触发 JavaScript 不变量 `TypeError`，阻断弹窗渲染。
- 修复：`src/runtime/state.js` 对上述属性直接返回原值，先于函数绑定和嵌套代理；冻结常量保持冻结。
- 证据：`tests/runtime.test.mjs` 新增冻结数组、配置、函数身份及禁止写入回归；`tests/camera-failure-presentation.test.mjs` 新增真实 `observable` 下的 React 静态弹窗渲染与检测配置读取回归。主执行记录：24 项定向测试及相机流程检查通过。
- 设计保留：沿用已确认的场景弹窗契约；本轮无样式、文案、流程或位图变更。现有 `DESIGN.md` 与配套 HTML 线框图保持原样，不重建视觉规范或 sidecar。
- 验收边界：未操作浏览器、截图或运行自动 UI 测试；实际画面与点击结果待用户验收。
