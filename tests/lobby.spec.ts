import {test,expect} from '@playwright/test';
import {Chess} from 'chess.js';

test('practice opens without login and both board views are available',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('board-mode','2d'));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Your next move.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'e2 White pawn',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'e2 White pawn',exact:true}).click();
 await page.getByRole('button',{name:'e4 empty, legal move',exact:true}).click();
 await expect(page.getByRole('button',{name:'e4 White pawn',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'3D',exact:true}).click();
 await expect(page.locator('canvas[aria-label="Interactive 3D chess board"]')).toBeVisible();
 await page.getByRole('link',{name:'Online lobby'}).click();
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 await page.getByRole('link',{name:'Practice',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your next move.'})).toBeVisible();
});

async function mockLobby(page:any,moves:string[]=[],status='active'){
 const chess=new Chess();moves.forEach(m=>chess.move(m));
 const match={id:'match1',code:'ABC123',white:'me',black:'other',fen:chess.fen(),moves,status,result:status==='finished'?'0-1':null};
 const token='test.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64')+'.test';
 await page.addInitScript(({token,moves}:{token:string;moves:string[]})=>{
  const session={accessToken:token,user:{id:'me',name:'Deepak',email:'player@example.test',publicId:'NC-A1B2C3'}};
  localStorage.setItem('nocturne_session',JSON.stringify(session));
  localStorage.setItem('nocturne_token',token);localStorage.setItem('board-mode','2d');
  if(moves.length)localStorage.setItem('match:me','match1');
 },{token,moves});
 await page.route((url:URL)=>url.pathname.startsWith('/api/'),async(route:any)=>{
  const path=new URL(route.request().url()).pathname;
  const data=path.endsWith('/friends/requests')?[]:path.endsWith('/friends')?[{id:'other',name:'Aarav',publicId:'NC-112233'}]:path.includes('/users/')?{id:'other',name:'Aarav',publicId:'NC-112233'}:match;
  await route.fulfill({json:{code:200,message:'OK',data}});
 });
 await page.route('**/socket.io/**',route=>route.abort());
 await page.goto('/#online');
}
test('lobby and friends dialog fit a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mockLobby(page);
 await expect(page.getByRole('heading',{name:'A worthy opponent awaits.'})).toBeVisible();
 await page.getByRole('button',{name:'Friends',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Friend user ID'})).toBeVisible();
 await expect(page.getByText('Aarav',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/lobby-phone.png',fullPage:true});
});
test('online promotion uses a dialog and fullscreen fills phone viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mockLobby(page,['a4','h5','a5','h4','a6','h3','axb7','hxg2']);
 await page.getByRole('button',{name:'b7 White pawn',exact:true}).click();
 await page.getByRole('button',{name:'a8 Black rook, legal move',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('button',{name:'Queen'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Knight'})).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
 const bounds=await page.locator('.match-stage').boundingBox();
 expect(bounds?.height).toBeGreaterThan(830);
 await expect(page.getByRole('heading',{name:'Move history'})).toBeVisible();
 await page.screenshot({path:'test-results/match-phone.png'});
 await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
 await page.setViewportSize({width:844,height:390});
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
 expect((await page.locator('.board-2d').boundingBox())!.height).toBeGreaterThan(200);
 await page.screenshot({path:'test-results/match-landscape.png'});
});
test('finished game announces winner and checkmate',async({page})=>{
 await mockLobby(page,['f3','e5','g4','Qh4#'],'finished');
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('heading',{name:'Black wins!'})).toBeVisible();
 await expect(dialog.getByText(/Checkmate/)).toBeVisible();
 await dialog.getByRole('button',{name:'Back to lobby'}).click();
 await expect(page.getByRole('button',{name:'Create match',exact:true})).toBeVisible();
});
test('join confirmation can be cancelled and successful joins show a toast',async({page})=>{
 await mockLobby(page);
 let joins=0;page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/matches/join'))joins++;});
 await page.getByLabel('Match code',{exact:true}).fill('ABC123');
 await page.getByRole('button',{name:'Join match',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Join this match?'})).toBeVisible();
 expect(joins).toBe(0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(joins).toBe(0);
 await page.getByRole('button',{name:'Join match',exact:true}).click();
 await page.getByRole('button',{name:'Confirm join',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('You joined the match');
 expect(joins).toBe(1);
});
test('quitting and signing out require confirmation',async({page})=>{
 await mockLobby(page,['e4']);
 let quits=0;page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/quit'))quits++;});
 await page.getByRole('button',{name:'Back to lobby',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Your opponent will win by resignation');
 await page.getByRole('button',{name:'Keep playing',exact:true}).click();
 expect(quits).toBe(0);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign out?'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await page.evaluate(()=>!!localStorage.getItem('nocturne_session'))).toBe(true);
 await page.getByRole('button',{name:'Back to lobby',exact:true}).click();
 await page.getByRole('button',{name:'Quit match',exact:true}).click();
 await expect(page.getByRole('button',{name:'Create match',exact:true})).toBeVisible();
 expect(quits).toBe(1);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await page.getByRole('button',{name:'Confirm sign out',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your next move.'})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('nocturne_session'))).toBe(null);
});
test('confirmed logout ends an active match before clearing the session',async({page})=>{
 await mockLobby(page,['e4']);
 await expect(page.getByRole('button',{name:'Back to lobby',exact:true})).toBeVisible();
 let quits=0;
 await page.route('**/matches/match1/quit',async route=>{
  quits++;
  await route.fulfill({status:503,json:{message:'Unable to save result. Try again.'}});
 });
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await page.getByRole('button',{name:'Confirm sign out',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Unable to save result');
 expect(await page.evaluate(()=>!!localStorage.getItem('nocturne_session'))).toBe(true);
 await page.route('**/matches/match1/quit',route=>route.fulfill({json:{code:200,message:'Match ended',data:{status:'finished',result:'0-1'}}}));
 await page.getByRole('button',{name:'Confirm sign out',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your next move.'})).toBeVisible();
 expect(quits).toBe(1);
 expect(await page.evaluate(()=>localStorage.getItem('nocturne_session'))).toBe(null);
});
test('practice navigation warns before leaving an active match',async({page})=>{
 await mockLobby(page,['e4']);
 await expect(page.getByRole('button',{name:'Back to lobby',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Practice',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Quit this match?'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.getByRole('button',{name:'Back to lobby',exact:true})).toBeVisible();
});


