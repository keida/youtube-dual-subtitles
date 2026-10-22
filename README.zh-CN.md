# YouTube 分层字幕

<!-- download-counts:start -->
[![Release 附件总下载次数](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/total?label=Release%20asset%20downloads)](https://github.com/keida/youtube-dual-subtitles/releases) [![v0.4.0 插件 ZIP 下载次数](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/v0.4.0/YouTube-Dual-Subtitles-Extension-0.4.0.zip?label=Plugin%20ZIP%20downloads&displayAssetName=false)](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.4.0)

统计的是文件下载次数，不是人数或安装量。总数包含上传的 Release 附件（插件 ZIP、打包源码 ZIP、校验和文件）；插件徽章单独统计 v0.4.0 插件 ZIP。GitHub 自动生成的 Source code ZIP/tar.gz 不计入这些附件数据。徽章缓存可能延迟更新。
<!-- download-counts:end -->

[English](README.md) · [下载](https://github.com/keida/youtube-dual-subtitles/releases) · [版本记录](CHANGELOG.zh-CN.md)

Chrome / Edge Manifest V3 扩展，当前 0.4.0。原文默认在底部，译文在顶部；位置、字号、背景、显隐、时间偏移分别调整。

**这是预发布版，真实已安装扩展仍待验收。** 模拟测试通过不代表真实网站自动获取已通过；首次新视频、自然自动播放、YouTube 原生全屏、句末暂停精度、浏览器重启保存仍需验证。

## 安装

在 Releases 下载插件 ZIP，解压后自行加载 extension 文件夹，不需要构建。更新时保留现有扩展身份：替换文件、重新加载扩展、刷新视频页、点击扩展图标。详见[安装说明](docs/INSTALL.zh-CN.md)。

## 文档导航

[使用与语言指南](docs/GUIDE.zh-CN.md) · [安装与更新](docs/INSTALL.zh-CN.md) · [隐私](docs/PRIVACY.zh-CN.md) · [许可](docs/LICENSING.zh-CN.md) · [验证范围](docs/VALIDATION.zh-CN.md) · [开发](docs/DEVELOPMENT.zh-CN.md)

## 三种语言概念

**界面固定简体中文，暂不支持手动切换界面语言，也不会根据电脑或浏览器语言自动切换。** 首次使用的译文目标默认为简体中文（zh-Hans），之后优先使用本地保存的目标。详细默认与保存规则见[使用与语言指南](docs/GUIDE.zh-CN.md)。

设置中可以选择原文字幕轨和译文字幕目标语言；可选字幕与翻译来自当前视频的 YouTube 元数据。查词主语言跟随所选译文目标，不等同于界面语言。

| 英文原文的字幕目标 | 查词卡 |
| --- | --- |
| 中文 | 中文释义 + 英文原文解释 |
| 英文 | 英文释义 / 原文解释，共用一个区块 |
| 其他语言 | 明确提示目标词典暂不支持，保留英文原文解释 |

当前词典仅支持英文原词的中文 / 英文条目。其他原文语言明确提示，不把同形词当英文。中文保留维基词典原有简繁，不承诺自动转换。核对同一词目、英语语言区块和共同词性；不同来源的词义顺序不强行逐项配对。

切换字幕目标会取消正在进行的查词、立即切换显示；缓存包含单词、完整原文语言与目标语言。打开词本和复习不会自动联网。兼容旧词本与 0.3.1 字段，保留手写笔记、原句、时点及掌握状态。

## 学习与隐私

上下句、单句重播、句末暂停、可点击字幕列表、独立偏移、本地 SRT/VTT 导入导出、收藏、复习揭示、掌握标记、重听和 JSON/CSV 导出。释义来源与许可独立保存。

字幕及翻译只用 YouTube；无收费翻译 API、字幕上传、遥测、远程代码或永久域权限，不绕过登录或 DRM。正常 CC 自动加载失败时，首次新视频仍可能需要手动选择原生 CC 轨。

仅主动点击英文词或更新释义时，向公开维基词典发送单词和固定参数，不发字幕句子、视频 ID、时点、笔记、历史或词本。服务方仍能看到 IP 等普通网络信息。详见[隐私](docs/PRIVACY.zh-CN.md)、[许可](docs/LICENSING.zh-CN.md)、[验证范围](docs/VALIDATION.zh-CN.md)。

代码采用 MIT；维基词典文本保留原来源、CC BY-SA 4.0 等适用许可。不声称与 YouTube 或 Language Reactor 有关联。

Node.js 22+ 可执行 npm test；隔离 UI 测试不会加载用户账号或安装扩展。详见[开发说明](docs/DEVELOPMENT.zh-CN.md)。Release 分别提供插件 ZIP 和源码 ZIP。
