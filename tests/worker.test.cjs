const { test }=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function worker(reply, failure=false) {
  const calls=[]; let listener;
  const chrome={action:{onClicked:{addListener:f=>listener=f},setBadgeText:async x=>calls.push(['badge',x]),setTitle:async x=>calls.push(['title',x])},tabs:{sendMessage:async()=>{if(reply) return reply; throw Error('absent');}},scripting:{executeScript:async x=>{calls.push(['inject',x]);if(failure)throw Error('denied');}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../extension/service-worker.js'),'utf8'),{chrome,URL,Set});
  return {calls,click:listener};
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
  assert.deepEqual(Array.from(inject[1][1].files),['core.js','playback.js','dictionary.js','learning.js','content.js']);
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
