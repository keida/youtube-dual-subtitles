(function(root){
  "use strict";
  const licenseURL="https://creativecommons.org/licenses/by-sa/4.0/";
  function term(word){const value=String(word||"").trim().replace(/[’]/g,"'").toLowerCase();if(!/^[a-z][a-z'-]{0,63}$/.test(value))throw new Error("当前在线词典仅查询英文单词；其他词语可填写笔记。");return value;}
  function cleanWiki(text){
    let out=text.replace(/<!--[\s\S]*?-->/g,"").replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,"");
    out=out.replace(/\[\[([^\]]+)\]\]/g,(_,value)=>value.split('|').at(-1));
    for(let i=0;i<4;i++)out=out.replace(/\{\{([^{}]+)\}\}/g,(_,body)=>{const p=body.split('|'),name=p[0].toLowerCase().trim();return ['l','m','link','mention'].includes(name)?p[2]||'':name==='zh-l'||name==='gloss'||name==='non-gloss definition'?p[1]||'':'';});
    return out.replace(/\{\{[\s\S]*?\}\}/g,'').replace(/\[https?:\/\/[^\s\]]+(?:\s+([^\]]+))?\]/g,(_,label)=>label||'').replace(/<[^>]*>/g,'').replace(/'{2,}/g,'').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[s]).replace(/\s+/g,' ').trim().slice(0,400);
  }
  function definitions(wikitext){
    if(typeof wikitext!=="string"||wikitext.length>512*1024)return [];
    let english=false;const found=[];
    for(const line of wikitext.split(/\r?\n/)){
      const heading=/^==(?!=)\s*(.*?)\s*==(?!=)\s*$/.exec(line);
      if(heading){english=/^(English|英語|英语|\{\{(?:lang|語言|语言)\|en\}\})$/i.test(heading[1]);continue;}
      const def=english&&/^#(?![:*#])\s*(.+)$/.exec(line);
      if(def){const value=cleanWiki(def[1]);if(value&&!found.includes(value))found.push(value);if(found.length>=4)break;}
    }
    return found;
  }
  async function lookup(word,{fetchFn=root.fetch.bind(root),signal,languages=['zh','en']}={}){
    const value=term(word);
    for(const language of languages){
      const url=new URL(`https://${language}.wiktionary.org/w/api.php`);
      for(const [key,item] of Object.entries({action:'parse',page:value,prop:'wikitext',format:'json',formatversion:'2',redirects:'1',origin:'*'}))url.searchParams.set(key,item);
      let response;
      try{response=await fetchFn(url.href,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal});}
      catch(error){if(error.name==='AbortError')throw error;throw new Error("词典请求失败：网络或跨域访问不可用。没有生成替代释义。");}
      if(response.status===429)throw new Error("词典服务暂时限流，请稍后再试。");
      if(!response.ok)throw new Error(`词典请求失败（HTTP ${response.status}）。`);
      if(Number(response.headers.get('content-length'))>512*1024)throw new Error("词条响应过大，请查看原词条。");
      const raw=await response.text();if(raw.length>512*1024)throw new Error("词条响应过大，请查看原词条。");
      let data;try{data=JSON.parse(raw);}catch{throw new Error("词典响应格式无效。");}
      if(data.error){if(['missingtitle','invalidtitle'].includes(data.error.code))continue;throw new Error("词典暂时无法提供此词条。");}
      const meanings=definitions(data.parse?.wikitext);if(!meanings.length)continue;
      const title=typeof data.parse.title==='string'?data.parse.title.slice(0,200):value;
      return {meanings,partsOfSpeech:parts(data.parse?.wikitext),language,article:`https://${language}.wiktionary.org/wiki/${encodeURIComponent(title)}`,provider:'维基词典贡献者',license:'CC BY-SA 4.0',licenseURL,modified:'仅清理维基标记，未机器翻译',fetchedAt:new Date().toISOString()};
    }
    throw new Error("维基词典暂无可读取释义；可查看原词条或填写自己的笔记。");
  }
  function stored(value){
    if(!value||!['zh','en'].includes(value.language)||!Array.isArray(value.meanings))return null;
    let u;try{u=new URL(value.article);}catch{return null;}
    if(u.origin!==`https://${value.language}.wiktionary.org`||u.username||u.password||!u.pathname.startsWith('/wiki/'))return null;
    const meanings=value.meanings.filter(x=>typeof x==='string'&&x.trim()).slice(0,4).map(x=>x.slice(0,400));if(!meanings.length)return null;
    return {...value,meanings,article:u.href,provider:'维基词典贡献者',license:'CC BY-SA 4.0',licenseURL};
  }
  const alignment="中英文来自同一英文词的独立词条，词义顺序不一定一一对应；未机器翻译。";
  const partNames={noun:'名词',verb:'动词',adjective:'形容词',adverb:'副词',pronoun:'代词',preposition:'介词',conjunction:'连词',interjection:'感叹词','proper noun':'专有名词'};
  const partAliases={名詞:'noun',名词:'noun',動詞:'verb',动词:'verb',形容詞:'adjective',形容词:'adjective',副詞:'adverb',副词:'adverb',代詞:'pronoun',代词:'pronoun',介詞:'preposition',介词:'preposition',連詞:'conjunction',连词:'conjunction',感嘆詞:'interjection',感叹词:'interjection',專有名詞:'proper noun',专有名词:'proper noun'};
  function parts(wikitext){
    if(typeof wikitext!=='string'||wikitext.length>512*1024)return [];
    let english=false;const result=new Set();
    for(const line of wikitext.split(/\r?\n/)){
      const language=/^==(?!=)\s*(.*?)\s*==(?!=)\s*$/.exec(line);
      if(language){english=/^(English|英語|英语|\{\{(?:lang|語言|语言)\|en\}\})$/i.test(language[1]);continue;}
      if(!english)continue;
      const heading=/^={3,6}\s*([^=]+?)\s*={3,6}\s*$/.exec(line);if(!heading)continue;
      const name=heading[1].trim().toLowerCase(),part=partAliases[name]||name;if(partNames[part])result.add(part);
    }
    return [...result];
  }
  function alignmentFor(zh,en){
    if(!zh||!en)return alignment;
    const a=Array.isArray(zh.partsOfSpeech)?zh.partsOfSpeech.filter(x=>partNames[x]):[],b=Array.isArray(en.partsOfSpeech)?en.partsOfSpeech.filter(x=>partNames[x]):[];
    if(!a.length||!b.length)return alignment+" 词性信息不足，未逐义配对。";
    const common=a.filter(x=>b.includes(x));
    return alignment+(common.length?" 共同词性："+common.map(x=>partNames[x]).join('、')+"。":" 两个条目的词性不同，不按对应词义排列。");
  }
  async function lookupPair(word,{fetchFn=root.fetch.bind(root),signal}={}){
    const value=term(word),pair={version:2,word:value,zh:null,en:null,issues:{zh:"",en:""},alignment};
    for(const language of ['zh','en']){
      if(signal?.aborted)throw new DOMException("Aborted","AbortError");
      try{
        const entry=await lookup(value,{fetchFn,signal,languages:[language]});
        const title=decodeURIComponent(new URL(entry.article).pathname.slice('/wiki/'.length));
        if(term(title)!==value)throw new Error("词条重定向至不同单词，未作为本词释义；请查看原站确认。");
        const meanings=entry.meanings.filter(text=>language==='zh'?/\p{Script=Han}/u.test(text):/[A-Za-z]{2}/.test(text));
        if(!meanings.length)throw new Error(language==='zh'?"未找到可读取的中文释义。":"未找到可读取的英文解释。");
        pair[language]={...entry,meanings};
      }catch(error){if(error.name==='AbortError')throw error;pair.issues[language]=String(error.message).slice(0,300);}
    }
    pair.alignment=alignmentFor(pair.zh,pair.en);return pair;
  }
  function storedPair(value){
    if(!value)return null;
    if(value.version===2){
      const zh=stored(value.zh),en=stored(value.en);
      const chinese=zh?.language==='zh'?zh:null,english=en?.language==='en'?en:null;
      return {version:2,word:typeof value.word==='string'?value.word.slice(0,64):'',zh:chinese,en:english,issues:{zh:typeof value.issues?.zh==='string'?value.issues.zh.slice(0,300):'尚无中文释义，请主动查询。',en:typeof value.issues?.en==='string'?value.issues.en.slice(0,300):'尚无英文解释，请主动查询。'},alignment:alignmentFor(chinese,english)};
    }
    // Migrate the old single-language entry in memory without losing its content,
    // note, source or licence, and never make a network request during migration.
    const legacy=stored(value);if(!legacy)return null;
    return {version:2,word:'',zh:legacy.language==='zh'?legacy:null,en:legacy.language==='en'?legacy:null,issues:{zh:legacy.language==='zh'?'':'旧收藏尚无中文释义，请主动更新。',en:legacy.language==='en'?'':'旧收藏尚无英文解释，请主动更新。'},alignment};
  }
  function selection({targetLanguage='zh-Hans',sourceLanguage='en'}={}){
    const target=String(targetLanguage).slice(0,64),source=String(sourceLanguage).slice(0,64);
    const primaryLanguage=/^zh(?:-(?:hans|hant|cn|tw|hk))?$/i.test(target)?'zh':/^en(?:-[a-z]{2,8})?$/i.test(target)?'en':null;
    const explanationLanguage=/^en(?:-[a-z]{2,8})?$/i.test(source)?'en':null;
    return {targetLanguage:target,sourceLanguage:source,primaryLanguage,explanationLanguage,targetIssue:primaryLanguage?'':`字幕目标 ${target} 的词典释义暂不支持；目前仅提供中文和英文。`,sourceIssue:explanationLanguage?'':`原文语言 ${source} 暂不支持查词；目前仅解析英文词条，不把其他语言同形词当作英文。`};
  }
  function languageName(code){try{return new Intl.DisplayNames([root.YTDSI18n?.getLanguage?.()||'zh-Hans'],{type:'language'}).of(code)||code;}catch{return code;}}
  async function languageRequest(word,{language,fetchFn,signal,timeoutMs}){
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    const controller=new AbortController();let timer,onAbort;
    const deadline=new Promise((_,reject)=>{
      onAbort=()=>{const error=new DOMException('Aborted','AbortError');reject(error);controller.abort(error);};
      signal?.addEventListener('abort',onAbort,{once:true});
      timer=setTimeout(()=>{const error=new DOMException('Dictionary language request timed out','TimeoutError');reject(error);controller.abort(error);},Math.min(15000,Math.max(1,Number(timeoutMs)||5000)));
    });
    try{return await Promise.race([lookup(word,{fetchFn,signal:controller.signal,languages:[language]}),deadline]);}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
  }
  async function lookupFor(word,{targetLanguage='zh-Hans',sourceLanguage='en',fetchFn=root.fetch.bind(root),signal,timeoutMs=5000}={}){
    const policy=selection({targetLanguage,sourceLanguage}),result={version:3,word:String(word).slice(0,200),zh:null,en:null,issues:{zh:'',en:''},...policy,alignment};
    if(!policy.explanationLanguage)return storedFor(result);
    const value=term(word);result.word=value;
    for(const language of new Set([policy.primaryLanguage,policy.explanationLanguage].filter(Boolean))){
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      try{
        const entry=await languageRequest(value,{language,fetchFn,signal,timeoutMs});
        const title=decodeURIComponent(new URL(entry.article).pathname.slice('/wiki/'.length));
        if(term(title)!==value)throw new Error('词条重定向至不同单词，未作为本词释义。');
        const meanings=entry.meanings.filter(text=>language==='zh'?/\p{Script=Han}/u.test(text):/[A-Za-z]{2}/.test(text));
        if(!meanings.length)throw new Error(language==='zh'?'未找到可读取的中文释义。':'未找到可读取的英文解释。');
        result[language]={...entry,meanings};
      }catch(error){if(error.name==='AbortError'||signal?.aborted)throw new DOMException('Aborted','AbortError');result.issues[language]=error.name==='TimeoutError'?'此语言词典查询超时，已保留其他可用释义。':String(error.message).slice(0,300);}
    }
    result.alignment=alignmentFor(result.zh,result.en);return storedFor(result);
  }
  function storedFor(value,options={}){
    if(!value)return null;
    const pair=storedPair(value.version===3?{...value,version:2}:value);if(!pair)return null;
    const policy=selection({targetLanguage:options.targetLanguage??value.targetLanguage??'zh-Hans',sourceLanguage:options.sourceLanguage??value.sourceLanguage??'en'});
    const explanation=!policy.explanationLanguage?'当前原文语言没有受支持的词典解释。':policy.primaryLanguage==='en'?'英文释义同时作为英文原文解释，不生成额外翻译。':!policy.primaryLanguage?'仅保留英文原文解释；目标语言词典暂不支持。':alignmentFor(pair.zh,pair.en);
    return {...pair,version:3,...policy,alignment:explanation};
  }
  function cacheKey(word,options){const policy=selection(options);return JSON.stringify([term(word),policy.sourceLanguage,policy.targetLanguage]);}
  const api={term,definitions,cleanWiki,lookup,stored,lookupPair,storedPair,parts,alignmentFor,selection,lookupFor,storedFor,cacheKey,languageName,licenseURL};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YTDSDictionary=api;
})(globalThis);
