# 隐私

权限只有 activeTab、scripting、storage。无永久域权限、自动内容脚本、遥测、远程可执行代码、收费 API、账户系统或词本云同步。点击图标启用当前普通 YouTube watch 页。

## 字幕

字幕请求只访问当前视频的同源 YouTube timedtext。仅按同视频、同轨、同目标原样复用完整原生成功请求；不生成、转移、记录或持久保存授权参数。获取时可能临时正常选择原生 CC 轨，并恢复此前状态；重试次数有界限，不绕过登录、DRM 或其他访问限制。

字幕全文只在会话中。本地 SRT/VTT 不上传，导航清空；同视频重新获取保留导入，直到主动清除。字幕文件导出由用户发起。

## 词典

仅点击受支持的英文词或主动更新时，向公开 zh.wiktionary.org / en.wiktionary.org 查询该词。中文目标查两站，英文或不支持的目标查询受支持的英文原文解释。不支持的原文语言不发送词典请求。打开词本、复习、恢复备份和切换目标语言，不会自动查询词本。

GET 字段为 action=parse、page=单个被点击的小写词（最多 64 个 ASCII 字母、撇号或连字符）、prop=wikitext、format=json、formatversion=2、redirects=1、origin=*。使用 credentials=omit、referrerPolicy=no-referrer、redirect=error。不发送原句、视频 ID/标题、时点、笔记、浏览历史或词本；服务方仍可看到 IP 等普通网络信息。

仅解析英语语言区块，重定向到不同词目则拒绝。释义不是机器翻译，也不保证不同来源逐义对应；来源、CC BY-SA 4.0 与清理标记说明保留在卡片和导出中。仅点击复制按钮时，才把所选释义及来源/许可写入剪贴板。

## 本地设置与词本

布局、偏好和主动收藏存在当前浏览器本地。界面自动语言在本地读取浏览器 UI 语言，不调用语言识别服务，也不直接读取系统语言；手动语言偏好同样保存在本地。

词本包含选中的词、原句、视频/时点、笔记、释义和掌握状态。稳定条目 ID 与存储修订号用于协调更新，不是账户或跟踪标识。新增规范存储最多 4 MiB / 5000 条；旧有合法较大词本仍可读取、导出和缩减。读取失败或存储格式异常会停止写入，不用空词本替换旧数据。

JSON/CSV 导出、单条删除均由用户发起。JSON 恢复在本地读取文件，整批校验并要求明确合并确认；文件最多 16 MiB / 5000 条，合并后的规范词本还需满足存储限额。已有重复项保持不变，不上传备份，也不自动联网查词。

导出文件包含个人学习数据，请主动决定如何保存或分享。卸载扩展可能删除存储。下载预发布包不会改动当前安装；交付包排除用户浏览器数据、私人生词、私人 QA 和截图。

接口参考：[MediaWiki CORS](https://www.mediawiki.org/wiki/API:Cross-site_requests)、[解析接口](https://www.mediawiki.org/wiki/API:Parsing_wikitext)、[Wikimedia 条款](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)。词典许可细节见 [LICENSING.zh-CN.md](LICENSING.zh-CN.md)。
