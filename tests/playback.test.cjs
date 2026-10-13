const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../extension/playback.js');
const cues=[{start:194.896,end:201.016,text:'A'},{start:201.016,end:203,text:'B'}];
class Video {
  constructor(){this.currentTime=194.896;this.paused=false;this.seeking=false;this.playbackRate=1;this.listeners=new Map();this.pauses=0;}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type){for(const fn of this.listeners.get(type)||[])fn();}
  pause(){this.paused=true;this.pauses++;this.emit('pause');}
}
function harness(){let v=new Video(),enabled=true,blocked=false,replay=null,clock=0,serial=0;const timers=new Map();const control=P.controller({video:()=>v,cues:()=>cues,offset:()=>0,enabled:()=>enabled,blocked:()=>blocked,replay:()=>replay,clearReplay:()=>replay=null,setTimeout:(fn,delay)=>{timers.set(++serial,{fn,at:clock+delay});return serial},clearTimeout:id=>timers.delete(id)});control.bind(v);return {get v(){return v},control,timers,setEnabled:x=>enabled=x,setBlocked:x=>blocked=x,setReplay:x=>replay=x,getReplay:()=>replay,replace:x=>{v=x;control.bind(v)},advance(ms,run=true){clock+=ms;if(!v.paused&&!v.seeking&&!blocked)v.currentTime+=ms/1000*v.playbackRate;if(run){for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}}}};}
test('根据字幕和偏移选句末，间隙从下一句继续',()=>{assert.equal(P.nextEnd(cues,195),201.016);assert.equal(P.nextEnd(cues,201.015),203);assert.equal(P.nextEnd(cues,0,2),203.016);assert.equal(P.nextEnd(cues,204),null);});
test('独立计时无需渲染帧；延迟 0.88 秒后校正到句末',()=>{const h=harness();h.control.refresh();h.advance(7000);assert.equal(h.v.paused,true);assert.ok(Math.abs(h.v.currentTime-201.016)<.002);assert.equal(h.v.pauses,1);assert.equal(h.timers.size,0);h.control.dispose();});
test('timeupdate 不丢弃已经武装的句末',()=>{const h=harness();h.control.refresh();h.advance(7000,false);h.v.emit('timeupdate');assert.equal(h.v.paused,true);assert.ok(Math.abs(h.v.currentTime-201.016)<.002);h.control.dispose();});
test('倍速计时与缓冲时媒体时间不提前暂停',()=>{const h=harness();h.v.playbackRate=2;h.control.refresh();h.setBlocked(true);h.advance(5000);assert.equal(h.v.paused,false);h.setBlocked(false);h.control.refresh();h.advance(3060);assert.equal(h.v.paused,true);assert.ok(Math.abs(h.v.currentTime-201.016)<.002);h.control.dispose();});
test('手动 seek 不回拉旧句；程序重播 seek 保留结束点',()=>{const h=harness();h.control.refresh();h.v.seeking=true;h.v.emit('seeking');h.v.currentTime=500;h.v.seeking=false;h.v.emit('seeked');h.control.check();assert.equal(h.v.currentTime,500);assert.equal(h.v.paused,false);h.setEnabled(false);h.v.seeking=true;h.control.seek(194.896);h.setReplay(201.016);h.v.emit('seeking');assert.equal(h.getReplay(),201.016);h.v.seeking=false;h.v.emit('seeked');h.advance(7000);assert.equal(h.v.paused,true);h.control.dispose();});
test('取消、关闭和播放器替换清理计时与全部媒体监听',()=>{const h=harness(),old=h.v;h.control.refresh();h.setEnabled(false);h.control.refresh();assert.equal(h.timers.size,0);h.replace(new Video());assert.equal([...old.listeners.values()].reduce((n,s)=>n+s.size,0),0);h.setEnabled(true);h.control.refresh();h.control.dispose();assert.equal(h.timers.size,0);assert.equal([...h.v.listeners.values()].reduce((n,s)=>n+s.size,0),0);});
