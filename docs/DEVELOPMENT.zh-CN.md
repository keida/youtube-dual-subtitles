# 开发

extension 是纯 JavaScript，不需要构建或运行时依赖。Node.js 22+：

    npm test

隔离浏览器测试：

    npm install --ignore-scripts
    npx playwright-core install chromium
    npm run test:ui

可用 PLAYWRIGHT_CORE_PATH 指向已安装测试模块，TEST_BROWSER_PATH 指定测试浏览器。不要使用个人浏览器配置。测试使用合成页面、播放器和网络，内部截图不打包。

    node tests/dictionary-language-live.cjs

可选真实词典测试仅匿名查询单个测试词，不代表真实扩展或 YouTube 验收，断网会如实记录。

service-worker 在点击后注入 MAIN 桥与隔离界面；字幕留在有上限的会话内存，主动收藏使用本地存储。词典缓存含原文/目标语言；测试夹具不在 extension 内。

验证后运行 node scripts/build-release.cjs，按白名单复制、检查私人路径和疑似凭据、产生源码/插件暂存树与校验和。ZIP 只压缩这些暂存树，不压缩整个工作目录。私人路由记录、QA、生词、截图、浏览器数据与元数据工具留在本地。

未配置或运行 GitHub Actions 矩阵。Linux、真实 Chrome/Edge、扩展隔离世界仍需单独验证。详见 VALIDATION.zh-CN.md 与 ROUTING.md。
