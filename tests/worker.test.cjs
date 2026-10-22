const { test }=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function worker(reply, failure=false) {
  const calls=[],saved={}; let listener,messageListener;
  const chrome={runtime:{id:'fixture-extension',onMessage:{addListener:f=>messageListener=f}},i18n:{getUILanguage:()=> 'zh-CN'},storage:{local:{get:async()=>structuredClone(saved),set:async values=>Object.assign(saved,structuredClone(values))}},action:{onClicked:{addListener:f=>listener=f},setBadgeText:async x=>calls.push(['badge',x]),setTitle:async x=>calls.push(['title',x])},tabs:{sendMessage:async()=>{if(reply) return reply; throw Error('absent');}},scripting:{executeScript:async x=>{calls.push(['inject',x]);if(failure)throw Error('denied');}}};
  const context=vm.createContext({chrome,URL,Set,TextEncoder,TextDecoder,AbortController,DOMException,setTimeout,clearTimeout,structuredClone,crypto:require('node:crypto').webcrypto});
  context.importScripts=(...files)=>{for(const file of files)vm.runInContext(fs.readFileSync(require.resolve('../extension/'+file),'utf8'),context);};
  vm.runInContext(fs.readFileSync(require.resolve('../extension/service-worker.js'),'utf8'),context);
  return {calls,saved,click:listener,message:(message,sender={id:'fixture-extension',tab:{url:'https://www.youtube.com/watch?v=fixture'}})=>new Promise(resolve=>messageListener(message,sender,resolve))};
}
test('MV3 最小权限与零持久域权限',()=>{
  const m=require('../extension/manifest.json'); assert.equal(m.manifest_version,3);
  assert.deepEqual(m.permissions,['activeTab','scripting','storage']);
  for(const k of ['host_permissions','content_scripts','web_accessible_resources','externally_connectable']) assert.equal(m[k],undefined);
});
test('正常点击依次注入 MAIN 与隔离世界',async()=>{
  const w=worker(); await w.click({id:1,url:'https://www.youtube.com/watch?v=abc'});
  const inject=w.calls.filter(c=>c[0]==='inject'); assert.equal(inject.length,2);
  assert.equal(inject[0][1].world,'MAIN'); assert.deepEqual(Array.from(inject[0][1].files),['request-url.js','native-loader.js','bridge.js']);
  assert.deepEqual(Array.from(inject[1][1].files),['core.js','playback.js','dictionary.js','i18n.js','learning.js','content.js']);
});
test('后台词本接口拒绝其他来源且正常处理两个并发新增',async()=>{
  const w=worker();const denied=await w.message({type:'YTDS_VOCABULARY',operation:'list'},{id:'foreign',tab:{url:'https://www.youtube.com/watch?v=x'}});assert.equal(denied.ok,false);assert.equal(denied.code,'FORBIDDEN');
  const entry=(word,at)=>({word,context:'Original sentence',videoId:'fixture',at,language:'en',definition:'my note',mastered:false});
  const results=await Promise.all([w.message({type:'YTDS_VOCABULARY',operation:'upsert',entry:entry('alpha',1)}),w.message({type:'YTDS_VOCABULARY',operation:'upsert',entry:entry('beta',2)})]);
  assert.ok(results.every(x=>x.ok));assert.deepEqual(w.saved.words.map(x=>x.word).sort(),['alpha','beta']);
});
test('关闭、受限页面及非 YouTube 页面不注入',async()=>{
  const w=worker({disabled:true}); await w.click({id:1,url:'https://www.youtube.com/watch?v=abc'});
  assert.equal(w.calls.length,0);
  for(const url of ['chrome://extensions','https://evil.test/watch?v=x','https://www.youtube.com/shorts/abc']) {
    const x=worker(); await x.click({id:1,url}); assert.equal(x.calls.some(c=>c[0]==='inject'),false);
  }
});
test('快速重复点击串行化、注入失败显示真实提示',async()=>{
  const w=worker(); await Promise.all([w.click({id:1,url:'https://www.youtube.com/watch?v=a'}),w.click({id:1,url:'https://www.youtube.com/watch?v=a'})]);
  assert.equal(w.calls.filter(c=>c[0]==='inject').length,2);
  const f=worker(null,true); await f.click({id:1,url:'https://www.youtube.com/watch?v=a'});
  assert.ok(f.calls.some(c=>c[0]==='badge'&&c[1].text==='!'));
});
