/* ECHOES AFTER MIDNIGHT 3D — game logic stays in 2D pixel coords; S maps them to 3D metres (40px = 1m). */
const S=.025,SIZE=22,SOLUTION=[2,3,1],SAVE='eam_save4',SIGHT=1000,$=id=>document.getElementById(id);
/* phones / tablets: touch controls (touch.js) + a lighter graphics preset. touchMode flips at runtime if a finger or a mouse is actually used. */
const MOBILE=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&matchMedia('(pointer:coarse)').matches);let touchMode=MOBILE;
/* ---------- realism settings: every effect can be tuned or switched off here (set to 0 / false if the game runs slowly) ---------- */
const GFX={
  shadows:true, shadowSize:MOBILE?1024:2048,   // torch casts real shadows (statues, furniture, walls)
  exposure:.78,                    // overall brightness after tone mapping — raise if the game feels too dark
  env:true,                        // faint reflected moonlight on glossy surfaces (floor, lockers, metal)
  beam:.06,                        // visible haze in the torch beam (0 = off)
  dust:MOBILE?140:260,                        // dust motes floating in the beam (0 = off)
  grain:.32,                       // film grain strength (0 = off)
  bob:true,                        // head bob, sway and footsteps while walking
  flashSway:true,                  // torch lags slightly behind the camera like a real hand-held light
  reverb:true,                     // echoey room sound
  pixelRatio:MOBILE?1.25:2                     // lower to 1 for more speed on weak machines
};
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
/* ---------- level data (easy to edit) ----------
   room: w,h (px) · walls [x,y,w,h] · hides (also listed in walls) · desks (puzzle desks, also in walls) · doors · exit · safe [x,y,w,h] · statues [x,y] · props
   door: {x,y,w,h,to,tx,ty} + optional need:'flag' (locked until G[flag] is true) and msg:'text shown while locked'
   props — solid:    locker shelf desk table bench bin case bed safe  = rect {x,y,w,h} + f (side the front faces: n/s/e/w)
           on a wall: window board poster clock pad       = {x,y} point on the wall face, w = width, f = direction it faces into the room
           on floor:  rug {x,y,w,h,c}  ·  stain {x,y,r}                                                                           */
const DK=[[520,200,60,44],[700,200,60,44],[880,200,60,44]];                    // puzzle desks: left to right = 1,2,3
const HS=[[160,60,40,56]],HB=[[120,60,40,56],[840,60,40,56]],HP=[[200,60,40,56],[860,60,40,56]];   // hiding lockers: storage, boiler room, chapel
const HH=[[200,60,40,56],[1100,60,40,56]],HC=[[60,60,40,56],[1290,60,40,56]],HL=[[120,60,40,56],[1180,60,40,56]];  // hiding lockers
const ROOMS={
  hall:{w:1600,h:900,
    walls:[[0,0,1600,60],[0,840,1600,60],[0,60,30,780],[1570,60,30,780],[520,60,40,240],[1020,600,40,240],[780,420,56,56],[1260,200,56,56],...HH],
    hides:HH,desks:[],doors:[{x:1540,y:390,w:30,h:120,to:'class',tx:100,ty:450},{x:30,y:390,w:30,h:120,to:'ward',tx:990,ty:350}],exit:{x:760,y:30,w:100,h:50},
    statues:[[1100,420]],
    props:[
      {k:'locker',x:260,y:60,w:240,h:30,f:'s'},{k:'locker',x:1180,y:60,w:260,h:30,f:'s'},{k:'locker',x:120,y:810,w:300,h:30,f:'n'},{k:'locker',x:1100,y:810,w:300,h:30,f:'n'},
      {k:'case',x:900,y:60,w:100,h:22,f:'s'},{k:'bench',x:300,y:600,w:120,h:18,f:'s'},{k:'bench',x:1200,y:560,w:120,h:18,f:'s'},
      {k:'bin',x:640,y:130,w:16,h:16},{k:'bin',x:1480,y:780,w:16,h:16},
      {k:'rug',x:300,y:370,w:900,h:160,c:0x3a1020},{k:'stain',x:850,y:300,r:50},{k:'stain',x:420,y:520,r:36},{k:'stain',x:1300,y:700,r:60},
      {k:'window',x:110,y:60,w:100,f:'s'},{k:'window',x:1510,y:60,w:100,f:'s'},{k:'window',x:600,y:840,w:140,f:'n'},{k:'window',x:820,y:840,w:140,f:'n'},
      {k:'window',x:30,y:250,w:120,f:'e'},{k:'window',x:30,y:650,w:120,f:'e'},{k:'window',x:1570,y:230,w:120,f:'w'},{k:'window',x:1570,y:670,w:120,f:'w'},
      {k:'poster',x:640,y:60,w:26,f:'s',c:0x7a3a3a},{k:'poster',x:560,y:200,w:26,f:'e',c:0x3a5a7a},{k:'poster',x:1020,y:700,w:26,f:'w',c:0x5a7a3a},{k:'clock',x:950,y:60,f:'s'}]},
  class:{w:1400,h:900,
    walls:[[0,0,1400,60],[0,840,1400,60],[0,60,30,780],[1370,60,30,780],...HC,...DK],
    hides:HC,desks:DK,doors:[{x:30,y:390,w:30,h:120,to:'hall',tx:1490,ty:450},{x:1340,y:390,w:30,h:120,to:'lib',tx:100,ty:450,need:'libKey',msg:'The library door is locked tight. Something in this classroom must open it...'}],
    statues:[[760,560]],
    props:[
      {k:'board',x:700,y:60,w:320,f:'s'},{k:'clock',x:700,y:60,f:'s'},{k:'table',x:180,y:130,w:120,h:48,f:'s'},
      {k:'desk',x:500,y:420,w:60,h:44,f:'s'},{k:'desk',x:760,y:420,w:60,h:44,f:'s'},{k:'desk',x:1020,y:420,w:60,h:44,f:'s'},
      {k:'desk',x:500,y:610,w:60,h:44,f:'s'},{k:'desk',x:760,y:610,w:60,h:44,f:'s'},{k:'desk',x:1020,y:610,w:60,h:44,f:'s'},
      {k:'shelf',x:100,y:816,w:200,h:24,f:'n'},{k:'shelf',x:1040,y:816,w:200,h:24,f:'n'},
      {k:'locker',x:1340,y:120,w:30,h:240,f:'w'},{k:'locker',x:1340,y:560,w:30,h:200,f:'w'},
      {k:'bin',x:110,y:300,w:16,h:16},{k:'bin',x:1300,y:800,w:16,h:16},
      {k:'rug',x:380,y:330,w:700,h:380,c:0x2a1a3a},{k:'stain',x:900,y:520,r:55},{k:'stain',x:300,y:640,r:40},{k:'stain',x:1150,y:200,r:45},
      {k:'window',x:230,y:60,w:140,f:'s'},{k:'window',x:1180,y:60,w:130,f:'s'},{k:'window',x:560,y:840,w:160,f:'n'},{k:'window',x:800,y:840,w:160,f:'n'},
      {k:'window',x:30,y:250,w:120,f:'e'},{k:'window',x:30,y:700,w:120,f:'e'},
      {k:'poster',x:380,y:60,w:26,f:'s',c:0x6a4a2a},{k:'poster',x:1000,y:60,w:26,f:'s',c:0x3a5a7a},{k:'poster',x:30,y:130,w:26,f:'e',c:0x5a3a6a}]},
  ward:{w:1100,h:760,   // START ROOM: Aki wakes up here. No statues. Door to the hall is locked by a keypad (puzzle 1).
    walls:[[0,0,1100,60],[0,700,1100,60],[0,60,30,640],[1070,60,30,640]],
    hides:[],desks:[],doors:[{x:1040,y:290,w:30,h:120,to:'hall',tx:100,ty:450,need:'ward',msg:'Locked. There is a keypad beside the door.'},{x:30,y:390,w:30,h:120,to:'store',tx:790,ty:450}],
    statues:[],
    props:[
      {k:'bed',x:100,y:60,w:50,h:90,f:'s'},{k:'bed',x:260,y:60,w:50,h:90,f:'s'},{k:'bed',x:420,y:60,w:50,h:90,f:'s'},{k:'bed',x:580,y:60,w:50,h:90,f:'s'},{k:'bed',x:880,y:610,w:50,h:90,f:'n'},
      {k:'locker',x:300,y:670,w:100,h:30,f:'n'},{k:'table',x:480,y:380,w:120,h:48,f:'s'},{k:'bench',x:700,y:640,w:120,h:18,f:'s'},{k:'bin',x:120,y:640,w:16,h:16},
      {k:'pad',x:1070,y:450,f:'w'},{k:'rug',x:250,y:230,w:500,h:240,c:0x2a1a3a},{k:'stain',x:760,y:520,r:44},
      {k:'window',x:205,y:60,w:100,f:'s'},{k:'window',x:525,y:60,w:100,f:'s'},{k:'clock',x:760,y:60,f:'s'},{k:'window',x:560,y:700,w:140,f:'n'},{k:'window',x:160,y:700,w:120,f:'n'},
      {k:'window',x:30,y:250,w:120,f:'e'},{k:'window',x:30,y:610,w:120,f:'e'},{k:'window',x:1070,y:600,w:120,f:'w'},{k:'poster',x:30,y:685,w:26,f:'e',c:0x7a3a3a}]},
  lib:{w:1300,h:800,   // Library: statues hide among the stacks. The safe holds the exit key (puzzle 3).
    walls:[[0,0,1300,60],[0,740,1300,60],[0,60,30,680],[1270,60,30,680],...HL],
    hides:HL,desks:[],doors:[{x:30,y:390,w:30,h:120,to:'class',tx:1270,ty:450},{x:1240,y:560,w:30,h:120,to:'chapel',tx:100,ty:450}],safe:[1226,380,44,44],
    statues:[],
    props:[
      {k:'shelf',x:300,y:60,w:260,h:24,f:'s'},{k:'shelf',x:700,y:60,w:260,h:24,f:'s'},
      {k:'shelf',x:300,y:300,w:300,h:24,f:'s'},{k:'shelf',x:700,y:300,w:300,h:24,f:'s'},{k:'shelf',x:300,y:480,w:300,h:24,f:'n'},{k:'shelf',x:700,y:480,w:300,h:24,f:'n'},
      {k:'shelf',x:100,y:716,w:200,h:24,f:'n'},{k:'shelf',x:1000,y:716,w:200,h:24,f:'n'},
      {k:'table',x:620,y:620,w:120,h:48,f:'s'},{k:'table',x:1050,y:500,w:120,h:48,f:'s'},{k:'safe',x:1226,y:380,w:44,h:44,f:'w'},
      {k:'bin',x:70,y:700,w:16,h:16},{k:'rug',x:400,y:530,w:500,h:160,c:0x1a2a3a},{k:'stain',x:850,y:420,r:46},{k:'stain',x:200,y:300,r:36},
      {k:'window',x:630,y:60,w:100,f:'s'},{k:'window',x:1060,y:60,w:100,f:'s'},{k:'clock',x:1000,y:60,f:'s'},{k:'window',x:520,y:740,w:140,f:'n'},{k:'window',x:780,y:740,w:140,f:'n'},
      {k:'window',x:30,y:200,w:120,f:'e'},{k:'window',x:30,y:620,w:120,f:'e'},{k:'poster',x:1270,y:250,w:26,f:'w',c:0x3a5a7a},{k:'poster',x:1270,y:710,w:26,f:'w',c:0x6a4a2a}]}
  ,
  store:{w:900,h:700,   // Supply closet, west of the infirmary. No puzzle: just clues and a battery.
    walls:[[0,0,900,60],[0,640,900,60],[0,60,30,580],[870,60,30,580],...HS],
    hides:HS,desks:[],doors:[{x:30,y:390,w:30,h:120,to:'boiler',tx:890,ty:450},{x:840,y:390,w:30,h:120,to:'ward',tx:100,ty:450}],
    statues:[],
    props:[
      {k:'shelf',x:150,y:200,w:240,h:24,f:'s'},{k:'shelf',x:500,y:200,w:240,h:24,f:'s'},{k:'shelf',x:150,y:480,w:240,h:24,f:'n'},{k:'shelf',x:500,y:480,w:240,h:24,f:'n'},
      {k:'locker',x:400,y:60,w:240,h:30,f:'s'},{k:'table',x:380,y:300,w:120,h:48,f:'s'},{k:'bin',x:80,y:600,w:16,h:16},
      {k:'rug',x:180,y:330,w:540,h:140,c:0x2a1a22},{k:'stain',x:700,y:330,r:34},
      {k:'window',x:300,y:60,w:100,f:'s'},{k:'window',x:700,y:60,w:100,f:'s'},{k:'window',x:420,y:640,w:120,f:'n'},{k:'poster',x:30,y:200,w:26,f:'e',c:0x5a3a6a}]},
  boiler:{w:1000,h:720,   // Boiler room, west end of the school. One angel, one memory.
    walls:[[0,0,1000,60],[0,660,1000,60],[0,60,30,600],[970,60,30,600],[470,250,60,220],...HB],
    hides:HB,desks:[],doors:[{x:940,y:390,w:30,h:120,to:'store',tx:100,ty:450}],
    statues:[[720,540]],
    props:[
      {k:'locker',x:250,y:60,w:300,h:30,f:'s'},{k:'locker',x:650,y:60,w:160,h:30,f:'s'},{k:'bench',x:200,y:560,w:140,h:18,f:'s'},{k:'table',x:700,y:300,w:120,h:48,f:'s'},{k:'bin',x:80,y:620,w:16,h:16},
      {k:'rug',x:150,y:330,w:250,h:200,c:0x2a1010},{k:'stain',x:620,y:520,r:50},{k:'stain',x:330,y:200,r:36},
      {k:'window',x:30,y:250,w:120,f:'e'},{k:'window',x:30,y:560,w:120,f:'e'},{k:'window',x:700,y:660,w:140,f:'n'},{k:'clock',x:900,y:60,f:'s'},{k:'poster',x:400,y:660,w:26,f:'n',c:0x7a3a3a}]},
  chapel:{w:1100,h:760,   // Chapel, east of the library. Two angels hide among the pews.
    walls:[[0,0,1100,60],[0,700,1100,60],[0,60,30,640],[1070,60,30,640],...HP],
    hides:HP,desks:[],doors:[{x:30,y:390,w:30,h:120,to:'lib',tx:1190,ty:620}],
    statues:[[700,300],[500,580]],
    props:[
      {k:'bench',x:240,y:240,w:200,h:18,f:'s'},{k:'bench',x:240,y:360,w:200,h:18,f:'s'},{k:'bench',x:240,y:480,w:200,h:18,f:'s'},
      {k:'bench',x:660,y:240,w:200,h:18,f:'s'},{k:'bench',x:660,y:360,w:200,h:18,f:'s'},{k:'bench',x:660,y:480,w:200,h:18,f:'s'},
      {k:'table',x:960,y:330,w:60,h:130,f:'w'},{k:'bin',x:90,y:660,w:16,h:16},
      {k:'rug',x:440,y:120,w:200,h:520,c:0x3a1020},{k:'stain',x:540,y:300,r:40},{k:'stain',x:900,y:600,r:46},
      {k:'window',x:350,y:60,w:100,f:'s'},{k:'window',x:550,y:60,w:100,f:'s'},{k:'window',x:750,y:60,w:100,f:'s'},
      {k:'window',x:400,y:700,w:140,f:'n'},{k:'window',x:700,y:700,w:140,f:'n'},
      {k:'window',x:30,y:200,w:120,f:'e'},{k:'window',x:30,y:620,w:120,f:'e'},{k:'window',x:1070,y:200,w:120,f:'w'},{k:'window',x:1070,y:600,w:120,f:'w'}]}
};
const ITEMS=[   // type: frag (memory) · note (clue, kept in the J journal) · bat (battery)
  {id:'f3',type:'frag',room:'ward',x:720,y:320,text:'Memory: a bell rang at midnight and the whole school emptied. You were the only one who stayed behind.'},
  {id:'n0',type:'note',room:'ward',x:440,y:330,text:'Night nurse’s log: “Door code = the number of beds in this ward (count the one you woke in), then the two digits on the medicine cabinet.”'},
  {id:'n1',type:'note',room:'ward',x:350,y:610,text:'Medicine cabinet label, in shaky handwriting: “Dose 07. Always 07.”'},
  {id:'b4',type:'bat',room:'ward',x:200,y:430,text:'Battery +40'},
  {id:'f0',type:'frag',room:'hall',x:180,y:200,text:'Memory: the desks sang in a strange order... 2, 3, 1. (left to right)'},
  {id:'n2',type:'note',room:'hall',x:950,y:140,text:'Trophy case plaque: “HOSHIGAOKA HIGH — Founded 1957.”'},
  {id:'b0',type:'bat',room:'hall',x:1250,y:750,text:'Battery +40'},
  {id:'b2',type:'bat',room:'hall',x:700,y:160,text:'Battery +40'},
  {id:'f1',type:'frag',room:'class',x:130,y:700,text:'Memory: you never left this school, Aki.'},
  {id:'f2',type:'frag',room:'class',x:1280,y:700,text:'Memory: stone only moves when no one is watching. Never look away.'},
  {id:'b1',type:'bat',room:'class',x:1250,y:600,text:'Battery +40'},
  {id:'b3',type:'bat',room:'class',x:600,y:760,text:'Battery +40'},
  {id:'n3',type:'note',room:'lib',x:1100,y:640,text:'Librarian’s sticky note: “Safe combination = the year the school was founded, written backwards. Memory runs backwards, the old man always said.”'},
  {id:'f4',type:'frag',room:'lib',x:650,y:400,text:'Memory: the statues were the students who would not leave. Stone is what remains of anyone who looks away.'},
  {id:'b5',type:'bat',room:'lib',x:200,y:640,text:'Battery +40'},
  {id:'b6',type:'bat',room:'lib',x:1100,y:300,text:'Battery +40'},
  {id:'n4',type:'note',room:'store',x:620,y:380,text:'Caretaker’s tag on a mop bucket: “Boiler room is past the supply closet. The furnace never goes cold. Neither do the things that sleep beside it.”'},
  {id:'b7',type:'bat',room:'store',x:700,y:580,text:'Battery +40'},
  {id:'f5',type:'frag',room:'boiler',x:700,y:430,text:'Memory: you rang the midnight bell yourself. You wanted the night to end. The stone heard you.'},
  {id:'b8',type:'bat',room:'boiler',x:200,y:430,text:'Battery +40'},
  {id:'n5',type:'note',room:'chapel',x:560,y:170,text:'Candle stub, scratched with a key: “One flame for every name. Aki was the last one to leave.”'},
  {id:'f6',type:'frag',room:'chapel',x:900,y:560,text:'Memory: they gather here every midnight and wait, kneeling, for you to look away.'},
  {id:'b9',type:'bat',room:'chapel',x:200,y:620,text:'Battery +40'}
];
/* ---------- ROOM SIZE: every room is stretched by ROOM_SCALE once the tables above are read. Things fixed to a wall stay on that wall, everything else spreads out. Set ROOM_SCALE=1 for the original size. ---------- */
const ROOM_SCALE=.9;
(()=>{const old={},nw={},nh={};for(const id in ROOMS){old[id]={w:ROOMS[id].w,h:ROOMS[id].h};nw[id]=Math.round(old[id].w*ROOM_SCALE);nh[id]=Math.round(old[id].h*ROOM_SCALE)}
  const fx=id=>(nw[id]-60)/(old[id].w-60),fy=id=>(nh[id]-120)/(old[id].h-120),MX=(id,x)=>30+(x-30)*fx(id),MY=(id,y)=>60+(y-60)*fy(id);
  const rect=(id,[x,y,w,h])=>{const W=old[id].w,H=old[id].h,W2=nw[id],H2=nh[id];
    const nx=x<=32?x:x+w>=W-32?W2-(W-x):MX(id,x+w/2)-w/2,ny=y<=62?y:y+h>=H-62?H2-(H-y):MY(id,y+h/2)-h/2;return[Math.round(nx),Math.round(ny),w,h]};
  const prop=(id,p)=>{const q={...p},W=old[id].w,H=old[id].h,W2=nw[id],H2=nh[id];
    if(p.k==='rug'){q.w=p.w*fx(id);q.h=p.h*fy(id);q.x=Math.round(MX(id,p.x+p.w/2)-q.w/2);q.y=Math.round(MY(id,p.y+p.h/2)-q.h/2)}
    else if(p.r!==undefined){q.x=Math.round(MX(id,p.x));q.y=Math.round(MY(id,p.y))}
    else if(p.h===undefined){   // mounted on a wall (window, poster, clock, board, keypad)
      if(p.f==='s')q.x=Math.round(MX(id,p.x));else if(p.f==='n'){q.x=Math.round(MX(id,p.x));q.y=H2-(H-p.y)}else if(p.f==='e')q.y=Math.round(MY(id,p.y));else{q.x=W2-(W-p.x);q.y=Math.round(MY(id,p.y))}}
    else{const r=rect(id,[p.x,p.y,p.w,p.h]);q.x=r[0];q.y=r[1]}return q};
  for(const id in ROOMS){const R=ROOMS[id],W2=nw[id],H2=nh[id],hd=R.hides.map(r=>rect(id,r)),dk=R.desks.map(r=>rect(id,r));
    const rest=R.walls.slice(4).map(w=>{const i=R.hides.indexOf(w),j=R.desks.indexOf(w);return i>=0?hd[i]:j>=0?dk[j]:rect(id,w)});   // same array objects as hides/desks, like before
    R.walls=[[0,0,W2,60],[0,H2-60,W2,60],[0,60,30,H2-120],[W2-30,60,30,H2-120],...rest];R.hides=hd;R.desks=dk;
    R.doors=R.doors.map(d=>{const r=rect(id,[d.x,d.y,d.w,d.h]);return{...d,x:r[0],y:r[1]}});
    if(R.exit){const r=rect(id,[R.exit.x,R.exit.y,R.exit.w,R.exit.h]);R.exit={...R.exit,x:r[0],y:r[1]}}
    if(R.safe)R.safe=rect(id,R.safe);
    R.statues=R.statues.map(([x,y])=>[Math.round(MX(id,x)),Math.round(MY(id,y))]);
    R.props=R.props.map(p=>prop(id,p));R.w=W2;R.h=H2}
  for(const id in ROOMS)for(const d of ROOMS[id].doors){const t=d.to,W=old[t].w;d.tx=Math.round(d.tx<W/2?d.tx:nw[t]-(W-d.tx));d.ty=Math.round(MY(t,d.ty))}   // where you arrive in the next room
  for(const it of ITEMS){it.x=Math.round(MX(it.room,it.x));it.y=Math.round(MY(it.room,it.y))}})();
const TOTAL=ITEMS.filter(i=>i.type==='frag').length;   // memory fragments needed for the true ending
const CODES={   // keypad puzzles
  ward:{code:'507',t:'WARD DOOR',ok:()=>{G.ward=true;say('Click. The ward door unlocks.',4);beep(900,.4)}},
  safe:{code:'7591',t:'LIBRARY SAFE',ok:()=>{G.safe=G.hasKey=true;say('The safe swings open. Inside: the exit key!',5);beep(900,.5)}}
};
/* ---------- state ---------- */
let G={state:'menu'},P,keys={},msg='',msgT=0,trans=null,flickT=0,t0=0,lockT=0,wakeT=0,lieT=0,PAD=null,scareT=0,shakeT=0,flashT=0,boT=0,boNext=40,hurtCd=0,sCd=0,heartT=0,actx,yaw=0,pitch=0,ST=[],muted=false;
try{muted=!!JSON.parse(ls.get('eam_set')||'{}').mute}catch(e){}
function intro(){G.state='intro';document.exitPointerLock();showScreen('intro')}
function newGame(){G={state:'play',room:'ward',hasKey:false,libKey:false,ward:false,safe:false,taken:[],seq:0,solved:false,bats:0,vis:{}};P={x:BED_OUT[0],y:BED_OUT[1],hp:100,bat:100,light:true,hidden:false,vx:0,vy:0,bob:0,ph:0};yaw=0;pitch=1.05;wakeT=3;enter();say('You wake in a locked infirmary. Find a way out of the building.',6);save();lieT=LIE;P.x=BED_IN[0];P.y=BED_IN[1]}
/* WAKE-UP: Aki starts lying in the bed (x:880,y:610 in the ward), staring at the ceiling, then sits up and swings out of it. LIE = seconds, BED_IN = where she lies, BED_OUT = where she ends up standing */
const LIE=7,BED=ROOMS.ward.props.find(p=>p.k==='bed'&&p.f==='n'),BED_IN=[BED.x+BED.w/2,BED.y+BED.h/2],BED_OUT=[BED_IN[0],BED.y-30];   // taken from the bed prop so it follows any room resize
function lieE(){const u=Math.max(0,lieT/LIE);if(lieT<=0||u>=.5)return lieT>0?0:1;const k=1-u/.5;return k*k*(3-2*k)}   // 0 = lying down, 1 = standing, smooth
function lieH(){return .8+.8*lieE()+Math.sin(t0*1.3)*.006*(1-lieE())}
function liePitch(){const e=lieE();return 1.05*(1-e)+Math.sin(t0*.7)*.06*(1-e)}
function loadGame(){let s;try{s=JSON.parse(ls.get(SAVE))}catch(e){}if(!s)return;G={state:'play',room:s.room,hasKey:s.hasKey,libKey:s.libKey,ward:s.ward,safe:s.safe,taken:s.taken,seq:0,solved:s.solved,bats:s.bats||0,vis:s.vis||{}};P={x:s.x,y:s.y,hp:Math.max(s.hp,50),bat:Math.max(s.bat,30),light:true,hidden:false,vx:0,vy:0,bob:0,ph:0};pitch=0;enter()}
function enter(){strobeT=strobeCd=0;strobeLvl=1;sta=100;tired=false;breath=BREATH_MAX;holding=gasped=needRel=false;hDet=0;G.vis=G.vis||{};G.vis[G.room]=1;apT=rnd(25,50);doorT=0;if(phantom){scene.remove(phantom.g);phantom=null}trans=null;boT=0;boNext=35+Math.random()*35;shakeT=flashT=hurtCd=heartT=blinkT=blinkCd=0;eyeT=BLINK_EVERY;sCd=6;showScreen(null);buildRoom();spawnStatues();spawnHollow();startAmbience();lock()}
function save(){ls.set(SAVE,JSON.stringify({room:G.room,x:P.x,y:P.y,hp:P.hp,bat:P.bat,hasKey:G.hasKey,libKey:G.libKey,ward:G.ward,safe:G.safe,taken:G.taken,solved:G.solved,bats:G.bats,vis:G.vis}))}
function say(t,d=3.5){if(touchMode)t=t.replace(/press B/i,'tap 🔋');msg=t;msgT=d}
/* ---------- audio ---------- */
let master,ambG,ambOn=false,ambT=8,STEPB,blinkT=0,blinkCd=0,eyeT=20,blinkLen=.32,punchT=0,phantom=null,apT=30,doorT=0,sta=100,tired=false,runK=0,backA=0;
/* ---------- FLASHLIGHT STROBE: the torch blinks wildly when you meet an angel (it comes into view, or gets within STROBE_NEAR px). Tune the values here. ---------- */
let strobeT=0,strobeCd=0,strobeK=0,strobeLvl=1;const STROBE_LEN=1.2,STROBE_NEAR=380,STROBE_COOLDOWN=4;
function strobe(len){strobeT=Math.max(strobeT,len);strobeK=0;flickT=Math.max(flickT,.15)}
const WALK=130,RUN=215,STA_DRAIN=26,STA_REGEN=18,BACK_SPEED=14,BLINK=.32,BLINK_CD=.9,BLINK_EVERY=20,BLINK_FORCED=.5,BLINK_LUNGE=260,BAT_DRAIN=.6;   // blink length and cooldown in seconds (G): while your eyes are shut the statues can move
/* one shared audio graph: everything goes through `master`, which also feeds a reverb so sounds echo through the empty school */
function AC(){if(!actx){actx=new(window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.connect(actx.destination);
  if(GFX.reverb){const len=actx.sampleRate*2.4|0,ir=actx.createBuffer(2,len,actx.sampleRate);for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
    const cv=actx.createConvolver(),w=actx.createGain();cv.buffer=ir;w.gain.value=.3;master.connect(cv);cv.connect(w);w.connect(actx.destination)}}
  if(actx.state==='suspended')actx.resume();return actx}
/* Ambience: a low building drone that slowly breathes + a bed of wind. Mute (M) silences it too. */
function startAmbience(){if(ambOn)return;try{AC();ambOn=true;ambG=actx.createGain();ambG.gain.value=muted?0:1;ambG.connect(master);
  const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=150;const dg=actx.createGain();dg.gain.value=.05;lp.connect(dg);dg.connect(ambG);
  for(const f of[43,43.6,64.7]){const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(lp);o.start()}
  const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=.08;lg.gain.value=60;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
  const n=actx.sampleRate*6|0,b=actx.createBuffer(1,n,actx.sampleRate),d=b.getChannelData(0);let l=0;
  for(let i=0;i<n;i++){l=l*.97+(Math.random()*2-1)*.03;d[i]=l*5*Math.min(1,i/6000,(n-i)/6000)}
  const src=actx.createBufferSource(),bp=actx.createBiquadFilter(),wg=actx.createGain();src.buffer=b;src.loop=true;bp.type='bandpass';bp.frequency.value=380;bp.Q.value=.6;wg.gain.value=.22;
  const wl=actx.createOscillator(),wlg=actx.createGain();wl.frequency.value=.13;wlg.gain.value=.12;wl.connect(wlg);wlg.connect(wg.gain);wl.start();
  src.connect(bp);bp.connect(wg);wg.connect(ambG);src.start()}catch(e){}}
/* distant creak of old wood / stone, played at random */
function creak(){if(muted||!actx)return;try{const t=actx.currentTime,o=actx.createOscillator(),f=actx.createBiquadFilter(),g=actx.createGain(),d=rnd(.5,1.2);
  o.type='sawtooth';o.frequency.setValueAtTime(rnd(90,160),t);o.frequency.linearRampToValueAtTime(rnd(50,200),t+d);f.type='bandpass';f.frequency.value=rnd(300,700);f.Q.value=6;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+d*.3);g.gain.linearRampToValueAtTime(0,t+d);o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+d)}catch(e){}}
/* footstep: a short filtered noise scuff + a low thud */
function step(run){if(muted||!actx)return;try{const t=actx.currentTime;if(!STEPB){const n=actx.sampleRate*.14|0;STEPB=actx.createBuffer(1,n,actx.sampleRate);const d=STEPB.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,4)}
  const s=actx.createBufferSource(),f=actx.createBiquadFilter(),g=actx.createGain();s.buffer=STEPB;f.type='lowpass';f.frequency.value=rnd(420,820);g.gain.value=rnd(.16,.26)*(run?1.7:1);s.connect(f);f.connect(g);g.connect(master);s.start(t);
  const o=actx.createOscillator(),og=actx.createGain();o.frequency.setValueAtTime(rnd(75,95),t);o.frequency.exponentialRampToValueAtTime(40,t+.1);og.gain.setValueAtTime(.12,t);og.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(og);og.connect(master);o.start(t);o.stop(t+.13)}catch(e){}}
function beep(f,d,type='sine',v=.15){if(muted)return;try{AC();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d);o.connect(g);g.connect(master);o.start();o.stop(actx.currentTime+d)}catch(e){}}
/* Jumpscare sound: dissonant falling screech + noise burst. big=true for the death scare. */
function stinger(big){punchT=big?1.3:.9;if(muted)return;try{AC();const t=actx.currentTime,d=big?1.4:.7,
  mk=(type,f0,f1,v)=>{const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d)};
  mk('sine',110,30,big?.6:.4);mk('sawtooth',620,90,.24);mk('square',655,70,.14);mk('sawtooth',1240,200,.1);
  const n=actx.sampleRate*d|0,buf=actx.createBuffer(1,n,actx.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);
  const src=actx.createBufferSource(),g=actx.createGain();src.buffer=buf;g.gain.value=big?.45:.28;src.connect(g);g.connect(master);src.start(t)}catch(e){}}
/* ---------- HORROR SCORE (all synthesised, no audio files). A creepy music-box lullaby over a dissonant drone on the menu, and in the game a score that follows the danger: strings and a heartbeat swell as an angel closes in, the lullaby warps flat, and whispers creep in. Starts on your first click / key press. M mutes it. ---------- */
const MUSIC_VOL=.85;
let musG,musOn=false,musL={},musTen=0,musIdx=0,musNoteT=0,musSwT=0,musWhT=0,musBeatT=0,musNoise;
const LULLABY=[0,3,7,5,3,2,0,-2,  0,3,7,10,8,7,5,3,  2,5,8,7,5,3,2,-1];   // semitones above D4 (D minor)
function musInit(){if(musG)return;AC();musG=actx.createGain();musG.gain.value=muted||umaOn?0:MUSIC_VOL;musG.connect(master);
  const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=220;lp.Q.value=3;const dg=actx.createGain();dg.gain.value=0;lp.connect(dg);dg.connect(musG);   // drone: D1 + a minor second + fifth
  for(const f of[36.71,38.89,55,73.42,73.9]){const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(lp);o.start()}
  const lf=actx.createOscillator(),lg=actx.createGain();lf.frequency.value=.07;lg.gain.value=90;lf.connect(lg);lg.connect(lp.frequency);lf.start();
  const sg=actx.createGain();sg.gain.value=0;const bp=actx.createBiquadFilter();bp.type='lowpass';bp.frequency.value=2600;const tr=actx.createGain();tr.gain.value=.55;   // screeching strings (tremolo)
  const tl=actx.createOscillator(),tg=actx.createGain();tl.frequency.value=6.5;tg.gain.value=.45;tl.connect(tg);tg.connect(tr.gain);tl.start();
  for(const f of[587.33,622.25,880,932.33,1244.5]){const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=rnd(-14,14);const vg=actx.createGain();vg.gain.value=.2;o.connect(vg);vg.connect(bp);o.start()}
  bp.connect(tr);tr.connect(sg);sg.connect(musG);
  const n=actx.sampleRate|0;musNoise=actx.createBuffer(1,n,actx.sampleRate);const d=musNoise.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
  musL={drone:dg,lp,str:sg}}
function musBox(f,v,at,bend){for(const[m,a,dd]of[[1,1,1],[2.76,.34,.5],[5.4,.12,.25]]){const o=actx.createOscillator(),g=actx.createGain(),d=2.6;o.type='sine';o.frequency.setValueAtTime(f*m,at);o.frequency.exponentialRampToValueAtTime(f*m*(1-bend),at+d);   // a music box that sags flat
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(v*a,at+.008);g.gain.exponentialRampToValueAtTime(.0008,at+d*dd);o.connect(g);g.connect(musG);o.start(at);o.stop(at+d+.1)}}
function musSwell(ten,at){const d=rnd(5.5,8.5),lp=actx.createBiquadFilter(),g=actx.createGain(),v=.045+.05*ten;lp.type='lowpass';lp.frequency.setValueAtTime(260,at);lp.frequency.linearRampToValueAtTime(1100+1200*ten,at+d*.6);lp.frequency.linearRampToValueAtTime(200,at+d);   // a wrong, choir-like chord swelling out of nothing
  g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(v,at+d*.55);g.gain.linearRampToValueAtTime(0,at+d);lp.connect(g);g.connect(musG);
  for(const f of(Math.random()<.5?[146.83,174.61,220,311.13]:[130.81,155.56,185,277.18])){for(const dt of[-9,8]){const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;o.connect(lp);o.start(at);o.stop(at+d+.1)}}}
function musWhisper(at,v){if(!musNoise)return;const pan=actx.createStereoPanner?actx.createStereoPanner():null;if(pan)pan.pan.value=rnd(-1,1);let t=at;   // breathy bursts that almost sound like words, panned to one ear
  for(let i=0,n=3+(Math.random()*5|0);i<n;i++){const s=actx.createBufferSource(),bp=actx.createBiquadFilter(),g=actx.createGain(),d=rnd(.06,.16);s.buffer=musNoise;bp.type='bandpass';bp.frequency.value=rnd(1400,3800);bp.Q.value=rnd(3,7);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.linearRampToValueAtTime(0,t+d);s.connect(bp);bp.connect(g);g.connect(pan||musG);s.start(t,Math.random()*.8,d+.05);t+=d+rnd(.02,.09)}
  if(pan)pan.connect(musG)}
function musThump(at,v){const o=actx.createOscillator(),g=actx.createGain();o.frequency.setValueAtTime(70,at);o.frequency.exponentialRampToValueAtTime(34,at+.16);g.gain.setValueAtTime(v,at);g.gain.exponentialRampToValueAtTime(.001,at+.2);o.connect(g);g.connect(musG);o.start(at);o.stop(at+.22)}
function gameTension(){if(G.state==='scare'||G.state==='hscare')return 1;if(G.state==='over')return 0;if(G.state==='win')return .05;
  let k=angelsOn()?.22:.07;if(P&&ST.length)for(const s of ST){const d=s.d||9999;k=Math.max(k,s.seen?Math.min(.55,.15+(1-d/900)*.4):1-d/650)}   // an unseen angel closing in is the scariest thing
  if(P&&HO&&HO.delay<=0&&G.state==='play')k=Math.max(k,hDet*.95,Math.max(0,1-HO.d/520)*.6);   // the hollow listening nearby
  if(P&&P.hp<100)k=Math.max(k,1-P.hp/100);if(boT>0)k=1;if(G.state!=='play')k*=.6;return Math.max(0,Math.min(1,k))}
function musTick(){if(!musG||!actx)return;const t=actx.currentTime,menu=G.state==='menu'||G.state==='intro'||!P;
  musTen+=((menu?.2+.08*Math.sin(t*.2):gameTension())-musTen)*.12;const ten=musTen;
  musL.drone.gain.setTargetAtTime(menu?.1:G.state==='over'?.01:.05+.08*ten,t,.5);musL.lp.frequency.setTargetAtTime(150+450*ten,t,.5);musL.str.gain.setTargetAtTime(menu?0:Math.max(0,ten-.3)*.2,t,.25);
  if(muted){musNoteT=musSwT=musWhT=musBeatT=t+1;return}
  if(musNoteT<t-1)musNoteT=t;
  while(musNoteT<t+.3){   // music box: steady on the menu, sparser and sicker as the danger rises
    if(Math.random()<(menu?.92:ten<.55?.6:.18)){let n=LULLABY[musIdx++%LULLABY.length];const r=Math.random();if(r<.05+ten*.2)n+=1;else if(r<.07+ten*.25)n+=6;   // wrong notes creep in
      musBox(293.66*Math.pow(2,n/12),menu?.12:.06+.05*(1-ten),musNoteT,.004+.05*ten)}
    musNoteT+=(menu?.62:.7)*rnd(.9,1.35)*(1+ten*.7)+(Math.random()<.1?rnd(2.5,5):0)}
  if(musSwT<t){if(menu||ten>.15)musSwell(ten,t+.05);musSwT=t+(menu?rnd(11,17):rnd(16,30))}
  if(musWhT<t){if(menu||(angelsOn()&&ten>.25))musWhisper(t+.05,.04+.05*ten);musWhT=t+(menu?rnd(9,20):rnd(7,16))}
  if(!menu&&ten>.45&&musBeatT<t){musThump(t+.02,.3*ten);musThump(t+.2,.2*ten);musBeatT=t+1.25-.8*ten}}
function musGo(){if(musOn)return;try{musInit();musOn=true;setInterval(musTick,100)}catch(e){}}
addEventListener('pointerdown',musGo);addEventListener('keydown',musGo);addEventListener('touchend',musGo);addEventListener('click',musGo);
/* ---------- three.js scene ---------- */
const R3=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});R3.setPixelRatio(Math.min(devicePixelRatio,GFX.pixelRatio));$('wrap').prepend(R3.domElement);
/* colour pipeline: textures are sRGB, lighting is linear, ACES tone mapping rolls off the bright torch spot like a real camera */
R3.outputEncoding=THREE.sRGBEncoding;R3.toneMapping=THREE.ACESFilmicToneMapping;R3.toneMappingExposure=GFX.exposure;
if(GFX.shadows){R3.shadowMap.enabled=true;R3.shadowMap.type=THREE.PCFSoftShadowMap}
const lin=h=>new THREE.Color(h).convertSRGBToLinear();   // hex colours are written as normal sRGB hex; this converts them for the linear pipeline
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(70,1,.1,60);cam.rotation.order='YXZ';scene.add(cam);
scene.fog=new THREE.FogExp2(lin(0x03050f),.11);scene.background=new THREE.Color(0x03050f);scene.add(new THREE.AmbientLight(0x2a3566,.1));
const moon=new THREE.DirectionalLight(0x5566aa,.07);moon.position.set(6,10,4);scene.add(moon);   // faint cold light so shapes read in the dark
/* Flashlight: beam starts at the camera and points dead-centre (at the crosshair). Tweak the look here. */
const FLASH={color:0xfff0c8,intensity:2.6,range:24,angle:.36,penumbra:.55,decay:1};
const spot=new THREE.SpotLight(FLASH.color,FLASH.intensity,FLASH.range,FLASH.angle,FLASH.penumbra,FLASH.decay);spot.position.set(0,0,0);spot.target.position.set(0,0,-1);
const torch=new THREE.Group();torch.add(spot,spot.target);scene.add(torch);   // held low and to the right, and lags a little behind where you look
if(GFX.shadows){spot.castShadow=true;spot.shadow.mapSize.set(GFX.shadowSize,GFX.shadowSize);spot.shadow.camera.near=.08;spot.shadow.bias=-.0004;spot.shadow.normalBias=.03;spot.shadow.radius=4}
const _q1=new THREE.Quaternion(),_o=new THREE.Vector3();
function syncTorch(dt,snap){_o.set(.17,-.16,0).applyQuaternion(cam.quaternion);torch.position.copy(cam.position).add(_o);
  if(snap||!GFX.flashSway)torch.quaternion.copy(cam.quaternion);else torch.quaternion.slerp(cam.quaternion,Math.min(1,dt*12))}
const glow=new THREE.PointLight(0x4455aa,.08,4);cam.add(glow);
const spill=new THREE.SpotLight(0xffe2b0,0,FLASH.range*.7,FLASH.angle*2.4,1,1.4);spill.position.set(0,0,0);spill.target=spot.target;torch.add(spill);   // wide soft spill around the hot centre of the torch, like a real reflector
scene.add(new THREE.HemisphereLight(0x3a4a8a,0x2a1812,.07));   // cold sky bounce from above, warm dusty bounce from the floor
   // faint ambient halo so the beam reads as the bright centre
function resize(){const w=$('wrap').clientWidth,h=$('wrap').clientHeight;R3.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}addEventListener('resize',resize);resize();
/* ---------- procedural textures & materials (no image files needed) ---------- */
const rnd=(a,b)=>a+Math.random()*(b-a);
const MAXA=Math.min(8,R3.capabilities.getMaxAnisotropy());
const TEXK=MOBILE?1:2;   // texture detail: canvases are drawn TEXK times bigger (2 = double resolution on desktop, 1 on phones)
/* seamless fractal noise: gives every surface soft grime, mottling and fine grain on top of the painted detail */
const _nzG={};function nzG(n){return _nzG[n]||(_nzG[n]=Float32Array.from({length:n*n},Math.random))}
function fbm(x,y){let v=0,a=.5,t=0;for(let n=8;n<=128;n*=2){const gx=x*n,gy=y*n,x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),G=nzG(n),i0=x0%n,j0=y0%n,i1=(x0+1)%n,j1=(y0+1)%n,
    a0=G[j0*n+i0],a1=G[j0*n+i1],b0=G[j1*n+i0],b1=G[j1*n+i1],top=a0+(a1-a0)*sx;v+=a*(top+(b0+(b1-b0)*sx-top)*sy);t+=a;a*=.55}return v/t}
function grime(c,data){const g=c.getContext('2d'),W=c.width,H=c.height,im=g.getImageData(0,0,W,H),d=im.data;if(d[3]<250)return;   // skip see-through textures (clock, light shafts)
  const ox=Math.random(),oy=Math.random(),amt=data?.5:.34,gr=data?.08:.05;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,m=1+((fbm(((x+.5)/W+ox)%1,((y+.5)/H+oy)%1)-.5)*amt+(Math.random()-.5)*gr)*2;d[i]*=m;d[i+1]*=m;d[i+2]*=m}
  g.putImageData(im,0,0)}
function ctex(w,h,draw,data){const c=document.createElement('canvas');c.width=w*TEXK;c.height=h*TEXK;const g=c.getContext('2d');g.scale(TEXK,TEXK);draw(g,w,h);if(w>=64&&h>=64)grime(c,data);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=MAXA;if(!data)t.encoding=THREE.sRGBEncoding;return t}   // data=true for bump / roughness maps (not colours)
/* little painter helpers for the textures below */
function wrapDraw(w,h,x,y,fn){for(const ox of[-w,0,w])for(const oy of[-h,0,h])fn(x+ox,y+oy)}   // draws at wrapped offsets so repeating textures have no seams
function blotch(g,w,h,x,y,r,rgb,a){wrapDraw(w,h,x,y,(px,py)=>{if(px+r<0||px-r>w||py+r<0||py-r>h)return;const q=g.createRadialGradient(px,py,0,px,py,r);q.addColorStop(0,`rgba(${rgb},${a})`);q.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=q;g.fillRect(px-r,py-r,r*2,r*2)})}
function speckle(g,w,h,amt){const W=g.canvas.width,H=g.canvas.height,im=g.getImageData(0,0,W,H),d=im.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*amt;d[i]+=n;d[i+1]+=n;d[i+2]+=n}g.putImageData(im,0,0)}
const crackList=n=>Array.from({length:n},()=>{let x=rnd(10,240),y=rnd(10,240);const p=[[x,y]];for(let i=0;i<8;i++){x+=rnd(-15,15);y+=rnd(5,18);p.push([x,y])}return p});
const CRK=crackList(5),SCR=crackList(9);   // shared crack paths so the colour, bump and gloss maps agree
const cracks=(g,col,lw,list)=>{g.strokeStyle=col;g.lineWidth=lw;for(const p of list){g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke()}};
const tileGrid=(g,w,h,col,lw)=>{g.strokeStyle=col;g.lineWidth=lw;g.beginPath();for(let k=0;k<=w;k+=64){g.moveTo(k,0);g.lineTo(k,h);g.moveTo(0,k);g.lineTo(w,k)}g.stroke()};
const _tc={},tcache=(key,base,rx,ry)=>_tc[key]||(_tc[key]=(()=>{const t=base.clone();t.needsUpdate=true;t.repeat.set(rx,ry);return t})());
/* Each surface has a colour map plus a bump map (tiny height detail the lights catch) and, for the floor, a roughness map (scuffed patches shine, grout stays matte). */
const T_FLOOR=ctex(256,256,(g,w,h)=>{for(let i=0;i<4;i++)for(let j=0;j<4;j++){const v=((i+j)%2?36:30)+rnd(-3,3);g.fillStyle=`rgb(${v+4},${v+12},${v+38})`;g.fillRect(i*64,j*64,64,64)}
  speckle(g,w,h,16);for(let k=0;k<26;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(10,34),'0,0,6',rnd(.06,.2));   // grime
  for(let k=0;k<14;k++){g.strokeStyle=`rgba(200,210,255,${rnd(.02,.06)})`;g.lineWidth=rnd(1,3);g.beginPath();const a=rnd(0,6);g.arc(rnd(0,w),rnd(0,h),rnd(10,24),a,a+rnd(.6,1.6));g.stroke()}   // scuff marks
  tileGrid(g,w,h,'#07091a',3);cracks(g,'rgba(4,5,12,.85)',1.3,CRK)});
const T_FLOORB=ctex(256,256,(g,w,h)=>{g.fillStyle='#b4b4b4';g.fillRect(0,0,w,h);speckle(g,w,h,36);for(let k=0;k<20;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(8,22),'0,0,0',.12);tileGrid(g,w,h,'#202020',4);cracks(g,'#101010',2,CRK)},true);
const T_FLOORR=ctex(256,256,(g,w,h)=>{g.fillStyle='#8c8c8c';g.fillRect(0,0,w,h);for(let k=0;k<30;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(14,40),k%3?'255,255,255':'0,0,0',rnd(.12,.3));tileGrid(g,w,h,'#f2f2f2',4)},true);
const T_CEIL=ctex(256,256,(g,w,h)=>{g.fillStyle='#1f2544';g.fillRect(0,0,w,h);speckle(g,w,h,14);for(let k=0;k<10;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(16,46),'30,18,6',rnd(.1,.3));   // water stains
  for(let k=0;k<60;k++){g.fillStyle=`rgba(0,0,0,${Math.random()*.1})`;g.fillRect(rnd(0,w),rnd(0,h),rnd(1,3),rnd(1,3))}tileGrid(g,w,h,'#080b1a',3)});
const T_WALL=ctex(256,384,(g,w,h)=>{const band=(a,b,c)=>{g.fillStyle=c;g.fillRect(0,a*h,w,(b-a)*h)};   // cornice / plaster / chair rail / panelling / skirting, then wear and tear on top
  band(0,.06,'#2a3252');band(.06,.6,'#3f4b78');band(.6,.625,'#1d2340');band(.625,1,'#2a3358');band(.95,1,'#141a30');speckle(g,w,h,18);
  for(let k=0;k<7;k++){const x=rnd(14,242),l=rnd(60,200),gr=g.createLinearGradient(0,.06*h,0,.06*h+l);gr.addColorStop(0,'rgba(8,10,24,.28)');gr.addColorStop(1,'rgba(8,10,24,0)');g.fillStyle=gr;g.fillRect(x,.06*h,rnd(3,9),l)}   // water streaks
  for(let k=0;k<9;k++)blotch(g,w,h,rnd(0,w),rnd(.1,.55)*h,rnd(18,50),'10,12,26',rnd(.12,.3));      // damp patches
  for(let k=0;k<4;k++)blotch(g,w,h,rnd(0,w),rnd(.82,.99)*h,rnd(14,34),'22,40,28',rnd(.2,.4));      // mould near the floor
  for(let k=0;k<5;k++)blotch(g,w,h,rnd(0,w),rnd(.1,.55)*h,rnd(5,12),'120,130,170',rnd(.1,.2));     // flaking paint
  const gr=g.createLinearGradient(0,.8*h,0,h);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=gr;g.fillRect(0,.8*h,w,.2*h);
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,.6*h,w,2);g.fillRect(0,.95*h,w,2)});
const T_WALLB=ctex(256,384,(g,w,h)=>{g.fillStyle='#9a9a9a';g.fillRect(0,0,w,h);speckle(g,w,h,40);for(let k=0;k<9;k++)blotch(g,w,h,rnd(0,w),rnd(.1,.55)*h,rnd(10,26),'0,0,0',.18);
  g.fillStyle='#d0d0d0';g.fillRect(0,.6*h,w,.025*h);g.fillStyle='#202020';g.fillRect(0,.625*h,w,3);g.fillRect(0,.06*h,w,3);   // chair-rail ledge and grooves
  g.fillStyle='#2c2c2c';for(let x=0;x<w;x+=64)g.fillRect(x,.625*h,3,.325*h);   // panel joints
  g.fillStyle='#c0c0c0';g.fillRect(0,.95*h,w,.05*h)},true);
const T_WOOD=ctex(128,128,(g,w,h)=>{g.fillStyle='#e6e6e6';g.fillRect(0,0,w,h);for(let k=0;k<46;k++){const y=rnd(0,h);g.strokeStyle=`rgba(90,90,90,${rnd(.08,.3)})`;g.lineWidth=rnd(.6,2.2);g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=16)g.lineTo(x,y+Math.sin(x*.05+k)*rnd(1,3));g.stroke()}speckle(g,w,h,14)});   // neutral grain, tinted by the material colour
const T_WOODB=ctex(128,128,(g,w,h)=>{g.fillStyle='#c0c0c0';g.fillRect(0,0,w,h);for(let k=0;k<46;k++){const y=rnd(0,h);g.strokeStyle=`rgba(40,40,40,${rnd(.2,.5)})`;g.lineWidth=rnd(.6,1.8);g.beginPath();g.moveTo(0,y);g.lineTo(w,y+rnd(-3,3));g.stroke()}},true);
const _wd={},wood=c=>_wd[c]||(_wd[c]=new THREE.MeshStandardMaterial({color:lin(c),map:T_WOOD,bumpMap:T_WOODB,bumpScale:.6,roughness:.7}));
const T_LOCK=ctex(128,512,(g,w,h)=>{g.fillStyle='#2a3050';g.fillRect(0,0,w,h);for(let k=0;k<50;k++){g.fillStyle=`rgba(${Math.random()<.5?'255,255,255':'0,0,0'},${Math.random()*.06})`;g.fillRect(rnd(0,w),rnd(0,h),rnd(2,14),rnd(4,40))}
  g.strokeStyle='#161b30';g.lineWidth=6;g.strokeRect(3,3,w-6,h-6);g.fillStyle='#12162a';for(let i=0;i<5;i++){g.fillRect(26,40+i*14,76,5);g.fillRect(26,430+i*10,76,4)}
  g.fillStyle='#8a8fa8';g.fillRect(100,240,8,52);g.fillStyle='#161b30';g.fillRect(40,340,48,30)});
const BOOKC=['#6a2a2a','#2a4a6a','#3a5a3a','#6a5a2a','#4a2a5a','#5a3a2a','#2a5a5a','#7a7a6a'];
const T_BOOKS=ctex(256,256,(g,w,h)=>{g.fillStyle='#0e1124';g.fillRect(0,0,w,h);for(let r=0;r<4;r++){const yb=r*64+60;let x=4;
  while(x<250){const bw=rnd(8,18),bh=rnd(34,56);g.fillStyle=BOOKC[Math.random()*BOOKC.length|0];g.fillRect(x,yb-bh,bw,bh);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+2,yb-bh+6,bw-4,3);x+=bw+rnd(0,2);if(Math.random()<.08)x+=rnd(10,30)}
  g.fillStyle='#3a2a22';g.fillRect(0,yb,w,4)}});
const T_WIN=ctex(256,192,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2b3d7a');gr.addColorStop(1,'#111a3c');g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let k=0;k<40;k++){g.fillStyle=`rgba(255,255,255,${rnd(.2,.8)})`;g.fillRect(rnd(0,w),rnd(0,h*.7),2,2)}
  const mg=g.createRadialGradient(200,50,4,200,50,50);mg.addColorStop(0,'rgba(223,230,255,.9)');mg.addColorStop(1,'rgba(223,230,255,0)');g.fillStyle=mg;g.fillRect(140,0,110,110);g.fillStyle='#dfe6ff';g.beginPath();g.arc(200,50,15,0,7);g.fill();
  g.strokeStyle='#0a0d1c';g.lineWidth=14;g.strokeRect(0,0,w,h);g.lineWidth=8;g.beginPath();g.moveTo(85,0);g.lineTo(85,h);g.moveTo(171,0);g.lineTo(171,h);g.moveTo(0,96);g.lineTo(w,96);g.stroke()});
const T_BOARD=ctex(512,128,(g,w,h)=>{g.fillStyle='#16302a';g.fillRect(0,0,w,h);for(let k=0;k<14;k++){g.fillStyle='rgba(255,255,255,.03)';g.beginPath();g.ellipse(rnd(0,w),rnd(0,h),rnd(20,60),rnd(6,16),rnd(0,3),0,7);g.fill()}
  g.font='italic 46px Georgia';g.textAlign='center';g.fillStyle='rgba(235,235,235,.85)';g.fillText('DON’T LOOK AWAY',256,78)});
const T_CLOCK=ctex(128,128,(g)=>{g.fillStyle='#1a1f35';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.fillStyle='#d7d9e4';g.beginPath();g.arc(64,64,55,0,7);g.fill();
  g.strokeStyle='#1a1f35';g.lineWidth=3;for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(64+Math.sin(a)*46,64-Math.cos(a)*46);g.lineTo(64+Math.sin(a)*52,64-Math.cos(a)*52);g.stroke()}
  g.lineWidth=5;g.beginPath();g.moveTo(64,64);g.lineTo(64,32);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(64,64);g.lineTo(67,16);g.stroke();g.strokeStyle='#c8143c';g.lineWidth=1.5;g.beginPath();g.moveTo(64,70);g.lineTo(94,50);g.stroke()});   // stuck at midnight
const T_EXIT=ctex(256,96,(g,w,h)=>{g.fillStyle='#2a0508';g.fillRect(0,0,w,h);g.strokeStyle='#ff3a3a';g.lineWidth=5;g.strokeRect(4,4,w-8,h-8);g.font='bold 62px sans-serif';g.textAlign='center';g.fillStyle='#ff3a3a';g.fillText('EXIT',128,68)});
const _pm={},posterMat=c=>_pm[c]||(_pm[c]=new THREE.MeshStandardMaterial({roughness:1,map:ctex(64,88,(g,w,h)=>{g.fillStyle='#'+new THREE.Color(c).getHexString();g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,w,14);
  for(let k=0;k<3;k++){g.fillStyle=`rgba(255,255,255,${rnd(.15,.35)})`;g.fillRect(rnd(4,20),22+k*16,rnd(20,44),rnd(5,11))}g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2;g.strokeRect(1,1,w-2,h-2)})}));
const mat=(c,e)=>new THREE.MeshStandardMaterial({color:lin(c),roughness:.9,emissive:lin(e||0)});
const _cm={},cm=(c,o)=>{const k=c+(o?JSON.stringify(o):'');return _cm[k]||(_cm[k]=new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.85},o)))};
const T_MOON=ctex(128,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(150,170,255,.9)');gr.addColorStop(1,'rgba(150,170,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(0,0,0,.55)';for(const x of[w*.33,w*.66])g.fillRect(x-3,0,6,h);g.fillRect(0,h*.4,w,6)});   // pale moonlight spilling from a window, with the window bars' shadows
const M_MOON=new THREE.MeshBasicMaterial({map:T_MOON,transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending});
const _wl={},wallMat=len=>{const n=Math.max(1,Math.round(len/2));return _wl[n]||(_wl[n]=new THREE.MeshStandardMaterial({map:tcache('wm'+n,T_WALL,n,1),bumpMap:tcache('wb'+n,T_WALLB,n,1),bumpScale:1,roughness:.93}))};   // one plaster material per wall length so the texture never stretches
const M_TRIM=cm(0x1a2038),M_STONE=mat(0x9a9a9a),M_DOOR=mat(0x7a1230,0x40081a);
const M_TUBE=new THREE.MeshStandardMaterial({color:lin(0x888a99),emissive:lin(0x99aadd),emissiveIntensity:.4}),M_WIN=new THREE.MeshBasicMaterial({map:T_WIN});
const M_BOARD=new THREE.MeshStandardMaterial({map:T_BOARD,roughness:1}),M_CLOCK=new THREE.MeshStandardMaterial({map:T_CLOCK,alphaTest:.5,roughness:.6}),M_EXIT=new THREE.MeshBasicMaterial({map:T_EXIT});
const _lkm={},lockerMat=lw=>{const n=Math.max(1,Math.round(lw/.5));return _lkm[n]||(_lkm[n]=new THREE.MeshStandardMaterial({map:tcache('lk'+n,T_LOCK,n,1),roughness:.45,metalness:.4}))};
const _bkm={},bookMat=lw=>{const n=Math.max(1,Math.round(lw/2.5));return _bkm[n]||(_bkm[n]=new THREE.MeshStandardMaterial({map:tcache('bk'+n,T_BOOKS,n,1),roughness:1}))};
const rep=(t,w,h,k)=>{const c=t.clone();c.needsUpdate=true;c.repeat.set(w*S/k,h*S/k);return c};
const _rm={},roomMats=(n,R)=>_rm[n]||(_rm[n]={floor:new THREE.MeshStandardMaterial({map:rep(T_FLOOR,R.w,R.h,2),bumpMap:rep(T_FLOORB,R.w,R.h,2),bumpScale:1.6,roughnessMap:rep(T_FLOORR,R.w,R.h,2),roughness:1}),ceil:new THREE.MeshStandardMaterial({map:rep(T_CEIL,R.w,R.h,2),roughness:1})});
/* ---------- atmosphere: room lamp, torch haze, drifting dust, film grain, reflected moonlight ---------- */
const LAMP_I=.4,lamp=new THREE.PointLight(0x5566aa,LAMP_I,15,2);scene.add(lamp);   // one dim cold bulb per room (moved in buildRoom) so shapes read even without the torch
const BEAM_L=9,beamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{op:{value:GFX.beam},col:{value:new THREE.Color(0xfff0c8)}},
  vertexShader:`varying vec3 vN;varying vec3 vV;varying float vD;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vD=length(position)/${BEAM_L.toFixed(1)};gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform float op;uniform vec3 col;varying vec3 vN;varying vec3 vV;varying float vD;void main(){float f=abs(dot(normalize(vN),normalize(vV)));float a=op*pow(f,.7)*(1.-vD)*smoothstep(0.,.08,vD);gl_FragColor=vec4(col,a);}`});
const beam=(()=>{const geo=new THREE.ConeGeometry(BEAM_L*Math.tan(FLASH.angle*.8),BEAM_L,32,1,true);geo.translate(0,-BEAM_L/2,0);geo.rotateX(Math.PI/2);   // apex at the torch, opening along -z
  const m=new THREE.Mesh(geo,beamMat);m.renderOrder=2;m.frustumCulled=false;torch.add(m);return m})();
const DUST=GFX.dust?(()=>{const n=GFX.dust,a=new Float32Array(n*3),c=new Float32Array(n*3),v=new Float32Array(n*3);
  for(let i=0;i<n*3;i+=3){a[i]=rnd(-7,7);a[i+1]=rnd(.1,2.9);a[i+2]=rnd(-7,7);v[i]=rnd(-.05,.05);v[i+1]=rnd(-.03,.04);v[i+2]=rnd(-.05,.05)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(a,3));geo.setAttribute('color',new THREE.BufferAttribute(c,3));
  const spr=ctex(32,32,g=>{const q=g.createRadialGradient(16,16,0,16,16,16);q.addColorStop(0,'rgba(255,255,255,1)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,32,32)},true);
  const p=new THREE.Points(geo,new THREE.PointsMaterial({size:.022,map:spr,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));p.frustumCulled=false;p.userData.v=v;scene.add(p);return p})():null;
const _fw=new THREE.Vector3();
/* dust motes drift around you and only glow while they are inside the torch cone */
function dustUpdate(dt){if(!DUST)return;const ar=DUST.geometry.attributes.position.array,co=DUST.geometry.attributes.color.array,V=DUST.userData.v,n=ar.length,on=spot.intensity>0,
    tx=torch.position.x,ty=torch.position.y,tz=torch.position.z,cx=cam.position.x,cz=cam.position.z,ca=Math.cos(FLASH.angle*.95);
  _fw.set(0,0,-1).applyQuaternion(torch.quaternion);
  for(let j=0;j<n;j+=3){let x=ar[j]+V[j]*dt,y=ar[j+1]+V[j+1]*dt,z=ar[j+2]+V[j+2]*dt;
    x-=14*Math.round((x-cx)/14);z-=14*Math.round((z-cz)/14);if(y>2.9||y<.1)V[j+1]*=-1;
    ar[j]=x;ar[j+1]=y;ar[j+2]=z;let b=.012;
    if(on){const dx=x-tx,dy=y-ty,dz=z-tz,d=Math.hypot(dx,dy,dz)||1,cs=(dx*_fw.x+dy*_fw.y+dz*_fw.z)/d;if(cs>ca&&d<14)b+=Math.min(1,(cs-ca)/(1-ca)*1.6)*(1-d/14)*.9}
    co[j]=b;co[j+1]=b*.94;co[j+2]=b*.8}
  DUST.geometry.attributes.position.needsUpdate=DUST.geometry.attributes.color.needsUpdate=true}
const GR=$('grain'),gx=GR&&GR.getContext('2d');let grT=0,grainBoost=0,gim=null;if(GR){GR.width=GR.height=128;gim=gx.createImageData(128,128)}
function grain(dt){if(!GR)return;if(!GFX.grain){GR.style.display='none';return}GR.style.opacity=Math.min(.7,GFX.grain+Math.max(0,grainBoost)*.25);grT-=dt;if(grT>0)return;grT=1/20;
  const d=gim.data;for(let i=0;i<d.length;i+=4){d[i]=d[i+1]=d[i+2]=Math.random()*255;d[i+3]=255}gx.putImageData(gim,0,0)}
function blink(){if(G.state!=='play'||P.hidden||trans||blinkT>0||blinkCd>0)return;blinkT=blinkLen=BLINK;blinkCd=BLINK+BLINK_CD;eyeT=BLINK_EVERY;beep(160,.07,'sine',.05)}
function forceBlink(){blinkT=blinkLen=BLINK_FORCED;blinkCd=BLINK_FORCED+BLINK_CD;eyeT=BLINK_EVERY;beep(130,.09,'sine',.07)}   // your eyes give out after BLINK_EVERY seconds without blinking
const VY=()=>yaw+backA;   // the direction the camera faces (body direction + look-back turn)
function lids(){const c=blinkT>0?Math.sin(Math.min(1,1-blinkT/blinkLen)*Math.PI):(G.state==='play'&&!P.hidden&&eyeT<5?(1-eyeT/5)*.14:0),t=$('lidT'),b=$('lidB');if(!t||!b)return;t.style.transform='translateY('+(-(1-c)*100)+'%)';b.style.transform='translateY('+((1-c)*100)+'%)'}
function fxFrame(dt){lids();const on=spot.intensity>0;beam.visible=on&&GFX.beam>0;beamMat.uniforms.op.value=GFX.beam*spot.intensity/FLASH.intensity;
  lamp.intensity=boT>0?0:LAMP_I*(flickT>0?.15+Math.random()*.5:1);dustUpdate(dt);grain(dt)}
if(GFX.env)try{const pm=new THREE.PMREMGenerator(R3),es=new THREE.Scene(),et=ctex(256,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#10163a');gr.addColorStop(.5,'#0a0e22');gr.addColorStop(1,'#04050c');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#5b6fb0';for(const x of[20,84,148,212])g.fillRect(x,38,24,32)});   // a dim sky with a few bright "windows" for surfaces to reflect
  es.add(new THREE.Mesh(new THREE.SphereGeometry(20,24,12),new THREE.MeshBasicMaterial({map:et,side:THREE.BackSide})));scene.environment=pm.fromScene(es,.02).texture;pm.dispose()}catch(e){}
/* ---------- props: builders ---------- */
const FACE={n:Math.PI,s:0,e:Math.PI/2,w:-Math.PI/2},bx=(w,h,d)=>new THREE.BoxGeometry(w,h,d),pl=(w,h)=>new THREE.PlaneGeometry(w,h);
const put=(g,geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=geo.type!=='PlaneGeometry'&&geo.type!=='CircleGeometry';o.receiveShadow=true;g.add(o);return o};
const slot=(x,y,f)=>{const g=new THREE.Group();g.position.set(x*S,0,y*S);g.rotation.y=FACE[f||'s'];RG.add(g);return g};   // local +z = out of the wall / front of the prop
const SOLID={locker:1,shelf:1,desk:1,table:1,bench:1,bin:1,case:1,bed:1,safe:1},LOW={desk:1,table:1,bench:1,bin:1,bed:1,safe:1};            // LOW = you can see over it
const FLAT={
  window:(g,w)=>{put(g,pl(w,1.5),M_WIN,0,1.75,.02);put(g,bx(w+.2,.06,.2),M_TRIM,0,.98,.1);const mp=put(g,pl(w*.92,2.6),M_MOON,0,.025,1.5);mp.rotation.x=-Math.PI/2},
  board:(g,w)=>{const f=wood(0x5a3a28);put(g,pl(w,1.3),M_BOARD,0,1.7,.02);put(g,bx(w+.14,.07,.07),f,0,2.38,.04);put(g,bx(w+.14,.07,.07),f,0,1.02,.04);for(const s of[-1,1])put(g,bx(.07,1.4,.07),f,s*(w/2+.035),1.7,.04);put(g,bx(w,.04,.12),f,0,1,.08)},
  poster:(g,w,p)=>put(g,pl(w,w*1.35),posterMat(p.c||0x7a3a3a),0,1.7,.02),
  clock:g=>put(g,pl(.6,.6),M_CLOCK,0,2.68,.03),
  pad:g=>{put(g,bx(.34,.5,.06),cm(0x1a1f35),0,1.4,.03);put(g,pl(.24,.1),new THREE.MeshBasicMaterial({color:lin(0xffaa33)}),0,1.56,.065);for(let i=0;i<12;i++)put(g,bx(.07,.05,.02),cm(0x8a8fa8),((i%3)-1)*.09,1.44-(i/3|0)*.065,.065)}   // door keypad
};
const SOLIDB={
  locker:(g,lw,ld)=>{put(g,bx(lw,2.2,ld),cm(0x2a3050,{metalness:.35,roughness:.5}),0,1.1,0);put(g,pl(lw,2.2),lockerMat(lw),0,1.1,ld/2+.004)},
  shelf:(g,lw,ld)=>{const w=wood(0x4a3426);for(const s of[-1,1])put(g,bx(.05,2,ld),w,s*(lw/2-.025),1,0);put(g,bx(lw,2,.03),w,0,1,-ld/2+.015);for(const y of[.03,.5,.97,1.44,1.98])put(g,bx(lw,.04,ld),w,0,y,0);put(g,pl(lw-.1,1.9),bookMat(lw),0,1,ld/2-.12)},
  desk:(g,lw,ld,p)=>{const w=wood(0x6a4a3a),c=wood(0x4a3a30);put(g,bx(lw,.06,ld),w,0,.76,0);put(g,bx(lw-.1,.03,ld-.1),w,0,.5,0);
    for(const sx of[-1,1])for(const sz of[-1,1])put(g,bx(.05,.74,.05),w,sx*(lw/2-.05),.37,sz*(ld/2-.05));put(g,bx(.3,.01,.22),cm(0xd8d4c4),rnd(-lw/4,lw/4),.795,rnd(-ld/5,ld/5));
    put(g,bx(.42,.05,.42),c,0,.46,ld/2+.38);put(g,bx(.42,.38,.04),c,0,.72,ld/2+.6);for(const sx of[-1,1])for(const sz of[-1,1])put(g,bx(.03,.44,.03),c,sx*.18,.22,ld/2+.38+sz*.18);
    if(p.puzzle){const m=put(g,new THREE.CircleGeometry(.13,16),new THREE.MeshBasicMaterial({color:lin(0x7da0ff),transparent:true,opacity:.55}),0,.8,0);m.rotation.x=-Math.PI/2}},   // faint rune = one of the singing desks
  table:(g,lw,ld)=>{put(g,bx(lw+.1,.08,ld+.06),wood(0x4a3426),0,.78,0);put(g,bx(lw*.94,.7,ld*.86),wood(0x3a281c),0,.35,0);put(g,bx(.3,.05,.22),cm(0xd8d4c4),-lw/4,.845,0);
    put(g,new THREE.CylinderGeometry(.08,.08,.04,10),cm(0x222222),lw/4,.84,0);put(g,new THREE.CylinderGeometry(.015,.015,.3,6),cm(0x222222),lw/4,1,0);put(g,new THREE.CylinderGeometry(.05,.14,.14,10),cm(0x3a5a3a,{emissive:0x1a1408}),lw/4,1.18,0)},
  bed:(g,lw,ld)=>{put(g,bx(lw,.3,ld),cm(0x4a4f60),0,.3,0);put(g,bx(lw-.08,.14,ld-.1),cm(0xb9bdd0),0,.48,0);put(g,bx(lw-.12,.06,ld*.55),cm(0x3a5a7a),0,.56,ld*.14);put(g,bx(lw*.7,.1,.4),cm(0xdde0ee),0,.58,-ld/2+.32);put(g,bx(lw,.7,.06),wood(0x4a3426),0,.65,-ld/2+.03)},   // head of the bed is against the wall (-z)
  safe:(g,lw,ld)=>{const gold=cm(0xb8962e,{metalness:.7,roughness:.35}),st=cm(0x2a2e3a,{metalness:.6,roughness:.4});put(g,bx(lw,1,ld),st,0,.5,0);put(g,bx(lw*.8,.8,.04),cm(0x3a3f50,{metalness:.6,roughness:.4}),0,.5,ld/2+.01);
    const d=put(g,new THREE.CylinderGeometry(.1,.1,.05,16),gold,0,.55,ld/2+.04);d.rotation.x=Math.PI/2;put(g,bx(.05,.22,.05),gold,lw*.28,.5,ld/2+.04);put(g,bx(.06,.03,.02),new THREE.MeshBasicMaterial({color:lin(0xff3030)}),0,.82,ld/2+.04)},
  bench:(g,lw,ld)=>{const w=wood(0x4a3a30);put(g,bx(lw,.06,ld),w,0,.46,0);for(const s of[-1,1])put(g,bx(.06,.44,ld*.85),w,s*(lw/2-.12),.22,0)},
  bin:(g,lw,ld)=>{const r=Math.min(lw,ld)/2*.85;put(g,new THREE.CylinderGeometry(r,r*.85,.6,12),cm(0x4a4f60),0,.3,0);const d=put(g,new THREE.CircleGeometry(r*.85,12),cm(0x05060c),0,.605,0);d.rotation.x=-Math.PI/2},
  case:(g,lw,ld)=>{const gold=cm(0xb8962e,{metalness:.7,roughness:.35});put(g,bx(lw,2,ld),wood(0x2c2018),0,1,0);
    for(const y of[.8,1.3]){put(g,bx(lw*.92,.03,.18),wood(0x4a3426),0,y,ld/2+.09);for(let i=0;i<4;i++){const x=(i-1.5)*lw*.22;put(g,bx(.14,.1,.14),gold,x,y+.065,ld/2+.09);put(g,new THREE.CylinderGeometry(.07,.04,.2,8),gold,x,y+.23,ld/2+.09)}}
    put(g,bx(lw*.92,1.5,.03),cm(0x99bbee,{transparent:true,opacity:.18,roughness:.1}),0,1.2,ld/2+.2)}
};
function prop(p){const f=p.f||'s',ns=f==='s'||f==='n';
  if(FLAT[p.k])return FLAT[p.k](slot(p.x,p.y,f),(p.w||60)*S,p);
  if(p.k==='rug'){const a=put(RG,pl(p.w*S,p.h*S),cm(p.c,{roughness:1}),(p.x+p.w/2)*S,.015,(p.y+p.h/2)*S),b=put(RG,pl((p.w-30)*S,(p.h-30)*S),cm(new THREE.Color(p.c).multiplyScalar(1.6).getHex(),{roughness:1}),(p.x+p.w/2)*S,.02,(p.y+p.h/2)*S);a.rotation.x=b.rotation.x=-Math.PI/2;return}
  if(p.k==='stain'){const s=put(RG,new THREE.CircleGeometry(p.r*S,20),cm(0x3a0612,{transparent:true,opacity:.7,depthWrite:false,roughness:.12}),p.x*S,.02,p.y*S);s.rotation.x=-Math.PI/2;return}
  SOLIDB[p.k](slot(p.x+p.w/2,p.y+p.h/2,f),(ns?p.w:p.h)*S,(ns?p.h:p.w)*S,p)}
/* ---------- room builder ---------- */
const box=(x,y,w,h,ht,m)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w*S,ht,h*S),m);b.position.set((x+w/2)*S,ht/2,(y+h/2)*S);b.castShadow=b.receiveShadow=true;return b};
let RG=null,itemM={},exitM=null,exitLk=null;
function buildRoom(){
  if(RG){scene.remove(RG);RG.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  RG=new THREE.Group();scene.add(RG);const R=ROOMS[G.room],rm=roomMats(G.room,R),cx=R.w*S/2,cz=R.h*S/2;
  lamp.position.set(cx,2.6,cz);const fl=new THREE.Mesh(pl(R.w*S,R.h*S),rm.floor);fl.rotation.x=-Math.PI/2;fl.position.set(cx,0,cz);fl.receiveShadow=true;RG.add(fl);
  const ce=new THREE.Mesh(pl(R.w*S,R.h*S),rm.ceil);ce.rotation.x=Math.PI/2;ce.position.set(cx,3,cz);ce.receiveShadow=true;RG.add(ce);
  const is=(a,w)=>a.some(q=>q.join()===w.join());
  for(const w of R.walls){
    if(is(R.desks,w))prop({k:'desk',x:w[0],y:w[1],w:w[2],h:w[3],f:'s',puzzle:1});
    else if(is(R.hides,w))prop({k:'locker',x:w[0],y:w[1],w:w[2],h:w[3],f:'s'});
    else{RG.add(box(w[0],w[1],w[2],w[3],3,wallMat(Math.max(w[2],w[3])*S)));
      if(w[2]<=80&&w[3]<=80)for(const[y,h]of[[.15,.3],[2.88,.24]])put(RG,bx(w[2]*S+.14,h,w[3]*S+.14),M_TRIM,(w[0]+w[2]/2)*S,y,(w[1]+w[3]/2)*S)}}   // pillar base + capital
  for(let x=400;x<R.w;x+=400)put(RG,bx(.3,.24,R.h*S),M_TRIM,x*S,2.88,cz);   // ceiling beams
  for(let i=0,x=200;x<R.w;x+=400,i++)for(let j=0,y=225;y<R.h;y+=450,j++){put(RG,bx(.3,.06,1.4),M_TRIM,x*S,2.96,y*S);put(RG,bx(.1,.03,1.2),(i+j)%3===1?cm(0x2a2f44):M_TUBE,x*S,2.93,y*S)}   // light fixtures (some dead)
  for(const p of R.props)prop(p);
  for(const d of R.doors){const left=d.x<R.w/2,g=slot(left?d.x:d.x+d.w,d.y+d.h/2,left?'e':'w'),w=d.h*S,fr=cm(0x1a1f35),br=cm(0xb8962e,{metalness:.7,roughness:.35});
    put(g,bx(w,2.4,.1),M_DOOR,0,1.2,.06);for(const s of[-1,1])put(g,bx(.12,2.55,.14),fr,s*(w/2+.06),1.275,.07);put(g,bx(w+.24,.14,.14),fr,0,2.5,.07);put(g,bx(w*.6,.05,.05),br,0,1.1,.13);put(g,bx(.05,.5,.05),br,w/2-.2,1.05,.13)}
  exitM=exitLk=null;if(R.exit){const e=R.exit,g=slot(e.x+e.w/2,60,'s'),w=e.w*S,fr=cm(0x1a1f35);
    exitM=put(g,bx(w,2.6,.12),mat(0x7a1230,0x40081a),0,1.3,.08);for(const s of[-1,1])put(g,bx(.14,2.7,.16),fr,s*(w/2+.07),1.35,.08);put(g,bx(w+.28,.14,.16),fr,0,2.67,.08);put(g,pl(.9,.34),M_EXIT,0,2.84,.05);
    exitLk=new THREE.Group();exitLk.position.set(0,1.2,.16);g.add(exitLk);put(exitLk,bx(w*.95,.05,.05),cm(0x555a6a,{metalness:.6}),0,0,0);put(exitLk,bx(.16,.2,.08),cm(0xb8962e,{metalness:.7,roughness:.35}),w/2-.25,-.05,0)}   // chain + padlock
  itemM={};for(const it of ITEMS)if(it.room===G.room&&!G.taken.includes(it.id)){const f=it.type==='frag',nt=it.type==='note',m=new THREE.Mesh(f?new THREE.OctahedronGeometry(.22):nt?new THREE.BoxGeometry(.32,.42,.03):new THREE.BoxGeometry(.2,.35,.2),new THREE.MeshStandardMaterial({color:lin(f?0xff3b5c:nt?0xe8e4d0:0xffe066),emissive:lin(f?0xaa1030:nt?0x6a6450:0x806000)}));m.position.set(it.x*S,1,it.y*S);RG.add(m);itemM[it.id]=m}
}
/* ---------- the weeping statues ---------- */
/* Cracked stone texture + materials for the statues */
const T_STONE=ctex(256,256,(g,w,h)=>{g.fillStyle='#8d8d94';g.fillRect(0,0,w,h);for(let k=0;k<22;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(20,60),Math.random()<.5?'255,255,255':'0,0,0',rnd(.05,.16));speckle(g,w,h,34);
  for(let k=0;k<7;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(10,26),'34,52,30',rnd(.07,.16));   // faint moss and grime
  cracks(g,'rgba(18,18,24,.75)',1.3,SCR)});
const T_STONEB=ctex(256,256,(g,w,h)=>{g.fillStyle='#a0a0a0';g.fillRect(0,0,w,h);for(let k=0;k<30;k++)blotch(g,w,h,rnd(0,w),rnd(0,h),rnd(12,40),Math.random()<.5?'255,255,255':'0,0,0',rnd(.1,.3));speckle(g,w,h,70);cracks(g,'#101010',2.2,SCR)},true);
const M_STONE2=new THREE.MeshStandardMaterial({map:T_STONE,bumpMap:T_STONEB,bumpScale:1.4,roughness:.92,color:lin(0xb4b4bc)}),M_HOOD=new THREE.MeshStandardMaterial({map:T_STONE,bumpMap:T_STONEB,bumpScale:1.4,roughness:.95,color:lin(0x8a8a92),side:THREE.DoubleSide}),
  M_TEETH=cm(0xd8d4c0,{roughness:.5}),M_BLOOD=cm(0x5a0a12,{roughness:.25}),M_BLK=new THREE.MeshBasicMaterial({color:0x020202});
/* ---------- ANGEL SETTINGS (tune here) ----------
   ANGELS_PER_ROOM: how many angels fill each room (authored spots in ROOMS first, the rest are random open floor spots, never closer than ANGEL_MIN_DIST px to you or ANGEL_GAP px to each other).
   ALICE_CHANCE: chance (0-1) that an angel is replaced by the 3D Alice (NIKKE) model from assets/models/ (her look and size are tuned in ALICE_CFG at the top of assets/models/alice.js). It is rolled first; the angels it doesn't replace are normal angels or Dorothy angels. 0 = never, 1 = always. Until her textures have loaded, the normal angels spawn instead.
   DOROTHY_CHANCE: chance that an angel is the pink-haired, white-winged "Dorothy" variant (a stone homage to Dorothy from NIKKE). 0 = never, 1 = always.
   LUNGES: while you are NOT looking at it, an angel winds up for LUNGE_WIND s (freezes, eyes flare, stone grinds) and then dashes at LUNGE_SPD px/s for LUNGE_TIME s.
   It tries again every LUNGE_EVERY seconds [min,max] (sooner with every memory you find). Only angels within LUNGE_RANGE px lunge, and never two within LUNGE_GAP s of each other. Look at it and it freezes mid-lunge. */
const ANGELS_PER_ROOM={hall:3,class:3,ward:2,lib:4,store:2,boiler:3,chapel:4},ANGEL_MIN_DIST=460,ANGEL_GAP=210,DOROTHY_CHANCE=.5,ALICE_CHANCE=.75;
const LUNGE_EVERY=[3.5,7.5],LUNGE_WIND=.4,LUNGE_TIME=.75,LUNGE_SPD=400,LUNGE_RANGE=720,LUNGE_GAP=1.4;let lungeG=0;
const M_HAIR=new THREE.MeshStandardMaterial({map:T_STONE,bumpMap:T_STONEB,bumpScale:1.2,roughness:.78,color:lin(0xe58cb8)}),   // pink hair, petrified
  M_DRESS=new THREE.MeshStandardMaterial({map:T_STONE,bumpMap:T_STONEB,bumpScale:1,roughness:.88,color:lin(0xe9e6f0),side:THREE.DoubleSide}),
  M_RIB=cm(0x6a3fb0,{roughness:.6}),M_WING=new THREE.MeshStandardMaterial({color:lin(0xe4e6ee),roughness:.32,metalness:.55});
/* Two-bone arm solver: puts the wrist at H (statue-local coords), elbow bends toward `pole`. */
const _H=new THREE.Vector3(),_Pole=new THREE.Vector3(),_Pl=new THREE.Vector3(),_D=new THREE.Vector3(),_E=new THREE.Vector3(),_F=new THREE.Vector3(),_U=new THREE.Vector3(),_DOWN=new THREE.Vector3(0,-1,0),_Q=new THREE.Quaternion();
function ik(A,H,pole){const l1=.42,l2=.4,S0=A.p.position;_D.copy(H).sub(S0);let L=Math.min(_D.length(),l1+l2-.001);_D.normalize();
  const x=(l1*l1-l2*l2+L*L)/(2*L),h=Math.sqrt(Math.max(0,l1*l1-x*x));
  _Pl.copy(pole).addScaledVector(_D,-pole.dot(_D)).normalize();
  _E.copy(S0).addScaledVector(_D,x).addScaledVector(_Pl,h);                 // elbow
  _F.copy(S0).addScaledVector(_D,L).sub(_E).normalize();                    // forearm direction
  _U.copy(_E).sub(S0).normalize();                                          // upper-arm direction
  A.p.quaternion.setFromUnitVectors(_DOWN,_U);
  _Q.copy(A.p.quaternion).invert();_F.applyQuaternion(_Q);A.e.quaternion.setFromUnitVectors(_DOWN,_F)}
/* Statue: hooded, cracked, bleeding stone angel. Pose depends on aggression a (0..1):
   a=0 weeping, hands over the face, mouth shut  ->  a=1 arms clawing forward, wings spread, red eyes, fanged mouth wide open. */
/* Alice statue: the 3D model instead of the built-from-boxes angel. It has the same fields poseStatue() and the jumpscares expect (arms, wings, eyes, head, mouth), but only her eyes and her lean actually move. */
function makeAliceStatue(){const g=new THREE.Group(),al=ALICE.make({castShadow:!MOBILE});g.add(al);g.alice=al;g.tilt=Math.random()<.5?-1:1;g.arms=[];g.wings=[];g.blades=[];g.eyes=al.eyeMats;g.head=new THREE.Group();g.mouth=new THREE.Group();g.dor=false;g.scale.setScalar(1.22);return g}
function makeStatue(dor=Math.random()<DOROTHY_CHANCE){if(ALICE.ready&&Math.random()<ALICE_CHANCE)return makeAliceStatue();const g=new THREE.Group(),st=M_STONE2;g.tilt=Math.random()<.5?-1:1;g.arms=[];g.wings=[];g.eyes=[];g.blades=[];g.dor=dor;
  const add=(geo,mt,x,y,z,par)=>{const m=new THREE.Mesh(geo,mt);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(par||g).add(m);return m};
  add(new THREE.CylinderGeometry(.2,.62,1.55,14),st,0,.78,0);                                                          // robe
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(new THREE.BoxGeometry(.07,1.35,.16),st,Math.sin(a)*.4,.7,Math.cos(a)*.4).rotation.y=a}   // robe folds
  add(new THREE.SphereGeometry(.3,12,8),st,0,1.55,0).scale.set(1.2,.5,.8);                                             // shoulders
  const head=new THREE.Group();head.position.set(0,1.85,.04);g.add(head);g.head=head;
  add(new THREE.SphereGeometry(.19,14,12),st,0,0,0,head).scale.set(1,1.15,.95);
  g.hood=add(new THREE.SphereGeometry(.25,14,10,Math.PI/2+.9,Math.PI*2-1.8,0,Math.PI*.62),M_HOOD,0,.03,-.04,head);            // hood, open at the front
  for(const sg of[-1,1]){const em=new THREE.MeshStandardMaterial({color:0x050505,emissive:0xff1010,emissiveIntensity:0,roughness:.5});
    add(new THREE.SphereGeometry(.045,8,6),em,sg*.07,.04,.172,head).scale.z=.5;g.eyes.push(em);
    add(new THREE.BoxGeometry(.012,.14,.012),M_BLOOD,sg*.07,-.04,.176,head);                                           // bloody tear streaks
    add(new THREE.BoxGeometry(.1,.025,.03),st,sg*.065,.085,.17,head).rotation.z=-sg*.3}                                // angry brow
  const mo=new THREE.Group();mo.position.set(0,-.085,.176);head.add(mo);g.mouth=mo;add(new THREE.BoxGeometry(.13,.1,.03),M_BLK,0,0,0,mo);
  for(let i=0;i<7;i++){const x=(i-3)*.02;add(new THREE.ConeGeometry(.011,.05,5),M_TEETH,x,.045,.016,mo).rotation.x=Math.PI;add(new THREE.ConeGeometry(.011,.05,5),M_TEETH,x,-.045,.016,mo)}   // fangs
  for(const sg of[-1,1]){const p=new THREE.Group();p.position.set(sg*.3,1.6,.05);g.add(p);add(new THREE.BoxGeometry(.1,.42,.1),st,0,-.21,0,p);
    const e=new THREE.Group();e.position.y=-.42;p.add(e);add(new THREE.BoxGeometry(.085,.4,.085),st,0,-.2,0,e);add(new THREE.SphereGeometry(.06,8,6),st,0,-.4,0,e);
    for(const fx of[-1,0,1]){const f=add(new THREE.ConeGeometry(.014,.15,5),st,fx*.035,-.47,0,e);f.rotation.x=Math.PI;f.rotation.z=fx*.25}     // claws
    g.arms.push({p,e,sg})}
  for(const sg of[-1,1]){const wg=new THREE.Group();wg.position.set(sg*.14,1.5,-.14);wg.rotation.x=-.35;g.add(wg);
    for(let i=0;i<4;i++){const len=1.25-i*.17,bl=new THREE.Group();bl.rotation.z=-sg*(.15+i*.3);wg.add(bl);g.blades.push(add(new THREE.BoxGeometry(.035,len,.3),st,0,len/2,0,bl))}g.wings.push({g:wg,sg})}   // wings
  if(dor){   // Dorothy-inspired variant: long pink hair with a braid and a single bun, purple ribbon and eyes, frilled white dress, white mechanical wings. Still a cracked, weeping, fanged stone horror.
    const ah=(geo,mt,x,y,z,par)=>{const m=add(geo,mt,x,y,z,par);m.castShadow=false;return m};   // small details cast no shadow, which keeps the torch cheap
    g.hood.visible=false;for(const b of g.blades){b.material=M_WING;b.scale.x=1.7}for(const e of g.eyes)e.emissive.setHex(0xb45cff);
    ah(new THREE.SphereGeometry(.225,14,10,Math.PI/2+.9,Math.PI*2-1.8,0,Math.PI*.74),M_HAIR,0,.03,-.04,head);                      // hair, open at the face
    for(const sx of[-1,0,1])ah(new THREE.BoxGeometry(.07,.11,.03),M_HAIR,sx*.075,.125,.15,head).rotation.z=-sx*.28;                     // fringe
    ah(new THREE.SphereGeometry(.085,10,8),M_HAIR,0,.27,-.07,head);                                                                      // single hair bun
    for(const sx of[-1,1])ah(new THREE.BoxGeometry(.11,.035,.03),M_RIB,sx*.065,.2,-.06,head).rotation.z=sx*.35;                         // purple hair ribbon
    ah(new THREE.SphereGeometry(.028,8,6),M_RIB,0,.2,-.06,head);
    for(const sx of[-1,1])ah(new THREE.BoxGeometry(.1,1.05,.09),M_HAIR,sx*.2,1.05,-.2,g).rotation.z=sx*.05;                              // long hair down the back and over the shoulders
    ah(new THREE.BoxGeometry(.34,1.15,.08),M_HAIR,0,1.0,-.25,g);
    for(let i=0;i<6;i++)ah(new THREE.SphereGeometry(.052-i*.003,8,6),M_HAIR,-.1,.85-i*.1,-.32-i*.01,g);                                 // braid
    ah(new THREE.TorusGeometry(.115,.02,6,16),M_DRESS,0,1.69,.02,g).rotation.x=Math.PI/2;ah(new THREE.SphereGeometry(.03,8,6),M_RIB,0,1.67,.13,g);   // frilled choker and neck ribbon
    for(const y of[1.0,.6,.2]){const r=.62-.42*(y/1.55);ah(new THREE.CylinderGeometry(r+.03,r+.13,.14,20,1,true),M_DRESS,0,y,0,g)}      // layered frills on the dress
    ah(new THREE.TorusGeometry(.3,.022,6,18),M_RIB,0,1.25,0,g).rotation.x=Math.PI/2}                                                     // purple sash
  g.scale.setScalar(1.22);return g}   // taller than you
function poseStatue(s,big){const g=s.g,a=s.a,t=a*a*(3-2*a),m=big?1:Math.max(0,Math.min(1,(a-.25)/.6));
  for(const A of g.arms){_H.set(A.sg*(.07+.23*t),1.8-.3*t,.27+.55*t);_Pole.set(A.sg,-.35,-.25);ik(A,_H,_Pole)}
  g.mouth.scale.set(1+.15*m,.05+.95*m,1);g.mouth.position.y=-.085-.03*m;
  for(const e of g.eyes)e.emissiveIntensity=a>.08?.7+a*3.2:0;   // eyes glow red in the dark as soon as it has moved
  g.head.rotation.set(.2*a,0,.32*a*g.tilt);for(const w of g.wings)w.g.rotation.z=-w.sg*(.1+.4*a);
  if(g.alice)g.alice.rotation.set(ALICE_CFG.LEAN*t,0,.07*a*g.tilt)}   // Alice has no posable arms: she tips towards you as she gets angrier
/* ---------- jumpscares ---------- */
/* 1) AMBUSH: the nearest statue snaps into view right in front of you (fires after picking up a memory fragment). */
function ambush(near){if(!ST.length||P.hidden)return;let s=ST[0];for(const q of ST)if(Math.hypot(q.x-P.x,q.y-P.y)<Math.hypot(s.x-P.x,s.y-P.y))s=q;
  for(const dist of near||[200,240,170,280])for(const off of[0,.3,-.3,.6,-.6]){const a=VY()+off,x=P.x-Math.sin(a)*dist,y=P.y-Math.cos(a)*dist;
    if(!hits(x,y,30)&&los({x,y},P)){s.x=x;s.y=y;s.a=1;s.seen=true;stinger(true);shakeT=.8;flashT=.9;return}}}
/* 2) BLACKOUT: every 45-80s the lights die for ~1.4s. You can't hold the statues with your eyes, so they close in. */
function blackout(dt){if(!ST.length||P.hidden)return;
  if(boT>0){boT-=dt;if(boT<=0){stinger(true);shakeT=.9;flashT=.8;if(Math.random()<.75)ambush([95,120,150,180])}return}   // lights come back: it is right in front of you
  if(boNext<1.2)flickT=.15;boNext-=dt;
  if(boNext<=0){const dn=Math.min(...ST.map(s=>s.d||9999));if(dn>260){boT=1.4;boNext=45+Math.random()*35;beep(60,1.3,'sawtooth',.2)}else boNext=8}}
/* 2b) APPARITION: a statue flashes into view at the edge of the dark for a split second, then it is gone (not one of the real statues). */
function apparition(){if(phantom||P.hidden||trans)return;
  for(const dist of[240,300,200]){const x=P.x-Math.sin(VY())*dist,y=P.y-Math.cos(VY())*dist;
    if(!hits(x,y,30)&&los({x,y},P)){const g=makeStatue();g.position.set(x*S,0,y*S);g.rotation.y=Math.atan2(P.x-x,P.y-y);poseStatue({g,a:1},true);scene.add(g);phantom={g,t:.35};stinger(false);shakeT=.6;flashT=.7;return}}}
/* 3) DEATH SCARE: the killer statue lunges at the camera, face filling the screen, before the game-over screen. */
function startScare(){if(!ST.length)return endGame(false);let s=ST[0];for(const q of ST)if(q.d<s.d)s=q;G.state='scare';G.by='s';G.sc=s;G.sc2=0;scareT=0;P.hidden=false;stinger(true);flashT=1}
function scareFrame(dt){scareT+=dt;const s=G.sc,k=Math.min(1,scareT/.2),e=1-(1-k)*(1-k);s.a=1;poseStatue(s,true);
  const r=s.g.rotation.y,dist=1.7-1.38*e,hx=s.x*S,hz=s.y*S,j=scareT>.2?.03:0;
  s.g.head.rotation.z+=rnd(-.12,.12);s.g.mouth.scale.y*=1+rnd(-.08,.08);if(s.g.alice)s.g.alice.rotation.z=s.g.head.rotation.z*.4;
  cam.fov=70+52*e;cam.updateProjectionMatrix();cam.position.set(hx+Math.sin(r)*dist+rnd(-j,j),1.84+rnd(-j,j),hz+Math.cos(r)*dist+rnd(-j,j));cam.lookAt(hx,1.86,hz);cam.rotateZ(rnd(-.08,.08)*e);
  glow.color.setHex(0xff2020);glow.intensity=2.5;spot.intensity=FLASH.intensity;
  if(scareT<.1||Math.random()<.1)flashT=1;flashT=Math.max(0,flashT-dt*2.5);$('flash').style.opacity=flashT*.9;
  for(const id of['hud','prompt','msg','warn'])$(id).textContent='';$('mini').classList.add('hide');$('vig').style.opacity=.9;$('slit').classList.add('hide');
  if(scareT>.45&&!G.sc2){G.sc2=1;stinger(true);flashT=1}R3.domElement.style.filter=Math.random()<.2?'invert(1)':'';   // a second scream and flashes of inverted colour
  syncTorch(dt,true);R3.render(scene,cam);if(scareT>2){R3.domElement.style.filter='';endGame(false)}}
/* ---------- ANGELS WAKE AT 3 FRAGMENTS: until you have ANGEL_FRAGS memory fragments the school is empty. The moment you pick up the 3rd, the lights die and the angels appear. Set ANGEL_FRAGS=0 for angels from the start. ---------- */
const ANGEL_FRAGS=3,fragCount=()=>G.taken.filter(i=>i[0]==='f').length,angelsOn=()=>fragCount()>=ANGEL_FRAGS;
function awaken(){spawnStatues();spawnHollow();beep(55,1.8,'sawtooth',.22);strobe(1.5);shakeT=.5;flickT=.4
  if(!ST.length){say('Somewhere in the school, stone scrapes against stone. They are awake now.',6);return}   // no angel in this room: they appear when you walk into the next one
  boT=1.8;boNext=45+Math.random()*35   // blackout only where an angel can use it (blackout() only runs while an angel is in the room)
  setTimeout(()=>{if(G.state==='play'&&ST.length){ambush([110,140,170,200]);say('Stone scrapes in the dark. They are awake now.',5)}},1900)}
/* open floor spots for this room's angels: authored spots first, then random ones. Never inside furniture, near a door, on top of you, or on top of each other. */
function angelSpots(id){const R=ROOMS[id],want=ANGELS_PER_ROOM[id]??R.statues.length,out=[],px=P?P.x:-9999,py=P?P.y:-9999;
  const ok=(x,y,md,gap)=>x>90&&x<R.w-90&&y>110&&y<R.h-110&&!hits(x,y,44)&&Math.hypot(x-px,y-py)>=md&&out.every(o=>Math.hypot(x-o[0],y-o[1])>=gap)&&R.doors.every(d=>Math.hypot(x-(d.x+d.w/2),y-(d.y+d.h/2))>150);
  for(const [x,y] of R.statues)if(out.length<want&&ok(x,y,ANGEL_MIN_DIST,ANGEL_GAP))out.push([x,y]);
  for(const [md,gap,tries] of[[ANGEL_MIN_DIST,ANGEL_GAP,500],[ANGEL_MIN_DIST*.7,ANGEL_GAP*.7,500]])for(let i=0;i<tries&&out.length<want;i++){const x=Math.round(rnd(90,R.w-90)),y=Math.round(rnd(110,R.h-110));if(ok(x,y,md,gap))out.push([x,y])}
  return out}
function spawnStatues(){ST.forEach(s=>scene.remove(s.g));lungeG=2;ST=!angelsOn()?[]:angelSpots(G.room).map(([x,y])=>{const g=makeStatue();scene.add(g);return{x,y,g,dor:g.dor,seen:true,a:0,pa:-1,lt:rnd(3,LUNGE_EVERY[1]+1.5),wind:0,lg:0}})}
/* A statue is "seen" only if it is on screen (inside the camera's view, not behind a wall/locker). The flashlight has no effect on this. */
function inView(s){
  const dx=s.x-P.x,dy=s.y-P.y,d=Math.hypot(dx,dy)||1,dm=d*S,fx=-Math.sin(VY()),fy=-Math.cos(VY());
  const ang=Math.acos(Math.max(-1,Math.min(1,(dx*fx+dy*fy)/d))),vh=cam.fov*Math.PI/360,hh=Math.atan(Math.tan(vh)*cam.aspect);   // half vertical / horizontal field of view
  const vdiff=Math.abs(Math.atan2(1-1.6,dm)-pitch);                                                                          // statue centre ~1m up, eyes 1.6m
  return ang<hh+Math.atan(.45/dm)&&vdiff<vh+Math.atan(1/dm)}
function statuesUpdate(dt){const fr=Math.min(5,G.taken.filter(i=>i[0]==='f').length),SPD=blinkT>0?BLINK_LUNGE:85+10*fr;   // they get faster with every memory you pick up
  lungeG-=dt;
  for(const s of ST){const dx=P.x-s.x,dy=P.y-s.y,d=Math.hypot(dx,dy)||1;
    s.d=d;s.seen=!P.hidden&&boT<=0&&blinkT<=0&&d<SIGHT&&inView(s)&&los(s,P);
    if(s.seen&&!s.wasSeen&&strobeCd<=0){strobe(STROBE_LEN);strobeCd=STROBE_COOLDOWN}   // first sight of an angel
    s.wasSeen=s.seen;if(d<STROBE_NEAR&&!s.close){s.close=true;strobe(STROBE_LEN*1.3)}else if(d>STROBE_NEAR+150)s.close=false;   // one close, once per approach
    if(!s.seen){
      /* LUNGE: unseen angels freeze for a beat (eyes flare, stone grinds), then dash at you. Looking at one pauses its timers, so you can stare it down mid-lunge. */
      if(s.wind>0){s.wind-=dt;if(s.wind<=0){s.lg=LUNGE_TIME;lungeG=LUNGE_GAP;stinger(false);shakeT=Math.max(shakeT,.35);beep(rnd(80,120),.4,'sawtooth',.22)}}
      else if(s.lg>0)s.lg-=dt;
      else if(!P.hidden){s.lt-=dt;if(s.lt<=0){if(d<LUNGE_RANGE&&d>110&&lungeG<=0&&boT<=0){s.wind=LUNGE_WIND;s.lt=rnd(LUNGE_EVERY[0],LUNGE_EVERY[1])*Math.max(.5,1-.08*fr);lungeG=LUNGE_WIND+LUNGE_GAP;beep(rnd(40,60),LUNGE_WIND,'sawtooth',.2)}else s.lt=rnd(.8,1.8)}}
      const sp=s.lg>0?Math.max(SPD,LUNGE_SPD):SPD;
      if(d>28&&s.wind<=0)move(s,dx/d*sp*dt,dy/d*sp*dt,26);   // stops at arm's length instead of walking through you
      if(Math.random()<.06)beep(rnd(38,70),.16,'sawtooth',Math.min(.2,.03+Math.max(0,1-d/700)*.17));   // stone dragging, louder the closer it is
      if(d<34){P.hp-=80*dt;G.by='s';if(hurtCd<=0){shakeT=.6;flashT=.5;stinger(false);hurtCd=1.2}}}
  }
  hurtCd-=dt;sCd-=dt;strobeCd-=dt;heartT-=dt;const dn=Math.min(...ST.map(s=>s.d),9999);if(dn<320&&Math.random()<.015)flickT=.1+Math.random()*.15;   // the light stutters when one is near
  
  if(dn<350&&heartT<=0&&!P.hidden){beep(70,.16,'triangle',.35);setTimeout(()=>beep(60,.16,'triangle',.28),170);heartT=.4+dn/450}   // heartbeat
  if(sCd<=0&&ST.some(s=>!s.seen&&s.d<150)){stinger(false);shakeT=.5;flashT=.35;sCd=14}                                          // one right behind you
  if(P.hp<100&&!ST.some(s=>!s.seen&&s.d<250))P.hp=Math.min(100,P.hp+3*dt)}
/* ---------- THE HOLLOW: a second, blind entity that roams every room once the angels wake. It has no eyes, only enormous ears.
   It hears you breathe. Inside its hearing radius you must HOLD YOUR BREATH (hold Space, or the BREATH button on a phone). Sprinting is heard from further away, and holding your breath does not hide it.
   Hold too long and you gasp, which it hears from even further. When it finds you it claws your eyes out for 3 seconds and the game is over.
   HOLLOW_ON: false removes it. HOLLOW_FRAGS: memory fragments needed before it appears (default: same as the angels).
   HOLLOW_HEAR_R: px (40 px = 1 m) within which normal breathing is heard · HOLLOW_RUN_R: sprinting · HOLLOW_GASP_R: a gasp. Walls and lockers shrink these.
   HOLLOW_DETECT: seconds of being heard before it finds you (it drains away when you go quiet) · BREATH_DRAIN: % of lungs per second while holding (14 = about 7 s) · BREATH_MIN: lungs needed after a gasp before you can hold again. ---------- */
const HOLLOW_ON=true,HOLLOW_FRAGS=ANGEL_FRAGS,HOLLOW_WALK=62,HOLLOW_HUNT=105,HOLLOW_HEAR_R=380,HOLLOW_RUN_R=560,HOLLOW_GASP_R=640,HOLLOW_DETECT=1.1,HOLLOW_SCARE=3;
const BREATH_MAX=100,BREATH_DRAIN=14,BREATH_REGEN=22,BREATH_MIN=30;
let HO=null,hDet=0,hAlert=false,hsT=0,hSw=[0,0,0],hTold=false,breath=100,holding=false,gasped=false,needRel=false;
const hollowOn=()=>HOLLOW_ON&&fragCount()>=HOLLOW_FRAGS;
const M_HSKIN=new THREE.MeshStandardMaterial({map:T_STONE,bumpMap:T_STONEB,bumpScale:.7,roughness:.62,color:lin(0x8b968a)}),
  M_HEAR=new THREE.MeshStandardMaterial({color:lin(0x6e5a60),roughness:.7,side:THREE.DoubleSide}),M_HCLAW=cm(0xd8d1bb,{roughness:.4}),M_HVOID=new THREE.MeshBasicMaterial({color:0x000000});
/* model: tall, starved, hunched, arms that trail near the floor, a smooth head with two empty sockets and huge twitching ears */
function makeHollow(){const g=new THREE.Group();g.legs=[];g.arms=[];g.ears=[];
  const add=(geo,mt,x,y,z,par,sh)=>{const m=new THREE.Mesh(geo,mt);m.position.set(x,y,z);m.castShadow=sh!==false;m.receiveShadow=true;(par||g).add(m);return m};
  for(const sg of[-1,1]){const l=new THREE.Group();l.position.set(sg*.1,1.02,0);g.add(l);add(new THREE.BoxGeometry(.085,.52,.085),M_HSKIN,0,-.26,0,l);
    const k=new THREE.Group();k.position.y=-.52;l.add(k);add(new THREE.BoxGeometry(.07,.52,.07),M_HSKIN,0,-.26,.02,k);add(new THREE.BoxGeometry(.08,.04,.2),M_HSKIN,0,-.53,.07,k,false);g.legs.push({l,k,sg})}
  const tor=new THREE.Group();tor.position.y=1.02;tor.rotation.x=.5;g.add(tor);g.tor=tor;
  add(new THREE.CylinderGeometry(.17,.12,.92,10),M_HSKIN,0,.46,0,tor).scale.z=.7;
  for(let i=0;i<5;i++){const r=add(new THREE.TorusGeometry(.165-i*.006,.012,4,12),M_HCLAW,0,.3+i*.12,0,tor,false);r.rotation.x=Math.PI/2;r.scale.y=.75}   // ribs showing through the skin
  const neck=new THREE.Group();neck.position.y=.92;neck.rotation.x=.15;tor.add(neck);add(new THREE.CylinderGeometry(.04,.055,.48,8),M_HSKIN,0,.24,0,neck);
  const head=new THREE.Group();head.position.y=.5;neck.add(head);g.head=head;
  add(new THREE.SphereGeometry(.14,14,12),M_HSKIN,0,.1,.02,head).scale.set(.85,1.45,1);
  for(const sg of[-1,1]){add(new THREE.SphereGeometry(.04,8,6),M_HVOID,sg*.055,.14,.125,head,false).scale.set(1,1.7,.55);   // empty eye sockets
    const ear=new THREE.Group();ear.position.set(sg*.12,.14,-.01);ear.rotation.z=-sg*.55;head.add(ear);
    add(new THREE.ConeGeometry(.12,.52,6,1,true),M_HEAR,0,.26,0,ear,false).scale.z=.35;g.ears.push({e:ear,sg})}
  for(const sg of[-1,1]){const p=new THREE.Group();p.position.set(sg*.2,.86,0);tor.add(p);add(new THREE.BoxGeometry(.07,.64,.07),M_HSKIN,0,-.32,0,p);
    const e=new THREE.Group();e.position.y=-.64;p.add(e);add(new THREE.BoxGeometry(.06,.68,.06),M_HSKIN,0,-.34,0,e);add(new THREE.SphereGeometry(.055,8,6),M_HSKIN,0,-.69,0,e,false);
    for(const fx of[-1,-.33,.33,1]){const c=add(new THREE.ConeGeometry(.012,.3,5),M_HCLAW,fx*.034,-.85,0,e,false);c.rotation.x=Math.PI;c.rotation.z=fx*.12}   // claws
    g.arms.push({p,e,sg})}
  g.scale.setScalar(1.12);return g}
/* open floor spot at least md px from (px,py) */
function hollowSpot(px,py,md){const R=ROOMS[G.room];for(let i=0;i<400;i++){const x=Math.round(rnd(90,R.w-90)),y=Math.round(rnd(110,R.h-110));if(!hits(x,y,60)&&Math.hypot(x-px,y-py)>=md)return[x,y]}return null}
/* fromDoor: you left the last room while it was hunting you, so it comes through the door behind you a few seconds later */
function spawnHollow(fromDoor){if(HO){scene.remove(HO.g);HO=null}hDet=0;const al=!!fromDoor&&hAlert;hAlert=false;
  if(!hollowOn()||!P)return;const R=ROOMS[G.room];let pos,delay=0;
  if(al){let bd=1e9;for(const d of R.doors){const cx=d.x+d.w/2,cy=d.y+d.h/2,dd=Math.hypot(cx-P.x,cy-P.y);if(dd<bd){bd=dd;pos=[cx+(cx<R.w/2?50:-50),cy]}}delay=rnd(5,8)}
  else pos=hollowSpot(P.x,P.y,620)||hollowSpot(P.x,P.y,420)||hollowSpot(P.x,P.y,260);
  if(!pos)return;const g=makeHollow();g.visible=delay<=0;scene.add(g);g.position.set(pos[0]*S,0,pos[1]*S);
  HO={x:pos[0],y:pos[1],g,head:g.head,mode:delay>0?'hunt':'patrol',wp:null,wait:0,delay,face:rnd(0,6.28),ph:0,mv:0,d:1e9,mul:1,clk:rnd(.5,1.5),tx:P.x,ty:P.y,sx:pos[0],sy:pos[1],sT:0,hb:0,tw:0,nt:0,ntx:0,nty:0,np:null}}
/* path finding: the room is a grid of 40 px cells (blocked where something of its size would not fit). A breadth-first search finds the way round furniture and pillars, then the path is shortened to the furthest point it can see in a straight line. */
let HG=null;const HOLLOW_SIZE=46,HCS=40;
function hClear(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1),n=Math.ceil(d/14);for(let i=1;i<=n;i++){const t=i/n;if(hits(x1+(x2-x1)*t,y1+(y2-y1)*t,HOLLOW_SIZE))return false}return true}
function hollowNav(h,tx,ty){if(hClear(h.x,h.y,tx,ty))return[tx,ty];
  const R=ROOMS[G.room],cols=Math.ceil(R.w/HCS),rows=Math.ceil(R.h/HCS);
  if(!HG||HG.id!==G.room||HG.cols!==cols){HG={id:G.room,cols,rows,ok:new Uint8Array(cols*rows)};for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)HG.ok[j*cols+i]=hits(i*HCS+HCS/2,j*HCS+HCS/2,HOLLOW_SIZE)?0:1}
  const cx=(x)=>Math.max(0,Math.min(cols-1,Math.floor(x/HCS))),cy=(y)=>Math.max(0,Math.min(rows-1,Math.floor(y/HCS))),ok=HG.ok,s0=cy(h.y)*cols+cx(h.x);let g0=cy(ty)*cols+cx(tx);
  const prev=new Int32Array(cols*rows).fill(-2);prev[s0]=-1;const q=[s0];let found=-1;
  for(let qi=0;qi<q.length;qi++){const c=q[qi];if(c===g0||(!ok[g0]&&ok[c]&&Math.abs(c%cols-g0%cols)+Math.abs((c/cols|0)-(g0/cols|0))<=1)){found=c;break}
    const i=c%cols,j=c/cols|0;for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=cols||b>=rows)continue;const n=b*cols+a;if(prev[n]!==-2||!ok[n])continue;prev[n]=c;q.push(n)}}
  if(found<0)return null;const path=[];for(let c=found;c>=0;c=prev[c])path.push([c%cols*HCS+HCS/2,(c/cols|0)*HCS+HCS/2]);path.reverse();
  let best=path[Math.min(1,path.length-1)];for(const pt of path){if(hClear(h.x,h.y,pt[0],pt[1]))best=pt;else if(pt!==path[0])break}   // furthest point on the path it can walk to in a straight line
  return best}
function hollowGo(h,tx,ty,spd,dt){h.nt-=dt;if(h.nt<=0||Math.hypot(tx-h.ntx,ty-h.nty)>40){h.nt=.3;h.ntx=tx;h.nty=ty;h.np=hollowNav(h,tx,ty)}
  const np=h.np||[tx,ty],ex=np[0]-h.x,ey=np[1]-h.y,ed=Math.hypot(ex,ey)||1,ox=h.x,oy=h.y;move(h,ex/ed*spd*dt,ey/ed*spd*dt,HOLLOW_SIZE);h.mv=dt>0?Math.hypot(h.x-ox,h.y-oy)/dt:0;h.face=Math.atan2(ex,ey);return Math.hypot(tx-h.x,ty-h.y)}
function hollowWp(h){const R=ROOMS[G.room];for(let i=0;i<40;i++){const x=rnd(90,R.w-90),y=rnd(110,R.h-110);if(!hits(x,y,HOLLOW_SIZE+14)&&Math.hypot(x-h.x,y-h.y)>240&&hollowNav(h,x,y)){h.wp=[x,y];return}}h.wp=null}
/* holding your breath: Space (hold). It drains; at 0 you gasp, and you can't hold again until you have recovered BREATH_MIN and let go of the key. */
function breathUpdate(dt){const want=!!keys[' ']&&lieT<=0&&!trans&&G.state==='play';if(!want)needRel=false;
  if(gasped){holding=false;breath=Math.min(BREATH_MAX,breath+BREATH_REGEN*.6*dt);if(breath>=BREATH_MIN)gasped=false;return}
  if(want&&!needRel&&breath>0){if(!holding){holding=true;beep(120,.18,'sine',.05)}breath-=BREATH_DRAIN*dt;
    if(breath<=0){breath=0;holding=false;gasped=needRel=true;beep(85,.7,'sawtooth',.26);say('You can’t hold it any longer. You gasp!',2.5);if(HO&&HO.delay<=0&&HO.d<HOLLOW_GASP_R*(HO.mul||1))hDet=1}}
  else{if(holding){holding=false;beep(170,.4,'sine',.035)}breath=Math.min(BREATH_MAX,breath+BREATH_REGEN*dt)}}
function hollowUpdate(dt){const h=HO;if(!h||trans)return;
  if(h.delay>0){h.delay-=dt;if(h.delay<=0){h.g.visible=true;h.mode='hunt';h.tx=P.x;h.ty=P.y;creak();say('Something has come through the door behind you...',3.5)}return}
  const dx=P.x-h.x,dy=P.y-h.y,d=Math.hypot(dx,dy)||1;h.d=d;h.lo=los(h,P);const mul=(h.lo?1:.65)*(P.hidden?.55:1);h.mul=mul;   // walls muffle you, a locker muffles you more
  const heard=(!holding&&d<HOLLOW_HEAR_R*mul)||(runK>.5&&!P.hidden&&d<HOLLOW_RUN_R*mul);
  if(d<44&&(!P.hidden||d<34))hDet=1;else hDet=Math.max(0,Math.min(1,hDet+(heard?dt/HOLLOW_DETECT:-dt*.5)));
  if(heard){h.tx=P.x;h.ty=P.y;if(h.mode!=='hunt'){h.mode='hunt';beep(rnd(55,75),.6,'sawtooth',.16)}}
  hAlert=h.mode==='hunt'||hDet>.3;
  if(!hTold&&d<HOLLOW_HEAR_R*1.6){hTold=true;say('Something is listening. Hold your breath! ('+(touchMode?'BREATH button':'hold Space')+')',5)}
  if(hDet>=1){startHollowScare();return}
  if(h.mode==='hunt'){if(hollowGo(h,h.tx,h.ty,HOLLOW_HUNT,dt)<34){h.mode='listen';h.wait=rnd(3,5.5);h.mv=0;h.face=Math.atan2(dx,dy)}}   // it goes to the last place it heard you, then listens
  else if(h.mode==='patrol'){if(!h.wp)hollowWp(h);if(!h.wp||hollowGo(h,h.wp[0],h.wp[1],HOLLOW_WALK,dt)<30){h.mode='listen';h.wait=rnd(2,4.5);h.mv=0;h.wp=null}}
  else{h.mv=0;h.wait-=dt;if(d<HOLLOW_HEAR_R*1.4)h.face=Math.atan2(dx,dy);else{h.tw-=dt;if(h.tw<=0){h.tw=rnd(1,2.2);h.face+=rnd(-1.3,1.3)}}if(h.wait<=0){h.mode='patrol';h.wp=null}}
  h.sT+=dt;if(h.sT>.8){if(h.mv>10&&Math.hypot(h.x-h.sx,h.y-h.sy)<8){if(h.mode==='patrol')h.wp=null;else if(h.mode==='hunt'){h.mode='listen';h.wait=rnd(2,3)}}h.sx=h.x;h.sy=h.y;h.sT=0}   // stuck on furniture
  h.clk-=dt;if(h.clk<=0){h.clk=Math.max(.3,Math.min(1.8,d/700))*rnd(.7,1.3)*(h.mode==='hunt'?.6:1);const v=Math.max(0,1-d/950)*.16;if(v>.004){beep(rnd(2500,3400),.014,'square',v);setTimeout(()=>beep(rnd(1800,2400),.012,'square',v*.6),90)}}   // it clicks to listen: faster and louder the closer it is
  if(!holding&&d<HOLLOW_HEAR_R*1.5&&Math.random()<dt*.5)beep(rnd(150,210),.45,'sine',.025);   // your own breathing
  if(holding&&d<HOLLOW_HEAR_R*1.5){h.hb-=dt;if(h.hb<=0){h.hb=.55+d/1400;beep(62,.14,'triangle',.3)}}}   // heart pounding in your ears
function hollowAnim(dt){const h=HO;if(!h||!h.g.visible)return;const g=h.g;g.position.set(h.x*S,0,h.y*S);
  let da=h.face-g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));g.rotation.y+=da*Math.min(1,dt*(h.mode==='hunt'?6:2.5));
  const mv=Math.min(1,(h.mv||0)/60),hunt=h.mode==='hunt',lis=h.mode==='listen';h.ph+=dt*(h.mv||0)/46;
  for(const L of g.legs){const a=h.ph+(L.sg>0?0:Math.PI);L.l.rotation.x=Math.sin(a)*.55*mv;L.k.rotation.x=Math.max(0,-Math.cos(a))*.7*mv}
  g.tor.rotation.x=.5+Math.sin(t0*1.3)*.03+(hunt?.12:0);g.tor.position.y=1.02+Math.abs(Math.sin(h.ph))*.03*mv;
  for(const A of g.arms){const sw=Math.sin(h.ph+(A.sg>0?Math.PI:0))*.35*mv,tot=hunt?-.55+sw*.4:sw;A.p.rotation.set(tot-g.tor.rotation.x,0,A.sg*(.12+(hunt?.25:0)));A.e.rotation.x=hunt?-.5:-.15}
  g.head.rotation.set(Math.sin(t0*.9)*.08+(lis?.1:0),lis?Math.sin(t0*.55)*.5:Math.sin(t0*.7)*.12,Math.sin(t0*.7+1)*.18+(lis?.25:0));
  for(const E of g.ears){E.e.rotation.x=Math.sin(t0*4+E.sg*2)*.08*(lis?3:1);E.e.rotation.z=-E.sg*(.55+(hunt?.25:0)+Math.sin(t0*5+E.sg)*.05)}}
/* ---------- the eyes: claw overlay (made here so index.html stays simple) ---------- */
const CLW=document.createElement('div');CLW.id='claws';CLW.className='hide';
CLW.innerHTML='<div class="cb"></div>'+[[18,-18],[31,-13],[44,-21],[53,15],[66,20],[78,12],[27,-7],[47,23],[64,-26]].map(([t,a])=>'<i class="sl" style="top:'+t+'%;--a:'+a+'deg"></i>').join('')+'<div class="cd"></div>';
$('wrap').appendChild(CLW);
function hClaws(n){const sl=CLW.querySelectorAll('.sl');if(n<0){CLW.classList.remove('hide');sl.forEach(i=>i.classList.remove('on'));CLW.querySelector('.cb').style.opacity=0;CLW.querySelector('.cd').style.opacity=0;return}for(let i=n*3;i<n*3+3;i++)sl[i].classList.add('on')}
/* DEATH: it finds you. Its face fills the screen, three rakes of the claws across your eyes, blood, then black. HOLLOW_SCARE seconds, then the game-over screen. */
function startHollowScare(){if(!HO||G.state!=='play')return;G.state='hscare';G.by='h';hsT=0;hSw=[0,0,0];P.hidden=false;holding=false;HO.g.visible=true;HO.face=Math.atan2(P.x-HO.x,P.y-HO.y);HO.g.rotation.y=HO.face;HO.mv=0;hClaws(-1);stinger(true);flashT=1;beep(55,1.2,'sawtooth',.3)}
function hollowScareFrame(dt){hsT+=dt;const h=HO,g=h.g,t=hsT,k=Math.min(1,t/.2),e=1-(1-k)*(1-k),raise=Math.min(1,t/.4);
  [.5,1.05,1.6].forEach((tm,i)=>{if(t>=tm&&!hSw[i]){hSw[i]=1;hClaws(i);stinger(true);shakeT=1;flashT=1;beep(rnd(70,110),.5,'sawtooth',.32);beep(rnd(700,1300),.4,'sawtooth',.18)}});
  for(const A of g.arms){A.p.rotation.set(-1.35*raise-g.tor.rotation.x+Math.sin(t*14)*.1,0,A.sg*.2+Math.sin(t*10+(A.sg>0?0:2))*.8*raise);A.e.rotation.x=-.3}   // both arms rake at your face
  g.head.rotation.set(.1,Math.sin(t*30)*.12,Math.sin(t*22)*.2);for(const E of g.ears)E.e.rotation.z=-E.sg*(.8+Math.sin(t*25)*.1);
  g.updateMatrixWorld(true);const hp=new THREE.Vector3();g.head.getWorldPosition(hp);hp.y+=.1;
  const r=g.rotation.y,dist=2.4-1.9*e,j=t>.2?.025:0;cam.fov=70+48*e;cam.updateProjectionMatrix();
  cam.position.set(hp.x+Math.sin(r)*dist+rnd(-j,j),hp.y+rnd(-j,j),hp.z+Math.cos(r)*dist+rnd(-j,j));cam.lookAt(hp.x,hp.y,hp.z);cam.rotateZ(rnd(-.1,.1)*e);
  glow.color.setHex(0xff2020);glow.intensity=2.2;spot.intensity=FLASH.intensity;flashT=Math.max(0,flashT-dt*2.5);$('flash').style.opacity=flashT*.9;
  for(const id of['hud','prompt','msg','warn'])$(id).textContent='';$('mini').classList.add('hide');$('radar').classList.add('hide');$('vig').style.opacity=.9;$('slit').classList.add('hide');
  CLW.querySelector('.cb').style.opacity=Math.max(0,Math.min(1,(t-.45)/1.9));CLW.querySelector('.cd').style.opacity=Math.max(0,Math.min(1,(t-2.15)/.75));   // blood creeps in, then everything goes black
  syncTorch(dt,true);R3.render(scene,cam);if(t>=HOLLOW_SCARE){CLW.classList.add('hide');endGame(false)}}
function breathHud(){if(!hollowOn()&&breath>=BREATH_MAX)return'';return'\n🫁 Breath '+'█'.repeat(Math.ceil(breath/10)).padEnd(10,'░')+(gasped?' (gasping)':holding?' (holding)':touchMode?'':'  [Space]')}
function hollowWarn(){if(!HO||HO.delay>0||!P||G.state!=='play'||trans)return'';
  if(hDet>.05)return holding?'— IT’S RIGHT THERE. DON’T MAKE A SOUND —':'— IT HEARD YOU · HOLD YOUR BREATH —';
  if(HO.d<HOLLOW_HEAR_R*(HO.mul||1)*1.3)return holding?'— HOLDING YOUR BREATH —':touchMode?'— IT’S LISTENING · HOLD YOUR BREATH —':'— IT’S LISTENING · HOLD SPACE —';return''}
/* ---------- input / ui ---------- */
const lock=()=>{if(touchMode)return;try{R3.domElement.requestPointerLock()}catch(e){}};
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&G.state==='play')togglePause()});
addEventListener('mousemove',e=>{if(document.pointerLockElement&&G.state==='play'&&!P.hidden&&lieT<=0){yaw-=e.movementX*.0022;pitch=Math.max(-1.2,Math.min(1.2,pitch-e.movementY*.0022))}});
function key(k,down){keys[k]=down;if(!down)return;if(G.state==='pad'){padKey(k);return}if(PANELS[G.state]){if(k==='escape'||k===PANELS[G.state])closeUI();else{const o=Object.keys(PANELS).find(n=>PANELS[n]===k);if(o){closeUI();({journal:toggleJournal,inv:toggleInv,map:toggleMap})[o]()}}return}
  if(k==='e')interact();if(k==='g')blink();if(k==='j')toggleJournal();if(k==='i')toggleInv();if(k==='n')toggleMap();if(k==='b'&&G.state==='play')useBat();if(k==='f'&&G.state==='play'&&P.bat>0)P.light=!P.light;if(k==='p')togglePause();if(k==='m')toggleSound();if(k==='t'&&G.state==='play'){radarOn=!radarOn;say('Radar '+(radarOn?'on':'off'),1.5)}}
/* ---------- SECRET: type a-c-h-e-r-o-n anywhere to slide out a picture frame (assets/ui/acheron.jpg) ---------- */
const SECRET_WORD='acheron';let secBuf='',secOpen=false,secPrev='play';
function openSecret(){if(secOpen)return;secOpen=true;secPrev=G.state;G.state='secret';keys={};document.exitPointerLock();
  const el=$('secret');el.classList.remove('hide');void el.offsetWidth;el.classList.add('show');
  beep(130,.7,'sawtooth',.05);setTimeout(()=>{beep(523,.9,'sine',.09);beep(659,1.1,'sine',.07)},650);setTimeout(()=>beep(784,1.4,'sine',.07),900)}
function closeSecret(){if(!secOpen)return;secOpen=false;const el=$('secret');el.classList.remove('show');
  setTimeout(()=>{if(!secOpen)el.classList.add('hide')},500);G.state=secPrev;keys={};if(secPrev==='play')lock()}
$('secret').addEventListener('click',closeSecret);
/* ---------- SECRET 2: type u-m-a-m-u-s-u-m-e to start / stop your own song (assets/music/umamusume.mp3). The game's own music and ambience fade down while it plays. M mutes it too. ---------- */
const UMA_FILE='assets/music/umamusume.mp3',UMA_NAME='ウマ娘 — めにしゅき ラッシュっしゅ!! (スティルインラブ)',UMA_VOL=.85;let umaA=null,umaOn=false,toastTO;
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toastTO);toastTO=setTimeout(()=>e.classList.remove('on'),5000)}
function umaDuck(){const d=umaOn;if(musG)musG.gain.setTargetAtTime(muted||d?0:MUSIC_VOL,actx.currentTime,.4);if(ambG)ambG.gain.setTargetAtTime(muted?0:d?.25:1,actx.currentTime,.4)}
function toggleUma(){if(umaOn){umaOn=false;if(umaA)umaA.pause();umaDuck();toast('♪ Stopped');return}
  if(!umaA){umaA=new Audio(UMA_FILE);umaA.loop=true;umaA.volume=UMA_VOL}umaA.muted=muted;
  const pr=umaA.play();umaOn=true;try{AC()}catch(e){}umaDuck();toast('♪ Now playing: '+UMA_NAME+'   (type umamusume again to stop)');
  if(pr&&pr.catch)pr.catch(()=>{umaOn=false;umaDuck();toast('Could not play '+UMA_FILE+' — is the file there?')})}
const SECRETS={acheron:()=>openSecret(),umamusume:toggleUma};
addEventListener('keydown',e=>{if(e.repeat)return;const k=e.key.toLowerCase();
  if(secOpen){if(k==='escape'||k==='e'||k==='enter'||k===' ')closeSecret();e.preventDefault();return}
  if(k.length===1&&G.state!=='pad'&&G.state!=='intro'){secBuf=(secBuf+k).slice(-9);
    for(const w in SECRETS)if(secBuf.endsWith(w)){secBuf='';SECRETS[w]();return}   // the final letter is swallowed (the "n" would open the map)
    if(k==='m'&&Object.keys(SECRETS).some(w=>{for(let n=Math.min(secBuf.length,w.length-1);n>=2;n--)if(secBuf.slice(-n)===w.slice(0,n))return true;return false}))return}   // an "m" in the middle of a code word must not toggle mute
  key(k,true);if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault()});
addEventListener('keyup',e=>key(e.key.toLowerCase(),false));
const PANELS={journal:'j',inv:'i',map:'n'};
function showScreen(n){['menu','pause','over','intro','pad','journal','inv','map'].forEach(s=>$(s).classList.toggle('hide',s!==n))}
function toggleSound(){muted=!muted;if(ambG)ambG.gain.value=muted?0:1;if(umaA)umaA.muted=muted;if(musG)musG.gain.value=muted||umaOn?0:MUSIC_VOL;ls.set('eam_set',JSON.stringify({mute:muted}));$('btnSound').textContent='Sound: '+(muted?'Off':'On')}
function togglePause(){if(G.state==='play'){G.state='pause';showScreen('pause');document.exitPointerLock()}else if(G.state==='pause'){G.state='play';showScreen(null);lock()}}
function toMenu(){G.state='menu';document.exitPointerLock();$('btnCont').disabled=!ls.get(SAVE);showScreen('menu')}
function endGame(win){
  G.state=win?'win':'over';document.exitPointerLock();const n=G.taken.filter(i=>i[0]==='f').length;
  $('overTitle').textContent=win?(n===TOTAL?'TRUE ENDING':'YOU ESCAPED'):G.by==='h'?'YOU BREATHED':'DON’T LOOK AWAY';
  $('overText').textContent=win?(n===TOTAL?'Every memory returns: the bell, the stone, the night you stayed behind. Aki steps out into the dawn, finally awake.':'Aki flees into the dawn, but pieces of her memory stay behind. Find all '+TOTAL+' fragments for the true ending.'):G.by==='h'?'It has no eyes of its own. It heard you, and it took yours.':'Stone doesn’t hear. Stone only waits for you to turn your head.';
  if(win)ls.del(SAVE);showScreen('over');beep(win?660:60,.8,win?'sine':'sawtooth')}
/* ---------- keypad + journal ---------- */
function openPad(id){PAD={id,v:''};keys={};G.state='pad';document.exitPointerLock();$('padT').textContent=CODES[id].t;padShow();showScreen('pad')}
function padShow(m){$('padD').textContent=m||PAD.v.padEnd(CODES[PAD.id].code.length,'_')}
function padKey(k){if(!PAD)return;const n=CODES[PAD.id].code.length;
  if(/^[0-9]$/.test(k)){if(PAD.v.length<n)PAD.v+=k;padShow()}else if(k==='backspace'||k==='c'){PAD.v=PAD.v.slice(0,-1);padShow()}else if(k==='enter')padEnter();else if(k==='escape')closeUI()}
function padEnter(){const C=CODES[PAD.id];if(PAD.v===C.code){C.ok();closeUI();save()}else{padShow('WRONG');beep(100,.4,'sawtooth',.2);PAD.v='';flickT=.6;setTimeout(()=>{if(PAD&&G.state==='pad')padShow()},700)}}
function closeUI(){PAD=null;G.state='play';showScreen(null);lock()}
function toggleJournal(){if(G.state==='journal')return closeUI();if(G.state!=='play')return;keys={};G.state='journal';document.exitPointerLock();
  const L=$('jlist');L.textContent='';const got=ITEMS.filter(i=>i.type!=='bat'&&G.taken.includes(i.id));
  if(!got.length)got.push({type:'note',text:'Nothing found yet.'});
  for(const i of got){const p=document.createElement('p');p.textContent=(i.type==='frag'?'◆ ':'✎ ')+i.text;L.appendChild(p)}showScreen('journal')}
/* ---------- inventory (I) + map (N) + minimap ---------- */
let invSel='light';
function invItems(){const a=[];
  a.push({id:'light',ic:'🔦',n:'Flashlight',sub:Math.round(P.bat)+'%',d:'Your torch. F switches it on or off. It only lights the way: a statue is frozen by your eyes, not by the beam. Battery '+Math.round(P.bat)+'%.'});
  a.push({id:'bat',ic:'🔋',n:'Spare battery',sub:'×'+G.bats,use:G.bats>0,d:G.bats?'Restores 40% of the flashlight battery. Press B any time, or use the button below.':'No spare batteries. Search the rooms for more.'});
  if(G.libKey)a.push({id:'lkey',ic:'🗝',n:'Library key',sub:'',d:'It fell from the desks when you touched them in the right order. Opens the library door at the east end of the classroom.'});
  if(G.hasKey)a.push({id:'xkey',ic:'🔑',n:'Exit key',sub:'',d:'Found in the library safe. It unlocks the exit in the main hall.'});
  for(const it of ITEMS)if(it.type==='note'&&G.taken.includes(it.id))a.push({id:it.id,ic:'✎',n:'Note',sub:'',d:it.text});
  for(const it of ITEMS)if(it.type==='frag'&&G.taken.includes(it.id))a.push({id:it.id,ic:'◆',n:'Memory',sub:'',d:it.text});
  return a}
function renderInv(m){const L=invItems(),g=$('invG');g.textContent='';if(!L.some(i=>i.id===invSel))invSel='light';
  for(const i of L){const b=document.createElement('button');b.className='slot'+(i.id===invSel?' sel':'');
    const a=document.createElement('span');a.className='ic';a.textContent=i.ic;const n=document.createElement('span');n.textContent=i.n+(i.sub?' '+i.sub:'');b.append(a,n);
    b.onclick=()=>{invSel=i.id;renderInv()};g.appendChild(b)}
  const c=L.find(i=>i.id===invSel);$('invD').textContent=m||c.d;$('btnUse').classList.toggle('hide',!c.use)}
function toggleInv(){if(G.state==='inv')return closeUI();if(G.state!=='play')return;keys={};G.state='inv';document.exitPointerLock();renderInv();showScreen('inv')}
function useBat(){if(G.state!=='play'&&G.state!=='inv')return;let m;
  if(!G.bats)m='No spare batteries.';else if(P.bat>=100)m='The flashlight battery is already full.';
  else{G.bats--;const dead=P.bat<=0;P.bat=Math.min(100,P.bat+40);if(dead)P.light=true;beep(700,.15);m='New battery in. Flashlight at '+Math.round(P.bat)+'%.';save()}
  if(G.state==='inv')renderInv(m);else say(m,3)}
const MAPN={boiler:'BOILER ROOM',store:'SUPPLY CLOSET',ward:'INFIRMARY',hall:'MAIN HALL',class:'CLASSROOM',lib:'LIBRARY',chapel:'CHAPEL'},MAPO=['boiler','store','ward','hall','class','lib','chapel'],MAP_MINI=true;   // MAP_MINI=false hides the corner minimap
/* draws one room's floor plan with its top-left at (ox,oy), scaled by sc. Statues and items are never shown. */
function mapRoom(c,id,ox,oy,sc){const R=ROOMS[id];c.save();c.translate(ox,oy);c.scale(sc,sc);
  c.fillStyle='#0b0f26';c.fillRect(0,0,R.w,R.h);
  c.fillStyle='#262c55';for(const p of R.props)if(SOLID[p.k]&&p.w)c.fillRect(p.x,p.y,p.w,p.h);
  c.fillStyle='#4b5598';for(const w of R.walls)c.fillRect(w[0],w[1],w[2],w[3]);
  c.fillStyle='#b88a2e';for(const d of R.desks)c.fillRect(d[0],d[1],d[2],d[3]);
  c.fillStyle='#3a7bd5';for(const h of R.hides)c.fillRect(h[0],h[1],h[2],h[3]);
  for(const d of R.doors){c.fillStyle=d.need&&!G[d.need]?'#e0244c':'#2fd3b0';c.fillRect(d.x,d.y,d.w,d.h)}
  if(R.exit){c.fillStyle=G.hasKey?'#5dff7a':'#2e9c4a';c.fillRect(R.exit.x,R.exit.y,R.exit.w,R.exit.h)}
  if(R.safe&&!G.safe){c.fillStyle='#ffd24a';c.fillRect(R.safe[0],R.safe[1],R.safe[2],R.safe[3])}
  c.restore()}
function mapYou(c,x,y,r){const a=Math.atan2(-Math.cos(VY()),-Math.sin(VY()));c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#fff';c.shadowColor='#ff3b5c';c.shadowBlur=8;
  c.beginPath();c.moveTo(r*1.3,0);c.lineTo(-r,r*.8);c.lineTo(-r*.5,0);c.lineTo(-r,-r*.8);c.closePath();c.fill();c.restore()}
let miniT=0;
function miniDraw(dt){const m=$('mini'),on=MAP_MINI&&G.state==='play'&&lieT<=0;m.classList.toggle('hide',!on);if(!on)return;miniT-=dt;if(miniT>0)return;miniT=.08;
  const c=m.getContext('2d'),R=ROOMS[G.room],W=m.width,H=m.height,sc=Math.min((W-16)/R.w,(H-34)/R.h),ox=(W-R.w*sc)/2,oy=24+(H-24-R.h*sc)/2;
  c.clearRect(0,0,W,H);c.fillStyle='#8a94c8';c.font='bold 14px Georgia';c.fillText(MAPN[G.room],8,16);
  mapRoom(c,G.room,ox,oy,sc);mapYou(c,ox+P.x*sc,oy+P.y*sc,7)}
function drawMap(){const cv=$('mapC'),W=cv.width,pad=16,gap=24,top=30,tot=MAPO.reduce((a,i)=>a+ROOMS[i].w,0),sc=(W-2*pad-gap*(MAPO.length-1))/tot,pos={};
  const dcy=(a,b)=>{const d=ROOMS[a].doors.find(q=>q.to===b);return d.y+d.h/2},off={};off[MAPO[0]]=0;for(let i=1;i<MAPO.length;i++){const a=MAPO[i-1],b=MAPO[i];off[b]=off[a]+dcy(a,b)-dcy(b,a)}   // line the rooms up door to door
  const mn=Math.min(...Object.values(off));cv.height=Math.ceil(top+Math.max(...MAPO.map(i=>off[i]-mn+ROOMS[i].h))*sc+pad);const c=cv.getContext('2d'),H=cv.height;
  c.clearRect(0,0,W,H);let x=pad;c.font='bold 15px Georgia';
  for(const id of MAPO){const R=ROOMS[id],oy=top+(off[id]-mn)*sc;pos[id]={x,y:oy};
    if(G.vis[id]){c.fillStyle='#8a94c8';c.fillText(MAPN[id],x,oy-8);mapRoom(c,id,x,oy,sc)}
    else{c.strokeStyle='#4b5598';c.setLineDash([6,5]);c.strokeRect(x,oy,R.w*sc,R.h*sc);c.setLineDash([]);c.fillStyle='#4b5598';c.fillText('???',x,oy-8);c.font='bold 40px Georgia';c.fillText('?',x+R.w*sc/2-10,oy+R.h*sc/2+14);c.font='bold 15px Georgia'}
    x+=R.w*sc+gap}
  for(let i=0;i<MAPO.length-1;i++){const a=MAPO[i],b=MAPO[i+1],d=ROOMS[a].doors.find(q=>q.to===b),y=pos[a].y+(d.y+d.h/2)*sc;
    const db=ROOMS[b].doors.find(q=>q.to===a),y2=pos[b].y+(db.y+db.h/2)*sc;c.strokeStyle=d.need&&!G[d.need]?'#e0244c':'#2fd3b0';c.lineWidth=3;c.beginPath();c.moveTo(pos[a].x+ROOMS[a].w*sc,y);c.lineTo(pos[b].x,y2);c.stroke()}
  const q=pos[G.room];mapYou(c,q.x+P.x*sc,q.y+P.y*sc,9);
  $('mapObj').textContent='➤ '+objective()}
function toggleMap(){if(G.state==='map')return closeUI();if(G.state!=='play')return;keys={};G.state='map';document.exitPointerLock();drawMap();showScreen('map')}
(()=>{const g=$('padG');for(const c of '123456789C0✓'){const b=document.createElement('button');b.textContent=c;b.onclick=()=>{if(!PAD)return;c==='✓'?padEnter():padKey(c==='C'?'c':c)};g.appendChild(b)}})();
$('btnPadX').onclick=closeUI;$('btnJ').onclick=closeUI;$('btnInvX').onclick=closeUI;$('btnMapX').onclick=closeUI;$('btnUse').onclick=useBat;$('btnWake').onclick=newGame;
function objective(){return !G.ward?'Find the code to open the ward door':!G.libKey?'Wake the desks in the classroom':!G.safe?'Open the safe in the library':'Reach the EXIT in the main hall'}
$('btnNew').onclick=intro;$('btnCont').onclick=loadGame;$('btnSound').onclick=toggleSound;$('btnResume').onclick=togglePause;$('btnQuit').onclick=toMenu;$('btnRetry').onclick=newGame;$('btnMenu').onclick=toMenu;
$('btnSound').textContent='Sound: '+(muted?'Off':'On');$('btnCont').disabled=!ls.get(SAVE);
/* ---------- collision & interaction ---------- */
/* sight=true: ignore low things (desks, benches...) because you can see statues over them */
function hits(x,y,s,sight){const h=s/2,R=ROOMS[G.room];
  for(const w of R.walls){if(sight&&R.desks.includes(w))continue;if(x+h>w[0]&&x-h<w[0]+w[2]&&y+h>w[1]&&y-h<w[1]+w[3])return true}
  for(const p of R.props)if(SOLID[p.k]&&!(sight&&LOW[p.k])&&x+h>p.x&&x-h<p.x+p.w&&y+h>p.y&&y-h<p.y+p.h)return true;return false}
function move(e,dx,dy,s=SIZE){e.x+=dx;if(hits(e.x,e.y,s))e.x-=dx;e.y+=dy;if(hits(e.x,e.y,s))e.y-=dy}
function los(a,b){for(let i=1;i<14;i++){const t=i/14;if(hits(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,4,true))return false}return true}
const cen=r=>[r[0]+r[2]/2,r[1]+r[3]/2];
function target(){const R=ROOMS[G.room];if(P.hidden)return{kind:'unhide',label:'[E] Leave hiding spot'};
  for(const h of R.hides){const c=cen(h);if(Math.hypot(P.x-c[0],P.y-c[1])<58)return{kind:'hide',c,label:'[E] Hide'}}
  for(const d of R.doors)if(d.need&&!G[d.need]){const c=cen([d.x,d.y,d.w,d.h]);if(Math.hypot(P.x-c[0],P.y-c[1])<80)return{kind:'lock',d,label:d.need==='ward'?'[E] Enter door code':'[E] Locked door'}}
  if(R.safe&&!G.safe){const c=cen(R.safe);if(Math.hypot(P.x-c[0],P.y-c[1])<80)return{kind:'safe',label:'[E] Open the safe'}}
  for(let i=0;i<R.desks.length;i++){const c=cen(R.desks[i]);if(Math.hypot(P.x-c[0],P.y-c[1])<64)return{kind:'desk',i,label:'[E] Touch desk '+(i+1)}}
  if(R.exit){const c=cen([R.exit.x,R.exit.y,R.exit.w,R.exit.h]);if(Math.hypot(P.x-c[0],P.y-c[1])<90)return{kind:'exit',label:G.hasKey?'[E] Unlock exit':'[E] Exit (locked)'}}return null}
function interact(){if(G.state!=='play'||trans||lieT>0)return;const t=target();if(!t)return;
  if(t.kind==='unhide')P.hidden=false;
  else if(t.kind==='hide'){P.hidden=true;P.vx=P.vy=0;P.x=t.c[0];P.y=t.c[1]+44;beep(200,.1)}
  else if(t.kind==='lock'){if(t.d.need==='ward')openPad('ward');else{say(t.d.msg,4);beep(120,.2,'square')}}
  else if(t.kind==='safe')openPad('safe');
  else if(t.kind==='exit'){if(G.hasKey)endGame(true);else{say('Locked. You need a key.');beep(120,.2,'square')}}
  else if(t.kind==='desk'){if(G.solved)return say('The desks are silent now.');
    if(t.i+1===SOLUTION[G.seq]){G.seq++;beep(500+G.seq*150,.2);if(G.seq===SOLUTION.length){G.solved=G.libKey=true;say('Something heavy clatters to the floor... the library key!');beep(900,.5);save()}else say('The desk hums... ('+G.seq+'/3)')}
    else{G.seq=0;say('Wrong order! The desks screech!');beep(100,.5,'sawtooth',.25);flickT=.8}}}
/* ---------- update ---------- */
function update(dt){breathUpdate(dt);
  msgT-=dt;t0+=dt;blinkT-=dt;blinkCd-=dt;if(!P.hidden&&!trans&&blinkT<=0&&lieT<=0){eyeT-=dt;if(eyeT<=0)forceBlink()}
 flickT-=dt;lockT-=dt;wakeT-=dt;{const bt=keys.o&&!P.hidden&&lieT<=0&&!trans?Math.PI:0;backA+=(bt-backA)*Math.min(1,dt*BACK_SPEED);if(Math.abs(backA-bt)<.01)backA=bt}
 if(lieT>0){lieT-=dt;if(lieT<=0){lieT=0;P.x=BED_OUT[0];P.y=BED_OUT[1];pitch=0}else{P.x=BED_IN[0];P.y=BED_IN[1]+(BED_OUT[1]-BED_IN[1])*lieE()}}
 if(Math.random()<.008)flickT=.12;
  if(trans){trans.t+=dt*2.5;if(trans.t>=1&&!trans.done){trans.done=true;G.room=trans.to;G.vis[G.room]=1;P.x=trans.tx;P.y=trans.ty;yaw=trans.tx<ROOMS[trans.to].w/2?-Math.PI/2:Math.PI/2;buildRoom();spawnStatues();spawnHollow(true);save();beep(250,.3);doorT=ST.length&&Math.random()<.7?1.1:0;apT=rnd(25,50);if(phantom){scene.remove(phantom.g);phantom=null}}if(trans.t>=2)trans=null;return}
  if(doorT>0){doorT-=dt;if(doorT<=0)ambush([150,180,210])}   // door scare: right after you walk into a room with a statue, it is standing in front of you
  if(ST.length&&!P.hidden&&lieT<=0){apT-=dt;if(apT<=0){apT=rnd(35,80);apparition()}}
  if(!P.hidden&&lieT<=0){
    const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)+(keys.jy||0),r=(keys.d?1:0)-(keys.a?1:0)+(keys.jx||0);   // jx / jy: touch joystick (-1..1)
    yaw+=((keys.arrowleft?1:0)-(keys.arrowright?1:0))*2*dt;
    let tx=0,ty=0,runNow=false;if(f||r){const vx=-Math.sin(yaw)*f+Math.cos(yaw)*r,vy=-Math.cos(yaw)*f-Math.sin(yaw)*r,l=Math.hypot(vx,vy);const run=!!keys.shift&&!tired&&sta>0&&!holding,hm=holding?.7:1;tx=vx/l*(run?RUN:WALK)*hm;ty=vy/l*(run?RUN:WALK)*hm;runNow=run}else runNow=false
    const ac=Math.min(1,dt*(f||r?9:12));P.vx+=(tx-P.vx)*ac;P.vy+=(ty-P.vy)*ac;   // a little acceleration / inertia instead of instant starts and stops
    const ox=P.x,oy=P.y;if(Math.abs(P.vx)+Math.abs(P.vy)>5)move(P,P.vx*dt,P.vy*dt);const sp=dt>0?Math.min(1.8,Math.hypot(P.x-ox,P.y-oy)/(WALK*dt)):0;   // real speed, so pressing into a wall is silent
    P.bob+=((sp>.12?Math.min(1.5,sp*1.2):0)-P.bob)*Math.min(1,dt*8);if(sp>.12){const o=Math.floor(P.ph/Math.PI);P.ph+=dt*9*sp;if(Math.floor(P.ph/Math.PI)!==o)step(runNow)}
    if(runNow){sta-=STA_DRAIN*dt;if(sta<=0){sta=0;tired=true;say('Out of breath...',2.5);beep(90,.5,'sawtooth',.06)}}else sta=Math.min(100,sta+STA_REGEN*(f||r?.5:1)*dt);if(tired&&sta>=30)tired=false;runK+=((runNow?1:0)-runK)*Math.min(1,dt*6);
    if(P.light){P.bat-=BAT_DRAIN*dt;if(P.bat<=0){P.bat=0;P.light=false;say(G.bats?'Flashlight died... press B for a spare battery.':'Flashlight died... the dark closes in.')}}}
  const R=ROOMS[G.room];
  for(const d of R.doors)if(!P.hidden&&P.x+11>d.x&&P.x-11<d.x+d.w&&P.y+11>d.y&&P.y-11<d.y+d.h){
    if(d.need&&!G[d.need]){P.x+=(d.x<R.w/2?1:-1)*14;if(lockT<=0){say(d.msg||'Locked.',4);beep(120,.2,'square');lockT=1.2}continue}
    trans={t:0,to:d.to,tx:d.tx,ty:d.ty};return}
  for(const it of ITEMS)if(it.room===G.room&&!G.taken.includes(it.id)&&Math.hypot(P.x-it.x,P.y-it.y)<26){G.taken.push(it.id);RG.remove(itemM[it.id]);if(it.type==='bat'){G.bats++;beep(700,.15)}else beep(880,.3);say(it.type==='bat'?'Spare battery. Press B to use it.':it.text,5);save();if(it.type==='frag'){const rm=G.room;if(fragCount()===ANGEL_FRAGS)awaken();else setTimeout(()=>{if(G.state==='play'&&G.room===rm)ambush()},700)}}
  statuesUpdate(dt);hollowUpdate(dt);blackout(dt);ambT-=dt;if(ambT<=0){ambT=rnd(9,24);creak()}if(P.hp<=0&&G.state==='play')startScare()}
/* ---------- ANGEL RADAR: round scanner, bottom-right. Up = the way you face. Red blip = angel moving (unseen), pale blip = frozen (you are watching it). T toggles. ---------- */
const RADAR_RANGE=1100;   // game pixels (40px = 1 m) shown from centre to rim; angels further away pin to the rim. Tune here.
let radarOn=true,radarSweep=0;
function radarDraw(dt){const c=$('radar'),on=radarOn&&G.state==='play'&&lieT<=0;c.classList.toggle('hide',!on);if(!on)return;
  const x=c.getContext('2d'),W=c.width,C=W/2,Rr=C-6;radarSweep=(radarSweep+dt*2.2)%(Math.PI*2);
  x.clearRect(0,0,W,W);x.save();x.beginPath();x.arc(C,C,Rr,0,7);x.clip();
  x.fillStyle='rgba(2,10,6,.78)';x.fillRect(0,0,W,W);
  x.strokeStyle='rgba(80,255,140,.28)';x.lineWidth=2;for(const k of[.33,.66,1]){x.beginPath();x.arc(C,C,Rr*k,0,7);x.stroke()}
  x.beginPath();x.moveTo(C-Rr,C);x.lineTo(C+Rr,C);x.moveTo(C,C-Rr);x.lineTo(C,C+Rr);x.stroke();
  const g=x.createConicGradient?x.createConicGradient(radarSweep-Math.PI/2-.9,C,C):null;   // rotating sweep
  if(g){g.addColorStop(0,'rgba(80,255,140,0)');g.addColorStop(.14,'rgba(80,255,140,.33)');g.addColorStop(.1400001,'rgba(80,255,140,0)');x.fillStyle=g;x.fillRect(0,0,W,W)}
  const fx=-Math.sin(VY()),fy=-Math.cos(VY()),rx=Math.cos(VY()),ry=-Math.sin(VY());let near=1e9;
  for(const s of ST){const dx=s.x-P.x,dy=s.y-P.y,d=Math.hypot(dx,dy);near=Math.min(near,d);
    const a=dx*fx+dy*fy,b=dx*rx+dy*ry,k=Math.min(1,d/RADAR_RANGE),ang=Math.atan2(b,a),px=C+Math.sin(ang)*k*Rr*.94,py=C-Math.cos(ang)*k*Rr*.94,far=d>RADAR_RANGE;
    const moving=!s.seen,pulse=moving?.5+.5*Math.sin(t0*9):0;
    x.globalAlpha=far?.55:1;x.fillStyle=moving?'#ff2e55':'#cfd6ff';x.shadowColor=moving?'#ff2e55':'#9fb0ff';x.shadowBlur=14;
    x.beginPath();x.arc(px,py,9+pulse*5,0,7);x.fill();
    if(moving){x.shadowBlur=0;x.strokeStyle='rgba(255,46,85,'+(.7-pulse*.6)+')';x.lineWidth=3;x.beginPath();x.arc(px,py,16+pulse*12,0,7);x.stroke()}x.globalAlpha=1;x.shadowBlur=0}
  if(HO&&HO.delay<=0&&G.state==='play'){const dx=HO.x-P.x,dy=HO.y-P.y,d=Math.hypot(dx,dy);if(d<HOLLOW_HEAR_R*1.7){   // THE HOLLOW: amber diamond, only shown once it is within earshot
    const a=dx*fx+dy*fy,b=dx*rx+dy*ry,k=Math.min(1,d/RADAR_RANGE),ang=Math.atan2(b,a),px=C+Math.sin(ang)*k*Rr*.94,py=C-Math.cos(ang)*k*Rr*.94,pu=.5+.5*Math.sin(t0*(HO.mode==='hunt'?14:5)),q=11+pu*3;
    x.fillStyle='#ffb02e';x.shadowColor='#ffb02e';x.shadowBlur=14;x.beginPath();x.moveTo(px,py-q);x.lineTo(px+q*.8,py);x.lineTo(px,py+q);x.lineTo(px-q*.8,py);x.closePath();x.fill();x.shadowBlur=0}}
  x.restore();
  x.fillStyle='#5dff7a';x.beginPath();x.moveTo(C,C-11);x.lineTo(C+8,C+9);x.lineTo(C,C+4);x.lineTo(C-8,C+9);x.closePath();x.fill();   // you, facing up
  x.strokeStyle=near<350?'#ff2e55':'rgba(93,255,122,.7)';x.lineWidth=4;x.beginPath();x.arc(C,C,Rr,0,7);x.stroke();
  x.fillStyle='rgba(180,255,200,.85)';x.font='bold 22px monospace';x.textAlign='center';x.fillText(ST.length?Math.round(near/40)+' m':'clear',C,W-14)}
/* ---------- render ---------- */
function frame(dt){
  if(!P||!RG||G.state==='menu'||G.state==='intro'){R3.render(scene,cam);return}
  if(G.state==='scare'){scareFrame(dt);return}
  if(G.state==='hscare'){hollowScareFrame(dt);return}
  {const f=70+30*Math.max(0,punchT)+7*runK-(holding?5:0)+(cam.aspect<1.3?Math.min(30,(1.3-cam.aspect)*40):0);punchT-=dt*2.2;if(Math.abs(cam.fov-f)>.01){cam.fov=f;cam.updateProjectionMatrix()}}   // every scare punches the field of view
  if(phantom){phantom.t-=dt;if(phantom.t<=0){scene.remove(phantom.g);phantom=null}}glow.color.setHex(0x4455aa);glow.intensity=.08;
  flashT=Math.max(0,flashT-dt*2.5);$('flash').style.opacity=flashT*.9;
  const mv=P.hidden||!GFX.bob?0:P.bob,lat=Math.cos(P.ph)*.022*mv;   // head bob: dips on every footstep, sways side to side
  cam.position.set(P.x*S+Math.cos(VY())*lat,(P.hidden?1.3:lieT>0?lieH():1.6)-Math.abs(Math.sin(P.ph))*.035*mv+(P.hidden?0:Math.sin(t0*1.7)*.004),P.y*S-Math.sin(VY())*lat);cam.rotation.set(P.hidden?0:lieT>0?liePitch():pitch,VY(),Math.cos(P.ph)*.006*mv);
  if(shakeT>0){const k=Math.min(.06,shakeT*.05);cam.position.x+=rnd(-k,k);cam.position.y+=rnd(-k,k);cam.rotation.z=rnd(-k,k)*2;cam.rotation.x+=rnd(-k,k);shakeT-=dt}
  syncTorch(dt);for(const s of ST){s.g.position.set(s.x*S,0,s.y*S);s.g.rotation.y=Math.atan2(P.x-s.x,P.y-s.y);
    if(!s.seen){const lg=s.wind>0||s.lg>0;s.a+=((lg?1:Math.max(.1,Math.min(1,1.15-(s.d||999)/520)))-s.a)*Math.min(1,dt*(lg?9:2.5))}   // the closer it gets while unseen, the angrier its frozen pose (full claws while lunging)
    if(Math.abs(s.pa-s.a)>.004){poseStatue(s);s.pa=s.a}}
  hollowAnim(dt);
  for(const id in itemM){itemM[id].position.y=1+Math.sin(t0*3)*.08;itemM[id].rotation.y=t0}
  if(exitM){exitM.material.color.set(G.hasKey?0x1fa860:0x7a1230).convertSRGBToLinear();exitM.material.emissive.set(G.hasKey?0x0a5028:0x40081a).convertSRGBToLinear()}
  if(exitLk)exitLk.visible=!G.hasKey;
  M_TUBE.emissiveIntensity=flickT>0?.08:.4;
  if(strobeT>0){strobeT-=dt;strobeK-=dt;if(strobeK<=0){strobeK=.03+Math.random()*.09;const was=strobeLvl;strobeLvl=Math.random()<.5?0:Math.random()<.5?1:.35;if(P.light&&was!==strobeLvl)beep(rnd(1400,2400),.02,'square',.025)}if(strobeT<=0)strobeLvl=1}else strobeLvl=1;
  spot.intensity=P.light&&!P.hidden?(P.bat<20?FLASH.intensity*(.45+Math.random()*.45):FLASH.intensity)*(flickT>0?.4:1)*strobeLvl:0;
  spill.intensity=spot.intensity*.28;fxFrame(dt);
  const n=G.taken.filter(i=>i[0]==='f').length,t=target(),near=ST.some(s=>!s.seen&&s.d<260&&!P.hidden);
  $('hud').classList.toggle('low',P.hp<40);
  $('hud').textContent='💡 Battery '+'█'.repeat(Math.ceil(P.bat/10))+(G.bats?'   🔋×'+G.bats+(touchMode?'':' (B)'):'')+'\n❤ Health '+'█'.repeat(Math.ceil(P.hp/10))+'\n◆ Fragments '+n+'/'+TOTAL+(G.hasKey?'   🔑 Key':'')+'\n⚡ Stamina '+'█'.repeat(Math.ceil(sta/10)).padEnd(10,'░')+(tired?' (out of breath)':'')+'\n👁 Eyes '+'█'.repeat(Math.ceil(Math.max(0,eyeT)/2)).padEnd(10,'░')+' '+Math.ceil(Math.max(0,eyeT))+'s'+breathHud()+'\n➤ '+objective();
  $('prompt').textContent=t&&!trans?(touchMode?t.label.replace('[E] ',''):t.label):'';if(window.touchTick)touchTick(t&&!trans?t:null);$('msg').textContent=msgT>0?msg:'';
  $('warn').textContent=near&&eyeT<5?'— YOU’RE ABOUT TO BLINK —':near?'— DON’T LOOK AWAY —':eyeT<5&&!P.hidden?'— your eyes are drying out —':'';
  {const hw=hollowWarn();if(hw)$('warn').textContent=hw}
  $('slit').classList.toggle('hide',!P.hidden);
  const ds=Math.min(...ST.map(s=>s.seen?999:s.d),999),danger=Math.max(0,1-ds/200);
  $('vig').style.opacity=Math.min(.9,danger*.7+(100-P.hp)/200+(holding?.3:0)+hDet*.45);grainBoost=danger+(100-P.hp)/150;
  $('fade').style.opacity=trans?(trans.t<1?trans.t:2-trans.t):Math.max(boT>0?1:0,Math.max(0,Math.min(1,wakeT/2.5)));
  miniDraw(dt);radarDraw(dt);R3.render(scene,cam)}
let last=0;function loop(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(G.state==='play')update(dt);frame(dt);requestAnimationFrame(loop)}
requestAnimationFrame(loop);

/* ---------- MENU WHISPERS: words flicker for a split second somewhere on the main menu ---------- */
(function(){const W=['IT MOVED','DON’T BLINK','BEHIND YOU','LOOK AT ME','AKI','STONE REMEMBERS','DON’T LOOK AWAY','CLOSER','YOU STAYED BEHIND'],el=$('whisper');
  (function go(){setTimeout(()=>{if(G.state==='menu'&&el){el.textContent=W[Math.random()*W.length|0];el.style.left=rnd(6,78)+'%';el.style.top=rnd(8,88)+'%';el.style.transform='rotate('+rnd(-8,8)+'deg) scale('+rnd(.8,1.8)+')';el.classList.add('on');setTimeout(()=>el.classList.remove('on'),rnd(110,260))}go()},rnd(3500,10000))})()})();
