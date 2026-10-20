(function(){
'use strict';
function run(){
  try{
    if(!window.firebase||!firebase.apps.length)return;
    var auth=firebase.auth(),db=firebase.firestore();
    auth.onAuthStateChanged(async function(user){
      if(!user)return;
      try{
        var shared=await db.collection('sharedAgenda').doc('estado').get();
        if(!shared.exists)return;
        var cloud=shared.data().data||{};
        var publicTurns=Array.isArray(cloud.turnos)?cloud.turnos.filter(function(t){return t&&t.reservaPublicaId}):[];
        var publicClients=Array.isArray(cloud.clientes)?cloud.clientes.filter(function(c){return c&&String(c.id||'').indexOf('pub-')===0}):[];
        if(!publicTurns.length)return;

        var col=db.collection('data/users/'+user.uid);
        var snap=await col.get(),state=null,months={};
        snap.docs.forEach(function(doc){
          var x=doc.data();
          if(doc.id==='estado')state=x;
          else if(doc.id.indexOf('t-')===0)months[doc.id.slice(2)]=Array.isArray(x.t)?x.t.slice():[];
        });
        if(!state)state={v:2,demo:false,servicios:[],clientes:[],pagos:[],packs:[],aj:{ini:7,fin:21,tema:'auto'}};
        state.clientes=Array.isArray(state.clientes)?state.clientes:[];
        state.servicios=Array.isArray(state.servicios)?state.servicios:[];
        state.pagos=Array.isArray(state.pagos)?state.pagos:[];
        state.packs=Array.isArray(state.packs)?state.packs:[];
        state.aj=Object.assign({ini:7,fin:21,tema:'auto'},state.aj||{});

        var stateChanged=false;
        publicClients.forEach(function(c){
          if(!state.clientes.some(function(x){return x.id===c.id})){state.clientes.push(c);stateChanged=true}
        });
        if(stateChanged)await col.doc('estado').set(state);

        var changed={};
        publicTurns.forEach(function(t){
          var month=String(t.fecha||'').slice(0,7);if(!month)return;
          months[month]=Array.isArray(months[month])?months[month]:[];
          if(!months[month].some(function(x){return x.reservaPublicaId===t.reservaPublicaId})){months[month].push(t);changed[month]=true}
        });
        await Promise.all(Object.keys(changed).map(function(month){return col.doc('t-'+month).set({t:months[month]})}));
      }catch(e){console.error('sync public reservations',e)}
    });
  }catch(e){console.error('sync-public boot',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
