import {useEffect,useRef,useState} from 'react';
import {api} from './api/client';
import {GameVoice,VoiceSignal} from './api/voice';
export type ChatMessage={id:string;sender:string;content:string;clientId:string;createdAt:string};
export function useCommunication(matchId:string|undefined,active:boolean,initiator:boolean,notify:(text:string)=>void){
 const [messages,setMessages]=useState<ChatMessage[]>([]),[mic,setMic]=useState(false),[speaker,setSpeaker]=useState(false),[voiceStatus,setVoiceStatus]=useState('off'),[voiceBusy,setVoiceBusy]=useState(false),[revision,setRevision]=useState(0),[sending,setSending]=useState(false);
 const audio=useRef<HTMLAudioElement>(null),peer=useRef<GameVoice|null>(null),notification=useRef(notify),draftId=useRef<{text:string;id:string}|null>(null);
 notification.current=notify;
 useEffect(()=>{
  setMessages([]);draftId.current=null;if(!matchId)return;
  let live=true,timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{const rows=await api<ChatMessage[]>(`/matches/${matchId}/communication/messages`);if(live&&Array.isArray(rows))setMessages(rows);}catch{/* Failed reads retry without repeated toasts. */}finally{if(live&&active)timer=setTimeout(poll,1500);}};
  void poll();return()=>{live=false;clearTimeout(timer);};
 },[matchId,active]);
 useEffect(()=>{
  setMic(false);setSpeaker(false);setVoiceStatus('off');
  if(!matchId||!active||!audio.current)return;
  let live=true,timer:ReturnType<typeof setTimeout>,readyTimer:ReturnType<typeof setInterval>;const seen=new Set<string>();
  const start=async()=>{
   try{
    const config=await api<{iceServers:RTCIceServer[]}>(`/matches/${matchId}/communication/config`);
    if(!live)return;
    const voice=new GameVoice({initiator,iceServers:config.iceServers,audio:audio.current!,status:value=>{if(live)setVoiceStatus(value);},error:message=>{if(live)notification.current(message);},send:signal=>api(`/matches/${matchId}/communication/signals`,{method:'POST',body:JSON.stringify({payload:JSON.stringify(signal),clientId:crypto.randomUUID()})}).then(()=>{})});
    peer.current=voice;setVoiceStatus('connecting');
    await voice.ready();
    if(!live)return;
    readyTimer=setInterval(()=>void voice.ready(),10000);
    const poll=async()=>{
     try{const rows=await api<ChatMessage[]>(`/matches/${matchId}/communication/signals`);
      if(live&&Array.isArray(rows))for(const row of rows){if(seen.has(row.id))continue;seen.add(row.id);await voice.receive(JSON.parse(row.content) as VoiceSignal);}
      if(seen.size>1000){const keep=Array.from(seen).slice(-500);seen.clear();keep.forEach(id=>seen.add(id));}
     }catch{if(live)setVoiceStatus('reconnecting');}finally{if(live)timer=setTimeout(poll,1000);}
    };void poll();
   }catch{if(live){setVoiceStatus('unavailable');notification.current('Voice could not start. Check the API connection and use Retry voice.');}}
  };void start();
  return()=>{live=false;clearTimeout(timer);clearInterval(readyTimer);peer.current?.close();peer.current=null;};
 },[matchId,active,initiator,revision]);
 async function toggleMic(){if(!peer.current||voiceBusy)return;setVoiceBusy(true);try{await peer.current.setMicrophone(!mic);setMic(!mic);}catch(e){notification.current(e instanceof Error?e.message:'Microphone permission was denied.');}finally{setVoiceBusy(false);}}
 function toggleSpeaker(){if(!peer.current)return;peer.current.setSpeaker(!speaker);setSpeaker(!speaker);}
 async function sendMessage(text:string){
  if(!matchId||!active||sending)return false;
  setSending(true);try{
   if(draftId.current?.text!==text)draftId.current={text,id:crypto.randomUUID()};
   const row=await api<ChatMessage>(`/matches/${matchId}/communication/messages`,{method:'POST',body:JSON.stringify({text,clientId:draftId.current.id})});
   setMessages(old=>old.some(m=>m.id===row.id)?old:[...old,row]);draftId.current=null;return true;
  }catch(e){notification.current(e instanceof Error?e.message:'Message was not sent. Try again.');return false;}finally{setSending(false);}
 }
 return {audio,messages,mic,speaker,voiceStatus,voiceBusy,sending,toggleMic,toggleSpeaker,sendMessage,retryVoice:()=>setRevision(value=>value+1)};
}
