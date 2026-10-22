# YouTube 分层字幕

<!-- download-counts:start -->
[![Release 附件总下载次数](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/total?label=Release%20asset%20downloads)](https://github.com/keida/youtube-dual-subtitles/releases) [![v0.5.0 插件 ZIP 下载次数](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/v0.5.0/YouTube-Dual-Subtitles-0.5.0-candidate-extension.zip?label=v0.5.0%20plugin%20downloads&displayAssetName=false)](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) [![v0.4.0 插件 ZIP 下载次数](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/v0.4.0/YouTube-Dual-Subtitles-Extension-0.4.0.zip?label=v0.4.0%20plugin%20downloads&displayAssetName=false)](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.4.0)

统计的是文件下载次数，不是人数或安装量。总数包含上传的 Release 附件（插件 ZIP、打包源码 ZIP、验证报告和校验和）；各插件徽章分别统计对应版本的插件 ZIP。GitHub 自动生成的 Source code ZIP/tar.gz 不计入这些附件数据。徽章缓存可能延迟更新。
<!-- download-counts:end -->

[English](README.md) · [v0.5.0 预发布下载](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) · [版本说明](RELEASE_NOTES.zh-CN.md) · [版本记录](CHANGELOG.zh-CN.md)

**0.5.0 是实验预发布版，使用已完成本地验证的候选代码。** 下载不会自动升级现用 0.4.0，也不会覆盖浏览器数据。源码包版本不代表浏览器实际加载的版本。

适用于普通 YouTube watch 页的 Chrome / Edge Manifest V3 扩展。原文默认在底部，译文在顶部；两层的位置、字号、背景、显隐和时间偏移分别调整。字幕及翻译取决于当前可访问视频的 YouTube 可用内容。

## 文档导航

[使用与语言指南](docs/GUIDE.zh-CN.md) · [安装与更新](docs/INSTALL.zh-CN.md) · [隐私](docs/PRIVACY.zh-CN.md) · [许可](docs/LICENSING.zh-CN.md) · [验证范围](docs/VALIDATION.zh-CN.md) · [开发](docs/DEVELOPMENT.zh-CN.md)

## 本次改进

- 收藏通过后台串行写入、按字段更新，处理多标签页互相覆盖；读取失败后先重试，成功前不能保存。
- 词典释义可选字，复制按钮连同来源和许可一起复制。每种释义语言独立超时，保留另一种语言的成功结果。
- 两条字幕轨分别恢复。失效或空的原生请求最多追加一次正常 CC 加载；导入译文不再取消原文加载。
- 笔记可以清空并保存；重叠字幕保留仍有效的长句；“恢复默认布局”只恢复外观。
- 小播放器内设置与词卡互斥；字幕截断时可打开全文。
- 词本支持搜索、每页 50 条、单条删除确认，以及 JSON 预览后合并恢复。

以上改动已安排本地回归验证，完成结果与 NOT RUN 项见[验证范围](docs/VALIDATION.zh-CN.md)。隔离浏览器测试不等于真实 YouTube、原生全屏、自然自动播放或浏览器重启保存验收。

## 三种语言设置

**界面语言：**“设置 → 界面语言”可选“跟随浏览器”“简体中文”“English”。跟随浏览器读取浏览器界面语言：中文区域使用简体中文，其他区域使用 English；不直接读取电脑系统语言。浏览器自身可能跟随系统。手动选择优先于自动识别。此设置不会翻译字幕、词典释义或你的笔记。

**字幕语言：** 设置中选择原文字幕轨及译文目标，可选项来自 YouTube。

**词典语言：** 主释义语言跟随字幕目标，目前只支持英文原词。

| 英文原词的字幕目标 | 查词卡 |
| --- | --- |
| 中文 | 中文释义 + 英文原文解释 |
| 英文 | 一个英文释义 / 解释区块 |
| 其他语言 | 明确提示目标词典暂不支持，保留英文原文解释 |

其他原文语言会显示不支持提示。中文条目保留提供方原有简繁；释义来自词典，不是机器翻译，也不强行把不同来源的词义逐项配对。切换字幕目标会取消正在进行的查询，不会自动查询已收藏词本。

## 词本与备份

可搜索单词、原句和笔记，每页显示 50 条。收藏保留原句、视频/时点、笔记、词典释义及掌握状态；已有笔记可以主动清空。

试用候选版或恢复备份前，先导出当前 JSON。恢复接受版本 1–5、最多 16 MiB、5000 条的 JSON 文件；整批校验后，需要点击“合并恢复”才写入。恢复只添加新收藏，已有重复项及其笔记、掌握状态保持不变，不替换整个词本。合并后的规范词本上限为 4 MiB / 5000 条，超过上限会整批拒绝。旧有合法但超过新容量的词本仍能读取、导出和缩减。

CSV 用于阅读或分析，JSON 用于恢复。导出文件包含你选中的词、原句、笔记和视频书签，请按需要保管。

## 下载与安装

以下附件的下载位置为 [v0.5.0 预发布页](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0)：

- `YouTube-Dual-Subtitles-0.5.0-candidate-extension.zip`：插件与使用文档。
- `YouTube-Dual-Subtitles-0.5.0-candidate-source.zip`：源码、测试及文档。
- `VALIDATION.zh-CN.md`：已记录的中文验证报告。
- `SHA256SUMS.txt`：附件校验和。

真实已安装浏览器验收尚未完成，因此 ZIP 文件名保留 candidate。请解压到独立目录并审阅改动、验证报告；决定更新前继续保留现用安装。更新前先导出词本，保留扩展身份，确认更新后刷新所有仍运行旧版的 YouTube 标签，详见[安装与更新](docs/INSTALL.zh-CN.md)。未配置自动升级。

## 隐私与开发

权限仍只有 activeTab、scripting、storage。无永久域权限、遥测、远程可执行代码、词本云同步或收费翻译 API。字幕完整复用同视频、同轨和同目标的原生成功请求，不生成授权参数；没有可用请求时仍可能需要正常手动选择原生 CC。

仅点击受支持的英文词或主动更新时，向公开维基词典发送该词，不发原句、视频 ID、时点、笔记或词本。详见[隐私](docs/PRIVACY.zh-CN.md)与[许可](docs/LICENSING.zh-CN.md)。

扩展无需构建或运行时依赖。Node.js 22+ 可运行 `npm test`；隔离浏览器测试和本地打包见[开发说明](docs/DEVELOPMENT.zh-CN.md)。代码采用 MIT，词典文本保留原来源与 CC BY-SA 4.0 等适用许可。不声称与 YouTube 或 Language Reactor 有关联。
