const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../extension/core.js');
const meta = { defaultIndex: 0, tracks: [{languageCode:'en', kind:'asr', isTranslatable:true}, {languageCode:'fr', kind:'', isTranslatable:true}], languages:[{languageCode:'zh-Hans'}] };
test('上下默认位置及恶意设置边界', () => {
  const s=C.settings({top:{x:999,y:90,size:NaN,color:'red;position:fixed',opacity:-3},bottom:{y:0,size:500}});
  assert.deepEqual(s.top,{x:90,y:35,size:26,color:'#000000',opacity:0});
  assert.equal(s.bottom.y,65); assert.equal(s.bottom.size,64);
  assert.equal(C.settings().top.y,10); assert.equal(C.settings().bottom.y,88);
});
test('仅允许普通 YouTube 页面', () => {
  assert.equal(C.videoId('https://www.youtube.com/watch?v=abc'),'abc');
  for(const url of ['https://evil.test/watch?v=a','https://www.youtube.com/shorts/a','http://www.youtube.com/watch?v=a','bad']) assert.equal(C.videoId(url),'');
});
test('保留播放器默认原文轨及手动选择', () => {
  assert.deepEqual(C.chooseTracks(meta),{source:0,translation:0,mode:'auto'});
  assert.deepEqual(C.chooseTracks(meta,1),{source:1,translation:1,mode:'auto'});
  assert.equal(C.chooseTracks({...meta,defaultIndex:99}).source,1);
  assert.equal(C.chooseTracks(meta,99).source,0);
});
test('已有简中优先、明确同语言、无翻译不伪造', () => {
  const m={...meta,tracks:[...meta.tracks,{languageCode:'zh-Hans'}]};
  assert.deepEqual(C.chooseTracks(m),{source:0,translation:2,mode:'track'});
  assert.equal(C.chooseTracks(m,2).mode,'same');
  assert.equal(C.chooseTracks({...meta,languages:[]}).mode,'unavailable');
  assert.equal(C.chooseTracks({...meta,tracks:[{languageCode:'en',isTranslatable:false}]}).mode,'unavailable');
  assert.throws(()=>C.chooseTracks({tracks:[]}),/没有可用字幕/);
  assert.equal(C.simplified('zh-Hant'),false); assert.equal(C.simplified('zh-CN'),true);
});
test('JSON3 时间边界、跳转和空白间隙', () => {
  const cues=C.parseCaptions(JSON.stringify({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:' A '}]},{tStartMs:5000,dDurationMs:1000,segs:[{utf8:'B'}]}]}));
  for(const [t,expected] of [[0,''],[1,'A'],[2.999,'A'],[3,''],[5,'B'],[6,''],[1.5,'A']]) assert.equal(C.cueAt(cues,t),expected);
});
test('ASR 滚动追加不重复堆叠；剔除坏时间', () => {
  const cues=C.jsonCues({events:[{tStartMs:0,dDurationMs:3000,wWinId:1,segs:[{utf8:'Hello'}]},{tStartMs:1000,dDurationMs:2000,wWinId:1,aAppend:1,segs:[{utf8:' world'}]},{tStartMs:-1,dDurationMs:5,segs:[{utf8:'bad'}]}]});
  assert.equal(cues.length,2); assert.equal(C.cueAt(cues,.5),'Hello'); assert.equal(C.cueAt(cues,1.5),'Hello world');
});
test('格式与大小校验，字幕文本不解释为代码', () => {
  assert.throws(()=>C.parseCaptions(''),/字幕为空/); assert.throws(()=>C.parseCaptions('{bad'));
  assert.throws(()=>C.parseCaptions('{"events":null}'),/格式/);
  assert.throws(()=>C.parseCaptions('x'.repeat(8*1024*1024+1)),/过大/);
  assert.throws(()=>C.parseCaptions('<!DOCTYPE a><a/>'),/格式/);
  assert.throws(()=>C.parseCaptions('{bad'),/字幕格式不支持/);
  assert.equal(C.settings({top:{color:['#ffffff']}}).top.color,'#000000');
  assert.deepEqual(C.jsonCues({events:[null,{segs:[null],tStartMs:0,dDurationMs:1000}]}),[]);
  assert.equal(C.jsonCues({events:[{tStartMs:0,dDurationMs:1000,segs:[{utf8:'<img onerror=alert(1)>'}]}]})[0].text,'<img onerror=alert(1)>');
});
test('偏好和非中文目标语言选择',()=>{
  const p=C.preferences({sourceOffset:100,translationOffset:-99,targetLanguage:'https://evil.test',topVisible:false,swap:true});assert.equal(p.sourceOffset,30);assert.equal(p.translationOffset,-30);assert.equal(p.targetLanguage,'zh-Hans');assert.equal(p.topVisible,false);
  const m={...meta,languages:[{languageCode:'fr'}]};assert.equal(C.chooseTracks(m,0,'fr').mode,'track');assert.equal(C.chooseTracks(m,0,'de').mode,'unavailable');
  assert.equal(C.chooseTracks({...m,tracks:[m.tracks[0]]},0,'fr').mode,'auto');
});
test('SRT/VTT 导入、标记文本、无效文件和时间校验',()=>{
  const s='1\r\n00:00:01,250 --> 00:00:03,500\r\n<i>Hello</i> &amp; world\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\nSecond';
  assert.deepEqual(C.parseFile(s,'test.srt')[0],{start:1.25,end:3.5,text:'Hello & world'});
  assert.equal(C.parseFile('WEBVTT\n\nNOTE comment\nhi\n\na\n00:01.000 --> 00:02.000 align:start\nText','test.vtt')[0].text,'Text');
  for(const raw of ['1\n00:00:03,000 --> 00:00:01,000\nBad','1\n00:99:00,000 --> 00:99:01,000\nBad','no cues'])assert.throws(()=>C.parseFile(raw,'x.srt'));
  assert.throws(()=>C.parseFile('no header','x.vtt'));assert.throws(()=>C.parseFile(s,'x.txt'));
});
test('SRT/VTT 导出往返、偏移和负时间裁切',()=>{
  const cues=[{start:1.25,end:3.5,text:'Hello\nworld'},{start:4,end:5,text:'Second'}];
  for(const format of ['srt','vtt'])assert.deepEqual(C.parseFile(C.exportFile(cues,format,1),'x.'+format),cues.map(c=>({...c,start:c.start+1,end:c.end+1})));
  const clipped=C.parseFile(C.exportFile(cues,'srt',-4.5),'x.srt');assert.equal(clipped.length,1);assert.equal(clipped[0].start,0);assert.equal(clipped[0].end,.5);
  assert.throws(()=>C.exportFile(cues,'vtt',-30));assert.equal(C.cueIndex(cues,0),-1);assert.equal(C.formatTime(3661.125,true),'01:01:01.125');
});
test('会话缓存过期、删除和关闭清理',()=>{
  let now=0;const cache=C.captionCache({ttlMs:100,now:()=>now});const data={source:[{start:0,end:1,text:'A'}],translation:[]};cache.set('A',data);assert.deepEqual(cache.get('A'),data);now=101;assert.equal(cache.get('A'),null);cache.set('A',data);cache.delete('A');assert.equal(cache.get('A'),null);cache.set('A',data);cache.clear();assert.equal(cache.get('A'),null);
});
test('会话缓存有限条数和体积，按最近使用淘汰',()=>{
  const cache=C.captionCache({maxEntries:2,maxBytes:100});cache.set('A','a');cache.set('B','b');cache.get('A');cache.set('C','c');assert.equal(cache.get('B'),null);assert.equal(cache.get('A'),'a');assert.equal(cache.set('huge','x'.repeat(101)),false);assert.equal(cache.get('huge'),null);
});
