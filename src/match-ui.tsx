import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Chess } from 'chess.js';
import { Check, X } from 'lucide-react';

export function MoveHistory({moves}:{moves:string[]}) {
  const end=useRef<HTMLDivElement>(null);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[moves.length]);
  return <section className="score-sheet" aria-label="Move history"><div className="score-heading"><h3>Move history</h3><span>{moves.length} plies</span></div><div className="score-columns"><span>#</span><span>White</span><span>Black</span></div><div className="score-scroll">{moves.length?Array.from({length:Math.ceil(moves.length/2)},(_,i)=><div className="score-row" key={i}><span>{i+1}.</span><span className={i*2===moves.length-1?'latest':''}>{moves[i*2]}</span><span className={i*2+1===moves.length-1?'latest':''}>{moves[i*2+1]||'—'}</span></div>):<p className="score-empty">Your story starts with the first move.</p>}<div ref={end}/></div></section>;
}

export function Toast({message,onClose}:{message:string;onClose:()=>void}) {
  useEffect(()=>{if(!message)return;const timer=setTimeout(onClose,5000);return()=>clearTimeout(timer);},[message,onClose]);
  return message?createPortal(<div className="club-toast" role="status"><Check size={18}/><span>{message}</span><button aria-label="Dismiss message" onClick={onClose}><X size={16}/></button></div>,document.fullscreenElement||document.body):null;
}

export function resultReason(game:Chess) {
  return game.isCheckmate()?'Checkmate':game.isStalemate()?'Stalemate':game.isThreefoldRepetition()?'Threefold repetition':game.isInsufficientMaterial()?'Insufficient material':game.isDrawByFiftyMoves()?'Fifty-move rule':'Draw';
}
