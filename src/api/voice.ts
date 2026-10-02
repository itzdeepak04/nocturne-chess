export type VoiceSignal = {
 kind:'ready'|'description'|'candidate';
 session:string;
 target?:string;
 description?:RTCSessionDescriptionInit;
 candidate?:RTCIceCandidateInit;
};
type VoiceOptions={
 initiator:boolean; iceServers:RTCIceServer[]; audio:HTMLAudioElement;
 send:(signal:VoiceSignal)=>Promise<void>;
 status:(status:string)=>void;
 error:(message:string)=>void;
};
// White offers, Black answers. A sendrecv audio channel is negotiated without
// capturing a microphone; replacing its track later needs no call/accept flow.
export class GameVoice {
 private pc:RTCPeerConnection|null=null;
 private stream:MediaStream|null=null;
 private remoteSession:string|null=null;
 private readonly session=crypto.randomUUID();
 private candidates:RTCIceCandidateInit[]=[];
 private disposed=false;
 private speaker=false;
 private outbound=Promise.resolve();
 private inbound=Promise.resolve();
 private offerPending=false;
 constructor(private options:VoiceOptions){options.audio.muted=true;}
 private send(value:Omit<VoiceSignal,'session'>){
  this.outbound=this.outbound.then(()=>this.disposed?undefined:this.options.send({...value,session:this.session})).catch(()=>{if(!this.disposed)this.options.error('Voice signalling failed. Check your connection and retry.');});
  return this.outbound;
 }
 async ready(){await this.send({kind:'ready'});}
 private rebuild(){
  this.pc?.close();this.candidates=[];
  const pc=new RTCPeerConnection({iceServers:this.options.iceServers});
  this.pc=pc;this.offerPending=false;
  pc.onicecandidate=event=>{if(event.candidate)void this.send({kind:'candidate',target:this.remoteSession||undefined,candidate:event.candidate.toJSON()});};
  pc.ontrack=event=>{
   const stream=event.streams[0]||new MediaStream([event.track]);
   this.options.audio.srcObject=stream;
   if(this.speaker)this.play();
  };
  pc.onconnectionstatechange=()=>{
   if(this.disposed||pc!==this.pc)return;
   this.options.status(pc.connectionState);
   if(pc.connectionState==='failed')this.options.error('Voice could not connect on this network. A TURN relay may be needed; messages still work.');
  };
  return pc;
 }
 private play(){void this.options.audio.play().catch(()=>{if(this.speaker&&!this.disposed)this.options.error('Tap the speaker off and on to allow audio playback.');});}
 receive(signal:VoiceSignal){
  this.inbound=this.inbound.then(()=>this.handle(signal));
  this.inbound=this.inbound.catch(()=>{if(!this.disposed)this.options.error('Voice negotiation failed. Use Retry voice to reconnect.');});
  return this.inbound;
 }
 private async handle(signal:VoiceSignal){
  if(this.disposed||signal.session===this.session||(signal.target&&signal.target!==this.session))return;
  if(signal.kind==='ready'){
   if(this.remoteSession!==signal.session){
    this.remoteSession=signal.session;this.rebuild();await this.ready();
   }
   if(this.options.initiator&&this.pc?.signalingState==='stable'&&!this.pc.localDescription&&!this.offerPending){
    this.offerPending=true;
    const pc=this.pc;
    const transceiver=pc.addTransceiver('audio',{direction:'sendrecv'});
    await transceiver.sender.replaceTrack(this.stream?.getAudioTracks()[0]||null);
    await pc.setLocalDescription(await pc.createOffer());
    await this.send({kind:'description',target:signal.session,description:pc.localDescription!.toJSON()});
   }
   return;
  }
  if(signal.session!==this.remoteSession||!this.pc)return;
  const pc=this.pc;
  if(signal.kind==='description'&&signal.description){
   if(signal.description.type==='offer'&&this.options.initiator)return;
   if(signal.description.type==='answer'&&pc.signalingState!=='have-local-offer')return;
   await pc.setRemoteDescription(signal.description);
   for(const candidate of this.candidates)await pc.addIceCandidate(candidate);
   this.candidates=[];
   if(signal.description.type==='offer'){
    const transceiver=pc.getTransceivers()[0];
    transceiver.direction='sendrecv';
    await transceiver.sender.replaceTrack(this.stream?.getAudioTracks()[0]||null);
    await pc.setLocalDescription(await pc.createAnswer());
    await this.send({kind:'description',target:signal.session,description:pc.localDescription!.toJSON()});
   }
  }else if(signal.kind==='candidate'&&signal.candidate){
   if(pc.remoteDescription)await pc.addIceCandidate(signal.candidate);else this.candidates.push(signal.candidate);
  }
 }
 async setMicrophone(enabled:boolean){
  if(!enabled){
   this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
   await this.pc?.getTransceivers()[0]?.sender.replaceTrack(null);return;
  }
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access requires HTTPS or localhost.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(this.disposed){stream.getTracks().forEach(track=>track.stop());return;}
  this.stream?.getTracks().forEach(track=>track.stop());this.stream=stream;
  try{await this.pc?.getTransceivers()[0]?.sender.replaceTrack(stream.getAudioTracks()[0]);}
  catch(error){stream.getTracks().forEach(track=>track.stop());this.stream=null;throw error;}
 }
 setSpeaker(enabled:boolean){this.speaker=enabled;this.options.audio.muted=!enabled;if(enabled&&this.options.audio.srcObject)this.play();}
 close(){this.disposed=true;this.pc?.close();this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;this.options.audio.pause();this.options.audio.srcObject=null;this.options.audio.muted=true;}
}
