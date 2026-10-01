import { chooseMove } from './engine.mjs';
self.onmessage=(event:MessageEvent)=>{try{self.postMessage({move:chooseMove(event.data.fen,event.data.difficulty)});}catch{self.postMessage({error:'Computer could not calculate a move.'});}};
