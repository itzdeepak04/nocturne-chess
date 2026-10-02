import {useEffect,useState} from 'react';
import {Home as HomeIcon, Globe2, LogOut, Crown} from 'lucide-react';
import Practice from './page';
import Online from './online';
import Auth from './auth';
import {connectRealtime,disconnectRealtime} from './api/realtime';
import {api,Session} from './api/client';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './online.css';

export default function App(){
 const [confirmation,setConfirmation]=useState<'logout'|'practice'|null>(null);
 const [pending,setPending]=useState(false),[actionError,setActionError]=useState('');
 const [route,setRoute]=useState(location.hash==='#online'?'online':'practice');
 const [session,setSession]=useState<Session|null>(()=>{
  try{const value=JSON.parse(localStorage.getItem('nocturne_session')||'null');if(value&&JSON.parse(atob(value.accessToken.split('.')[1])).exp*1000>Date.now())return value;}catch{}
  localStorage.removeItem('nocturne_session');localStorage.removeItem('nocturne_token');return null;
 });
 useEffect(()=>{
  const onHash=()=>{
   const next=location.hash==='#online'?'online':'practice';
   if(route==='online'&&next==='practice'&&session&&localStorage.getItem(`match:${session.user.id}`)){
    history.replaceState(null,'','#online');setActionError('');setConfirmation('practice');return;
   }
   setRoute(next);
  };
  window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);
 },[route,session]);
 useEffect(()=>{if(!session||route!=='online')return;connectRealtime(session.accessToken);return disconnectRealtime;},[session,route]);
 function logout(){disconnectRealtime();localStorage.removeItem('nocturne_session');localStorage.removeItem('nocturne_token');setSession(null);location.hash='';}
 function requestPractice(e:React.MouseEvent<HTMLAnchorElement>){if(session&&route==='online'&&localStorage.getItem(`match:${session.user.id}`)){e.preventDefault();setActionError('');setConfirmation('practice');}}
 async function confirmAction(){
  setPending(true);setActionError('');
  try{
   const id=session&&localStorage.getItem(`match:${session.user.id}`);
   if(id){await api(`/matches/${id}/quit`,{method:'POST'});localStorage.removeItem(`match:${session!.user.id}`);}
   if(confirmation==='logout')logout();else location.hash='';
   setConfirmation(null);
  }catch(e){setActionError(e instanceof Error?e.message:'Unable to end the match. Please try again.');}
  finally{setPending(false);}
 }
 const hasMatch=!!session&&!!localStorage.getItem(`match:${session.user.id}`);
 return <><nav className="club-nav" aria-label="Play mode"><a href="#" onClick={requestPractice} className="club-mark"><Crown size={21}/><span>NOCTURNE</span></a><div className="club-tabs"><a href="#" onClick={requestPractice} aria-current={route==='practice'?'page':undefined}><HomeIcon size={17}/><span>Practice</span></a><a href="#online" aria-current={route==='online'?'page':undefined}><Globe2 size={17}/><span>Online lobby</span></a></div>{session&&<button className="club-icon" title="Sign out" aria-label="Sign out" onClick={()=>{setActionError('');setConfirmation('logout');}}><LogOut size={18}/></button>}</nav>{route==='practice'?<Practice/>:session?<Online/>:<Auth onAuthenticated={value=>{localStorage.setItem('nocturne_token',value.accessToken);localStorage.setItem('nocturne_session',JSON.stringify(value));setSession(value);}}/>}<Dialog open={!!confirmation} onOpenChange={open=>{if(!open&&!pending)setConfirmation(null);}}><DialogContent><DialogTitle>{confirmation==='logout'?'Sign out?':'Quit this match?'}</DialogTitle><DialogDescription>{hasMatch?'Leaving an active match awards the win to your opponent. An empty waiting room will be cancelled.':"You can sign in again whenever you’re ready to play online."}</DialogDescription>{actionError&&<p role="alert">{actionError}</p>}<div className="dialog-actions"><button className="secondary" disabled={pending} onClick={()=>setConfirmation(null)}>Cancel</button><button className="primary" disabled={pending} onClick={()=>void confirmAction()}>{pending?'Please wait…':confirmation==='logout'?'Confirm sign out':'Quit match'}</button></div></DialogContent></Dialog></>;
}
