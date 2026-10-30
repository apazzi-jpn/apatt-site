/* ---- ちょっとだけ あそぶ(APATT通信 No.1・261028)----
   アイポス: いまの アイポスの チュートリアルと 同じ 見た目の 一本道(下の Aipos)
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

// ===================================================================== アイポス(261029 新しい 見た目・一本道)
//   いまの アイポス(1.1.1)の チュートリアルと 同じ 部品: 金の 時計・時計の よこの 列・灰色の スポットライト(白い 枠と ▽)・みどりの 窓と 進み具合の 点・青い 指
//   一本道: その時に できる ことしか できない(ほかの 所を 押しても 何も 起きない・子が いなくならない)
//   すくう 3人(アス → パンお → 王子)→ メロでぃ 2人を かさねて ポス → フィーバー(じどう)で ポスどうしを かさねる → キングを ためきって はなす → CLEAR!
const NES=[0x7c7c7c,0x0000fc,0x0000bc,0x4428bc,0x940084,0xa80020,0xa81000,0x881400,0x503000,0x007800,0x006800,0x005800,0x004058,0,0,0,
 0xbcbcbc,0x0078f8,0x0058f8,0x6844fc,0xd800cc,0xe40058,0xf83800,0xe45c10,0xac7c00,0x00b800,0x00a800,0x00a844,0x008888,0,0,0,
 0xf8f8f8,0x3cbcfc,0x6888fc,0x9878f8,0xf878f8,0xf85898,0xf87858,0xfca044,0xf8b800,0xb8f818,0x58d854,0x58f898,0x00e8d8,0x787878,0,0,
 0xfcfcfc,0xa4e4fc,0xb8b8f8,0xd8b8f8,0xf8b8f8,0xf8a4c0,0xf0d0b0,0xfce0a8,0xf8d878,0xd8f878,0xb8f8b8,0xb8f8d8,0x00fcfc,0xf8d8f8,0,0];
const dimMemo=[new Map(),new Map(),new Map(),new Map()];
function nesDim(rgb,steps){   // ゲームの nesDim と 同じ(パレットで steps 段 暗く・黒に 近い 色は 黒)
 const m=dimMemo[steps];let v=m.get(rgb);if(v!==undefined)return v;
 const r=rgb>>16&255,g=rgb>>8&255,b=rgb&255;
 if(Math.max(r,g,b)/255<.10){m.set(rgb,0);return 0;}
 let best=15,bd=-1;for(let i=0;i<64;i++){if((i&15)>=13)continue;const p=NES[i],dr=r-(p>>16&255),dg=g-(p>>8&255),db=b-(p&255),d=dr*dr*2+dg*dg*4+db*db*3;if(bd<0||d<bd){bd=d;best=i;}}
 const row=(best>>4)-steps;v=row<0?0:NES[(row<<4)|(best&15)];m.set(rgb,v);return v;}
// ゲームの 5x7 の 字(時計・CLEAR!)
const PG={'0':'.###.|#..##|#.#.#|##..#|#...#|#...#|.###.','1':'..#..|.##..|..#..|..#..|..#..|..#..|#####','2':'.###.|#...#|....#|..##.|.#...|#....|#####','3':'.###.|#...#|....#|..##.|....#|#...#|.###.','4':'...#.|..##.|.#.#.|#..#.|#####|...#.|...#.','5':'#####|#....|####.|....#|....#|#...#|####.','6':'.###.|#....|####.|#...#|#...#|#...#|.###.','7':'#####|....#|...#.|..#..|.#...|.#...|.#...','8':'.###.|#...#|#...#|.###.|#...#|#...#|.###.','9':'.###.|#...#|#...#|.####|....#|....#|.###.',
 '.':'.....|.....|.....|.....|.....|.##..|.##..','C':'.###.|#...#|#....|#....|#....|#...#|.###.','L':'#....|#....|#....|#....|#....|#....|#####','E':'#####|#....|####.|#....|#....|#....|#####','A':'.###.|#...#|#...#|#####|#...#|#...#|#...#','R':'####.|#...#|#...#|####.|#.#..|#..#.|#...#','!':'..#..|..#..|..#..|..#..|..#..|.....|..#..',
 'X':'#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#','x':'#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',' ':'.....|.....|.....|.....|.....|.....|.....'};
function ptext(ctx,s,cx,y,sc,col){let x=cx-Math.floor((s.length*6-1)*sc/2);x&=~1;ctx.fillStyle=col;for(const ch of s){const p=(PG[ch]||PG[' ']).split('|');for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(p[r][c]==='#')ctx.fillRect(x+c*sc,y+r*sc,sc,sc);x+=6*sc;}}
function Aipos(cv,onClose){
 const W=320,H=480,ctx=cv.getContext('2d',{willReadFrequently:true});cv.width=W;cv.height=H;ctx.imageSmoothingEnabled=false;
 const orig=document.createElement('canvas');orig.width=W;orig.height=H;const octx=orig.getContext('2d');
 const MCX=160,MCY=32,DOCK={x:276,y:436};
 const BOW=['#6453d8','#d953d9','#da5365','#d9b252','#8cd853','#53d88b','#53b3d9'];
 const GREEN='#007800';
 let S;
 const spr=(k,d,f)=>IMG[`${k}_${d}${f}.gif`];
 const ok=im=>im&&im.complete&&im.naturalWidth;
 // ---- 最初の 盤面(決まった 並び)----
 const START=[{k:'akii',x:88,y:200},{k:'pano',x:232,y:184},{k:'oji',x:160,y:264},{k:'melody',x:72,y:304},{k:'melody',x:248,y:296}];
 const FEVPOS=[[96,264],[224,256],[160,336],[64,392],[256,384]];
 const KINGKIDS=[{k:'neko',x:48,y:216},{k:'succer',x:120,y:200},{k:'honya',x:200,y:216},{k:'tabizuki',x:72,y:280},{k:'akii',x:152,y:288},{k:'pano',x:224,y:296},{k:'oji',x:48,y:360},{k:'melody',x:128,y:368}];
 function reset(){S={ph:'tap',t:0,T:0,kids:START.map(o=>({...o,hx:o.x,hy:o.y,ph:Math.random()})),queue:[],poses:[],fx:[],conf:[],king:null,saved:0,
   bub:null,spot:0,spotOn:false,press:null,held:null,charge:0,chargeAcc:0,suck:[],sucked:0,slide:0,end:null,pend:null,flyIn:[]};
  S.queue=S.kids.slice();   // 列 = 盤面の 子(この 順に すくう)
  bubble(['この　こを　タップ！'],'B',3,0);}
 function bubble(lines,spot,n,done){S.bub={lines,spot,n,done,t:0};}
 function later(sec,f){S.pend={at:S.T+sec,f};}
 function puff(x,y){S.fx.push({x,y,t:0});}
 function confetti(){for(let i=0;i<70;i++)S.conf.push({x:Math.random()*W,y:-Math.random()*H,vy:50+Math.random()*60,ph:Math.random()*6,c:BOW[i%7]});}
 const posScale=m=>m<4?2:m<8?3:m<14?4:5;
 // いま 押してよい 子
 function targets(){if(S.ph==='tap')return S.queue.length?[S.queue[0]]:[];if(S.ph==='pos')return S.kids.filter(k=>k.k==='melody');return [];}
 // ---- 入力 ----
 const inp={x:0,y:0};
 function down(x,y){inp.x=x;inp.y=y;
  if(S.end){const i=S.end.hit(x,y);if(i>=0)choose(i);return;}
  if(x>W-40&&y<40&&S.ph!=='fever'){go('end');return;}
  if(S.pend)return;
  if(S.ph==='tap'){const t=S.queue[0];if(t&&Math.hypot(t.x-x,t.y-y)<34)save(t);return;}
  if(S.ph==='pos'){let best=null,bd=34;for(const k of targets()){const d=Math.hypot(k.x-x,k.y-y);if(d<bd){bd=d;best=k;}}if(best)S.press={k:best,t:0,x,y};return;}
  if(S.ph==='fever'){let best=null,bd=40;for(const p of S.poses){const s=posScale(p.m),d=Math.hypot(p.x-x,p.y-s*8-y);if(d<bd+s*4){bd=d;best=p;}}if(best){S.held={p:best,ox:best.x-x,oy:best.y-y};}return;}
  if(S.ph==='king'){const s=posScale(S.king.m);if(x>DOCK.x-s*8-16&&x<DOCK.x+s*8+16&&y>DOCK.y-s*20-24&&y<DOCK.y+12){S.press={king:true,t:0};S.charge=0;S.chargeAcc=0;bubble(['はなすと・・・'],'K',3,1);}return;}}
 function move(x,y){inp.x=x;inp.y=y;if(S.end){const i=S.end.hit(x,y);if(i>=0)S.end.sel=i;}}
 function up(x,y){
  if(S.held&&S.held.k){const h=S.held.k;S.held=null;const o=S.kids.find(k=>k!==h&&k.k===h.k);
   if(o&&Math.hypot(o.x-h.x,o.y-h.y)<30){S.kids=S.kids.filter(k=>k!==h&&k!==o);S.queue=S.queue.filter(k=>k!==h&&k!==o);S.poses.push({m:2,x:o.x,y:o.y,z:0,vz:160,hop:0,born:-1});puff(o.x,o.y);
    bubble(['ポスに　なります！'],'B',3,3);later(1.4,()=>go('fever'));}
   else{h.back={x0:h.x,y0:h.y,t:0};bubble(['おなじ　こを','ながおしで　つかんで'],'B',3,0);}}
  if(S.held&&S.held.p)S.held=null;
  if(S.press&&S.press.king){const full=S.charge>=S.queue.length;if(full)startSuck();else{S.charge=0;bubble(['さいごまで','ためてから　はなしてね'],'K',3,0);}}
  S.press=null;}
 function save(k){S.saved++;S.queue.shift();S.kids=S.kids.filter(o=>o!==k);S.flyIn.push({k:k.k,x0:k.x,y0:k.y,t:0});S.slide=1;
  if(S.saved===1)bubble(['そう！','つぎは　この　こ！'],'B',3,1);
  else if(S.saved===2)bubble(['その　ちょうし！'],'B',3,2);
  else{bubble(['できました！'],'B',3,3);later(1.1,()=>go('pos'));}}
 function go(ph){S.ph=ph;S.t=0;S.pend=null;
  if(ph==='pos')bubble(['おなじ　こを','ながおしで　つかんで'],'B',3,0);
  if(ph==='fever'){for(const [x,y] of FEVPOS)S.poses.push({m:2,x,y,z:0,vz:0,hop:Math.random(),born:S.T+Math.random()*.4});confetti();bubble(['フィーバーちゅうは','ポスどうしを　かさねて'],'F',1,0);}
  if(ph==='kingborn'){const p=S.poses[0];S.king={m:p.m,fx:p.x,fy:p.y,t:0};S.poses=[];bubble(['キングポス　たんじょう！'],'K',1,1);
   S.queue=[];KINGKIDS.forEach((o,i)=>{const k={...o,hx:o.x,hy:o.y,ph:Math.random(),born:S.T+.3+i*.06};S.kids.push(k);S.queue.push(k);});later(2,()=>go('king'));}
  if(ph==='king')bubble(['キングを','ながおしで　ためて'],'K',3,0);
  if(ph==='clear'){bubble(null);confetti();later(2.2,()=>go('end'));}
  if(ph==='end'){S.bub=null;S.end=EndWin(W,H,['あそんで　くれて','ありがとう！'],'つづきは　アイフォーンで');}}
 function startSuck(){S.ph='suck';S.t=0;S.suck=S.queue.map((k,i)=>({k,t:-i*.12}));S.queue=[];bubble(['いっきに','すいこみます！'],'K',3,3);}
 // ---- 進める ----
 function step(dt){S.T+=dt;S.t+=dt;if(S.bub)S.bub.t+=dt;S.slide=Math.max(0,S.slide-dt/.12);
  if(S.pend&&S.T>=S.pend.at){const f=S.pend.f;S.pend=null;f();}
  const want=(S.ph==='tap'||S.ph==='pos'||S.ph==='king')&&!S.pend&&!S.held&&!S.press;S.spot=want?Math.min(2,S.spot+dt/.1):Math.max(0,S.spot-dt/.06);
  if(S.press&&S.press.k){S.press.t+=dt;if(S.press.t>=.22){S.held={k:S.press.k};S.press=null;bubble(['おなじ　こに','かさねると・・・'],'B',3,1);}}
  if(S.held&&S.held.k){const k=S.held.k;k.x=Math.max(16,Math.min(W-16,inp.x));k.y=Math.max(80,Math.min(H-16,inp.y-6));}
  for(const k of S.kids){if(k.back){k.back.t+=dt;const u=Math.min(1,k.back.t/.25);k.x=k.back.x0+(k.hx-k.back.x0)*u;k.y=k.back.y0+(k.hy-k.back.y0)*u-Math.sin(u*Math.PI)*16;if(u>=1)k.back=null;}}
  for(const f of S.flyIn)f.t+=dt;S.flyIn=S.flyIn.filter(f=>f.t<.35);
  for(const p of S.poses){if(S.held&&S.held.p===p)continue;if(p.vz>0||p.z>0){p.vz-=900*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=0;}}else if((p.hop+=dt)>1.2){p.hop=0;p.vz=140;}}
  if(S.ph==='fever'&&S.held&&S.held.p){const h=S.held.p;h.x=Math.max(20,Math.min(W-20,inp.x+S.held.ox));h.y=Math.max(150,Math.min(H-8,inp.y+S.held.oy));const hs=posScale(h.m);
   for(const o of S.poses.slice()){if(o===h||o.born>S.T)continue;const dx=h.x-o.x,dy=h.y-o.y,d=Math.hypot(dx,dy)||1,R=80+10*hs;
    if(d<R){const v=((1-d/R)*300+50)*dt;o.x+=dx/d*Math.min(d,v);o.y+=dy/d*Math.min(d,v);}
    if(d<8+4*(hs+posScale(o.m))){h.m+=o.m;S.poses.splice(S.poses.indexOf(o),1);puff(h.x,h.y);}}}
  if(S.ph==='fever'&&S.poses.length===1&&!S.pend&&S.t>.6){S.held=null;later(.5,()=>go('kingborn'));}
  if(S.king)S.king.t+=dt;
  if(S.ph==='king'&&S.press&&S.press.king){S.chargeAcc+=dt;const full=S.queue.length;while(S.chargeAcc>=.16&&S.charge<full){S.chargeAcc-=.16;S.charge++;}
   if(S.charge>=full&&S.bub&&S.bub.lines[0]!=='いまです！')bubble(['いまです！','はなして！'],'K',3,2);}
  if(S.ph==='suck'){for(const s of S.suck){s.t+=dt;if(s.t>=.36&&!s.done){s.done=true;S.kids=S.kids.filter(k=>k!==s.k);S.sucked++;}}if(S.suck.every(s=>s.done)&&!S.pend)later(.5,()=>go('clear'));}
  for(const f of S.fx)f.t+=dt;S.fx=S.fx.filter(f=>f.t<.4);
  for(const c of S.conf){c.y+=c.vy*dt;c.ph+=dt*6;}S.conf=S.conf.filter(c=>c.y<H+10);}
 // ---- 描く ----
 function blit(im,x,y,w,h){if(ok(im))ctx.drawImage(im,r2(x),r2(y),w||im.naturalWidth*2,h||im.naturalHeight*2);}
 function kidImg(k){const f=(Math.floor((S.T+k.ph)*4.5)%2)+1;return spr(k.k,'front',f);}
 function drawKid(k){if(k.born!==undefined&&S.T<k.born)return;if(k.born!==undefined&&S.T-k.born<.35){blit(IMG[`nyoki${Math.min(7,Math.floor((S.T-k.born)/.05)+1)}.png`],k.x-16,k.y-16);return;}
  const lift=S.held&&S.held.k===k;blit(kidImg(k),k.x-16,k.y-16-(lift?8:0));}
 function drawPos(p,held){if(p.born>S.T)return;const s=posScale(p.m),age=S.T-p.born;
  if(p.born>=0&&age<.35){blit(IMG[`nyoki${Math.min(7,Math.floor(age/.05)+1)}.png`],p.x-16,p.y-32);return;}
  const im=held?IMG['pos_held.png']:p.z>0?IMG['pos_air.png']:IMG['pos_ground.png'];blit(im,p.x-8*s,p.y-16*s-p.z-(held?8:0),16*s,16*s);}
 function ring(){const gC='#ffde5a',gB='#f7b500',gA='#b56b00';
  for(let dy=-16;dy<16;dy++)for(let dx=-16;dx<16;dx++){const fx=dx+.5,fy=dy+.5,d=Math.hypot(fx,fy);if(d<13||d>=16)continue;const sl=fx+fy;
   ctx.fillStyle=d<14?(sl<-6?gA:sl>6?gC:gB):(sl<-7?gC:sl>7?gA:gB);ctx.fillRect(MCX+dx*2,MCY+dy*2,2,2);}
  const dark=S.ph==='fever';ctx.fillStyle=dark?'#080808':'#fff';for(let yy=-26;yy<26;yy+=2){const m=yy+1,hw=2*Math.floor(Math.sqrt(Math.max(0,676-m*m))*.5);if(hw>0)ctx.fillRect(MCX-hw,MCY+yy,hw*2,2);}
  ptext(ctx,'20.0',MCX,MCY-7,2,dark?'#f8f8f8':'#111111');}
 function queue(){const q=S.queue.filter(k=>!(k.born!==undefined&&S.T<k.born));const blink=S.charge>0&&Math.floor(S.T*8)%2===0;
  for(let i=Math.min(4,q.length)-1;i>=0;i--){const cx=106-32*i-S.slide*32,cy=30+12*(128-cx)/118,x=r2(cx-16),y=r2(cy-16);
   blit(spr(q[i].k,'front',(Math.floor(S.T*1000/220)%2)+1),x,y);if(blink&&i<S.charge){ctx.fillStyle='#f7b500';ctx.fillRect(x-2,y-2,36,2);ctx.fillRect(x-2,y+32,36,2);ctx.fillRect(x-2,y-2,2,36);ctx.fillRect(x+32,y-2,2,36);}}}
 function downArrow(cx,yTop){const A=['#######','.#####.','..###..','...#...'],ph=Math.floor(S.T*3)%2===0,ax=(cx-7)&~1,ay=(yTop-(ph?2:0))&~1;
  for(let pass=0;pass<2;pass++){ctx.fillStyle=pass?'#fff':'#111111';for(let r=0;r<4;r++)for(let c=0;c<7;c++)if(A[r][c]==='#'){if(pass)ctx.fillRect(ax+c*2,ay+r*2,2,2);else ctx.fillRect(ax+c*2-2,ay+r*2-2,6,6);}}}
 function hand(tx,ty){const R=['..oo.....','..ofo....','..ofo....','..ofo....','..ofoooo.','..offfffo','ooofffffo','offfffffo','.offffffo','..offffo.','..ooooo..'];
  const pr=Math.floor(S.T*2.5)%2===0,x0=r2(tx)-6,y0=r2(ty)+(pr?4:0);for(let r=0;r<11;r++)for(let c=0;c<9;c++){const ch=R[r][c];if(ch==='.')continue;ctx.fillStyle=ch==='o'?'#2060dc':'#fff';ctx.fillRect(x0+c*2,y0+r*2,2,2);}}
 // みどりの 窓(作者の 窓を 9つに 分けて みどりで 塗る)
 let bubC=null;
 function bubImg(){if(bubC)return bubC;const im=IMG['tutorial_bubble.png'];if(!ok(im))return null;bubC=document.createElement('canvas');bubC.width=im.naturalWidth;bubC.height=im.naturalHeight;const g=bubC.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle=GREEN;g.fillRect(0,0,bubC.width,bubC.height);return bubC;}
 function win(x,y,w,h){const b=bubImg();if(!b){ctx.fillStyle=GREEN;ctx.fillRect(x,y,w,h);return;}const sx=[0,8,136],sy=[0,8,24],sw=[8,128,8],sh=[8,16,8],e=16,dx=[x,x+e,x+w-e],dy=[y,y+e,y+h-e],dw=[e,w-2*e,e],dh=[e,h-2*e,e];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)if(dw[c]>0&&dh[r]>0)ctx.drawImage(b,sx[c],sy[r],sw[c],sh[r],dx[c],dy[r],dw[c],dh[r]);}
 function drawBubble(){const B=S.bub;if(!B||!B.lines)return;const L=B.lines,lw=Math.max(...L.map(l=>tw(ctx,l))),bw=r2(Math.max(64,lw+16)),h=10+40*L.length;
  const pf=(Math.floor(S.T*2.5)%2)+1,pk=IMG[`pikuto${pf}.png`];
  if(B.spot==='F'){blit(pk,16,150);L.forEach((l,i)=>text(ctx,l,56,154+i*30,'#f8f8f8',20));return;}
  let x,y;if(B.spot==='K'){x=r2(Math.max(52,Math.min(316-bw,MCX-bw/2)));y=80;}else{x=52;y=446-h;}
  blit(pk,x-46,y+h-36);
  const st=B.t<.05?1:B.t<.1?2:3;if(st===1){ctx.fillStyle=GREEN;ctx.fillRect(x+8,y+8,bw-16,h-16);return;}win(x,y,bw,h);if(st<3)return;
  L.forEach((l,i)=>text(ctx,l,x+4,y+12+i*40,'#f7f7f7',20));
  if(B.n>1){const n=B.n,x0=r2(x+bw-8-(n*8+(n-1)*4)),y0=r2(y+h-12),off='#'+nesDim(0x007800,2).toString(16).padStart(6,'0');
   for(let i=0;i<n;i++)for(let r=0;r<4;r++)for(let c=0;c<4;c++){ctx.fillStyle=i>=B.done?off:r+c<=2?'#ffde5a':r+c===3?'#f7b500':'#b56b00';ctx.fillRect(x0+i*12+c*2,y0+r*2,2,2);}}}
 function drawKing(){const K=S.king;if(!K)return null;const s=posScale(K.m);let x=DOCK.x,y=DOCK.y;
  if(S.ph==='kingborn'&&K.t<.7){const u=ease(K.t/.7);x=K.fx+(DOCK.x-K.fx)*u;y=K.fy+(DOCK.y-K.fy)*u-Math.sin(u*Math.PI)*120;}
  if(S.press&&S.press.king)x+=(Math.floor(S.T*30)%2)*2-1;
  const im=(S.press&&S.press.king)||S.ph==='suck'?IMG['pos_king_air.png']:IMG['pos_king_ground.png'];blit(im,x-8*s,y-20*s,16*s,20*s);
  if(S.ph==='suck'||S.press&&S.press.king){const n=S.ph==='suck'?S.sucked:S.charge;ptext(ctx,'x'+n,x,y-20*s-20,2,'#e8232f');}
  return {x:r2(x-8*s-8),y:r2(y-20*s-8),w:16*s+16,h:20*s+16};}
 function scene(){const fev=S.ph==='fever'||(S.ph==='kingborn'&&S.t<.3);
  ctx.fillStyle=fev?'#000':'#fff';ctx.fillRect(0,0,W,H);
  if(fev)for(let i=0;i<7;i++){ctx.fillStyle=BOW[(i+Math.floor(S.T*4))%7];ctx.fillRect(Math.round(i*W/7),0,Math.ceil(W/7)+1,130);}
  ring();queue();
  const L=[];for(const k of S.kids)if(!(S.held&&S.held.k===k)&&!S.suck.some(s=>s.k===k&&s.t>0))L.push({y:k.y,f:()=>drawKid(k)});
  for(const p of S.poses)if(!(S.held&&S.held.p===p))L.push({y:p.y,f:()=>drawPos(p,false)});L.sort((a,b)=>a.y-b.y);for(const o of L)o.f();
  const kb=drawKing();
  for(const f of S.flyIn){const u=ease(f.t/.35),x=f.x0+(MCX-f.x0)*u,y=f.y0+(MCY-f.y0)*u-Math.sin(u*Math.PI)*40;blit(spr(f.k,'front',1),x-16,y-16);}
  for(const s of S.suck)if(s.t>0&&!s.done){const u=Math.min(1,s.t/.36),kx=DOCK.x,ky=DOCK.y-40;blit(kidImg(s.k),s.k.x+(kx-s.k.x)*u*u-16,s.k.y+(ky-s.k.y)*u*u-16,u>.7?16:32,u>.7?16:32);}
  if(S.held&&S.held.k)drawKid(S.held.k);if(S.held&&S.held.p)drawPos(S.held.p,true);
  for(const f of S.fx){const k=Math.min(6,Math.floor(f.t/.4*6)+1);blit(IMG[`dust${k}.png`],f.x-28,f.y-28);blit(IMG[`dust${k}.png`],f.x-4,f.y-28);}
  // フィーバーの 時は いちばん 大きい ポスに ▽ と 指
  if(S.ph==='fever'&&!S.held&&S.poses.length>1){const p=S.poses.reduce((a,b)=>b.m>a.m?b:a);const s=posScale(p.m);if(p.born<=S.T){downArrow(p.x,p.y-16*s-p.z-20);hand(p.x+4,p.y-6*s);}}
  if(S.ph==='clear')ptext(ctx,'CLEAR!',W/2,216,2,'#111111');
  for(const c of S.conf){ctx.fillStyle=c.c;ctx.fillRect(r2(c.x+Math.sin(c.ph)*8),r2(c.y),4,Math.abs(Math.sin(c.ph))>.5?4:2);}
  return kb;}
 function draw(){const kb=scene();
  // スポットライト: いま 押す 物(白い 枠と ▽)だけ 残して パレットで 暗く
  const lv=Math.floor(S.spot);
  if(lv>0){const keep=[],br=(()=>{const k=Math.floor((S.T%1)/.125)&7;return 2*(k<4?k:7-k);})();   // 1秒で 4段 大きく → 4段 小さく(0,2,4,6,6,4,2,0)
   if(S.ph==='tap'||S.ph==='pos')for(const k of targets())keep.push({cx:r2(k.x),cy:r2(k.y),r:24+br});
   if(S.ph==='king'&&kb)keep.push({cx:r2(kb.x+kb.w/2),cy:r2(kb.y+kb.h/2),r:(Math.max(kb.w,kb.h)/2+br)&~1});
   octx.drawImage(cv,0,0);const id=ctx.getImageData(0,0,W,H),d=id.data;
   for(let i=0;i<d.length;i+=4){const v=nesDim(d[i]<<16|d[i+1]<<8|d[i+2],lv);d[i]=v>>16&255;d[i+1]=v>>8&255;d[i+2]=v&255;}
   ctx.putImageData(id,0,0);
   for(const c of keep)for(let dy=-c.r;dy<c.r;dy+=2){const yy=dy+1,hw=2*Math.floor(Math.sqrt(Math.max(0,c.r*c.r-yy*yy))*.5+.5);if(hw<=0)continue;const x=Math.max(0,c.cx-hw),y=c.cy+dy,w=Math.min(W,c.cx+hw)-x;if(y<0||y>=H||w<=0)continue;ctx.drawImage(orig,x,y,w,2,x,y,w,2);}}
  // 指(いま 押す 物)
  if(!S.pend&&!S.held&&!S.press&&lv>=2){if(S.ph==='tap'&&S.queue[0])hand(S.queue[0].x+2,S.queue[0].y+2);
   if(S.ph==='pos'){const m=targets()[0];if(m)hand(m.x+2,m.y+2);}
   if(S.ph==='king'&&kb)hand(kb.x+kb.w/2,kb.y+kb.h/2);}
  drawBubble();
  if(S.ph!=='end'&&S.ph!=='fever'){ctx.fillStyle='#999';const x=W-24,y=8;for(let i=0;i<7;i++){ctx.fillRect(x+i*2,y+i*2,4,2);ctx.fillRect(x+12-i*2,y+i*2,4,2);}}
  if(S.end){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,H);S.end.draw(ctx,1/60);}}
 function choose(i){if(i===0)reset();else{stop();onClose&&onClose();}}
 let raf=0,last=0,on=false;
 function loop(t){if(!on)return;const dt=Math.min(.05,(t-(last||t))/1000);last=t;step(dt);draw();raf=requestAnimationFrame(loop);}
 function start(){preloadAipos();img('tutorial_bubble.png');reset();on=true;last=0;fontReady.then(()=>{raf=requestAnimationFrame(loop);});}
 function stop(){on=false;cancelAnimationFrame(raf);}
 pointer(cv,W,H,{down,move,up});
 if(/[?&]playdbg/.test(location.search))cv._dbg=()=>S;
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
