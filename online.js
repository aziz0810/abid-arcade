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
    presence:(p)=>{ const c=db.ref(".info/connected"), f=s=>{ if(s.val()){ db.ref(p).onDisconnect().set(false); db.ref(p).set(true); } }; c.on("value",f); return ()=>{ c.off("value",f); db.ref(p).onDisconnect().cancel(); }; },
    tx:(p,fn)=>db.ref(p).transaction(fn).then(r=>({committed:r.committed,val:r.snapshot.val()})),
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
  window.addEventListener("pagehide",()=>{ if(disc.length) write(t=>disc.forEach(([p,v])=>setAt(t,p,v))); });
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
    presence:(p)=>{ write(t=>setAt(t,p,true)); disc.push([p,false]); return ()=>{ const i=disc.findIndex(d=>d[0]===p); if(i>=0) disc.splice(i,1); }; },
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
  play(type){ if(this.muted) return; try{
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
const REACTIONS=["⚽","🔥","😂","👏","😱","🐐","💀","🙌"];
const S={net:null,uid:null,profile:ls.get("arc-profile",{name:"",av:"⚽"}),code:null,meta:null,players:{},game:null,progress:{},answers:{},hand:[],
  subs:[],chat:[],unread:0,chatOpen:false,host:false,hostWait:null,joinedAt:0,view:null,lastGameKey:null,pending:false};
const me=()=>S.players[S.uid]||{name:S.profile.name,av:S.profile.av};
const R=p=>`rooms/${S.code}/${p}`;
const now=()=>S.net?S.net.now():Date.now();
const onlineUids=()=>Object.entries(S.players).filter(([u,p])=>p&&p.online).sort((a,b)=>(a[1].joined||0)-(b[1].joined||0)).map(([u])=>u);
const pname=u=>{ if(!u) return "Kick-off"; const p=S.players[u]; if(p) return p.name; const g=S.game; if(g&&g.seats){ const s=g.seats.find(x=>x.id===u); if(s) return s.name; } return "Someone"; };
const pav=u=>{ const p=S.players[u]; if(p) return p.av; const g=S.game; if(g&&g.seats){ const s=g.seats.find(x=>x.id===u); if(s) return s.av; } return "⚽"; };

/* ================= Games: settings ================= */
const GAMES={
  close:{name:"Close Control",icon:"#1",blurb:"Everyone hunts the same secret player. Live leaderboard.",
    set:{level:[["0","Stars"],["1","Well known"],["2","Deep cuts"]],era:[["all","Any era"],["modern","Born 1990+"],["classic","Before 1990"]]},def:{level:"0",era:"all"}},
  thirty:{name:"30 Seconds",icon:"30",blurb:"Same category on every phone. Answers nobody else gave score double.",
    set:{rounds:[[3,"3 rounds"],[5,"5 rounds"],[8,"8 rounds"]],secs:[[20,"20s"],[30,"30s"],[45,"45s"]],scoring:[["unique","Unique ×2"],["count","1 point each"]]},def:{rounds:5,secs:30,scoring:"unique"}},
  letters:{name:"Letter Rush",icon:"K",blurb:"One letter, everyone at once. Unique answers score double.",
    set:{rounds:[[3,"3 rounds"],[5,"5 rounds"]],secs:[[30,"30s"],[60,"60s"],[90,"90s"]],scoring:[["unique","Unique ×2"],["count","1 point each"]]},def:{rounds:3,secs:60,scoring:"unique"}},
  chain:{name:"Name Chain",icon:"O→O",blurb:"Take turns. Each name starts with the last letter of the one before.",
    set:{secs:[[10,"10s"],[15,"15s"],[20,"20s"],[30,"30s"]]},def:{secs:20}},
  linkup:{name:"Link Up",icon:"▮▮▮",blurb:"The football card game. Private hands, CPUs can fill seats.",
    set:{hand:[[5,"5 cards"],[7,"7 cards"],[9,"9 cards"]],secs:[[30,"30s turns"],[45,"45s turns"],[0,"No timer"]],cpus:[[0,"No CPU"],[1,"+1 CPU"],[2,"+2 CPU"]],level:[["easy","Easy CPU"],["normal","Normal CPU"],["hard","Hard CPU"]]},def:{hand:7,secs:45,cpus:0,level:"normal"}},
};

/* ================= Shell & profile ================= */
function shell(){
  const root=q("v-online"); if(root.dataset.ready) return; root.dataset.ready="1";
  root.innerHTML=`<div class="backbar"><button class="btn ghost" data-go="">← All games</button>
      <span class="ol-tools"><span class="ol-mode" id="ol-mode"></span><button class="btn ghost" id="ol-mute" aria-label="Sound on or off"></button></span></div>
    <div id="ol-main"></div>`;
  const mute=q("ol-mute"); const paint=()=>mute.textContent=SFX.muted?"🔇 Sound off":"🔊 Sound on";
  paint(); mute.onclick=()=>{ SFX.toggle(); paint(); SFX.play("ok"); };
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
function afterSignIn(){ S.uid=S.net.uid(); const h=location.hash.replace("#",""); const m=h.match(/^join-([A-Z]{5})$/); if(m) enterRoom(m[1]); else renderHome(); }

function renderHome(){
  const main=q("ol-main"); S.view="home";
  const u=S.net.auth.user();
  main.innerHTML=`<div class="ol-me"><span class="ol-av big">${E(S.profile.av)}</span><div><b>${E(S.profile.name)}</b><div class="note">${u&&!u.isAnonymous?"Signed in with Google":"Playing as a guest"}</div></div>
      <button class="btn ghost" id="ol-edit">Edit</button><button class="btn ghost" id="ol-out">Sign out</button></div>
    <div class="ol-two">
      <div class="panel"><h3 class="ol-h">Create a room</h3><p class="note" style="margin:0">Pick the first game. You can switch games in the room.</p>
        <div class="ol-games" id="ol-pick">${Object.entries(GAMES).map(([k,g],i)=>`<button type="button" class="ol-game" aria-pressed="${i===0}" data-g="${k}"><span class="glyph">${g.icon}</span><span><b>${g.name}</b><small>${g.blurb}</small></span></button>`).join("")}</div>
        <button class="btn primary go" id="ol-create">Create room</button></div>
      <div class="panel"><h3 class="ol-h">Join a room</h3><p class="note" style="margin:0">Type the 5-letter code your friend sent you.</p>
        <form id="ol-joinf" class="answer"><input id="ol-code" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="ABCDE" aria-label="Room code" style="text-transform:uppercase;letter-spacing:.3em;font-weight:700"><button class="btn primary">Join</button></form>
        ${S.net.kind==="local"?`<p class="note" style="margin:0">Demo mode: open this page in another tab to join your own room.</p>`:""}</div>
    </div>`;
  let pick="close";
  q("ol-pick").querySelectorAll("button").forEach(b=>b.onclick=()=>{ q("ol-pick").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); pick=b.dataset.g; });
  q("ol-create").onclick=()=>createRoom(pick);
  q("ol-joinf").onsubmit=e=>{ e.preventDefault(); const c=(q("ol-code").value||"").toUpperCase().replace(/[^A-Z]/g,""); if(c.length!==5){ toast("Room codes have 5 letters."); return; } enterRoom(c); };
  q("ol-out").onclick=async()=>{ await S.net.auth.signOut(); renderSignIn(); };
  q("ol-edit").onclick=()=>{ const m=q("ol-main"); m.innerHTML=`<div class="panel">${profileForm()}<div class="actions"><button class="btn primary" id="ol-save">Save</button></div></div>`; bindProfile(); q("ol-save").onclick=()=>{ if(saveProfile()) renderHome(); }; };
}

/* ================= Rooms ================= */
const CODE_ABC="ABCDEFGHJKLMNPQRSTUVWXYZ";
const genCode=()=>Array.from({length:5},()=>CODE_ABC[Math.floor(Math.random()*CODE_ABC.length)]).join("");
async function createRoom(game){
  for(let i=0;i<8;i++){
    const code=genCode();
    const meta={host:S.uid,game,settings:clone(GAMES[game].def),status:"lobby",created:now(),v:1};
    const r=await S.net.tx(`rooms/${code}/meta`,cur=>cur?undefined:meta);
    if(r.committed){ await enterRoom(code,true); return; }
  }
  toast("Couldn't create a room. Try again.");
}
async function enterRoom(code,fresh){
  if(S.code===code&&S.view==="room"){ renderRoom(); return; }
  if(S.code&&S.code!==code) await leaveRoom(true);
  const meta=await S.net.get(`rooms/${code}/meta`);
  if(!meta){ toast(`Room ${code} doesn't exist (or has closed).`); if(location.hash!=="#online") location.hash="online"; else renderHome(); return; }
  S.code=code; S.meta=meta; S.players={}; S.game=null; S.progress={}; S.answers={}; S.chat=[]; S.hand=[]; S.unread=0;
  const prev=await S.net.get(R(`players/${S.uid}`));
  S.joinedAt=(prev&&prev.joined)||now();
  await S.net.set(R(`players/${S.uid}`),{name:S.profile.name,av:S.profile.av,joined:S.joinedAt,online:true,pts:(prev&&prev.pts)||0,wins:(prev&&prev.wins)||0});
  S.subs.push(S.net.presence(R(`players/${S.uid}/online`)));
  if(!prev) sys(`${S.profile.av} ${S.profile.name} joined the room`);
  if(location.hash!=="#join-"+code) history.replaceState(null,"","#join-"+code);
  ls.set("arc-last-room",code);
  S.view="room"; renderRoom();
  S.subs.push(S.net.on(R("meta"),v=>{ if(!v){ roomClosed(); return; } S.meta=v; checkHost(); refresh(); }));
  S.subs.push(S.net.on(R("players"),v=>{ S.players=v||{}; checkHost(); paintRoster(); refresh(); }));
  S.subs.push(S.net.on(R("game"),v=>{ const old=S.game; S.game=v; onGameChange(old,v); refresh(); }));
  S.subs.push(S.net.on(R("progress"),v=>{ S.progress=v||{}; refresh(); }));
  S.subs.push(S.net.on(R("answers"),v=>{ S.answers=v||{}; refresh(); }));
  S.subs.push(S.net.on(`hands/${S.code}/${S.uid}`,v=>{ S.hand=arr(v); refresh(); }));
  S.subs.push(S.net.onChild(R("chat"),(k,m)=>addChat(k,m)));
}
function roomClosed(){ toast("This room has closed."); teardown(); location.hash="online"; }
function teardown(){ S.subs.forEach(f=>{ try{f();}catch(e){} }); S.subs=[]; Host.stop(); S.code=null; S.meta=null; S.game=null; S.view=null; clearTimeout(S.hostWait); S.hostWait=null; S.host=false; }
async function leaveRoom(silent){
  if(!S.code) return;
  const code=S.code, uid=S.uid, wasHost=S.meta&&S.meta.host===uid;
  const others=onlineUids().filter(u=>u!==uid);
  if(!silent) sys(`${S.profile.name} left`);
  teardown();
  await S.net.remove(`rooms/${code}/players/${uid}`);
  if(wasHost){
    if(others.length) await S.net.set(`rooms/${code}/meta/host`,others[0]);
    else { await S.net.remove(`secrets/${code}`); await S.net.remove(`hands/${code}`); await S.net.remove(`rooms/${code}`); }
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
  else if(fresh&&m.u!==S.uid&&m.k==="m"){ SFX.play("msg"); if(!S.chatOpen&&!wideChat()){ S.unread++; } }
  paintChat();
}
const wideChat=()=>window.matchMedia&&matchMedia("(min-width: 960px)").matches;
function paintChat(){
  const list=q("ol-msgs"); if(!list) return;
  const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<60;
  list.innerHTML=S.chat.map(m=>{
    if(m.k==="s") return `<div class="msg-s">${E(m.t)}</div>`;
    if(m.k==="r") return `<div class="msg-r"><span>${E(m.a)} ${E(m.n)}</span> ${E(m.t)}</div>`;
    return `<div class="msg${m.u===S.uid?" mine":""}"><span class="msg-who">${E(m.a)} ${E(m.n)}</span><span class="msg-t">${E(m.t)}</span></div>`;
  }).join("")||`<div class="msg-s">Say hi 👋</div>`;
  if(atBottom||S.chat.length<3) list.scrollTop=list.scrollHeight;
  const b=q("ol-chatbadge"); if(b){ b.textContent=S.unread||""; b.hidden=!S.unread; }
}

/* ================= Room screen ================= */
function renderRoom(){
  const main=q("ol-main"); if(!main) return;
  main.innerHTML=`<div class="ol-room">
    <div class="ol-col">
      <div class="ol-roombar">
        <div class="ol-code"><span class="note">Room</span><b id="ol-roomcode">${S.code}</b></div>
        <button class="btn" id="ol-invite">Copy invite link</button>
        <button class="btn ghost" id="ol-leave">Leave</button>
      </div>
      <div class="ol-roster" id="ol-roster"></div>
      <div id="ol-stage"></div>
    </div>
    <aside class="ol-chat" id="ol-chatbox" aria-label="Room chat">
      <div class="ol-chathead"><b>Chat</b><button class="btn ghost" id="ol-chatclose">Close</button></div>
      <div class="ol-msgs" id="ol-msgs" aria-live="polite"></div>
      <div class="ol-reacts">${REACTIONS.map(r=>`<button type="button" data-r="${r}" aria-label="Send ${r}">${r}</button>`).join("")}</div>
      <form class="ol-chatform" id="ol-chatform"><input id="ol-chatin" maxlength="200" autocomplete="off" placeholder="Message…" aria-label="Chat message"><button class="btn primary">Send</button></form>
    </aside>
    <button class="ol-fab" id="ol-fab" aria-label="Open chat">💬<b id="ol-chatbadge" hidden></b></button>
  </div>`;
  q("ol-invite").onclick=()=>{ const link=location.origin+location.pathname+"#join-"+S.code; const done=()=>toast("Invite link copied. Send it to your friends!");
    try{ navigator.clipboard.writeText(`Join my Matchday Arcade room: ${link} (code ${S.code})`).then(done,()=>prompt?toast(link):0); }catch(e){ toast(link); } };
  q("ol-leave").onclick=async()=>{ await leaveRoom(); location.hash="online"; };
  q("ol-chatform").onsubmit=e=>{ e.preventDefault(); const v=q("ol-chatin").value.trim(); if(!v) return; q("ol-chatin").value=""; sendChat(v); };
  q("ol-chatbox").querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>sendChat(b.dataset.r,"r"));
  q("ol-fab").onclick=()=>{ S.chatOpen=true; S.unread=0; q("ol-chatbox").classList.add("open"); paintChat(); q("ol-chatin").focus(); };
  q("ol-chatclose").onclick=()=>{ S.chatOpen=false; q("ol-chatbox").classList.remove("open"); };
  paintRoster(); paintChat(); refresh();
}
function paintRoster(){
  const el=q("ol-roster"); if(!el) return;
  const list=Object.entries(S.players).sort((a,b)=>(a[1].joined||0)-(b[1].joined||0));
  el.innerHTML=list.map(([u,p])=>`<span class="ol-chip${p.online?"":" off"}${u===S.uid?" me":""}"><span class="ol-av">${E(p.av)}</span>${E(p.name)}${S.meta&&S.meta.host===u?" 👑":""}<b title="Points in this room">${p.pts||0}</b></span>`).join("");
}
let rAF=0;
function refresh(){ if(rAF) return; rAF=requestAnimationFrame(()=>{ rAF=0; renderStage(); }); }
function renderStage(){
  const st=q("ol-stage"); if(!st||S.view!=="room") return;
  if(!S.meta){ st.innerHTML=`<p class="note">Loading room…</p>`; return; }
  if(S.meta.status!=="playing"||!S.game) return renderLobby(st);
  const eng=ENG[S.game.kind]; if(eng) eng.render(st);
}
function skel(st,key,html){ if(st.dataset.key!==key){ st.dataset.key=key; st.innerHTML=html; return true; } return false; }

function renderLobby(st){
  const m=S.meta, g=GAMES[m.game], host=S.host;
  const fresh=skel(st,"lobby-"+m.game+"-"+host,`<div class="panel">
    <div class="section-label"><span>${host?"Choose the game":"Next game"}</span><span>${host?"You're the host":"Host: "+E(pname(m.host))}</span></div>
    <div class="ol-games" id="ol-lg">${Object.entries(GAMES).map(([k,x])=>`<button type="button" class="ol-game" data-g="${k}" ${host?"":"disabled"}><span class="glyph">${x.icon}</span><span><b>${x.name}</b><small>${x.blurb}</small></span></button>`).join("")}</div>
    <div id="ol-sets"></div>
    <div class="actions" id="ol-start"></div></div>`);
  st.querySelectorAll("#ol-lg button").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.g===m.game)); if(fresh&&host) b.onclick=()=>S.net.update(R("meta"),{game:b.dataset.g,settings:clone(GAMES[b.dataset.g].def)}); });
  const sets=q("ol-sets"); const cur=m.settings||g.def;
  sets.innerHTML=Object.entries(g.set).map(([k,opts])=>`<div class="field"><span>${k==="secs"?"Time":k==="cpus"?"Computer players":k==="level"?(m.game==="close"?"Secret player from":"CPU strength"):k==="era"?"Era":k==="hand"?"Cards each":k==="rounds"?"Rounds":"Scoring"}</span><div class="seg">${opts.map(([v,l])=>`<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${String(cur[k])===String(v)}" ${host?"":"disabled"}>${l}</button>`).join("")}</div></div>`).join("");
  if(host) sets.querySelectorAll("button").forEach(b=>b.onclick=()=>{ const o=GAMES[m.game].set[b.dataset.k].find(x=>String(x[0])===b.dataset.v); S.net.set(R("meta/settings/"+b.dataset.k),o[0]); });
  const n=onlineUids().length, need=m.game==="linkup"?Math.max(0,2-n-Number(cur.cpus||0)):0;
  q("ol-start").innerHTML=host
    ?`<button class="btn primary go" id="ol-go" ${need?"disabled":""}>Start ${E(g.name)}</button><span class="note">${need?"Link Up needs 2 seats: invite a friend or add a CPU.":`${n} player${n>1?"s":""} in the room`}</span>`
    :`<span class="note">Waiting for ${E(pname(m.host))} to start…</span>`;
  if(host&&q("ol-go")) q("ol-go").onclick=()=>startGame();
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
function endButtons(){ return S.host?`<div class="actions"><button class="btn primary" data-end="again">Play again</button><button class="btn ghost" data-end="lobby">Change game</button></div>`:`<p class="note">Waiting for the host to start the next game…</p>`; }
function bindEnd(st){ st.querySelectorAll("[data-end]").forEach(b=>b.onclick=()=>b.dataset.end==="again"?startGame():toLobby()); }
function onGameChange(old,g){
  if(!g) return;
  const eng=ENG[g.kind]; eng&&eng.onChange&&eng.onChange(old,g);
}

/* ================= Host engine ================= */
const Host={on:false,iv:null,unsub:null,q:Promise.resolve(),cache:null,
  start(){ if(this.on) return; this.on=true; this.cache=null;
    this.unsub=S.net.onChild(R("actions"),(k,a)=>this.run(()=>this.action(k,a)));
    this.iv=setInterval(()=>this.run(()=>this.tick()),400); },
  stop(){ this.on=false; clearInterval(this.iv); this.unsub&&this.unsub(); this.unsub=null; this.cache=null; },
  run(fn){ this.q=this.q.then(()=>this.on?fn():null).catch(e=>console.error(e)); return this.q; },
  async action(k,a){ await S.net.remove(R("actions/"+k)); if(!a||!S.game||S.meta.status!=="playing") return; const e=ENG[S.game.kind]; e&&e.hostAction&&await e.hostAction(a); },
  async tick(){ if(!S.game||!S.meta||S.meta.status!=="playing") return; const e=ENG[S.game.kind]; e&&e.hostTick&&await e.hostTick(); }
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
},200);
const clockHTML=(id,ends,total,sound)=>`<div class="clock" id="${id}" data-ends="${ends}" data-total="${total}" data-sound="${sound?1:0}"><b>${Math.ceil(Math.max(0,(ends-now())/1000))}</b><span class="bar"><i></i></span></div>`;

/* ================= Shared bits for the Close Control games ================= */
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

/* ================= Close Control · race ================= */
const CCR={key:null};
function ccCtx(g){
  if(CCR.key!==g.at){ CCR.key=g.at; CCR.secret=CC.PLAYERS[dec(g.sx)]; CCR.ctx=CC.rankFor(CCR.secret); CCR.mine=ss.get(`arc-cc-${S.code}-${g.at}`,{ids:[],hints:0}); CCR.last=null; }
  return CCR;
}
ENG.close={
  async start(set){
    const lv=+set.level;
    let pool=CC.PLAYERS.filter(p=>p.tier<=lv&&p.clubs.size>=2&&(set.era==="all"||(set.era==="modern"?p.born>=1990:p.born<1990)));
    if(!pool.length) pool=CC.PLAYERS.slice(0,500);
    return {kind:"close",at:now(),sx:enc(pickOne(pool).id),players:onlineUids(),phase:"play"};
  },
  async hostTick(){
    const g=S.game; if(g.phase!=="play") return;
    const act=g.players.filter(u=>S.players[u]&&S.players[u].online);
    const fin=u=>{ const p=S.progress[u]; return p&&(p.done||p.gaveUp); };
    if(act.length&&act.every(fin)) await this.finish();
  },
  async finish(){
    const g=clone(S.game); if(g.phase!=="play") return;
    g.phase="over"; await setGame(g);
    const solvers=g.players.filter(u=>S.progress[u]&&S.progress[u].done).sort((a,b)=>S.progress[a].t-S.progress[b].t);
    const pts=[3,2,1]; for(let i=0;i<solvers.length&&i<3;i++) await award([solvers[i]],pts[i],i===0);
    sys(`The secret player was ${CC.PLAYERS[dec(g.sx)].name}`);
  },
  save(g){
    const c=ccCtx(g); ss.set(`arc-cc-${S.code}-${g.at}`,c.mine);
    const ids=c.mine.ids, best=ids.length?Math.min(...ids.map(i=>c.ctx.ranks[i])):0, done=ids.includes(c.secret.id);
    const prev=S.progress[S.uid]||{};
    S.net.set(R(`progress/${S.uid}`),{g:ids.length,b:best,h:c.mine.hints,done,gaveUp:!!c.mine.gaveUp,t:done?(prev.t||now()-g.at):0});
    return {best,done,prevBest:prev.b||0};
  },
  guess(p){
    const g=S.game, c=ccCtx(g); if(c.mine.ids.includes(p.id)){ this.fb(`${p.name} is already on your list.`,true); return; }
    c.mine.ids.push(p.id); c.last=p.id;
    const r=this.save(g), rank=c.ctx.ranks[p.id];
    if(r.done){ SFX.play("win"); confetti(); sys(`🎯 ${S.profile.name} found the secret player in ${c.mine.ids.length} guesses!`); }
    else { SFX.play(rank<=50?"ok":"draw"); if(r.best<=10&&(!r.prevBest||r.prevBest>10)) sys(`🔥 ${S.profile.name} is in the top 10!`); }
    this.fb(""); refresh();
  },
  fb(t,err){ const f=q("cc-fb"); if(f){ f.textContent=t; f.className="feedback"+(err?" err":""); } },
  render(st){
    const g=S.game, c=ccCtx(g), secret=c.secret, mine=c.mine;
    const inGame=g.players.includes(S.uid);
    if(g.phase==="over"){
      if(skel(st,"cc-over-"+g.at,`<div id="cc-reveal"></div><div class="section-label"><span>Final standings</span></div><div class="ol-board" id="cc-board"></div><div class="section-label"><span>Closest players</span></div><div class="nearest" id="cc-near"></div><div id="cc-end"></div>`)){
        q("cc-reveal").innerHTML=revealCard(secret);
        q("cc-near").innerHTML=c.ctx.order.slice(1,11).map(p=>`<div class="near"><span class="r" style="color:var(${CC.tone(c.ctx.ranks[p.id])})">${c.ctx.ranks[p.id]}</span><div><div class="nm">${E(p.name)}</div><div class="why">${E(CC.whyText(secret,p))}</div></div></div>`).join("");
        q("cc-end").innerHTML=endButtons(); bindEnd(st);
      }
      this.board(); return;
    }
    if(skel(st,"cc-play-"+g.at,`<div class="prompt"><span class="who">Close Control · live race</span><span class="cat">Find the secret footballer</span></div>
      <div class="ol-board" id="cc-board"></div>
      ${inGame?`<div class="search"><input id="cc-in" type="text" autocomplete="off" spellcheck="false" placeholder="Type a player's name…" aria-label="Guess a player"><div class="suggest" id="cc-sug" role="listbox" hidden></div></div>
      <div class="actions"><button class="btn" id="cc-hint">Closer player</button><button class="btn ghost" id="cc-give">Give up</button>${S.host?`<button class="btn ghost" id="cc-end">Reveal for everyone</button>`:""}</div>`
      :`<div class="ol-note">You joined during this round. You'll play from the next one. Watch the race and chat meanwhile.</div>${S.host?`<div class="actions"><button class="btn ghost" id="cc-end">Reveal for everyone</button></div>`:""}`}
      <div class="feedback" id="cc-fb" aria-live="polite"></div>
      <div class="section-label"><span>Your guesses, closest first</span><span id="cc-best"></span></div>
      <div class="list" id="cc-list"></div>`)){
      if(inGame){
        ccSearch(q("cc-in"),q("cc-sug"),p=>this.guess(p),p=>mine.ids.includes(p.id));
        q("cc-hint").onclick=()=>{ const best=mine.ids.length?Math.min(...mine.ids.map(i=>c.ctx.ranks[i])):CC.N+1;
          if(best<=2){ this.fb("You're as close as a hint can get you.",true); return; }
          const p=closerPick(c.ctx,best,x=>mine.ids.includes(x.id)); if(!p) return; mine.hints++; this.guess(p); this.fb(`Hint: ${p.name} is #${c.ctx.ranks[p.id]}.`); };
        q("cc-give").onclick=()=>{ if(mine.done) return; mine.gaveUp=true; this.save(g); sys(`🏳️ ${S.profile.name} gave up`); refresh(); };
      }
      if(q("cc-end")) q("cc-end").onclick=()=>Host.run(()=>this.finish());
      if(q("cc-in")) q("cc-in").focus();
    }
    const done=mine.ids.includes(secret.id)||mine.gaveUp;
    if(q("cc-in")){ q("cc-in").disabled=done; q("cc-in").placeholder=done?(mine.gaveUp?"You gave up. Waiting for the others…":"Found it! Waiting for the others…"):"Type a player's name…"; q("cc-hint").disabled=done; q("cc-give").disabled=done; }
    const ids=mine.ids, sorted=[...ids].sort((a,b)=>c.ctx.ranks[a]-c.ctx.ranks[b]);
    const order=c.last!=null&&ids.length>1?[c.last,...sorted]:sorted;
    q("cc-list").innerHTML=order.map((id,i)=>{ const p=CC.PLAYERS[id]; return ccRow(p,secret,c.ctx.ranks[id],(i===0&&ids.length>1&&c.last!=null?"Latest · ":"")+p.name,i===0&&ids.length>1&&c.last!=null); }).join("")||`<div class="empty">Each guess shows how close it is to the secret player: #${CC.fmt(CC.N)} means no link, #1 is the answer.</div>`;
    q("cc-best").textContent=ids.length?"Best #"+Math.min(...ids.map(i=>c.ctx.ranks[i])):"";
    this.board();
  },
  board(){
    const g=S.game, el=q("cc-board"); if(!el) return;
    const rows=g.players.map(u=>({u,p:S.progress[u]||{}})).sort((a,b)=>{
      const A=a.p,B=b.p; if(A.done!==B.done) return A.done?-1:1; if(A.done) return A.t-B.t; if(!!A.gaveUp!==!!B.gaveUp) return A.gaveUp?1:-1; return (A.b||1e9)-(B.b||1e9); });
    el.innerHTML=rows.map(({u,p},i)=>`<div class="ol-brow${u===S.uid?" me":""}"><span class="ol-av">${E(pav(u))}</span><span class="nm">${E(pname(u))}</span><span class="st">${p.done?`✓ found it · ${p.g} guesses${p.h?` · ${p.h} hints`:""}`:p.gaveUp?"gave up":p.g?`best #${CC.fmt(p.b)} · ${p.g} guesses`:"thinking…"}</span>${p.done&&i<3?`<span class="medal">${["🥇","🥈","🥉"][i]}</span>`:""}</div>`).join("");
  },
  onChange(old,g){ if(old&&old.phase==="play"&&g.phase==="over"){ const pr=S.progress[S.uid]; if(pr&&pr.done) SFX.play("win"); } }
};

/* ================= 30 Seconds & Letter Rush · simultaneous ================= */
function makeSpec(){
  for(let tries=0;tries<200;tries++){
    const r=Math.random(), c1=()=>pickOne(BIG_CLUBS.slice(0,30)), c2=()=>pickOne(BIG_CLUBS); let s;
    if(r<.16) s={t:"club",a:c1()};
    else if(r<.42){ s={t:"club2",a:c2(),b:c2()}; if(s.a===s.b) continue; }
    else if(r<.56){ s={t:"natLeague",a:pickOne(BIG_NATS),b:pickOne(BIG_LEAGUES)}; if(s.a===s.b) continue; }
    else if(r<.70) s={t:"natClub",a:pickOne(BIG_NATS),b:c2()};
    else if(r<.82) s={t:"coach",a:pickOne(BIG_COACHES)};
    else if(r<.90) s={t:"posClub",g:pickOne(["Goalkeeper","Defender","Forward"]),a:c1()};
    else if(r<.95) s={t:"uclClub",a:c1()};
    else s={t:"ballon"};
    const ans=PLAYERS.filter(specCat(s).pred);
    if(ans.filter(p=>p.tier<=1).length>=5&&ans.length<=400) return s;
  }
  return {t:"club",a:clubIdx("Real Madrid")};
}
function specCat(s){
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
      if(kind==="letters"){ const pool=shuffle(LETTER_OK.slice()); for(let i=0;i<total;i++) specs.push({t:"letter",L:pool[i%pool.length]}); }
      else { const seen=new Set(); while(specs.length<total){ const s=makeSpec(), k=JSON.stringify(s); if(seen.has(k)) continue; seen.add(k); specs.push(s); } }
      const t=now()+4000;
      return {kind,at:now(),round:0,total,specs,secs:+set.secs,scoring:set.scoring,phase:"play",startsAt:t,endsAt:t+set.secs*1000,scores:{},res:{},players:onlineUids()};
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
      const g=S.game, cat=specCat(g.specs[g.round]), fb=q("tm-fb"), list=mine(g);
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
      const cat=specCat(g.specs[g.round]);
      if(g.phase==="results"){
        if(skel(st,`tm-res-${g.startsAt}`,`<div class="prompt"><span class="who">${gm.name} · round ${g.round+1} of ${g.total} · results</span><span class="cat">${E(cat.title)}</span></div>
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
      if(skel(st,`tm-play-${g.startsAt}`,`<div class="prompt"><span class="who">${gm.name} · round ${g.round+1} of ${g.total}</span><span class="cat">${E(cat.title)}</span></div>
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
    do{ first=pickOne(PLAYERS.slice(0,350)); }while(!first.end||!PLAYERS.some(p=>p.tier<=1&&p.starts.has(first.end)&&p.id!==first.id));
    return {kind:"chain",at:now(),order,turn:0,letter:first.end,chain:[{id:first.id,u:""}],used:{["p"+first.id]:1},out:{},secs:+set.secs,deadline:now()+3500+set.secs*1000,phase:"play"};
  },
  adv(g){ const n=g.order.length; let t=g.turn; for(let i=0;i<n;i++){ t=(t+1)%n; if(!(g.out||{})[g.order[t]]) break; } g.turn=t; },
  async hostAction(a){
    if(a.type!=="chain") return;
    const g=clone(S.game); if(g.phase!=="play"||g.order[g.turn]!==a.u) return;
    const p=PLAYERS[a.id]; g.used=g.used||{};
    if(!p||!p.end||!p.starts.has(g.letter)||g.used["p"+a.id]) return;
    g.chain=arr(g.chain); g.chain.push({id:a.id,u:a.u}); g.used["p"+a.id]=1; g.letter=p.end; g.lastOut=null;
    this.adv(g); g.deadline=now()+g.secs*1000; await setGame(g);
  },
  async hostTick(){
    const g0=S.game; if(g0.phase!=="play"||now()<=g0.deadline) return;
    const g=clone(g0); g.out=g.out||{}; const cur=g.order[g.turn]; g.out[cur]=1;
    const used=g.used||{};
    g.lastOut={u:cur,ex:PLAYERS.filter(p=>p.tier===0&&p.starts.has(g.letter)&&!used["p"+p.id]).slice(0,3).map(p=>p.base)};
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
    if(my&&(CH.lastTurn!==g.deadline)){ CH.lastTurn=g.deadline; SFX.play("turn"); vibrate(120); CH.pending=false; }
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
        <div class="prompt"><span class="who" id="ch-who"></span><div class="chainletter"><span class="big" id="ch-letter"></span><span class="cat" id="ch-cat"></span></div></div>
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
    const r=resolve(v,p=>p.starts.has(L)&&!used["p"+p.id]&&!!p.end);
    if(!r){ fb.className="feedback err"; fb.textContent=`No player called “${v}” in the database.`; SFX.play("bad"); return; }
    if(used["p"+r.p.id]){ fb.className="feedback err"; fb.textContent=`${r.p.base} has already been named.`; SFX.play("bad"); return; }
    if(!r.ok){ fb.className="feedback err"; fb.textContent=`${r.p.base} doesn't start with ${L.toUpperCase()}.`; SFX.play("bad"); return; }
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
      if(g.seats[g.turn].id===S.uid){ SFX.play("turn"); vibrate(120); } else if(old) SFX.play("draw"); }
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

/* ================= Close Control · duel on one device ================= */
const Duel={st:null,
  open(){
    const main=q("ol-main"); S.view="duel";
    const cfg=ls.get("arc-duel",{n:2,level:"0"});
    main.innerHTML=`<h2 class="view-title">Close Control Duel</h2>
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
    main.innerHTML=`<h2 class="view-title">Close Control Duel</h2>
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


/* ================= Entry points ================= */
async function open(h){
  shell();
  const main=q("ol-main");
  if(!S.net){ main.innerHTML=`<p class="note">Connecting…</p>`; S.net=await getNet(); }
  modeBadge();
  if(h==="duel") return Duel.open();
  if(!S.net.auth.signedIn()||!S.profile.name) return renderSignIn();
  S.uid=S.net.uid();
  const m=h.match(/^join-([A-Z]{5})$/);
  if(m) return enterRoom(m[1]);
  if(S.code&&S.view!=="room"){ /* came back to the online home while still in a room */ }
  renderHome();
}
window.ONLINE={open};
window.addEventListener("beforeunload",()=>{});
if(/^#(online|duel|join-[A-Z]{5})$/.test(location.hash)&&typeof route==="function") setTimeout(route,0);
})();
