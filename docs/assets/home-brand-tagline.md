# 首页标语字稿与字体授权

知拍首页的「拍照片，用知拍！」使用龙藏体（Long Cang Regular）排版，按原句转为[本地 SVG 字稿](../../public/assets/home-brand-tagline.svg)。Web、iOS、Android 和鸿蒙共用这一份图形。正文与品牌名沿用各端的系统字体。

## 授权与来源

| 项目 | 记录 |
| --- | --- |
| 字体及作者 | Long Cang Regular，设计者 Chen Xiaomin。[Google Fonts 字体元数据](https://github.com/google/fonts/blob/main/ofl/longcang/METADATA.pb) |
| 版权声明 | Copyright 2018 The Long Cang Project Authors (https://github.com/googlefonts/longcang) |
| 许可证 | SIL Open Font License 1.1。[随项目保留的完整原文](licenses/long-cang-OFL-1.1.txt) · [上游许可证](https://github.com/google/fonts/blob/main/ofl/longcang/OFL.txt) |
| 字体来源 | [Google Fonts 的 LongCang-Regular.ttf](https://github.com/google/fonts/blob/main/ofl/longcang/LongCang-Regular.ttf)，本次用于制图的文件 SHA-256 为 `e5bf2c3f24ef2327c6f136d8f73e2f9dfdf44896fdbeb35a9515f44777bb91bc` |

**本次交付的是排好的一句标语。** 龙藏体允许用于商业设计，按此制成的矢量图可用于知拍首页和宣传物料，画面无需标注字体作者。仓库保留上述来源和原文以供团队追溯。[OFL 官方 FAQ 第 1.1 节](https://openfontlicense.org/ofl-faq/)

如果后续在 App、网站或 SDK 中分发字体文件（含字体子集），须随该份字体保留版权声明和完整 OFL 许可证，字体及其修改版本继续按 OFL 分发。不得单独出售字体；如更换或修改字体，须核对相应字体及保留名称条款。上述义务针对字体，App 本身可继续使用自己的许可。[上游许可证第 1 至 5 条](https://github.com/google/fonts/blob/main/ofl/longcang/OFL.txt)

## 实现与验收

- **文件交付**。SVG 中只含固定字形轮廓和标题。App 不携带 TTF、WOFF 或可排版的字体子集，运行时无需访问字体服务。
- **排版**。在标准首页，23px排字效果对应约172px宽的字稿，在品牌名下方最大184px宽、44px高的左侧区域内双向居中。标准宽度下，同色圆角描边约0.18px，已经包含在 SVG 内。较窄屏幕将整句等比缩小，保持全角逗号与感叹号。
- **三端还原**。使用同一 SVG 或等价的原生矢量资源，以原文「拍照片，用知拍！」作为辅助功能描述，避免重复播报。若需更换文案，应从已核验的字体重新排字并更新此记录。
