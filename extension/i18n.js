(function (root) {
  'use strict';
  const strings = {
    '上下字幕 · 设置': 'Dual subtitles · Settings',
    '上下字幕设置': 'Dual subtitle settings',
    '关闭并恢复原生字幕': 'Close and restore native captions',
    '原文在下，中文在上': 'Source below, translation above',
    '原文在下，译文在上': 'Source below, translation above',
    '原文在上，译文在下': 'Source above, translation below',
    '正在读取字幕轨…': 'Reading caption tracks…',
    '正在读取 YouTube 可用字幕…': 'Reading available YouTube captions…',
    '原文字幕轨': 'Source caption track',
    '译文语言': 'Translation language',
    '界面语言': 'Interface language',
    '跟随浏览器': 'Follow browser',
    '简体中文': 'Simplified Chinese',
    '原译上下互换': 'Swap source and translation',
    '显示顶部字幕': 'Show top captions',
    '显示底部字幕': 'Show bottom captions',
    '只使用 YouTube 可用字幕或翻译；点击字幕单词可收藏。': 'Uses captions or translations available from YouTube. Click a word to save it.',
    '拖动字幕位置': 'Drag caption position',
    '拖动模式显示位置示例；关闭后恢复实际字幕。上下区域保持分离。': 'Drag mode shows position examples. Turn it off to restore captions. The two layers stay separate.',
    '逐句学习与字幕文件': 'Sentence practice and subtitle files',
    '原文偏移（秒）': 'Source offset (seconds)',
    '译文偏移（秒）': 'Translation offset (seconds)',
    '正值延后，负值提前。跳句与重播按原文时间定位。': 'Positive values delay captions; negative values advance them. Navigation and replay use source timing.',
    '每句结束暂停': 'Pause after each sentence',
    '上一句': 'Previous sentence', '单句重播': 'Replay sentence', '下一句': 'Next sentence',
    '可点击原文字幕列表': 'Clickable source sentence list',
    '上一页': 'Previous page', '下一页': 'Next page', '定位当前句': 'Current sentence',
    '导入原文': 'Import source', '导入译文': 'Import translation',
    '文件仅用于当前视频，不上传或自动翻译。': 'Imported files apply to this video only. They are not uploaded or automatically translated.',
    '文件仅用于当前视频，不上传或自动翻译；重新获取保留导入，切换视频会清除。': 'Imported files apply to this video only and are not uploaded or automatically translated. Retrying keeps them; changing videos clears them.',
    '已保留本地导入字幕；可用“清除导入字幕”恢复网络字幕。': 'Imported captions were kept. Use “Clear imported captions” to restore online captions.',
    '译文使用本地文件。': 'Translation uses the imported file.',
    '切换视频会清除导入。': 'Changing videos clears imported captions.',
    '导出对象': 'Export track', '导出格式': 'Export format', '原文': 'Source', '译文': 'Translation',
    '导出已有字幕（含偏移）': 'Export captions with offsets',
    '本地生词与复习': 'Vocabulary and review',
    '快捷键：Alt+←/→ 跳句，Alt+R 重播，Alt+S 设置，Alt+X 关闭。输入框内不触发。': 'Shortcuts: Alt+←/→ navigate, Alt+R replay, Alt+S settings, Alt+X close. Disabled while typing.',
    '重新获取': 'Retry captions', '恢复默认布局': 'Reset layout',
    '设置仅存本浏览器；只有主动收藏才保存原句。': 'Settings stay in this browser. Sentences are saved only when you add vocabulary.',
    '顶部 · 独立样式': 'Top · Appearance', '底部 · 独立样式': 'Bottom · Appearance',
    '水平位置': 'Horizontal position', '垂直位置': 'Vertical position', '字号': 'Font size',
    '背景不透明度': 'Background opacity', '背景颜色': 'Background color',
    '顶部简体中文字幕': 'Top translated captions', '顶部原文字幕': 'Top source captions', '顶部译文字幕': 'Top translated captions',
    '底部原文字幕': 'Bottom source captions', '底部译文字幕': 'Bottom translated captions',
    '顶部 · 字幕位置示例': 'Top · Caption position preview', '底部 · 字幕位置示例': 'Bottom · Caption position preview',
    '布局已保存到此浏览器。': 'Settings saved in this browser.',
    '设置保存失败；本次调整仍有效。': 'Could not save settings. Current adjustments still apply.',
    '读取设置失败，使用默认布局。': 'Could not read settings. Using the default layout.',
    '字幕获取超时，请重新获取或使用原生字幕。': 'Caption request timed out. Retry or use native captions.',
    '字幕请求已取消。': 'Caption request cancelled.',
    '请打开 YouTube 普通视频页面。': 'Open a regular YouTube watch page.',
    '字幕轨数据不受支持。保留原生字幕。': 'Unsupported caption track data. Native captions remain available.',
    '已启用：原文 / YouTube 自动翻译（可能不准确）。': 'Enabled: source / YouTube automatic translation (may be inaccurate).',
    '未返回可用原文字幕。': 'No usable source captions were returned.',
    'YouTube 未返回可用译文字幕。': 'YouTube returned no usable translated captions.',
    '没有可定位的原文句。': 'No source sentence is available to navigate to.',
    '无法自动播放，请点击播放器播放。': 'Could not start playback. Click the player to play.',
    '请点击播放器播放。': 'Click the player to play.',
    '请选择不超过 8 MiB 的 SRT 或 VTT 文件。': 'Choose an SRT or VTT file no larger than 8 MiB.',
    '此视频没有可用字幕轨。保留原生字幕。': 'No captions are available for this video. Native captions remain available.',
    '字幕格式不支持或数据过大。': 'Unsupported caption format or excessive data size.',
    '字幕为空或数据过大。': 'Captions are empty or too large.',
    '字幕格式不支持或数据损坏。': 'Unsupported or damaged caption data.',
    '字幕格式不支持。': 'Unsupported caption format.',
    '未返回可用字幕。': 'No usable captions were returned.',
    '字幕时间格式无效。': 'Invalid subtitle timestamp.',
    'VTT 文件缺少 WEBVTT 标头。': 'The VTT file is missing its WEBVTT header.',
    '字幕时间行无效。': 'Invalid subtitle timing line.',
    '字幕结束时间必须晚于开始时间。': 'Subtitle end time must be after its start time.',
    '字幕条数过多。': 'Too many subtitle cues.',
    '文件没有可用字幕句。': 'The file contains no usable subtitle cues.',
    '没有可导出的字幕。': 'No captions are available to export.',
    '播放器字幕数据尚未就绪，请稍后重试。': 'Player caption data is not ready. Retry shortly.',
    '此视频当前不可访问；请使用 YouTube 正常播放。': 'This video is currently unavailable. Use normal YouTube playback.',
    'MVP 暂不支持直播字幕，请使用原生字幕。': 'Live captions are not supported. Use native captions.',
    '字幕轨不可用。': 'This caption track is unavailable.',
    'YouTube 未提供此字幕轨的目标语言翻译。': 'YouTube does not offer this track in the selected target language.',
    '字幕地址不受支持，未发送请求。': 'Unsupported caption URL. No request was sent.',
    '字幕轨与当前视频不一致。': 'The caption track does not belong to the current video.',
    '字幕数据过大，MVP 暂不支持。': 'Caption data exceeds the supported size.',
    '字幕响应不可读取。': 'The caption response could not be read.',
    'YouTube 未返回翻译字幕。': 'YouTube returned no translated captions.',
    'YouTube 未返回字幕内容。': 'YouTube returned no caption content.',
    '未取得新的原生字幕地址，请正常选择 CC 后重试。': 'No fresh native caption URL was obtained. Select a normal CC track and retry.',
    '字幕请求超时或已取消，请重试。': 'The caption request timed out or was cancelled. Retry.',
    '字幕获取被网络或页面策略阻止，请使用原生字幕。': 'Network or page policy blocked captions. Use native captions.',
    '本地单词学习': 'Local vocabulary learning', '关闭': 'Close',
    '点英文词时仅向维基词典查询该词，不发送字幕、视频或生词本。': 'Clicking an English word queries only that word on Wiktionary. Captions, videos and vocabulary are not sent.',
    '复习下一个未掌握词': 'Review next unmastered word', '本地生词本': 'Local vocabulary',
    '点英文词时仅向维基词典查询该词，不发送字幕、视频或生词本；中文释义优先。': 'Clicking an English word queries only that word on Wiktionary. Captions, videos and vocabulary are not sent.',
    '词典释义': 'Dictionary definitions',
    '我的笔记为手动内容，词典释义单独显示。': 'Your handwritten notes are kept separate from dictionary definitions.',
    '词条与贡献者': 'Entry and contributors', '维基词典条目 / 贡献者': 'Wiktionary entry / contributors',
    '查询 / 更新词典释义': 'Look up / refresh definitions', '我的释义或笔记': 'My definition or notes',
    '填写你自己的释义或笔记': 'Write your own definition or notes',
    '先回忆，再点击“显示我的释义”': 'Recall the meaning, then reveal your notes',
    '先回忆，再点击“显示释义与笔记”': 'Recall the meaning, then reveal definitions and notes',
    '收藏 / 保存笔记': 'Save word / notes', '标记已掌握': 'Mark mastered', '标记未掌握': 'Mark unmastered',
    '显示释义与笔记': 'Reveal definitions and notes', '在当前视频重听': 'Replay in this video',
    '打开原视频时间点': 'Open original video timestamp', '全部收藏（最多显示 100 条）': 'Vocabulary (latest 100 entries)',
    '导出 JSON': 'Export JSON', '导出 CSV': 'Export CSV',
    '读取本地收藏失败。': 'Could not read local vocabulary.',
    '此时间点没有原文句。': 'No source sentence at this timestamp.',
    '先回忆，再揭示中英文释义与笔记。': 'Recall the meaning, then reveal definitions and notes.',
    '中文释义': 'Chinese definitions', '英文释义': 'English definitions', '英文解释（原文）': 'English source explanation',
    '查词仅发送单词；不会自动查询词本。': 'Only the selected word is sent. Opening vocabulary does not query the dictionary.',
    '正在查询中文释义与英文解释…': 'Looking up definitions…',
    '词典查询超时或已取消，没有替代释义。': 'Lookup timed out or was cancelled. No substitute definition was generated.',
    '保存收藏失败，尚未写入本地存储。': 'Vocabulary could not be saved to local storage.',
    '本地收藏已达 5000 条上限，请先导出备份。': 'Vocabulary has reached the 5,000-entry limit. Export a backup first.',
    '此词来自另一个视频，请点击“打开原视频时间点”。': 'This word belongs to another video. Use “Open original video timestamp”.',
    '暂无未掌握收藏。': 'No unmastered words to review.',
    '收藏单词及原句': 'Save word and sentence',
    '当前在线词典仅查询英文单词；其他词语可填写笔记。': 'The online dictionary supports English words only. You can write notes for other words.',
    '词典请求失败：网络或跨域访问不可用。没有生成替代释义。': 'Dictionary request failed due to a network or access error. No substitute definition was generated.',
    '词典服务暂时限流，请稍后再试。': 'The dictionary is rate limited. Try again later.',
    '词条响应过大，请查看原词条。': 'The dictionary response is too large. View the original entry.',
    '词典响应格式无效。': 'Invalid dictionary response format.',
    '词典暂时无法提供此词条。': 'The dictionary cannot provide this entry right now.',
    '维基词典暂无可读取释义；可查看原词条或填写自己的笔记。': 'No readable Wiktionary definition is available. View the original entry or write your own notes.',
    '词条重定向至不同单词，未作为本词释义；请查看原站确认。': 'The entry redirects to a different word and was not used. Check the original site.',
    '词条重定向至不同单词，未作为本词释义。': 'The entry redirects to a different word and was not used.',
    '未找到可读取的中文释义。': 'No readable Chinese definition was found.',
    '未找到可读取的英文解释。': 'No readable English explanation was found.',
    '中英文来自同一英文词的独立词条，词义顺序不一定一一对应；未机器翻译。': 'Chinese and English entries describe the same English word independently. Meaning order may differ; no machine translation is used.',
    '词性信息不足，未逐义配对。': 'Not enough part-of-speech information to align individual meanings.',
    '两个条目的词性不同，不按对应词义排列。': 'The entries have different parts of speech; meanings are not paired.',
    '当前原文语言没有受支持的词典解释。': 'Dictionary explanations are not available for the source language.',
    '英文释义同时作为英文原文解释，不生成额外翻译。': 'The English definition also serves as the source explanation. No extra translation is generated.',
    '仅保留英文原文解释；目标语言词典暂不支持。': 'Only the English source explanation is available; the target dictionary language is unsupported.',
    '尚无中文释义，请主动查询。': 'No Chinese definition yet. Use lookup to request one.',
    '尚无英文解释，请主动查询。': 'No English explanation yet. Use lookup to request one.',
    '旧收藏尚无中文释义，请主动更新。': 'This older entry has no Chinese definition. Refresh it explicitly.',
    '旧收藏尚无英文解释，请主动更新。': 'This older entry has no English explanation. Refresh it explicitly.',
    '暂不支持': 'Unsupported',
    '字幕全文': 'Full captions', '查看字幕全文': 'View full captions', '关闭全文': 'Close full captions',
    '完整字幕': 'Full captions', '查看完整字幕': 'View full captions', '关闭完整字幕': 'Close full captions',
    '清除导入字幕': 'Clear imported captions', '清除导入': 'Clear imports',
    '复制中文释义': 'Copy Chinese definitions', '复制英文解释': 'Copy English explanation', '复制释义': 'Copy definitions',
    '搜索生词': 'Search vocabulary', '搜索单词、笔记或原句': 'Search word, note or sentence',
    '全部收藏': 'All vocabulary', '全部': 'All', '未掌握': 'Unmastered', '已掌握': 'Mastered',
    '删除此收藏': 'Delete this entry', '确认删除': 'Confirm deletion', '取消删除': 'Cancel deletion',
    '重新读取': 'Reload vocabulary', '重试读取': 'Retry reading',
    '导入 JSON 备份': 'Import JSON backup', '选择 JSON 备份': 'Choose JSON backup',
    '预览备份': 'Preview backup', '合并恢复': 'Merge backup', '取消恢复': 'Cancel restore',
    '导出当前备份': 'Export current backup', '安全恢复备份': 'Restore backup safely',
    '重试读取词本': 'Retry vocabulary loading', '确认删除此条': 'Confirm deletion',
    '确认删除收藏：': 'Confirm deletion of saved entry:', '视频时间点：': 'Video timestamp:',
    '此操作将删除该条收藏及笔记。': 'This will delete the saved entry and its notes.',
    '搜索单词、原句或笔记': 'Search word, sentence or note', '刷新词本': 'Refresh vocabulary',
    '导出 JSON 备份': 'Export JSON backup', '从 JSON 备份恢复': 'Restore from JSON backup',
    '请先导出当前备份。恢复只合并新收藏，不替换词本，不覆盖已有重复条目。最多 4 MiB、5000 条。': 'Export a current backup first. Restore merges new entries and keeps existing entries unchanged. Maximum: 4 MiB and 5,000 entries.',
    '请先导出当前备份。恢复只合并新收藏，不替换词本，不覆盖已有重复条目。JSON 文件最多 16 MiB、5000 条；合并后的词本容量上限为 4 MiB。': 'Export a current backup first. Restore merges new entries and keeps existing entries unchanged. Maximum JSON file: 16 MiB and 5,000 entries. Merged vocabulary must fit within 4 MiB.',
    '先导出当前备份': 'Export current backup first',
    '备份中有格式无效或过长的收藏，未导入任何条目。': 'The backup contains invalid or excessively long entries. Nothing was imported.',
    '备份中有无效的词典来源，未导入任何条目。': 'The backup contains an invalid dictionary source. Nothing was imported.',
    '无法连接词本服务，请重试。': 'Could not connect to vocabulary storage. Retry.',
    '词本服务返回了无效数据，请重试读取。': 'Vocabulary storage returned invalid data. Retry loading.',
    '词本已刷新。未保存的笔记保持不变。': 'Vocabulary refreshed. Unsaved notes remain unchanged.',
    '读取本地收藏失败。请重试读取，成功前不能保存或恢复。': 'Could not load local vocabulary. Retry loading before saving or restoring.',
    '读取本地收藏失败。请先重试读取。': 'Could not load local vocabulary. Retry loading first.',
    '已复制释义、来源和许可。': 'Copied definitions, sources and licenses.',
    '复制失败。请手动选择释义、来源和许可后复制。': 'Copy failed. Select the definitions, sources and licenses and copy them manually.',
    '先回忆，再揭示释义与笔记。': 'Recall the meaning, then reveal definitions and notes.',
    '正在查询词典释义…': 'Looking up dictionary definitions…', '词典查询已取消。': 'Dictionary lookup cancelled.',
    '没有需要保存的更改。': 'No changes to save.',
    '请选择不超过 4 MiB 的 JSON 备份。': 'Choose a JSON backup no larger than 4 MiB.',
    '请选择不超过 16 MiB 的 JSON 备份。': 'Choose a JSON backup no larger than 16 MiB.',
    '正在合并恢复，请等待结果。': 'Merging the backup. Please wait for the result.',
    '恢复未确认完成。请刷新词本查看状态后重试。': 'Restore completion is unconfirmed. Refresh vocabulary to check its state before retrying.',
    '仅支持版本 1–5、最多 5000 条收藏的备份。': 'Supported backups: versions 1–5, with at most 5,000 entries.',
    '预览已就绪。恢复前可先导出当前备份。': 'Preview ready. You can export the current backup before restoring.',
    'JSON 格式无效，未导入任何条目。': 'Invalid JSON. Nothing was imported.',
    '已删除所选收藏。': 'Selected entry deleted.', '已取消恢复，词本未改变。': 'Restore cancelled. Vocabulary is unchanged.',
    '词本可能已在其他页面更新。点击刷新词本；未保存笔记不会被替换。': 'Vocabulary may have changed in another tab. Refresh vocabulary; unsaved notes will stay unchanged.',
    '收藏请求无效，未修改本地数据。': 'Invalid vocabulary request. Local data is unchanged.',
    '收藏或备份包含无效条目，未修改本地数据。': 'Vocabulary or backup contains invalid entries. Local data is unchanged.',
    '词典来源或释义格式无效，未修改本地数据。': 'Invalid dictionary source or definition format. Local data is unchanged.',
    '收藏标识与已有条目不一致，未修改本地数据。': 'The entry ID does not match the saved entry. Local data is unchanged.',
    '此收藏已不存在，请刷新词本后重试。': 'This entry no longer exists. Refresh vocabulary and retry.',
    '本地收藏最多 5000 条，请先导出备份并删除不需要的条目。': 'The limit is 5,000 entries. Export a backup, then delete unwanted entries.',
    '收藏超过 4 MiB 容量上限，未修改本地数据。': 'Vocabulary exceeds the 4 MiB limit. Local data is unchanged.',
    '读取本地收藏失败，请重试；未保存任何更改。': 'Could not load local vocabulary. Retry; no changes were saved.',
    '保存收藏失败，尚未确认更改已写入本地存储。请重试。': 'Could not confirm that vocabulary changes were saved. Retry.',
    '本地收藏数据格式异常，已停止写入以保护原有数据。': 'Local vocabulary has an unexpected format. Writes are stopped to protect existing data.',
    '此语言词典查询超时，已保留其他可用释义。': 'This dictionary language timed out. Other available definitions were retained.',
    '请先打开 www.youtube.com/watch 视频页面': 'Open a www.youtube.com/watch video first',
    '关闭上下字幕（也可在播放器内关闭）': 'Close dual subtitles (also available inside the player)',
    '无法启用，请刷新可访问的 YouTube 视频页面后重试': 'Could not enable subtitles. Refresh an accessible YouTube video and retry'
  };
  const patterns = [
    [/^版本 ([\d.]+) · (?:语言联动预览版|本地候选版|候选版)$/, (_, v) => `Version ${v} · Local candidate`],
    [/^(顶部|底部)(水平位置|垂直位置|字号|背景不透明度|背景颜色)$/, (_, side, label) => `${side === '顶部' ? 'Top' : 'Bottom'} ${strings[label].toLowerCase()}`],
    [/^(水平位置|垂直位置|字号|背景不透明度) ([-\d.]+)(%|px)$/, (_, label, value, unit) => `${strings[label]} ${value}${unit}`],
    [/^原视频时间点：(.+?) · (\d+) 条收藏$/, (_, time, n) => `Original video timestamp: ${time} · ${n} saved entries`],
    [/^已保存到本浏览器 · (\d+) 条收藏$/, (_, n) => `Saved in this browser · ${n} entries`],
    [/^(\d+) 条本地收藏；点击字幕单词开始。$/, (_, n) => `${n} saved entries. Click a caption word to begin.`],
    [/^(\d+) 条本地收藏。$/, (_, n) => `${n} saved entries.`],
    [/^共 (\d+) 条 · 第 (\d+) \/ (\d+) 页 · 每页 (\d+) 条$/, (_, n, page, pages, size) => `${n} entries · Page ${page} / ${pages} · ${size} per page`],
    [/^已校验 (\d+) 条收藏。已有重复条目会保留原内容。点击“合并恢复”后才写入。$/, (_, n) => `${n} entries validated. Existing duplicates keep their content. Nothing is written until you click “Merge backup”.`],
    [/^合并恢复完成 · 现有 (\d+) 条收藏；已有重复条目保持原内容。$/, (_, n) => `Backup merged · ${n} entries now saved. Existing duplicates are unchanged.`],
    [/^删除“([\s\S]*)”在 (.+?) 的这条收藏及笔记？$/, (_, word, time) => `Delete this saved entry and notes for “${word}” at ${time}?`],
    [/^保存收藏失败：([\s\S]*)$/, (_, message) => `Could not save vocabulary: ${translate(message)}`],
    [/^目标语言释义（(.+?)）$/, (_, name) => `Target definitions (${name})`],
    [/^原文解释（(.+?)）$/, (_, name) => `Source explanation (${name})`],
    [/^尚无(.+?)，请主动查询。$/, (_, label) => `No ${translate(label).toLowerCase()} yet. Use lookup to request it.`],
    [/字幕目标 (.+?) 的词典释义暂不支持；目前仅提供中文和英文。/g, (_, code) => `Dictionary definitions for target ${code} are unavailable. Chinese and English are supported.`],
    [/原文语言 (.+?) 暂不支持查词；目前仅解析英文词条，不把其他语言同形词当作英文。/g, (_, code) => `Lookup is unavailable for source language ${code}. Only English entries are supported; other-language homographs are not treated as English.`],
    [/字幕获取失败（HTTP (\d+)）。请使用原生字幕。/g, (_, code) => `Caption request failed (HTTP ${code}). Use native captions.`],
    [/词典请求失败（HTTP (\d+)）。/g, (_, code) => `Dictionary request failed (HTTP ${code}).`],
    [/^原文已是(.+?)；上下显示相同原文，无需翻译。(.*)$/, (_, name, tail) => `The source is already ${name}; both layers show it without translation.${translate(tail)}`],
    [/^已启用：原文 \/ 视频已有(.+?)字幕。(.*)$/, (_, name, tail) => `Enabled: source / existing ${name} video captions.${translate(tail)}`],
    [/YouTube 未提供可用的(.+?)翻译。/g, (_, name) => `YouTube does not offer an available ${name} translation.`],
    [/正在独立获取(.+?)字幕…/g, (_, name) => `Loading ${name} captions independently…`],
    [/请在原生 CC 选择“(.+?)”一次；/g, (_, name) => `Select “${name}” once in native CC; `],
    [/^已导入(原文|译文)：(.+?)（用户文件，语言和翻译内容未验证）。(.*)$/, (_, track, file, tail) => `Imported ${track === '原文' ? 'source' : 'translation'}: ${file} (user file; language and translation content unverified). ${translate(tail)}`],
    [/^界面：简体中文 · 字幕目标：(.+?) · 释义主语言：(.+?)。 (.*)$/, (_, target, primary, tail) => `Interface: English · Caption target: ${translate(target)} · Definition language: ${translate(primary)}. ${translate(tail)}`],
    [/^字幕目标：(.+?) · 释义主语言：(.+?)。 (.*)$/, (_, target, primary, tail) => `Caption target: ${target} · Definition language: ${translate(primary)}. ${translate(tail)}`],
    [/共同词性：(.+?)。/g, (_, names) => `Shared parts of speech: ${names.split('、').map(n => ({名词:'noun',动词:'verb',形容词:'adjective',副词:'adverb',代词:'pronoun',介词:'preposition',连词:'conjunction',感叹词:'interjection',专有名词:'proper noun'})[n] || n).join(', ')}.`],
    [/（自动生成）/g, ' (auto-generated)'], [/（此视频未提供）/g, ' (not offered for this video)'], [/（本次会话缓存）/g, ' (session cache)'],
    [/原文获取失败：/g, 'Source request failed: '], [/译文获取失败：/g, 'Translation request failed: '],
    [/原文层保持空白；/g, 'Source layer remains blank; '], [/译文层保持空白。/g, 'Translation layer remains blank. '],
    [/原文可用；/g, 'Source available; '], [/原文未获取；/g, 'Source unavailable; '], [/原文已就绪；/g, 'Source ready; '],
    [/译文可用；原生字幕仍可见。/g, 'Translation available; native captions remain visible.'],
    [/正常加载后将自动恢复。/g, 'recovery follows normal caption loading.'],
    [/自动恢复已达本次上限，加载后请点“重新获取”。/g, 'automatic recovery reached its limit. After CC loads, click “Retry captions”.'],
    [/切换视频或重新获取会清除导入。/g, 'Changing videos or retrying clears imported captions.'],
    [/本次未取到新释义，保留此前收藏：/g, 'No new definition this time; retaining the saved entry: ']
  ];
  const fragments = Object.entries(strings).filter(([key]) => key.length >= 9).sort((a, b) => b[0].length - a[0].length);
  const roots = new Set();
  let preference = 'auto';
  function resolveLanguage(value = 'auto', browserLanguage) {
    if (value === 'en' || value === 'zh-CN') return value;
    if (typeof browserLanguage !== 'string' || !browserLanguage) return 'zh-CN';
    return /^zh/i.test(browserLanguage) ? 'zh-CN' : 'en';
  }
  function getLanguage() {
    let language;
    try { language = root.chrome?.i18n?.getUILanguage?.(); } catch { /* Safe fallback when unavailable. */ }
    return resolveLanguage(preference, language);
  }
  function translate(text) {
    if (Object.hasOwn(strings, text)) return strings[text];
    // Full templates preserve captured filenames, words and language names verbatim.
    for (const [pattern, replacement] of patterns) {
      if (pattern.source.startsWith('^') && pattern.source.endsWith('$') && pattern.test(text)) return text.replace(pattern, replacement);
    }
    let result = text;
    for (const [pattern, replacement] of patterns) result = result.replace(pattern, replacement);
    for (const [source, replacement] of fragments) result = result.split(source).join(replacement);
    return result;
  }
  function t(text) { return typeof text === 'string' && getLanguage() === 'en' ? translate(text) : text; }
  function protectedText(element) {
    if (!element) return true;
    if (element.closest('style,script,textarea,input,[data-user-content],[data-i18n="off"],#sentences,#vocabulary')) return true;
    if (element.closest('#word-context,#word-title,#definition,#caption-full-text,#full-caption-text')) return !element.hasAttribute('data-i18n-ui');
    const caption = element.closest('#top,#bottom,.caption');
    if (caption) return !caption.classList.contains('editing');
    const meaning = element.closest('#meanings p');
    if (meaning) return !meaning.hasAttribute('data-i18n-ui') && !meaning.hasAttribute('data-missing');
    return false;
  }
  function observe(shadow) {
    if (!shadow || !root.MutationObserver) return () => {};
    const textSources = new WeakMap(), attributeSources = new WeakMap();
    let stopped = false;
    const attributeNames = ['aria-label', 'title', 'placeholder'];
    function textNode(node) {
      if (protectedText(node.parentElement)) return;
      const current = node.nodeValue;
      const previous = textSources.get(node);
      let source = previous && current === previous.rendered ? previous.source : current;
      // The animation loop may provide an already-localized position preview.
      // Only these two generated previews can be restored from English directly.
      if (node.parentElement.closest('#top.editing,#bottom.editing,.caption.editing')) {
        if (source === 'Top · Caption position preview') source = '顶部 · 字幕位置示例';
        if (source === 'Bottom · Caption position preview') source = '底部 · 字幕位置示例';
      }
      const leading = source.match(/^\s*/)[0], trailing = source.match(/\s*$/)[0];
      const body = source.trim();
      const rendered = body ? leading + t(body) + trailing : source;
      textSources.set(node, { source, rendered });
      if (current !== rendered) node.nodeValue = rendered;
    }
    function attributes(element) {
      // User content remains untouched; only known framework attributes are translated.
      if (element.closest('style,script,[data-i18n="off"]') || (element.closest('[data-user-content]') && !element.matches('textarea#definition'))) return;
      let records = attributeSources.get(element);
      if (!records) { records = {}; attributeSources.set(element, records); }
      for (const name of attributeNames) {
        if (!element.hasAttribute(name)) continue;
        const current = element.getAttribute(name), previous = records[name];
        const source = previous && current === previous.rendered ? previous.source : current;
        const rendered = t(source);
        records[name] = { source, rendered };
        if (current !== rendered) element.setAttribute(name, rendered);
      }
    }
    function walk(node) {
      if (!node || stopped) return;
      if (node.nodeType === 3) { textNode(node); return; }
      if (node.nodeType === 1) {
        attributes(node);
        if (node.matches('style,script,textarea,input,[data-user-content],[data-i18n="off"],#sentences,#vocabulary')) return;
      }
      for (const child of node.childNodes || []) walk(child);
    }
    const entry = { refresh() { walk(shadow); } };
    const observer = new root.MutationObserver(records => {
      if (stopped) return;
      for (const record of records) {
        if (record.type === 'characterData') textNode(record.target);
        else if (record.type === 'attributes') attributes(record.target);
        else for (const node of record.addedNodes) walk(node);
      }
    });
    observer.observe(shadow, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attributeNames });
    roots.add(entry); entry.refresh();
    return () => { stopped = true; observer.disconnect(); roots.delete(entry); };
  }
  function setPreference(value) {
    preference = ['auto', 'en', 'zh-CN'].includes(value) ? value : 'auto';
    for (const entry of roots) entry.refresh();
    return getLanguage();
  }
  const api = { setPreference, observe, t, getLanguage, resolveLanguage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YTDSI18n = api;
})(globalThis);
