const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const I=require('../extension/i18n.js');
function playwright(){try{return require('playwright-core')}catch(error){if(!process.env.PLAYWRIGHT_CORE_PATH)throw error;return require(process.env.PLAYWRIGHT_CORE_PATH)}}
test('interface preference honors manual override and browser language with deterministic fallback',()=>{
  assert.equal(I.resolveLanguage('en','zh-CN'),'en');assert.equal(I.resolveLanguage('zh-CN','en-US'),'zh-CN');
  for(const language of ['zh','zh-TW','zh-Hans','zh_HK'])assert.equal(I.resolveLanguage('auto',language),'zh-CN');
  for(const language of ['en-US','de','ja','fr'])assert.equal(I.resolveLanguage('auto',language),'en');
  assert.equal(I.resolveLanguage('auto',undefined),'zh-CN');
  global.chrome={i18n:{getUILanguage:()=> 'en-GB'}};I.setPreference('auto');assert.equal(I.getLanguage(),'en');
  I.setPreference('zh-CN');assert.equal(I.t('上一句'),'上一句');
  I.setPreference('en');assert.equal(I.t('上一句'),'Previous sentence');
  global.chrome.i18n.getUILanguage=()=>{throw new Error('Unavailable')};I.setPreference('auto');assert.equal(I.getLanguage(),'zh-CN');
  delete global.chrome;I.setPreference('auto');assert.equal(I.getLanguage(),'zh-CN');
});
test('UI translations preserve dynamic values and do not invent translations for unknown text',()=>{
  I.setPreference('en');
  assert.equal(I.t('已保存到本浏览器 · 123 条收藏'),'Saved in this browser · 123 entries');
  assert.equal(I.t('原视频时间点：00:00:05.500 · 10 条收藏'),'Original video timestamp: 00:00:05.500 · 10 saved entries');
  assert.equal(I.t('原文已是French；上下显示相同原文，无需翻译。'),'The source is already French; both layers show it without translation.');
  assert.equal(I.t('https://example.test/词典?user=1'),'https://example.test/词典?user=1');
  assert.equal(I.t('A user sentence not in the UI dictionary.'),'A user sentence not in the UI dictionary.');
  assert.equal(I.t('已导入译文：正在读取字幕轨….srt（用户文件，语言和翻译内容未验证）。切换视频会清除导入。'),'Imported translation: 正在读取字幕轨….srt (user file; language and translation content unverified). Changing videos clears imported captions.');
  assert.equal(I.t('删除“正在读取字幕轨…”在 00:01:02.300 的这条收藏及笔记？'),'Delete this saved entry and notes for “正在读取字幕轨…” at 00:01:02.300?');
  assert.equal(I.t('共 123 条 · 第 2 / 4 页 · 每页 40 条'),'123 entries · Page 2 / 4 · 40 per page');
  assert.match(I.t('已校验 100 条收藏。已有重复条目会保留原内容。点击“合并恢复”后才写入。'),/^100 entries validated/);
  assert.match(I.t('保存收藏失败：此收藏已不存在，请刷新词本后重试。'),/^Could not save vocabulary: This entry no longer exists/);
  assert.match(I.t('此语言词典查询超时，已保留其他可用释义。'),/timed out/);
  I.setPreference('zh-CN');
});
test('manifest locale catalogs have the same keys and valid bounded metadata',()=>{
  const en=JSON.parse(fs.readFileSync(path.join(__dirname,'../extension/_locales/en/messages.json'),'utf8'));
  const zh=JSON.parse(fs.readFileSync(path.join(__dirname,'../extension/_locales/zh_CN/messages.json'),'utf8'));
  assert.deepEqual(Object.keys(en).sort(),Object.keys(zh).sort());
  for(const locale of [en,zh]){assert.ok(locale.extName.message.length<=75);assert.ok(locale.description.message.length<=132);assert.ok(locale.actionTitle.message.length>0);}
});
test('DOM language switching translates controls and new status without modifying captions, notes or dictionary meanings',async()=>{
  const pw=playwright();
  const browser=await pw.chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER_PATH||undefined});
  try{
    const page=await browser.newPage();await page.route('**/*',r=>r.abort());
    await page.setContent('<div id="host"></div>');
    await page.evaluate(()=>{window.chrome={i18n:{getUILanguage:()=> 'en-US'}};const s=document.querySelector('#host').attachShadow({mode:'open'});s.innerHTML=`<section id="panel"><button id="previous" title="收藏单词及原句">上一句</button><p id="status">正在读取字幕轨…</p><label>界面语言<select id="uiLanguage"><option value="auto">跟随浏览器</option><option value="zh-CN">简体中文</option><option value="en">English</option></select></label></section><div id="top" class="caption">上一句</div><div id="bottom" class="caption editing">底部 · 字幕位置示例</div><div id="sentences"><button>上一句</button></div><section id="word-panel"><h2 id="word-title">上一句</h2><p id="word-context">下一句</p><textarea id="definition" data-user-content placeholder="填写你自己的释义或笔记">原文</textarea><div id="meanings"><section><h3>中文释义</h3><p>上一句</p><p data-missing="en">尚无英文解释，请主动查询。</p><p data-i18n-ui>此语言词典查询超时，已保留其他可用释义。</p></section></div><div id="vocabulary"><button>上一句</button></div><div id="full-caption-text">下一句</div><p id="word-state">已保存到本浏览器 · 12 条收藏</p></section>`;});
    await page.addScriptTag({path:path.join(__dirname,'../extension/i18n.js')});
    await page.evaluate(()=>{window.cleanupI18n=YTDSI18n.observe(document.querySelector('#host').shadowRoot);YTDSI18n.setPreference('auto')});
    const read=()=>page.evaluate(()=>{const s=document.querySelector('#host').shadowRoot;return {button:s.querySelector('#previous').textContent,title:s.querySelector('#previous').title,status:s.querySelector('#status').textContent,caption:s.querySelector('#top').textContent,preview:s.querySelector('#bottom').textContent,sentence:s.querySelector('#sentences').textContent,word:s.querySelector('#word-title').textContent,context:s.querySelector('#word-context').textContent,note:s.querySelector('#definition').value,placeholder:s.querySelector('#definition').placeholder,meaning:s.querySelector('#meanings p').textContent,missing:s.querySelector('[data-missing]').textContent,warning:s.querySelector('[data-i18n-ui]').textContent,vocabulary:s.querySelector('#vocabulary').textContent,full:s.querySelector('#full-caption-text').textContent,state:s.querySelector('#word-state').textContent}});
    let actual=await read();assert.equal(actual.button,'Previous sentence');assert.equal(actual.title,'Save word and sentence');assert.equal(actual.placeholder,'Write your own definition or notes');assert.equal(actual.preview,'Bottom · Caption position preview');
    for(const key of ['caption','sentence','word','meaning','vocabulary'])assert.equal(actual[key],'上一句');
    assert.equal(actual.context,'下一句');assert.equal(actual.full,'下一句');assert.equal(actual.note,'原文');assert.match(actual.missing,/No English explanation/);assert.match(actual.warning,/timed out/);
    await page.evaluate(()=>document.querySelector('#host').shadowRoot.querySelector('#word-state').textContent='已保存到本浏览器 · 19 条收藏');
    await page.waitForFunction(()=>document.querySelector('#host').shadowRoot.querySelector('#word-state').textContent==='Saved in this browser · 19 entries');
    await page.evaluate(()=>document.querySelector('#host').shadowRoot.querySelector('#bottom').textContent=YTDSI18n.t('底部 · 字幕位置示例'));
    await page.evaluate(()=>YTDSI18n.setPreference('zh-CN'));actual=await read();assert.equal(actual.button,'上一句');assert.equal(actual.state,'已保存到本浏览器 · 19 条收藏');assert.equal(actual.placeholder,'填写你自己的释义或笔记');assert.equal(actual.preview,'底部 · 字幕位置示例');
    await page.evaluate(()=>YTDSI18n.setPreference('en'));actual=await read();assert.equal(actual.button,'Previous sentence');assert.equal(actual.state,'Saved in this browser · 19 entries');
    await page.evaluate(()=>{cleanupI18n();document.querySelector('#host').shadowRoot.querySelector('#status').textContent='正在读取字幕轨…'});
    await page.waitForTimeout(20);actual=await read();assert.equal(actual.status,'正在读取字幕轨…');
  }finally{await browser.close()}
});
test('current settings and vocabulary panel templates have complete English framework labels',async()=>{
  const content=fs.readFileSync(path.join(__dirname,'../extension/content.js'),'utf8');
  const learning=fs.readFileSync(path.join(__dirname,'../extension/learning.js'),'utf8');
  const settingsTemplate=content.match(/shadow\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
  const learningTemplate=learning.match(/panel\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
  assert.ok(settingsTemplate&&learningTemplate,'Both shipped UI templates are available');
  const browser=await playwright().chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER_PATH||undefined});
  try{
    const page=await browser.newPage();await page.route('**/*',r=>r.abort());await page.setContent('<div id="host"></div>');
    await page.evaluate(({settingsTemplate,learningTemplate})=>{
      const shadow=document.querySelector('#host').attachShadow({mode:'open'});shadow.innerHTML=settingsTemplate;
      const panel=document.createElement('section');panel.id='word-panel';panel.innerHTML=learningTemplate;shadow.append(panel);
    },{settingsTemplate,learningTemplate});
    await page.addScriptTag({path:path.join(__dirname,'../extension/i18n.js')});
    await page.evaluate(()=>{YTDSI18n.observe(document.querySelector('#host').shadowRoot);YTDSI18n.setPreference('en')});
    const untranslated=await page.evaluate(()=>{
      const shadow=document.querySelector('#host').shadowRoot,walker=document.createTreeWalker(shadow,NodeFilter.SHOW_TEXT),found=[];
      while(walker.nextNode()){const node=walker.currentNode;if(node.parentElement&&!node.parentElement.closest('style,[data-user-content]')&&/[\u4e00-\u9fff]/.test(node.nodeValue))found.push(node.nodeValue.trim());}
      for(const element of shadow.querySelectorAll('[aria-label],[title],[placeholder]'))for(const attr of ['aria-label','title','placeholder'])if(/[\u4e00-\u9fff]/.test(element.getAttribute(attr)||''))found.push(element.id+':'+element.getAttribute(attr));
      return found;
    });
    assert.deepEqual(untranslated,[]);
    assert.equal(await page.evaluate(()=>document.querySelector('#host').shadowRoot.querySelector('#word-title').textContent),'Local vocabulary');
  }finally{await browser.close()}
});
test('actual content and learning modules use persisted interface language without translating learning data', {timeout:30000}, async()=>{
  const browser=await playwright().chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER_PATH||undefined});
  try{
    const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];
    page.setDefaultTimeout(5000);page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
    await page.goto('https://www.youtube.com/watch?v=i18n-fixture');
    await page.evaluate(()=>{
      document.querySelector('h1').textContent='YouTube Dual Subtitles · 0.5.0 candidate';
      document.querySelector('main > p').textContent='Isolated test fixture: simulated captions, dictionary and browser storage; no YouTube connection.';
      document.querySelector('#native').textContent='Native caption fixture';document.querySelector('#fullscreen').textContent='Test player fullscreen';
      const F=window.i18nFixture={saved:{},uiLanguage:'en-US',dictionaryRequests:0};
      window.chrome={i18n:{getUILanguage:()=>F.uiLanguage},runtime:{id:'isolated-i18n',onMessage:{addListener(){},removeListener(){}}},storage:{local:{get:async()=>structuredClone(F.saved),set:async value=>Object.assign(F.saved,structuredClone(value))}}};
      const video=document.querySelector('video');Object.defineProperty(video,'currentTime',{get:()=>1,set(){}});video.pause=()=>{};video.play=async()=>{};
      window.addEventListener('message',event=>{
        const message=event.data;if(message?.channel!=='YTDS_V1'||message.direction!=='request'||!['metadata','captions'].includes(message.op))return;
        const result=message.op==='metadata'?{id:message.id,defaultIndex:0,tracks:[{name:'English',languageCode:'en'},{name:'简体中文',languageCode:'zh-Hans'}],languages:[]}:
          JSON.stringify({events:[{tStartMs:0,dDurationMs:10000,segs:[{utf8:message.index===0?'Original 上一句':'下一句'}]}]});
        window.postMessage({channel:'YTDS_V1',direction:'response',requestId:message.requestId,id:message.id,result},location.origin);
      });
      window.fetch=async url=>{
        const request=new URL(url);if(!['en.wiktionary.org','zh.wiktionary.org'].includes(request.hostname))throw Error('Unexpected external fixture request');F.dictionaryRequests++;
        return new Response(JSON.stringify({parse:{title:request.searchParams.get('page'),wikitext:request.hostname==='zh.wiktionary.org'?'==英語==\n===名詞===\n# 上一句':'==English==\n===Noun===\n# A source explanation, kept unchanged.'}}));
      };
    });
    const add=filename=>page.addScriptTag({path:path.join(__dirname,'../extension',filename)});
    for(const file of ['core.js','playback.js','dictionary.js','vocabulary-store.js','i18n.js','learning.js'])await add(file);
    await page.evaluate(()=>{const repository=YTDSVocabularyStore.createRepository(chrome.storage.local);chrome.runtime.sendMessage=request=>repository.handle(request)});
    const item=id=>page.locator('#ytds-overlay #'+id);
    async function activate(){await add('content.js');await page.waitForFunction(()=>document.querySelector('#ytds-overlay')?.shadowRoot.querySelector('#bottom').textContent==='Original 上一句')}
    async function language(value){await item('uiLanguage').selectOption(value);await page.waitForFunction(value=>i18nFixture.saved.preferences?.uiLanguage===value,value)}
    await activate();assert.equal(await item('settings').textContent(),'Dual subtitles · Settings');assert.equal(await item('uiLanguage').inputValue(),'auto');
    assert.equal(await item('top').textContent(),'下一句');
    await item('bottom').locator('.word').filter({hasText:/^Original$/}).click();
    await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-zh [data-user-content]')?.textContent==='上一句');
    assert.equal(await item('meanings-en').locator('[data-user-content]').textContent(),'A source explanation, kept unchanged.');
    await item('definition').fill('上一句');await item('word-save').click();
    await page.waitForFunction(()=>i18nFixture.saved.words?.[0]?.definition==='上一句');
    await item('word-delete').click();
    assert.equal(await item('delete-word').textContent(),'Original');
    const deleteTime=await item('delete-time').textContent();assert.match(deleteTime,/00:00:01/);
    assert.match(await item('delete-description').textContent(),/Confirm deletion of saved entry:/);
    await item('settings').click();await language('zh-CN');
    assert.equal(await item('settings').textContent(),'上下字幕 · 设置');assert.equal(await item('definition').inputValue(),'上一句');
    assert.equal(await item('meanings-zh').locator('[data-user-content]').textContent(),'上一句');
    assert.match(await item('delete-description').textContent(),/确认删除收藏：/);assert.equal(await item('delete-word').textContent(),'Original');assert.equal(await item('delete-time').textContent(),deleteTime);
    await item('word-delete-cancel').click();
    assert.match(await item('dictionary-state').textContent(),/^字幕目标：简体中文/);
    const evidence=path.join(__dirname,'../evidence');fs.mkdirSync(evidence,{recursive:true});
    await page.evaluate(()=>{const s=document.querySelector('#ytds-overlay').shadowRoot;s.querySelector('#word-panel').scrollTop=0;s.querySelector('#panel').scrollTop=0});
    await page.screenshot({path:path.join(evidence,'i18n-chinese-candidate.png'),fullPage:true});
    await item('close').click();await activate();assert.equal(await item('settings').textContent(),'上下字幕 · 设置');
    await item('settings').click();await language('en');await item('close').click();
    await page.evaluate(()=>i18nFixture.uiLanguage='zh-CN');await activate();
    assert.equal(await item('settings').textContent(),'Dual subtitles · Settings');assert.equal(await item('uiLanguage').inputValue(),'en');
    await item('bottom').locator('.word').filter({hasText:/^Original$/}).click();
    await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-zh [data-user-content]')?.textContent==='上一句');
    assert.equal(await item('definition').inputValue(),'上一句');assert.equal(await item('word-context').textContent(),'Original 上一句');
    await item('settings').click();
    assert.equal(await item('vocabulary-backup').textContent(),'Export current backup first');assert.equal(await item('vocabulary-import-confirm').textContent(),'Merge backup');
    assert.match(await item('dictionary-state').textContent(),/^Caption target:/);
    const untranslated=await page.evaluate(()=>{
      const shadow=document.querySelector('#ytds-overlay').shadowRoot,walker=document.createTreeWalker(shadow,NodeFilter.SHOW_TEXT),found=[];
      while(walker.nextNode()){const node=walker.currentNode,text=node.nodeValue.replace(/^Enabled: source \/ existing 简体中文 video captions\./,'');if(node.parentElement&&!node.parentElement.closest('style,[data-user-content],#top,#bottom,#full-caption-text,#sentences,#vocabulary')&&/[\u4e00-\u9fff]/.test(text))found.push(node.nodeValue.trim());}return found;
    });assert.deepEqual(untranslated,[]);
    await page.screenshot({path:path.join(evidence,'i18n-english-candidate.png'),fullPage:true});
    assert.deepEqual(errors,[]);await item('close').click();
  }finally{await browser.close()}
});
