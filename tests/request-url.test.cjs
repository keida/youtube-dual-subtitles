const {test}=require('node:test'),assert=require('node:assert/strict');
const {nativeURL}=require('../extension/request-url.js');
const track={languageCode:'en',baseUrl:'https://www.youtube.com/api/timedtext?v=A&lang=en'};
const entry=(query='',overrides={})=>({name:'https://www.youtube.com/api/timedtext?v=A&lang=en&fmt=json3&opaque=untouched'+query,decodedBodySize:100,startTime:10,...overrides});
test('完整复用当前视频已成功的原生请求，不修改授权参数',()=>{const e=entry();assert.equal(nativeURL(track,'A','',[e]),e.name);});
test('拒绝空响应、非同源、错误视频、错误轨和未知格式',()=>{for(const e of [entry('',{decodedBodySize:0}),entry('',{name:'https://evil.test/api/timedtext?v=A&lang=en&fmt=json3'}),entry('&v=B'),entry('&lang=fr'),entry('&kind=asr'),entry('&name=other'),entry('',{name:entry().name.replace('fmt=json3','fmt=unknown')})])assert.equal(nativeURL(track,'A','',[e]),null);});
test('目标语言必须与真实观察到的完整请求一致，不转移参数',()=>{const e=entry('&tlang=zh-Hans');assert.equal(nativeURL(track,'A','zh-Hans',[e]),e.name);assert.equal(nativeURL(track,'A','fr',[e]),null);assert.equal(nativeURL(track,'A','',[e]),null);});
test('优先最新成功请求；无数据时不推测地址',()=>{const older=entry('&old=1',{startTime:1}),newer=entry('&new=1',{startTime:2});assert.equal(nativeURL(track,'A','',[older,newer]),newer.name);assert.equal(nativeURL(track,'A','',[]),null);assert.equal(nativeURL(track,'A','',null),null);});
