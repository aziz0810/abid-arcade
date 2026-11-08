/* Matchday Arcade · motion layer: confetti, big-moment banners, card tilt, ripples,
   view transitions, home-screen widgets and phone keyboard comfort.
   Games call FX.win(text), FX.goal(), FX.whistle(); the sound system calls FX.on(type). */
(function(){
"use strict";
const RM=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine=()=>window.matchMedia&&matchMedia("(hover:hover) and (pointer:fine)").matches;
const $=id=>document.getElementById(id);

/* ---------- particles ---------- */
let cv=null, ctx=null, parts=[], raf=0;
function canvas(){
  if(!cv){ cv=document.createElement("canvas"); cv.className="fx-canvas"; ctx=cv.getContext("2d"); }
  if(!cv.isConnected) document.body.appendChild(cv);
  const d=Math.min(2,window.devicePixelRatio||1);
  cv.width=innerWidth*d; cv.height=innerHeight*d; ctx.setTransform(d,0,0,d,0,0);
}
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function palette(){ return [css("--pitch")||"#14603c","#f5c400","#ffffff","#e2401f","#4ade80","#38bdf8"]; }
function loop(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.life>0);
  for(const p of parts){
    p.vy+=p.g; p.vx*=p.drag; p.vy*=p.drag; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.life--;
    ctx.save(); ctx.globalAlpha=Math.min(1,p.life/30); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c;
    if(p.shape===0) ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);
    else if(p.shape===1){ ctx.beginPath(); ctx.arc(0,0,p.s/2.6,0,7); ctx.fill(); }
    else { ctx.font=p.s*2+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(p.e,0,0); }
    ctx.restore();
  }
  if(parts.length) raf=requestAnimationFrame(loop); else { raf=0; cv.remove(); }
}
function emit(list){ if(RM()) return; canvas(); parts.push(...list); if(!raf) raf=requestAnimationFrame(loop); }
function confetti(n=160){
  const C=palette(), W=innerWidth, H=innerHeight, out=[];
  for(let i=0;i<n;i++){ const left=i%2===0, a=(left?-60:-120)*Math.PI/180+(Math.random()-.5)*.9, v=9+Math.random()*9;
    out.push({x:left?-10:W+10,y:H*.72,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.22,drag:.985,rot:Math.random()*6,vr:(Math.random()-.5)*.35,s:7+Math.random()*7,c:C[i%C.length],shape:i%5===0?1:0,life:150+Math.random()*80}); }
  for(let i=0;i<6;i++) out.push({x:W*(.2+.6*Math.random()),y:-30,vx:(Math.random()-.5)*2,vy:2+Math.random()*3,g:.12,drag:.99,rot:0,vr:(Math.random()-.5)*.1,s:16,shape:2,e:"⚽",c:"#000",life:190});
  emit(out);
}
function burst(x,y,n=22,emoji){
  const C=palette(), out=[];
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=2+Math.random()*5;
    out.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,g:.18,drag:.96,rot:Math.random()*6,vr:(Math.random()-.5)*.4,s:5+Math.random()*5,c:C[i%C.length],shape:emoji&&i<3?2:(i%3?0:1),e:emoji,life:55+Math.random()*25}); }
  emit(out);
}
function fireworks(){ if(RM()) return; [0,350,700].forEach((d,i)=>setTimeout(()=>burst(innerWidth*(.25+.25*i),innerHeight*(.25+.1*(i%2)),46),d)); }

/* ---------- banners and small effects ---------- */
function banner(text,ms=1500){
  if(RM()) return;
  document.querySelectorAll(".fx-banner").forEach(b=>b.remove());
  const b=document.createElement("div"); b.className="fx-banner"; b.setAttribute("aria-hidden","true");
  const t=document.createElement("b"); t.textContent=window.I18N?I18N.t(text):text; b.appendChild(t);
  document.body.appendChild(b); setTimeout(()=>b.remove(),ms);
}
function anchor(){
  const a=document.activeElement;
  if(a&&a.tagName==="INPUT"&&a.offsetParent){ const r=a.getBoundingClientRect(); return {el:a,x:r.left+Math.min(r.width/2,140),y:r.top}; }
  return null;
}
function plus(text,x,y){
  if(RM()) return;
  const e=document.createElement("div"); e.className="fx-plus"; e.textContent=text; e.style.left=x+"px"; e.style.top=y+"px";
  document.body.appendChild(e); setTimeout(()=>e.remove(),950);
}
function replay(el,cls){ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(()=>el.classList.remove(cls),700); }
function good(){ const a=anchor(); if(!a) return; replay(a.el,"fx-okflash"); plus("+1",a.x,a.y); burst(a.x,a.y+10,14); }
function bad(){ const a=anchor(); replay(a?a.el:null,"fx-shake"); }

let lastWin=0;
const FX={
  confetti, burst, banner, fireworks,
  win(text){ const now=Date.now(); if(now-lastWin<1500) return; lastWin=now; confetti(); if(text) banner(text,1700); },
  goal(){ banner("GOAL!",1300); const a=anchor(); burst(a?a.x:innerWidth/2,a?a.y:innerHeight/2,40,"⚽"); },
  whistle(){ banner("Full time!",1300); },
  on(type){ if(type==="win") FX.win(); }  // right/wrong answers come from the feedback line instead
};
window.FX=FX;

/* feedback lines (solo and online) say how the last answer went */
const fbSeen=new WeakMap();
function onFeedback(el){
  const t=el.textContent.trim(), key=el.className+"|"+t; if(!t||fbSeen.get(el)===key) return; fbSeen.set(el,key);
  if(/\bok\b/.test(el.className)){ if(/^⚽/.test(t)) FX.goal(); else good(); }
  else if(/\berr\b/.test(el.className)) bad();
}


/* ---------- in-game: replay animations when the content changes ---------- */
const lastTxt=new WeakMap();
function changed(el){ const t=el.textContent; if(lastTxt.get(el)===t) return false; const had=lastTxt.has(el); lastTxt.set(el,t); return had||!!t; }
const WATCH=[[".prompt .cat","fx-swap"],["#c-letter","fx-flip"],[".wc-score b","fx-bump"],["#heat-txt","fx-swap"]];
function ingame(t){
  if(!t||!t.closest) return;
  for(const [sel,cls] of WATCH){ const el=t.closest(sel); if(el&&changed(el)) replay(el,cls); }
}
function countUp(row){
  const rk=row.querySelector(".rk"); if(!rk||RM()) return;
  const final=rk.textContent, n=parseInt(final.replace(/[^0-9]/g,""),10); if(!n||n<3) return;
  const from=Math.min(9999,n*3+40), t0=performance.now(), d=650;
  const step=now=>{ const k=Math.min(1,(now-t0)/d), e=1-Math.pow(1-k,3), v=Math.round(from+(n-from)*e);
    if(!rk.isConnected) return; if(k<1){ rk.textContent=v.toLocaleString("en-US"); requestAnimationFrame(step); } else rk.textContent=final; };
  requestAnimationFrame(step);
}
function danger(){ const on=[...document.querySelectorAll(".clock.low")].some(c=>c.offsetParent&&!c.hidden); document.body.classList.toggle("fx-danger",on&&!RM()); }

/* ---------- which view is showing ---------- */
const VIEWS=["hub","online","close","timed","chain","linkup"];
function currentView(){ for(const v of VIEWS){ const s=$("v-"+v); if(s&&!s.hidden) return v; } return "hub"; }
let lastView="", lastHash="";
function viewChanged(){
  const v=currentView(), h=location.hash;
  document.body.dataset.view=v;
  if(v===lastView&&h===lastHash) return;
  lastView=v; lastHash=h;
  const s=$("v-"+v); if(s&&!RM()){ s.classList.remove("fx-enter"); void s.offsetWidth; s.classList.add("fx-enter"); }
  if(v==="hub") hubRefresh();
}

/* ---------- home screen ---------- */
function stagger(root){ root.querySelectorAll(".hub").forEach(g=>{ g.classList.add("fx-stagger"); [...g.children].forEach((c,i)=>c.style.setProperty("--i",i)); }); }
function hubRefresh(){
  const left=$("hub-daily-left");
  if(left){ const n=new Date(), m=new Date(n); m.setHours(24,0,0,0); const s=Math.max(0,Math.floor((m-n)/1000));
    const done=(()=>{ try{ const g=JSON.parse(localStorage.getItem("cc-daily2-"+todayKey())||"null"); return !!g&&g.status!=="playing"; }catch(e){ return false; } })();
    const hh=String(Math.floor(s/3600)), mm=String(Math.floor(s%3600/60)).padStart(2,"0"), ss=String(s%60).padStart(2,"0");
    const txt=(done?"✓ Solved · next in ":"New player in ")+`${hh}:${mm}:${ss}`;
    left.textContent=window.I18N?I18N.t(txt):txt; }
  const ch=$("hub-ch"), bar=$("hub-ch-bar");
  if(ch&&window.ARC_CH){ try{ const c=ARC_CH(); const txt=c.done>=c.total?`All done${c.streak?" · 🔥 "+c.streak:""}`:`${c.done}/${c.total} today${c.streak?" · 🔥 "+c.streak:""}`;
    ch.textContent=window.I18N?I18N.t(txt):txt; bar.style.width=(100*c.done/c.total)+"%"; }catch(e){} }
}
function todayKey(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

/* ---------- pointer effects ---------- */
function tilt(e){
  const c=e.target.closest&&e.target.closest(".game-card,.mini-card"); if(!c||!fine()||RM()) return;
  const r=c.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
  c.style.setProperty("--mx",(x*100)+"%"); c.style.setProperty("--my",(y*100)+"%");
  c.style.transform=`perspective(700px) rotateX(${(.5-y)*6}deg) rotateY(${(x-.5)*8}deg) translateY(-3px)`;
}
function untilt(e){ const c=e.target.closest&&e.target.closest(".game-card,.mini-card"); if(c&&!c.contains(e.relatedTarget)) c.style.transform=""; }
function ripple(e){
  const b=e.target.closest&&e.target.closest(".btn,.icon-btn,.tab,.hero-card,.mini-card,.game-card,.ol-game"); if(!b||RM()||b.disabled) return;
  const r=b.getBoundingClientRect(), d=Math.max(r.width,r.height)*2.2, s=document.createElement("span");
  s.className="fx-ripple"; s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
  if(getComputedStyle(b).position==="static") b.style.position="relative";
  b.appendChild(s); setTimeout(()=>s.remove(),600);
}

/* ---------- phones: keep the answer box above the keyboard ---------- */
function keepInView(){
  const a=document.activeElement; if(!a||!/INPUT|TEXTAREA/.test(a.tagName)) return;
  if(a.closest(".ol-chat,.chat,#ol-chat")) return; // chat handles itself
  const vv=window.visualViewport; if(!vv||vv.height>innerHeight*.85) return; // only when the on-screen keyboard is up
  const r=a.getBoundingClientRect();
  if(r.bottom>vv.height-12) window.scrollBy({top:r.bottom-vv.height+Math.min(120,vv.height/3),behavior:"auto"});
}

/* ---------- start ---------- */
function start(){
  const hub=$("v-hub"); if(hub) stagger(hub);
  const h1=document.querySelector(".brand h1"); if(h1) h1.addEventListener("click",()=>{ if(document.body.dataset.view!=="hub") location.hash=""; });
  viewChanged(); hubRefresh(); setInterval(()=>{ if(document.body.dataset.view==="hub"&&!document.hidden) hubRefresh(); },1000);
  window.addEventListener("arc-ch",hubRefresh);
  window.addEventListener("hashchange",()=>setTimeout(viewChanged,0));
  new MutationObserver(list=>{
    let v=false, dz=false;
    for(const m of list){
      if(m.type==="attributes"&&m.attributeName==="hidden"){ if(m.target.tagName==="SECTION") v=true; dz=true; }
      const t=m.target.nodeType===1?m.target:m.target.parentElement;
      const fb=t&&t.closest&&t.closest(".feedback"); if(fb) onFeedback(fb);
      ingame(t);
      if(m.type==="attributes"&&m.attributeName==="class"&&t&&t.classList&&t.classList.contains("clock")) danger();
      if(m.type==="childList"){
        if(t&&t.id==="l-top"&&m.addedNodes.length&&t.firstElementChild) replay(t.firstElementChild,"fx-land");
        m.addedNodes.forEach(n=>{ if(n.nodeType===1){ if(n.matches(".feedback")) onFeedback(n); if(n.matches(".row.latest")) countUp(n); else { const r=n.querySelector&&n.querySelector(".row.latest"); if(r) countUp(r); } ingame(n.querySelector&&n.querySelector(".prompt .cat,#c-letter,.wc-score b")||n); } });
      }
    }
    if(v){ viewChanged(); dz=true; }
    if(dz) danger();
  }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["hidden","class"]});
  document.addEventListener("pointermove",tilt,{passive:true});
  document.addEventListener("pointerout",untilt,{passive:true});
  document.addEventListener("pointerdown",ripple,{passive:true});
  if(window.visualViewport) visualViewport.addEventListener("resize",()=>setTimeout(keepInView,60));
  document.addEventListener("focusin",e=>{ if(/INPUT/.test(e.target.tagName)) setTimeout(keepInView,350); });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
