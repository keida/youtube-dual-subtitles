const fs=require('node:fs'),path=require('node:path');
let P;try{P=require('playwright-core');}catch{P=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');}
const project=path.resolve(__dirname,'..'),requests=[],errors=[];let browser;
(async()=>{
  const evidence={date:new Date().toISOString(),scope:'隔离无账号浏览器，从模拟 YouTube Origin 查询真实公开词典；不安装扩展，不使用用户资料',word:'creativity',result:'FAIL'};
  try{
    browser=await P.chromium.launch({headless:true});const page=await browser.newPage();
    await page.route('https://www.youtube.com/watch?v=YTDS_dictionary_test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>词典 CORS 连通性测试</title>'}));
    page.on('request',req=>{const u=new URL(req.url());if(u.hostname.endsWith('.wiktionary.org')){const h=req.headers();requests.push({url:u.href,hasCookie:!!h.cookie,hasReferer:!!h.referer});}});
    page.on('pageerror',e=>errors.push(e.message));await page.goto('https://www.youtube.com/watch?v=YTDS_dictionary_test');
    await page.addScriptTag({path:path.join(project,'extension/dictionary.js')});
    const data=await page.evaluate(()=>YTDSDictionary.lookup('creativity',{signal:AbortSignal.timeout(10000)}));
    evidence.browser=browser.version();evidence.provider=data.provider;evidence.language=data.language;evidence.meanings=data.meanings;evidence.article=data.article;evidence.license=data.license;evidence.result=data.language==='zh'&&data.meanings.includes('创造力')?'PASS':'FAIL';
    console.log(JSON.stringify(evidence));if(evidence.result!=='PASS')process.exitCode=1;
  }catch(error){evidence.error=error.message;console.error(error.message);process.exitCode=1;}
  finally{evidence.requests=requests;evidence.errors=errors;fs.writeFileSync(path.join(project,'evidence/dictionary-live.json'),JSON.stringify(evidence,null,2));await browser?.close();}
})();
