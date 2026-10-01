import {io,Socket} from 'socket.io-client';
let socket:Socket|null=null;export function connectRealtime(token:string){socket?.disconnect();socket=io(`${import.meta.env.VITE_SOCKET_URL??'http://localhost:3000'}/game`,{auth:{token},transports:['websocket','polling']});return socket;}export function disconnectRealtime(){socket?.disconnect();socket=null;}export function getRealtime(){return socket;}
