/* Matchday Arcade · online play
   Rooms, guests, chat and live multiplayer for all five games.
   Backend: Firebase Realtime Database when firebase-config.js is filled in,
   otherwise a same-device demo (several tabs of one browser) so the page still works.
   Relies on the arcade page's globals: PLAYERS, CLUBS, COUNTRIES, COACHES, COND, resolve, buildDeck, cardHTML, ... and window.CC. */
(function(){
'use strict';
const q=id=>document.getElementById(id);
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=o=>o==null?null:JSON.parse(JSON.stringify(o));
const arr=x=>Array.isArray(x)?x.filter(v=>v!=null):(x&&typeof x==="object"?Object.keys(x).sort((a,b)=>a-b).map(k=>x[k]):[]);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const ss={get(k,d){try{const v=sessionStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const pushKey=()=>Date.now().toString(36).padStart(9,"0")+Math.random().toString(36).slice(2,6);

/* ================= Network backends ================= */
const CFG=window.FIREBASE_CONFIG||null;
const WANT_FIREBASE=!!(CFG&&CFG.apiKey&&CFG.databaseURL)&&!/[?&]local=1/.test(location.search);
const SDK="https://cdn.jsdelivr.net/npm/firebase@10.12.2/";
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=()=>rej(new Error("Could not load "+src)); document.head.appendChild(s); }); }

function FirebaseNet(){
  firebase.initializeApp(CFG);
  const auth=firebase.auth(), db=firebase.database();
  let off=0; db.ref(".info/serverTimeOffset").on("value",s=>off=s.val()||0);
  let user=null;
  const ready=new Promise(res=>auth.onAuthStateChanged(u=>{user=u;res();}));
  auth.getRedirectResult().catch(()=>{});
  return {
    kind:"firebase",
    uid:()=>user&&user.uid,
    auth:{ready,signedIn:()=>!!user,user:()=>user,canGoogle:true,
      guest:()=>auth.signInAnonymously().then(r=>{user=r.user;}),
      google:()=>{ const p=new firebase.auth.GoogleAuthProvider();
        return auth.signInWithPopup(p).then(r=>{user=r.user;}).catch(e=>{ if(/popup|environment/.test(e.code||"")) return auth.signInWithRedirect(p); throw e; }); },
      signOut:()=>auth.signOut().then(()=>{user=null;})},
    now:()=>Date.now()+off,
    get:p=>db.ref(p).get().then(s=>s.val()),
    set:(p,v)=>db.ref(p).set(clone(v)),
    update:(p,o)=>db.ref(p).update(clone(o)),
    remove:p=>db.ref(p).remove(),
    push:(p,v)=>{ const r=db.ref(p).push(); r.set(clone(v)); return r.key; },
    on:(p,cb)=>{ const r=db.ref(p), f=s=>cb(s.val()); r.on("value",f); return ()=>r.off("value",f); },
    onChild:(p,cb)=>{ const r=db.ref(p).limitToLast(80), f=s=>cb(s.key,s.val()); r.on("child_added",f); return ()=>r.off("child_added",f); },
    presenceAt:(p,on,off)=>{ const TS=firebase.database.ServerValue.TIMESTAMP, fix=o=>{ const r={}; for(const k in o) r[k]=o[k]==="__TS__"?TS:o[k]; return r; };
      const c=db.ref(".info/connected"), f=s=>{ if(s.val()){ db.ref(p).onDisconnect().update(fix(off)); db.ref(p).update(fix(on)); } }; c.on("value",f);
      return ()=>{ c.off("value",f); db.ref(p).onDisconnect().cancel(); }; },
    presence:(p)=>{ const c=db.ref(".info/connected"), f=s=>{ if(s.val()){ db.ref(p).onDisconnect().set(false); db.ref(p).set(true); } }; c.on("value",f); return ()=>{ c.off("value",f); db.ref(p).onDisconnect().cancel(); }; },
    tx:(p,fn)=>db.ref(p).transaction(fn).then(r=>({committed:r.committed,val:r.snapshot.val()})),
    top:(p,child,n,asc)=>{ const r=db.ref(p).orderByChild(child); return (asc?r.limitToFirst(n):r.limitToLast(n)).get().then(s=>s.val()); },
  };
}

function LocalNet(){
  const KEY="arcade-localdb-v1";
  const bc=("BroadcastChannel" in window)?new BroadcastChannel("arcade-localdb"):null;
  let uid=sessionStorage.getItem("arc-local-uid");
  if(!uid){ uid="u"+Math.random().toString(36).slice(2,10); sessionStorage.setItem("arc-local-uid",uid); }
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } };
  const save=t=>{ try{ localStorage.setItem(KEY,JSON.stringify(t)); }catch(e){} };
  const parts=p=>p.split("/").filter(Boolean);
  const getAt=(t,p)=>{ let n=t; for(const k of parts(p)){ if(n==null||typeof n!=="object") return null; n=n[k]; } return n===undefined?null:n; };
  const prune=(t,ks)=>{ for(let i=ks.length-1;i>0;i--){ const par=getAt(t,ks.slice(0,i).join("/")); if(par&&typeof par==="object"&&!Object.keys(par[ks[i]]||{}).length&&typeof par[ks[i]]==="object") delete par[ks[i]]; } };
  const setAt=(t,p,v)=>{ const ks=parts(p); let n=t; for(let i=0;i<ks.length-1;i++){ if(n[ks[i]]==null||typeof n[ks[i]]!=="object") n[ks[i]]={}; n=n[ks[i]]; } const last=ks[ks.length-1]; if(v==null){ delete n[last]; prune(t,ks); } else n[last]=clone(v); };
  const L=[];
  const notify=()=>{ const t=load(); for(const l of L.slice()){
    if(l.child){ const v=getAt(t,l.p)||{}; for(const k of Object.keys(v).sort()){ if(!l.seen.has(k)){ l.seen.add(k); l.cb(k,clone(v[k])); } } }
    else { const v=getAt(t,l.p), s=JSON.stringify(v); if(s!==l.last){ l.last=s; l.cb(clone(v)); } } } };
  let pend=false; const soon=()=>{ if(pend) return; pend=true; setTimeout(()=>{ pend=false; notify(); },0); };
  const write=fn=>{ const t=load(); const r=fn(t); save(t); bc&&bc.postMessage(1); soon(); return r; };
  if(bc) bc.onmessage=soon;
  window.addEventListener("storage",e=>{ if(e.key===KEY) soon(); });
  const disc=[];
  window.addEventListener("pagehide",()=>{ if(disc.length) write(t=>disc.forEach(([p,v,u])=>{ if(u) Object.keys(v).forEach(k=>setAt(t,p+"/"+k,v[k]==="__TS__"?Date.now():v[k])); else setAt(t,p,v); })); });
  let signed=sessionStorage.getItem("arc-local-signed")==="1";
  const unsub=l=>()=>{ const i=L.indexOf(l); if(i>=0) L.splice(i,1); };
  return {
    kind:"local",
    uid:()=>uid,
    auth:{ready:Promise.resolve(),signedIn:()=>signed,user:()=>({uid,isAnonymous:true}),canGoogle:false,
      guest:async()=>{ signed=true; sessionStorage.setItem("arc-local-signed","1"); },
      google:null, signOut:async()=>{ signed=false; sessionStorage.removeItem("arc-local-signed"); }},
    now:()=>Date.now(),
    get:async p=>clone(getAt(load(),p)),
    set:async(p,v)=>write(t=>setAt(t,p,v)),
    update:async(p,o)=>write(t=>{ for(const k in o) setAt(t,p+"/"+k,o[k]); }),
    remove:async p=>write(t=>setAt(t,p,null)),
    push:(p,v)=>{ const k=pushKey(); write(t=>setAt(t,p+"/"+k,v)); return k; },
    on:(p,cb)=>{ const l={p,cb}; L.push(l); soon(); return unsub(l); },
    onChild:(p,cb)=>{ const l={p,cb,child:true,seen:new Set()}; L.push(l); soon(); return unsub(l); },
    presenceAt:(p,on,off)=>{ write(t=>Object.keys(on).forEach(k=>setAt(t,p+"/"+k,on[k]==="__TS__"?Date.now():on[k]))); const d=[p,off,1]; disc.push(d); return ()=>{ const i=disc.indexOf(d); if(i>=0) disc.splice(i,1); }; },
    presence:(p)=>{ write(t=>setAt(t,p,true)); disc.push([p,false]); return ()=>{ const i=disc.findIndex(d=>d[0]===p); if(i>=0) disc.splice(i,1); }; },
    top:async(p)=>clone(getAt(load(),p)),
    tx:async(p,fn)=>write(t=>{ const cur=clone(getAt(t,p)); const nv=fn(cur); if(nv===undefined) return {committed:false,val:cur}; setAt(t,p,nv); return {committed:true,val:nv}; }),
  };
}

let NET=null, netReady=null;
function getNet(){
  if(netReady) return netReady;
  netReady=(async()=>{
    if(WANT_FIREBASE){
      try{
        if(!window.firebase){ await loadScript(SDK+"firebase-app-compat.js"); await loadScript(SDK+"firebase-auth-compat.js"); await loadScript(SDK+"firebase-database-compat.js"); }
        NET=FirebaseNet();
      }catch(e){ console.warn(e); NET=LocalNet(); NET.failed=String(e.message||e); }
    } else NET=LocalNet();
    await NET.auth.ready;
    return NET;
  })();
  return netReady;
}

/* ================= Fun: sounds, confetti, floating reactions ================= */
const SFX={ctx:null,muted:ls.get("arc-muted",false),
  play(type){ haptic(type); if(type==="turn") flashTitle("🔔 Your turn!"); if(this.muted) return; try{
    this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)(); const c=this.ctx; if(c.state==="suspended") c.resume();
    const N={ok:[[660,.07],[990,.12]],bad:[[196,.18]],tick:[[1200,.035]],win:[[523,.11],[659,.11],[784,.11],[1047,.3]],msg:[[880,.05],[1175,.07]],turn:[[587,.09],[880,.14]],go:[[440,.12],[880,.2]],draw:[[330,.08]]}[type]||[];
    let t=c.currentTime;
    for(const [f,d] of N){ const o=c.createOscillator(), g=c.createGain(); o.type="triangle"; o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.16,t+.012); g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+d+.03); t+=d*.85; }
  }catch(e){} },
  toggle(){ this.muted=!this.muted; ls.set("arc-muted",this.muted); }
};
const reduceMotion=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function confetti(){
  if(reduceMotion()) return;
  const cv=document.createElement("canvas"); cv.className="ol-confetti"; document.body.appendChild(cv);
  const W=cv.width=innerWidth, H=cv.height=innerHeight, x=cv.getContext("2d");
  const cols=["#d2402a","#2463c7","#16884a","#c08400","#14603c","#ffffff"];
  const ps=Array.from({length:140},()=>({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*14-4,r:Math.random()*6+3,c:cols[Math.floor(Math.random()*cols.length)],a:Math.random()*6}));
  let f=0; (function step(){ x.clearRect(0,0,W,H); for(const p of ps){ p.x+=p.vx; p.y+=p.vy; p.vy+=.45; p.vx*=.99; p.a+=.2; x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.fillStyle=p.c; x.fillRect(-p.r/2,-p.r/2,p.r,p.r*.6); x.restore(); }
    if(++f<150) requestAnimationFrame(step); else cv.remove(); })();
}
function floatEmoji(e){
  const s=document.createElement("span"); s.className="ol-float"; s.textContent=e;
  s.style.left=(10+Math.random()*80)+"%"; document.body.appendChild(s); setTimeout(()=>s.remove(),2600);
}
const vibrate=ms=>{ try{ navigator.vibrate&&navigator.vibrate(ms); }catch(e){} };

/* ================= Room state ================= */
const AVATARS=["⚽","🦁","🐐","🔥","👑","🧤","🎯","⚡","🦅","🐺","🐉","🌟","🍀","🥷","🤖","🦊","🐯","🚀"];
const QUICK=["Nice one! 👏","Too easy 😎","No way 😱","GG 🤝","Hurry up ⏱","One more? 🔁","Haha 😂","Unlucky 😅"];
const REACTIONS=["⚽","🔥","😂","👏","😱","🐐","💀","🙌"];
const S={net:null,uid:null,profile:ls.get("arc-profile",{name:"",av:"⚽"}),code:null,meta:null,players:{},game:null,progress:{},answers:{},hand:[],
  subs:[],chat:[],unread:0,chatOpen:false,host:false,hostWait:null,joinedAt:0,view:null,lastGameKey:null,pending:false};
const me=()=>S.players[S.uid]||{name:S.profile.name,av:S.profile.av};
const R=p=>`rooms/${S.code}/${p}`;
const now=()=>S.net?S.net.now():Date.now();
const onlineUids=()=>Object.entries(S.players).filter(([u,p])=>p&&p.online).sort((a,b)=>(a[1].joined||0)-(b[1].joined||0)).map(([u])=>u);
const pname=u=>{ if(!u) return "Kick-off"; const p=S.players[u]; if(p) return p.name; const g=S.game; if(g&&g.seats){ const s=g.seats.find(x=>x.id===u); if(s) return s.name; } return "Someone"; };
const pav=u=>{ const p=S.players[u]; if(p) return p.av; const g=S.game; if(g&&g.seats){ const s=g.seats.find(x=>x.id===u); if(s) return s.av; } return "⚽"; };

/* ================= Themes (filter which players count) ================= */
const ARAB=new Set(["Tunisia","Morocco","Algeria","Egypt","Libya","Saudi Arabia","Qatar","United Arab Emirates","Iraq","Jordan","Lebanon","Syria","Palestine","Oman","Bahrain","Kuwait","Mauritania","Sudan","Comoros"].map(n=>countryIdx(n)).filter(i=>i>=0));
const inLeague=n=>{ const k=countryIdx(n); return p=>p.leagues.has(k); };
const THEMES={
  all:{l:"All football",t:null},
  eng:{l:"Premier League",t:inLeague("England")},
  esp:{l:"LaLiga",t:inLeague("Spain")},
  ita:{l:"Serie A",t:inLeague("Italy")},
  ger:{l:"Bundesliga",t:inLeague("Germany")},
  fra:{l:"Ligue 1",t:inLeague("France")},
  ksa:{l:"Saudi Pro League",t:inLeague("Saudi Arabia")},
  arab:{l:"Arab footballers",t:p=>ARAB.has(p.k)},
  africa:{l:"African players",t:p=>COUNTRIES[p.k].conf==="CAF"},
  sam:{l:"South Americans",t:p=>COUNTRIES[p.k].conf==="CONMEBOL"},
  legends:{l:"Legends (born before 1985)",t:p=>p.born<1985},
  young:{l:"New generation (born 2000+)",t:p=>p.born>=2000},
};
const THEME_OPTS=Object.entries(THEMES).map(([k,v])=>[k,v.l]);
const themeOf=x=>THEMES[(x&&x.theme)||"all"]||THEMES.all;
const fitsTheme=(th,id)=>!th.t||th.t(PLAYERS[id]);
const themeTag=g=>{ const th=themeOf(g); return th.t?` · ${th.l}`:""; };

/* ================= Games: settings ================= */
const GAMES={
  close:{name:"Guess the Player",icon:"#1",blurb:"Race: unlimited guesses, first to find the secret player wins. Team: take turns on one shared list.",
    set:{mode:[["race","Race"],["coop","Team (take turns)"]],level:[["0","Stars"],["1","Well known"],["2","Deep cuts"]],era:[["all","Any era"],["modern","Born 1990+"],["classic","Before 1990"]],secs:[[20,"20s"],[30,"30s"],[45,"45s"],[60,"60s"]],theme:THEME_OPTS},def:{mode:"race",level:"0",era:"all",secs:30,theme:"all"}},
  thirty:{name:"30 Seconds",icon:"30",blurb:"Same category on every phone. Answers nobody else gave score double.",
    set:{rounds:[[3,"3 rounds"],[5,"5 rounds"],[8,"8 rounds"]],secs:[[20,"20s"],[30,"30s"],[45,"45s"]],scoring:[["unique","Unique ×2"],["count","1 point each"]],theme:THEME_OPTS},def:{rounds:5,secs:30,scoring:"unique",theme:"all"}},
  letters:{name:"Letter Rush",icon:"K",blurb:"One letter, everyone at once. Unique answers score double.",
    set:{rounds:[[3,"3 rounds"],[5,"5 rounds"]],secs:[[30,"30s"],[60,"60s"],[90,"90s"]],scoring:[["unique","Unique ×2"],["count","1 point each"]],theme:THEME_OPTS},def:{rounds:3,secs:60,scoring:"unique",theme:"all"}},
  chain:{name:"Name Chain",icon:"O→O",blurb:"Take turns. Each name starts with the last letter of the one before.",
    set:{secs:[[10,"10s"],[15,"15s"],[20,"20s"],[30,"30s"]],theme:THEME_OPTS},def:{secs:20,theme:"all"}},
  whoami:{name:"Who Am I?",icon:"?",blurb:"Clues appear one by one for everyone. Name the mystery player early for more points.",
    set:{rounds:[[3,"3 rounds"],[5,"5 rounds"],[8,"8 rounds"]],secs:[[5,"Clue every 5s"],[7,"Every 7s"],[10,"Every 10s"]],level:[["0","Stars"],["1","Well known"]],theme:THEME_OPTS},def:{rounds:5,secs:7,level:"0",theme:"all"}},
  linkup:{name:"Link Up",icon:"▮▮▮",blurb:"The football card game. Private hands, CPUs can fill seats.",
    set:{hand:[[5,"5 cards"],[7,"7 cards"],[9,"9 cards"]],secs:[[30,"30s turns"],[45,"45s turns"],[0,"No timer"]],cpus:[[0,"No CPU"],[1,"+1 CPU"],[2,"+2 CPU"]],level:[["easy","Easy CPU"],["normal","Normal CPU"],["hard","Hard CPU"]]},def:{hand:7,secs:45,cpus:0,level:"normal"}},
};

/* ================= Shell & profile ================= */
function shell(){
  const root=q("v-online"); if(root.dataset.ready) return; root.dataset.ready="1";
  root.innerHTML=`<div class="backbar"><button class="btn ghost" data-go="">← All games</button>
      <span class="ol-tools"><span class="ol-mode" id="ol-mode"></span><button class="btn ghost" id="ol-mute" aria-label="Sound on or off"></button></span></div>
    <div id="ol-main"></div>`;
  const mute=q("ol-mute"); paintMute(); mute.onclick=()=>{ SFX.toggle(); paintMute(); SFX.play("ok"); };
}
function modeBadge(){
  const m=q("ol-mode"); if(!m) return;
  m.textContent=S.net.kind==="firebase"?"Online":"Demo: this device only";
  m.className="ol-mode"+(S.net.kind==="firebase"?" live":"");
}
function profileForm(onDone){
  const p=S.profile;
  return `<div class="field"><span>Your name</span><input id="ol-name" maxlength="16" value="${E(p.name)}" placeholder="e.g. Aziz" autocomplete="nickname"></div>
    <div class="field"><span>Pick an avatar</span><div class="ol-avs" id="ol-avs">${AVATARS.map(a=>`<button type="button" aria-pressed="${a===p.av}" data-av="${a}">${a}</button>`).join("")}</div></div>`;
}
function bindProfile(){
  q("ol-avs").querySelectorAll("button").forEach(b=>b.onclick=()=>{ q("ol-avs").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); S.profile.av=b.dataset.av; });
}
function saveProfile(){
  const n=(q("ol-name").value||"").trim().slice(0,16);
  if(!n){ q("ol-name").focus(); toast("Type a name first."); return false; }
  S.profile.name=n; ls.set("arc-profile",S.profile); return true;
}
function toast(t){ const el=document.createElement("div"); el.className="ol-toast"; el.textContent=t; document.body.appendChild(el); setTimeout(()=>el.remove(),2600); }

function renderSignIn(){
  const main=q("ol-main"); S.view="signin";
  const local=S.net.kind==="local";
  main.innerHTML=`<h2 class="view-title">Play online</h2>
    <p class="lede">Create a room, send the code to your friends, and play together from any phone or computer. Chat and reactions included.</p>
    ${local?`<div class="ol-note">${S.net.failed?"Couldn't reach the online service, so this is":"Online play isn't switched on for this copy yet. This is"} <b>demo mode</b>: rooms work between tabs of this browser only. The site owner turns on real online play by adding a Firebase config (see the README).</div>`:""}
    <div class="panel">${profileForm()}
      <div class="actions"><button class="btn primary" id="ol-guest">Play as guest</button>${S.net.auth.canGoogle?`<button class="btn" id="ol-google">Sign in with Google</button>`:""}</div>
      <p class="note" style="margin:0">Guests just need a name. Google sign-in keeps the same player on every device.</p></div>`;
  bindProfile();
  q("ol-guest").onclick=async()=>{ if(!saveProfile()) return; try{ await S.net.auth.guest(); afterSignIn(); }catch(e){ toast(authError(e)); } };
  if(q("ol-google")) q("ol-google").onclick=async()=>{ const n=(q("ol-name").value||"").trim(); try{ await S.net.auth.google(); const u=S.net.auth.user(); if(!n&&u&&u.displayName){ q("ol-name").value=u.displayName.split(" ")[0]; } if(!saveProfile()) return; afterSignIn(); }catch(e){ toast(authError(e)); } };
}
function authError(e){
  const c=String((e&&(e.code||e.message))||e);
  if(/configuration-not-found|CONFIGURATION_NOT_FOUND/.test(c)) return "Online sign-in isn't switched on yet: the site owner needs to open Firebase → Authentication → Get started.";
  if(/operation-not-allowed|admin-restricted/.test(c)) return "This sign-in method is turned off. The site owner needs to enable it in Firebase → Authentication → Sign-in method.";
  if(/unauthorized-domain/.test(c)) return "This website isn't on Firebase's list of allowed domains yet (Authentication → Settings → Authorized domains).";
  if(/popup-closed|cancelled-popup/.test(c)) return "Sign-in window was closed.";
  if(/network/.test(c)) return "No connection. Check your internet and try again.";
  return "Couldn't sign in: "+(e.message||c);
}
function afterSignIn(){ S.uid=S.net.uid(); socialStart(); const pend=ls.get("arc-daily-pending",null); if(pend) postDaily(pend);
  const h=location.hash.replace("#",""); const m=h.match(/^join-([A-Z]{5})$/); if(m) enterRoom(m[1]); else if(h==="leaders") renderLeaders(); else if(h==="friends") renderFriends(); else renderHome(); }

function renderHome(){
  const main=q("ol-main"); S.view="home";
  const u=S.net.auth.user();
  main.innerHTML=`${rejoinHTML()}<div class="ol-me"><span class="ol-av big">${E(S.profile.av)}</span><div><b>${E(S.profile.name)}</b><div class="note">${u&&!u.isAnonymous?"Signed in with Google":"Playing as a guest"}</div></div>
      <button class="btn ghost" id="ol-edit">Edit</button><button class="btn ghost" id="ol-out">Sign out</button><a class="btn" href="#leaders" style="text-decoration:none">🏆 Leaderboards</a></div>
    <div class="ol-two">
      <div class="panel"><h3 class="ol-h">Create a room</h3><p class="note" style="margin:0">Pick the first game. You can switch games in the room.</p>
        <div class="ol-games" id="ol-pick">${Object.entries(GAMES).map(([k,g],i)=>`<button type="button" class="ol-game" aria-pressed="${i===0}" data-g="${k}"><span class="glyph">${g.icon}</span><span><b>${g.name}</b><small>${g.blurb}</small></span></button>`).join("")}</div>
        <div class="field"><span>Who can join</span><div class="seg" id="ol-vis"><button type="button" data-v="private" aria-pressed="true">🔒 Private · code only</button><button type="button" data-v="public" aria-pressed="false">🌍 Public · anyone can find it</button></div></div>
        <div class="field"><span>Max players</span><div class="seg" id="ol-max">${MAX_OPTS.map(v=>`<button type="button" data-v="${v}" aria-pressed="${v===8}">${v}</button>`).join("")}</div></div>
        <div class="field" id="ol-titlef" hidden><span>Room name in the public list</span><input id="ol-title" class="ol-text" maxlength="28" placeholder="${E(S.profile.name)}'s room"></div>
        <button class="btn primary go" id="ol-create">Create room</button></div>
      <div class="panel"><h3 class="ol-h">Join a room</h3><p class="note" style="margin:0">Type the 5-letter code your friend sent you.</p>
        <form id="ol-joinf" class="answer"><input id="ol-code" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="ABCDE" aria-label="Room code" style="text-transform:uppercase;letter-spacing:.3em;font-weight:700"><button class="btn primary">Join</button></form>
        ${S.net.kind==="local"?`<p class="note" style="margin:0">Demo mode: open this page in another tab to join your own room.</p>`:""}
        <h3 class="ol-h" style="margin-top:8px">🌍 Public rooms</h3>
        <div class="ol-board" id="ol-pub"><p class="note" style="margin:0">Looking for rooms…</p></div>
        <button class="btn" id="ol-quick">⚡ Quick join</button></div>
    </div>`;
  let pick="close";
  q("ol-pick").querySelectorAll("button").forEach(b=>b.onclick=()=>{ q("ol-pick").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); pick=b.dataset.g; });
  let vis="private", max=8;
  q("ol-vis").querySelectorAll("button").forEach(b=>b.onclick=()=>{ q("ol-vis").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); vis=b.dataset.v; q("ol-titlef").hidden=vis!=="public"; });
  q("ol-max").querySelectorAll("button").forEach(b=>b.onclick=()=>{ q("ol-max").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); max=+b.dataset.v; });
  q("ol-create").onclick=()=>createRoom(pick,{vis,max,title:(q("ol-title").value||"").trim().slice(0,28)}); bindRejoin(main);
  q("ol-quick").onclick=quickJoin; startPub(); paintSocial();
  q("ol-joinf").onsubmit=e=>{ e.preventDefault(); const c=(q("ol-code").value||"").toUpperCase().replace(/[^A-Z]/g,""); if(c.length!==5){ toast("Room codes have 5 letters."); return; } enterRoom(c); };
  q("ol-out").onclick=async()=>{ stopPub(); socialStop(); await S.net.auth.signOut(); renderSignIn(); };
  q("ol-edit").onclick=()=>{ const m=q("ol-main"); m.innerHTML=`<div class="panel">${profileForm()}<div class="actions"><button class="btn primary" id="ol-save">Save</button></div></div>`; bindProfile(); q("ol-save").onclick=()=>{ if(saveProfile()){ if(SO.on) S.net.update(`users/${S.uid}`,{n:S.profile.name,a:S.profile.av}); renderHome(); } }; };
}

/* ================= Rooms ================= */
const CODE_ABC="ABCDEFGHJKLMNPQRSTUVWXYZ";
const genCode=()=>Array.from({length:5},()=>CODE_ABC[Math.floor(Math.random()*CODE_ABC.length)]).join("");
async function createRoom(game,opts){
  opts=opts||{};
  for(let i=0;i<8;i++){
    const code=genCode();
    const meta={host:S.uid,game,settings:clone(GAMES[game].def),status:"lobby",created:now(),v:1,vis:opts.vis==="public"?"public":"private",max:+opts.max||8};
    if(opts.title) meta.title=opts.title;
    const r=await S.net.tx(`rooms/${code}/meta`,cur=>cur?undefined:meta);
    if(r.committed){ await enterRoom(code,true); return; }
  }
  toast("Couldn't create a room. Try again.");
}
async function enterRoom(code,fresh){
  if(S.code===code&&S.view==="room"){ renderRoom(); return; }
  if(S.code&&S.code!==code) await leaveRoom(true);
  const meta=await S.net.get(`rooms/${code}/meta`);
  if(!meta){ const lr=lastRoom(); if(lr&&lr.code===code) ls.set("arc-last-room",null); toast(`Room ${code} doesn't exist (or has closed).`); if(location.hash!=="#online") location.hash="online"; else renderHome(); return; }
  if(await S.net.get(`rooms/${code}/kicked/${S.uid}`)){ toast(`The host removed you from room ${code}.`); if(location.hash!=="#online") location.hash="online"; else renderHome(); return; }
  const already=await S.net.get(`rooms/${code}/players/${S.uid}`);
  if(!already&&meta.max){ const ps=await S.net.get(`rooms/${code}/players`)||{}; const n=Object.values(ps).filter(p=>p&&p.online).length;
    if(n>=meta.max){ toast(`Room ${code} is full (${n}/${meta.max}).`); if(location.hash!=="#online") location.hash="online"; else renderHome(); return; } }
  stopPub();
  S.code=code; S.meta=meta; S.players={}; S.game=null; S.progress={}; S.answers={}; S.chat=[]; S.hand=[]; S.unread=0;
  const prev=await S.net.get(R(`players/${S.uid}`));
  S.joinedAt=(prev&&prev.joined)||now();
  await S.net.set(R(`players/${S.uid}`),{name:S.profile.name,av:S.profile.av,joined:S.joinedAt,online:true,pts:(prev&&prev.pts)||0,wins:(prev&&prev.wins)||0});
  S.subs.push(S.net.presenceAt(R(`players/${S.uid}`),{online:true},{online:false,seen:"__TS__"}));
  if(!prev) sys(`${S.profile.av} ${S.profile.name} joined the room`);
  if(location.hash!=="#join-"+code) history.replaceState(null,"","#join-"+code);
  ls.set("arc-last-room",{code,at:Date.now()}); S.seen=null; S.typing={}; setMyRoom(code);
  S.view="room"; renderRoom();
  S.subs.push(S.net.on(R("meta"),v=>{ if(!v){ roomClosed(); return; } S.meta=v; checkHost(); syncLobby(); paintRoster(); refresh(); }));
  S.subs.push(S.net.on(R("players"),v=>{ S.players=v||{};
    if(!S.players[S.uid]&&S.view==="room"&&S.code){ const c=S.code; teardown(); ls.set("arc-last-room",null); toast(`You were removed from room ${c}.`); location.hash="online"; return; }
    checkHost(); paintRoster(); trackSeason(); syncLobby(); refresh(); }));
  S.subs.push(S.net.on(R("typing"),v=>{ S.typing=v||{}; paintTyping(); }));
  S.subs.push(S.net.on(R("game"),v=>{ const old=S.game; S.game=v; onGameChange(old,v); refresh(); }));
  S.subs.push(S.net.on(R("progress"),v=>{ S.progress=v||{}; refresh(); }));
  S.subs.push(S.net.on(R("answers"),v=>{ S.answers=v||{}; refresh(); }));
  S.subs.push(S.net.on(`hands/${S.code}/${S.uid}`,v=>{ S.hand=arr(v); refresh(); }));
  S.subs.push(S.net.onChild(R("chat"),(k,m)=>addChat(k,m)));
}
function roomClosed(){ toast("This room has closed."); teardown(); location.hash="online"; }
function teardown(){ setMyRoom(null); document.body.style.overflow=""; const pk=q("ol-peek"); if(pk) pk.remove(); S.subs.forEach(f=>{ try{f();}catch(e){} }); S.subs=[]; Host.stop(); S.code=null; S.meta=null; S.game=null; S.view=null; clearTimeout(S.hostWait); S.hostWait=null; S.host=false; }
async function leaveRoom(silent){
  if(!S.code) return;
  const code=S.code, uid=S.uid, wasHost=S.meta&&S.meta.host===uid;
  const others=onlineUids().filter(u=>u!==uid);
  if(!silent){ sys(`${S.profile.name} left`); ls.set("arc-last-room",null); }
  typingStop();
  teardown();
  await S.net.remove(`rooms/${code}/players/${uid}`);
  if(wasHost){
    if(others.length) await S.net.set(`rooms/${code}/meta/host`,others[0]);
    else { await S.net.remove(`lobby/${code}`).catch(()=>{}); await S.net.remove(`secrets/${code}`); await S.net.remove(`hands/${code}`); await S.net.remove(`rooms/${code}`); }
  }
}
function checkHost(){
  const m=S.meta; if(!m) return;
  const hp=S.players[m.host], alive=hp&&hp.online;
  if(alive){ clearTimeout(S.hostWait); S.hostWait=null; }
  else if(!S.hostWait){
    S.hostWait=setTimeout(async()=>{ S.hostWait=null; if(!S.meta) return;
      const old=S.meta.host, hp2=S.players[old]; if(hp2&&hp2.online) return;
      const c=onlineUids(); if(!c.length||c[0]!==S.uid) return;
      const r=await S.net.tx(R("meta/host"),cur=>(cur==null||cur===old)?S.uid:undefined);
      if(r.committed) sys(`${S.profile.name} is now the host`);
    },4000);
  }
  const am=m.host===S.uid;
  if(am!==S.host){ S.host=am; am?Host.start():Host.stop(); refresh(); }
}

/* ================= Chat ================= */
function sendChat(t,k){ if(!S.code) return; S.net.push(R("chat"),{u:S.uid,n:S.profile.name,a:S.profile.av,t:String(t).slice(0,200),k:k||"m",ts:now()}); }
function sys(t){ if(!S.code) return; S.net.push(R("chat"),{u:"",n:"",a:"",t:String(t).slice(0,200),k:"s",ts:now()}); }
function addChat(k,m){
  if(!m) return; S.chat.push(m); if(S.chat.length>120) S.chat.shift();
  const fresh=now()-(m.ts||0)<6000;
  if(m.k==="r"){ if(fresh) floatEmoji(m.t); }
  else if(m.k==="c"){ if(fresh){ floatEmoji(m.t); if(m.to===S.uid){ toast(`📣 ${m.n} is cheering for you ${m.t}`); haptic("ok"); } } }
  else if(fresh&&m.u!==S.uid&&m.k==="m"){ SFX.play("msg"); flashTitle(`💬 ${m.n}: ${m.t}`.slice(0,40)); if(!S.chatOpen&&!wideChat()){ S.unread++; peek(m); } }
  paintChat();
}
function peek(m){
  const old=q("ol-peek"); if(old) old.remove();
  const b=document.createElement("button"); b.type="button"; b.className="ol-peek"; b.id="ol-peek";
  b.innerHTML=`<b>${E(m.a)} ${E(m.n)}</b><span>${E(m.t)}</span>`;
  b.onclick=()=>{ b.remove(); openChat(); };
  document.body.appendChild(b); clearTimeout(peek.t); peek.t=setTimeout(()=>b.remove(),4000);
}
function openChat(){
  const box=q("ol-chatbox"); if(!box) return;
  S.chatOpen=true; S.unread=0; box.classList.add("open"); const pk=q("ol-peek"); if(pk) pk.remove();
  if(!wideChat()){ q("ol-backdrop").hidden=false; document.body.style.overflow="hidden"; }
  fitChat(); paintChat(); const l=q("ol-msgs"); l.scrollTop=l.scrollHeight;
}
function closeChat(){
  const box=q("ol-chatbox"); S.chatOpen=false; if(box) box.classList.remove("open");
  if(q("ol-backdrop")) q("ol-backdrop").hidden=true; document.body.style.overflow="";
  if(document.activeElement&&document.activeElement.id==="ol-chatin") document.activeElement.blur();
}
/* keep the chat sheet above the phone keyboard */
function fitChat(){
  const box=q("ol-chatbox"), vv=window.visualViewport; if(!box||!vv) return;
  const kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);
  box.style.setProperty("--kb",kb+"px"); box.style.setProperty("--vvh",Math.max(240,vv.height-24)+"px");
  if(S.chatOpen){ const l=q("ol-msgs"); if(l) l.scrollTop=l.scrollHeight; }
}
window.addEventListener("hashchange",()=>{ if(S.chatOpen) closeChat(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&S.chatOpen) closeChat(); });
if(window.visualViewport){ visualViewport.addEventListener("resize",fitChat); visualViewport.addEventListener("scroll",fitChat); }
const wideChat=()=>window.matchMedia&&matchMedia("(min-width: 960px)").matches;
function paintChat(){
  const list=q("ol-msgs"); if(!list) return;
  const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<80;
  let prev=null;
  const hm=ts=>{ const d=new Date(ts||0); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); };
  list.innerHTML=S.chat.map(m=>{
    let h;
    if(m.k==="s") h=`<div class="msg-s">${E(m.t)}</div>`;
    else if(m.k==="r") h=`<div class="msg-r"><span>${E(m.a)} ${E(m.n)}</span> ${E(m.t)}</div>`;
    else if(m.k==="c") h=`<div class="msg-r"><span>${E(m.a)} ${E(m.n)}</span> cheers for ${E(pname(m.to))} ${E(m.t)}</div>`;
    else { const cont=prev&&prev.k==="m"&&prev.u===m.u&&(m.ts-prev.ts)<120000;
      h=`<div class="msg${m.u===S.uid?" mine":""}${cont?" cont":""}">${cont?"":`<span class="msg-who">${m.u===S.uid?"You":E(m.a)+" "+E(m.n)}<span class="msg-time">${hm(m.ts)}</span></span>`}<span class="msg-t">${E(m.t)}</span></div>`; }
    prev=m; return h;
  }).join("")||`<div class="msg-s">Say hi 👋</div>`;
  if(atBottom||S.chat.length<3) list.scrollTop=list.scrollHeight;
  const b=q("ol-chatbadge"); if(b){ b.textContent=S.unread>9?"9+":(S.unread||""); b.hidden=!S.unread; }
}

/* ================= Room screen ================= */
function renderRoom(){ stopPub();
  const main=q("ol-main"); if(!main) return;
  main.innerHTML=`<div class="ol-room">
    <div class="ol-col">
      <div class="ol-roombar">
        <div class="ol-code"><span class="note">Room · <span id="ol-vistag"></span></span><b id="ol-roomcode">${S.code}</b></div>
        <button class="btn primary" id="ol-invite">📲 Invite</button>
        <button class="btn ghost" id="ol-leave">Leave</button>
      </div>
      <div class="ol-roster" id="ol-roster"></div>
      <div id="ol-stage"></div>
    </div>
    <aside class="ol-chat" id="ol-chatbox" aria-label="Room chat">
      <div class="ol-chathead"><b>Chat</b><span class="ol-typing" id="ol-typing" aria-live="polite"></span><button class="btn ghost" id="ol-chatclose">Close</button></div>
      <div class="ol-msgs" id="ol-msgs" aria-live="polite"></div>
      <div class="ol-quick" aria-label="Quick messages">${QUICK.map(t=>`<button type="button" data-q="${E(t)}">${E(t)}</button>`).join("")}</div>
      <div class="ol-reacts">${REACTIONS.map(r=>`<button type="button" data-r="${r}" aria-label="Send ${r}">${r}</button>`).join("")}</div>
      <form class="ol-chatform" id="ol-chatform"><input id="ol-chatin" maxlength="200" autocomplete="off" placeholder="Message…" aria-label="Chat message"><button class="btn primary">Send</button></form>
    </aside>
    <button class="ol-fab" id="ol-fab" aria-label="Open chat">💬<b id="ol-chatbadge" hidden></b></button>
    <div class="ol-backdrop" id="ol-backdrop" hidden></div>
  </div>`;
  q("ol-invite").onclick=openInvite;
  q("ol-leave").onclick=async()=>{ await leaveRoom(); location.hash="online"; };
  q("ol-chatform").onsubmit=e=>{ e.preventDefault(); const v=q("ol-chatin").value.trim(); if(!v) return; q("ol-chatin").value=""; sendChat(v); typingStop(); };
  q("ol-chatbox").querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>sendChat(b.dataset.r,"r"));
  q("ol-chatbox").querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{ sendChat(b.dataset.q); haptic("ok"); });
  q("ol-fab").onclick=openChat;
  q("ol-chatclose").onclick=closeChat;
  q("ol-backdrop").onclick=closeChat;
  q("ol-chatin").addEventListener("focus",()=>setTimeout(fitChat,250));
  paintRoster(); paintChat(); refresh();
}
function paintRoster(){
  const el=q("ol-roster"); if(!el) return;
  const list=Object.entries(S.players).sort((a,b)=>(a[1].joined||0)-(b[1].joined||0));
  el.innerHTML=list.map(([u,p])=>`<button type="button" class="ol-chip${p.online?"":" off"}${u===S.uid?" me":""}" data-pu="${E(u)}" aria-label="${E(p.name)}: open player card"><span class="ol-av">${E(p.av)}${SO.friends[u]?`<i class="dot on" title="Friend"></i>`:""}</span>${E(p.name)}${S.meta&&S.meta.host===u?" 👑":""}${p.online?"":`<small>away · ${E(ago(p.seen))}</small>`}<b title="Points in this room">${p.pts||0}</b></button>`).join("");
  el.querySelectorAll("[data-pu]").forEach(b=>b.onclick=()=>openPlayer(b.dataset.pu));
  const vt=q("ol-vistag"); if(vt) vt.textContent=visTag();
}
let rAF=0;
function refresh(){ if(rAF) return; rAF=requestAnimationFrame(()=>{ rAF=0; renderStage(); }); }
function renderStage(){
  const st=q("ol-stage"); if(!st||S.view!=="room") return;
  if(!S.meta){ st.innerHTML=`<p class="note">Loading room…</p>`; return; }
  if(S.meta.status!=="playing"||!S.game) return renderLobby(st);
  const eng=ENG[S.game.kind]; if(eng) eng.render(st);
  paintCheer(st); paintTyping();
  if(S.game.phase==="over"&&tourOn()) st.querySelectorAll(".ol-tourbox").forEach(el=>{ const h=tourTable(); if(el.outerHTML!==h) el.outerHTML=h; });
}
function skel(st,key,html){ if(st.dataset.key!==key){ st.dataset.key=key; st.innerHTML=html; return true; } return false; }

const LBL={mode:"Mode",secs:"Time",cpus:"Computer players",level:"Difficulty",era:"Era",hand:"Cards each",rounds:"Rounds",scoring:"Scoring",theme:"Theme"};
const LBL_GAME={close:{secs:"Time per turn (team mode)",level:"Secret player from"},linkup:{level:"CPU strength"},whoami:{secs:"Clue speed",level:"Mystery player from"}};
const setLabel=(game,k)=>(LBL_GAME[game]&&LBL_GAME[game][k])||LBL[k]||k;
function renderLobby(st){
  const m=S.meta, g=GAMES[m.game], host=S.host;
  const fresh=skel(st,"lobby-"+m.game+"-"+host,`<div id="ol-champ"></div><div class="panel">
    <div class="section-label"><span>${host?"Choose the game":"Next game"}</span><span id="ol-hostlbl"></span></div>
    <div class="ol-games" id="ol-lg">${Object.entries(GAMES).map(([k,x])=>`<button type="button" class="ol-game" data-g="${k}" ${host?"":"disabled"}><span class="glyph">${x.icon}</span><span><b>${x.name}</b><small>${x.blurb}</small></span></button>`).join("")}</div>
    <div id="ol-sets"></div>
    <div class="actions" id="ol-start"></div></div><div id="ol-roomset"></div><div id="ol-tour"></div>`);
  q("ol-hostlbl").textContent=host?"You're the host":"Host: "+pname(m.host);
  st.querySelectorAll("#ol-lg button").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.g===m.game)); if(fresh&&host) b.onclick=()=>S.net.update(R("meta"),{game:b.dataset.g,settings:clone(GAMES[b.dataset.g].def)}); });
  const sets=q("ol-sets"); const cur=m.settings||g.def;
  sets.innerHTML=Object.entries(g.set).map(([k,opts])=>`<div class="field"><span>${setLabel(m.game,k)}</span><div class="seg">${opts.map(([v,l])=>`<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${String(cur[k])===String(v)}" ${host?"":"disabled"}>${l}</button>`).join("")}</div></div>`).join("");
  if(host) sets.querySelectorAll("button").forEach(b=>b.onclick=()=>{ const o=GAMES[m.game].set[b.dataset.k].find(x=>String(x[0])===b.dataset.v); S.net.set(R("meta/settings/"+b.dataset.k),o[0]); });
  const n=onlineUids().length, need=m.game==="linkup"?Math.max(0,2-n-Number(cur.cpus||0)):0, over=m.game==="linkup"&&n+Number(cur.cpus||0)>LINKUP_MAX;
  q("ol-start").innerHTML=host
    ?`<button class="btn primary go" id="ol-go" ${need||over?"disabled":""}>Start ${E(g.name)}</button><span class="note">${need?"Link Up needs 2 seats: invite a friend or add a CPU.":over?`Link Up supports up to ${LINKUP_MAX} players (the deck runs out). Remove CPUs or pick another game.`:`${n} player${n>1?"s":""} in the room`}</span>`
    :`<span class="note">Waiting for ${E(pname(m.host))} to start the game…</span>`;
  if(host&&q("ol-go")) q("ol-go").onclick=()=>startGame();
  const rs=q("ol-roomset"), rk=JSON.stringify([m.vis,m.max,m.title,host,n]); if(rs.dataset.k!==rk){ rs.dataset.k=rk; rs.innerHTML=roomSettingsHTML(); bindRoomSettings(); }
  const tw=q("ol-tour"), tk=JSON.stringify([S.meta.tour||null,host,Object.keys(S.players).length]);
  if(tw.dataset.k!==tk){ tw.dataset.k=tk; q("ol-champ").innerHTML=championHTML(); tw.innerHTML=tourPanel(); bindTourPanel();
    if(q("ol-tclear")) q("ol-tclear").onclick=()=>S.net.set(R("meta/tour"),null); }
}
async function startGame(){
  const m=S.meta, eng=ENG[m.game];
  const set=Object.assign({},GAMES[m.game].def,m.settings||{});
  const g=await eng.start(set);
  await S.net.update(`rooms/${S.code}`,{game:g,answers:null,progress:null,actions:null,"meta/status":"playing"});
  SFX.play("go");
}
async function toLobby(){
  await S.net.remove(`secrets/${S.code}`); await S.net.remove(`hands/${S.code}`);
  await S.net.update(`rooms/${S.code}`,{game:null,answers:null,progress:null,actions:null,"meta/status":"lobby"});
}
async function award(uids,n,win){
  for(const u of uids){ if(!S.players[u]) continue;
    await S.net.tx(R(`players/${u}/pts`),c=>(c||0)+n);
    if(win) await S.net.tx(R(`players/${u}/wins`),c=>(c||0)+1); }
}
function endButtons(){
  if(tourOn()){ const t=S.meta.tour, nx=t.list[t.idx+1];
    return tourTable()+(S.host?`<div class="actions"><button class="btn primary" data-end="tnext">${nx?`Next: ${GAMES[nx].name} (${t.idx+2}/${t.list.length})`:"Crown the champion 👑"}</button><button class="btn ghost" data-end="tend">End tournament</button></div>`:`<p class="note">Waiting for the host to start the next tournament game…</p>`); }
  return S.host?`<div class="actions"><button class="btn primary" data-end="again">Play again</button><button class="btn ghost" data-end="lobby">Change game</button></div>`:`<p class="note">Waiting for the host to start the next game…</p>`; }
function bindEnd(st){ st.querySelectorAll("[data-end]").forEach(b=>b.onclick=async()=>{ const a=b.dataset.end; b.disabled=true;
  if(a==="again") return startGame(); if(a==="tnext") return Host.run(async()=>{ await tourScore(); await tourNext(); });
  if(a==="tend"){ await S.net.set(R("meta/tour"),null); return toLobby(); } return toLobby(); }); }
function onGameChange(old,g){
  if(!g) return;
  const eng=ENG[g.kind]; eng&&eng.onChange&&eng.onChange(old,g);
}

/* ================= Host engine ================= */
const Host={on:false,iv:null,unsub:null,q:Promise.resolve(),cache:null,
  start(){ if(this.on) return; this.on=true; this.cache=null; this.hb=setInterval(()=>syncLobby(true),60000); setTimeout(()=>syncLobby(true),300);
    this.unsub=S.net.onChild(R("actions"),(k,a)=>this.run(()=>this.action(k,a)));
    this.iv=setInterval(()=>this.run(()=>this.tick()),400); },
  stop(){ this.on=false; clearInterval(this.iv); clearInterval(this.hb); this.unsub&&this.unsub(); this.unsub=null; this.cache=null; },
  run(fn){ this.q=this.q.then(()=>this.on?fn():null).catch(e=>console.error(e)); return this.q; },
  async action(k,a){ await S.net.remove(R("actions/"+k)); if(!a||!S.game||S.meta.status!=="playing") return; const e=ENG[S.game.kind]; e&&e.hostAction&&await e.hostAction(a); },
  async tick(){ if(!S.game||!S.meta||S.meta.status!=="playing") return; if(S.game.phase==="over"){ await tourScore(); return; } const e=ENG[S.game.kind]; e&&e.hostTick&&await e.hostTick(); }
};
async function setGame(g){ S.game=g; refresh(); await S.net.set(R("game"),g); }
const act=(type,payload)=>S.net.push(R("actions"),Object.assign({u:S.uid,type,ts:now()},payload||{}));

/* client clock: count-downs and bars */
setInterval(()=>{
  document.querySelectorAll("[data-ends]").forEach(el=>{
    const end=+el.dataset.ends, start=+(el.dataset.start||0), total=+(el.dataset.total||0), left=Math.max(0,(end-now())/1000);
    const b=el.querySelector("b"); if(b) b.textContent=Math.ceil(left);
    const bar=el.querySelector(".bar i"); if(bar&&total) bar.style.width=Math.min(100,100*left/total)+"%";
    el.classList.toggle("low",left<=5&&left>0);
    if(left<=5&&left>0&&el.dataset.tick!==String(Math.ceil(left))&&el.dataset.sound==="1"){ el.dataset.tick=String(Math.ceil(left)); SFX.play("tick"); }
  });
  if(S.view==="room"&&S.game){ const e=ENG[S.game.kind]; e&&e.clientTick&&e.clientTick(); }
  if(S.view==="room") paintTyping();
},200);
const clockHTML=(id,ends,total,sound)=>`<div class="clock" id="${id}" data-ends="${ends}" data-total="${total}" data-sound="${sound?1:0}"><b>${Math.ceil(Math.max(0,(ends-now())/1000))}</b><span class="bar"><i></i></span></div>`;

/* ================= Shared bits for the Guess the Player games ================= */
const OBF=0x2BAD;
const enc=id=>((id*7919+12345)^OBF), dec=x=>((x^OBF)-12345)/7919;
function ccSearch(inputEl,sugEl,onPick,isUsed){
  let idx=0,list=[];
  const pick=p=>{ inputEl.value=""; sugEl.hidden=true; idx=0; onPick(p); };
  const paint=()=>{ const v=inputEl.value; list=CC.search(v); if(!v.trim()){ sugEl.hidden=true; return; }
    sugEl.innerHTML=list.length?list.map((p,i)=>`<button type="button" class="sug" aria-selected="${i===idx}" data-i="${i}"><span class="n">${E(p.name)}</span><span class="d">${isUsed(p)?"Guessed":E(CC.COUNTRIES[p.k].flag+" "+CC.lastClub(p))}</span></button>`).join(""):`<div class="sug none">No player by that name</div>`;
    sugEl.hidden=false; sugEl.querySelectorAll("[data-i]").forEach(b=>b.onmousedown=e=>{ e.preventDefault(); pick(list[+b.dataset.i]); }); };
  inputEl.oninput=()=>{ idx=0; paint(); };
  inputEl.onkeydown=e=>{ if(e.key==="ArrowDown"){ e.preventDefault(); idx=Math.min(idx+1,list.length-1); paint(); } else if(e.key==="ArrowUp"){ e.preventDefault(); idx=Math.max(0,idx-1); paint(); } else if(e.key==="Enter"){ e.preventDefault(); if(list[idx]) pick(list[idx]); } else if(e.key==="Escape") sugEl.hidden=true; };
  inputEl.onblur=()=>setTimeout(()=>{ sugEl.hidden=true; },150);
}
function ccRow(p,secret,rank,label,latest){
  const t=CC.tone(rank);
  return `<div class="row${latest?" latest":""}"><span class="fill" style="width:${CC.fillPct(rank)}%;background:var(${t})"></span><div class="who"><span class="nm">${E(label)}</span>${p.id===secret.id?"":CC.chipHTML(CC.links(secret,p))}</div><span class="rk" style="color:var(${t})">${CC.fmt(rank)}</span></div>`;
}
function closerPick(ctx,best,used){
  const target=Math.max(2,Math.floor(best/2));
  for(const maxTier of [0,1,2]){ let pick=null,bd=Infinity; const lo=maxTier<2?Math.max(2,Math.floor(target/2)):2;
    for(let r=lo;r<best;r++){ const p=ctx.order[r-1]; if(used(p)||p.tier>maxTier) continue; const d=Math.abs(r-target); if(d<bd){ bd=d; pick=p; } }
    if(pick) return pick; }
  return null;
}
function revealCard(secret){
  const c=CC.COUNTRIES[secret.k];
  return `<div class="result"><div class="eyebrow">The secret player</div><h2>${E(secret.name)}</h2>
    <div class="facts"><span>${c.flag} ${E(c.name)}</span><span>${E(CC.POSNAME[secret.pos])}</span><span>Born ${secret.born}</span></div>
    <div class="career">${CC.careerText(secret).map(x=>`<span>${E(x.n)}${x.y?`<i>${E(x.y)}</i>`:""}</span>`).join("")}</div></div>`;
}

const ENG={};

/* ================= Guess the Player · race or team ================= */
const GU_WAIT=20000;
const CCR={key:null,turnKey:null,len:0};
function ccCtx(g){
  if(CCR.key!==g.at){ CCR.key=g.at; CCR.secret=CC.PLAYERS[dec(g.sx)]; CCR.ctx=CC.rankFor(CCR.secret); CCR.mine=ss.get(`arc-cc-${S.code}-${g.at}`,{ids:[],hints:0}); CCR.last=null; CCR.pending=false; CCR.len=0; CCR.turnKey=null; }
  return CCR;
}
ENG.close={
  async start(set){
    const lv=+set.level;
    const th=THEMES[set.theme]||THEMES.all;
    let pool=CC.PLAYERS.filter(p=>p.tier<=lv&&p.clubs.size>=2&&(set.era==="all"||(set.era==="modern"?p.born>=1990:p.born<1990))&&fitsTheme(th,p.id));
    if(pool.length<5) pool=CC.PLAYERS.filter(p=>p.tier<=1&&fitsTheme(th,p.id));
    if(!pool.length) pool=CC.PLAYERS.slice(0,500);
    const g={theme:set.theme||"all",kind:"close",at:now(),sx:enc(pickOne(pool).id),players:onlineUids(),phase:"play",mode:set.mode==="coop"?"coop":"race"};
    if(g.mode==="coop"){ g.order=shuffle(g.players.slice()); g.turn=0; g.secs=+set.secs||30; g.deadline=now()+2500+g.secs*1000; }
    return g;
  },
  async hostTick(){
    const g=S.game; if(g.phase!=="play") return;
    if(g.gu&&g.gu.st==="pending"&&now()-g.gu.ts>GU_WAIT){ const g2=clone(g); g2.gu.st="rejected"; g2.gu.by=""; await setGame(g2); return; }
    if(g.mode==="coop") return this.coopTick();
    if(g.players.some(u=>S.progress[u]&&S.progress[u].done)) return this.finish();
    if(g.players.some(u=>S.progress[u])&&!this.stillIn(g).length) return this.finish();
  },
  /* ---- give up = a request to the other players ---- */
  stillIn(g){ const t=now(); return arr(g.players).filter(u=>{ const p=S.players[u]; if(!p) return false; const pr=S.progress[u]||{};
    if(g.mode!=="coop"&&(pr.done||pr.gaveUp)) return false; return p.online||(t-(p.seen||0)<120000); }); },
  voters(g){ return this.stillIn(g).filter(u=>u!==g.gu.from&&S.players[u].online); },
  async guAction(a){
    const g=clone(S.game); if(g.phase!=="play") return;
    if(a.type==="gu_req"){
      if(g.gu&&g.gu.st==="pending") return;
      g.gu={from:a.u,ts:now(),st:"pending",votes:{}};
      if(!this.voters(g).length){ if(g.mode==="coop"){ g.gu=null; await setGame(g); return this.finish({draw:true}); } g.gu.st="alone"; await setGame(g); return; }
      await setGame(g); sys(`🏳️ ${pname(a.u)} asks to give up. Waiting for an answer…`); return;
    }
    if(a.type==="gu_vote"){
      if(!g.gu||g.gu.st!=="pending"||a.u===g.gu.from) return;
      g.gu.votes=g.gu.votes||{}; g.gu.votes[a.u]=a.v;
      if(a.v==="n"){ g.gu.st="rejected"; g.gu.by=a.u; await setGame(g); sys(`💪 ${pname(a.u)} wants to keep playing`); return; }
      if(this.voters(g).every(u=>g.gu.votes[u]==="y")){ g.gu.st="accepted"; await setGame(g); return this.finish({draw:true}); }
      await setGame(g); return;
    }
    if(a.type==="gu_clear"&&g.gu&&g.gu.from===a.u){ g.gu=null; await setGame(g); }
  },
  async finish(o){
    const g=clone(S.game); if(g.phase!=="play") return;
    g.phase="over"; g.gu=null; if(o&&o.draw) g.draw=true;
    if(g.mode!=="coop"&&!g.draw){ const solvers=g.players.filter(u=>S.progress[u]&&S.progress[u].done).sort((a,b)=>S.progress[a].t-S.progress[b].t); g.winner=solvers[0]||""; }
    await setGame(g);
    // the answer is shown on the result card only; never in chat
    if(g.draw){ const ps=arr(g.players).filter(u=>S.players[u]); await award(ps,1,false); sys(`🤝 Draw! Everyone agreed to stop. The answer is on screen.`); }
    else if(g.winner){
      await award([g.winner],3,true);
      if(g.mode==="coop"){ await award(g.order.filter(u=>u!==g.winner),1,false); sys(`🤝 Team win! ${pname(g.winner)} found it after ${arr(g.guesses).length} team guess${arr(g.guesses).length===1?"":"es"}`); }
      else sys(`🏁 ${pname(g.winner)} found the secret player first and wins the race!`);
    } else sys(`Round over. The answer is on screen.`);
  },
  /* ---- team mode (host side) ---- */
  coopAdvance(g){
    const n=g.order.length; let t=g.turn;
    for(let i=0;i<n;i++){ t=(t+1)%n; const u=g.order[t]; if(S.players[u]&&S.players[u].online) break; }
    g.turn=t; g.deadline=now()+g.secs*1000;
  },
  async coopTick(){
    const g0=S.game, cur=g0.order[g0.turn], here=S.players[cur]&&S.players[cur].online, started=g0.deadline-g0.secs*1000;
    if(now()>g0.deadline||(!here&&now()>started+3000)){
      const g=clone(g0); this.coopAdvance(g); await setGame(g);
      if(g.order.length>1) sys(`⏱ ${pname(cur)} ${here?"ran out of time":"isn't here"}. ${pname(g.order[g.turn])}'s turn`);
    }
  },
  async hostAction(a){
    if(a.type&&a.type.startsWith("gu_")) return this.guAction(a);
    const g0=S.game; if(g0.mode!=="coop"||g0.phase!=="play"||g0.order[g0.turn]!==a.u) return;
    const g=clone(g0); g.guesses=arr(g.guesses);
    const c=ccCtx(g), used=x=>g.guesses.some(y=>y.id===x.id); let id;
    if(a.type==="ccguess") id=a.id;
    else if(a.type==="cchint"){ const best=g.guesses.length?Math.min(...g.guesses.map(x=>c.ctx.ranks[x.id])):CC.N+1; if(best<=2) return; const p=closerPick(c.ctx,best,used); if(!p) return; id=p.id; }
    else return;
    if(!CC.PLAYERS[id]||g.guesses.some(x=>x.id===id)) return;
    g.guesses.push({id,u:a.u,h:a.type==="cchint"?1:0});
    if(id===c.secret.id){ g.winner=a.u; await setGame(g); return this.finish(); }
    this.coopAdvance(g); await setGame(g);
  },
  /* ---- race mode (each player guesses on their own device) ---- */
  save(g){
    const c=ccCtx(g); ss.set(`arc-cc-${S.code}-${g.at}`,c.mine);
    const ids=c.mine.ids, best=ids.length?Math.min(...ids.map(i=>c.ctx.ranks[i])):0, done=ids.includes(c.secret.id);
    const prev=S.progress[S.uid]||{};
    S.net.set(R(`progress/${S.uid}`),{g:ids.length,b:best,h:c.mine.hints,done,gaveUp:!!c.mine.gaveUp,t:done?(prev.t||now()-g.at):0});
    return {best,done,prevBest:prev.b||0};
  },
  guess(p){
    const g=S.game, c=ccCtx(g);
    if(g.phase!=="play") return;
    if(g.mode==="coop"){
      if(g.order[g.turn]!==S.uid){ this.fb("Wait for your turn.",true); return; }
      if(arr(g.guesses).some(x=>x.id===p.id)){ this.fb(`${p.name} is already on the team list.`,true); return; }
      if(c.pending) return; c.pending=true; this.fb(""); act("ccguess",{id:p.id}); return;
    }
    if(c.mine.ids.includes(p.id)){ this.fb(`${p.name} is already on your list.`,true); return; }
    c.mine.ids.push(p.id); c.last=p.id;
    const r=this.save(g), rank=c.ctx.ranks[p.id];
    if(r.done){ SFX.play("win"); confetti(); { const n=c.mine.ids.length; sys(`🎯 ${S.profile.name} found the secret player in ${n} guess${n===1?"":"es"}!`); } }
    else { SFX.play(rank<=50?"ok":"draw"); if(r.best<=10&&(!r.prevBest||r.prevBest>10)) sys(`🔥 ${S.profile.name} is in the top 10!`); }
    this.fb(""); refresh();
  },
  askGiveUp(){
    const g=S.game, c=ccCtx(g); if(g.phase!=="play"||c.mine.gaveUp) return;
    if(g.gu&&g.gu.st==="pending") return;
    act("gu_req"); this.fb(g.mode==="coop"?"Asking the team…":"Asking the other players…");
  },
  giveUpAlone(){
    const g=S.game, c=ccCtx(g); if(c.mine.gaveUp) return;
    c.mine.gaveUp=true; this.save(g);
    const others=this.stillIn(g).filter(u=>u!==S.uid);
    sys(`🏳️ ${S.profile.name} gave up${others.length?` · ${others.map(pname).join(" & ")} keep${others.length===1?"s":""} playing`:""}`);
    act("gu_clear"); refresh();
  },
  paintGU(){
    const g=S.game, gu=g&&g.gu, me=S.uid;
    const close=()=>{ const o=q("gu-dlg"); if(o) o.remove(); };
    if(!gu||g.phase!=="play"){ close(); return; }
    const show=(key,html,bind)=>{ let o=q("gu-dlg"); if(o&&o.dataset.k===key) return o; if(o) o.remove();
      o=document.createElement("div"); o.className="overlay"; o.id="gu-dlg"; o.dataset.k=key;
      o.innerHTML=`<div class="dialog gu" role="alertdialog" aria-modal="true" aria-labelledby="gu-t">${html}</div>`; document.body.appendChild(o); bind(o); return o; };
    const secs=()=>Math.max(0,Math.ceil((gu.ts+GU_WAIT-now())/1000));
    if(gu.st==="pending"&&gu.from!==me){
      const can=this.voters(g).includes(me);
      if(!can){ close(); return; }
      if((gu.votes||{})[me]){ close(); return; }
      const o=show("ask"+gu.ts,`<h3 id="gu-t">🏳️ ${E(pname(gu.from))} wants to give up</h3>
        <p style="margin:0">${g.mode==="coop"?"End the game now? Nobody wins and the answer is revealed.":"Accept and the game ends in a <b>draw</b>. Refuse and you keep playing: if you find the player, you win."}</p>
        <p class="note" style="margin:0" id="gu-left"></p>
        <div class="actions"><button class="btn primary" data-v="y">🤝 ${g.mode==="coop"?"Yes, stop":"Accept draw"}</button><button class="btn" data-v="n">💪 Keep playing</button></div>`,
        o=>{ o.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{ act("gu_vote",{v:b.dataset.v}); o.remove(); }); SFX.play("turn"); });
      const l=o.querySelector("#gu-left"); if(l) l.textContent=`No answer in ${secs()}s counts as “keep playing”.`;
      return;
    }
    if(gu.from===me&&(gu.st==="rejected"||gu.st==="alone")){
      if(g.mode==="coop"){ show("rej"+gu.ts,`<h3 id="gu-t">💪 The team wants to keep going</h3><p style="margin:0">${gu.by?`${E(pname(gu.by))} said no.`:"Nobody answered in time."} Keep guessing together!</p><div class="actions"><button class="btn primary" data-ok>OK</button></div>`,
        o=>{ o.querySelector("[data-ok]").onclick=()=>{ act("gu_clear"); o.remove(); }; }); return; }
      if(gu.st==="alone"){ close(); this.giveUpAlone(); return; }
      show("rej"+gu.ts,`<h3 id="gu-t">💪 ${gu.by?`${E(pname(gu.by))} wants to keep playing`:"No answer"}</h3>
        <p style="margin:0">${gu.by?"They refused the draw.":"Nobody answered in time."} You can give up alone: they keep playing, and you'll see the answer when the round ends.</p>
        <div class="actions"><button class="btn primary" data-a="alone">🏳️ Give up alone</button><button class="btn" data-a="stay">Keep playing</button></div>`,
        o=>{ o.querySelector('[data-a="alone"]').onclick=()=>{ o.remove(); this.giveUpAlone(); }; o.querySelector('[data-a="stay"]').onclick=()=>{ o.remove(); act("gu_clear"); this.fb(""); }; SFX.play("bad"); });
      return;
    }
    if(gu.from===me&&gu.st==="pending"){ this.fb(`⏳ Waiting for an answer to your give-up request… ${secs()}s`); close(); return; }
    close();
  },
  fb(t,err){ const f=q("cc-fb"); if(f){ f.textContent=t; f.className="feedback"+(err?" err":""); } },
  overHTML(g){
    const head=g.draw?"🤝 Draw · everyone agreed to stop":g.winner?(g.mode==="coop"?`🤝 Team win · found by ${E(pname(g.winner))}`:`🏁 ${E(pname(g.winner))} wins the race`):"Nobody found it this time";
    return `<div class="prompt"><span class="who">Guess the Player · ${g.mode==="coop"?"team mode":"race"}</span><span class="cat">${head}</span></div>
      <div id="cc-reveal"></div><div class="section-label"><span>${g.mode==="coop"?"Team guesses":"Final standings"}</span></div><div class="${g.mode==="coop"?"list":"ol-board"}" id="cc-board"></div>
      <div class="section-label"><span>Closest players</span></div><div class="nearest" id="cc-near"></div><div id="cc-end"></div>`;
  },
  render(st){
    const g=S.game, c=ccCtx(g), secret=c.secret;
    if(g.phase==="over"){
      if(skel(st,"cc-over-"+g.at,this.overHTML(g))){
        q("cc-reveal").innerHTML=revealCard(secret);
        q("cc-near").innerHTML=c.ctx.order.slice(1,11).map(p=>`<div class="near"><span class="r" style="color:var(${CC.tone(c.ctx.ranks[p.id])})">${c.ctx.ranks[p.id]}</span><div><div class="nm">${E(p.name)}</div><div class="why">${E(CC.whyText(secret,p))}</div></div></div>`).join("");
        q("cc-end").innerHTML=endButtons(); bindEnd(st);
      }
      if(g.mode==="coop") this.teamList(g); else this.board();
      return;
    }
    return g.mode==="coop"?this.renderCoop(st):this.renderRace(st);
  },
  renderRace(st){
    const g=S.game, c=ccCtx(g), secret=c.secret, mine=c.mine, inGame=g.players.includes(S.uid);
    if(skel(st,"cc-play-"+g.at,`<div class="prompt"><span class="who">Guess the Player · race${themeTag(g)}</span><span class="cat">First to find the secret footballer wins</span></div>
      <div class="ol-board" id="cc-board"></div>
      ${inGame?`<div class="search"><input id="cc-in" type="text" autocomplete="off" spellcheck="false" placeholder="Type a player's name…" aria-label="Guess a player"><div class="suggest" id="cc-sug" role="listbox" hidden></div></div>
      <div class="actions"><button class="btn" id="cc-hint">Closer player</button><button class="btn ghost" id="cc-give">Give up</button></div>`
      :`<div class="ol-note">You joined during this round. You'll play from the next one. Watch the race and chat meanwhile.</div>`}
      <div class="feedback" id="cc-fb" aria-live="polite"></div>
      <div class="section-label"><span>Your guesses, closest first</span><span id="cc-best"></span></div>
      <div class="list" id="cc-list"></div>`)){
      if(inGame){
        ccSearch(q("cc-in"),q("cc-sug"),p=>this.guess(p),p=>mine.ids.includes(p.id));
        q("cc-hint").onclick=()=>{ const best=mine.ids.length?Math.min(...mine.ids.map(i=>c.ctx.ranks[i])):CC.N+1;
          if(best<=2){ this.fb("You're as close as a hint can get you.",true); return; }
          const p=closerPick(c.ctx,best,x=>mine.ids.includes(x.id)); if(!p) return; mine.hints++; this.guess(p); this.fb(`Hint: ${p.name} is #${c.ctx.ranks[p.id]}.`); };
        q("cc-give").onclick=()=>this.askGiveUp();
      }
      if(q("cc-end")) q("cc-end").onclick=()=>Host.run(()=>this.finish());
      if(q("cc-in")) q("cc-in").focus();
    }
    const done=mine.ids.includes(secret.id)||mine.gaveUp;
    const asking=g.gu&&g.gu.from===S.uid&&g.gu.st==="pending";
    if(q("cc-in")){ q("cc-in").disabled=done; q("cc-in").placeholder=mine.gaveUp?"You gave up. The answer appears when the round ends.":"Type a player's name…"; q("cc-hint").disabled=done; q("cc-give").disabled=done||asking; q("cc-give").textContent=asking?"Waiting for answer…":"Give up"; }
    this.paintGU();
    const ids=mine.ids, sorted=[...ids].sort((a,b)=>c.ctx.ranks[a]-c.ctx.ranks[b]);
    const lat=c.last!=null&&ids.length>1, order=lat?[c.last,...sorted]:sorted;
    q("cc-list").innerHTML=order.map((id,i)=>{ const p=CC.PLAYERS[id]; return ccRow(p,secret,c.ctx.ranks[id],(i===0&&lat?"Latest · ":"")+p.name,i===0&&lat); }).join("")||`<div class="empty">Each guess shows how close it is to the secret player: #${CC.fmt(CC.N)} means no link, #1 is the answer.</div>`;
    q("cc-best").textContent=ids.length?"Best #"+Math.min(...ids.map(i=>c.ctx.ranks[i])):"";
    this.board();
  },
  renderCoop(st){
    const g=S.game, c=ccCtx(g), inGame=g.order.includes(S.uid), my=g.order[g.turn]===S.uid;
    if(skel(st,"cc-coop-"+g.at,`<div class="prompt"><span class="who">Guess the Player · team mode${themeTag(g)}</span><span class="cat" id="cq-who"></span></div>
      <div class="seats" id="cq-seats"></div>
      <div id="cq-clock"></div>
      ${inGame?`<div class="search"><input id="cc-in" type="text" autocomplete="off" spellcheck="false" aria-label="Guess a player"><div class="suggest" id="cc-sug" role="listbox" hidden></div></div>
      <div class="actions"><button class="btn" id="cq-hint">Closer player (uses your turn)</button><button class="btn ghost" id="cc-give">Give up (ask the team)</button></div>`
      :`<div class="ol-note">You joined during this round. You'll play from the next one.</div>`}
      <div class="feedback" id="cc-fb" aria-live="polite"></div>
      <div class="section-label"><span>Team guesses, closest first</span><span id="cq-best"></span></div>
      <div class="list" id="cc-board"></div>`)){
      if(inGame){
        ccSearch(q("cc-in"),q("cc-sug"),p=>this.guess(p),p=>arr(S.game.guesses).some(x=>x.id===p.id));
        q("cq-hint").onclick=()=>{ if(S.game.order[S.game.turn]!==S.uid||c.pending) return; c.pending=true; act("cchint"); };
        q("cc-give").onclick=()=>this.askGiveUp();
      }
    }
    if(q("cc-give")){ const asking=g.gu&&g.gu.st==="pending"; q("cc-give").disabled=!!asking; q("cc-give").textContent=asking&&g.gu.from===S.uid?"Waiting for the team…":"Give up (ask the team)"; }
    this.paintGU();
    const cur=g.order[g.turn];
    q("cq-who").textContent=my?"Your turn: make a guess":`${pname(cur)} is guessing…`;
    q("cq-seats").innerHTML=g.order.map((u,i)=>`<span class="seat${i===g.turn?" on":""}">${E(pav(u))} ${E(pname(u))}${S.players[u]&&S.players[u].online?"":" 💤"}</span>`).join("");
    const ck=q("cq-clock"); if(ck.dataset.d!==String(g.deadline)){ ck.dataset.d=String(g.deadline); ck.innerHTML=clockHTML("cq-c",g.deadline,g.secs,my); }
    if(q("cc-in")){ const was=q("cc-in").disabled, dis=!my||c.pending; q("cc-in").disabled=dis; q("cq-hint").disabled=dis;
      q("cc-in").placeholder=my?"Your guess…":`Wait: ${pname(cur)} is guessing`; if(was&&!dis) q("cc-in").focus(); }
    this.teamList(g);
  },
  teamList(g){
    const c=ccCtx(g), el=q("cc-board"); if(!el) return;
    const gs=arr(g.guesses), last=gs[gs.length-1], sorted=[...gs].sort((a,b)=>c.ctx.ranks[a.id]-c.ctx.ranks[b.id]);
    const order=gs.length>1&&g.phase==="play"?[last,...sorted]:sorted;
    el.innerHTML=order.map((x,i)=>{ const p=CC.PLAYERS[x.id], lat=i===0&&gs.length>1&&g.phase==="play"; return ccRow(p,c.secret,c.ctx.ranks[x.id],`${lat?"Latest · ":""}${p.name} · ${pname(x.u)}${x.h?" (hint)":""}`,lat); }).join("")||`<div class="empty">One shared list for the whole team. Each guess shows how close it is: #${CC.fmt(CC.N)} means no link, #1 is the answer.</div>`;
    const b=q("cq-best"); if(b) b.textContent=gs.length?"Best #"+Math.min(...gs.map(x=>c.ctx.ranks[x.id])):"";
  },
  board(){
    const g=S.game, el=q("cc-board"); if(!el||g.mode==="coop") return;
    const rows=g.players.map(u=>({u,p:S.progress[u]||{}})).sort((a,b)=>{
      const A=a.p,B=b.p; if(!!A.done!==!!B.done) return A.done?-1:1; if(A.done) return A.t-B.t; if(!!A.gaveUp!==!!B.gaveUp) return A.gaveUp?1:-1; return (A.b||1e9)-(B.b||1e9); });
    el.innerHTML=rows.map(({u,p})=>`<div class="ol-brow${u===S.uid?" me":""}"><span class="ol-av">${E(pav(u))}</span><span class="nm">${E(pname(u))}</span><span class="st">${p.done?`✓ found it · ${p.g} guess${p.g===1?"":"es"}${p.h?` · ${p.h} hints`:""}`:p.gaveUp?"gave up":p.g?`best #${CC.fmt(p.b)} · ${p.g} guess${p.g===1?"":"es"}`:"thinking…"}</span>${p.done&&u===g.winner?`<span class="medal">🏆</span>`:""}</div>`).join("");
  },
  clientTick(){ const g=S.game; if(g&&g.kind==="close"&&g.gu&&g.phase==="play") this.paintGU(); },
  onChange(old,g){
    const c=ccCtx(g);
    if(old&&old.phase==="play"&&g.phase==="over"){
      if(g.draw) SFX.play("ok"); else if(g.mode==="coop"&&g.winner){ SFX.play("win"); confetti(); }
      else if(g.winner===S.uid){ SFX.play("win"); confetti(); }
      else if(g.winner) SFX.play("bad");
      return;
    }
    if(g.mode!=="coop"||g.phase!=="play") return;
    const gs=arr(g.guesses);
    if(gs.length>CCR.len){ const x=gs[gs.length-1]; if(old) SFX.play(c.ctx.ranks[x.id]<=50?"ok":"draw"); }
    CCR.len=gs.length;
    const k=g.turn+"|"+g.deadline;
    if(CCR.turnKey!==k){ CCR.turnKey=k; c.pending=false; if(g.order[g.turn]===S.uid&&old){ SFX.play("turn"); } }
  }
};

/* ================= 30 Seconds & Letter Rush · simultaneous ================= */
function themePools(th){
  if(!th.t) return {c1:BIG_CLUBS.slice(0,30),c2:BIG_CLUBS,nats:BIG_NATS,lgs:BIG_LEAGUES,coaches:BIG_COACHES};
  const cf={},nf={},lf={},kf={};
  PLAYERS.forEach(p=>{ if(p.tier>1||!th.t(p)) return; p.clubs.forEach(c=>cf[c]=(cf[c]||0)+1); nf[p.k]=(nf[p.k]||0)+1; p.leagues.forEach(l=>lf[l]=(lf[l]||0)+1); p.coaches.forEach(c=>kf[c]=(kf[c]||0)+1); });
  const top=(o,n)=>Object.keys(o).sort((a,b)=>o[b]-o[a]).slice(0,n).map(Number);
  const r={c1:top(cf,25),c2:top(cf,45),nats:top(nf,15),lgs:top(lf,10),coaches:top(kf,12)};
  for(const k in r) if(!r[k].length) r[k]=k==="nats"?BIG_NATS:k==="lgs"?BIG_LEAGUES:k==="coaches"?BIG_COACHES:BIG_CLUBS;
  return r;
}
function makeSpec(th){
  th=th||THEMES.all; const P=themePools(th);
  for(let tries=0;tries<300;tries++){
    const r=Math.random(), c1=()=>pickOne(P.c1), c2=()=>pickOne(P.c2); let s;
    if(r<.16) s={t:"club",a:c1()};
    else if(r<.42){ s={t:"club2",a:c2(),b:c2()}; if(s.a===s.b) continue; }
    else if(r<.56){ s={t:"natLeague",a:pickOne(P.nats),b:pickOne(P.lgs)}; if(s.a===s.b) continue; }
    else if(r<.70) s={t:"natClub",a:pickOne(P.nats),b:c2()};
    else if(r<.82) s={t:"coach",a:pickOne(P.coaches)};
    else if(r<.90) s={t:"posClub",g:pickOne(["Goalkeeper","Defender","Forward"]),a:c1()};
    else if(r<.95) s={t:"uclClub",a:c1()};
    else s={t:"ballon"};
    const ans=PLAYERS.filter(specCat(s,th).pred);
    if(ans.filter(p=>p.tier<=1).length>=(th.t?4:5)&&ans.length<=400) return s;
  }
  return {t:"club",a:clubIdx("Real Madrid")};
}
function specCat(s,th){
  const base=specCat0(s); if(!th||!th.t) return base;
  return {title:base.title,pred:p=>th.t(p)&&base.pred(p)};
}
function specCat0(s){
  const C=CLUBS,K=COUNTRIES; let conds,title;
  switch(s.t){
    case "letter": return letterCategory(s.L);
    case "club": conds=[COND.club(s.a)]; title=`Played for ${C[s.a].name}`; break;
    case "club2": conds=[COND.club(s.a),COND.club(s.b)]; title=`Played for ${C[s.a].name} and ${C[s.b].name}`; break;
    case "natLeague": conds=[COND.nation(s.a),COND.league(s.b)]; title=`${K[s.a].flag} ${K[s.a].name} players who played in ${leagueName(s.b)}`; break;
    case "natClub": conds=[COND.nation(s.a),COND.club(s.b)]; title=`${K[s.a].flag} ${K[s.a].name} players who played for ${C[s.b].name}`; break;
    case "coach": conds=[COND.coach(s.a)]; title=`Played under ${COACHES[s.a]}`; break;
    case "posClub": conds=[COND.pos(s.g),COND.club(s.a)]; title=`${s.g}s who played for ${C[s.a].name}`; break;
    case "uclClub": conds=[COND.ucl(),COND.club(s.a)]; title=`Champions League winners who played for ${C[s.a].name}`; break;
    default: conds=[COND.ballon()]; title="Ballon d'Or winners";
  }
  return {title,pred:p=>conds.every(c=>c.test(p))};
}
function timedEngine(kind){
  const T={mine:null,key:null};
  const myKey=g=>`arc-ans-${S.code}-${g.startsAt}`;
  const mine=g=>{ if(T.key!==g.startsAt){ T.key=g.startsAt; T.mine=ss.get(myKey(g),[]); } return T.mine; };
  return {
    async start(set){
      const total=+set.rounds, specs=[];
      const th=THEMES[set.theme]||THEMES.all;
      if(kind==="letters"){ let ok=LETTER_OK.filter(L=>!th.t||PLAYERS.filter(p=>p.tier<=1&&th.t(p)&&p.starts.has(L.toLowerCase())).length>=8); if(ok.length<3) ok=LETTER_OK; const pool=shuffle(ok.slice()); for(let i=0;i<total;i++) specs.push({t:"letter",L:pool[i%pool.length]}); }
      else { const seen=new Set(); let n=0; while(specs.length<total&&n++<60){ const s=makeSpec(th), k=JSON.stringify(s); if(seen.has(k)) continue; seen.add(k); specs.push(s); } while(specs.length<total) specs.push(makeSpec(th)); }
      const t=now()+4000;
      return {theme:set.theme||"all",kind,at:now(),round:0,total,specs,secs:+set.secs,scoring:set.scoring,phase:"play",startsAt:t,endsAt:t+set.secs*1000,scores:{},res:{},players:onlineUids()};
    },
    async hostTick(){
      const g=S.game;
      if(g.phase==="play"&&now()>g.endsAt+1500) await this.score();
      else if(g.phase==="results"&&now()>g.nextAt) await this.next();
    },
    async score(){
      const g=clone(S.game); if(g.phase!=="play") return;
      const r=g.round, ans=S.answers[r]||{}, lists={};
      Object.keys(ans).forEach(u=>lists[u]=arr(ans[u]));
      const cnt={}; Object.values(lists).forEach(l=>l.forEach(id=>cnt[id]=(cnt[id]||0)+1));
      const multi=Object.keys(lists).length>1&&g.scoring==="unique";
      const res={}; const us=[...new Set([...g.players,...Object.keys(lists)])];
      us.forEach(u=>{ const l=lists[u]||[]; let p=0; const uq=[]; l.forEach(id=>{ if(multi&&cnt[id]===1){ p+=2; uq.push(id); } else p+=1; }); res[u]={p,uq,n:l.length}; g.scores=g.scores||{}; g.scores[u]=(g.scores[u]||0)+p; });
      g.res=g.res||{}; g.res["r"+r]=res; g.phase="results"; g.nextAt=now()+30000;
      await setGame(g);
      const top=Object.entries(res).sort((a,b)=>b[1].p-a[1].p)[0];
      if(top&&top[1].p) sys(`Round ${r+1}: ${pname(top[0])} scored most (+${top[1].p})`);
    },
    async next(){
      const g=clone(S.game); if(g.phase!=="results") return;
      if(g.round+1>=g.total){
        g.phase="over"; await setGame(g);
        const sc=g.scores||{}, best=Math.max(0,...Object.values(sc)); const win=Object.keys(sc).filter(u=>sc[u]===best&&best>0);
        if(win.length){ await award(win,2,true); sys(`🏆 ${win.map(pname).join(" & ")} won ${GAMES[kind].name} with ${best} points`); }
        return;
      }
      g.round++; g.phase="play"; g.startsAt=now()+4000; g.endsAt=g.startsAt+g.secs*1000; delete g.nextAt; await setGame(g);
    },
    submit(v){
      const g=S.game, cat=specCat(g.specs[g.round],themeOf(g)), fb=q("tm-fb"), list=mine(g);
      if(now()<g.startsAt||now()>g.endsAt) return;
      const r=resolve(v,cat.pred);
      if(!r){ fb.className="feedback err"; fb.textContent=`No player called “${v}” in the database.`; SFX.play("bad"); return; }
      if(!r.ok){ fb.className="feedback err"; fb.textContent=`${r.p.base} doesn't fit.`; SFX.play("bad"); return; }
      if(list.includes(r.p.id)){ fb.className="feedback err"; fb.textContent=`${r.p.base} is already on your list.`; return; }
      list.push(r.p.id); ss.set(myKey(g),list); S.net.set(R(`answers/${g.round}/${S.uid}`),list);
      fb.className="feedback ok"; fb.textContent=`✓ ${r.p.base}`; SFX.play("ok");
      this.paintMine(g);
    },
    paintMine(g){ const el=q("tm-mine"); if(!el) return; el.innerHTML=mine(g).slice().reverse().map(id=>`<span class="tag ok${PLAYERS[id].tier===2?" rare":""}">${E(PLAYERS[id].base)}</span>`).join(""); },
    render(st){
      const g=S.game, gm=GAMES[kind];
      if(g.phase==="over"){
        if(skel(st,`tm-over-${g.at}`,`<h3 class="view-title" style="font-size:34px">Full time</h3><div id="tm-stand"></div><div id="tm-end"></div>`)){
          const sc=g.scores||{}; q("tm-stand").innerHTML=`<div class="standings">${Object.keys(sc).sort((a,b)=>sc[b]-sc[a]).map(u=>`<div><span>${E(pav(u))} ${E(pname(u))}</span><b>${sc[u]}</b></div>`).join("")||"<div><span>No points scored</span><b>0</b></div>"}</div>`;
          q("tm-end").innerHTML=endButtons(); bindEnd(st);
          const best=Math.max(0,...Object.values(sc)); if(sc[S.uid]===best&&best>0){ SFX.play("win"); confetti(); }
        }
        return;
      }
      const cat=specCat(g.specs[g.round],themeOf(g));
      if(g.phase==="results"){
        if(skel(st,`tm-res-${g.startsAt}`,`<div class="prompt"><span class="who">${gm.name} · round ${g.round+1} of ${g.total} · results${themeTag(g)}</span><span class="cat">${E(cat.title)}</span></div>
            <div id="tm-res"></div><div class="field"><span>Big names nobody said</span><div class="tally" id="tm-miss"></div></div>
            <div class="section-label"><span>Total</span></div><div id="tm-tot"></div>
            <div class="actions">${S.host?`<button class="btn primary" id="tm-next">${g.round+1>=g.total?"Final results":"Next round"}</button>`:""}<span class="note" id="tm-auto"></span></div>`)){
          const res=(g.res||{})["r"+g.round]||{}, ans=S.answers[g.round]||{};
          const said=new Set(); Object.values(ans).forEach(l=>arr(l).forEach(id=>said.add(id)));
          q("tm-res").innerHTML=Object.keys(res).sort((a,b)=>res[b].p-res[a].p).map(u=>{ const l=arr(ans[u]), uq=new Set(arr(res[u].uq));
            return `<div class="ol-resrow"><div class="ol-brow${u===S.uid?" me":""}"><span class="ol-av">${E(pav(u))}</span><span class="nm">${E(pname(u))}</span><span class="st">${l.length} named</span><b class="pts">+${res[u].p}</b></div><div class="tally">${l.map(id=>`<span class="tag${uq.has(id)?" ok":""}" title="${uq.has(id)?"Only you said this: double points":"Someone else said it too"}">${E(PLAYERS[id].base)}${uq.has(id)?" ×2":""}</span>`).join("")||`<span class="note">Nothing this round</span>`}</div></div>`; }).join("");
          q("tm-miss").innerHTML=PLAYERS.filter(p=>cat.pred(p)&&p.tier===0&&!said.has(p.id)).slice(0,10).map(p=>`<span class="tag">${E(p.base)}</span>`).join("")||`<span class="note">You covered them all.</span>`;
          const sc=g.scores||{}; q("tm-tot").innerHTML=`<div class="standings">${Object.keys(sc).sort((a,b)=>sc[b]-sc[a]).map(u=>`<div><span>${E(pav(u))} ${E(pname(u))}</span><b>${sc[u]}</b></div>`).join("")}</div>`;
          if(q("tm-next")) q("tm-next").onclick=()=>Host.run(()=>this.next());
        }
        return;
      }
      const inGame=true;
      if(skel(st,`tm-play-${g.startsAt}`,`<div class="prompt"><span class="who">${gm.name} · round ${g.round+1} of ${g.total}${themeTag(g)}</span><span class="cat">${E(cat.title)}</span></div>
          <div class="ol-count" id="tm-count"></div>
          ${clockHTML("tm-clock",g.endsAt,g.secs,true)}
          <form class="answer" id="tm-form"><input id="tm-in" autocomplete="off" spellcheck="false" placeholder="Type a name, press Enter" aria-label="Player name"><button class="btn primary">Enter</button></form>
          <div class="feedback" id="tm-fb" aria-live="polite"></div>
          <div class="tally" id="tm-mine"></div>
          <div class="section-label"><span>Live</span><span>${g.scoring==="unique"?"Answers nobody else gives score double":"1 point per answer"}</span></div>
          <div class="ol-board" id="tm-live"></div>`)){
        q("tm-form").onsubmit=e=>{ e.preventDefault(); const v=q("tm-in").value; q("tm-in").value=""; if(v.trim()) this.submit(v); };
        this.paintMine(g); this.clientTick();
      }
      const ans=S.answers[g.round]||{};
      q("tm-live").innerHTML=g.players.concat(Object.keys(ans).filter(u=>!g.players.includes(u))).map(u=>`<div class="ol-brow${u===S.uid?" me":""}"><span class="ol-av">${E(pav(u))}</span><span class="nm">${E(pname(u))}</span><span class="st">${arr(ans[u]).length} named</span><b class="pts">${(g.scores||{})[u]||0}</b></div>`).join("");
    },
    clientTick(){
      const g=S.game; if(!g||g.kind!==kind) return;
      if(g.phase==="results"){ const a=q("tm-auto"); if(a) a.textContent=`Next round starts automatically in ${Math.max(0,Math.ceil((g.nextAt-now())/1000))}s`; return; }
      if(g.phase!=="play") return;
      const inp=q("tm-in"), cnt=q("tm-count"); if(!inp) return;
      const t=now();
      if(t<g.startsAt){ inp.disabled=true; const s=Math.ceil((g.startsAt-t)/1000); if(cnt.textContent!==String(s)){ cnt.textContent=String(s); cnt.hidden=false; SFX.play("tick"); } }
      else if(t<=g.endsAt){ if(inp.disabled){ inp.disabled=false; inp.focus(); cnt.hidden=true; cnt.textContent=""; SFX.play("go"); } }
      else if(!inp.disabled||!cnt.dataset.over){ inp.disabled=true; cnt.dataset.over="1"; cnt.hidden=false; cnt.textContent="Time!"; }
    }
  };
}
ENG.thirty=timedEngine("thirty");
ENG.letters=timedEngine("letters");

/* ================= Name Chain · turn by turn ================= */
const CH={lastTurn:null,lastLen:0};
ENG.chain={
  async start(set){
    const order=shuffle(onlineUids()); let first;
    const th=THEMES[set.theme]||THEMES.all, ok=p=>!th.t||th.t(p);
    let cands=PLAYERS.slice(0,350).filter(ok); if(cands.length<20) cands=PLAYERS.filter(p=>p.tier<=1&&ok(p)); if(!cands.length) cands=PLAYERS.slice(0,350);
    let n=0; do{ first=pickOne(cands); n++; }while(n<200&&(!first.end||!PLAYERS.some(p=>p.tier<=1&&ok(p)&&p.starts.has(first.end)&&p.id!==first.id)));
    return {theme:set.theme||"all",kind:"chain",at:now(),order,turn:0,letter:first.end,chain:[{id:first.id,u:""}],used:{["p"+first.id]:1},out:{},secs:+set.secs,deadline:now()+3500+set.secs*1000,phase:"play"};
  },
  adv(g){ const n=g.order.length; let t=g.turn; for(let i=0;i<n;i++){ t=(t+1)%n; if(!(g.out||{})[g.order[t]]) break; } g.turn=t; },
  async hostAction(a){
    if(a.type!=="chain") return;
    const g=clone(S.game); if(g.phase!=="play"||g.order[g.turn]!==a.u) return;
    const p=PLAYERS[a.id]; g.used=g.used||{};
    if(!p||!p.end||!p.starts.has(g.letter)||g.used["p"+a.id]||!fitsTheme(themeOf(g),a.id)) return;
    g.chain=arr(g.chain); g.chain.push({id:a.id,u:a.u}); g.used["p"+a.id]=1; g.letter=p.end; g.lastOut=null;
    this.adv(g); g.deadline=now()+g.secs*1000; await setGame(g);
  },
  async hostTick(){
    const g0=S.game; if(g0.phase!=="play"||now()<=g0.deadline) return;
    const g=clone(g0); g.out=g.out||{}; const cur=g.order[g.turn]; g.out[cur]=1; g.outOrder=[...arr(g.outOrder),cur];
    const used=g.used||{};
    g.lastOut={u:cur,ex:PLAYERS.filter(p=>p.tier<=1&&p.starts.has(g.letter)&&!used["p"+p.id]&&fitsTheme(themeOf(g),p.id)).slice(0,3).map(p=>p.base)};
    const alive=g.order.filter(u=>!g.out[u]);
    if((g.order.length>1&&alive.length<=1)||!alive.length){
      g.phase="over"; g.winner=g.order.length>1?(alive[0]||""):""; await setGame(g);
      if(g.winner){ await award([g.winner],2,true); sys(`🏆 ${pname(g.winner)} wins Name Chain! The chain reached ${arr(g.chain).length-1} names.`); }
      else sys(`⛓️ Chain over at ${arr(g.chain).length-1} names`);
      return;
    }
    this.adv(g); g.deadline=now()+g.secs*1000+1500; await setGame(g);
    sys(`⏱ ${pname(cur)} ran out of time and is out`);
  },
  onChange(old,g){
    if(g.phase!=="play") { if(old&&old.phase==="play"&&g.winner===S.uid){ SFX.play("win"); confetti(); } return; }
    const len=arr(g.chain).length;
    if(old&&len>arr(old.chain).length) SFX.play("ok");
    if(old&&g.lastOut&&(!old.lastOut||old.lastOut.u!==g.lastOut.u)) SFX.play("bad");
    const my=g.order[g.turn]===S.uid;
    if(my&&(CH.lastTurn!==g.deadline)){ CH.lastTurn=g.deadline; SFX.play("turn"); CH.pending=false; }
  },
  render(st){
    const g=S.game, chain=arr(g.chain), out=g.out||{}, used=g.used||{};
    const seats=`<div class="seats">${g.order.map((u,i)=>`<span class="seat${i===g.turn&&g.phase==="play"?" on":""}${out[u]?" out":""}">${E(pav(u))} ${E(pname(u))}</span>`).join("")}</div>`;
    const hist=`<div class="history">${chain.slice().reverse().map(x=>{ const b=E(PLAYERS[x.id].base); return `<div><span>${b.slice(0,-1)}<mark>${b.slice(-1)}</mark></span><span>${E(pname(x.u))}</span></div>`; }).join("")}</div>`;
    if(g.phase==="over"){
      skel(st,"ch-over-"+g.at,`<h3 class="view-title" style="font-size:34px">${g.winner?E(pname(g.winner))+" wins":"Chain over"}</h3><p class="note" style="margin:0">The chain reached ${chain.length-1} names.</p>${seats}<div id="ch-end"></div>${hist}`)&&(q("ch-end").innerHTML=endButtons(),bindEnd(st));
      return;
    }
    const my=g.order[g.turn]===S.uid, inGame=g.order.includes(S.uid);
    if(skel(st,"ch-play-"+g.at,`<div id="ch-seats"></div>
        <div class="prompt"><span class="who" id="ch-who"></span><div class="chainletter"><span class="big" id="ch-letter"></span><span class="cat" id="ch-cat"></span></div><span class="note" style="color:inherit;opacity:.85">${themeTag(g).replace(" · ","Theme: ")}</span></div>
        <div id="ch-clock"></div>
        ${inGame?`<form class="answer" id="ch-form"><input id="ch-in" autocomplete="off" spellcheck="false" placeholder="Name a player…" aria-label="Player name"><button class="btn primary">Enter</button></form>`:`<div class="ol-note">You're watching this game. You'll play in the next one.</div>`}
        <div class="feedback" id="ch-fb" aria-live="polite"></div><div id="ch-hist"></div>`)){
      if(q("ch-form")) q("ch-form").onsubmit=e=>{ e.preventDefault(); const v=q("ch-in").value; q("ch-in").value=""; if(v.trim()) this.submit(v); };
    }
    q("ch-seats").innerHTML=seats;
    q("ch-letter").textContent=g.letter.toUpperCase();
    q("ch-cat").textContent=`Starts with ${g.letter.toUpperCase()}`;
    q("ch-who").textContent=my?"Your turn!":`${pname(g.order[g.turn])}'s turn`;
    const ck=q("ch-clock"); if(ck.dataset.d!==String(g.deadline)){ ck.dataset.d=String(g.deadline); ck.innerHTML=clockHTML("ch-c",g.deadline,g.secs,my); }
    if(q("ch-in")){ const was=q("ch-in").disabled; q("ch-in").disabled=!my||CH.pending; q("ch-in").placeholder=my?`A player starting with ${g.letter.toUpperCase()}…`:"Wait for your turn…"; if(was&&my&&!CH.pending) q("ch-in").focus(); }
    const fb=q("ch-fb"); if(g.lastOut&&fb.dataset.o!==g.lastOut.u+g.deadline){ fb.dataset.o=g.lastOut.u+g.deadline; fb.className="feedback err"; fb.textContent=`${pname(g.lastOut.u)} ran out of time.`+(arr(g.lastOut.ex).length?` Could have said: ${arr(g.lastOut.ex).join(", ")}.`:""); }
    q("ch-hist").innerHTML=hist;
  },
  submit(v){
    const g=S.game, used=g.used||{}, L=g.letter, fb=q("ch-fb");
    if(g.order[g.turn]!==S.uid) return;
    const th=themeOf(g); const r=resolve(v,p=>p.starts.has(L)&&!used["p"+p.id]&&!!p.end&&(!th.t||th.t(p)));
    if(!r){ fb.className="feedback err"; fb.textContent=`No player called “${v}” in the database.`; SFX.play("bad"); return; }
    if(used["p"+r.p.id]){ fb.className="feedback err"; fb.textContent=`${r.p.base} has already been named.`; SFX.play("bad"); return; }
    if(!r.ok){ fb.className="feedback err"; fb.textContent=r.p.starts.has(L)?`${r.p.base} doesn't fit the theme (${th.l}).`:`${r.p.base} doesn't start with ${L.toUpperCase()}.`; SFX.play("bad"); return; }
    CH.pending=true; q("ch-in").disabled=true; fb.className="feedback ok"; fb.textContent=`✓ ${r.p.base}`;
    act("chain",{id:r.p.id});
  }
};

/* ================= Link Up · online card game ================= */
const topColor=g=>g.top.kind==="wild"?g.top.chosen:g.top.color;
const canAction=(g,cd)=>cd.kind==="wild"||cd.color===topColor(g)||g.top.kind===cd.kind;
const catBlock=(g,cd)=>{ if(g.need&&cd.color!==g.need) return `After the Wild, play a ${COLOR_NAMES[g.need]} card.`; if(g.anchor&&g.anchor.kind==="nation"&&cd.kind==="nation") return "Two nations can't be linked."; return null; };
const linkOK=(g,cd,p)=>(!g.anchor||cardCond(g.anchor).test(p))&&cardCond(cd).test(p)&&!((g.used||{})["p"+p.id]);
const LU={sel:null,pending:false,handKey:"",turnKey:""};
function luLog(g,t){ g.log=[t,...arr(g.log)].slice(0,25); }
function luHand(c,id){ if(id.startsWith("cpu")) return c.cpu[id]||(c.cpu[id]=[]); return c.hands[id]||(c.hands[id]=[]); }
async function luSecrets(){
  if(!Host.cache){
    const s=await S.net.get(`secrets/${S.code}`)||{}, h=await S.net.get(`hands/${S.code}`)||{};
    const cpu={}; Object.entries(s.cpu||{}).forEach(([k,v])=>cpu[k]=arr(v));
    const hands={}; Object.entries(h).forEach(([k,v])=>hands[k]=arr(v));
    Host.cache={deck:arr(s.deck),discard:arr(s.discard),cpu,hands};
  }
  return Host.cache;
}
async function luSave(c){
  await S.net.set(`secrets/${S.code}`,{deck:c.deck,discard:c.discard,cpu:c.cpu});
  const upd={}; Object.entries(c.hands).forEach(([k,v])=>upd[k]=v.length?v:null);
  await S.net.update(`hands/${S.code}`,upd);
}
function luDraw(c,g,id,n){
  for(let k=0;k<n;k++){
    if(!c.deck.length&&c.discard.length>1){ const keep=c.discard.pop(); c.deck=shuffle(c.discard.map(x=>{ delete x.chosen; return x; })); c.discard=[keep]; }
    if(c.deck.length) luHand(c,id).push(c.deck.shift());
  }
  g.deckCount=c.deck.length; g.counts=g.counts||{}; g.counts[id]=luHand(c,id).length;
}
function luTimers(g){
  const seat=g.seats[g.turn]; g.cpuAt=0; g.deadline=0;
  if(seat.cpu) g.cpuAt=now()+1400;
  else if(g.secs) g.deadline=now()+g.secs*1000;
  else if(!(S.players[seat.id]&&S.players[seat.id].online)) g.deadline=now()+10000;
}
function luPlay(c,g,id,cd,p,chosen){
  const seat=g.seats.find(s=>s.id===id), hand=luHand(c,id);
  hand.splice(hand.findIndex(x=>x.uid===cd.uid),1); c.discard.push(cd);
  let skip=false;
  if(cd.kind==="wild"){ cd.chosen=COLOR_NAMES[chosen]?chosen:"club"; g.anchor=null; g.need=cd.chosen; luLog(g,`${seat.name} played a Wild and chose ${COLOR_NAMES[cd.chosen]}`); }
  else if(cd.kind==="skip"){ skip=true; luLog(g,`${seat.name} played Skip`); }
  else if(cd.kind==="plus2"){ skip=true; const nx=g.seats[(g.turn+1)%g.seats.length]; luDraw(c,g,nx.id,2); luLog(g,`${seat.name} played +2 · ${nx.name} draws 2`); }
  else { const prev=g.anchor; g.anchor=cd; g.need=null; g.used=g.used||{}; g.used["p"+p.id]=1; luLog(g,`${seat.name} played ${cardName(cd)} with ${p.base}${prev?` (${cardName(prev)} → ${cardName(cd)})`:""}`); }
  g.top=cd; g.counts[id]=hand.length;
  if(!hand.length){ g.phase="over"; g.winner=id; luLog(g,`🏆 ${seat.name} wins!`); return; }
  if(hand.length===1) luLog(g,`${seat.name} is down to the last card!`);
  g.turn=(g.turn+1+(skip?1:0))%g.seats.length; luTimers(g);
}
async function luCommit(c,g){
  await luSave(c); await setGame(g);
  if(g.phase==="over"){ const w=g.seats.find(s=>s.id===g.winner); if(w&&!w.cpu){ await award([w.id],3,true); } sys(`🏆 ${w?w.name:"Someone"} wins Link Up!`); }
}
ENG.linkup={
  async start(set){
    const humans=onlineUids(), seats=humans.map(u=>({id:u,name:S.players[u].name,av:S.players[u].av,cpu:false}));
    for(let i=1;i<=+set.cpus;i++) seats.push({id:"cpu"+i,name:"CPU "+i,av:"🤖",cpu:true});
    const deck=buildDeck().map(x=>clone(x)); const c={deck,discard:[],cpu:{},hands:{}}, counts={};
    seats.forEach(s=>{ const h=c.deck.splice(0,+set.hand); if(s.cpu) c.cpu[s.id]=h; else c.hands[s.id]=h; counts[s.id]=h.length; });
    let top; do{ top=c.deck.shift(); if(isAction(top)) c.deck.push(top); }while(isAction(top));
    c.discard.push(top);
    Host.cache=c; await S.net.remove(`hands/${S.code}`); await luSave(c);
    const g={kind:"linkup",at:now(),seats:shuffle(seats),turn:0,top,anchor:top,need:null,used:{},log:[`Kick-off card: ${cardName(top)}`],counts,deckCount:c.deck.length,secs:+set.secs,level:set.level,phase:"play"};
    luTimers(g); return clone(g);
  },
  async hostAction(a){
    const g=clone(S.game); if(g.phase!=="play") return;
    const seat=g.seats[g.turn]; if(seat.id!==a.u) return;
    const c=await luSecrets();
    if(a.type==="draw"){ luDraw(c,g,seat.id,1); luLog(g,`${seat.name} drew a card`); g.turn=(g.turn+1)%g.seats.length; luTimers(g); return luCommit(c,g); }
    if(a.type!=="play") return;
    const cd=luHand(c,seat.id).find(x=>x.uid===a.card); if(!cd) return;
    if(isAction(cd)){ if(!canAction(g,cd)) return; luPlay(c,g,seat.id,cd,null,a.chosen); }
    else { const p=PLAYERS[a.pid]; if(!p||catBlock(g,cd)||!linkOK(g,cd,p)) return; luPlay(c,g,seat.id,cd,p); }
    return luCommit(c,g);
  },
  async hostTick(){
    const g0=S.game; if(g0.phase!=="play") return;
    const seat=g0.seats[g0.turn];
    if(seat.cpu){ if(now()>=g0.cpuAt) await this.cpu(); return; }
    const off=!(S.players[seat.id]&&S.players[seat.id].online);
    if(off&&!g0.deadline){ const g=clone(g0); g.deadline=now()+10000; await setGame(g); return; }
    if(g0.deadline&&now()>g0.deadline){ const g=clone(g0), c=await luSecrets(); luDraw(c,g,seat.id,1); luLog(g,`⏱ ${seat.name} ran out of time and drew a card`); g.turn=(g.turn+1)%g.seats.length; luTimers(g); await luCommit(c,g); }
  },
  async cpu(){
    const g=clone(S.game), c=await luSecrets(), seat=g.seats[g.turn], hand=luHand(c,seat.id), lv=LEVELS[g.level]||LEVELS.normal;
    const opts=[];
    for(const cd of hand){
      if(isAction(cd)){ if(cd.kind!=="wild"&&canAction(g,cd)) opts.push({cd,w:2}); continue; }
      if(catBlock(g,cd)||Math.random()<lv.miss*3) continue;
      const cands=PLAYERS.filter(p=>p.tier<=lv.tier&&linkOK(g,cd,p));
      if(cands.length) opts.push({cd,p:pickOne(cands.slice(0,12)),w:3});
    }
    if(!opts.length){
      const wild=hand.find(x=>x.kind==="wild");
      if(wild&&Math.random()<.85){ const n={}; hand.forEach(x=>{ if(!isAction(x)) n[x.color]=(n[x.color]||0)+1; }); luPlay(c,g,seat.id,wild,null,Object.keys(n).sort((a,b)=>n[b]-n[a])[0]||"club"); }
      else { luDraw(c,g,seat.id,1); luLog(g,`${seat.name} drew a card`); g.turn=(g.turn+1)%g.seats.length; luTimers(g); }
    } else { opts.sort((a,b)=>b.w-a.w+(Math.random()-.5)); const o=opts[0]; luPlay(c,g,seat.id,o.cd,o.p||null); }
    await luCommit(c,g);
  },
  onChange(old,g){
    if(g.phase==="over"){ if(old&&old.phase==="play"){ if(g.winner===S.uid){ SFX.play("win"); confetti(); } else SFX.play("bad"); } return; }
    const k=g.turn+"|"+arr(g.log).length;
    if(LU.turnKey!==k){ LU.turnKey=k; LU.pending=false; LU.sel=null;
      if(g.seats[g.turn].id===S.uid){ SFX.play("turn"); } else if(old) SFX.play("draw"); }
  },
  render(st){
    const g=S.game, seat=g.seats[g.turn], my=seat.id===S.uid&&g.phase==="play", inGame=g.seats.some(s=>s.id===S.uid);
    if(skel(st,"lu-"+g.at,`<div class="opp" id="lu-seats"></div>
        <div class="table"><div class="pile"><div id="lu-top"></div><button class="card back" id="lu-deck" aria-label="Draw a card"><span class="t">Deck</span><span class="n" id="lu-deckn">Draw</span><span class="f"></span></button></div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div class="prompt" style="padding:12px 14px"><span class="who" id="lu-who"></span><span id="lu-ask" style="font-size:16px"></span></div><div id="lu-clock"></div></div></div>
        <form class="answer" id="lu-form" hidden><input id="lu-in" autocomplete="off" spellcheck="false" placeholder="Name the linking player…" aria-label="Linking player"><button class="btn primary">Play</button><button class="btn ghost" type="button" id="lu-cancel">Cancel</button></form>
        <div class="colorpick" id="lu-colors" hidden></div>
        <div class="feedback" id="lu-fb" aria-live="polite"></div>
        <div id="lu-over"></div>
        ${inGame?`<div class="section-label"><span>Your hand</span><span id="lu-hc"></span></div><div class="hand" id="lu-hand"></div>`:`<div class="ol-note">You're watching this game. You'll get cards in the next one.</div>`}
        <div class="section-label"><span>Match log</span></div><div class="log" id="lu-log"></div>`)){
      q("lu-deck").onclick=()=>{ if(!this.myTurn()||LU.pending) return; LU.pending=true; act("draw"); SFX.play("draw"); };
      q("lu-cancel").onclick=()=>{ LU.sel=null; q("lu-form").hidden=true; LU.handKey=""; refresh(); };
      q("lu-form").onsubmit=e=>{ e.preventDefault(); this.submit(q("lu-in").value); };
      LU.handKey=""; LU.turnKey=g.turn+"|"+arr(g.log).length;
    }
    q("lu-seats").innerHTML=g.seats.map((s,i)=>`<span class="seat${i===g.turn&&g.phase==="play"?" on":""}">${E(s.av)} ${E(s.name)}${s.id===S.uid?" (you)":""}<b>${(g.counts||{})[s.id]||0}</b>${!s.cpu&&!(S.players[s.id]&&S.players[s.id].online)?" 💤":""}</span>`).join("");
    q("lu-top").innerHTML=cardHTML(g.top,false);
    q("lu-deckn").textContent=`Draw (${g.deckCount||0})`;
    q("lu-who").textContent=g.phase!=="play"?"Game over":my?"Your turn":`${seat.name}${seat.cpu?" is thinking…":"'s turn"}`;
    q("lu-ask").innerHTML=g.need?`Wild: play any <b>${COLOR_NAMES[g.need]}</b> card and name a player who fits it.`:`On the table: <b>${E(cardName(g.anchor||g.top))}</b>${g.top.kind!=="wild"&&g.anchor&&g.top.uid!==g.anchor.uid?` (${E(cardName(g.top))} on top, colour ${COLOR_NAMES[topColor(g)]})`:""}. Pick a card and name a player who links them.`;
    const ck=q("lu-clock"); const dk=String(g.deadline||0); if(ck.dataset.d!==dk){ ck.dataset.d=dk; ck.innerHTML=g.deadline?clockHTML("lu-c",g.deadline,g.secs||10,my):""; }
    q("lu-log").innerHTML=arr(g.log).map(t=>`<div>${E(t)}</div>`).join("");
    if(q("lu-hand")){
      const hk=JSON.stringify(S.hand)+"|"+(LU.sel||"")+"|"+my+"|"+(g.top&&g.top.uid)+"|"+g.need;
      if(hk!==LU.handKey){ LU.handKey=hk;
        q("lu-hc").textContent=S.hand.length+" cards";
        q("lu-hand").innerHTML=S.hand.map(cd=>{ const ok=my&&(isAction(cd)?canAction(g,cd):!catBlock(g,cd)); return cardHTML(cd,true,ok?"":" dim"); }).join("");
        q("lu-hand").querySelectorAll("button.card").forEach(b=>{ b.setAttribute("aria-pressed",String(LU.sel===+b.dataset.uid)); b.onclick=()=>this.select(+b.dataset.uid); });
      }
    }
    const ov=q("lu-over");
    if(g.phase==="over"&&!ov.dataset.done){ ov.dataset.done="1"; const w=g.seats.find(s=>s.id===g.winner); ov.innerHTML=`<div class="panel"><h3 class="view-title" style="font-size:34px">${E(w?(w.id===S.uid?"You win!":w.name+" wins"):"Game over")}</h3><p class="note" style="margin:0">${Object.keys(g.used||{}).length} players named this game.</p>${endButtons()}</div>`; bindEnd(ov); q("lu-form").hidden=true; q("lu-colors").hidden=true; }
  },
  myTurn(){ const g=S.game; return g&&g.phase==="play"&&g.seats[g.turn].id===S.uid; },
  select(uid){
    const g=S.game, fb=q("lu-fb");
    if(!this.myTurn()){ fb.className="feedback err"; fb.textContent="Wait for your turn."; return; }
    if(LU.pending) return;
    const cd=S.hand.find(x=>x.uid===uid); if(!cd) return; fb.textContent="";
    if(isAction(cd)){
      if(!canAction(g,cd)){ fb.className="feedback err"; fb.textContent=`${cardName(cd)} needs a ${COLOR_NAMES[topColor(g)]||"matching"} card on top.`; return; }
      if(cd.kind==="wild"){ LU.sel=uid; LU.handKey=""; refresh(); const box=q("lu-colors"); box.hidden=false; q("lu-form").hidden=true;
        box.innerHTML=Object.keys(COLOR_NAMES).map(c=>`<button type="button" style="--cc:${COLORS[c]}" data-c="${c}">${COLOR_NAMES[c]}</button>`).join("");
        box.querySelectorAll("button").forEach(b=>b.onclick=()=>{ box.hidden=true; LU.pending=true; act("play",{card:uid,chosen:b.dataset.c}); }); return; }
      LU.pending=true; act("play",{card:uid}); return;
    }
    const why=catBlock(g,cd); if(why){ fb.className="feedback err"; fb.textContent=why; return; }
    LU.sel=uid; LU.handKey=""; refresh(); q("lu-colors").hidden=true; q("lu-form").hidden=false;
    q("lu-in").placeholder=g.anchor?`Who links ${cardName(g.anchor)} and ${cardName(cd)}?`:`Name a player who fits ${cardName(cd)}`; q("lu-in").value=""; q("lu-in").focus();
  },
  submit(v){
    const g=S.game, cd=S.hand.find(x=>x.uid===LU.sel), fb=q("lu-fb"); if(!cd||!v.trim()||!this.myTurn()) return;
    const r=resolve(v,p=>linkOK(g,cd,p));
    if(!r){ fb.className="feedback err"; fb.textContent=`No player called “${v}” in the database.`; SFX.play("bad"); return; }
    if((g.used||{})["p"+r.p.id]){ fb.className="feedback err"; fb.textContent=`${r.p.base} has already been used this game.`; SFX.play("bad"); return; }
    if(!r.ok){ const fails=[g.anchor?cardCond(g.anchor):null,cardCond(cd)].filter(c=>c&&!c.test(r.p)).map(c=>c.neg); fb.className="feedback err"; fb.textContent=`${r.p.base} ${fails.join(" and ")}.`; SFX.play("bad"); return; }
    LU.pending=true; q("lu-form").hidden=true; q("lu-in").value=""; fb.className="feedback ok"; fb.textContent=`✓ ${r.p.base} links them.`; SFX.play("ok");
    act("play",{card:cd.uid,pid:r.p.id});
  }
};

/* ================= Guess the Player · duel on one device ================= */
const Duel={st:null,
  open(){
    const main=q("ol-main"); S.view="duel";
    const cfg=ls.get("arc-duel",{n:2,level:"0"});
    main.innerHTML=`<h2 class="view-title">Guess the Player Duel</h2>
      <p class="lede">Two to four players, one phone or computer. Take turns guessing the same secret footballer. Everyone sees every guess, so use the others' clues. Whoever names the secret player wins.</p>
      <div class="panel" id="du-setup"></div>`;
    const s=q("du-setup"), names=document.createElement("div");
    const draw=()=>{ names.innerHTML=""; names.appendChild(nameInputs(cfg.n,"dn",ls.get("arc-names",[]))); };
    s.appendChild(field("Players",seg("du-n",[[2,"2"],[3,"3"],[4,"4"]],cfg.n,v=>{ cfg.n=v; draw(); })));
    s.appendChild(names); draw();
    s.appendChild(field("Secret player from",seg("du-l",[["0","Stars"],["1","Well known"],["2","Deep cuts"]],cfg.level,v=>cfg.level=v)));
    const go=document.createElement("button"); go.className="btn primary go"; go.textContent="Start duel";
    go.onclick=()=>{ ls.set("arc-duel",cfg); const ns=readNames("dn",cfg.n); ls.set("arc-names",ns); this.start(ns,+cfg.level); };
    s.appendChild(go);
  },
  start(names,lv){
    const pool=CC.PLAYERS.filter(p=>p.tier<=lv&&p.clubs.size>=2), secret=pickOne(pool);
    this.st={names,secret,ctx:CC.rankFor(secret),turn:0,guesses:[],over:false,winner:null};
    const main=q("ol-main");
    main.innerHTML=`<h2 class="view-title">Guess the Player Duel</h2>
      <div class="seats" id="du-seats"></div>
      <div class="prompt"><span class="who">Pass the phone</span><span class="cat" id="du-who"></span></div>
      <div class="search"><input id="du-in" type="text" autocomplete="off" spellcheck="false" placeholder="Type a player's name…" aria-label="Guess a player"><div class="suggest" id="du-sug" hidden></div></div>
      <div class="actions"><button class="btn" id="du-hint">Closer player (uses your turn)</button><button class="btn ghost" id="du-reveal">Reveal answer</button></div>
      <div class="feedback" id="du-fb" aria-live="polite"></div>
      <div id="du-over"></div>
      <div class="section-label"><span>All guesses, closest first</span></div><div class="list" id="du-list"></div>`;
    ccSearch(q("du-in"),q("du-sug"),p=>this.guess(p),p=>this.st.guesses.some(x=>x.id===p.id));
    q("du-hint").onclick=()=>{ const st=this.st; if(st.over) return; const best=st.guesses.length?Math.min(...st.guesses.map(x=>st.ctx.ranks[x.id])):CC.N+1;
      const p=closerPick(st.ctx,best,x=>st.guesses.some(y=>y.id===x.id)); if(!p) return; this.guess(p,true); };
    q("du-reveal").onclick=()=>{ this.st.over=true; this.paint(); };
    this.paint(); q("du-in").focus();
  },
  guess(p,hint){
    const st=this.st; if(st.over) return;
    if(st.guesses.some(x=>x.id===p.id)){ q("du-fb").className="feedback err"; q("du-fb").textContent=`${p.name} has already been guessed.`; return; }
    st.guesses.push({id:p.id,by:st.turn,hint:!!hint});
    const r=st.ctx.ranks[p.id];
    if(p.id===st.secret.id){ st.over=true; st.winner=st.turn; SFX.play("win"); confetti(); }
    else { SFX.play(r<=50?"ok":"draw"); q("du-fb").className="feedback"; q("du-fb").textContent=`${hint?"Hint: ":""}${p.name} is #${CC.fmt(r)}.`; st.turn=(st.turn+1)%st.names.length; }
    this.paint(); q("du-in").focus();
  },
  paint(){
    const st=this.st, best=i=>{ const r=st.guesses.filter(x=>x.by===i).map(x=>st.ctx.ranks[x.id]); return r.length?Math.min(...r):null; };
    q("du-seats").innerHTML=st.names.map((n,i)=>`<span class="seat${i===st.turn&&!st.over?" on":""}">${E(n)}${best(i)?` · #${CC.fmt(best(i))}`:""}</span>`).join("");
    q("du-who").textContent=st.over?(st.winner!=null?`${st.names[st.winner]} wins!`:"Answer revealed"):`${st.names[st.turn]}, your guess`;
    q("du-in").disabled=st.over; q("du-hint").disabled=st.over;
    const sorted=[...st.guesses].sort((a,b)=>st.ctx.ranks[a.id]-st.ctx.ranks[b.id]);
    q("du-list").innerHTML=sorted.map(x=>{ const p=CC.PLAYERS[x.id]; return ccRow(p,st.secret,st.ctx.ranks[x.id],`${p.name} · ${st.names[x.by]}${x.hint?" (hint)":""}`); }).join("");
    if(st.over&&!q("du-over").innerHTML){ q("du-over").innerHTML=revealCard(st.secret)+`<div class="actions" style="margin-top:12px"><button class="btn primary" id="du-again">Play again</button><button class="btn ghost" id="du-new">Change players</button></div>`;
      q("du-again").onclick=()=>this.start(st.names,+(ls.get("arc-duel",{level:"0"}).level)); q("du-new").onclick=()=>this.open(); }
  }
};


/* ================= Settings: theme, text size, sound, vibration, install ================= */
const UI=Object.assign({theme:"system",size:"1",vibrate:true},ls.get("arc-ui",{}));
function applyUI(){
  const r=document.documentElement;
  if(UI.theme==="system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",UI.theme);
  document.body.style.zoom=UI.size==="1"?"":UI.size;
  const dark=UI.theme==="dark"||(UI.theme==="system"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
  const tc=document.querySelector('meta[name="theme-color"]'); if(tc) tc.content=dark?"#0b1510":"#14603c";
}
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installEvt=e; paintInstall(); });
const standalone=()=>(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
function headerButtons(){
  const h=q("hdr-icons"); if(!h||h.dataset.ready) return; h.dataset.ready="1";
  h.innerHTML=`<a class="icon-btn" href="#friends" style="display:inline-flex;align-items:center;gap:4px;text-decoration:none;position:relative">👥 Friends<b class="fr-badge" hidden></b></a><button class="icon-btn" id="hdr-set" aria-label="Settings">⚙ Settings</button>`;
  q("hdr-set").onclick=openSettings;
}
function dialog(id,title,body){
  const old=q(id); if(old) old.remove();
  const o=document.createElement("div"); o.className="overlay"; o.id=id;
  o.innerHTML=`<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-t"><button class="btn ghost close" data-x>Close</button><h3 id="${id}-t">${title}</h3>${body}</div>`;
  document.body.appendChild(o);
  o.addEventListener("click",e=>{ if(e.target===o||e.target.hasAttribute("data-x")) o.remove(); });
  return o;
}
function openSettings(){
  const seg=(k,opts,cur)=>`<div class="seg" data-set="${k}">${opts.map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join("")}</div>`;
  const o=dialog("set-dlg","Settings",`
    <div class="field"><span>Theme</span>${seg("theme",[["system","Auto"],["light","Light"],["dark","Dark"]],UI.theme)}</div>
    <div class="field"><span>Text size</span>${seg("size",[["1","Normal"],["1.12","Large"],["1.25","Extra large"]],UI.size)}</div>
    <div class="field"><span>Sound effects</span>${seg("sound",[["on","On"],["off","Off"]],SFX.muted?"off":"on")}</div>
    <div class="field"><span>Vibration</span>${seg("vibrate",[["true","On"],["false","Off"]],String(UI.vibrate))}</div>
    <div class="field" id="set-install"></div>`);
  o.querySelectorAll("[data-set]").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    g.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true");
    const k=g.dataset.set, v=b.dataset.v;
    if(k==="sound"){ if((v==="off")!==SFX.muted) SFX.toggle(); paintMute(); SFX.play("ok"); return; }
    UI[k]=k==="vibrate"?v==="true":v; ls.set("arc-ui",UI); applyUI(); if(k==="vibrate") haptic("ok");
  }));
  paintInstall();
}
function paintInstall(){
  const w=q("set-install"); if(!w) return;
  if(standalone()){ w.innerHTML=`<span>App</span><p class="note" style="margin:0">Installed. You're using the app ✓</p>`; return; }
  if(installEvt){ w.innerHTML=`<span>App</span><button class="btn primary" id="set-inst">📲 Install Matchday Arcade</button>`;
    q("set-inst").onclick=async()=>{ installEvt.prompt(); await installEvt.userChoice.catch(()=>null); installEvt=null; paintInstall(); }; return; }
  w.innerHTML=`<span>Install as an app</span><p class="note" style="margin:0">${isIOS()?"In Safari, tap the Share button, then <b>Add to Home Screen</b>.":"Open your browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>."} It opens full screen like a normal app, and the same-device games work offline.</p>`;
}
function paintMute(){ const m=q("ol-mute"); if(m) m.innerHTML=SFX.muted?`🔇<span class="lbl"> Sound off</span>`:`🔊<span class="lbl"> Sound on</span>`; }

/* ================= Haptics & turn alerts ================= */
const HAPT={ok:[18],bad:[40,50,40],turn:[120,60,120],win:[60,40,60,40,160],go:[30],draw:[12]};
function haptic(t){ if(!UI.vibrate||(navigator.userActivation&&!navigator.userActivation.hasBeenActive)) return; const p=HAPT[t]; if(p) try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} }
const baseTitle=document.title; let titleIv=null;
function flashTitle(text){
  if(!document.hidden) return; clearInterval(titleIv); let on=false;
  titleIv=setInterval(()=>{ document.title=(on=!on)?text:baseTitle; },900);
}
document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&titleIv){ clearInterval(titleIv); titleIv=null; document.title=baseTitle; } });

/* ================= Rejoin banner ================= */
function lastRoom(){ const r=ls.get("arc-last-room",null); if(!r||typeof r!=="object"||!r.code) return null; if(Date.now()-r.at>12*3600e3) return null; return r; }
function rejoinHTML(){ const r=lastRoom(); if(!r) return ""; const here=S.code===r.code;
  return `<div class="rejoin" id="ol-rejoin"><span>${here?"You're still in room":"You were in room"}</span><b>${E(r.code)}</b><button class="btn" data-rejoin="${E(r.code)}">${here?"Back to room":"Rejoin"}</button><button class="btn ghost" data-rjx aria-label="Dismiss">✕</button></div>`; }
function bindRejoin(root){
  root.querySelectorAll("[data-rejoin]").forEach(b=>b.onclick=()=>{ location.hash="join-"+b.dataset.rejoin; });
  root.querySelectorAll("[data-rjx]").forEach(b=>b.onclick=()=>{ ls.set("arc-last-room",null); const el=b.closest(".rejoin"); if(el) el.remove(); const hub=q("rejoin"); if(hub) hub.hidden=true; });
}
function paintRejoin(){
  const el=q("rejoin"); if(!el) return; const html=rejoinHTML();
  if(!html||location.hash.length>1){ el.hidden=true; return; }
  el.outerHTML=html.replace('class="rejoin" id="ol-rejoin"','class="rejoin" id="rejoin"'); bindRejoin(document);
}

/* ================= Invite: share sheet + QR code ================= */
async function openInvite(){
  const link=location.origin+location.pathname+"#join-"+S.code;
  const canShare=!!navigator.share;
  const o=dialog("inv-dlg","Invite friends",`
    <div class="inv-code" aria-label="Room code">${E(S.code)}</div>
    <div class="inv-qr" id="inv-qr"><span class="note">Loading QR code…</span></div>
    <p class="note" style="margin:0;text-align:center">Friends next to you can scan it with their phone camera.</p>
    <div class="actions" style="justify-content:center">${canShare?`<button class="btn primary" id="inv-share">Share…</button>`:""}<button class="btn${canShare?"":" primary"}" id="inv-copy">Copy link</button></div>
    <input class="inv-link" id="inv-link" readonly value="${E(link)}" aria-label="Invite link">
    ${SO.on?`<div class="section-label"><span>Invite friends</span></div><div class="ol-board" id="inv-friends"></div>`:""}`);
  paintInviteFriends();
  const text=`Join my Matchday Arcade room ${S.code} ⚽`;
  if(q("inv-share")) q("inv-share").onclick=()=>navigator.share({title:"Matchday Arcade",text,url:link}).catch(()=>{});
  q("inv-copy").onclick=()=>{ const fb=()=>{ q("inv-link").select(); toast("Select the link and copy it"); };
    try{ navigator.clipboard.writeText(`${text}: ${link}`).then(()=>toast("Invite link copied"),fb); }catch(e){ fb(); } };
  try{
    if(!window.qrcode) await loadScript("https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js");
    const qr=qrcode(0,"M"); qr.addData(link); qr.make();
    if(q("inv-qr")) q("inv-qr").innerHTML=qr.createSvgTag({cellSize:5,margin:2,scalable:true});
  }catch(e){ if(q("inv-qr")) q("inv-qr").innerHTML=`<span class="note">The QR code needs an internet connection. Use the link instead.</span>`; }
}

/* ================= Live typing indicator ================= */
const TY={last:0,c:""};
function typing(c){ if(!S.code) return; const t=now(); if(t-TY.last<2000&&TY.c===c) return; TY.last=t; TY.c=c; S.net.set(R("typing/"+S.uid),{t,c}); }
function typingStop(){ if(!TY.last||!S.code) return; TY.last=0; S.net.remove(R("typing/"+S.uid)); }
document.addEventListener("input",e=>{ const id=e.target&&e.target.id; if(!S.code||S.view!=="room") return;
  if(id==="ol-chatin") typing("chat"); else if(["cc-in","ch-in","lu-in","tm-in","wa-in"].includes(id)) typing("game"); });
document.addEventListener("focusout",e=>{ const id=e.target&&e.target.id; if(["ol-chatin","cc-in","ch-in","lu-in","tm-in","wa-in"].includes(id)) typingStop(); });
function whoTyping(c){ const t=now(); return Object.entries(S.typing||{}).filter(([u,v])=>u!==S.uid&&v&&v.c===c&&t-v.t<5000&&S.players[u]).map(([u])=>u); }
function turnUid(){ const g=S.game; if(!g||g.phase!=="play") return null;
  if(g.kind==="chain"||(g.kind==="close"&&g.mode==="coop")) return arr(g.order)[g.turn];
  if(g.kind==="linkup") return g.seats[g.turn].id; return null; }
function paintTyping(){
  const el=q("ol-typing"); if(el){ const us=whoTyping("chat"); el.textContent=us.length?(us.length===1?`${pname(us[0])} is typing…`:`${us.length} people are typing…`):""; }
  const tu=turnUid(); const who=q("ch-who")||q("cq-who")||q("lu-who"); if(!who) return;
  let tag=q("ol-tt"); if(!tag||tag.previousElementSibling!==who){ if(tag) tag.remove(); tag=document.createElement("span"); tag.id="ol-tt"; tag.className="ol-tt"; who.after(tag); }
  const on=tu&&tu!==S.uid&&whoTyping("game").includes(tu); tag.textContent=on?"✍️ typing…":"";
}

/* ================= Spectator cheers ================= */
function participants(g){ if(!g) return []; if(g.seats) return g.seats.filter(s=>!s.cpu).map(s=>s.id); const o=arr(g.order); return o.length?o:arr(g.players); }
function paintCheer(st){
  const g=S.game; let bar=q("ol-cheer");
  const watching=g&&S.meta&&S.meta.status==="playing"&&g.phase!=="over"&&!participants(g).includes(S.uid);
  if(!watching){ if(bar) bar.remove(); return; }
  const ps=participants(g), key=ps.join(",");
  if(!bar||bar.parentNode!==st){ if(bar) bar.remove(); bar=document.createElement("div"); bar.id="ol-cheer"; bar.className="panel ol-cheer"; st.prepend(bar); bar.dataset.k=""; }
  if(bar.dataset.k===key) return; bar.dataset.k=key;
  bar.innerHTML=`<div class="section-label"><span>📣 You're watching · cheer someone on</span></div><div class="ol-cheerrow">${ps.map(u=>`<div class="ol-cheerp"><span class="nm">${E(pav(u))} ${E(pname(u))}</span><span>${["🔥","👏","⚽","😱"].map(e=>`<button type="button" data-u="${E(u)}" data-e="${e}" aria-label="Send ${e} to ${E(pname(u))}">${e}</button>`).join("")}</span></div>`).join("")}</div>`;
  bar.querySelectorAll("button").forEach(b=>b.onclick=()=>{ S.net.push(R("chat"),{u:S.uid,n:S.profile.name,a:S.profile.av,t:b.dataset.e,to:b.dataset.u,k:"c",ts:now()}); haptic("ok"); });
}

/* ================= Tournament ================= */
const TOUR_PTS=[5,3,2];
function ranking(g){
  const sc=o=>Object.keys(o||{}).filter(u=>o[u]>0).sort((a,b)=>o[b]-o[a]);
  switch(g.kind){
    case "thirty": case "letters": case "whoami": return sc(g.scores);
    case "chain": return [g.winner,...arr(g.outOrder).slice().reverse()].filter(Boolean).filter((u,i,a)=>a.indexOf(u)===i);
    case "linkup": { const c=g.counts||{}; return g.seats.filter(s=>!s.cpu).map(s=>s.id).sort((a,b)=>a===g.winner?-1:b===g.winner?1:(c[a]||0)-(c[b]||0)); }
    case "close": if(g.mode==="coop") return [g.winner,...arr(g.order).filter(u=>u!==g.winner)].filter(Boolean);
      return arr(g.players).filter(u=>S.progress[u]&&S.progress[u].g>0).sort((a,b)=>{ const A=S.progress[a]||{},B=S.progress[b]||{}; if(!!A.done!==!!B.done) return A.done?-1:1; if(A.done) return A.t-B.t; return (A.b||1e9)-(B.b||1e9); });
  }
  return [];
}
const tourOn=()=>S.meta&&S.meta.tour&&!S.meta.tour.done;
async function tourScore(){
  const g=S.game; if(!tourOn()||!g||g.phase!=="over"||g.tourDone) return;
  const order=ranking(g), all=participants(g), pts=Object.assign({},S.meta.tour.pts||{});
  all.forEach(u=>{ const i=order.indexOf(u); pts[u]=(pts[u]||0)+(i>=0&&i<3?TOUR_PTS[i]:1); });
  const g2=clone(g); g2.tourDone=true; await setGame(g2);
  await S.net.set(R("meta/tour/pts"),pts);
  if(order[0]) sys(`🏆 Tournament: ${pname(order[0])} takes ${TOUR_PTS[0]} points`);
}
function tourTable(){
  const t=S.meta.tour, pts=t.pts||{};
  return `<div class="ol-tourbox"><div class="section-label"><span>🏆 Tournament · game ${Math.min(t.idx+1,t.list.length)} of ${t.list.length}</span><span>${arr(t.list).map((k,i)=>`${i<t.idx?"✓":i===t.idx?"▶":"·"} ${GAMES[k].name}`).join("  ")}</span></div>
    <div class="standings">${Object.keys(pts).sort((a,b)=>pts[b]-pts[a]).map(u=>`<div><span>${E(pav(u))} ${E(pname(u))}</span><b>${pts[u]}</b></div>`).join("")||`<div><span>No points yet</span><b>0</b></div>`}</div></div>`;
}
async function tourStart(list,theme){
  if(!list.length) return;
  const settings=Object.assign({},GAMES[list[0]].def,GAMES[list[0]].set.theme?{theme}:{});
  await S.net.update(R("meta"),{tour:{id:pushKey(),list,idx:0,pts:{},theme,done:false},game:list[0],settings});
  S.meta=Object.assign({},S.meta,{game:list[0],settings}); await startGame();
  sys(`🏆 Tournament started: ${list.map(k=>GAMES[k].name).join(" → ")}`);
}
async function tourNext(){
  const t=S.meta.tour; const idx=t.idx+1;
  if(idx>=t.list.length){
    const pts=t.pts||{}, champ=Object.keys(pts).sort((a,b)=>pts[b]-pts[a])[0];
    await S.net.update(R("meta/tour"),{done:true,idx});
    if(champ){ await award([champ],5,true); sys(`👑 ${pname(champ)} is the tournament champion!`); }
    return toLobby();
  }
  const k=t.list[idx], settings=Object.assign({},GAMES[k].def,GAMES[k].set.theme?{theme:t.theme}:{});
  await S.net.update(R("meta"),{"tour/idx":idx,game:k,settings});
  S.meta=Object.assign({},S.meta,{game:k,settings}); await startGame();
}
let champShown=null;
function championHTML(){
  const t=S.meta.tour; if(!t||!t.done) return "";
  const pts=t.pts||{}, order=Object.keys(pts).sort((a,b)=>pts[b]-pts[a]);
  if(champShown!==t.id){ champShown=t.id; if(order[0]===S.uid){ SFX.play("win"); } confetti(); }
  const pod=[order[1],order[0],order[2]];
  return `<div class="panel ol-champ"><div class="section-label"><span>Tournament over</span></div>
    <h3 class="view-title" style="font-size:34px">👑 ${E(order[0]?pname(order[0]):"Nobody")} is the champion</h3>
    <div class="podium">${pod.map((u,i)=>u?`<div class="pod p${[2,1,3][i]}"><span class="ol-av big">${E(pav(u))}</span><b>${E(pname(u))}</b><span class="step">${[2,1,3][i]}</span><small>${pts[u]} pts</small></div>`:`<div class="pod empty"></div>`).join("")}</div>
    ${S.host?`<div class="actions"><button class="btn ghost" id="ol-tclear">Close tournament</button></div>`:""}</div>`;
}
function tourPanel(){
  if(!S.host) return S.meta.tour&&!S.meta.tour.done?tourTable():"";
  const sel=S.tourPick||(S.tourPick=["close","thirty","whoami","chain"]);
  return `<div class="panel ol-tourset"><div class="section-label"><span>🏆 Tournament mode</span><span>Several games in a row, one champion</span></div>
    <div class="seg" id="ol-tpick">${Object.entries(GAMES).map(([k,g])=>`<button type="button" data-t="${k}" aria-pressed="${sel.includes(k)}">${g.name}</button>`).join("")}</div>
    <div class="field"><span>Theme for every game</span><select id="ol-ttheme" aria-label="Tournament theme">${THEME_OPTS.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
    <div class="actions"><button class="btn" id="ol-tgo">Start tournament (${sel.length} games)</button><span class="note">Points per game: 1st ${TOUR_PTS[0]}, 2nd ${TOUR_PTS[1]}, 3rd ${TOUR_PTS[2]}, everyone else 1.</span></div></div>`;
}
function bindTourPanel(){
  const p=q("ol-tpick"); if(!p) return;
  p.querySelectorAll("button").forEach(b=>b.onclick=()=>{ const k=b.dataset.t, s=S.tourPick; const i=s.indexOf(k); if(i>=0) s.splice(i,1); else s.push(k); b.setAttribute("aria-pressed",String(i<0)); q("ol-tgo").textContent=`Start tournament (${s.length} games)`; q("ol-tgo").disabled=!s.length; });
  q("ol-tgo").onclick=()=>{ const order=Object.keys(GAMES).filter(k=>S.tourPick.includes(k)); if(order.includes("linkup")&&onlineUids().length<2){ toast("Link Up needs 2 people. Remove it or invite a friend."); return; } tourStart(order,q("ol-ttheme").value); };
}

/* ================= Leaderboards ================= */
function monthKey(){ const d=new Date(now()); return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0"); }
function trackSeason(){
  const mine=S.players[S.uid]; if(!mine||S.net.kind!=="firebase") return;
  const p=mine.pts||0, w=mine.wins||0;
  if(S.seen==null){ S.seen={p,w}; return; }
  const dp=p-S.seen.p, dw=w-S.seen.w; S.seen={p,w};
  if(dp>0||dw>0) S.net.tx(`seasons/${monthKey()}/${S.uid}`,c=>({n:S.profile.name,a:S.profile.av,pts:((c&&c.pts)||0)+Math.max(0,dp),wins:((c&&c.wins)||0)+Math.max(0,dw)})).catch(()=>{});
}
async function postDaily(d){
  if(!S.net||S.net.kind!=="firebase"||!S.net.auth.signedIn()||!S.profile.name){ ls.set("arc-daily-pending",d); return; }
  const path=`daily/${d.date}/${S.net.uid()}`;
  try{ if(await S.net.get(path)) return; await S.net.set(path,{n:S.profile.name,a:S.profile.av,g:d.won?d.guesses:999,h:d.hints,won:!!d.won,ts:now()}); ls.set("arc-daily-pending",null); toast("Your result is on today's leaderboard 🏆"); }catch(e){}
}
window.addEventListener("cc-daily-done",async e=>{ try{ if(!S.net) S.net=await getNet(); await postDaily(e.detail); }catch(err){} });
async function renderLeaders(){
  const main=q("ol-main"); S.view="leaders";
  main.innerHTML=`<h2 class="view-title">Leaderboards</h2>
    <div class="tabs" role="tablist"><button class="tab" role="tab" id="lb-m" aria-selected="true">This month</button><button class="tab" role="tab" id="lb-d" aria-selected="false">Today's Guess the Player</button></div>
    <div class="panel" id="lb-body"><p class="note">Loading…</p></div>
    <div class="actions"><button class="btn ghost" data-go="online">← Play online</button></div>`;
  const body=q("lb-body");
  const row=(i,r,me,val,sub)=>`<div class="ol-brow${me?" me":""}"><b class="pts" style="min-width:2.2ch;text-align:left">${i+1}</b><span class="ol-av">${E(r.a||"⚽")}</span><span class="nm">${E(r.n||"Player")}</span><span class="st">${sub}</span><b class="pts">${val}</b></div>`;
  const show=async which=>{
    q("lb-m").setAttribute("aria-selected",String(which==="m")); q("lb-d").setAttribute("aria-selected",String(which==="d"));
    if(S.net.kind!=="firebase"){ body.innerHTML=`<p class="note" style="margin:0">Leaderboards need online play, which isn't switched on in demo mode.</p>`; return; }
    body.innerHTML=`<p class="note">Loading…</p>`;
    try{
      if(which==="m"){
        const v=await S.net.top(`seasons/${monthKey()}`,"pts",100,false)||{};
        const rows=Object.entries(v).sort((a,b)=>(b[1].pts||0)-(a[1].pts||0)||(b[1].wins||0)-(a[1].wins||0));
        body.innerHTML=`<p class="note" style="margin:0">Win online games in any room to earn points. A new season starts every month.</p>`+(rows.map(([u,r],i)=>row(i,r,u===S.uid,r.pts||0,`${r.wins||0} win${r.wins===1?"":"s"}`)).join("")||`<p class="note">No points yet this month. Be the first!</p>`);
      } else {
        const d=new Date(), ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
        const v=await S.net.top(`daily/${ds}`,"g",100,true)||{};
        const rows=Object.entries(v).sort((a,b)=>(b[1].won-a[1].won)||(a[1].g-b[1].g)||(a[1].h-b[1].h)||(a[1].ts-b[1].ts));
        body.innerHTML=`<p class="note" style="margin:0">Play today's <b>Daily match</b> in Guess the Player while signed in, and your result appears here. Fewest guesses wins.</p>`+(rows.map(([u,r],i)=>row(i,r,u===S.uid,r.won?r.g:"–",r.won?`${r.h} hint${r.h===1?"":"s"}`:"gave up")).join("")||`<p class="note">Nobody has posted today yet.</p>`)+`<div class="actions"><a class="btn primary" href="#close" style="text-decoration:none">Play today's match</a></div>`;
      }
    }catch(e){ body.innerHTML=`<p class="note" style="margin:0">Couldn't load the leaderboard. If you run this site, publish the latest database.rules.json in Firebase.</p>`; }
  };
  q("lb-m").onclick=()=>show("m"); q("lb-d").onclick=()=>show("d"); show("m");
}

/* ================= Who Am I? ================= */
const REGION_NAMES={UEFA:"Europe",CONMEBOL:"South America",CAF:"Africa",AFC:"Asia",CONCACAF:"North or Central America",OFC:"Oceania"};
const POSN={GK:"goalkeeper",CB:"centre-back",FB:"full-back",DM:"defensive midfielder",CM:"central midfielder",AM:"attacking midfielder",W:"winger",ST:"striker"};
const WHO_N=10;
function whoClues(id){
  const p=PLAYERS[id], cp=CC.PLAYERS[id], K=COUNTRIES[p.k];
  const timeline=[...cp.stints].filter(s=>s.a).sort((a,b)=>a.a-b.a).map(s=>CC.CLUBS[s.c].name);
  const names=[...new Set(timeline.length?timeline:[...cp.clubs.keys()].map(c=>CC.CLUBS[c].name))];
  const famous=[...p.clubs].sort((a,b)=>clubFame[b]-clubFame[a])[0];
  const famousName=CLUBS[famous].name;
  const other=names.filter(n=>n!==famousName);
  const abroad=[...p.leagues].filter(l=>l!==p.k);
  const playedIn=k=>{ const n=leagueName(k); return n.startsWith("football in")?`Has played ${n}`:`Has played in the ${n}`; };
  const ini=p.base.split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()+".").join(" ");
  return [
    `Represents a country in ${REGION_NAMES[K.conf]||"world football"}`,
    (n=>`Plays as ${/^[aeiou]/.test(n)?"an":"a"} ${n}`)(POSN[p.pos]||"footballer"),
    `Born in the ${Math.floor(p.born/10)*10}s`,
    p.clubs.size>1?`Has played for ${p.clubs.size} different clubs`:"Has spent the whole career at one club",
    abroad.length?playedIn(pickOne(abroad)):`Has only played club football in ${K.name}`,
    `Born in ${p.born}`,
    `Nationality: ${K.flag} ${K.name}`,
    other.length?`Has played for ${pickOne(other)}`:`Never left ${famousName}`,
    `Has played for ${famousName}`,
    `Initials: ${ini}`
  ];
}
function whoPool(lv,theme){
  const th=THEMES[theme]||THEMES.all;
  const pool=PLAYERS.filter(p=>p.tier<=lv&&p.clubs.size>=2&&(!th.t||th.t(p)));
  return pool.length>=10?pool:PLAYERS.filter(p=>p.tier===0&&p.clubs.size>=2);
}
const clueList=(cl,n)=>`<ol class="clues">${cl.slice(0,n).map(c=>`<li class="on">${E(c)}</li>`).join("")}${n<cl.length?`<li class="next">Clue ${n+1} of ${cl.length} on its way…</li>`:""}</ol>`;

const WA={key:null,lockUntil:0,wrong:0,pending:false};
ENG.whoami={
  async start(set){
    const pool=whoPool(+set.level,set.theme), total=+set.rounds, used=new Set(), rounds=[];
    while(rounds.length<total){ const p=pickOne(pool); if(used.has(p.id)&&used.size<pool.length) continue; used.add(p.id); rounds.push({sx:enc(p.id),cl:whoClues(p.id)}); }
    const t=now()+3500;
    return {kind:"whoami",at:now(),round:0,total,rounds,clueMs:(+set.secs||7)*1000,startsAt:t,phase:"play",scores:{},res:{},players:onlineUids(),theme:set.theme||"all"};
  },
  clueIdx(g){ return Math.max(-1,Math.min(WHO_N-1,Math.floor((now()-g.startsAt)/g.clueMs))); },
  endAt(g){ return g.startsAt+WHO_N*g.clueMs+6000; },
  secret(g){ return CC.PLAYERS[dec(arr(g.rounds)[g.round].sx)]; },
  async hostTick(){
    const g=S.game;
    if(g.phase==="play"){
      const ans=S.answers[g.round]||{}, act=g.players.filter(u=>S.players[u]&&S.players[u].online);
      if((act.length&&act.every(u=>ans[u]))||now()>this.endAt(g)) await this.score();
    } else if(g.phase==="results"&&now()>g.nextAt) await this.next();
  },
  async score(){
    const g=clone(S.game); if(g.phase!=="play") return;
    const ans=S.answers[g.round]||{}; const solv=Object.keys(ans).sort((a,b)=>ans[a].t-ans[b].t);
    const res={}; g.scores=g.scores||{};
    solv.forEach((u,i)=>{ const p=Math.max(1,WHO_N-ans[u].c)+(i===0?2:0); res[u]={p,c:ans[u].c}; g.scores[u]=(g.scores[u]||0)+p; });
    g.res=g.res||{}; g.res["r"+g.round]=res; g.phase="results"; g.nextAt=now()+15000;
    await setGame(g);
    sys(`❓ It was ${this.secret(g).name}${solv.length?` · ${pname(solv[0])} got it first (clue ${ans[solv[0]].c+1})`:" · nobody got it"}`);
  },
  async next(){
    const g=clone(S.game); if(g.phase!=="results") return;
    if(g.round+1>=g.total){
      g.phase="over"; await setGame(g);
      const sc=g.scores||{}, best=Math.max(0,...Object.values(sc)), win=Object.keys(sc).filter(u=>sc[u]===best&&best>0);
      if(win.length){ await award(win,2,true); sys(`🏆 ${win.map(pname).join(" & ")} won Who Am I? with ${best} points`); }
      return;
    }
    g.round++; g.phase="play"; g.startsAt=now()+3500; delete g.nextAt; await setGame(g);
  },
  guess(p){
    const g=S.game; if(g.phase!=="play") return; const fb=q("wa-fb");
    const ans=(S.answers[g.round]||{})[S.uid]; if(ans) return;
    if(now()<WA.lockUntil){ return; }
    const c=this.clueIdx(g); if(c<0) return;
    if(p.id===this.secret(g).id){
      S.net.set(R(`answers/${g.round}/${S.uid}`),{t:now()-g.startsAt,c});
      fb.className="feedback ok"; fb.textContent=`✓ Correct! ${p.name} on clue ${c+1}.`; SFX.play("win");
    } else {
      WA.wrong++; WA.lockUntil=now()+2500; fb.className="feedback err"; fb.textContent=`✗ Not ${p.name}. Wait 2 seconds…`; SFX.play("bad");
    }
    refresh();
  },
  render(st){
    const g=S.game, gm=GAMES.whoami;
    if(g.phase==="over"){
      if(skel(st,`wa-over-${g.at}`,`<h3 class="view-title" style="font-size:34px">Full time</h3><div id="wa-stand"></div><div id="wa-end"></div>`)){
        const sc=g.scores||{}; q("wa-stand").innerHTML=`<div class="standings">${Object.keys(sc).sort((a,b)=>sc[b]-sc[a]).map(u=>`<div><span>${E(pav(u))} ${E(pname(u))}</span><b>${sc[u]}</b></div>`).join("")||"<div><span>Nobody scored</span><b>0</b></div>"}</div>`;
        q("wa-end").innerHTML=endButtons(); bindEnd(st);
        const best=Math.max(0,...Object.values(sc)); if(sc[S.uid]===best&&best>0){ SFX.play("win"); confetti(); }
      }
      return;
    }
    const rd=arr(g.rounds)[g.round], secret=this.secret(g);
    if(g.phase==="results"){
      if(skel(st,`wa-res-${g.startsAt}`,`<div class="prompt"><span class="who">${gm.name} · round ${g.round+1} of ${g.total} · results${themeTag(g)}</span><span class="cat">It was ${E(secret.name)}</span></div>
          <div id="wa-reveal"></div>${clueList(arr(rd.cl),WHO_N)}
          <div id="wa-res"></div><div class="section-label"><span>Total</span></div><div id="wa-tot"></div>
          <div class="actions">${S.host?`<button class="btn primary" id="wa-next">${g.round+1>=g.total?"Final results":"Next player"}</button>`:""}<span class="note" id="wa-auto"></span></div>`)){
        q("wa-reveal").innerHTML=revealCard(secret);
        const res=(g.res||{})["r"+g.round]||{};
        q("wa-res").innerHTML=Object.keys(res).sort((a,b)=>res[b].p-res[a].p).map(u=>`<div class="ol-brow${u===S.uid?" me":""}"><span class="ol-av">${E(pav(u))}</span><span class="nm">${E(pname(u))}</span><span class="st">clue ${res[u].c+1}</span><b class="pts">+${res[u].p}</b></div>`).join("")||`<p class="note">Nobody named the player this round.</p>`;
        const sc=g.scores||{}; q("wa-tot").innerHTML=`<div class="standings">${Object.keys(sc).sort((a,b)=>sc[b]-sc[a]).map(u=>`<div><span>${E(pav(u))} ${E(pname(u))}</span><b>${sc[u]}</b></div>`).join("")||"<div><span>No points yet</span><b>0</b></div>"}</div>`;
        if(q("wa-next")) q("wa-next").onclick=()=>Host.run(()=>this.next());
      }
      return;
    }
    const inGame=g.players.includes(S.uid);
    if(skel(st,`wa-play-${g.startsAt}`,`<div class="prompt"><span class="who">${gm.name} · round ${g.round+1} of ${g.total}${themeTag(g)}</span><span class="cat">Name the mystery footballer</span></div>
        <div class="ol-count" id="wa-count"></div>
        <div class="clock" id="wa-clock"><b id="wa-pts">10</b><span class="bar"><i id="wa-bar"></i></span><span class="note" id="wa-next-in"></span></div>
        ${inGame?`<div class="search"><input id="wa-in" type="text" autocomplete="off" spellcheck="false" placeholder="Who is it?" aria-label="Guess the mystery player"><div class="suggest" id="wa-sug" role="listbox" hidden></div></div>`:`<div class="ol-note">You joined mid-game. You'll play from the next game.</div>`}
        <div class="feedback" id="wa-fb" aria-live="polite"></div>
        <div id="wa-clues"></div>
        <div class="section-label"><span>Live</span><span>Earlier clue = more points · first correct +2</span></div><div class="ol-board" id="wa-live"></div>`)){
      WA.lockUntil=0; WA.wrong=0;
      if(inGame) ccSearch(q("wa-in"),q("wa-sug"),p=>this.guess(p),()=>false);
      this.clientTick();
    }
    const ans=S.answers[g.round]||{};
    q("wa-live").innerHTML=g.players.map(u=>`<div class="ol-brow${u===S.uid?" me":""}"><span class="ol-av">${E(pav(u))}</span><span class="nm">${E(pname(u))}</span><span class="st">${ans[u]?`✓ got it on clue ${ans[u].c+1}`:"thinking…"}</span><b class="pts">${(g.scores||{})[u]||0}</b></div>`).join("");
  },
  clientTick(){
    const g=S.game; if(!g||g.kind!=="whoami"||g.phase!=="play") { if(g&&g.phase==="results"){ const a=q("wa-auto"); if(a) a.textContent=`Next player in ${Math.max(0,Math.ceil((g.nextAt-now())/1000))}s`; } return; }
    const cnt=q("wa-count"); if(!cnt) return;
    const t=now(), c=this.clueIdx(g), rd=arr(g.rounds)[g.round];
    if(t<g.startsAt){ const s=Math.ceil((g.startsAt-t)/1000); if(cnt.textContent!==String(s)){ cnt.textContent=String(s); SFX.play("tick"); } }
    else if(cnt.textContent){ cnt.textContent=""; SFX.play("go"); }
    const shown=c+1, box=q("wa-clues");
    if(box.dataset.n!==String(shown)){ box.dataset.n=String(shown); box.innerHTML=clueList(arr(rd.cl),shown); if(shown>1) SFX.play("draw"); }
    const mine=(S.answers[g.round]||{})[S.uid];
    const ptsNow=Math.max(1,WHO_N-Math.max(0,c));
    q("wa-pts").textContent=mine?"✓":ptsNow;
    const nextAt=g.startsAt+(c+1)*g.clueMs, frac=c>=WHO_N-1?0:Math.max(0,(nextAt-t)/g.clueMs);
    q("wa-bar").style.width=(t<g.startsAt?100:frac*100)+"%";
    q("wa-next-in").textContent=mine?"You got it! Waiting for the others…":c>=WHO_N-1?"Last clue":`points now · next clue in ${Math.ceil(Math.max(0,nextAt-t)/1000)}s`;
    const inp=q("wa-in"); if(inp){ const dis=!!mine||t<g.startsAt||t<WA.lockUntil; if(inp.disabled!==dis){ inp.disabled=dis; if(!dis) inp.focus(); } }
  }
};

/* Who Am I? on your own (no account needed) */
const WhoSolo={
  open(){
    const main=q("ol-main"); S.view="whoami";
    const cfg=ls.get("arc-who",{level:"0",theme:"all"});
    main.innerHTML=`<h2 class="view-title">Who Am I?</h2>
      <p class="lede">Clues appear one at a time. Name the mystery footballer as early as you can: the first clue is worth 10 points, each extra clue costs 1, and a wrong guess costs 1. Five players per game.</p>
      <div class="panel" id="ws-setup"></div>
      <p class="note">Want to play with friends? Choose <b>Who Am I?</b> in an online room.</p>`;
    const s=q("ws-setup");
    s.appendChild(field("Mystery player from",seg("ws-l",[["0","Stars"],["1","Well known"]],cfg.level,v=>cfg.level=v)));
    const sel=document.createElement("select"); sel.id="ws-theme"; sel.setAttribute("aria-label","Theme"); sel.innerHTML=THEME_OPTS.map(([k,l])=>`<option value="${k}">${l}</option>`).join(""); sel.value=cfg.theme;
    sel.onchange=()=>cfg.theme=sel.value; s.appendChild(field("Theme",sel));
    const best=ls.get("arc-who-best",0);
    const go=document.createElement("button"); go.className="btn primary go"; go.textContent="Start"+(best?` · best ${best}`:"");
    go.onclick=()=>{ ls.set("arc-who",cfg); this.start(+cfg.level,cfg.theme); }; s.appendChild(go);
  },
  start(lv,theme){
    const pool=whoPool(lv,theme), ids=[]; while(ids.length<5){ const p=pickOne(pool); if(!ids.includes(p.id)||ids.length>=pool.length) ids.push(p.id); }
    this.st={lv,theme,ids,round:0,score:0,shown:1,pts:WHO_N,clues:whoClues(ids[0]),done:false,log:[]};
    this.paint();
  },
  paint(){
    const st=this.st, main=q("ol-main"), secret=CC.PLAYERS[st.ids[st.round]];
    main.innerHTML=`<h2 class="view-title">Who Am I?</h2>
      <div class="prompt"><span class="who">Player ${st.round+1} of 5 · score ${st.score}${THEMES[st.theme]&&THEMES[st.theme].t?" · "+THEMES[st.theme].l:""}</span><span class="cat">${st.done?E(secret.name):"Worth "+st.pts+" points"}</span></div>
      ${st.done?revealCard(secret):""}
      ${st.done?"":`<div class="search"><input id="ws-in" type="text" autocomplete="off" spellcheck="false" placeholder="Who is it?" aria-label="Guess the mystery player"><div class="suggest" id="ws-sug" hidden></div></div>`}
      <div class="feedback" id="ws-fb" aria-live="polite">${st.msg||""}</div>
      <div class="actions">${st.done?`<button class="btn primary" id="ws-next">${st.round<4?"Next player":"See your score"}</button>`:`<button class="btn" id="ws-clue" ${st.shown>=WHO_N?"disabled":""}>Next clue (−1)</button><button class="btn ghost" id="ws-give">Give up</button>`}</div>
      ${clueList(st.clues,st.done?WHO_N:st.shown)}`;
    if(!st.done){
      ccSearch(q("ws-in"),q("ws-sug"),p=>this.guess(p),()=>false); q("ws-in").focus();
      q("ws-clue").onclick=()=>{ st.shown++; st.pts=Math.max(1,st.pts-1); st.msg=""; SFX.play("draw"); this.paint(); };
      q("ws-give").onclick=()=>{ st.done=true; st.msg="No points for this one."; SFX.play("bad"); this.paint(); };
    } else q("ws-next").onclick=()=>this.next();
  },
  guess(p){
    const st=this.st, secret=CC.PLAYERS[st.ids[st.round]];
    if(p.id===secret.id){ st.score+=st.pts; st.done=true; st.msg=`✓ Correct! +${st.pts} points`; SFX.play("win"); }
    else { st.pts=Math.max(1,st.pts-1); st.msg=`✗ Not ${p.name}. −1 point`; SFX.play("bad"); }
    this.paint();
  },
  next(){
    const st=this.st;
    if(st.round>=4){
      const best=Math.max(ls.get("arc-who-best",0),st.score); ls.set("arc-who-best",best); if(st.score>=best&&st.score>0) confetti();
      q("ol-main").innerHTML=`<h2 class="view-title">Who Am I?</h2><div class="panel"><div style="display:flex;align-items:flex-end;gap:12px"><span class="score-big">${st.score}</span><span class="note">points out of 50 · best ${best}</span></div>
        <div class="actions"><button class="btn primary" id="ws-again">Play again</button><button class="btn ghost" id="ws-set">Change settings</button></div></div>`;
      q("ws-again").onclick=()=>this.start(st.lv,st.theme); q("ws-set").onclick=()=>this.open(); return;
    }
    st.round++; st.shown=1; st.pts=WHO_N; st.done=false; st.msg=""; st.clues=whoClues(st.ids[st.round]); this.paint();
  }
};

/* ================= Time helpers ================= */
function ago(ts){
  if(!ts) return "a while ago";
  const s=Math.max(0,(now()-ts)/1000); if(s<60) return "just now";
  const m=s/60; if(m<60) return `${Math.floor(m)} min ago`;
  const h=m/60; if(h<24) return `${Math.floor(h)} h ago`;
  const d=h/24; if(d<2) return "yesterday"; if(d<30) return `${Math.floor(d)} days ago`;
  return new Date(ts).toLocaleDateString();
}

/* ================= Public / private rooms ================= */
const MAX_OPTS=[2,4,6,8,10,12,16,20];
const LINKUP_MAX=8;
let lobbyT=0, lobbyTm=null;
function syncLobby(force){
  if(!S.host||!S.meta||!S.code) return;
  const t=Date.now();
  if(!force&&t-lobbyT<2500){ clearTimeout(lobbyTm); lobbyTm=setTimeout(()=>syncLobby(true),2600); return; }
  lobbyT=t; const m=S.meta;
  if(m.vis!=="public"){ S.net.remove(`lobby/${S.code}`).catch(()=>{}); return; }
  S.net.set(`lobby/${S.code}`,{t:m.title||`${pname(m.host)}'s room`,g:m.game,h:pname(m.host),a:pav(m.host),n:onlineUids().length,m:m.max||8,st:m.status||"lobby",ts:now()}).catch(()=>{});
}
function visTag(){
  const m=S.meta; if(!m) return "";
  const n=onlineUids().length, mx=m.max||8;
  return `${m.vis==="public"?"🌍 Public":"🔒 Private"} · ${n}/${mx} players`;
}
function roomSettingsHTML(){
  const m=S.meta, mx=m.max||8;
  if(!S.host) return `<div class="ol-note">${E(visTag())}${m.vis==="public"?` · listed as “${E(m.title||pname(m.host)+"'s room")}”`:" · join with the code only"}</div>`;
  return `<div class="panel"><div class="section-label"><span>Room settings</span><span>${E(visTag())}</span></div>
    <div class="field"><span>Who can join</span><div class="seg" id="rs-vis"><button type="button" data-v="private" aria-pressed="${m.vis!=="public"}">🔒 Private · code only</button><button type="button" data-v="public" aria-pressed="${m.vis==="public"}">🌍 Public · anyone can find it</button></div></div>
    <div class="field"><span>Max players</span><div class="seg" id="rs-max">${MAX_OPTS.map(v=>`<button type="button" data-v="${v}" aria-pressed="${v===mx}">${v}</button>`).join("")}</div></div>
    ${m.vis==="public"?`<div class="field"><span>Room name in the public list</span><input id="rs-title" maxlength="28" value="${E(m.title||"")}" placeholder="${E(pname(m.host))}'s room" class="ol-text"></div>`:""}</div>`;
}
function bindRoomSettings(){
  const v=q("rs-vis"); if(!v) return;
  v.querySelectorAll("button").forEach(b=>b.onclick=()=>S.net.set(R("meta/vis"),b.dataset.v));
  q("rs-max").querySelectorAll("button").forEach(b=>b.onclick=()=>{ const n=+b.dataset.v, cur=onlineUids().length; if(n<cur){ toast(`There are already ${cur} players here.`); return; } S.net.set(R("meta/max"),n); });
  const t=q("rs-title"); if(t) t.onchange=()=>S.net.set(R("meta/title"),t.value.trim().slice(0,28)||null);
}
let pubSub=null, PUB={};
function stopPub(){ if(pubSub){ pubSub(); pubSub=null; } }
function pubRows(){ const t=now(); return Object.entries(PUB||{}).filter(([c,r])=>r&&r.n>0&&t-(r.ts||0)<3*60e3).sort((a,b)=>(a[1].st==="lobby"?-1:0)-(b[1].st==="lobby"?-1:0)||(b[1].n-a[1].n)); }
function paintPub(){
  const el=q("ol-pub"); if(!el) return;
  const rows=pubRows();
  el.innerHTML=rows.map(([c,r])=>{ const full=r.n>=r.m; return `<div class="ol-brow pub-row"><span class="ol-av">${E(r.a||"⚽")}</span><span class="nm">${E(r.t)}<small class="fr-st">${E((GAMES[r.g]||{}).name||"")} · host ${E(r.h)} · ${r.st==="playing"?"playing now":"in the lobby"}</small></span><span class="st">${r.n}/${r.m}</span><button class="btn${full?"":" primary"}" data-pj="${E(c)}" ${full?"disabled":""}>${full?"Full":"Join"}</button></div>`; }).join("")||`<p class="note" style="margin:0">No public rooms right now. Create one and it will show up here for everyone.</p>`;
  el.querySelectorAll("[data-pj]").forEach(b=>b.onclick=()=>enterRoom(b.dataset.pj));
  const qj=q("ol-quick"); if(qj) qj.disabled=!rows.some(([c,r])=>r.n<r.m);
}
function startPub(){ stopPub(); pubSub=S.net.on("lobby",v=>{ PUB=v||{}; paintPub(); }); }
function quickJoin(){ const r=pubRows().find(([c,x])=>x.n<x.m); if(r) enterRoom(r[0]); else toast("No public room has space right now. Create one!"); }

/* ================= Friends, invites, presence ================= */
const SO={on:false,subs:[],code:null,friends:{},fusers:{},fsubs:{},reqIn:{},invites:{},seenInv:new Set(),dismissed:new Set(),ready:false};
const FC_ABC="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function socialStart(){
  if(SO.on||!S.net||!S.net.auth.signedIn()||!S.profile.name) return;
  SO.on=true; const uid=S.uid=S.net.uid(); ls.set("arc-online",true);
  try{
    const me=await S.net.get(`users/${uid}`)||{};
    if(!me.code){ for(let i=0;i<12&&!me.code;i++){ const c=Array.from({length:6},()=>FC_ABC[Math.floor(Math.random()*FC_ABC.length)]).join(""); const r=await S.net.tx(`fcodes/${c}`,cur=>cur?undefined:uid); if(r.committed) me.code=c; } }
    SO.code=me.code||"";
    await S.net.update(`users/${uid}`,{n:S.profile.name,a:S.profile.av,code:SO.code,room:S.code||null});
  }catch(e){ console.warn("social",e); }
  SO.subs.push(S.net.presenceAt(`users/${uid}`,{on:true,last:"__TS__"},{on:false,last:"__TS__"}));
  SO.subs.push(S.net.on(`friends/${uid}`,v=>{ SO.friends=v||{}; syncFriendSubs(); paintSocial(); }));
  SO.subs.push(S.net.on(`freq/${uid}`,v=>{ const old=SO.reqIn; SO.reqIn=v||{};
    Object.keys(SO.reqIn).forEach(f=>{ if(!old[f]&&SO.ready){ toast(`👥 ${SO.reqIn[f].n} sent you a friend request`); SFX.play("msg"); } }); paintSocial(); }));
  SO.subs.push(S.net.on(`invites/${uid}`,v=>{ SO.invites=v||{}; paintInvites(); paintSocial(); }));
  setTimeout(()=>{ SO.ready=true; },2000);
  paintSocial();
}
function socialStop(){
  SO.subs.forEach(f=>{ try{f();}catch(e){} }); SO.subs=[];
  Object.values(SO.fsubs).forEach(f=>{ try{f();}catch(e){} }); SO.fsubs={};
  if(S.uid) S.net.update(`users/${S.uid}`,{on:false,last:now()}).catch(()=>{});
  Object.assign(SO,{on:false,friends:{},fusers:{},reqIn:{},invites:{},ready:false});
  paintSocial(); paintInvites();
}
function setMyRoom(code){ if(SO.on) S.net.update(`users/${S.uid}`,{room:code||null}).catch(()=>{}); }
function syncFriendSubs(){
  Object.keys(SO.fsubs).forEach(f=>{ if(!SO.friends[f]){ SO.fsubs[f](); delete SO.fsubs[f]; delete SO.fusers[f]; } });
  Object.keys(SO.friends).forEach(f=>{ if(!SO.fsubs[f]) SO.fsubs[f]=S.net.on(`users/${f}`,v=>{ const was=SO.fusers[f]&&SO.fusers[f].on; SO.fusers[f]=v||{}; if(SO.ready&&v&&v.on&&!was) toast(`🟢 ${v.n} is online`); paintSocial(); }); });
}
function statusOf(u){
  if(!u||!u.n) return {on:false,txt:"Offline"};
  if(u.on) return {on:true,txt:u.room?`Online · in room ${u.room}`:"Online now"};
  return {on:false,txt:`Last seen ${ago(u.last)}`};
}
function freshInvites(){ const t=now(); return Object.entries(SO.invites||{}).filter(([f,i])=>i&&t-(i.ts||0)<15*60e3&&i.code!==S.code&&!SO.dismissed.has(f+i.ts)); }
function paintInvites(){
  let bar=q("ol-invbar"); const list=freshInvites();
  if(!list.length){ if(bar) bar.remove(); return; }
  const [f,i]=list.sort((a,b)=>b[1].ts-a[1].ts)[0];
  if(!SO.seenInv.has(f+i.ts)){ SO.seenInv.add(f+i.ts); SFX.play("turn"); flashTitle(`🎮 ${i.n} invited you`); }
  if(!bar){ bar=document.createElement("div"); bar.id="ol-invbar"; bar.className="ol-invbar"; bar.setAttribute("role","alert"); document.body.appendChild(bar); }
  bar.innerHTML=`<span class="ol-av">${E(i.a)}</span><span class="t"><b>${E(i.n)}</b> invites you to play ${E(i.g||"")}<small>Room ${E(i.code)} · ${ago(i.ts)}</small></span><button class="btn" id="ib-join">Join</button><button class="btn ghost" id="ib-x" aria-label="Dismiss">✕</button>`;
  q("ib-join").onclick=()=>{ S.net.remove(`invites/${S.uid}/${f}`); bar.remove(); location.hash="join-"+i.code; };
  q("ib-x").onclick=()=>{ SO.dismissed.add(f+i.ts); S.net.remove(`invites/${S.uid}/${f}`); bar.remove(); };
}
async function addFriendByCode(raw){
  const code=String(raw||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(code.length!==6) return toast("Friend codes have 6 characters.");
  if(code===SO.code) return toast("That's your own code 😄");
  const uid=await S.net.get(`fcodes/${code}`); if(!uid) return toast("No player has that friend code.");
  return sendRequest(uid);
}
async function sendRequest(uid){
  if(!SO.on) return toast("Sign in to add friends.");
  if(uid===S.uid) return;
  if(SO.friends[uid]) return toast("You're already friends.");
  if(SO.reqIn[uid]) return acceptReq(uid);
  await S.net.set(`freq/${uid}/${S.uid}`,{n:S.profile.name,a:S.profile.av,ts:now()});
  const sent=ls.get("arc-sent",{}); sent[uid]=Date.now(); ls.set("arc-sent",sent);
  toast("Friend request sent ✓"); paintSocial();
}
async function acceptReq(uid){
  await S.net.set(`friends/${S.uid}/${uid}`,{since:now()});
  await S.net.set(`friends/${uid}/${S.uid}`,{since:now()});
  await S.net.remove(`freq/${S.uid}/${uid}`);
  toast("You're now friends 🤝"); haptic("win");
}
const declineReq=uid=>S.net.remove(`freq/${S.uid}/${uid}`);
async function removeFriend(uid){ await S.net.remove(`friends/${S.uid}/${uid}`); await S.net.remove(`friends/${uid}/${S.uid}`); toast("Friend removed"); }
async function inviteFriend(uid){
  if(!S.code) return toast("Create or join a room first, then invite friends.");
  await S.net.set(`invites/${uid}/${S.uid}`,{code:S.code,n:S.profile.name,a:S.profile.av,g:(GAMES[S.meta.game]||{}).name||"",ts:now()});
  toast(`Invite sent to ${(SO.fusers[uid]||{}).n||"your friend"} ✓`); haptic("ok");
}
function relation(uid){ if(SO.friends[uid]) return "friend"; if(SO.reqIn[uid]) return "incoming"; const s=ls.get("arc-sent",{}); if(s[uid]&&Date.now()-s[uid]<7*864e5) return "sent"; return "none"; }
function friendsSorted(){ return Object.keys(SO.friends).map(u=>({u,d:SO.fusers[u]||{}})).sort((a,b)=>((b.d.on?1:0)-(a.d.on?1:0))||((b.d.last||0)-(a.d.last||0))); }
function badgeCount(){ return Object.keys(SO.reqIn||{}).length+freshInvites().length; }
function paintSocial(){
  const n=badgeCount();
  document.querySelectorAll(".fr-badge").forEach(b=>{ b.textContent=n||""; b.hidden=!n; });
  const body=q("fr-body");
  if(body&&S.view==="friends"){
    const reqs=Object.entries(SO.reqIn||{}), fr=friendsSorted();
    body.innerHTML=`${reqs.length?`<div class="panel"><h3 class="ol-h">Friend requests</h3>${reqs.map(([u,r])=>`<div class="ol-brow"><span class="ol-av">${E(r.a)}</span><span class="nm">${E(r.n)}<small class="fr-st">${ago(r.ts)}</small></span><button class="btn primary" data-acc="${E(u)}">Accept</button><button class="btn ghost" data-dec="${E(u)}">Decline</button></div>`).join("")}</div>`:""}
      <div class="panel"><h3 class="ol-h">Your friends · ${fr.length}</h3>${fr.map(({u,d})=>{ const st=statusOf(d);
        return `<div class="ol-brow fr-row"><span class="ol-av">${E(d.a||"⚽")}<i class="dot${st.on?" on":""}"></i></span><span class="nm">${E(d.n||"Player")}<small class="fr-st${st.on?" on":""}">${E(st.txt)}</small></span>
          ${S.code&&d.room!==S.code?`<button class="btn" data-inv="${E(u)}">Invite</button>`:""}${d.on&&d.room&&d.room!==S.code?`<button class="btn primary" data-join="${E(d.room)}">Join</button>`:""}<button class="btn ghost" data-rm="${E(u)}" aria-label="Remove ${E(d.n||"friend")}">✕</button></div>`; }).join("")||`<p class="note" style="margin:0">No friends yet. Share your code, add someone's code above, or tap a player's name in any room.</p>`}</div>`;
    body.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>acceptReq(b.dataset.acc));
    body.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>declineReq(b.dataset.dec));
    body.querySelectorAll("[data-inv]").forEach(b=>b.onclick=()=>inviteFriend(b.dataset.inv));
    body.querySelectorAll("[data-join]").forEach(b=>b.onclick=()=>{ location.hash="join-"+b.dataset.join; });
    body.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ if(b.dataset.sure){ removeFriend(b.dataset.rm); } else { b.dataset.sure="1"; b.textContent="Remove?"; b.classList.remove("ghost"); setTimeout(()=>{ if(b.isConnected){ delete b.dataset.sure; b.textContent="✕"; b.classList.add("ghost"); } },3000); } });
  }
  const inv=q("inv-friends"); if(inv) paintInviteFriends();
}
setInterval(()=>{ if(S.view==="friends") paintSocial(); if(S.view==="room") paintRoster(); },30000);
function renderFriends(){
  S.view="friends"; stopPub();
  const main=q("ol-main");
  main.innerHTML=`<h2 class="view-title">Friends</h2>
    <div class="ol-two">
      <div class="panel"><h3 class="ol-h">Your friend code</h3><div class="inv-code" style="text-align:left;font-size:40px">${E(SO.code||"……")}</div>
        <p class="note" style="margin:0">Send it to friends so they can add you. ${S.net.auth.user()&&!S.net.auth.user().isAnonymous?"":"As a guest your friends are saved on this device; sign in with Google to keep them on every device."}</p>
        <div class="actions"><button class="btn" id="fr-copy">Copy code</button>${navigator.share?`<button class="btn" id="fr-share">Share…</button>`:""}</div></div>
      <div class="panel"><h3 class="ol-h">Add a friend</h3>
        <form class="answer" id="fr-add"><input id="fr-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="Friend code" aria-label="Friend code" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700"><button class="btn primary">Add</button></form>
        <p class="note" style="margin:0">You can also tap a player's name in any room to add them.</p></div>
    </div>
    <div id="fr-body"></div>
    <div class="actions"><a class="btn ghost" href="#online" style="text-decoration:none">← Play online</a></div>`;
  const msg=`Add me on Matchday Arcade ⚽ My friend code: ${SO.code}`;
  q("fr-copy").onclick=()=>{ try{ navigator.clipboard.writeText(SO.code).then(()=>toast("Friend code copied"),()=>toast(SO.code)); }catch(e){ toast(SO.code); } };
  if(q("fr-share")) q("fr-share").onclick=()=>navigator.share({title:"Matchday Arcade",text:msg,url:location.origin+location.pathname+"#friends"}).catch(()=>{});
  q("fr-add").onsubmit=e=>{ e.preventDefault(); addFriendByCode(q("fr-code").value); q("fr-code").value=""; };
  paintSocial();
}
function paintInviteFriends(){
  const el=q("inv-friends"); if(!el) return;
  const fr=friendsSorted();
  el.innerHTML=!SO.on?"":fr.length?fr.map(({u,d})=>{ const st=statusOf(d), here=d.room===S.code&&d.on;
    return `<div class="ol-brow"><span class="ol-av">${E(d.a||"⚽")}<i class="dot${st.on?" on":""}"></i></span><span class="nm">${E(d.n||"Player")}<small class="fr-st${st.on?" on":""}">${E(here?"In this room":st.txt)}</small></span>${here?"":`<button class="btn${st.on?" primary":""}" data-fi="${E(u)}">Invite</button>`}</div>`; }).join("")
    :`<p class="note" style="margin:0">No friends yet. <a href="#friends">Add friends</a> to invite them in one tap.</p>`;
  el.querySelectorAll("[data-fi]").forEach(b=>b.onclick=()=>{ inviteFriend(b.dataset.fi); b.textContent="Sent ✓"; b.disabled=true; });
}

/* ================= Player card (tap a name in the room) ================= */
function openPlayer(u){
  const p=S.players[u]; if(!p) return;
  const rel=relation(u), isMe=u===S.uid, host=S.host&&!isMe;
  const st=p.online?"In the room now":`Away · last seen ${ago(p.seen)}`;
  const o=dialog("pl-dlg",`${E(p.av)} ${E(p.name)}`,`
    <p class="note" style="margin:0">${E(st)} · ${p.pts||0} points · ${p.wins||0} wins in this room${S.meta.host===u?" · 👑 host":""}</p>
    <div class="actions">
      ${isMe?`<span class="note">That's you!</span>`:!SO.on?`<span class="note">Sign in to add friends.</span>`:rel==="friend"?`<span class="tag ok">Friends ✓</span>`:rel==="incoming"?`<button class="btn primary" data-pa="acc">Accept friend request</button>`:rel==="sent"?`<span class="tag">Request sent</span>`:`<button class="btn primary" data-pa="add">👥 Add friend</button>`}
      ${host?`<button class="btn" data-pa="host">Make host</button><button class="btn ghost" data-pa="kick">Remove from room</button>`:""}
    </div>`);
  o.querySelectorAll("[data-pa]").forEach(b=>b.onclick=async()=>{
    const a=b.dataset.pa;
    if(a==="add"){ await sendRequest(u); o.remove(); }
    else if(a==="acc"){ await acceptReq(u); o.remove(); }
    else if(a==="host"){ await S.net.set(R("meta/host"),u); sys(`👑 ${p.name} is now the host`); o.remove(); }
    else if(a==="kick"){ if(!b.dataset.sure){ b.dataset.sure="1"; b.textContent=`Remove ${p.name}?`; return; }
      await S.net.set(R(`kicked/${u}`),true); await S.net.remove(R(`players/${u}`)); sys(`${p.name} was removed from the room`); o.remove(); }
  });
}

/* ================= Entry points ================= */
async function open(h){
  shell();
  const main=q("ol-main");
  if(!S.net){ main.innerHTML=`<p class="note">Connecting…</p>`; S.net=await getNet(); }
  modeBadge();
  if(h==="duel") return Duel.open();
  if(h==="whoami") return WhoSolo.open();
  if(S.view==="home"&&h!=="online") stopPub();
  if(!S.net.auth.signedIn()||!S.profile.name){ stopPub(); return renderSignIn(); }
  S.uid=S.net.uid();
  const m=h.match(/^join-([A-Z]{5})$/);
  if(m) return enterRoom(m[1]);
  socialStart();
  if(h==="leaders") return renderLeaders();
  if(h==="friends") return renderFriends();
  if(S.code&&S.view!=="room"){ /* came back to the online home while still in a room */ }
  renderHome();
}
window.ONLINE={open};
applyUI(); headerButtons(); paintRejoin();
if(ls.get("arc-online",false)&&S.profile.name&&!/^#(online|friends|leaders|join-)/.test(location.hash)) getNet().then(n=>{ S.net=S.net||n; if(S.net.auth.signedIn()){ S.uid=S.net.uid(); socialStart(); } }).catch(()=>{});
window.addEventListener("hashchange",()=>setTimeout(paintRejoin,0));
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
window.addEventListener("beforeunload",()=>{});
if(/^#(online|duel|whoami|leaders|friends|join-[A-Z]{5})$/.test(location.hash)&&typeof route==="function") setTimeout(route,0);
})();
