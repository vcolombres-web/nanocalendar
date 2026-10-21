(function(){
'use strict';
var KEY='agenda-entrenos-v1';
var cfg={apiKey:String.fromCharCode(65,73,122,97,83,121,65,54,117,90,78,121,115,48,84,70,72,100,117,113,57,48,74,83,101,82,66,57,99,79,122,74,106,66,107,112,75,84,115),authDomain:'nanocalendar17.firebaseapp.com',projectId:'nanocalendar17',storageBucket:'nanocalendar17.firebasestorage.app',messagingSenderId:'1054350803625',appId:'1:1054350803625:web:8b6a226d02c15620255fb8'};

document.documentElement.style.visibility='hidden';
var originalSet=Storage.prototype.setItem,internal=false,ready=false,timer=null,auth=null,db=null,ref=null,currentUser=null;

Storage.prototype.setItem=function(k,v){
  originalSet.call(this,k,v);
  if(this!==localStorage||k!==KEY||internal||!ready)return;
  clearTimeout(timer);
  timer=setTimeout(function(){
    try{
      var data=JSON.parse(localStorage.getItem(KEY));
      if(data&&ref)ref.set({data:data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    }catch(e){}
  },500);
};

function canon(v){
  if(Array.isArray(v))return v.map(canon);
  if(v&&typeof v==='object'){var o={};Object.keys(v).sort().forEach(function(k){o[k]=canon(v[k])});return o}
  return v;
}
function same(a,b){
  try{
    var x=typeof a==='string'?JSON.parse(a):a,y=typeof b==='string'?JSON.parse(b):b;
    return JSON.stringify(canon(x))===JSON.stringify(canon(y));
  }catch(e){return a===b}
}
function puedeRecargar(){
  try{
    var now=Date.now(),L=JSON.parse(sessionStorage.getItem('nc-reloads')||'[]').filter(function(t){return now-t<30000});
    if(L.length>=2){console.warn('NanoCalendar: se evitó un bucle de recargas');return false}
    L.push(now);sessionStorage.setItem('nc-reloads',JSON.stringify(L));return true;
  }catch(e){return true}
}
function recargar(){if(puedeRecargar()){location.reload();return true}return false}

function style(){
  var s=document.createElement('style');
  s.textContent='.nc-login{position:fixed;inset:0;z-index:99999;background:#EDF0F5;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.nc-box{width:100%;max-width:390px;background:#fff;border:1px solid #D3DAE5;border-radius:22px;padding:24px;box-shadow:0 12px 40px rgba(15,23,38,.12)}.nc-box h1{margin:0 0 8px;font-size:40px}.nc-box p{color:#586377;margin:0 0 20px}.nc-box label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#586377;font-weight:600;margin:12px 0 6px}.nc-box input{width:100%;height:46px;padding:10px 12px;border:1px solid #D3DAE5;border-radius:10px;background:#fff;color:#0F1726;font-size:16px;box-sizing:border-box}.nc-box button{width:100%;height:46px;margin-top:12px;border:0;border-radius:12px;background:#2346E6;color:#fff;font-size:15px;font-weight:700}.nc-box button.secondary{background:#E2E7EF;color:#0F1726}.nc-err{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f9d9de;color:#97203a;font-size:14px}.nc-note{margin-top:14px;text-align:center;color:#586377;font-size:12px}.nc-account{position:fixed;top:12px;right:12px;z-index:9998;max-width:calc(100vw - 24px);padding:9px 12px;border-radius:999px;background:#fff;border:1px solid #D3DAE5;box-shadow:0 4px 14px rgba(15,23,38,.12);font:600 12px system-ui,-apple-system,Segoe UI,sans-serif;color:#0F1726}.nc-account button{margin-left:8px;color:#2346E6;font-weight:700}.nc-create{margin-top:8px!important;background:#fff!important;color:#2346E6!important;border:1px solid #2346E6!important}';
  document.head.appendChild(s);
}

function overlay(){
  var d=document.createElement('div');
  d.className='nc-login';d.id='nc-login';
  d.innerHTML='<div class="nc-box"><h1>NanoCalendar</h1><p>Ingresá con tu mail para acceder a tu agenda compartida.</p><label>Mail</label><input id="nc-email" type="email" autocomplete="username" placeholder="tuemail@gmail.com"><label>Contraseña</label><input id="nc-pass" type="password" autocomplete="current-password" placeholder="Contraseña"><button id="nc-go">Ingresar</button><button id="nc-create" class="nc-create">Crear mi cuenta</button><div class="nc-err" id="nc-err" hidden></div><div class="nc-note">Tu agenda se sincroniza entre tus dispositivos. Las reservas públicas quedan guardadas en la nube.</div></div>';
  document.body.appendChild(d);
  var go=document.getElementById('nc-go'),create=document.getElementById('nc-create'),email=document.getElementById('nc-email'),pass=document.getElementById('nc-pass'),err=document.getElementById('nc-err');
  function datos(){return {e:email.value.trim().toLowerCase(),p:pass.value.trim()}}
  function validar(d){
    if(!d.e){err.hidden=false;err.textContent='Ingresá tu mail.';return false}
    if(!d.p||d.p.length<6){err.hidden=false;err.textContent='La contraseña debe tener al menos 6 caracteres.';return false}
    return true;
  }
  function busy(b,text){go.disabled=b;create.disabled=b;go.textContent=text||'Ingresar'}
  function login(){
    var d=datos();if(!validar(d))return;
    busy(true,'Ingresando…');err.hidden=true;
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function(){return auth.signInWithEmailAndPassword(d.e,d.p)}).catch(function(e){busy(false,'Ingresar');err.hidden=false;err.textContent=e&&e.code==='auth/user-not-found'?'No existe una cuenta con ese mail. Tocá “Crear mi cuenta”.':e&&e.code==='auth/wrong-password'?'Contraseña incorrecta.':'No se pudo ingresar. Revisá el mail y la contraseña.'});
  }
  function crear(){
    var d=datos();if(!validar(d))return;
    busy(true,'Creando…');err.hidden=true;
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(function(){return auth.createUserWithEmailAndPassword(d.e,d.p)}).then(function(){
      err.hidden=false;err.style.background='#D2EFE0';err.style.color='#145F3A';err.textContent='Cuenta creada. Entrando…';
    }).catch(function(e){busy(false,'Ingresar');err.hidden=false;err.style.background='#f9d9de';err.style.color='#97203a';err.textContent=e&&e.code==='auth/email-already-in-use'?'Ese mail ya tiene una cuenta. Tocá “Ingresar”.':e&&e.code==='auth/invalid-email'?'El mail no parece válido.':'No se pudo crear la cuenta.'});
  }
  go.onclick=login;create.onclick=crear;pass.onkeydown=function(e){if(e.key==='Enter')login()};email.onkeydown=function(e){if(e.key==='Enter')pass.focus()};
}
function show(){var d=document.getElementById('nc-login');if(d)d.style.display='flex';document.documentElement.style.visibility='visible'}
function hide(){var d=document.getElementById('nc-login');if(d)d.style.display='none';document.documentElement.style.visibility='visible'}
function accountPill(user){
  var old=document.getElementById('nc-account');if(old)old.remove();
  var d=document.createElement('div');d.className='nc-account';d.id='nc-account';
  d.innerHTML='👤 '+String(user.email||'Cuenta')+' <button type="button" id="nc-change">Cambiar</button>';
  document.body.appendChild(d);
  document.getElementById('nc-change').onclick=function(){show();var e=document.getElementById('nc-email');if(e)e.value=user.email||'';var p=document.getElementById('nc-pass');if(p)p.value='';};
}
function boot(){
  style();
  if(document.body)overlay();else document.addEventListener('DOMContentLoaded',overlay,{once:true});
  try{
    if(!firebase.apps.length)firebase.initializeApp(cfg);
    auth=firebase.auth();db=firebase.firestore();ref=db.collection('sharedAgenda').doc('estado');
    auth.onAuthStateChanged(async function(user){
      currentUser=user||null;
      if(!user||user.isAnonymous){ready=false;show();return;}
      try{
        var snap=await ref.get();
        var cloud=snap.exists&&snap.data().data?snap.data().data:null;
        var localText=localStorage.getItem(KEY);
        if(cloud){
          var cloudText=JSON.stringify(cloud);
          if(!same(cloud,localText)){
            internal=true;originalSet.call(localStorage,KEY,cloudText);internal=false;
            ready=true;accountPill(user);
            if(!recargar())hide();
            return;
          }
        }else if(localText){
          await ref.set({data:JSON.parse(localText),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
        }
        ready=true;accountPill(user);hide();
        ref.onSnapshot(function(s){
          if(!ready||!s.exists||!s.data().data)return;
          var incoming=JSON.stringify(s.data().data),local=localStorage.getItem(KEY);
          if(!same(incoming,local)){
            internal=true;originalSet.call(localStorage,KEY,incoming);internal=false;recargar();
          }
        });
      }catch(e){ready=false;show();}
    });
  }catch(e){show();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();