(function(root){
  "use strict";
  // The watch-page player is an unstable page API. This adapter asks that player
  // to load its own ordinary CC track; it never constructs authorization data.
  function signature(track){return JSON.stringify([track?.languageCode||"",track?.kind||"",track?.vssId||"",track?.translationLanguage?.languageCode||""]);}
  function select(player,track,target,stillCurrent){
    if(!player || !["getOption","setOption","loadModule","unloadModule","isSubtitlesOn"].every(k=>typeof player[k]==="function"))return null;
    let previous,on;
    try{on=player.isSubtitlesOn();previous=player.getOption("captions","track");}catch{return null;}
    if(typeof on!=="boolean" || on && (!previous || typeof previous.languageCode!=="string"))return null;
    const selected={...track};delete selected.translationLanguage;
    if(target)selected.translationLanguage={languageCode:target.languageCode,languageName:target.languageName};
    let restored=false;
    const restore=()=>{
      if(restored)return;restored=true;
      if(!stillCurrent())return;
      try{
        // Respect a user's intervening choice rather than overwriting it.
        const now=player.getOption("captions","track");
        if(typeof now?.languageCode==="string" && signature(now)!==signature(selected))return;
        if(typeof previous?.languageCode==="string")player.setOption("captions","track",previous);
        if(!on)player.unloadModule("captions");
      }catch{/* The page may have replaced its player during navigation. */}
    };
    try{player.loadModule("captions");player.setOption("captions","track",selected);player.setOption("captions","reload",true);return restore;}
    catch{restore();return null;}
  }
  const api={select,signature};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.YTDSNativeLoader=api;
})(globalThis);
