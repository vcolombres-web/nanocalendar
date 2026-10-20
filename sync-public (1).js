(function(){
'use strict';

/*
  Pasa las reservas del formulario público (publicReservations) a tu agenda
  (sharedAgenda/estado, el documento que auth.js mantiene sincronizado).
  - Solo corre con usuarios con sesión (no anónimos).
  - Cada reserva se importa una sola vez y queda marcada con importada:true.
  - Si llega una reserva nueva con la agenda abierta, se importa sola.
*/

function esperarFirebase(cb,n){
  n=n||0;
  if(window.firebase&&firebase.apps&&firebase.apps.length)return cb();
  if(n>150)return;
  setTimeout(function(){esperarFirebase(cb,n+1)},100);
}

function run(){
  var auth=firebase.auth(),db=firebase.firestore();
  var unsub=null,busy=false,again=false,lastDocs=[],lastUser=null,reintentos=0;

  function valida(r){
    return r&&!r.importada&&r.date&&r.time&&r.name&&r.status!=='cancelada'&&r.status!=='cancelado';
  }

  async function procesar(){
    if(busy){again=true;return}
    busy=true;
    try{
      do{
        again=false;
        if(!lastUser||lastUser.isAnonymous)break;
        var pend=lastDocs.filter(function(d){return valida(d.data())});
        if(!pend.length)break;

        var ref=db.collection('sharedAgenda').doc('estado');
        var ok=await db.runTransaction(async function(tx){
          var snap=await tx.get(ref);
          // Si la agenda todavía no se subió a la nube, se reintenta más tarde.
          if(!snap.exists||!snap.data().data)return false;
          var d=snap.data().data;
          d.servicios=Array.isArray(d.servicios)?d.servicios:[];
          d.clientes=Array.isArray(d.clientes)?d.clientes:[];
          d.turnos=Array.isArray(d.turnos)?d.turnos:[];
          var sv=d.servicios.find(function(x){return x.id==='sv3'})||d.servicios[0];
          if(!sv){sv={id:'sv3',nombre:'Grupal',min:60,c:2};d.servicios.push(sv)}
          var added=0;
          pend.forEach(function(doc){
            var r=doc.data();
            if(d.turnos.some(function(t){return t.reservaPublicaId===doc.id}))return;
            var cid='pub-'+doc.id;
            if(!d.clientes.some(function(c){return c.id===cid})){
              d.clientes.push({id:cid,nombre:r.name,tel:r.phone||'',pack:0,packDesde:r.date,notas:'Reserva realizada desde NanoCalendar público.',alta:r.date});
            }
            d.turnos.push({id:'pubturn-'+doc.id,clienteId:cid,servicioId:sv.id,fecha:r.date,hora:r.time,min:sv.min||60,lugar:'Gimnasio',estado:'confirmado',notas:'Reserva pública',serie:'',reservaPublicaId:doc.id});
            added++;
          });
          if(added)tx.set(ref,{data:d,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
          return true;
        });

        if(!ok){
          if(reintentos<6){reintentos++;setTimeout(procesar,5000)}
          break;
        }
        reintentos=0;
        await Promise.all(pend.map(function(d){
          return d.ref.update({importada:true,importadaAt:firebase.firestore.FieldValue.serverTimestamp()});
        }));
      }while(again);
    }catch(e){console.error('sync public reservations',e)}
    busy=false;
  }

  auth.onAuthStateChanged(function(user){
    if(unsub){unsub();unsub=null}
    lastUser=user;lastDocs=[];reintentos=0;
    if(!user||user.isAnonymous)return;
    unsub=db.collection('publicReservations').onSnapshot(function(snap){
      lastDocs=snap.docs;procesar();
    },function(e){console.error('publicReservations',e)});
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){esperarFirebase(run)},{once:true});
else esperarFirebase(run);
})();
