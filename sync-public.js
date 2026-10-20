(function(){
'use strict';
function run(){
  try{
    if(!window.firebase||!firebase.apps.length)return;
    var auth=firebase.auth(),db=firebase.firestore();
    auth.onAuthStateChanged(async function(user){
      if(!user||user.isAnonymous)return;
      try{
        var sharedRef=db.collection('sharedAgenda').doc('estado');
        var shared=await sharedRef.get();
        var cloud=shared.exists&&shared.data().data?shared.data().data:{};
        cloud.turnos=Array.isArray(cloud.turnos)?cloud.turnos.slice():[];
        cloud.clientes=Array.isArray(cloud.clientes)?cloud.clientes.slice():[];
        cloud.servicios=Array.isArray(cloud.servicios)?cloud.servicios.slice():[];

        var rs=await db.collection('publicReservations').get();
        if(rs.empty)return;

        var service=cloud.servicios[0];
        if(!service)return;

        var changed=false;
        rs.forEach(function(doc){
          var r=doc.data()||{};
          if(!r.date||!r.time||!r.name)return;
          var rid=doc.id;
          var cid='pub-'+rid;
          if(!cloud.clientes.some(function(c){return c&&c.id===cid})){ 
            cloud.clientes.push({
              id:cid,
              nombre:String(r.name),
              tel:String(r.phone||''),
              pack:0,
              packDesde:String(r.date),
              notas:'Reserva realizada desde NanoCalendar público.',
              alta:String(r.date),
              reservaPublicaId:rid
            });
            changed=true;
          }
          if(!cloud.turnos.some(function(t){return t&&t.reservaPublicaId===rid})){ 
            cloud.turnos.push({
              id:'pubturn-'+rid,
              clienteId:cid,
              servicioId:service.id,
              fecha:String(r.date),
              hora:String(r.time),
              min:Number(service.min)||60,
              lugar:'Gimnasio',
              estado:'confirmado',
              notas:'Reserva pública',
              serie:'',
              reservaPublicaId:rid
            });
            changed=true;
          }
        });

        if(changed){
          await sharedRef.set({
            data:cloud,
            updatedAt:firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }catch(e){console.error('sync public reservations',e)}
    });
  }catch(e){console.error('sync-public boot',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
