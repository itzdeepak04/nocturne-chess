import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';
test('two players chat and use independent microphone and speaker controls',async({browser})=>{
 const records:any[]=[];
 const match={id:'match1',white:'white',black:'black',status:'active',code:'ABC123',fen:new Chess().fen(),moves:[],result:null};
 const contexts=await Promise.all(['white','black'].map(async user=>{
  const context=await browser.newContext({permissions:['microphone']});
  await context.addInitScript(({user})=>{
   const token='test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.test';
   localStorage.setItem('nocturne_session',JSON.stringify({accessToken:token,user:{id:user,name:user,publicId:'NC-ABC123',email:'test@example.test'}}));
   localStorage.setItem('nocturne_token',token);localStorage.setItem('match:'+user,'match1');localStorage.setItem('board-mode','2d');
   (window as any).micRequests=0;
   const NativePeer=RTCPeerConnection;(window as any).peers=[];
   window.RTCPeerConnection=class extends NativePeer {constructor(config?:RTCConfiguration){super(config);(window as any).peers.push(this);}};
   const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async(constraints)=>{
    (window as any).micRequests++;
    const permissionStream=await capture(constraints);permissionStream.getTracks().forEach(track=>track.stop());
    const context=new AudioContext(),oscillator=context.createOscillator(),destination=context.createMediaStreamDestination();
    oscillator.connect(destination);oscillator.start();await context.resume();
    (window as any).toneContext=context;
    return destination.stream;
   };
  },{user});
  await context.route(url=>url.pathname.startsWith('/api/'),async route=>{
   const path=new URL(route.request().url()).pathname,post=route.request().method()==='POST';
   let data:any=match;
   if(path.includes('/communication/')){
    const kind=path.split('/').at(-1);
    if(kind==='config')data={iceServers:[],relayAvailable:false};
    else if(post){
     const body=route.request().postDataJSON();
     data={id:String(records.length+1),sender:user,clientId:body.clientId,content:body.text||body.payload,createdAt:new Date().toISOString(),kind};
     records.push(data);
    }else data=records.filter(row=>row.kind===kind&&(kind==='messages'||row.sender!==user));
   }else if(path.endsWith('/friends')||path.endsWith('/friends/requests'))data=[];
   else if(path.includes('/users/'))data={id:user==='white'?'black':'white',name:'Opponent',publicId:'NC-123ABC'};
   await route.fulfill({json:{code:200,message:'OK',data}});
  });
  await context.route('**/socket.io/**',route=>route.abort());
  return context;
 }));
 const [white,black]=await Promise.all(contexts.map(async context=>{const page=await context.newPage();await page.goto('/#online');return page;}));
 try{
  await expect(white.getByText('Voice ready',{exact:true})).toBeVisible({timeout:30000});
  await expect(black.getByText('Voice ready',{exact:true})).toBeVisible({timeout:30000});
  expect(await white.evaluate(()=>(window as any).micRequests)).toBe(0);
  expect(await black.evaluate(()=>(window as any).micRequests)).toBe(0);
  await white.getByRole('button',{name:'Open messages'}).click();
  await white.getByRole('textbox',{name:'Message to opponent'}).fill('Good luck!');
  await white.getByRole('button',{name:'Send message'}).click();
  await black.getByRole('button',{name:'Open messages'}).click();
  await expect(black.getByText('Good luck!',{exact:true})).toBeVisible();
  await black.getByRole('button',{name:'Turn speaker on'}).click();
  expect(await black.evaluate(()=>(window as any).micRequests)).toBe(0);
  await white.getByRole('button',{name:'Turn microphone on'}).click();
  await expect(white.getByRole('button',{name:'Turn microphone off'})).toBeVisible();
  await expect(black.getByRole('dialog')).toHaveCount(0);
  await expect.poll(()=>black.evaluate(()=>{const audio=document.querySelector('audio')!;return !audio.muted&&(audio.srcObject as MediaStream)?.getAudioTracks()[0]?.readyState==='live';})).toBe(true);
  // A deterministic synthetic microphone tone must actually reach Black.
  await black.evaluate(()=>{
   const context=new AudioContext(),source=context.createMediaStreamSource(document.querySelector('audio')!.srcObject as MediaStream),analyser=context.createAnalyser();
   const gain=context.createGain();gain.gain.value=0;source.connect(analyser);analyser.connect(gain);gain.connect(context.destination);void context.resume();(window as any).audioTest={context,analyser};
  });
  await expect.poll(()=>black.evaluate(()=>{const {analyser}=(window as any).audioTest;const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);return data.some(value=>Math.abs(value-128)>2);})).toBe(true);
  await white.getByRole('button',{name:'Turn speaker on'}).click();
  await black.getByRole('button',{name:'Turn microphone on'}).click();
  await white.evaluate(()=>{
   const context=new AudioContext(),source=context.createMediaStreamSource(document.querySelector('audio')!.srcObject as MediaStream),analyser=context.createAnalyser();
   const gain=context.createGain();gain.gain.value=0;source.connect(analyser);analyser.connect(gain);gain.connect(context.destination);void context.resume();(window as any).audioTest={context,analyser};
  });
  await expect.poll(()=>white.evaluate(()=>{const {analyser}=(window as any).audioTest;const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);return data.some(value=>Math.abs(value-128)>2);})).toBe(true);
  await black.getByRole('button',{name:'Turn microphone off'}).click();
  await black.getByRole('button',{name:'Turn speaker off'}).click();
  expect(await black.evaluate(()=>document.querySelector('audio')!.muted)).toBe(true);
  await white.getByRole('button',{name:'Turn microphone off'}).click();
  await expect(white.getByRole('button',{name:'Turn microphone on'})).toBeVisible();
 }finally{await Promise.all(contexts.map(context=>context.close()));}
});
