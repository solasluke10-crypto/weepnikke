/* ===== ALICE (NIKKE) 3D MODEL =====
   Turns the data in alice-data.js (made by tools/build_alice.py) into a three.js model that game.js uses
   in place of the stone angel. Load order in index.html: three.js -> alice-data.js -> alice.js -> game.js.

   Tune here:
   HEIGHT   how tall she is in metres before the statue's own 1.22x scale (the old angel is about 2.1)
   FACING   spin in radians so she faces the way the game's statues face (+z). The export faces +x, so -PI/2.
   LEAN     how far (radians) she tips towards you at full aggression
   TINT     colour multiplied over her textures (0xffffff = untouched; try 0xb8b8c4 for a grey, ghostly look)
   EYE_GLOW colour her eyes glow once she has moved (the intensity is set by poseStatue() in game.js)  */
const ALICE_CFG={HEIGHT:1.85,FACING:-Math.PI/2,LEAN:.2,TINT:0xffffff,EYE_GLOW:0xff1010};

const ALICE=(()=>{
  const A={ready:false,make:null},D=window.ALICE_DATA;
  if(!D||typeof THREE==='undefined')return A;   // data file or three.js missing: the game just keeps using the angel

  const bytes=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer};

  /* one BufferGeometry per material (Bottom, Coat, HairBack, Face, Eyes...), shared by every Alice in the game */
  const geos={};
  for(const [name,p] of Object.entries(D.parts)){
    const g=new THREE.BufferGeometry(),n8=new Int8Array(bytes(p.nor)),nor=new Float32Array(n8.length);
    for(let i=0;i<n8.length;i++)nor[i]=n8[i]/127;
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(bytes(p.pos)),3));
    g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(bytes(p.uv)),2));
    g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    g.setIndex(new THREE.BufferAttribute(p.index16?new Uint16Array(bytes(p.idx)):new Uint32Array(bytes(p.idx)),1));
    g.computeBoundingSphere();geos[name]=g}

  /* textures decode in the background; Alice only starts spawning once all of them are ready */
  const mats={};let waiting=Object.keys(D.textures).length;
  for(const [name,url] of Object.entries(D.textures)){
    const img=new Image(),tex=new THREE.Texture(img);
    tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;
    img.onload=()=>{tex.needsUpdate=true;if(--waiting===0)A.ready=true};
    img.onerror=()=>console.warn('Alice texture failed:',name);
    img.src=url;
    mats[name]=new THREE.MeshStandardMaterial({map:tex,roughness:.85,metalness:0,side:THREE.DoubleSide,color:new THREE.Color(ALICE_CFG.TINT).convertSRGBToLinear()})}

  /* A.make({castShadow}) -> THREE.Group of Alice, feet on y=0, facing +z, ready to be added to a statue group.
     group.eyeMats = her eye materials; tip the whole group (rotation.x) to lean her (poseStatue() makes them glow). */
  A.make=(opt={})=>{
    const b=D.bounds,k=ALICE_CFG.HEIGHT/(b.max[1]-b.min[1]),lean=new THREE.Group(),turn=new THREE.Group(),model=new THREE.Group();
    model.scale.setScalar(k);
    model.position.set(-D.pivot[0]*k,-b.min[1]*k,-D.pivot[1]*k);   // feet on the floor, middle of her shoes on the origin
    turn.rotation.y=ALICE_CFG.FACING;   // spins the model, not the statue group, so the game's own rotation.y still points her at you
    turn.add(model);lean.add(turn);lean.eyeMats=[];
    for(const name of Object.keys(geos)){
      let mt=mats[name];
      if(name==='Eyes'){mt=mt.clone();mt.emissive=new THREE.Color(ALICE_CFG.EYE_GLOW);mt.emissiveMap=mt.map;mt.emissiveIntensity=0;lean.eyeMats.push(mt)}
      const m=new THREE.Mesh(geos[name],mt);m.castShadow=!!opt.castShadow;m.receiveShadow=true;model.add(m)}
    return lean};
  return A})();
