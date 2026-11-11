# 知拍相册证件内图 · 2026-11-10

使用内置 ImageGen 逐张生成五张彩色拟物 3D 证件。画面以完整单件为主体，导出为保留透明通道的 WebP，长边 192px。文件曾用于证件类型文件夹的背板与磨砂前挡之间，图片中使用虚构人像和示意字段。现行证件照片页按人使用相册封面，此处保留历史素材记录。

| 原型类型 | 图片表现 | 素材与参考 |
| --- | --- | --- |
| 身份证 | 浅蓝与浅粉底纹、右侧彩色人像、中文标题 | [identity.webp](../../public/assets/album-document-covers/identity.webp) · [第二代居民身份证式样](https://www.yzcity.gov.cn/zdfw/cjwt/201110/f3c5ef91ec2f4b45b4abeab4cc0cfd35.shtml) |
| 医保卡 | 用实体社会保障卡表示，取蓝色放射纹和中文卡名 | [medical.webp](../../public/assets/album-document-covers/medical.webp) · [北京市社会保障卡用户手册](https://rsj.beijing.gov.cn/xxgk/2024qt/202411/W020241101540794676493.pdf) |
| 驾驶证 | 深色皮纹证套、薄页边与中文烫金标题 | [licence.webp](../../public/assets/album-document-covers/licence.webp) · [公安部机动车驾驶证件标准信息](https://ywtb.mps.gov.cn/gabzh/portal/stdDetail/320401) |
| 护照 | 酒红色封面、中文烫金与米白页边 | [passport.webp](../../public/assets/album-document-covers/passport.webp) · [国家移民管理局电子普通护照样式](https://www.nia.gov.cn/n741445/n741629/c763438/content.html) |
| 其它证件 | 米白中文纸质证书，使用红色纹样表示通用分类 | [other.webp](../../public/assets/album-document-covers/other.webp) |

## 最终生成提示词

五次生成均使用透明背景。

### 身份证

```text
A single mainland Chinese second-generation resident identity card, portrait side. A light cyan-blue laminated horizontal ID card with fine blue and blush-lilac guilloche arcs. A small stylized Chinese adult's color portrait printed on the right, and the exact title “居民身份证” clearly printed near the top-left in dark blue. Two or three very short muted abstract data strokes below the title. Real laminated edge thickness and slightly rounded corners.

Realistic skeuomorphic 3D product render of exactly the single Chinese credential described above. Isolate the single physical item on a clean transparent RGBA canvas. The whole item must be visible edge to edge including its bottom edge and all four corners, surrounded by transparent padding. Center on a square canvas, filling roughly 84% along the object's longest side. Near frontal product angle, just slight yaw and visible narrow edge thickness, crisp silhouette and soft studio light from top left. Medium saturation, faithful materials, bold enough for a 44px UI thumbnail. Use only the specified simplified Chinese title text, crisp and correctly written, and abstract strokes for minor fields. Use fictional illustration details. No personal numbers, addresses, dates, barcodes, readable individual data, national insignia, backdrop, holder, outer container, accessory, or free-standing shadow.
```

### 医保卡

```text
A single Chinese mainland physical social security card used for healthcare. A horizontal medium cobalt-blue plastic card with the recognizable bright-blue radial ray pattern radiating from the upper-middle. On the upper face write the exact Simplified Chinese lines “中华人民共和国” and “社会保障卡” in that order, with the second line visually dominant. Use a small simple red decorative accent at top and clean beveled edge. Cobalt-and-sky-blue radial color, realistic plastic sheen.

Realistic skeuomorphic 3D product render of exactly the single Chinese credential described above. Isolate the single physical item on a clean transparent RGBA canvas. The whole item must be visible edge to edge including its bottom edge and all four corners, surrounded by transparent padding. Center on a square canvas, filling roughly 84% along the object's longest side. Near frontal product angle, just slight yaw and visible narrow edge thickness, crisp silhouette and soft studio light from top left. Medium saturation, faithful materials, bold enough for a 44px UI thumbnail. Use only the specified simplified Chinese title text, crisp and correctly written, and abstract strokes for minor fields. Use fictional illustration details. No personal numbers, addresses, dates, barcodes, readable individual data, national insignia, backdrop, holder, outer container, accessory, or free-standing shadow.
```

### 驾驶证

```text
A single closed mainland Chinese motor vehicle driver's license in its compact dark charcoal black leather-textured credential cover. The object is one landscape rounded rectangle with a thin pale ivory laminated page edge visible at the right. Emboss the exact Simplified Chinese title “机动车驾驶证” in warm muted gold across its upper front. Fine pebble grain and restrained stitching make it look like a real physical driving credential. Flat closed front cover with a complete unobstructed rectangular silhouette.

Realistic skeuomorphic 3D product render of exactly the single Chinese credential described above. Isolate the single physical item on a clean transparent RGBA canvas. The whole item must be visible edge to edge including its bottom edge and all four corners, surrounded by transparent padding. Center on a square canvas, filling roughly 84% along the object's longest side. Near frontal product angle, just slight yaw and visible narrow edge thickness, crisp silhouette and soft studio light from top left. Medium saturation, faithful materials, bold enough for a 44px UI thumbnail. Use only the specified simplified Chinese title text, crisp and correctly written, and abstract strokes for minor fields. Use fictional illustration details. No personal numbers, addresses, dates, barcodes, readable individual data, national insignia, backdrop, holder, outer container, accessory, or free-standing shadow.
```

### 护照

```text
A single closed mainland China ordinary passport booklet, upright vertical, with a recognizable deep wine-red cloth-grain cover, slender cream page edges and slight rounded spine. Gold-foil stamped exact Simplified Chinese text “中华人民共和国” at the top and “护照” beneath it in slightly larger type. A simple ornamental gold ring below the Chinese title balances the cover. Warm burgundy-and-gold physical passport with the entire cover and bottom edge visible.

Realistic skeuomorphic 3D product render of exactly the single Chinese credential described above. Isolate the single physical item on a clean transparent RGBA canvas. The whole item must be visible edge to edge including its bottom edge and all four corners, surrounded by transparent padding. Center on a square canvas, filling roughly 84% along the object's longest side. Near frontal product angle, just slight yaw and visible narrow edge thickness, crisp silhouette and soft studio light from top left. Medium saturation, faithful materials, bold enough for a 44px UI thumbnail. Use only the specified simplified Chinese title text, crisp and correctly written, and abstract strokes for minor fields. Use fictional illustration details. No personal numbers, addresses, dates, barcodes, readable individual data, national insignia, backdrop, holder, outer container, accessory, or free-standing shadow.
```

### 其它证件

```text
A single upright ivory Chinese paper certificate with a thin warm red ornamental border and folded upper-right corner. At top print the exact Simplified Chinese title “证书” in ink. Just below, use a small rich vermilion circular decorative stamp made of concentric lines, with two short abstract text rows. Thick warm textured paper and subtle folded edge, like a Chinese paper certificate specimen.

Realistic skeuomorphic 3D product render of exactly the single Chinese credential described above. Isolate the single physical item on a clean transparent RGBA canvas. The whole item must be visible edge to edge including its bottom edge and all four corners, surrounded by transparent padding. Center on a square canvas, filling roughly 84% along the object's longest side. Near frontal product angle, just slight yaw and visible narrow edge thickness, crisp silhouette and soft studio light from top left. Medium saturation, faithful materials, bold enough for a 44px UI thumbnail. Use only the specified simplified Chinese title text, crisp and correctly written, and abstract strokes for minor fields. Use fictional illustration details. No personal numbers, addresses, dates, barcodes, readable individual data, national insignia, backdrop, holder, outer container, accessory, or free-standing shadow.
```
