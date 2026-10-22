const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../extension/core.js'),D=require('../extension/dictionary.js');
test('重叠字幕在短句结束后继续显示长句，空档与末尾准确',()=>{
  const cues=C.parseFile('1\n00:00:00,000 --> 00:00:10,000\nLong\n\n2\n00:00:02,000 --> 00:00:03,000\nShort','overlap.srt');
  assert.equal(C.cueAt(cues,2.5),'Long\nShort');assert.deepEqual(C.cueRangeAt(cues,2.5),{start:0,end:10});
  assert.equal(C.cueAt(cues,4),'Long');assert.equal(C.cueAt(cues,10),'');assert.equal(C.cueRangeAt(cues,10),null);
  assert.deepEqual(C.activeCuesAt(cues,4),[cues[0]]);assert.equal(C.cueAt(cues,-1),'');
});
test('重叠内容去重且独立数组不会共用索引',()=>{
  const a=[{start:0,end:10,text:'same'},{start:1,end:2,text:'same'}],b=[{start:0,end:1,text:'other'}];
  assert.equal(C.cueAt(a,1.5),'same');assert.equal(C.cueAt(b,1.5),'');assert.equal(C.cueAt(a,8),'same');
});
test('界面偏好有独立自动默认，非法值不改变字幕默认',()=>{
  assert.equal(C.preferences().uiLanguage,'auto');assert.equal(C.preferences({uiLanguage:'en'}).uiLanguage,'en');assert.equal(C.preferences({uiLanguage:'fr'}).uiLanguage,'auto');
  assert.equal(C.preferences({uiLanguage:'en'}).targetLanguage,'zh-Hans');
});
function fetchFixture(stall){return async(url,{signal})=>{const u=new URL(url),lang=u.hostname.split('.')[0];if(lang===stall)return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));return new Response(JSON.stringify({parse:{title:'original',wikitext:lang==='zh'?'==英語==\n===形容詞===\n# 原始的':'==English==\n===Adjective===\n# Existing at the beginning.'}}),{headers:{'content-type':'application/json'}});};}
test('单站超时保留另一种语言已取得结果，反向亦成立',async()=>{
  const zh=await D.lookupFor('original',{fetchFn:fetchFixture('en'),timeoutMs:15});assert.equal(zh.zh.meanings[0],'原始的');assert.equal(zh.en,null);assert.match(zh.issues.en,/超时/);
  const en=await D.lookupFor('original',{fetchFn:fetchFixture('zh'),timeoutMs:15});assert.equal(en.zh,null);assert.match(en.en.meanings[0],/Existing/);assert.match(en.issues.zh,/超时/);
});
test('主动取消仍丢弃结果，并中止等待的站点',async()=>{
  const controller=new AbortController();const result=D.lookupFor('original',{fetchFn:fetchFixture('en'),signal:controller.signal,timeoutMs:1000});setTimeout(()=>controller.abort(),10);await assert.rejects(result,{name:'AbortError'});
});
