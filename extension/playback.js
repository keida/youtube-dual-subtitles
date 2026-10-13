(function(root){
  "use strict";
  function nextEnd(cues,time,offset=0){
    let lo=0,hi=cues.length-1,index=-1;
    while(lo<=hi){const mid=(lo+hi)>>1;if(cues[mid].start+offset<=time){index=mid;lo=mid+1;}else hi=mid-1;}
    for(let i=Math.max(0,index);i<cues.length;i++)if(cues[i].end+offset>time+0.003)return cues[i].end+offset;
    return null;
  }
  function controller(options){
    const later=options.setTimeout||root.setTimeout.bind(root),clear=options.clearTimeout||root.clearTimeout.bind(root);
    let timer=null,target=null,disposed=false,watched=null,internalSeek=false;
    function cancel(){if(timer!==null)clear(timer);timer=null;target=null;}
    function check(){
      if(disposed)return;
      const video=options.video();
      if(!video||video.paused||video.seeking||options.blocked()||(!options.enabled()&&options.replay()===null)){cancel();return;}
      if(target===null)target=options.replay()??nextEnd(options.cues(),video.currentTime,options.offset());
      if(target===null)return;
      if(video.currentTime>=target){
        const end=target;cancel();options.clearReplay();video.pause();
        // Keep the last sentence visible and correct late scheduling, rather than staying in the next sentence.
        video.currentTime=Math.max(0,end-0.001);
        return;
      }
      if(timer===null){const delay=Math.min(250,Math.max(5,(target-video.currentTime)*1000/(video.playbackRate||1)));timer=later(()=>{timer=null;check();},delay);}
    }
    function refresh(){cancel();check();}
    function seeking(){cancel();if(!internalSeek)options.clearReplay();}
    function seeked(){internalSeek=false;refresh();}
    function reschedule(){if(timer!==null)clear(timer);timer=null;check();}
    const handlers={playing:refresh,pause:cancel,seeking,seeked,ratechange:reschedule,timeupdate:check,waiting:check,ended(){cancel();options.clearReplay();}};
    function bind(video){
      if(watched){for(const [event,handler] of Object.entries(handlers))watched.removeEventListener(event,handler);}
      cancel();internalSeek=false;watched=video;
      if(watched){for(const [event,handler] of Object.entries(handlers))watched.addEventListener(event,handler);}
    }
    function seek(time){const video=options.video();if(!video||disposed)return;cancel();internalSeek=true;video.currentTime=Math.max(0,time);if(!video.seeking)internalSeek=false;}
    return {check,refresh,cancel,bind,seek,dispose(){disposed=true;bind(null);}};
  }
  const api={nextEnd,controller};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.YTDSPlayback=api;
})(globalThis);
