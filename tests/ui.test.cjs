const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let playwright;
try {playwright=require('playwright-core');} catch {playwright=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');}
const root=path.resolve(__dirname,'..'), evidence=path.join(root,'evidence');
fs.mkdirSync(evidence,{recursive:true});
const results=[],errors=[];
let browser,page;
async function run(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS '+name);}
const text=()=>page.locator('#ytds-overlay #status').textContent();
async function fixture() {
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
  await page.goto('https://www.youtube.com/watch?v=A');
  await page.evaluate(()=>{
    const F=window.fixture={saved:{},listeners:new Set(),requests:[],aborted:0,failTranslation:false,failSource:false,delay:0,intervals:new Set(),frames:new Set()};
    const si=window.setInterval.bind(window),ci=window.clearInterval.bind(window),raf=window.requestAnimationFrame.bind(window),caf=window.cancelAnimationFrame.bind(window);
    window.setInterval=(f,t)=>{const id=si(f,t);F.intervals.add(id);return id;};window.clearInterval=id=>{F.intervals.delete(id);ci(id);};
    window.requestAnimationFrame=f=>{let id=raf(t=>{F.frames.delete(id);f(t);});F.frames.add(id);return id;};window.cancelAnimationFrame=id=>{F.frames.delete(id);caf(id);};
    window.chrome={i18n:{getUILanguage:()=> 'zh-CN'},runtime:{id:'fixture-extension',sendMessage:async request=>{if(request.type!=='YTDS_VOCABULARY')throw Error('unexpected message');return fixture.repository.handle(request)},onMessage:{addListener:f=>F.listeners.add(f),removeListener:f=>F.listeners.delete(f)}},storage:{local:{get:async()=>structuredClone(F.saved),set:async x=>Object.assign(F.saved,structuredClone(x))}}};
    F.metadata=(id,mode='auto')=>({videoDetails:{videoId:id},playabilityStatus:{status:'OK'},captions:{playerCaptionsTracklistRenderer:{captionTracks:mode==='none'?[]:[{languageCode:'en',kind:'asr',name:{simpleText:'English'},isTranslatable:mode!=='unavailable',baseUrl:`https://www.youtube.com/api/timedtext?v=${id}&lang=en&kind=asr`},...(mode==='track'?[{languageCode:'zh-Hans',name:{simpleText:'简体中文'},baseUrl:`https://www.youtube.com/api/timedtext?v=${id}&lang=zh-Hans`}]:[])],translationLanguages:[{languageCode:'zh-Hans'}],audioTracks:[{defaultCaptionTrackIndex:0}]}}});
    F.switch=(id,mode)=>{history.pushState({},'',`/watch?v=${id}`);window.ytInitialPlayerResponse=F.metadata(id,mode);document.dispatchEvent(new Event('yt-navigate-finish'));};
    window.ytInitialPlayerResponse=F.metadata('A');document.querySelector('video').currentTime=1;
    window.fetch=async (url,options)=>{
      const u=new URL(url);F.requests.push(u.href);
      if(u.hostname.endsWith('.wiktionary.org')){
        if(F.dictionaryDelay)await new Promise(resolve=>setTimeout(resolve,F.dictionaryDelay));
        if(F.dictionaryFailure===true||F.dictionaryFailure===u.hostname.split('.')[0])return new Response('',{status:429});
        return new Response(JSON.stringify({parse:{title:u.searchParams.get('page'),wikitext:u.hostname==='en.wiktionary.org'?'==English==\n===Adjective===\n# Existing at the beginning.\n# Created independently.':'==英語==\n===形容詞===\n# [[原始的]]\n# [[独创的]]'}}),{headers:{'content-type':'application/json'}});
      }
      if(F.delay) await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,F.delay);options.signal.addEventListener('abort',()=>{clearTimeout(timer);F.aborted++;reject(new DOMException('Aborted','AbortError'));},{once:true});});
      if(options.signal.aborted)throw new DOMException('Aborted','AbortError');
      const translated=u.searchParams.has('tlang')||u.searchParams.get('lang')==='zh-Hans';
      if(((translated&&F.failTranslation)||(!translated&&F.failSource))&&!u.searchParams.has('playerObserved'))return new Response('',{status:403});
      const id=u.searchParams.get('v');return new Response(JSON.stringify({events:[{tStartMs:0,dDurationMs:4000,segs:[{utf8:translated?`译文 ${id}（测试夹具）`:`Original ${id}`}]},{tStartMs:6000,dDurationMs:3000,segs:[{utf8:'第二句'}]}]}),{headers:{'content-type':'application/json'}});
    };
  });
}
async function activate(){for(const file of ['request-url.js','native-loader.js','bridge.js','core.js','playback.js','dictionary.js','vocabulary-store.js','i18n.js']) await page.addScriptTag({path:path.join(root,'extension',file)});await page.evaluate(()=>{fixture.repository??=YTDSVocabularyStore.createRepository(chrome.storage.local)});for(const file of ['learning.js','content.js'])await page.addScriptTag({path:path.join(root,'extension',file)});}
async function waitForReady(id='A'){await page.waitForFunction(id=>document.querySelector('#ytds-overlay')?.shadowRoot.querySelector('#bottom').textContent===`Original ${id}`,id);await page.waitForFunction(id=>document.querySelector('#ytds-overlay')?.shadowRoot.querySelector('#top').textContent===`译文 ${id}（测试夹具）`,id);}
async function resourceCounts(){return page.evaluate(()=>({host:document.querySelectorAll('#ytds-overlay').length,style:document.querySelectorAll('#ytds-native-style').length,listeners:fixture.listeners.size,intervals:fixture.intervals.size,frames:fixture.frames.size,bridge:!!window.__YTDS_BRIDGE_V1__,session:!!window.__YTDS_SESSION_V1__,hidden:document.querySelector('#movie_player').hasAttribute('data-ytds-native-hidden')}));}
async function clean(){await page.waitForFunction(()=>!window.__YTDS_BRIDGE_V1__);assert.deepEqual(await resourceCounts(),{host:0,style:0,listeners:0,intervals:0,frames:0,bridge:false,session:false,hidden:false});}
(async()=>{
  try {
    browser=await playwright.chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER_PATH||undefined});
    page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
    await fixture();
    await run('默认原文下 / 译文上；原生仅暂时隐藏',async()=>{
      await activate();await waitForReady();
      const a=await page.locator('#ytds-overlay #top').boundingBox(),b=await page.locator('#ytds-overlay #bottom').boundingBox();assert.ok(a.y+a.height<b.y);
      assert.equal(await page.locator('.ytp-caption-window-container').evaluate(e=>getComputedStyle(e).visibility),'hidden');
      assert.ok((await text()).includes('自动翻译'));await page.screenshot({path:path.join(evidence,'01-default.png')});
    });
    await run('独立设置 / 背景 / 保存 / 极端长字幕仍分离',async()=>{
      await page.locator('#ytds-overlay #settings').click();
      await page.locator('#ytds-overlay #top-size').fill('40');await page.locator('#ytds-overlay #top-opacity').fill('25');
      await page.locator('#ytds-overlay #bottom-size').fill('18');await page.locator('#ytds-overlay #bottom-color').fill('#224466');
      await page.waitForFunction(()=>fixture.saved.layout?.top.size===40&&fixture.saved.layout.bottom.color==='#224466');
      assert.equal(await page.locator('#ytds-overlay #bottom').evaluate(e=>e.style.fontSize),'18px');
      await page.locator('#ytds-overlay #top-y').fill('35');await page.locator('#ytds-overlay #bottom-y').fill('65');
      await page.evaluate(()=>{const C=YTDSCore;const real=C.cueAt;window.restoreCue=()=>C.cueAt=real;C.cueAt=()=>('很长的字幕 '.repeat(100));});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#top').textContent.length>100);
      const a=await page.locator('#ytds-overlay #top').boundingBox(),b=await page.locator('#ytds-overlay #bottom').boundingBox();assert.ok(a.y+a.height<b.y);await page.evaluate(()=>restoreCue());
      await page.screenshot({path:path.join(evidence,'02-settings.png')});
    });
    await run('拖动位置保存；上下界限与键盘设置',async()=>{
      await page.locator('#ytds-overlay #drag').check();
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#top').textContent.includes('位置示例'));
      const box=await page.locator('#ytds-overlay #top').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-200,y-100,{steps:8});await page.mouse.up();
      await page.waitForFunction(()=>fixture.saved.layout?.top.x<40&&fixture.saved.layout.top.y<30);
      await page.locator('#ytds-overlay #bottom-y').focus();await page.keyboard.press('End');assert.equal(await page.locator('#ytds-overlay #bottom-y').inputValue(),'96');
      await page.locator('#ytds-overlay #settings').click();await waitForReady();
    });
    await run('真实 DOM Fullscreen API 下显示与退出',async()=>{
      await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
      const a=await page.locator('#ytds-overlay #top').boundingBox(),b=await page.locator('#ytds-overlay #bottom').boundingBox();assert.ok(a.y>=0&&a.y+a.height<b.y&&b.y+b.height<=900);
      await page.screenshot({path:path.join(evidence,'03-fullscreen.png')});await page.evaluate(()=>document.exitFullscreen());
    });
    await run('视频切换 10 次无重复节点、原文轨切换、seek、广告',async()=>{
      for(let n=0;n<10;n++){await page.evaluate(n=>fixture.switch('V'+n),n);await waitForReady('V'+n);assert.equal(await page.locator('#ytds-overlay').count(),1);}
      await page.evaluate(()=>{fixture.switch('T','track');});await waitForReady('T');assert.ok((await text()).includes('已有简体中文'));
      await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #source').selectOption('1');
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('无需翻译'));
      await page.locator('#ytds-overlay #source').selectOption('0');await waitForReady('T');await page.locator('#ytds-overlay #settings').click();
      await page.evaluate(()=>document.querySelector('video').currentTime=4.5);await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#bottom').textContent==='');
      await page.evaluate(()=>document.querySelector('video').currentTime=1);await waitForReady('T');
      await page.evaluate(()=>document.querySelector('#movie_player').classList.add('ad-showing'));await page.waitForFunction(()=>!document.querySelector('#movie_player').hasAttribute('data-ytds-native-hidden'));
      await page.evaluate(()=>document.querySelector('#movie_player').classList.remove('ad-showing'));await waitForReady('T');
    });
    await run('无字幕 / 翻译不可用 / HTTP 获取失败显示事实',async()=>{
      await page.evaluate(()=>fixture.switch('N','none'));await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('没有可用字幕'));
      assert.equal((await resourceCounts()).hidden,false);
      await page.evaluate(()=>fixture.switch('U','unavailable'));await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('未提供'));
      assert.equal(await page.locator('#ytds-overlay #top').textContent(),'');
      await page.evaluate(()=>{fixture.failTranslation=true;fixture.switch('F');});await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('HTTP 403'));
      assert.equal(await page.locator('#ytds-overlay #top').textContent(),'');await page.screenshot({path:path.join(evidence,'04-error.png')});
      await page.evaluate(()=>{fixture.failSource=true;fixture.switch('S');});await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('HTTP 403'));
      assert.equal((await resourceCounts()).hidden,false);await page.evaluate(()=>{fixture.failTranslation=false;fixture.failSource=false;});
    });
    await run('字幕地址拒绝第三方与错误视频；直播拒绝',async()=>{
      const before=await page.evaluate(()=>fixture.requests.length);
      await page.evaluate(()=>{fixture.switch('E');ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl='https://evil.test/api/timedtext?v=E';});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('地址不受支持'));assert.equal(await page.evaluate(()=>fixture.requests.length),before);
      await page.evaluate(()=>{fixture.switch('M');ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl='https://www.youtube.com/api/timedtext?v=other';});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('不一致'));
      await page.evaluate(()=>{fixture.switch('LIVE');ytInitialPlayerResponse.videoDetails.isLiveContent=true;});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('直播'));
    });
    await run('快速切换取消旧请求；替换播放器后重挂载',async()=>{
      await page.evaluate(()=>{fixture.delay=600;fixture.switch('R1');});
      await page.waitForFunction(()=>fixture.requests.some(u=>new URL(u).searchParams.get('v')==='R1'));
      await page.evaluate(()=>fixture.switch('R2'));
      await page.waitForFunction(()=>fixture.requests.some(u=>new URL(u).searchParams.get('v')==='R2'));
      await page.evaluate(()=>{fixture.delay=0;fixture.switch('R3');});await waitForReady('R3');
      await page.waitForTimeout(700);assert.equal(await page.locator('#ytds-overlay #bottom').textContent(),'Original R3');
      assert.ok(await page.evaluate(()=>fixture.aborted>=2));
      await page.evaluate(()=>{
        const old=document.querySelector('#movie_player'), replacement=old.cloneNode(true);
        replacement.querySelector('#ytds-overlay')?.remove();replacement.removeAttribute('data-ytds-native-hidden');
        old.replaceWith(replacement);window.previousPlayer=old;replacement.querySelector('video').currentTime=1;
        document.dispatchEvent(new Event('yt-navigate-finish'));
      });await waitForReady('R3');
      assert.equal(await page.evaluate(()=>previousPlayer.hasAttribute('data-ytds-native-hidden')),false);
      assert.equal(await page.locator('#ytds-overlay').count(),1);
    });
    await run('XML / srv3 字幕解析与 HTML 字符安全显示',async()=>{
      const cues=await page.evaluate(()=>({legacy:YTDSCore.parseCaptions('<transcript><text start="1" dur="2">A &amp; B</text></transcript>'),srv:YTDSCore.parseCaptions('<timedtext><body><p t="1000" d="2000"><s>&lt;img onerror=alert(1)&gt;</s></p></body></timedtext>')}));
      assert.equal(cues.legacy[0].text,'A & B');assert.equal(cues.srv[0].text,'<img onerror=alert(1)>');
      await page.evaluate(()=>{fixture.switch('X');const f=window.fetch;window.fetch=async (u,o)=>{const r=await f(u,o);const d=await r.json();d.events[0].segs[0].utf8='<img onerror=alert(1)>';return new Response(JSON.stringify(d));};});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#bottom').textContent.includes('<img'));
      assert.equal(await page.locator('#ytds-overlay img').count(),0);
    });
    await run('关闭请求取消与原生恢复；重复启停 5 次、设置持久化',async()=>{
      await page.locator('#ytds-overlay #close').click();await clean();
      for(let n=0;n<5;n++){await activate();await page.waitForFunction(()=>!!document.querySelector('#ytds-overlay'));await page.locator('#ytds-overlay #close').click();await clean();}
      await page.evaluate(()=>{fixture.delay=2000;fixture.switch('C');});await activate();
      await page.waitForFunction(()=>fixture.requests.some(u=>new URL(u).searchParams.get('v')==='C'));
      await page.locator('#ytds-overlay #close').click();await clean();await page.waitForFunction(()=>fixture.aborted>0);
      const count=await page.evaluate(()=>fixture.requests.length);await page.evaluate(()=>fixture.switch('AFTER'));await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>fixture.requests.length),count);
      await page.evaluate(()=>fixture.delay=0);await activate();await page.locator('#ytds-overlay #settings').click();assert.equal(await page.locator('#ytds-overlay #top-size').inputValue(),'40');
      await page.locator('#ytds-overlay #disable').click();await clean();
    });
    await fixture();await activate();await waitForReady();
    await page.evaluate(()=>{const v=document.querySelector('video');fixture.paused=true;fixture.plays=0;fixture.pauses=0;Object.defineProperty(v,'paused',{get:()=>fixture.paused});v.play=async()=>{fixture.paused=false;fixture.plays++;};v.pause=()=>{fixture.paused=true;fixture.pauses++;};});
    await run('语言选择、上下互换、独立隐藏与时间偏移',async()=>{
      await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #swap').check();
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#top').textContent==='Original A');
      await page.locator('#ytds-overlay #topVisible').uncheck();assert.equal(await page.locator('#ytds-overlay #top').isVisible(),false);
      await page.locator('#ytds-overlay #topVisible').check();await page.locator('#ytds-overlay #swap').uncheck();
      await page.locator('#ytds-overlay #target').selectOption('en');await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('无需翻译'));
      assert.equal(await page.locator('#ytds-overlay #top').textContent(),'Original A');await page.locator('#ytds-overlay #target').selectOption('zh-Hans');await waitForReady();
      await page.locator('#ytds-overlay #study summary').click();await page.locator('#ytds-overlay #sourceOffset').fill('2');await page.locator('#ytds-overlay #sourceOffset').dispatchEvent('change');
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#bottom').textContent==='');assert.ok((await page.locator('#ytds-overlay #top').textContent()).includes('译文'));
      await page.locator('#ytds-overlay #sourceOffset').fill('0');await page.locator('#ytds-overlay #sourceOffset').dispatchEvent('change');await waitForReady();
    });
    await run('单句重播、上一句下一句、句末暂停与可点击列表',async()=>{
      await page.locator('#ytds-overlay #replay').click();assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),0);
      await page.evaluate(()=>document.querySelector('video').currentTime=4.05);await page.waitForFunction(()=>fixture.pauses===1);
      await page.locator('#ytds-overlay #next').click();assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),6);
      await page.locator('#ytds-overlay #previous').click();assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),0);
      await page.locator('#ytds-overlay #sentences button').nth(1).click();assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),6);
      await page.locator('#ytds-overlay #pauseAtEnd').check();await page.locator('#ytds-overlay #previous').click();
      await page.evaluate(()=>document.querySelector('video').currentTime=3.9);await page.waitForTimeout(80);
      const pauses=await page.evaluate(()=>fixture.pauses);await page.evaluate(()=>document.querySelector('video').currentTime=4.05);await page.waitForFunction(n=>fixture.pauses===n+1,pauses);
      await page.locator('#ytds-overlay #pauseAtEnd').uncheck();await page.evaluate(()=>document.querySelector('video').currentTime=1);
    });
    await run('SRT/VTT 本地导入、失败提示、导出实际文件与导航清除',async()=>{
      const srt='1\n00:00:00,000 --> 00:00:03,000\nImported original\n\n2\n00:00:06,000 --> 00:00:09,000\nSecond imported';
      await page.locator('#ytds-overlay #importSource').setInputFiles({name:'test.srt',mimeType:'application/x-subrip',buffer:Buffer.from(srt)});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#bottom').textContent==='Imported original');
      await page.locator('#ytds-overlay #importTranslation').setInputFiles({name:'test.vtt',mimeType:'text/vtt',buffer:Buffer.from('WEBVTT\n\n00:00.000 --> 00:03.000\n导入译文')});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#top').textContent==='导入译文');assert.ok((await text()).includes('未验证'));
      const downloaded=page.waitForEvent('download');await page.locator('#ytds-overlay #export').click();const d=await downloaded;const downloadedText=fs.readFileSync(await d.path(),'utf8');assert.ok(downloadedText.includes('Imported original'));
      await page.locator('#ytds-overlay #importSource').setInputFiles({name:'bad.srt',mimeType:'text/plain',buffer:Buffer.from('no cues')});await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('没有可用字幕句'));
      await page.evaluate(()=>fixture.switch('B'));await waitForReady('B');await page.locator('#ytds-overlay #settings').click();
    });
    await run('点击单词、手动释义、上下文收藏、复习掌握和重听导出',async()=>{
      const before=await page.evaluate(()=>fixture.requests.filter(u=>new URL(u).hostname==='www.youtube.com').length);
      await page.locator('#ytds-overlay #bottom .word').filter({hasText:'Original'}).click();assert.ok((await page.locator('#ytds-overlay #word-origin').textContent()).includes('手动内容'));
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings').textContent.includes('原始的'));
      assert.ok((await page.locator('#ytds-overlay #meanings-en').textContent()).includes('Existing at the beginning.'));
      assert.ok((await page.locator('#ytds-overlay #dictionary-source-zh').getAttribute('href')).startsWith('https://zh.wiktionary.org/wiki/'));
      assert.ok((await page.locator('#ytds-overlay #dictionary-source-en').getAttribute('href')).startsWith('https://en.wiktionary.org/wiki/'));
      await page.locator('#ytds-overlay #definition').fill('原始的（我的笔记）');await page.locator('#ytds-overlay #word-save').click();
      await page.waitForFunction(()=>fixture.saved.words?.length===1);const w=await page.evaluate(()=>fixture.saved.words[0]);assert.equal(w.context,'Original B');assert.equal(w.videoId,'B');assert.equal(w.at,1);
      await page.locator('#ytds-overlay #review').click();assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'');await page.locator('#ytds-overlay #reveal').click();assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'原始的（我的笔记）');
      await page.locator('#ytds-overlay #mastered').click();await page.waitForFunction(()=>fixture.saved.words[0].mastered===true);
      await page.evaluate(()=>document.querySelector('video').currentTime=6);await page.locator('#ytds-overlay #word-jump').click();assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),1);
      assert.ok((await page.locator('#ytds-overlay #word-link').getAttribute('href')).includes('v=B'));
      const downloaded=page.waitForEvent('download');await page.locator('#ytds-overlay #word-json').click();const d=await downloaded;const data=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(data.words[0].definition,'原始的（我的笔记）');assert.ok(data.words[0].url.includes('t=1s'));
      const csvDownload=page.waitForEvent('download');await page.locator('#ytds-overlay #word-csv').click();const csv=fs.readFileSync(await (await csvDownload).path(),'utf8');assert.ok(csv.includes('单词')&&csv.includes('Original')&&csv.includes('v=B'));
      assert.equal(await page.evaluate(()=>fixture.requests.filter(u=>new URL(u).hostname==='www.youtube.com').length),before);await page.locator('#ytds-overlay #word-close').click();
      await page.locator('#ytds-overlay #close').click();await clean();await activate();await waitForReady('B');await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #words').click();await page.locator('#ytds-overlay #vocabulary-details summary').click();assert.ok((await page.locator('#ytds-overlay #vocabulary').textContent()).includes('Original ✓'));
      await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #settings').click();
    });
    await run('快捷键、输入框保护、恢复默认及最终关闭清理',async()=>{
      await page.keyboard.press('Alt+ArrowRight');assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),6);
      await page.keyboard.press('Alt+s');assert.equal(await page.locator('#ytds-overlay #panel').isVisible(),true);
      await page.locator('#ytds-overlay #study summary').click();await page.locator('#ytds-overlay #sourceOffset').focus();await page.keyboard.press('Alt+ArrowLeft');assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),6);
      await page.locator('#ytds-overlay #reset').click();assert.equal(await page.locator('#ytds-overlay #top-size').inputValue(),'26');assert.equal(await page.locator('#ytds-overlay #sourceOffset').inputValue(),'0');
      await page.locator('#ytds-overlay #settings').focus();await page.keyboard.press('Alt+x');await clean();
    });
    await run('优先完整复用已成功原生轨请求；不将授权参数转移至其他语言',async()=>{
      await fixture();await page.evaluate(()=>{
        fixture.failSource=true;fixture.failTranslation=true;
        const entries=[{name:'https://www.youtube.com/api/timedtext?v=A&lang=en&kind=asr&fmt=json3&playerObserved=exact-source',decodedBodySize:100,startTime:1},{name:'https://www.youtube.com/api/timedtext?v=A&lang=en&kind=asr&fmt=json3&tlang=zh-Hans&playerObserved=exact-translation',decodedBodySize:100,startTime:2}];
        Object.defineProperty(performance,'getEntriesByType',{value:type=>type==='resource'?entries:[]});
      });await activate();await waitForReady();
      const requested=await page.evaluate(()=>fixture.requests);assert.equal(requested.length,2);assert.ok(requested.every(u=>u.includes('playerObserved=')));
      await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #target').selectOption('en');await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('无需翻译'));
      await page.locator('#ytds-overlay #close').click();await clean();
    });
    await run('首次未缓存视频及自动播放正常加载两轨，无用户选轨或重试；恢复 CC 关闭状态',async()=>{
      await fixture();await page.evaluate(()=>{
        fixture.failSource=true;fixture.failTranslation=true;fixture.entries=[];fixture.nativeCalls=[];
        Object.defineProperty(performance,'getEntriesByType',{value:type=>type==='resource'?fixture.entries:[]});
        const p=document.querySelector('#movie_player');p.ccOn=false;p.track=null;
        p.isSubtitlesOn=()=>p.ccOn;p.getOption=()=>p.track;p.loadModule=()=>p.ccOn=true;p.unloadModule=()=>p.ccOn=false;
        p.setOption=(module,option,value)=>{fixture.nativeCalls.push({id:new URL(location.href).searchParams.get('v'),option});if(option!=='track')return;p.track=value;
          if(!value?.languageCode)return;
          const u=new URL(value.baseUrl);u.searchParams.set('fmt','json3');u.searchParams.set('playerObserved','native-loader-fixture');if(value.translationLanguage)u.searchParams.set('tlang',value.translationLanguage.languageCode);else u.searchParams.delete('tlang');
          setTimeout(()=>fixture.entries.push({name:u.href,decodedBodySize:100,startTime:performance.now()}),30);
        };
      });await activate();await waitForReady();assert.equal(await page.evaluate(()=>document.querySelector('#movie_player').ccOn),false);
      await page.evaluate(()=>fixture.switch('AUTOPLAY_FIRST'));await waitForReady('AUTOPLAY_FIRST');
      const requests=await page.evaluate(()=>fixture.requests);assert.equal(requests.length,4);assert.ok(requests.every(u=>u.includes('playerObserved=')));
      assert.equal(await page.evaluate(()=>document.querySelector('#movie_player').ccOn),false);
      await page.evaluate(()=>fixture.switch('A'));await waitForReady();assert.equal(await page.evaluate(()=>fixture.requests.length),4);
      await page.evaluate(()=>{fixture.switch('AUTOPLAY_FIRST');ytInitialPlayerResponse.playabilityStatus.status='LOGIN_REQUIRED';});
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#status').textContent.includes('不可访问'));
      assert.equal(await page.locator('#ytds-overlay #top').textContent(),'');assert.equal(await page.evaluate(()=>fixture.requests.length),4);
      await page.locator('#ytds-overlay #close').click();await clean();
    });
    await run('自动播放新视频原文失败仍独立获取和显示译文，原文空白且原生可见',async()=>{
      await page.evaluate(()=>{fixture.switch('SOURCE_FAIL');fixture.nativeSet=document.querySelector('#movie_player').setOption;document.querySelector('#movie_player').setOption=undefined;fixture.failTranslation=false;});await activate();
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay')?.shadowRoot.querySelector('#top').textContent.includes('SOURCE_FAIL'));
      assert.equal(await page.locator('#ytds-overlay #bottom').textContent(),'');
      assert.equal((await resourceCounts()).hidden,false);assert.ok((await text()).includes('原文获取失败')&&(await text()).includes('译文可用'));
      assert.ok(await page.evaluate(()=>fixture.requests.some(u=>{const x=new URL(u);return x.searchParams.get('v')==='SOURCE_FAIL'&&x.searchParams.get('tlang')==='zh-Hans';})));
      await page.locator('#ytds-overlay #close').click();await clean();
      await page.evaluate(()=>{document.querySelector('#movie_player').setOption=fixture.nativeSet;fixture.failTranslation=true;});
    });
    await run('自动原生轨加载中关闭取消，恢复字幕状态并清理',async()=>{
      await page.evaluate(()=>{fixture.switch('CANCEL_FIRST');fixture.entries=[];});await activate();
      await page.waitForFunction(()=>document.querySelector('#movie_player').ccOn);
      await page.locator('#ytds-overlay #close').click();await clean();
      assert.equal(await page.evaluate(()=>document.querySelector('#movie_player').ccOn),false);
      const n=await page.evaluate(()=>fixture.requests.length);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>fixture.requests.length),n);
    });
    await run('中文查词→笔记收藏→复习揭示→掌握→新文档恢复→重听；不上传字幕或词本',async()=>{
      await fixture();await activate();await waitForReady();
      await page.evaluate(()=>{const v=document.querySelector('video');fixture.paused=false;Object.defineProperty(v,'paused',{get:()=>fixture.paused});v.pause=()=>fixture.paused=true;v.play=async()=>fixture.paused=false;v.currentTime=3.5;});
      await page.locator('#ytds-overlay #bottom .word').first().click();
      assert.equal(await page.evaluate(()=>fixture.paused),true);
      await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings').textContent.includes('原始的'));
      await page.locator('#ytds-overlay #definition').fill('我的学习笔记');await page.locator('#ytds-overlay #word-save').click();
      await page.waitForFunction(()=>fixture.saved.words?.[0]?.definition==='我的学习笔记'&&fixture.saved.words[0].dictionary?.zh?.language==='zh');
      assert.equal(await page.evaluate(()=>fixture.saved.words[0].dictionary.en.language),'en');
      await page.locator('#ytds-overlay #review').click();assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'');assert.equal(await page.locator('#ytds-overlay #meanings').textContent(),'');
      await page.locator('#ytds-overlay #reveal').click();assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'我的学习笔记');assert.ok((await page.locator('#ytds-overlay #meanings').textContent()).includes('原始的'));
      await page.locator('#ytds-overlay #mastered').click();await page.waitForFunction(()=>fixture.saved.words[0].mastered===true);
      const saved=await page.evaluate(()=>fixture.saved),requests=await page.evaluate(()=>fixture.requests.filter(u=>new URL(u).hostname.endsWith('.wiktionary.org')));
      assert.equal(requests.length,2);assert.equal(new URL(requests[0]).searchParams.get('page'),'original');assert.ok(!requests[0].includes('videoId')&&!requests[0].includes('Original%20A'));
      await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();
      await fixture();await page.evaluate(saved=>Object.assign(fixture.saved,saved),saved);await activate();await waitForReady();
      await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #words').click();await page.locator('#ytds-overlay #vocabulary-details summary').click();await page.locator('#ytds-overlay #vocabulary button').first().click();
      assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'我的学习笔记');assert.ok((await page.locator('#ytds-overlay #meanings').textContent()).includes('原始的'));assert.equal(await page.evaluate(()=>fixture.requests.filter(u=>new URL(u).hostname.endsWith('.wiktionary.org')).length),0);
      await page.locator('#ytds-overlay #word-jump').click();assert.equal(await page.evaluate(()=>document.querySelector('video').currentTime),3.5);
      await page.locator('#ytds-overlay #mastered').click();await page.waitForFunction(()=>fixture.saved.words[0].mastered===false);
      await page.locator('#ytds-overlay #review').click();await page.locator('#ytds-overlay #mastered').click();await page.waitForFunction(()=>fixture.saved.words[0].mastered===true);assert.equal(await page.evaluate(()=>fixture.saved.words[0].definition),'我的学习笔记');
      await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();
    });
    await run('旧单语收藏无网络迁移保留笔记；补全中英→复习→重开→导出分别保存',async()=>{
      await fixture();await page.evaluate(()=>{fixture.saved.words=[{word:'original',context:'Original A',videoId:'A',at:1,language:'en',definition:'旧手写笔记',mastered:false,createdAt:'2026-10-01T00:00:00.000Z',dictionary:{language:'zh',meanings:['旧中文释义'],article:'https://zh.wiktionary.org/wiki/original',license:'CC BY-SA 4.0',fetchedAt:'2026-10-01T00:00:00.000Z'}}];});
      await activate();await waitForReady();await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #words').click();await page.locator('#ytds-overlay #vocabulary-details summary').click();await page.locator('#ytds-overlay #vocabulary button').first().click();
      assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'旧手写笔记');assert.ok((await page.locator('#ytds-overlay #meanings-zh').textContent()).includes('旧中文释义'));assert.ok((await page.locator('#ytds-overlay #meanings-en').textContent()).includes('旧收藏尚无英文解释'));
      assert.equal(await page.evaluate(()=>fixture.requests.filter(u=>u.includes('.wiktionary.org')).length),0);
      await page.locator('#ytds-overlay #dictionary-query').click();await page.waitForFunction(()=>fixture.saved.words[0].dictionary?.en?.language==='en');assert.equal(await page.evaluate(()=>fixture.saved.words[0].definition),'旧手写笔记');assert.equal(await page.evaluate(()=>fixture.saved.words[0].createdAt),'2026-10-01T00:00:00.000Z');
      await page.locator('#ytds-overlay #review').click();assert.equal(await page.locator('#ytds-overlay #meanings').textContent(),'');assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'');await page.locator('#ytds-overlay #reveal').click();assert.ok((await page.locator('#ytds-overlay #meanings-en').textContent()).includes('Existing at the beginning.'));assert.ok((await page.locator('#ytds-overlay #meanings-zh').textContent()).includes('原始的'));
      await page.locator('#ytds-overlay #mastered').click();await page.waitForFunction(()=>fixture.saved.words[0].mastered===true);
      const jsonDownload=page.waitForEvent('download');await page.locator('#ytds-overlay #word-json').click();const exported=JSON.parse(fs.readFileSync(await(await jsonDownload).path(),'utf8'));assert.equal(exported.version,5);assert.ok(exported.words[0].dictionary.zh.article.includes('zh.wiktionary'));assert.ok(exported.words[0].dictionary.en.article.includes('en.wiktionary'));assert.equal(exported.words[0].dictionary.en.license,'CC BY-SA 4.0');assert.equal(exported.words[0].definition,'旧手写笔记');
      const csvDownload=page.waitForEvent('download');await page.locator('#ytds-overlay #word-csv').click();const csv=fs.readFileSync(await(await csvDownload).path(),'utf8');assert.ok(csv.includes('中文释义')&&csv.includes('英文解释')&&csv.includes('Existing at the beginning.')&&csv.includes('zh.wiktionary.org')&&csv.includes('en.wiktionary.org'));
      await page.evaluate(()=>fixture.dictionaryFailure='en');await page.locator('#ytds-overlay #dictionary-query').click();await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-en').textContent.includes('保留此前收藏'));assert.ok((await page.locator('#ytds-overlay #meanings-en').textContent()).includes('Existing at the beginning.'));assert.equal(await page.evaluate(()=>fixture.saved.words[0].definition),'旧手写笔记');
      const saved=await page.evaluate(()=>fixture.saved);await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();await fixture();await page.evaluate(saved=>Object.assign(fixture.saved,saved),saved);await activate();await waitForReady();await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #words').click();await page.locator('#ytds-overlay #vocabulary-details summary').click();await page.locator('#ytds-overlay #vocabulary button').first().click();assert.equal(await page.locator('#ytds-overlay #definition').inputValue(),'旧手写笔记');assert.ok((await page.locator('#ytds-overlay #meanings-en').textContent()).includes('Existing at the beginning.'));assert.equal(await page.evaluate(()=>fixture.requests.filter(u=>u.includes('.wiktionary.org')).length),0);await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();
    });
    await run('双语释义失败分别提示，允许保存手写笔记，不生成定义',async()=>{
      await fixture();await page.evaluate(()=>fixture.dictionaryFailure=true);await activate();await waitForReady();await page.locator('#ytds-overlay #bottom .word').first().click();await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-en')?.textContent.includes('限流'));
      assert.ok((await page.locator('#ytds-overlay #meanings-zh').textContent()).includes('限流'));assert.equal(await page.locator('#ytds-overlay #dictionary-source-zh').count(),0);assert.equal(await page.locator('#ytds-overlay #dictionary-source-en').count(),0);await page.locator('#ytds-overlay #definition').fill('无释义时的手写笔记');await page.locator('#ytds-overlay #word-save').click();await page.waitForFunction(()=>fixture.saved.words?.[0]?.definition==='无释义时的手写笔记');assert.equal(await page.evaluate(()=>fixture.saved.words[0].dictionary.zh),null);assert.equal(await page.evaluate(()=>fixture.saved.words[0].dictionary.en),null);await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();
    });
    await run('词典主语言跟随字幕目标；英中文切换缓存隔离，其他目标不伪造解释',async()=>{
      await fixture();await page.evaluate(()=>{ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.translationLanguages.push({languageCode:'fr',languageName:{simpleText:'French'}});});await activate();await waitForReady();await page.locator('#ytds-overlay #bottom .word').first().click();await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-zh')?.textContent.includes('原始的'));await page.locator('#ytds-overlay #definition').fill('语言切换笔记');await page.locator('#ytds-overlay #word-save').click();await page.waitForFunction(()=>fixture.saved.words?.[0]?.definition==='语言切换笔记');
      await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #target').selectOption('en');await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#top').textContent==='Original A');assert.equal(await page.locator('#ytds-overlay #meanings-zh').count(),0);assert.ok((await page.locator('#ytds-overlay #meanings-en').textContent()).includes('Existing at the beginning.'));assert.equal(await page.locator('#ytds-overlay #uiLanguage').inputValue(),'auto');
      await page.locator('#ytds-overlay #dictionary-query').click();await page.waitForFunction(()=>fixture.saved.words[0].dictionary?.targetLanguage==='en');assert.equal(await page.evaluate(()=>fixture.requests.filter(u=>u.includes('.wiktionary.org')).length),3);assert.equal(await page.evaluate(()=>fixture.saved.words[0].definition),'语言切换笔记');
      await page.locator('#ytds-overlay #target').selectOption('fr');await page.waitForFunction(()=>!!document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-target'));assert.ok((await page.locator('#ytds-overlay #meanings-target').textContent()).includes('暂不支持'));assert.equal(await page.locator('#ytds-overlay #meanings-zh').count(),0);await page.locator('#ytds-overlay #dictionary-query').click();await page.waitForFunction(()=>fixture.saved.words[0].dictionary.targetLanguage==='fr');assert.equal(await page.evaluate(()=>fixture.requests.filter(u=>u.includes('.wiktionary.org')).length),4);assert.ok(await page.evaluate(()=>fixture.requests.filter(u=>u.includes('.wiktionary.org')).every(u=>new URL(u).hostname==='zh.wiktionary.org'||new URL(u).hostname==='en.wiktionary.org')));
      await page.locator('#ytds-overlay #target').selectOption('zh-Hans');await waitForReady();assert.ok((await page.locator('#ytds-overlay #meanings-zh').textContent()).includes('原始的'));const snapshot=await page.evaluate(()=>fixture.saved);await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();assert.equal(snapshot.words[0].definition,'语言切换笔记');
    });
    await run('目标切换取消慢查词，旧语言结果不写入当前卡片或缓存',async()=>{
      await fixture();await activate();await waitForReady();await page.evaluate(()=>fixture.dictionaryDelay=350);await page.locator('#ytds-overlay #bottom .word').first().click();await page.locator('#ytds-overlay #settings').click();await page.locator('#ytds-overlay #target').selectOption('en');await page.waitForTimeout(500);assert.equal(await page.locator('#ytds-overlay #meanings-zh').count(),0);assert.ok(!(await page.locator('#ytds-overlay #meanings').textContent()).includes('原始的'));await page.evaluate(()=>fixture.dictionaryDelay=0);await page.locator('#ytds-overlay #dictionary-query').click();await page.waitForFunction(()=>document.querySelector('#ytds-overlay').shadowRoot.querySelector('#meanings-en')?.textContent.includes('Existing at the beginning.'));await page.locator('#ytds-overlay #word-save').click();await page.waitForFunction(()=>fixture.saved.words?.[0]?.dictionary?.targetLanguage==='en');assert.equal(await page.evaluate(()=>fixture.saved.words[0].dictionary.zh),null);await page.locator('#ytds-overlay #word-close').click();await page.locator('#ytds-overlay #close').click();await clean();
    });
    assert.deepEqual(errors,[]);console.log('PASS no browser page errors');
  } catch(error) {results.push({name:'执行失败',status:'FAIL',error:String(error.stack)});if(page)await page.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{});console.error(error);process.exitCode=1;}
  finally {fs.writeFileSync(path.join(evidence,'ui-results.json'),JSON.stringify({date:new Date().toISOString(),browser:browser?.version(),scope:'隔离夹具；未加载真实扩展、未访问实际 YouTube 字幕接口',results,errors},null,2));await browser?.close();}
})();
