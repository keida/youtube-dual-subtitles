(function(root){
  "use strict";
  // Reuse only a complete request already made successfully by YouTube's player.
  // Never create, transplant, persist, or log its opaque authorization parameters.
  function nativeURL(track,id,target,entries){
    let base;
    try {base=new URL(track.baseUrl);}catch{return null;}
    const lang=base.searchParams.get("lang")||track.languageCode;
    const kind=base.searchParams.get("kind")||"",name=base.searchParams.get("name")||"";
    const recent=Array.isArray(entries)?entries.slice(-2000).sort((a,b)=>(b.startTime||0)-(a.startTime||0)):[];
    for(const entry of recent){
      if(!entry||!(entry.decodedBodySize>0)||typeof entry.name!=="string")continue;
      let u;try{u=new URL(entry.name);}catch{continue;}
      if(u.origin!=="https://www.youtube.com"||u.pathname!=="/api/timedtext"||u.username||u.password)continue;
      if(["v","lang","kind","name","tlang","fmt"].some(key=>u.searchParams.getAll(key).length>1))continue;
      if(u.searchParams.get("v")!==id||u.searchParams.get("lang")!==lang||(u.searchParams.get("kind")||"")!==kind||(u.searchParams.get("name")||"")!==name||(u.searchParams.get("tlang")||"")!==(target||""))continue;
      if(!["json3","srv3","srv1"].includes(u.searchParams.get("fmt")))continue;
      return u.href;
    }
    return null;
  }
  const api={nativeURL};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.YTDSRequestURL=api;
})(globalThis);
