// LYRA Push Worker v2: incoming calls + new messages. No HTML caching.
self.addEventListener('install',event => self.skipWaiting());
self.addEventListener('activate',event => event.waitUntil(self.clients.claim()));
self.addEventListener('push',event => {
 let payload={};try{payload=event.data?.json()||{}}catch(e){payload={}}
 if(payload.type==='new_message'&&payload.peer_id){
  const peer=String(payload.peer_id);
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(peer))return;
  const url='./?message_peer='+encodeURIComponent(peer);
  event.waitUntil(self.registration.showNotification('LYRA 新着メッセージ',{
   body:'友だちからメッセージが届きました。',icon:'./icon-192.png',badge:'./icon-192.png',
   tag:'lyra-msg-'+peer,renotify:true,data:{url},timestamp:Date.now()
  }));
  return;
 }
 if(payload.type!=='incoming_call'||!payload.call_id)return;
 const kind=payload.kind==='video'?'ビデオ':'音声';
 const title='LYRA '+kind+'通話の着信';
 const options={body:'友だちから着信があります。タップしてLYRAで応答してください。',icon:'./icon-192.png',badge:'./icon-192.png',tag:'lyra-call-'+payload.call_id,renotify:true,data:{call_id:payload.call_id,url:'./?incoming_call='+encodeURIComponent(payload.call_id)},timestamp:Date.now()};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
 event.waitUntil((async()=>{const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of cs){if(new URL(c.url).origin===new URL(target).origin){await c.navigate(target);return c.focus()}}return self.clients.openWindow(target)})());
});
