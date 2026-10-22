# 开发

扩展使用纯 JavaScript，不需要构建或运行时依赖。Node.js 22+ 可运行不启动浏览器的测试：

```sh
npm test
```

隔离浏览器测试需开发依赖和独立测试浏览器：

```sh
npm install --ignore-scripts
npx playwright-core install chromium
npm run test:ui
npm run test:candidate
```

`PLAYWRIGHT_CORE_PATH` 可指定已安装的 playwright-core，`TEST_BROWSER_PATH` 可指定测试浏览器。不要使用个人浏览器配置。夹具使用合成页面、播放器、存储和网络，不加载用户已安装扩展，也不代表真实 YouTube 验收。最终数量和 NOT RUN 项见 [VALIDATION.zh-CN.md](VALIDATION.zh-CN.md)。

可选的 `node tests/dictionary-language-live.cjs` 会匿名查询公开词典的单个测试词；应主动运行并如实记录网络失败，与已安装扩展验收分开。

## 架构

点击图标后，先向 MAIN 注入 request-url/native-loader/bridge，再向隔离世界注入 core/playback/dictionary/i18n/learning/content。没有新增自动内容脚本或永久域权限。

后台 service worker 持有词本仓库；消息接口只接收来自本扩展普通 YouTube watch 页的请求。每次操作重新读取存储，并串行读改写；页面提交字段变更，不再回写整份过时词本。读写失败返回错误，删除后迟到的词典更新不能复活条目。

字幕留在有上限的会话内存；各轨失败及导入独立处理，导航取消待完成任务。只按同视频、同轨和同目标原样复用观察到的完整原生请求，不生成或转移授权字段。

界面语言只影响标签，不翻译用户笔记、字幕或词典释义。查词依据点击字幕层的原文语言，缓存含单词及完整源/目标语言。每种词典语言独立超时保留部分成功；主动取消仍会取消整个查询。

JSON 恢复先校验和预览，确认后只合并新项；重复已有项保持不变，ID 冲突或无效条目整批拒绝。文件上限为 16 MiB，新增规范存储上限为 4 MiB / 5000 条。旧有合法较大词本仍可读取、导出和缩减。

## 本地打包

验证后运行：

```sh
npm run build:candidate
```

构建脚本按白名单复制源码与扩展（含语言目录），生成独立暂存树和文件校验和。只压缩这些暂存树，不压缩整个工作目录；浏览器配置、用户词本、私人 QA、个人路径与凭据不进入交付。打包不得顺带发布或替换安装。

0.5.0 实验预发布使用已验证候选代码，发布与本地打包是独立操作。不表示 CI、Linux 或真实 Chrome/Edge 验证已完成；准备发布文档时应保留已有测试记录与 NOT RUN 边界。
