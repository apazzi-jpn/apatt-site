/* ---- ちょっとだけ あそぶ(APATT通信 No.1・261028)----
   アイポス: すくう → ながおしで かさねて ポス → フィーバー(じどう)で ポスどうしを かさねる → キングを ながおしで ためて いっきに すいこむ
   1ドット = 2px。字は AiPoS-10x10 */
(()=>{
const D='a/play/';
const IMG={};
function img(n){if(IMG[n])return IMG[n];const i=new Image();i.src=D+n;IMG[n]=i;return i;}
const KINDS=['akii','melody','oji','neko','pano','honya','succer','tabizuki'];
function preloadAipos(){for(const k of KINDS)for(const d of ['front','left','right','back'])for(const f of [1,2])img(`${k}_${d}${f}.gif`);
 for(const n of ['pos_ground','pos_air','pos_held','pos_land','pos_king_ground','pos_king_air','pikuto1','pikuto2'])img(n+'.png');
 for(let i=1;i<=6;i++)img(`dust${i}.png`);for(let i=1;i<=7;i++)img(`nyoki${i}.png`);}
const FONT='"AiPoS",monospace';
const fontReady=document.fonts?document.fonts.load('20px "AiPoS"').catch(()=>{}):Promise.resolve();
const r2=v=>Math.round(v/2)*2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=u=>u<0?0:u>1?1:1-(1-u)*(1-u);
const RAINBOW=['#f73100','#f7b500','#00ad42','#39bdff','#0073f7','#a040f0','#f75294'];

// ---- 字(2px のドット)----
function text(ctx,s,x,y,col,size,align){ctx.font=`${size||20}px ${FONT}`;ctx.textBaseline='top';ctx.textAlign=align||'left';ctx.fillStyle=col;ctx.fillText(s,r2(x),r2(y));}
function tw(ctx,s,size){ctx.font=`${size||20}px ${FONT}`;return ctx.measureText(s).width;}
// ▶(字に ないので ドットで)
function tri(ctx,x,y,col,u){ctx.fillStyle=col;u=u||2;for(let i=0;i<5;i++)ctx.fillRect(x+i*u,y+i*u,u,(10-2*i)*u-u*0);}

// ---- ファミコンの窓(黒い窓 → 縁 → 文字。消す時は 逆)----
function famWin(ctx,x,y,w,h,u){   // u 0..1(0〜.35 黒が 広がる・.35〜.6 縁・.6〜 文字)
 const a=Math.min(1,u/.35),hh=r2(h*a);ctx.fillStyle='#000';ctx.fillRect(r2(x),r2(y+(h-hh)/2),r2(w),hh);
 if(u>=.35){ctx.fillStyle='#fff';const b=4,i=4;ctx.fillRect(x+i,y+i,w-2*i,b);ctx.fillRect(x+i,y+h-i-b,w-2*i,b);ctx.fillRect(x+i,y+i,b,h-2*i);ctx.fillRect(x+w-i-b,y+i,b,h-2*i);}
 return u>=.6;}

// ---- おわりの窓(両方の ゲームで 使う)----
function EndWin(W,H,title,sub){
 const o={t:0,sel:0,title,sub,w:Math.min(W-24,300),h:0,rects:[]};
 if(sub&&!Array.isArray(sub))o.sub=[sub];
 o.h=title.length*28+(o.sub?o.sub.length*26+4:0)+2*34+48;
 o.draw=(ctx,dt)=>{o.t+=dt;const x=r2((W-o.w)/2),y=r2((H-o.h)/2);if(!famWin(ctx,x,y,o.w,o.h,Math.min(1,o.t/.5)))return;
  let yy=y+22;for(const L of o.title){text(ctx,L,W/2,yy,'#fff',20,'center');yy+=28;}
  if(o.sub){yy+=2;for(const L of o.sub){text(ctx,L,W/2,yy,'#f7b500',20,'center');yy+=26;}yy+=4;}
  yy+=8;o.rects=[];
  ['もういちど','とじる'].forEach((L,i)=>{const w=tw(ctx,L),lx=r2(W/2-w/2+12);if(o.sel===i)tri(ctx,lx-24,yy,'#fff',2);
   text(ctx,L,lx,yy,'#fff',20);o.rects.push({x:x+8,y:yy-6,w:o.w-16,h:32,i});yy+=34;});};
 o.hit=(px,py)=>{for(const r of o.rects)if(px>=r.x&&px<r.x+r.w&&py>=r.y&&py<r.y+r.h)return r.i;return -1;};
 return o;}

// ---- キャンバスの 指と マウス ----
function pointer(cv,W,H,h){const pos=e=>{const b=cv.getBoundingClientRect();return [(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height];};
 cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(_){}const [x,y]=pos(e);h.down(x,y);});
 cv.addEventListener('pointermove',e=>{const [x,y]=pos(e);h.move(x,y,e.buttons>0||e.pointerType==='touch');});
 cv.addEventListener('pointerup',e=>{const [x,y]=pos(e);h.up(x,y);});
 cv.addEventListener('pointercancel',e=>{const [x,y]=pos(e);h.up(x,y,true);});
 cv.addEventListener('contextmenu',e=>e.preventDefault());}

// ===================================================================== アイポス
function Aipos(cv,onClose){
 const W=320,H=480,ctx=cv.getContext('2d');cv.width=W;cv.height=H;ctx.imageSmoothingEnabled=false;
 const FY0=170,FY1=H-12;   // 地面(足の 位置)
 let S;
 const spr=(k,d,f)=>IMG[`${k}_${d}${f}.gif`];
 function reset(){S={ph:'tap',t:0,T:0,bits:[],guide:[],poses:[],fx:[],flies:[],king:null,saved:0,posMade:0,cap:null,capT:0,held:null,press:null,charge:0,chargeAcc:0,suck:[],sucked:0,end:null,fever:0,conf:[],shake:0,hintT:0};
  for(let i=0;i<10;i++)spawnBit(null,true);say('ひだりうえの　こを|さがして　おしてね！');}
 function say(s){S.cap=s?s.split('|'):null;S.capT=0;}
 function freeSpot(){let best=null,bd=-1;const xl=S.ph==='fever'?96:24;for(let n=0;n<24;n++){const x=r2(rnd(xl,W-24)),y=r2(rnd(FY0+8,FY1-4));let d=1e9;for(const b of S.bits)d=Math.min(d,Math.hypot(b.x-x,(b.y-y)*1.3));for(const p of S.poses)d=Math.min(d,Math.hypot(p.x-x,p.y-y));if(S.king)d=Math.min(d,Math.hypot(S.king.x-x,S.king.y-y)-30);if(d>bd){bd=d;best=[x,y];}}return best;}
 function spawnBit(k,instant,at){const [x,y]=at||freeSpot();const b={k:k||KINDS[Math.random()*8|0],x,y,tx:x,ty:y,dir:'front',wait:rnd(.5,2.5),ph:Math.random(),born:instant?-1:S.T,shake:0};S.bits.push(b);S.guide.push(b);return b;}
 // 案内の 列の 子 と 同じ 種類なら 入れ替えて 先頭へ(同じ子が 何人いても どれを 押しても よい)
 function takeGuide(b){const i=S.guide.indexOf(b),j=S.guide.findIndex(g=>g.k===b.k);if(j<0)return;if(i>=0){S.guide[i]=S.guide[j];}S.guide.splice(j,1);if(i>=0&&i<j){/*入れ替えた 子は そのまま*/}}
 function removeBit(b){const i=S.bits.indexOf(b);if(i>=0)S.bits.splice(i,1);const g=S.guide.indexOf(b);if(g>=0)S.guide.splice(g,1);}
 function puff(x,y,s){S.fx.push({k:'dust',x,y,t:0,s:s||2});}
 function bitAt(x,y,pad){let best=null,bd=1e9;for(const b of S.bits){if(b.fly||b.born>=0&&S.T-b.born<.35)continue;const cx=b.x,cy=b.y-16,d=Math.hypot(cx-x,cy-y);if(Math.abs(cx-x)<16+pad&&Math.abs(cy-y)<16+pad&&d<bd){bd=d;best=b;}}return best;}
 function posScale(m){return m<4?2:m<8?3:m<14?4:m<22?5:6;}
 function posAt(x,y){let best=null,bd=1e9;for(const p of S.poses){const s=posScale(p.m)*8,d=Math.hypot(p.x-x,p.y-s-y);if(d<s+14&&d<bd){bd=d;best=p;}}return best;}
 function kingBox(){const k=S.king;if(!k)return null;const s=posScale(k.shown);return {x:k.x-8*s,y:k.y-20*s,w:16*s,h:20*s};}
 // ---- 流れ ----
 function go(ph){S.ph=ph;S.t=0;
  if(ph==='pos'){say('おなじ　こを|ながおしで　つかんで');ensurePairs(2);}
  if(ph==='fever'){say(null);S.fever=10;for(const p of S.poses)if(p.x<100){p.x=r2(rnd(110,W-30));p.vz=200;}for(let i=0;i<8;i++){const [x,y]=freeSpot();S.poses.push({m:2,x,y,z:0,vz:0,hop:rnd(0,1),born:S.T+i*.12});}confetti();}
  if(ph==='kingborn'){S.fever=0;say('キングポス　たんじょう！');let big=S.poses.reduce((a,p)=>!a||p.m>a.m?p:a,null);
   const tot=S.poses.reduce((a,p)=>a+p.m,0);S.king={m:Math.max(tot,8),x:W-44,y:FY1,fx:big?big.x:W/2,fy:big?big.y:H/2,t:0,shown:big?big.m:tot};
   for(const p of S.poses)if(p!==big)S.flies.push({kind:'pos',m:p.m,x0:p.x,y0:p.y,t:-.25-Math.random()*.4});S.poses=[];
   while(S.bits.length<18)spawnBit();}
  if(ph==='king'){say('キングを　ながおしで|ためて・・・');}
  if(ph==='clear'){say(null);confetti();}
  if(ph==='end'){S.end=EndWin(W,H,['あそんで　くれて','ありがとう！'],'つづきは　アイフォーンで');}}
 function ensurePairs(n){const cnt={};for(const b of S.bits)cnt[b.k]=(cnt[b.k]||0)+1;let have=Object.values(cnt).filter(v=>v>=2).length;
  const ks=KINDS.slice().sort(()=>Math.random()-.5);for(const k of ks){if(have>=n)break;if((cnt[k]||0)===1){spawnBit(k);have++;}}
  while(have<n){const k=ks.pop();if(!k)break;if(!cnt[k]){spawnBit(k);spawnBit(k);have++;}}}
 function confetti(){for(let i=0;i<70;i++)S.conf.push({x:rnd(0,W),y:rnd(-H,0),vy:rnd(50,110),ph:rnd(0,6),c:RAINBOW[i%7]});}
 // ---- 入力 ----
 const inp={x:0,y:0,down:false};
 function down(x,y){inp.x=x;inp.y=y;inp.down=true;S.hintT=0;
  if(S.end){const i=S.end.hit(x,y);if(i>=0)choose(i);return;}
  if(x>W-40&&y<36){S.ph==='end'||go('end');return;}   // ✕
  if(S.ph==='tap'){if(S.saved>=5)return;const want=S.guide[0];let b=bitAt(x,y,10);
   // 押した所の 近くに 正解の 子が いれば それ(指は 太い)
   if(want){let c=null,cd=40;for(const o of S.bits)if(o.k===want.k&&!o.fly){const d=Math.hypot(o.x-x,o.y-16-y);if(d<cd){cd=d;c=o;}}if(c)b=c;}
   if(!b)return;if(want&&b.k===want.k){save(b);}else{b.shake=.35;}}
  else if(S.ph==='pos'){if(S.pendFever)return;const b=bitAt(x,y,6);if(b)S.press={b,x,y,t:0};}
  else if(S.ph==='fever'){const p=posAt(x,y);if(p){S.held={p,ox:p.x-x,oy:p.y-y};p.z=0;}}
  else if(S.ph==='king'){const k=kingBox();if(k&&x>k.x-14&&x<k.x+k.w+14&&y>k.y-14&&y<k.y+k.h+10){S.press={king:true,t:0};S.charge=0;S.chargeAcc=0;say('はなすと・・・');}}}
 function move(x,y,dn){inp.x=x;inp.y=y;if(S.end){const i=S.end.hit(x,y);if(i>=0)S.end.sel=i;return;}
  if(S.press&&S.press.b&&!S.held&&Math.hypot(x-S.press.x,y-S.press.y)>10)S.press=null;}
 function up(x,y,cancel){inp.down=false;
  if(S.held&&S.held.b){const h=S.held.b;h.lift=false;let tgt=null,td=30;for(const o of S.bits)if(o!==h&&o.k===h.k&&!o.fly){const d=Math.hypot(o.x-h.x,o.y-h.y);if(d<td){td=d;tgt=o;}}
   if(tgt&&!cancel){removeBit(h);removeBit(tgt);S.poses.push({m:2,x:tgt.x,y:tgt.y,z:0,vz:120,hop:0,born:-1});puff(tgt.x,tgt.y,2);S.posMade++;
    if(S.posMade===1){say('ポスに　なりました！|もう　ひとつ　つくろう！');ensurePairs(1);}else{say('ポスに　なりました！');S.pendFever=S.T+1.1;}}
   else{h.tx=h.x;h.ty=h.y;say('おなじ　こを|ながおしで　つかんで');}
   S.held=null;}
  else if(S.held&&S.held.p){S.held=null;}
  if(S.press&&S.press.king){if(S.charge>0){startSuck();}else say('キングを　ながおしで|ためて・・・');}
  S.press=null;}
 function save(b){takeGuide(b);b.fly={x0:b.x,y0:b.y-16,t:0};S.saved++;
  if(S.saved===1)say('そう！|つぎは　この　こ！');else if(S.saved===3)say('その　ちょうし！');
  setTimeout(()=>{if(S.bits.length<12)spawnBit();},300);
  if(S.saved>=5)S.pendPos=S.T+.8;}
 function startSuck(){const n=S.charge;S.suck=S.guide.slice(0,n).map((b,i)=>({b,t:-i*.11}));for(const s of S.suck){const g=S.guide.indexOf(s.b);if(g>=0)S.guide.splice(g,1);}S.sucked=0;S.ph='suck';S.t=0;say('いっきに|すいこみます！');S.press=null;}
 // ---- 進める ----
 function step(dt){S.T+=dt;S.t+=dt;S.capT+=dt;S.hintT+=dt;
  if(S.pendPos&&S.T>=S.pendPos){S.pendPos=0;go('pos');}
  if(S.pendFever&&S.T>=S.pendFever){S.pendFever=0;go('fever');}
  // ながおし → つかむ
  if(S.press&&S.press.b){S.press.t+=dt;if(S.press.t>=.22){const b=S.press.b;S.held={b};b.lift=true;S.press=null;say('おなじ　こに|かさねると・・・');}}
  if(S.held&&S.held.b){const b=S.held.b;b.x=r2(Math.max(16,Math.min(W-16,inp.x)));b.y=r2(Math.max(FY0-20,Math.min(FY1,inp.y+22)));b.tx=b.x;b.ty=b.y;b.dir='front';}
  // 子たちの 歩き
  for(const b of S.bits){if(b.fly||b.lift)continue;b.shake=Math.max(0,b.shake-dt);
   const dx=b.tx-b.x,dy=b.ty-b.y,d=Math.hypot(dx,dy);
   if(d<1){b.x=b.tx;b.y=b.ty;b.walk=false;b.wait-=dt;if(b.wait<=0&&!(S.ph==='suck')){const a=rnd(0,6.28),L=rnd(14,40);b.tx=r2(Math.max(20,Math.min(W-20,b.x+Math.cos(a)*L)));b.ty=r2(Math.max(FY0+8,Math.min(FY1-2,b.y+Math.sin(a)*L*.6)));b.wait=rnd(1,3);}}
   else{const v=Math.min(d,22*dt);b.x+=dx/d*v;b.y+=dy/d*v;b.walk=true;b.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');}}
  // すくった子が 左上へ
  for(const b of S.bits.slice())if(b.fly){b.fly.t+=dt;if(b.fly.t>=.4)removeBit(b);}
  // ポス
  for(const p of S.poses){if(S.held&&S.held.p===p)continue;p.hop+=dt;if(p.z>0||p.vz>0){p.vz-=900*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=0;p.land=.12;}}else if(p.hop>1.1&&S.ph!=='kingborn'){p.hop=0;p.vz=150+40*posScale(p.m);}p.land=Math.max(0,(p.land||0)-dt);}
  if(S.ph==='fever'){S.fever-=dt;
   if(S.held&&S.held.p){const h=S.held.p;h.x=Math.max(20,Math.min(W-20,inp.x+S.held.ox));h.y=Math.max(FY0,Math.min(FY1,inp.y+S.held.oy));const hs=posScale(h.m);
    for(const o of S.poses.slice()){if(o===h||o.born>S.T)continue;const dx=h.x-o.x,dy=h.y-o.y,d=Math.hypot(dx,dy),R=70+10*hs;
     if(d<R){const pull=(1-d/R)*260*dt+40*dt;o.x+=dx/d*Math.min(d,pull);o.y+=dy/d*Math.min(d,pull);o.drawn=true;}
     if(d<6+4*(hs+posScale(o.m))){h.m+=o.m;S.poses.splice(S.poses.indexOf(o),1);puff(h.x,h.y,posScale(h.m));S.shake=.15;}}}
   const live=S.poses.filter(p=>p.born<=S.T);
   if(S.fever<=0||live.length===1&&S.poses.length===1&&S.t>1.2){if(!S.feverEnd)S.feverEnd=S.T+(S.fever<=0?0:.6);}
   if(S.feverEnd&&S.T>=S.feverEnd){S.feverEnd=0;S.held=null;go('kingborn');}}
  if(S.king)S.king.x=W-10-8*posScale(S.king.shown);
  if(S.ph==='kingborn'){const k=S.king;k.t+=dt;if(S.t>2.2&&!S.flies.length)go('king');}
  for(const f of S.flies.slice()){f.t+=dt;if(f.t>=.5){S.flies.splice(S.flies.indexOf(f),1);if(S.king){S.king.shown+=f.m;puff(S.king.x,S.king.y-20,2);}}}
  if(S.ph==='king'&&S.press&&S.press.king){S.press.t+=dt;S.chargeAcc+=dt;const cap=Math.min(S.king.m,S.guide.length,16);while(S.chargeAcc>=.13&&S.charge<cap){S.chargeAcc-=.13;S.charge++;}
   if(S.charge>=cap&&cap>0)say('いっぱい！|はなして！');}
  if(S.ph==='suck'){for(const s of S.suck){s.t+=dt;if(s.t>0&&!s.done){s.b.fly2=s.b.fly2||{x0:s.b.x,y0:s.b.y-16};}if(s.t>=.38&&!s.done){s.done=true;removeBit(s.b);S.sucked++;S.shake=.08;}}
   if(S.suck.every(s=>s.done)&&!S.suckEnd)S.suckEnd=S.T+.6;if(S.suckEnd&&S.T>=S.suckEnd){S.suckEnd=0;go('clear');}}
  if(S.ph==='clear'&&S.t>2)go('end');
  for(const f of S.fx)f.t+=dt;S.fx=S.fx.filter(f=>f.t<.4);
  for(const c of S.conf){c.y+=c.vy*dt;c.ph+=dt*6;}S.conf=S.conf.filter(c=>c.y<H+10);
  S.shake=Math.max(0,S.shake-dt);}
 // ---- 描く ----
 function drawSpr(im,x,y,s,flip){if(!im||!im.complete||!im.naturalWidth)return;const w=im.naturalWidth*s,h=im.naturalHeight*s;ctx.drawImage(im,r2(x-w/2),r2(y-h),w,h);}
 function drawBit(b){const f=(Math.floor((S.T+b.ph)*(b.walk?6:2.5))%2)+1;let x=b.x,y=b.y;
  if(b.shake>0)x+=Math.sin(b.shake*60)*3;
  if(b.born>=0&&S.T-b.born<.35){const k=Math.min(6,Math.floor((S.T-b.born)/.05));drawSpr(IMG[`nyoki${k+1}.png`],x,y,2);return;}
  if(b.fly){const u=ease(b.fly.t/.4),gx=24,gy=40;const fx=b.fly.x0+(gx-b.fly.x0)*u,fy=b.fly.y0+(gy-b.fly.y0)*u-Math.sin(u*Math.PI)*60;drawSpr(spr(b.k,'front',1),fx,fy+16,2);return;}
  if(b.fly2){const s=S.suck.find(s=>s.b===b);const u=Math.min(1,Math.max(0,s.t/.38)),k=S.king,kx=k.x,ky=k.y-posScale(k.m)*10;const fx=b.fly2.x0+(kx-b.fly2.x0)*u*u,fy=b.fly2.y0+(ky-b.fly2.y0)*u*u;drawSpr(spr(b.k,'front',f),fx,fy+16,u>.7?1:2);return;}
  if(b.lift){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(r2(x-10),r2(y-2),20,4);drawSpr(spr(b.k,'front',f),x,y-10,2);return;}
  drawSpr(spr(b.k,b.walk?b.dir:'front',f),x,y,2);
  if(S.ph==='pos'&&S.hintT>4&&S.pairK&&S.pairK.has(b.k)&&Math.floor(S.T*3)%2===0){ctx.fillStyle='#f73100';for(let i=0;i<4;i++)ctx.fillRect(r2(x-8+i*2),r2(y-44+i*2),16-i*4,2);}}
 function drawPos(p,isHeld){const s=posScale(p.m);let im=IMG['pos_ground.png'];if(isHeld)im=IMG['pos_held.png'];else if(p.z>0)im=IMG['pos_air.png'];else if(p.land>0)im=IMG['pos_land.png'];
  if(p.born>S.T)return;const age=S.T-p.born;if(p.born>=0&&age<.35){drawSpr(IMG[`nyoki${Math.min(7,Math.floor(age/.05)+1)}.png`],p.x,p.y,2);return;}
  drawSpr(im,p.x,p.y-p.z-(isHeld?8:0),s);}
 function drawKing(){const k=S.king;if(!k)return;const s=posScale(k.shown);let x=k.x,y=k.y;
  if(S.ph==='kingborn'&&k.t<.7){const u=ease(k.t/.7);x=k.fx+(k.x-k.fx)*u;y=k.fy+(k.y-k.fy)*u-Math.sin(u*Math.PI)*120;}
  if(S.press&&S.press.king){x+=(Math.random()-.5)*4;}
  const im=S.ph==='suck'||S.press&&S.press.king?IMG['pos_king_air.png']:IMG['pos_king_ground.png'];
  // ためると 光る
  drawSpr(im,x,y,s);
  if(S.ph==='king'&&!S.press&&Math.floor(S.T*2.5)%2===0){tri(ctx,r2(x-s*8-26),r2(y-s*10-10),'#e8232f',2);}
  if(S.ph==='suck'||S.press&&S.press.king){const n=S.ph==='suck'?S.sucked:S.charge;text(ctx,'x'+n,x,y-s*20-28,'#e8232f',20,'center');}}
 function drawGuide(){const many=S.ph==='king'||S.ph==='suck',n=many?16:5,list=S.guide.filter(b=>!b.fly).slice(0,n);
  list.forEach((b,i)=>{const col=i%8,row=i/8|0,x=8+col*34,y=8+row*34;
   if(many&&i<S.charge&&S.ph==='king'){ctx.fillStyle=RAINBOW[(i+Math.floor(S.T*10))%7];ctx.fillRect(x-2,y-2,36,36);}
   else if(i===0&&!many){ctx.fillStyle='#f7b500';ctx.fillRect(x-4,y-4,40,40);ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,36,36);}
   const im=spr(b.k,'front',1);if(im&&im.complete)ctx.drawImage(im,x,y,32,32);});}
 function drawCap(){if(!S.cap)return;const y0=S.ph==='king'||S.ph==='suck'?80:50,lines=S.cap,lw=Math.max(...lines.map(l=>tw(ctx,l))),bw=r2(lw+20),bh=lines.length*24+12,x0=r2(Math.min(W-bw-6,40+4));
  const ff=(Math.floor(S.T*2.5)%2)+1;const pk=IMG[`pikuto${ff}.png`];if(pk&&pk.complete)ctx.drawImage(pk,4,y0+r2((bh-32)/2),32,32);
  ctx.fillStyle='#1f9d55';ctx.fillRect(x0+4,y0,bw-8,bh);ctx.fillRect(x0,y0+4,bw,bh-8);ctx.fillRect(x0+2,y0+2,bw-4,bh-4);
  const vis=Math.floor(S.capT*30);let used=0;lines.forEach((l,i)=>{const s=l.slice(0,Math.max(0,vis-used));used+=l.length;text(ctx,s,x0+10,y0+8+i*24,'#fff',20);});}
 function draw(){const fev=S.ph==='fever';if(S.ph==='pos'){const c={};for(const o of S.bits)if(!o.fly)c[o.k]=(c[o.k]||0)+1;S.pairK=new Set(Object.keys(c).filter(k=>c[k]>=2));}ctx.save();if(S.shake>0)ctx.translate(r2((Math.random()-.5)*6),0);
  ctx.fillStyle=fev?'#000':'#fff';ctx.fillRect(-8,0,W+16,H);
  if(fev){for(let i=0;i<7;i++){ctx.fillStyle=RAINBOW[(i+Math.floor(S.T*6))%7];ctx.fillRect(i*10,0,10,H);}
   const blink=Math.floor(S.T*6)%2;text(ctx,'FEVER',W/2+36,14,blink?'#fff':'#f7b500',40,'center');
   const u=Math.max(0,S.fever/10);ctx.fillStyle='#333';ctx.fillRect(84,64,W-100,8);ctx.fillStyle=RAINBOW[Math.floor(S.T*8)%7];ctx.fillRect(84,64,r2((W-100)*u),8);
   text(ctx,'ポスを　つかんで',W/2+36,86,'#fff',20,'center');text(ctx,'くっつけろ！',W/2+36,110,'#fff',20,'center');}
  else drawGuide();
  // 地面の 子・ポス(足の 位置で 並べる)
  const L=[];for(const b of S.bits)if(!b.fly&&!b.fly2&&!b.lift)L.push({y:b.y,f:()=>drawBit(b)});
  for(const p of S.poses)if(!(S.held&&S.held.p===p))L.push({y:p.y,f:()=>drawPos(p,false)});
  L.sort((a,b)=>a.y-b.y);for(const o of L)o.f();
  drawKing();
  for(const f of S.flies){if(f.t<0)continue;const k=S.king,u=ease(f.t/.5),x=f.x0+(k.x-f.x0)*u,y=f.y0+(k.y-f.y0)*u-Math.sin(u*Math.PI)*90;drawSpr(IMG['pos_air.png'],x,y,posScale(f.m));}
  for(const b of S.bits)if(b.fly||b.fly2)drawBit(b);
  for(const b of S.bits)if(b.lift)drawBit(b);
  if(S.held&&S.held.p)drawPos(S.held.p,true);
  for(const f of S.fx){const k=Math.min(6,Math.floor(f.t/.4*6)+1);drawSpr(IMG[`dust${k}.png`],f.x-12,f.y,f.s);drawSpr(IMG[`dust${k}.png`],f.x+12,f.y,f.s);}
  for(const c of S.conf){ctx.fillStyle=c.c;ctx.fillRect(r2(c.x+Math.sin(c.ph)*8),r2(c.y),4,Math.abs(Math.sin(c.ph))>.5?4:2);}
  if(!fev)drawCap();
  if(S.ph==='clear'){const sc=Math.min(1,S.t/.25);text(ctx,'クリア！',W/2,H/2-40,RAINBOW[Math.floor(S.T*8)%7],r2(20+40*sc),'center');if(S.t>.5)text(ctx,'ぜんぶで　'+S.sucked+'にん',W/2,H/2+20,'#000',20,'center');}
  ctx.restore();
  // ✕
  if(S.ph!=='end'){ctx.fillStyle=fev?'#fff':'#999';const x=W-26,y=10;for(let i=0;i<8;i++){ctx.fillRect(x+i*2,y+i*2,4,2);ctx.fillRect(x+14-i*2,y+i*2,4,2);}}
  if(S.end){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,H);S.end.draw(ctx,1/60);}}
 function choose(i){if(i===0){reset();}else{stop();onClose&&onClose();}}
 let raf=0,last=0,on=false;
 function loop(t){if(!on)return;const dt=Math.min(.05,(t-(last||t))/1000);last=t;step(dt);draw();raf=requestAnimationFrame(loop);}
 function start(){preloadAipos();reset();on=true;last=0;fontReady.then(()=>{raf=requestAnimationFrame(loop);});}
 function stop(){on=false;cancelAnimationFrame(raf);}
 pointer(cv,W,H,{down,move,up});
 return {start,stop};}

// ===================================================================== 画面の 小さな窓に つなぐ
// .phone[data-play] の 動画に 指を のせる/さわる → 「ちょっとだけ あそんで みますか?」→ はい で 動画の 場所が ゲームに
function attach(ph){const kind=ph.dataset.play,vid=ph.querySelector('video');
 const cv=document.createElement('canvas');cv.className='playcv';cv.hidden=true;ph.appendChild(cv);
 const ask=document.createElement('div');ask.className='playask dot';ask.innerHTML='<div class="pw"><div class="pt">ちょっとだけ<br>あそんで<br>みますか？</div><div class="pb"><button data-a="1">はい</button><button data-a="0">いいえ</button></div></div>';ph.appendChild(ask);
 let game=null,playing=false,asked=false;
 const close=()=>{playing=false;cv.hidden=true;vid.hidden=false;try{vid.play();}catch(e){}ph.classList.remove('playing');};
 const show=()=>{if(playing||ask.classList.contains('on'))return;ask.classList.remove('off');ask.classList.add('on');};
 const hide=()=>{if(!ask.classList.contains('on'))return;ask.classList.remove('on');ask.classList.add('off');setTimeout(()=>ask.classList.remove('off'),300);};
 ph.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show();});
 ph.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')hide();});
 vid.addEventListener('click',()=>show());
 ph.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse'&&!playing&&e.target===vid)show();});
 ask.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();hide();
  if(b.dataset.a==='1'){playing=true;vid.pause();vid.hidden=true;cv.hidden=false;ph.classList.add('playing');
   if(!game)game=Aipos(cv,close);game.start();}});}
document.querySelectorAll('.phone[data-play]').forEach(attach);
})();
