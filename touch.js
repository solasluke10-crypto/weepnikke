/* ECHOES AFTER MIDNIGHT 3D — touch controls (loaded after game.js, shares its globals).
   Left thumb: floating joystick (push to the rim to sprint) · Right thumb: drag to look
   Buttons: USE (E) · blink (G) · torch (F) · look back (O, hold) · top row: pause, notes, inventory, map, radar, battery, sound.
   Tune: LOOK_SENS (radians per pixel), JOY_R (joystick radius in px), SPRINT_AT (0..1 push needed to run). */
(()=>{
const LOOK_SENS=.0042,JOY_R=54,DEAD=.14,SPRINT_AT=.95,SPRINT_OFF=.8;
const root=document.documentElement,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};

/* ---------- build the overlay ---------- */
const ui=document.createElement('div');ui.id='touch';ui.className='hide';
ui.innerHTML=
 '<div id="tzone"></div>'+
 '<div id="jbase" class="idle"><div id="jknob"></div></div>'+
 '<div id="tbar">'+
   '<button data-k="p" aria-label="Pause">⏸</button><button data-k="j" aria-label="Notes">📓</button><button data-k="i" aria-label="Inventory">🎒</button>'+
   '<button data-k="n" aria-label="Map">🗺</button><button data-k="t" aria-label="Radar">📡</button><button data-k="b" id="tbB" aria-label="Use battery">🔋</button><button data-k="m" id="tbM" aria-label="Sound">🔊</button>'+
 '</div>'+
 '<button id="tbE" class="tb" aria-label="Interact"><b>✋</b><small>USE</small></button>'+
 '<button id="tbG" class="tb" aria-label="Blink"><b>👁</b><small>BLINK</small></button>'+
 '<button id="tbF" class="tb" aria-label="Flashlight"><b>🔦</b><small>LIGHT</small></button>'+
 '<button id="tbO" class="tb" aria-label="Look back (hold)"><b>↶</b><small>BEHIND</small></button>'+
 '<button id="tbH" class="tb" aria-label="Hold breath (hold)"><b>🫁</b><small>BREATH</small></button>';
$('wrap').appendChild(ui);
const zone=$('tzone'),jbase=$('jbase'),jknob=$('jknob'),tbE=$('tbE'),tbF=$('tbF'),tbB=$('tbB'),tbM=$('tbM');

/* ---------- touch mode on / off ---------- */
const BTN=['btnJ','btnInvX','btnMapX','btnUse'];BTN.forEach(id=>{const b=$(id);b.dataset.kb=b.textContent;b.dataset.tc=b.textContent.replace(/\s*\([A-Za-z]\)/,'')});
function setTouch(v){
  if(touchMode===v&&root.classList.contains('touch')===v)return;
  touchMode=v;root.classList.toggle('touch',v);if(!v)releaseAll();
  BTN.forEach(id=>{const b=$(id);b.textContent=v?b.dataset.tc:b.dataset.kb});
  setTimeout(()=>dispatchEvent(new Event('resize')),50)}
addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')setTouch(true);else if(e.pointerType==='mouse'&&!MOBILE)setTouch(false)},true);

/* ---------- SECRET GESTURE: walk forward twice, then backward three times ----------
   One "step" = push the joystick up (or down), hold it at least STEP_MIN ms, then let go or move it elsewhere.
   Do GESTURE (f = forward, b = backward) with no more than STEP_GAP ms between steps and the acheron picture opens,
   the same as typing "acheron" on a keyboard (and every angel becomes Alice). Change GESTURE to change the code. */
const GESTURE='ffbbb',STEP_MIN=140,STEP_GAP=3500;let gz='n',gT=0,gBuf=[],gLast=0;
function gestureZone(z){   // z: 'n' centre / released, 'f' up, 'b' down, 's' sideways
  if(z===gz)return;const now=performance.now();
  if((gz==='f'||gz==='b')&&now-gT>=STEP_MIN){
    if(now-gLast>STEP_GAP)gBuf=[];
    gBuf.push(gz);gBuf=gBuf.slice(-GESTURE.length);gLast=now;
    if(gBuf.join('')===GESTURE&&G.state==='play'){gBuf=[];buzz(40);openSecret()}}
  gz=z;gT=now}

/* ---------- joystick (left half) + look (right half) ----------
let joy=null,look=null,sprinting=false;
function homePos(){const w=innerWidth,h=innerHeight;return[Math.max(JOY_R+34,w*.13),h-JOY_R-Math.max(34,h*.1)]}
function placeBase(x,y){jbase.style.left=x+'px';jbase.style.top=y+'px'}
function resetKnob(){jknob.style.transform='translate(-50%,-50%)';jbase.classList.remove('run');jbase.classList.add('idle');const[x,y]=homePos();placeBase(x,y)}
function releaseJoy(){gestureZone('n');joy=null;keys.jx=keys.jy=0;if(sprinting){keys.shift=false;sprinting=false}resetKnob()}
function releaseAll(){releaseJoy();look=null;keys.o=false;keys[' ']=false;['tbE','tbG','tbF','tbO','tbH'].forEach(id=>$(id).classList.remove('down'))}
function joyMove(e){
  let dx=e.clientX-joy.x,dy=e.clientY-joy.y;const d=Math.hypot(dx,dy),m=Math.min(1,d/JOY_R);
  if(d>JOY_R){dx=dx/d*JOY_R;dy=dy/d*JOY_R}
  jknob.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))';
  if(m<DEAD){keys.jx=keys.jy=0;gestureZone('n')}else{const k=d?1/d:0,ux=(e.clientX-joy.x)*k,uy=(e.clientY-joy.y)*k;keys.jx=ux;keys.jy=-uy;gestureZone(uy<-.8?'f':uy>.8?'b':'s')}
  const run=sprinting?m>SPRINT_OFF:m>SPRINT_AT;if(run!==sprinting){sprinting=run;keys.shift=run;jbase.classList.toggle('run',run);if(run)buzz(8)}}
zone.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||G.state!=='play')return;e.preventDefault();
  if(e.clientX<innerWidth*.5){if(joy)return;joy={id:e.pointerId,x:e.clientX,y:e.clientY};zone.setPointerCapture(e.pointerId);
    jbase.classList.remove('idle');placeBase(joy.x,joy.y);joyMove(e)}
  else{if(look)return;look={id:e.pointerId,x:e.clientX,y:e.clientY};zone.setPointerCapture(e.pointerId)}});
zone.addEventListener('pointermove',e=>{
  if(joy&&e.pointerId===joy.id){e.preventDefault();joyMove(e)}
  else if(look&&e.pointerId===look.id){e.preventDefault();
    const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;
    if(G.state==='play'&&!P.hidden&&lieT<=0){yaw-=dx*LOOK_SENS;pitch=clamp(pitch-dy*LOOK_SENS,-1.2,1.2)}}});
const up=e=>{if(joy&&e.pointerId===joy.id)releaseJoy();if(look&&e.pointerId===look.id)look=null};
zone.addEventListener('pointerup',up);zone.addEventListener('pointercancel',up);zone.addEventListener('lostpointercapture',up);

/* ---------- buttons ---------- */
function press(el,down,release){
  el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{el.setPointerCapture(e.pointerId)}catch(_){}el.classList.add('down');buzz(10);down()});
  const end=e=>{if(!el.classList.contains('down'))return;el.classList.remove('down');if(release)release()};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end)}
const tap=k=>()=>{key(k,true);key(k,false)};
press(tbE,()=>key('e',true),()=>key('e',false));
press($('tbG'),tap('g'));
press(tbF,tap('f'));
press($('tbO'),()=>{keys.o=true},()=>{keys.o=false});
press($('tbH'),()=>{keys[' ']=true},()=>{keys[' ']=false});   // hold your breath (always on screen, so you can learn it before the hollow wakes)
ui.querySelectorAll('#tbar button').forEach(b=>press(b,tap(b.dataset.k)));

/* ---------- per-frame state (called from game.js frame()) ---------- */
const E_LABEL={hide:'HIDE',unhide:'LEAVE',lock:'DOOR',safe:'SAFE',desk:'TOUCH',exit:'EXIT'};let lastLbl='';
window.touchTick=t=>{
  const on=touchMode&&G.state==='play'&&lieT<=0;ui.classList.toggle('hide',!on);
  if(!on){if(joy||look||keys.o)releaseAll();return}
  tbE.classList.toggle('ready',!!t);
  const lbl=t?(E_LABEL[t.kind]||'USE'):'USE';if(lbl!==lastLbl){lastLbl=lbl;tbE.querySelector('small').textContent=lbl}
  tbF.classList.toggle('off',!P.light);tbB.classList.toggle('dim',!G.bats);
  const mi=muted?'🔇':'🔊';if(tbM.textContent!==mi)tbM.textContent=mi};
resetKnob();setTouch(touchMode);addEventListener('resize',()=>{if(!joy)resetKnob()});

/* ---------- housekeeping ---------- */
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play')togglePause()});   // phone locked / app switched → pause
addEventListener('orientationchange',()=>setTimeout(()=>dispatchEvent(new Event('resize')),250));
if(window.visualViewport)visualViewport.addEventListener('resize',()=>dispatchEvent(new Event('resize')));
document.addEventListener('contextmenu',e=>{if(touchMode)e.preventDefault()});
document.addEventListener('touchmove',e=>{if(touchMode&&(G.state==='play'||G.state==='pad'))e.preventDefault()},{passive:false});
['gesturestart','gesturechange'].forEach(n=>document.addEventListener(n,e=>e.preventDefault()));

/* ---------- fullscreen button (menu) ---------- */
const bf=$('btnFull'),de=document.documentElement,rqFS=de.requestFullscreen||de.webkitRequestFullscreen,exFS=document.exitFullscreen||document.webkitExitFullscreen;
if(bf){if(!rqFS)bf.remove();else bf.onclick=async()=>{try{
  if(document.fullscreenElement||document.webkitFullscreenElement)exFS.call(document);
  else{await rqFS.call(de);try{await screen.orientation.lock('landscape')}catch(e){}}}catch(e){}}}

/* ---------- secrets without a keyboard: tap the title 5× for the song, the tagline 5× for the picture ---------- */
function multiTap(el,n,fn){if(!el)return;let c=0,t0=0;el.addEventListener('click',()=>{const now=Date.now();c=now-t0>2500?1:c+1;t0=now;if(c>=n){c=0;fn()}})}
multiTap(document.querySelector('#menu h1'),5,()=>toggleUma());
multiTap(document.querySelector('#menu .tag'),5,()=>openSecret());
})();
