'use strict';
// Quietgram Remote — private browser relay prototype.
// Remote browser authentication is sensitive. Never expose publicly without HTTPS and an access code.
const http=require('node:http');
const crypto=require('node:crypto');
const path=require('node:path');
const express=require('express');
const {WebSocketServer,WebSocket}=require('ws');
const {chromium}=require('playwright');
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',1);
const PORT=Number(process.env.PORT||3000);
const CODE=process.env.APP_ACCESS_CODE||'';
const PROD=process.env.NODE_ENV==='production';
const COOKIE='quietgram_access';
const LIMIT=Math.min(2,Math.max(1,Number(process.env.MAX_SESSIONS||1)));
const MAX_IDLE=20*60*1000;
const HOME='https://www.instagram.com/';
const DM='https://www.instagram.com/direct/inbox/';
const BLOCKED=/^\/(?:reels?|p|explore|search)(?:\/|$)/i;
const HOST=/(^|\.)instagram\.com$|(^|\.)facebook\.com$|(^|\.)meta\.com$/i;
const sessions=new Map(),attempts=new Map();
let browser=null,opening=null;
if(CODE.length<16)throw Error('Set APP_ACCESS_CODE to a private 16+ character passcode.');
app.use(express.urlencoded({extended:false,limit:'2kb'}));
app.use((req,res,next)=>{
  res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});
  next();
});
function compare(a,b){
  const ah=crypto.createHash('sha256').update(String(a)).digest();
  const bh=crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ah,bh);
}
function token(req){
  const c=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));
  return c?c.slice(COOKIE.length+1):'';
}
function auth(req){
  const s=sessions.get(token(req));
  if(!s)return null;
  if(Date.now()-s.last>MAX_IDLE){void close(token(req));return null;}
  s.last=Date.now();
  return s;
}
function allowed(url){
  if(url==='about:blank')return true;
  try{const u=new URL(url);return u.protocol==='https:'&&HOST.test(u.hostname);}catch{return false;}
}
function push(ws,obj){if(ws&&ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<650000)ws.send(JSON.stringify(obj));}
async function close(id){
  const s=sessions.get(id);if(!s)return;
  sessions.delete(id);
  try{if(s.ws)s.ws.close();}catch{}
  try{if(s.cdp)await s.cdp.send('Page.stopScreencast');}catch{}
  try{if(s.context)await s.context.close();}catch{}
}
async function getBrowser(){
  if(browser&&browser.isConnected())return browser;
  if(!opening)opening=chromium.launch({headless:true,args:['--disable-dev-shm-usage','--no-first-run']})
    .then(b=>{browser=b;b.on('disconnected',()=>{browser=null;});return b;})
    .finally(()=>{opening=null;});
  return opening;
}
async function openRemote(s){
  if(s.page&&!s.page.isClosed())return s.page;
  const pw=await getBrowser();
  s.context=await pw.newContext({viewport:{width:420,height:780},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ko-KR',timezoneId:'Asia/Seoul',acceptDownloads:false,serviceWorkers:'block'});
  const p=await s.context.newPage();
  s.page=p;
  p.on('dialog',d=>void d.dismiss().catch(()=>{}));
  p.on('popup',pop=>void pop.close().catch(()=>{}));
  p.on('framenavigated',frame=>{
    if(frame!==p.mainFrame())return;
    const u=frame.url();
    if(!allowed(u)){push(s.ws,{type:'notice',message:'Instagram 외부 페이지는 열 수 없어요.'});void p.goto(HOME).catch(()=>{});return;}
    push(s.ws,{type:'location',url:u.split('?')[0].split('#')[0]});
  });
  await p.route('**/*',route=>{
    const request=route.request(),u=request.url();
    if(request.isNavigationRequest()&&request.frame()===p.mainFrame()){
      if(!allowed(u))return route.abort('blockedbyclient').catch(()=>{});
      try{const parsed=new URL(u);if(parsed.hostname.endsWith('instagram.com')&&BLOCKED.test(parsed.pathname))return route.abort('blockedbyclient').catch(()=>{});}catch{}
    }
    return route.continue().catch(()=>{});
  });
  await p.addInitScript(()=>{
    const css='html.qg-mini-home:not(.qg-mini-found) main,html.qg-mini-home:not(.qg-mini-found) [role="main"]{visibility:hidden!important}html.qg-mini-home main article,html.qg-mini-home main aside,html.qg-mini-home [data-qg-hide]{display:none!important}html.qg-mini-home [data-qg-tray]{display:flex!important;visibility:visible!important;overflow-x:auto!important}html.qg-mini-home a[href^="/p/"],html.qg-mini-home a[href^="/reel/"],html.qg-mini-dm a[href^="/p/"],html.qg-mini-dm a[href^="/reel/"]{display:none!important}';
    function trim(){
      const loc=location.pathname;
      const login=/^\/(?:accounts\/|challenge\/|oauth\/)/.test(loc)||!!document.querySelector('input[name="password"]');
      const home=!login&&loc==='/';
      document.documentElement.classList.toggle('qg-mini-home',home);
      document.documentElement.classList.toggle('qg-mini-dm',!login&&/^\/direct(?:\/|$)/.test(loc));
      if(!home)return;
      document.querySelectorAll('[data-qg-hide],[data-qg-tray]').forEach(n=>{n.removeAttribute('data-qg-hide');n.removeAttribute('data-qg-tray');});
      const links=[...document.querySelectorAll('main a[href],[role="main"] a[href]')].filter(a=>{try{return /^\/stories\/[^/]+/.test(new URL(a.href,location.href).pathname);}catch{return false;}});
      if(!links.length){document.documentElement.classList.remove('qg-mini-found');return;}
      let tray=links[0].parentElement;
      for(let i=0;i<10&&tray;i++){
        if(links.filter(a=>tray.contains(a)).length>=Math.min(3,links.length))break;
        if(tray.matches('main,[role="main"]'))break;
        tray=tray.parentElement;
      }
      if(!tray)return;
      tray.setAttribute('data-qg-tray','');
      let node=tray;
      for(let i=0;i<12&&node.parentElement;i++){
        const parent=node.parentElement;
        if(parent===document.body||parent===document.documentElement)break;
        [...parent.children].forEach(child=>{if(child!==node&&child instanceof HTMLElement)child.setAttribute('data-qg-hide','');});
        if(parent.matches('main,[role="main"]'))break;
        node=parent;
      }
      document.documentElement.classList.add('qg-mini-found');
    }
    function begin(){
      if(!document.getElementById('quietgram-style')){const st=document.createElement('style');st.id='quietgram-style';st.textContent=css;document.documentElement.appendChild(st);}
      let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(trim,320);}).observe(document.documentElement,{subtree:true,childList:true});
      setInterval(trim,1600);trim();
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
  });
  await p.goto(HOME,{waitUntil:'domcontentloaded',timeout:35000}).catch(e=>push(s.ws,{type:'notice',message:'Instagram 연결 지연: '+e.message.slice(0,60)}));
  return p;
}
async function startStream(s,ws){
  const page=await openRemote(s);
  if(s.cdp)try{await s.cdp.detach();}catch{}
  const cdp=await s.context.newCDPSession(page);
  s.cdp=cdp;
  cdp.on('Page.screencastFrame',async frame=>{
    try{
      if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<450000)push(ws,{type:'frame',data:frame.data});
      await cdp.send('Page.screencastFrameAck',{sessionId:frame.sessionId});
    }catch{}
  });
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:56,maxWidth:600,maxHeight:960,everyNthFrame:2});
  push(ws,{type:'ready',message:'원격 브라우저 연결됨'});
}
async function handle(s,body){
  const p=s.page;if(!p||p.isClosed())return;
  if(body.type==='nav'&&['stories','dm'].includes(body.target)){
    return p.goto(body.target==='dm'?DM:HOME,{waitUntil:'domcontentloaded',timeout:35000});
  }
  if(body.type==='tap'){
    const x=Number(body.x),y=Number(body.y);
    if(Number.isFinite(x)&&Number.isFinite(y))return p.mouse.click(Math.min(599,Math.max(0,x)),Math.min(959,Math.max(0,y)));
  }
  if(body.type==='scroll'){
    const y=Number(body.y);if(Number.isFinite(y))return p.mouse.wheel(0,Math.min(600,Math.max(-600,y)));
  }
  if(body.type==='key'&&['Enter','Tab','Backspace','Escape','ArrowLeft','ArrowRight'].includes(body.key))return p.keyboard.press(body.key);
  if(body.type==='type'&&typeof body.text==='string'&&body.text.length<=1200){
    // Text is sent directly to the focused Instagram field; never log or persist it.
    return p.keyboard.insertText(body.text);
  }
  if(body.type==='resize'){
    const w=Number(body.width),h=Number(body.height);
    if(Number.isFinite(w)&&Number.isFinite(h))return p.setViewportSize({width:Math.max(320,Math.min(600,Math.round(w))),height:Math.max(560,Math.min(960,Math.round(h)))});
  }
}
app.get('/health',(_req,res)=>res.json({ok:true,service:'quietgram-remote'}));
app.get('/',(req,res)=>res.redirect(auth(req)?'/app':'/unlock'));
app.get('/unlock',(req,res)=>auth(req)?res.redirect('/app'):res.sendFile(path.join(__dirname,'public/unlock.html')));
app.post('/unlock',(req,res)=>{
  const ip=req.ip||'unknown',old=attempts.get(ip)||{count:0,end:Date.now()+600000};
  if(old.end<Date.now()){old.count=0;old.end=Date.now()+600000;}
  if(old.count>=7)return res.status(429).send('Too many attempts. Retry later.');
  if(!compare(req.body.code||'',CODE)){old.count++;attempts.set(ip,old);return res.status(403).send('잘못된 접근 코드야. 뒤로 가서 다시 시도해.');}
  attempts.delete(ip);
  if(sessions.size>=LIMIT)return res.status(503).send('Private session limit reached.');
  const id=crypto.randomBytes(32).toString('hex');
  sessions.set(id,{last:Date.now(),context:null,page:null,cdp:null,ws:null});
  res.setHeader('Set-Cookie',COOKIE+'='+id+'; HttpOnly; SameSite=Strict; Path=/'+(PROD?'; Secure':''));
  res.redirect(303,'/app');
});
app.get('/app',(req,res)=>auth(req)?res.sendFile(path.join(__dirname,'public/app.html')):res.redirect('/unlock'));
app.post('/logout',async(req,res)=>{
  await close(token(req));
  res.setHeader('Set-Cookie',COOKIE+'=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict'+(PROD?'; Secure':''));
  res.redirect(303,'/unlock');
});
app.use((_req,res)=>res.status(404).send('Not found'));
const server=http.createServer(app);
const wss=new WebSocketServer({noServer:true,maxPayload:10000});
server.on('upgrade',(req,socket,head)=>{
  const origin=req.headers.origin||'',host=req.headers.host||'';
  const safe=origin==='https://'+host||(!PROD&&origin==='http://'+host);
  if(req.url!=='/stream'||!safe||!auth(req)){
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;
  }
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',async(ws,req)=>{
  const s=auth(req);
  if(!s)return ws.close(1008);
  if(s.ws&&s.ws.readyState===WebSocket.OPEN)s.ws.close(1000,'New connection');
  s.ws=ws;
  let chain=Promise.resolve();
  ws.on('message',raw=>{
    s.last=Date.now();
    let m;try{m=JSON.parse(String(raw));}catch{return;}
    chain=chain.then(()=>handle(s,m)).catch(()=>push(ws,{type:'notice',message:'입력 처리 실패'}));
  });
  ws.on('close',()=>{if(s.ws===ws)s.ws=null;});
  try{await startStream(s,ws);}catch(e){push(ws,{type:'error',message:'원격 브라우저 실행 오류: '+e.message.slice(0,120)});}
});
setInterval(()=>{
  for(const [key,value] of sessions)if(Date.now()-value.last>MAX_IDLE)void close(key);
  for(const [key,value] of attempts)if(Date.now()>value.end)attempts.delete(key);
},60000).unref();
async function shutdown(){await Promise.allSettled([...sessions.keys()].map(close));if(browser)await browser.close().catch(()=>{});server.close();}
process.on('SIGTERM',()=>{void shutdown();});process.on('SIGINT',()=>{void shutdown();});
server.listen(PORT,'0.0.0.0',()=>console.log('Quietgram private relay listening on '+PORT));
