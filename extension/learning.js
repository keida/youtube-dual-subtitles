(function(root){
  "use strict";
  root.YTDSLearning=function(shadow,api){
    const panel=document.createElement("section");panel.id="word-panel";panel.hidden=true;panel.setAttribute("aria-label","本地单词学习");
    panel.innerHTML=`<div class="actions"><button id="word-close">关闭</button><button id="review">复习下一个未掌握词</button></div><h2 id="word-title">本地生词本</h2><p id="word-context"></p><p>点英文词时仅向维基词典查询该词，不发送字幕、视频或生词本；中文释义优先。</p><div id="meanings" aria-label="词典释义"></div><p id="dictionary-state" role="status"></p><p id="word-origin">我的笔记为手动内容，词典释义单独显示。</p><p><a id="dictionary-source" target="_blank" rel="noopener noreferrer" hidden>词条与贡献者</a> <a id="dictionary-license" target="_blank" rel="noopener noreferrer" hidden>CC BY-SA 4.0</a></p><button id="dictionary-query">查询 / 更新词典释义</button><textarea id="definition" aria-label="我的释义或笔记" placeholder="填写你自己的释义或笔记"></textarea><div class="actions"><button id="word-save">收藏 / 保存笔记</button><button id="mastered">标记已掌握</button><button id="reveal">显示释义与笔记</button></div><p id="word-state" role="status"></p><div class="actions"><button id="word-jump">在当前视频重听</button><a id="word-link" target="_blank" rel="noopener noreferrer" hidden>打开原视频时间点</a></div><details><summary>全部收藏（最多显示 100 条）</summary><div id="vocabulary"></div></details><div class="actions"><button id="word-json">导出 JSON</button><button id="word-csv">导出 CSV</button></div>`;
    shadow.append(panel);const $=s=>panel.querySelector(s);
    let words=[],draft=null,active=true,reviewMode=false,reviewIndex=-1,writes=Promise.resolve();
    const D=root.YTDSDictionary,dictCache=new Map();let queryAbort=null,queryTimer=0,querySequence=0;
    function valid(item){return item&&typeof item.word==="string"&&item.word.length<=200&&typeof item.context==="string"&&item.context.length<=8000&&typeof item.videoId==="string"&&item.videoId.length<=200&&Number.isFinite(item.at)&&item.at>=0;}
    const loaded=chrome.storage.local.get("words").then(saved=>{words=Array.isArray(saved.words)?saved.words.filter(valid).slice(0,5000).map(x=>({...x,definition:typeof x.definition==="string"?x.definition.slice(0,4000):"",mastered:x.mastered===true,dictionary:D.storedFor(x.dictionary)})):[];}).catch(()=>{if(active)$("#word-state").textContent="读取本地收藏失败。";});
    function url(entry){const u=new URL("https://www.youtube.com/watch");u.searchParams.set("v",entry.videoId);u.searchParams.set("t",String(Math.floor(entry.at))+"s");return u.href;}
    function same(a,b){return a.word.toLowerCase()===b.word.toLowerCase()&&a.videoId===b.videoId&&Math.abs(a.at-b.at)<1;}
    function list(){ $("#vocabulary").replaceChildren();for(const item of words.slice(-100).reverse()){const b=document.createElement("button");b.textContent=item.word+(item.mastered?" ✓":"");b.addEventListener("click",()=>open({...item}));$("#vocabulary").append(b);} }
    function open(entry,review=false){
      cancelQuery();
      reviewMode=review;
      draft=entry;panel.hidden=false;$("#word-title").textContent=entry.word;$("#word-context").textContent=entry.context||"此时间点没有原文句。";
      $("#definition").value=review?"":entry.definition||"";$("#definition").placeholder=review?"先回忆，再点击“显示我的释义”":"填写你自己的释义或笔记";
      $("#mastered").textContent=entry.mastered?"标记未掌握":"标记已掌握";$("#word-state").textContent=`原视频时间点：${root.YTDSCore.formatTime(entry.at,true)} · ${words.length} 条收藏`;
      $("#word-link").href=url(entry);$("#word-link").hidden=false;list();
      paintDictionary(review);
    }
    function paintDictionary(hide=false){
      $("#meanings").replaceChildren();$("#dictionary-source").hidden=true;$("#dictionary-license").hidden=true;
      if(hide){$("#dictionary-state").textContent="先回忆，再揭示中英文释义与笔记。";return;}
      const policy=D.selection({targetLanguage:api.context().targetLanguage||'zh-Hans',sourceLanguage:draft?.language||'und'});
      const data=D.storedFor(draft?.dictionary,policy);
      const rows=[];
      if(policy.primaryLanguage)rows.push([policy.primaryLanguage,policy.primaryLanguage==='zh'?'中文释义':'英文释义',true]);
      else rows.push(['target','目标语言释义（'+D.languageName(policy.targetLanguage)+'）',true]);
      if(policy.explanationLanguage&&!rows.some(row=>row[0]===policy.explanationLanguage))rows.push([policy.explanationLanguage,'英文解释（原文）',false]);
      if(!policy.explanationLanguage)rows.push(['source','原文解释（'+D.languageName(policy.sourceLanguage)+'）',false]);
      for(const [language,label,isTarget] of rows){
        const section=document.createElement('section');section.id='meanings-'+language;section.setAttribute('aria-label',label);
        const heading=document.createElement('h3');heading.textContent=label;section.append(heading);
        const entry=policy.explanationLanguage?data?.[language]:null;
        if(entry){
          for(const meaning of entry.meanings){const p=document.createElement('p');p.textContent=meaning;section.append(p);}
          const source=document.createElement('a');source.id='dictionary-source-'+language;source.textContent='维基词典条目 / 贡献者';source.href=entry.article;source.target='_blank';source.rel='noopener noreferrer';
          const licence=document.createElement('a');licence.id='dictionary-license-'+language;licence.textContent='CC BY-SA 4.0';licence.href=entry.licenseURL;licence.target='_blank';licence.rel='noopener noreferrer';section.append(source,document.createTextNode(' · '),licence);
          if(data.issues?.[language]){const warning=document.createElement('p');warning.textContent=data.issues[language];section.append(warning);}
        }else{const p=document.createElement('p');p.dataset.missing=language;p.textContent=policy.sourceIssue||(isTarget?policy.targetIssue:'')||data?.issues?.[language]||'尚无'+label+'，请主动查询。';section.append(p);}
        $('#meanings').append(section);
      }
      $('#dictionary-state').textContent='界面：简体中文 · 字幕目标：'+D.languageName(policy.targetLanguage)+' · 释义主语言：'+(policy.primaryLanguage?D.languageName(policy.primaryLanguage):'暂不支持')+'。 '+(data?.alignment||'查词仅发送单词；不会自动查询词本。');
    }
    function cancelQuery(){querySequence++;queryAbort?.abort();queryAbort=null;clearTimeout(queryTimer);queryTimer=0;}
    async function query({force=false}={}){
      if(!active||!draft)return;cancelQuery();const sequence=querySequence,entry=draft;
      try{
        const word=D.term(entry.word),policy=D.selection({targetLanguage:api.context().targetLanguage||'zh-Hans',sourceLanguage:entry.language||'und'}),key=D.cacheKey(word,policy);if(force)dictCache.delete(key);const cached=dictCache.get(key);let data=cached;
        if(!data){queryAbort=new AbortController();queryTimer=setTimeout(()=>queryAbort?.abort(),10000);$("#dictionary-state").textContent="正在查询中文释义与英文解释…";data=await D.lookupFor(word,{...policy,signal:queryAbort.signal});}
        if(!active||sequence!==querySequence||entry!==draft)return;
        clearTimeout(queryTimer);queryTimer=0;queryAbort=null;
        if(data[policy.explanationLanguage]&&(!policy.primaryLanguage||data[policy.primaryLanguage]))dictCache.set(key,data);
        const previous=D.storedFor(entry.dictionary);
        for(const language of ['zh','en'])if(!data[language]&&previous?.[language])data={...data,[language]:previous[language],issues:{...data.issues,[language]:"本次未取到新释义，保留此前收藏："+data.issues[language]}};
        draft.dictionary=data;while(dictCache.size>100)dictCache.delete(dictCache.keys().next().value);paintDictionary();
        const saved=words.findIndex(x=>same(x,entry));if(saved>=0){words[saved]={...words[saved],dictionary:data};persist();}
      }catch(error){if(active&&sequence===querySequence)$("#dictionary-state").textContent=error.name==='AbortError'?"词典查询超时或已取消，没有替代释义。":error.message;}
      finally{if(sequence===querySequence){clearTimeout(queryTimer);queryTimer=0;queryAbort=null;}}
    }
    function persist(){const snapshot=words.map(x=>({...x}));writes=writes.catch(()=>{}).then(()=>chrome.storage.local.set({words:snapshot})).then(()=>{if(active)$("#word-state").textContent=`已保存到本浏览器 · ${words.length} 条收藏`}).catch(()=>{if(active)$("#word-state").textContent="保存收藏失败，尚未写入本地存储。";});}
    async function save(){await loaded;if(!active||!draft)return;if(!reviewMode||$("#definition").value)draft.definition=$("#definition").value.slice(0,4000);const found=words.findIndex(x=>same(x,draft));if(found<0){if(words.length>=5000){$("#word-state").textContent="本地收藏已达 5000 条上限，请先导出备份。";return;}words.push({...draft});}else words[found]={...draft};persist();list();}
    $("#word-save").addEventListener("click",save);$("#word-close").addEventListener("click",()=>{cancelQuery();panel.hidden=true;});$("#dictionary-query").addEventListener("click",()=>query({force:true}));
    $("#mastered").addEventListener("click",async()=>{await loaded;if(!draft||!active)return;draft.mastered=!draft.mastered;$("#mastered").textContent=draft.mastered?"标记未掌握":"标记已掌握";save();});
    $("#reveal").addEventListener("click",()=>{if(draft){$("#definition").value=draft.definition||"";paintDictionary();}});
    $("#word-jump").addEventListener("click",()=>{if(draft){const current=api.context();if(current.id===draft.videoId)api.jump(draft);else $("#word-state").textContent="此词来自另一个视频，请点击“打开原视频时间点”。";}});
    $("#review").addEventListener("click",async()=>{await loaded;if(!active)return;const remaining=words.filter(x=>!x.mastered);if(!remaining.length){$("#word-state").textContent="暂无未掌握收藏。";return;}reviewIndex=(reviewIndex+1)%remaining.length;open({...remaining[reviewIndex]},true);});
    $("#word-json").addEventListener("click",async()=>{await loaded;if(active)api.download(JSON.stringify({version:4,definitionSource:"手动笔记与维基词典释义分别保存；词典内容依所附 CC BY-SA 4.0 许可",words:words.map(x=>({...x,url:url(x)}))},null,2),"YouTube-local-vocabulary.json","application/json");});
    $("#word-csv").addEventListener("click",async()=>{
      await loaded;if(!active)return;
      const cell=v=>'"'+String(v).replace(/^[\t\r\n ]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
      const rows=[['单词','我的笔记','中文释义','英文解释','中文来源','英文来源','中文许可','英文许可','中文许可链接','英文许可链接','中文缺失说明','英文缺失说明','原句','视频链接','秒','已掌握','释义目标代码','原文语言代码','目标词典支持状态','原文词典支持状态'],...words.map(x=>{
        const d=D.storedFor(x.dictionary);return [x.word,x.definition,d?.zh?.meanings.join('；')||'',d?.en?.meanings.join('; ')||'',d?.zh?.article||'',d?.en?.article||'',d?.zh?.license||'',d?.en?.license||'',d?.zh?.licenseURL||'',d?.en?.licenseURL||'',d?.issues.zh||'',d?.issues.en||'',x.context,url(x),x.at,x.mastered?'是':'否',d?.targetLanguage||'',d?.sourceLanguage||'',d?.targetIssue||'',d?.sourceIssue||''];
      })];
      api.download('\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),"YouTube-local-vocabulary.csv","text/csv;charset=utf-8");
    });
    const segmenter=typeof Intl.Segmenter==="function"?new Intl.Segmenter(undefined,{granularity:"word"}):null;
    function render(element,text,interactive,range=null){
      const contextKey=range?`${range.id}:${range.start}:${range.end}`:'';
      if(element.textContent===text&&element.dataset.interactive===String(interactive)&&element.dataset.contextKey===contextKey)return;
      element.dataset.interactive=String(interactive);element.dataset.contextKey=contextKey;element.replaceChildren();if(!interactive){element.textContent=text;return;}
      const segments=segmenter?[...segmenter.segment(text)].map(s=>({text:s.segment,word:s.isWordLike})):text.split(/(\p{L}[\p{L}\p{N}'’-]*)/gu).map(s=>({text:s,word:/\p{L}/u.test(s)}));
      for(const part of segments){if(!part.word){element.append(document.createTextNode(part.text));continue;}const b=document.createElement("button");b.className="word";b.textContent=part.text;b.title="收藏单词及原句";
        b.addEventListener("click",async e=>{e.stopPropagation();const c=api.context();api.pause?.();const at=range?Math.min(range.end-0.001,Math.max(range.start,c.at)):c.at;const entry={word:part.text.slice(0,200),context:(range?text:c.text||text).slice(0,8000),videoId:range?.id||c.id,at:Math.max(0,at),language:c.language,definition:"",dictionary:null,mastered:false,createdAt:new Date().toISOString()};await loaded;if(!active)return;const found=words.find(x=>same(x,entry));open(found?{...found}:entry);query();});element.append(b);}
    }
    return {render,languageChanged:()=>{cancelQuery();if(draft&&!panel.hidden)paintDictionary(reviewMode);},show:async()=>{await loaded;if(!active)return;panel.hidden=false;list();$("#word-state").textContent=`${words.length} 条本地收藏；点击字幕单词开始。`;},hide:()=>{cancelQuery();panel.hidden=true;},dispose:()=>{active=false;cancelQuery();panel.remove();words=[];draft=null;dictCache.clear();}};
  };
})(globalThis);
