# 隐私

权限只有 activeTab、scripting、storage；没有持久域权限、自动内容脚本、遥测、远程代码、收费 API、账户系统或词本云同步。点击图标启用当前 YouTube 普通视频页。

字幕仅向当前视频的同源 YouTube timedtext 请求；只完整复用匹配视频、轨和目标语言的原生成功请求，不生成、转移、记录或持久保存授权参数，不绕过登录或 DRM。字幕全文只在会话中；本地 SRT/VTT 不上传，导航清空。

仅点击受支持英文词或主动更新时查询公开 zh.wiktionary.org / en.wiktionary.org。中文目标查两站；英文或不支持的目标只查受支持的英文原文解释。不支持的原文语言不发送词典请求。打开词本、复习和切换语言均不自动联网。

GET 字段：action=parse、page=单个被点击的小写英文词（最多 64 字符，字母/撇号/连字符）、prop=wikitext、format=json、formatversion=2、redirects=1、origin=*。credentials=omit、referrerPolicy=no-referrer、redirect=error。不发送字幕原句、视频 ID/标题、时点、笔记、浏览历史或词本；服务方仍可看到 IP 等普通网络信息。

仅解析英语语言区块，重定向到不同词目则拒绝。释义不机器翻译、不保证逐义对应；来源、CC BY-SA 4.0 与清理标记说明保留在界面和导出中。更新失败保留旧释义并明确提示。

布局、偏好、主动收藏存在当前浏览器本地。收藏包含词、原句、视频/时点、笔记、释义与掌握状态，最多 5000 条。导出由用户发起；卸载可能删除存储。公开发行排除用户浏览器数据、私人生词、QA 和截图。

官方依据：[匿名 CORS](https://www.mediawiki.org/wiki/API:Cross-site_requests)、[解析接口](https://www.mediawiki.org/wiki/API:Parsing_wikitext)、[Wikimedia 条款](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)。
