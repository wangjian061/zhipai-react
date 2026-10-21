# 相册浏览与大图查看 · 文档同步

日期：2026-10-20。按用户已确认范围增量维护既有设计规范；源码完成审查结论为`ship`，实际画面仍待用户验收。

## 已同步内容

| 文件 | 本轮内容 |
| --- | --- |
| [DESIGN.md](../../../DESIGN.md) | 在既有相册提示旁补充列表信息密度、详情信息层级、独立深色大图层、完整等比显示、安全间距、关闭操作与异常展示 |
| [PRODUCT.md](../../../PRODUCT.md) | 主任务已同步相册列表、详情、大图查看、返回与验收边界；本子任务未修改 |

依据为[产品上下文](../../../PRODUCT.md)、开发用已确认方向契约`.impeccable/briefs/album-viewing-20261020.md`及下列现行源码。沿用既有`DESIGN.md`，不重写全局规范，不更新视觉sidecar，不生成位图。用户本轮未要求产品UI文档，未新增HTML、交互线框或其他宽范围文档。

## 源码依据与交互边界

| 规则 | 现行证据 |
| --- | --- |
| 列表每张照片不显示规格或文件说明；详情保留规格、像素、格式和体积 | [AlbumPage.jsx](../../../src/pages/AlbumPage.jsx#L301)的列表仅保留缩略图、文件不可用提示与管理勾选；同文件第536行开始保留详情资料。详情「点击放大查看」为按钮，照片与提示均调用`openPreview()` |
| 大图独立覆盖手机页面，完整显示实际图片比例 | [AlbumPage.jsx](../../../src/pages/AlbumPage.jsx#L778)在既有Portal中渲染`AlbumPhotoViewer`；[大图样式](../../../src/styles/album-photo-viewer.css#L1)覆盖容器四边，使用深色整面；第62行起为透明背景、无边框圆角、`object-fit: contain`，不限定照片比例 |
| 关闭区、系统安全间距与白色系统文字 | [大图样式](../../../src/styles/album-photo-viewer.css#L7)避让系统区和底部安全区；第20行起关闭按钮为44×44px，带20px白色图形与白色焦点圈。第75行只在大图状态覆盖系统文字颜色；[AppShell.jsx](../../../src/components/AppShell.jsx#L30)传递该状态 |
| 点击实际照片内容不关闭，点击其外的留白关闭 | [AlbumPhotoViewer.jsx](../../../src/components/AlbumPhotoViewer.jsx#L8)以图片固有尺寸及显示区域计算实际内容边界，包含`contain`产生的留白；第41行与第47行同时处理层本身和顶部空白 |
| 查看期间底页不接受交互或滚动；关闭回到原入口 | [AlbumPage.jsx](../../../src/pages/AlbumPage.jsx#L20)将底页设为`inert`；[AppShell.jsx](../../../src/components/AppShell.jsx#L41)锁定页面与导航交互；[大图样式](../../../src/styles/album-photo-viewer.css#L72)锁定详情滚动。底页详情保持挂载，不改变照片尺寸或排版；[album.js](../../../src/domain/album.js#L602)保存入口焦点，关闭后以`preventScroll`恢复，Tab约束与Escape关闭复用同一控制器 |
| 浏览器返回先关闭层，前进可恢复查看；重复关闭不越过详情 | [album.js](../../../src/domain/album.js#L615)在当前URL压入`albumPreview`历史标记；第634行起通过`history.back()`关闭并以`previewClosing`防重复触发。第458行起处理`popstate`，同张照片只关闭层并保留详情滚动位置，前进到带标记的详情则恢复查看 |
| 文件不可用与图片显示失败仍有明确退出路径 | [AlbumPage.jsx](../../../src/pages/AlbumPage.jsx#L484)保留详情「照片文件不可用」与「删除此记录」，缺少文件时不显示打开入口。[AlbumPhotoViewer.jsx](../../../src/components/AlbumPhotoViewer.jsx#L64)对查看层缺少文件或加载失败显示`role="status"`的「照片暂时无法显示」，关闭按钮独立保留 |

管理、删除、下载、工具入口、来源回传与照片文件沿用既有规则。新增查看行为只使用现有照片URL，不写入或重编码图片；不增加双指缩放、轮播或编辑能力。

## 验证与交付状态

- 主任务已完成9项相关测试，覆盖3项静态React展示测试及绑定、设备检查；`album-flow`、`background-album-flow`与构建通过。本子任务未重复执行测试或构建。
- 主任务已完成一次范围设计检测，[结果](detector.json)为`[]`；本子任务未重复运行检测器。源码完成审查与具体结果见[本轮检查记录](review.md)。
- 本子任务核对了上述文档与源码，并执行文档差异空白检查。保留其他已有改动，未提交或发布。
- 按用户及项目约定，未操作浏览器、截图或运行自动UI测试。静态React与源码检查不能代替实际视觉、触摸、滚动、浏览器历史及读屏验收；这些仍由用户在本地预览确认。
