/* ===========================================================
   render.js – renderer, chunky, mesher se světlem a AO, obloha
   =========================================================== */
(function () {
'use strict';
const { B, BL, H, CH, SEA, SOLID, OCC, EMIT, T } = W;
const G = window.G = { R: 7 };

/* ---------- renderer ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.08, 1200);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.fog = new THREE.Fog(0x9fc8ff, 40, 110);
G.renderer = renderer; G.scene = scene; G.camera = camera;
function resize() { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); if (window.__postReady) makeRT(); }
window.addEventListener('resize', resize); resize();

/* ---------- atlas + materiály ---------- */
const atlasTex = TEX.atlasTexture();
G.atlasTex = atlasTex;

const U = {
  map: { value: atlasTex }, uSun: { value: 1 }, uDay: { value: 1 },
  uFogColor: { value: scene.fog.color }, uFogNear: { value: 40 }, uFogFar: { value: 110 },
  uPP: { value: new THREE.Vector3() }, uHeld: { value: 0 }, uTime: { value: 0 }, uWet: { value: 0 },
  uQ: { value: 2 }, uShadow: { value: null }, uShadowM: { value: new THREE.Matrix4() }, uShOn: { value: 0 }, uShTexel: { value: 1 / 2048 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunI: { value: 1 }, uSunCol: { value: new THREE.Color(1, .93, .8) },
  uWaterT: { value: W.T.WATER }, uLavaT: { value: W.T.LAVA }, uSea: { value: W.SEA }, uMT: { value: new THREE.Vector4(W.T.GOLD_BLOCK, W.T.IRON_BLOCK, W.T.DIAMOND_BLOCK, W.T.EMERALD_BLOCK) }, uGlassT: { value: W.T.GLASS }, uSkyTop: { value: new THREE.Color(.3, .5, .9) }, uSkyHor: { value: new THREE.Color(.6, .75, .95) }
};
const VERT = `
attribute vec3 aShade; attribute vec2 aLight;
varying vec2 vUv; varying vec3 vShade; varying vec2 vLight; varying float vDepth; varying vec3 vWorld;
void main(){ vWorld=(modelMatrix*vec4(position,1.0)).xyz; vUv=uv; vShade=aShade; vLight=aLight; vec4 mv=modelViewMatrix*vec4(position,1.0); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`;
const FRAG = `
uniform vec3 uPP; uniform float uHeld; uniform float uTime; uniform float uWet; varying vec3 vWorld;
uniform sampler2D map; uniform float uSun; uniform float uDay; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
uniform float uQ; uniform sampler2D uShadow; uniform mat4 uShadowM; uniform float uShOn; uniform float uShTexel;
uniform vec3 uSunDir; uniform float uSunI; uniform vec3 uSunCol; uniform float uWaterT; uniform float uLavaT; uniform float uSea; uniform vec4 uMT; uniform float uGlassT; uniform vec3 uSkyTop; uniform vec3 uSkyHor;
varying vec2 vUv; varying vec3 vShade; varying vec2 vLight; varying float vDepth;

vec4 smoothTex(vec2 uv, out float H){
  vec2 S=vec2(128.0,256.0);
  vec2 p=uv*S; vec2 t0=floor(p/16.0)*16.0;
  vec2 q=p-0.5; vec2 i=floor(q); vec2 f=fract(q);
  f=f*f*(3.0-2.0*f);
  vec2 a=clamp(i,t0,t0+15.0); vec2 b=clamp(i+1.0,t0,t0+15.0);
  vec4 c00=texture2D(map,(a+0.5)/S); vec4 c10=texture2D(map,(vec2(b.x,a.y)+0.5)/S);
  vec4 c01=texture2D(map,(vec2(a.x,b.y)+0.5)/S); vec4 c11=texture2D(map,(b+0.5)/S);
  float w00=(1.0-f.x)*(1.0-f.y)*c00.a, w10=f.x*(1.0-f.y)*c10.a, w01=(1.0-f.x)*f.y*c01.a, w11=f.x*f.y*c11.a;
  float ws=w00+w10+w01+w11;
  vec3 rgb=(c00.rgb*w00+c10.rgb*w10+c01.rgb*w01+c11.rgb*w11)/max(ws,0.0001);
  float al=mix(mix(c00.a,c10.a,f.x),mix(c01.a,c11.a,f.x),f.y);
  vec3 L=vec3(0.299,0.587,0.114);
  float h00=dot(c00.rgb,L),h10=dot(c10.rgb,L),h01=dot(c01.rgb,L),h11=dot(c11.rgb,L);
  H=mix(mix(h00,h10,f.x),mix(h01,h11,f.x),f.y);
  return vec4(rgb,al);
}
float shadowAt(vec3 wp, vec3 n){
  vec3 p=wp+n*0.09+uSunDir*0.04;
  vec3 sc=(uShadowM*vec4(p,1.0)).xyz;
  if(sc.x<0.0||sc.x>1.0||sc.y<0.0||sc.y>1.0||sc.z>1.0) return 1.0;
  float cur=sc.z-0.00035; float s=0.0;
  for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){
    float d=texture2D(uShadow,sc.xy+vec2(float(i),float(j))*uShTexel*1.25).r;
    s+=(cur>d)?0.0:1.0;
  }
  s/=9.0;
  vec2 e=abs(sc.xy-0.5)*2.0; float fade=smoothstep(0.78,1.0,max(e.x,e.y));
  return mix(s,1.0,fade);
}
vec2 waveGrad(vec2 p, float t, float amp){
  vec2 g=vec2(0.0);
  g+=cos(dot(p,vec2(0.83,0.55))*1.7+t*1.3)*vec2(0.83,0.55)*1.7*0.040;
  g+=cos(dot(p,vec2(-0.40,0.92))*2.6+t*1.7)*vec2(-0.40,0.92)*2.6*0.028;
  g+=cos(dot(p,vec2(0.97,-0.25))*4.7+t*2.3)*vec2(0.97,-0.25)*4.7*0.016;
  g+=cos(dot(p,vec2(-0.70,-0.71))*8.3+t*3.1)*vec2(-0.70,-0.71)*8.3*0.007*(1.0+amp*2.0);
  return g;
}
float hash21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y); }
float fbmN(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.0,9.0); a*=0.5; } return s; }
float caustic(vec2 p,float t){
  float a=sin(p.x*1.9+t*1.1+sin(p.y*1.4+t*0.7)*1.7), b=sin(p.y*2.1-t*0.9+sin(p.x*1.2-t*0.6)*1.5), c=sin((p.x+p.y)*1.3+t*0.8);
  float v=1.0-abs(a*b+0.35*c); return pow(clamp(v,0.0,1.0),7.0);
}
void main(){
  float H=0.0; vec4 t;
  if(uQ>1.5) t=smoothTex(vUv,H); else t=texture2D(map,vUv);
  #ifdef CUTOUT
  if(t.a<0.5) discard;
  #else
  if(t.a<0.02) discard;
  #endif
  float sky=vLight.x*uSun; float bl=vLight.y;
  if(uHeld>0.0){ float hd=distance(vWorld,uPP+vec3(0.0,1.0,0.0)); float hl=uHeld*pow(clamp(1.0-hd/13.0,0.0,1.0),1.4)*(0.96+0.04*sin(uTime*14.0)); bl=max(bl,hl); }
  if(uQ<1.5){
    float l=max(sky,bl);
    l=0.045+0.955*pow(l,1.35);
    vec3 tint=mix(vec3(1.0),vec3(1.25,1.0,0.72),clamp((bl-sky)*1.6,0.0,1.0));
    vec3 night=mix(vec3(0.62,0.72,1.12),vec3(1.0),uDay);
    vec3 c=t.rgb*vShade*l*tint*mix(vec3(1.0),night,clamp(sky,0.0,1.0)*(1.0-clamp(bl,0.0,1.0)));
    float hh=fract(sin(dot(floor(vWorld*22.0+0.37), vec3(12.9898,78.233,37.719)))*43758.5453);
    c*=0.95+0.1*hh;
    c*=1.0+0.05*sin(vWorld.x*0.11+sin(vWorld.z*0.07)*2.0)*sin(vWorld.z*0.13);
    c*=mix(1.0,0.8,uWet);
    float f=smoothstep(uFogNear,uFogFar,vDepth);
    gl_FragColor=vec4(mix(c,uFogColor,f),t.a);
    return;
  }
  // ---------- realistický režim ----------
  vec3 dpx=dFdx(vWorld), dpy=dFdy(vWorld);
  vec3 ng=normalize(cross(dpx,dpy));
  vec3 V=cameraPosition-vWorld; float dist=length(V); V/=dist;
  if(dot(ng,V)<0.0) ng=-ng;
  float tcol=floor(vUv.x*8.0), trow=15.0-floor(vUv.y*16.0);
  bool isWater=abs(trow*8.0+tcol-uWaterT)<0.5;
  bool isLava=abs(trow*8.0+tcol-uLavaT)<0.5;
  if(isLava){
    vec2 lp=abs(ng.y)>0.5?vWorld.xz:(abs(ng.x)>abs(ng.z)?vWorld.zy:vWorld.xy);
    lp*=0.8; float tt=uTime*0.1;
    vec2 w=vec2(fbmN(lp*1.2+tt),fbmN(lp*1.2-tt+5.0));
    float m=fbmN(lp*1.05+w*1.7+vec2(tt*1.6,-tt));
    float crust=smoothstep(0.44,0.64,m);
    float veins=1.0-smoothstep(0.0,0.10,abs(m-0.47));
    vec3 hot=mix(vec3(1.55,0.50,0.06),vec3(2.0,1.35,0.45),veins);
    vec3 cr=vec3(0.20,0.045,0.02)*(0.55+0.9*fbmN(lp*5.0));
    vec3 lc=mix(hot,cr,crust)+vec3(1.0,0.32,0.04)*veins*0.55*(0.5+0.5*sin(uTime*1.6+m*11.0));
    lc*=0.9+0.1*sin(uTime*1.3+w.x*8.0);
    lc=mix(lc,lc*vec3(0.6,0.5,0.45),uWet*0.0);
    gl_FragColor=vec4(mix(lc,uFogColor,smoothstep(uFogNear,uFogFar,vDepth)),1.0);
    return;
  }
  vec3 n=ng;
  float bs=0.17*(1.0-smoothstep(18.0,55.0,dist));
  if(!isWater && bs>0.0){
    vec3 r1=cross(dpy,n), r2=cross(n,dpx); float det=dot(dpx,r1);
    vec3 g=sign(det)*(dFdx(H)*r1+dFdy(H)*r2);
    n=normalize(abs(det)*n-bs*g);
  }
  float fsF=ng.y>0.5?1.0:(ng.y<-0.5?0.5:(abs(ng.x)>abs(ng.z)?0.66:0.82));
  vec3 shadeT=min(vShade/fsF,vec3(1.15));
  float skyOpen=smoothstep(0.30,0.80,vLight.x);
  float ndl=max(dot(n,uSunDir),0.0);
  float shd=1.0;
  if(uShOn>0.5 && ndl>0.0 && skyOpen>0.0) shd=shadowAt(vWorld,ng);
  float sunT=uSunI*ndl*shd*skyOpen*(1.0-0.85*uWet);
  float curveS=0.045+0.955*pow(sky,1.35);
  vec3 ambTint=mix(vec3(0.62,0.72,1.12),vec3(0.80,0.91,1.10),uDay);
  float hemi=0.55+0.45*(n.y*0.5+0.5);
  vec3 amb=curveS*ambTint*hemi*0.50*(1.0+0.7*uWet);
  amb+=vec3(0.10,0.13,0.22)*(1.0-uDay)*hemi*skyOpen*0.55;   // měsíční světlo
  float curveB=0.045+0.955*pow(bl,1.35);
  vec3 bc=curveB*vec3(1.25,1.0,0.72)*0.95;
  vec3 lightC=max(amb,bc)+uSunCol*sunT*0.82;
  vec3 col=t.rgb;
  float outA=t.a;
  if(isWater && ng.y>0.5){
    vec2 gr=waveGrad(vWorld.xz,uTime,uWet)*(1.0-0.85*smoothstep(25.0,110.0,dist));
    { vec2 rp=vWorld.xz*3.1+uTime*vec2(0.33,0.21); float e0=0.11; float n0=fbmN(rp), nx=fbmN(rp+vec2(e0,0.0)), nz=fbmN(rp+vec2(0.0,e0));
      vec2 rg=vec2(n0-nx,n0-nz)/e0; gr+=rg*0.055*(1.0-smoothstep(10.0,48.0,dist))*(1.0+uWet*1.5); }
    vec3 wn=normalize(vec3(-gr.x,1.0,-gr.y));
    vec3 R=reflect(-V,wn);
    float F=0.03+0.97*pow(1.0-max(dot(wn,V),0.0),4.0);
    vec3 refl=mix(uSkyHor,uSkyTop,pow(clamp(R.y,0.0,1.0),0.5));
    float sp=pow(max(dot(R,uSunDir),0.0),420.0)*uSunI*(1.0-uWet);
    vec3 body=col*vec3(0.55,0.85,0.95)*(max(amb,bc)*1.1+uSunCol*uSunI*0.25*max(uSunDir.y,0.0));
    float glit=pow(max(dot(R,uSunDir),0.0),70.0)*step(0.80,vnoise(vWorld.xz*8.5+uTime*vec2(1.4,0.8)))*uSunI*(1.0-uWet)*(1.0-smoothstep(30.0,100.0,dist));
    body*=vec3(0.78,0.92,1.0);
    body+=vec3(0.01,0.09,0.11)*(0.4+0.6*uDay)*(0.5+0.5*fbmN(vWorld.xz*0.9+uTime*0.15));
    vec3 outc=mix(body,refl*(0.55+0.45*uDay),clamp(F*1.25,0.0,1.0))+uSunCol*sp*7.0+uSunCol*glit*3.0;
    float fogW=smoothstep(uFogNear,uFogFar,vDepth);
    gl_FragColor=vec4(mix(outc,uFogColor,fogW),mix(0.62,0.95,clamp(F*1.4,0.0,1.0)));
    return;
  }
  vec3 c=col*shadeT*lightC;
  if(vWorld.y<uSea+0.02 && vLight.x>0.04 && ng.y>-0.5){
    float dpt=clamp((uSea+0.95-vWorld.y)*0.2,0.0,0.78);
    c=mix(c,c*vec3(0.42,0.78,0.95),dpt);
    float cs=caustic(vWorld.xz*1.35,uTime)*0.5+caustic(vWorld.xz*2.3+3.0,uTime*1.3)*0.35;
    c+=vec3(0.55,0.85,1.0)*cs*uSunI*skyOpen*(0.25+0.75*max(ng.y,0.0))*(1.0-dpt*0.6)*(1.0-smoothstep(12.0,40.0,dist));
  }
  // jemná mikro-zrnitost povrchu
  float hh=fract(sin(dot(floor(vWorld*26.0+0.37), vec3(12.9898,78.233,37.719)))*43758.5453);
  { float nf=1.0-smoothstep(10.0,34.0,dist);
    float d1=fract(sin(dot(floor(vWorld*52.0+0.31),vec3(12.9898,78.233,37.719)))*43758.5453);
    float d2=fract(sin(dot(floor(vWorld*104.0+0.77),vec3(39.346,11.135,83.155)))*24634.6345);
    c*=1.0+((d1-0.5)*0.20+(d2-0.5)*0.12)*nf; }
  c*=0.97+0.06*hh;
  { vec2 mp=vWorld.xz*0.21+vWorld.y*0.13; vec2 mi=floor(mp), mf=fract(mp); mf=mf*mf*(3.0-2.0*mf);
    float m1=mix(mix(fract(sin(dot(mi,vec2(12.9,78.2)))*43758.5),fract(sin(dot(mi+vec2(1.0,0.0),vec2(12.9,78.2)))*43758.5),mf.x),mix(fract(sin(dot(mi+vec2(0.0,1.0),vec2(12.9,78.2)))*43758.5),fract(sin(dot(mi+vec2(1.0,1.0),vec2(12.9,78.2)))*43758.5),mf.x),mf.y);
    vec2 mp2=vWorld.xz*0.057; vec2 mi2=floor(mp2), mf2=fract(mp2); mf2=mf2*mf2*(3.0-2.0*mf2);
    float m2=mix(mix(fract(sin(dot(mi2,vec2(39.3,11.1)))*23421.6),fract(sin(dot(mi2+vec2(1.0,0.0),vec2(39.3,11.1)))*23421.6),mf2.x),mix(fract(sin(dot(mi2+vec2(0.0,1.0),vec2(39.3,11.1)))*23421.6),fract(sin(dot(mi2+vec2(1.0,1.0),vec2(39.3,11.1)))*23421.6),mf2.x),mf2.y);
    c*=vec3(1.0)+((m1-0.5)*0.20+(m2-0.5)*0.34)*vec3(0.9,0.7,-0.5)*max(ng.y,0.35);
    c*=0.94+0.12*m1; }
  c*=1.0+0.05*sin(vWorld.x*0.11+sin(vWorld.z*0.07)*2.0)*sin(vWorld.z*0.13);
  // mokré povrchy: ztmavení + lesk odrazu oblohy
  float wetF=uWet*max(ng.y,0.0)*skyOpen;
  c*=mix(1.0,0.84,uWet);
  float Fr=0.04+0.96*pow(1.0-max(dot(n,V),0.0),5.0);
  c+=uSkyHor*Fr*wetF*0.55*(0.4+0.6*uDay);
  // PBR-lite: kovové bloky, sklo a mokré povrchy odrážejí oblohu a slunce
  float tid=trow*8.0+tcol;
  float metal=step(abs(tid-uMT.x),0.5)+step(abs(tid-uMT.y),0.5)+step(abs(tid-uMT.z),0.5)+step(abs(tid-uMT.w),0.5);
  float glassF=step(abs(tid-uGlassT),0.5);
  vec3 Hh=normalize(uSunDir+V);
  float ndh=max(dot(n,Hh),0.0);
  float gloss=clamp(metal+glassF*0.8+wetF*0.5,0.0,1.0);
  float shin=mix(10.0,260.0,gloss);
  float sunVis=uSunI*shd*skyOpen*step(0.001,ndl);
  c+=uSunCol*pow(ndh,shin)*sunVis*(0.05+metal*1.3+glassF*0.9+wetF*0.5);
  vec3 Rv=reflect(-V,n);
  vec3 envC=mix(uSkyHor,uSkyTop,pow(clamp(Rv.y,0.0,1.0),0.5))*(0.35+0.65*uDay)*skyOpen+vec3(0.04)*(1.0-skyOpen);
  float Fm=0.15+0.85*pow(1.0-max(dot(n,V),0.0),4.0);
  c=mix(c,col*envC*1.7+envC*0.15,clamp(metal*(0.35+0.45*Fm),0.0,0.8));
  c+=envC*Fm*glassF*0.5;
  outA=max(outA,glassF*Fm*0.85);
  // mlha s rozptylem směrem ke slunci
  float f=smoothstep(uFogNear,uFogFar,vDepth);
  float sg=pow(max(dot(-V,uSunDir),0.0),6.0);
  vec3 fogc=uFogColor+uSunCol*sg*0.22*uSunI*(1.0-uWet);
  gl_FragColor=vec4(mix(c,fogc,f),outA);
}`;
const matOpaque = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, defines: { CUTOUT: 1 }, extensions: { derivatives: true } });
const matTrans = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true } });
G.U = U;

/* ---------- úložiště chunků ---------- */
const chunks = new Map();
const modsMap = new Map();
G.chunks = chunks; G.modsMap = modsMap;
const ckey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
G.ckey = ckey;
G.modsDirty = false;

G.getChunk = (cx, cz) => chunks.get(ckey(cx, cz));
const getB = G.getB = function (x, y, z) {
  if (y < 0) return B.BEDROCK;
  if (y >= H) return B.AIR;
  const c = chunks.get(ckey(x >> 4, z >> 4));
  if (!c) return B.STONE;
  return c.data[((y * CH) + (z & 15)) * CH + (x & 15)];
};
G.isLoaded = (x, z) => chunks.has(ckey(x >> 4, z >> 4));
const dirty = new Set();
G.dirty = dirty;
G.setBlock = function (x, y, z, id) {
  if (y < 0 || y >= H) return false;
  const cx = x >> 4, cz = z >> 4, c = chunks.get(ckey(cx, cz));
  if (!c) return false;
  const lx = x & 15, lz = z & 15, li = (y * CH + lz) * CH + lx;
  const oldId = c.data[li];
  if (oldId === id) return false;
  c.data[li] = id;
  const k = ckey(cx, cz);
  let m = modsMap.get(k); if (!m) { m = {}; modsMap.set(k, m); }
  m[li] = id; G.modsDirty = true;
  // výška sloupce
  const hi = lz * CH + lx;
  if (SOLID[id] || W.isWater(id)) { if (y > c.hmap[hi]) c.hmap[hi] = y; }
  else if (y === c.hmap[hi]) { let yy = y - 1; while (yy > 0 && !SOLID[c.data[(yy * CH + lz) * CH + lx]] && !W.isWater(c.data[(yy * CH + lz) * CH + lx])) yy--; c.hmap[hi] = yy; }
  dirty.add(k);
  if (G.fluidKick) G.fluidKick(x, y, z);
  if (G.rsHook) G.rsHook(x, y, z, oldId, id);
  const P = 8;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dz) continue;
    if ((dx < 0 && lx < P) || (dx > 0 && lx >= CH - P) || (dx === 0 && false)) { if (dz === 0) dirty.add(ckey(cx + dx, cz)); }
    if ((dz < 0 && lz < P) || (dz > 0 && lz >= CH - P)) { if (dx === 0) dirty.add(ckey(cx, cz + dz)); }
    if (dx && dz && ((dx < 0 && lx < P) || (dx > 0 && lx >= CH - P)) && ((dz < 0 && lz < P) || (dz > 0 && lz >= CH - P))) dirty.add(ckey(cx + dx, cz + dz));
  }
  return true;
};
/* je sloupec odkrytý nebi? */
G.skyExposed = function (x, y, z) {
  const c = chunks.get(ckey(x >> 4, z >> 4));
  if (!c) return false;
  return c.hmap[(z & 15) * CH + (x & 15)] < y;
};
G.topY = function (x, z) {
  const c = chunks.get(ckey(x >> 4, z >> 4));
  return c ? c.hmap[(z & 15) * CH + (x & 15)] : -1;
};

/* ---------- mesher ---------- */
const PAD = 8, PW = CH + 2 * PAD, PH = H + 2; // 32, 98
const PSZ = PW * PW * PH;
const pb = new Uint8Array(PSZ), sl = new Uint8Array(PSZ), bl = new Uint8Array(PSZ);
const colTop = new Int16Array(PW * PW);
const queue = new Int32Array(PSZ);
const pidx = (x, y, z) => ((y + 1) << 10) | (z << 5) | x;
const AOO = new Uint8Array(256); for (let i = 0; i < 256; i++) AOO[i] = (BL[i] && (BL[i].occ || i === B.LEAVES)) ? 1 : 0;
const QCAP = 26000;
function newBuilder(cap) { return { n: 0, cap, pos: new Float32Array(cap * 12), uv: new Float32Array(cap * 8), sh: new Float32Array(cap * 12), li: new Float32Array(cap * 8) }; }
const MO = newBuilder(QCAP), MT = newBuilder(8000);

const TINT = [[.9, 1, .9], [1, 1, .85], [1.05, 1.05, .9], [.72, .9, .68], [1.25, 1, .6], [.8, 1, 1], [.85, 1, .85]]; // dle biomu
const FD = [
  [1, 0, 0, 1, 0, 1, 0, 0, -1, 0, 1, 0, .66],
  [-1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, .66],
  [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, -1, 1],
  [0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, .5],
  [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, .82],
  [0, 0, -1, 1, 0, 0, -1, 0, 0, 0, 1, 0, .82]
];
const CU = [0, 1, 1, 0], CV = [0, 0, 1, 1];
const AOV = [.45, .66, .83, 1];
const FOFF = FD.map(f => ({
  n: f[1] * 1024 + f[2] * 32 + f[0],
  u: f[7] * 1024 + f[8] * 32 + f[6],
  v: f[10] * 1024 + f[11] * 32 + f[9]
}));

let padCX = 0, padCZ = 0;
function fillPadded(cx, cz) {
  padCX = cx; padCZ = cz;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const c = chunks.get(ckey(cx + dx, cz + dz));
    const lx0 = dx < 0 ? 8 : 0, lx1 = dx > 0 ? 8 : 16, lz0 = dz < 0 ? 8 : 0, lz1 = dz > 0 ? 8 : 16;
    const px0 = PAD + dx * 16 + lx0;
    for (let y = 0; y < H; y++) {
      for (let lz = lz0; lz < lz1; lz++) {
        const pz = PAD + dz * 16 + lz;
        const di = pidx(px0, y, pz);
        if (c) { const si = (y * CH + lz) * CH + lx0; pb.set(c.data.subarray(si, si + (lx1 - lx0)), di); }
        else pb.fill(0, di, di + (lx1 - lx0));
      }
    }
  }
  // spodní vrstva = pevná, horní = vzduch
  pb.fill(B.BEDROCK, 0, PW * PW);
  pb.fill(0, (H + 1) << 10, PSZ);
}

function computeLight(yMax) {
  sl.fill(0); bl.fill(0);
  const top = yMax + 2; // nad touto vrstvou je všude 15
  // sluneční světlo: sloupce
  for (let pz = 0; pz < PW; pz++) for (let px = 0; px < PW; px++) {
    let level = 15, t = -1;
    for (let y = H; y >= 0; y--) {
      const i = pidx(px, y, pz), b = pb[i];
      if (OCC[b]) { t = y; break; }
      if (b === B.LEAVES) level = level > 2 ? level - 2 : 0;
      else if (W.isWater(b)) level = level > 5 ? level - 1 : level;
      sl[i] = level;
    }
    colTop[pz * PW + px] = t;
  }
  let qh = 0, qt = 0;
  for (let pz = 1; pz < PW - 1; pz++) for (let px = 1; px < PW - 1; px++) {
    const t = colTop[pz * PW + px];
    let m = t;
    const a = colTop[pz * PW + px - 1], b2 = colTop[pz * PW + px + 1], c = colTop[(pz - 1) * PW + px], d = colTop[(pz + 1) * PW + px];
    if (a > m) m = a; if (b2 > m) m = b2; if (c > m) m = c; if (d > m) m = d;
    for (let y = t + 1; y <= m && y < H; y++) { const i = pidx(px, y, pz); if (sl[i] > 2) queue[qt++] = i; }
  }
  qt = bfs(sl, qh, qt);
  // světlo bloků
  qh = 0; qt = 0;
  for (let y = 0; y <= yMax + 1; y++) {
    const base = (y + 1) << 10;
    for (let k = 0; k < 1024; k++) {
      const i = base | k;
      let e = EMIT[pb[i]];
      if (pb[i] === B.FURN && G.furnLight) e = G.furnLight(padCX * 16 + (k & 31) - PAD, y, padCZ * 16 + ((k >> 5) & 31) - PAD);
      if (e) { bl[i] = e; queue[qt++] = i; }
    }
  }
  if (qt) bfs(bl, 0, qt);
}
function bfs(arr, qh, qt) {
  const off = [1, -1, 32, -32, 1024, -1024];
  while (qh < qt) {
    const i = queue[qh++];
    const L = arr[i] - 2;
    if (L <= 0) continue;
    const x = i & 31, z = (i >> 5) & 31, yl = i >> 10;
    for (let k = 0; k < 6; k++) {
      if (k === 0 && x === 31) continue; if (k === 1 && x === 0) continue;
      if (k === 2 && z === 31) continue; if (k === 3 && z === 0) continue;
      if (k === 4 && yl >= PH - 1) continue; if (k === 5 && yl <= 0) continue;
      const n = i + off[k];
      if (arr[n] >= L || OCC[pb[n]]) continue;
      arr[n] = L; queue[qt++] = n;
    }
  }
  return qt;
}

function quad(M, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, tile, shR, shG, shB, sky, blk, flipUV) {
  if (M.n >= M.cap) return;
  const n = M.n++, p = n * 12, u = n * 8;
  const P = M.pos; P[p] = ax; P[p + 1] = ay; P[p + 2] = az; P[p + 3] = bx; P[p + 4] = by; P[p + 5] = bz; P[p + 6] = cx; P[p + 7] = cy; P[p + 8] = cz; P[p + 9] = dx; P[p + 10] = dy; P[p + 11] = dz;
  const u0 = (tile & 7) / 8 + .0004, v0 = 1 - ((tile >> 3) + 1) / 16 + .0004, s = .125 - .0008, sv = .0625 - .0008;
  const UV = M.uv;
  UV[u] = u0; UV[u + 1] = v0; UV[u + 2] = u0 + s; UV[u + 3] = v0; UV[u + 4] = u0 + s; UV[u + 5] = v0 + sv; UV[u + 6] = u0; UV[u + 7] = v0 + sv;
  for (let k = 0; k < 4; k++) { M.sh[p + k * 3] = shR; M.sh[p + k * 3 + 1] = shG; M.sh[p + k * 3 + 2] = shB; M.li[u + k * 2] = sky; M.li[u + k * 2 + 1] = blk; }
}

function emitFace(M, f, x, y, z, i, tile, tr, tg, tb, emissive, ins, ymaxFrac) {
  const F = FD[f], O = FOFF[f];
  const Fi = i + O.n;
  const fs = sl[Fi], fb = bl[Fi];
  const ao = [0, 0, 0, 0], ls = [0, 0, 0, 0], lb = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const su = CU[k] ? O.u : -O.u, sv = CV[k] ? O.v : -O.v;
    const A = Fi + su, Bc = Fi + sv, C = Fi + su + sv;
    const a = AOO[pb[A]], b = AOO[pb[Bc]], c = AOO[pb[C]];
    ao[k] = AOV[(a && b) ? 0 : 3 - (a + b + c)];
    const a1 = OCC[pb[A]], b1 = OCC[pb[Bc]], c1 = OCC[pb[C]];
    const sa = a1 ? fs : sl[A], sb = b1 ? fs : sl[Bc], sc = (c1 || (a1 && b1)) ? fs : sl[C];
    ls[k] = (fs + sa + sb + sc) / 60;
    const ba = a1 ? fb : bl[A], bb = b1 ? fb : bl[Bc], bc = (c1 || (a1 && b1)) ? fb : bl[C];
    lb[k] = (fb + ba + bb + bc) / 60;
  }
  if (emissive) { for (let k = 0; k < 4; k++) { ls[k] = 1; lb[k] = 1; ao[k] = Math.max(ao[k], .85); } }
  const flip = ao[0] + ao[2] < ao[1] + ao[3];
  if (M.n >= M.cap) return;
  const n = M.n++, p = n * 12, u = n * 8;
  const u0 = (tile & 7) / 8 + .0004, v0 = 1 - ((tile >> 3) + 1) / 16 + .0004, s = .125 - .0008, sv = .0625 - .0008;
  for (let kk = 0; kk < 4; kk++) {
    const k = flip ? (kk + 1) & 3 : kk;
    const cu = CU[k], cv = CV[k];
    let X = F[3] + cu * F[6] + cv * F[9], Y = F[4] + cu * F[7] + cv * F[10], Z = F[5] + cu * F[8] + cv * F[11];
    if (ins) { X -= F[0] * ins; Z -= F[2] * ins; }
    M.pos[p + kk * 3] = x + X; M.pos[p + kk * 3 + 1] = y + Y; M.pos[p + kk * 3 + 2] = z + Z;
    M.uv[u + kk * 2] = u0 + cu * s; M.uv[u + kk * 2 + 1] = v0 + cv * sv;
    const sh = F[12] * ao[k];
    M.sh[p + kk * 3] = sh * tr; M.sh[p + kk * 3 + 1] = sh * tg; M.sh[p + kk * 3 + 2] = sh * tb;
    M.li[u + kk * 2] = ls[k]; M.li[u + kk * 2 + 1] = lb[k];
  }
}


const TILE_S = .125 - .0008, TILE_V = .0625 - .0008;
function quadUV(M, p, uv, tile, sh, sky, blk, tint) {
  if (M.n >= M.cap) return;
  const n = M.n++, a = n * 12, b = n * 8;
  const u0 = (tile & 7) / 8 + .0004, v0 = 1 - ((tile >> 3) + 1) / 16 + .0004;
  const tr = tint ? tint[0] : 1, tg = tint ? tint[1] : 1, tb = tint ? tint[2] : 1;
  for (let k = 0; k < 4; k++) {
    M.pos[a + k * 3] = p[k][0]; M.pos[a + k * 3 + 1] = p[k][1]; M.pos[a + k * 3 + 2] = p[k][2];
    M.uv[b + k * 2] = u0 + uv[k][0] * TILE_S; M.uv[b + k * 2 + 1] = v0 + uv[k][1] * TILE_V;
    M.sh[a + k * 3] = sh * tr; M.sh[a + k * 3 + 1] = sh * tg; M.sh[a + k * 3 + 2] = sh * tb;
    M.li[b + k * 2] = sky; M.li[b + k * 2 + 1] = blk;
  }
}
const SHADES = [.66, .66, 1, .5, .82, .82];
/* tiles: [+X,-X,+Y,-Y,+Z,-Z]; rot = otočení textury horní stěny */
function emitBox(M, X, Y, Z, x0, y0, z0, x1, y1, z1, tiles, sky, blk, rot, skipBottom, tint) {
  x0 += X; x1 += X; y0 += Y; y1 += Y; z0 += Z; z1 += Z;
  const fx0 = x0 - X, fx1 = x1 - X, fy0 = y0 - Y, fy1 = y1 - Y, fz0 = z0 - Z, fz1 = z1 - Z;
  for (let f = 0; f < 6; f++) {
    if (f === 3 && skipBottom) continue;
    let p, uv;
    switch (f) {
      case 0: p = [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]; uv = [[1 - fz1, fy0], [1 - fz0, fy0], [1 - fz0, fy1], [1 - fz1, fy1]]; break;
      case 1: p = [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]; uv = [[fz0, fy0], [fz1, fy0], [fz1, fy1], [fz0, fy1]]; break;
      case 2: p = [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]; uv = [[fx0, 1 - fz1], [fx1, 1 - fz1], [fx1, 1 - fz0], [fx0, 1 - fz0]];
        for (let r = 0; r < (rot || 0); r++) uv = uv.map(q => [q[1], 1 - q[0]]); break;
      case 3: p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]; uv = [[fx0, fz0], [fx1, fz0], [fx1, fz1], [fx0, fz1]]; break;
      case 4: p = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]; uv = [[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]]; break;
      default: p = [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]; uv = [[1 - fx1, fy0], [1 - fx0, fy0], [1 - fx0, fy1], [1 - fx1, fy1]];
    }
    quadUV(M, p, uv, tiles[f], SHADES[f], sky, blk, tint);
  }
}
const FACE_OF_DIR = [0, 4, 1, 5];
function emitCustom(M, def, id, x, y, z, sky, blk, pi) {
  const kind = def.custom;
  if (kind === 'rail') {
    const isR = (o) => pb[pi + o] === B.RAIL;
    const N = isR(-32), S = isR(32), E = isR(1), Wd = isR(-1);
    // stoupání: kolej o blok výš v daném směru (a ne ve stejné výšce) naklopí tuto kolej
    const up = (o) => pb[pi + o + 1024] === B.RAIL && pb[pi + o] !== B.RAIL;
    const dirs = [[1, 1, 0], [-1, -1, 0], [32, 0, 1], [-32, 0, -1]];
    for (const [o, sx, sz] of dirs) {
      if (!up(o)) continue;
      const h = (px, pz) => .0625 + (sx === 1 ? px : sx === -1 ? 1 - px : sz === 1 ? pz : 1 - pz);
      const p = [[0, 1], [1, 1], [1, 0], [0, 0]].map(([a, b]) => [x + a, y + h(a, b), z + b]);
      let uv = [[0, 0], [1, 0], [1, 1], [0, 1]].map((q, k) => [[0, 1][k === 1 || k === 2 ? 1 : 0], 0]);
      uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      // stejné mapování jako u vodorovné koleje: u = x, v = 1 - z
      uv = [[0, 0], [1, 0], [1, 1], [0, 1]].map((_, k) => { const a = [0, 1, 1, 0][k], b = [1, 1, 0, 0][k]; return [a, 1 - b]; });
      const rr0 = sx !== 0 ? 1 : 0;
      for (let q = 0; q < rr0; q++) uv = uv.map(c => [c[1], 1 - c[0]]);
      quadUV(M, p, uv, T.RAIL_S, 1, sky, blk, null);
      return;
    }
    let tile = T.RAIL_S, rot = 0;
    if ((N || S) && (E || Wd) && !((N && S) && !(E && Wd) && false)) {
      // zatáčka: SE=0, EN=1, NW=2, WS=3
      const ns = S ? 'S' : 'N', ew = E ? 'E' : 'W';
      tile = T.RAIL_C; rot = ns === 'S' && ew === 'E' ? 0 : ns === 'N' && ew === 'E' ? 1 : ns === 'N' && ew === 'W' ? 2 : 3;
    } else if (E || Wd) rot = 1;
    emitBox(M, x, y, z, 0, 0, 0, 1, .0625, 1, [tile, tile, tile, tile, tile, tile], sky, blk, rot, true);
    return;
  }
  if (kind === 'stair') {
    const A = [def.side, def.side, def.top, def.bot, def.side, def.side];
    const bx = W.stairBoxesAt(W.stairDir(id), (dx, dz) => pb[pi + dx + dz * 32]);
    bx.forEach((b, k) => emitBox(M, x, y, z, b[0], b[1], b[2], b[3], b[4], b[5], A, sky, blk, 0, k > 0));
    return;
  }
  if (kind === 'bell') {
    const gd = BL[B.GOLD_BLOCK].top, wd = T.PLANKS, bl = T.COBBLE;
    const A = (t) => [t, t, t, t, t, t];
    emitBox(M, x, y, z, 0, .88, .44, 1, 1, .56, A(wd), sky, blk, 0, false);
    emitBox(M, x, y, z, .44, .78, .44, .56, .9, .56, A(bl), sky, blk, 0, true);
    emitBox(M, x, y, z, .3, .42, .3, .7, .8, .7, A(gd), sky, blk, 0, true);
    emitBox(M, x, y, z, .22, .22, .22, .78, .44, .78, A(gd), sky, blk, 0, true);
    emitBox(M, x, y, z, .45, .12, .45, .55, .24, .55, A(bl), sky, blk, 0, true);
    return;
  }
  if (kind === 'ramp') {
    const d = W.rampDir(id), h = (a, b) => W.rampH(d, a, b), tp = def.top, sd = def.side;
    const E = (p, uv, tile, sh) => quadUV(M, p.map(q => [x + q[0], y + q[1], z + q[2]]), uv, tile, sh, sky, blk, null);
    // šikmá horní plocha
    let uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    if (d === 1 || d === 3) uv = [[0, 0], [0, 1], [1, 1], [1, 0]].map(q => [q[0], q[1]]);
    E([[0, h(0, 1), 1], [1, h(1, 1), 1], [1, h(1, 0), 0], [0, h(0, 0), 0]], [[0, 0], [1, 0], [1, 1], [0, 1]], tp, .94);
    E([[1, 0, 1], [1, 0, 0], [1, h(1, 0), 0], [1, h(1, 1), 1]], [[0, 0], [1, 0], [1, h(1, 0)], [1, h(1, 1)]].map((q, i) => [[1, 0], [0, 0], [0, h(1, 0)], [1, h(1, 1)]][i]), sd, SHADES[0]);
    E([[0, 0, 0], [0, 0, 1], [0, h(0, 1), 1], [0, h(0, 0), 0]], [[0, 0], [1, 0], [1, h(0, 1)], [0, h(0, 0)]], sd, SHADES[1]);
    E([[0, 0, 1], [1, 0, 1], [1, h(1, 1), 1], [0, h(0, 1), 1]], [[0, 0], [1, 0], [1, h(1, 1)], [0, h(0, 1)]], sd, SHADES[4]);
    E([[1, 0, 0], [0, 0, 0], [0, h(0, 0), 0], [1, h(1, 0), 0]], [[1, 0], [0, 0], [0, h(0, 0)], [1, h(1, 0)]], sd, SHADES[5]);
    E([[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [[0, 0], [1, 0], [1, 1], [0, 1]], def.bot, SHADES[3]);
    return;
  }
  if (kind === 'fence') {
    const t = T.PLANKS, A = [t, t, t, t, t, t];
    emitBox(M, x, y, z, .375, 0, .375, .625, 1, .625, A, sky, blk, 0, false);
    const con = (o) => { const n = pb[pi + o]; return n === B.FENCE || OCC[n]; };
    const bars = (x0, z0, x1, z1) => { emitBox(M, x, y, z, x0, .375, z0, x1, .5625, z1, A, sky, blk, 0, false); emitBox(M, x, y, z, x0, .6875, z0, x1, .875, z1, A, sky, blk, 0, false); };
    if (con(1)) bars(.625, .4375, 1, .5625);
    if (con(-1)) bars(0, .4375, .375, .5625);
    if (con(32)) bars(.4375, .625, .5625, 1);
    if (con(-32)) bars(.4375, 0, .5625, .375);
    return;
  }
  if (kind === 'dust') {
    const on = id === B.DUST_ON, tint = on ? [1.25, .12, .1] : [.38, .02, .02];
    const t = T.DUST;
    emitBox(M, x, y, z, 0, 0, 0, 1, .03, 1, [t, t, t, t, t, t], on ? 1 : sky, on ? 1 : blk, 0, true, tint);
    return;
  }
  if (kind === 'lever') {
    const o = Math.floor((id - 87) / 2), on = (id - 87) & 1;
    const cob = T.COBBLE, pl = T.PLANKS;
    const A = [cob, cob, cob, cob, cob, cob], Pk = [pl, pl, pl, pl, pl, pl];
    const kn = [T.RS_BLOCK, T.RS_BLOCK, T.RS_BLOCK, T.RS_BLOCK, T.RS_BLOCK, T.RS_BLOCK];
    if (o === 0) { // na podlaze
      emitBox(M, x, y, z, .3, 0, .3, .7, .125, .7, A, sky, blk, 0, true);
      if (on) { emitBox(M, x, y, z, .44, .125, .44, .56, .7, .56, Pk, sky, blk, 0, true); emitBox(M, x, y, z, .42, .7, .42, .58, .78, .58, kn, sky, blk, 0, true); }
      else { emitBox(M, x, y, z, .12, .125, .44, .5, .25, .56, Pk, sky, blk, 0, true); emitBox(M, x, y, z, .06, .12, .42, .16, .28, .58, kn, sky, blk, 0, true); }
    } else { // na zdi: o = 1 (+x zeď), 2 (+z), 3 (-x), 4 (-z)
      const d = o - 1;
      const bx = d === 0 ? [.875, .3, .3, 1, .7, .7] : d === 2 ? [0, .3, .3, .125, .7, .7] : d === 1 ? [.3, .3, .875, .7, .7, 1] : [.3, .3, 0, .7, .7, .125];
      emitBox(M, x, y, z, bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], A, sky, blk, 0, false);
      const len = on ? .45 : .22, h0 = on ? .5 : .5;
      const st = d === 0 ? [.875 - len, .44, .44, .875, .56, .56] : d === 2 ? [.125, .44, .44, .125 + len, .56, .56] : d === 1 ? [.44, .44, .875 - len, .56, .56, .875] : [.44, .44, .125, .56, .56, .125 + len];
      emitBox(M, x, y, z, st[0], st[1] + (on ? .06 : -.04), st[2], st[3], st[4] + (on ? .06 : -.04), st[5], Pk, sky, blk, 0, false);
    }
    return;
  }
  if (kind === 'door') {
    const base = id - 28, top = base & 1, ax = (base >> 1) & 1, open = base >> 2, t = top ? T.DOOR_UP : T.DOOR_LOW;
    let b;
    if (!open) b = ax === 0 ? [0, 0, .40625, 1, 1, .59375] : [.40625, 0, 0, .59375, 1, 1];
    else b = ax === 0 ? [0, 0, 0, .1875, 1, 1] : [0, 0, 0, 1, 1, .1875];
    emitBox(M, x, y, z, b[0], b[1], b[2], b[3], b[4], b[5], [t, t, t, t, t, t], sky, blk, 0, false);
  } else if (kind === 'bed') {
    const d = (id - 36) & 3, head = id >= 40;
    emitBox(M, x, y, z, 0, 0, 0, 1, .1875, 1, [T.PLANKS, T.PLANKS, T.PLANKS, T.PLANKS, T.PLANKS, T.PLANKS], sky, blk, 0, true);
    const S = T.BED_SIDE;
    emitBox(M, x, y, z, 0, .1875, 0, 1, .5625, 1, [S, S, head ? T.BED_HEAD : T.BED_FOOT, T.PLANKS, S, S], sky, blk, d, false);
  } else if (kind === 'chest') {
    const d = (id - 44) & 3, S = T.CHEST_SIDE, tl = [S, S, T.CHEST_TOP, T.CHEST_TOP, S, S];
    tl[FACE_OF_DIR[d]] = T.CHEST_FRONT;
    emitBox(M, x, y, z, .0625, 0, .0625, .9375, .875, .9375, tl, sky, blk, 0, true);
  } else if (kind === 'ladder') {
    const d = (id - 48) & 3, t = T.LADDER, a = [t, t, t, t, t, t];
    const b = d === 0 ? [.92, 0, 0, 1, 1, 1] : d === 2 ? [0, 0, 0, .08, 1, 1] : d === 1 ? [0, 0, .92, 1, 1, 1] : [0, 0, 0, 1, 1, .08];
    emitBox(M, x, y, z, b[0], b[1], b[2], b[3], b[4], b[5], a, sky, blk, 0, false);
  } else if (kind === 'slab') {
    const t = def.top;
    emitBox(M, x, y, z, 0, 0, 0, 1, .5, 1, [t, t, t, t, t, t], sky, blk, 0, false);
  }
}

function meshChunk(c) {
  const cx = c.cx, cz = c.cz;
  fillPadded(cx, cz);
  let yMax = 0; for (let i = 0; i < 256; i++) if (c.hmap[i] > yMax) yMax = c.hmap[i];
  yMax = Math.min(H - 1, yMax + 1);
  computeLight(yMax);
  MO.n = 0; MT.n = 0;
  const bio = c.biome;
  for (let y = 0; y <= yMax; y++) {
    for (let z = 0; z < CH; z++) for (let x = 0; x < CH; x++) {
      const i = pidx(x + PAD, y, z + PAD);
      const b = pb[i];
      if (b === 0) continue;
      const def = BL[b];
      const tint = TINT[bio[z * CH + x]] || TINT[2];
      if (def.custom) { emitCustom(MO, def, b, x, y, z, sl[i] / 15, bl[i] / 15, i); continue; }
      if (def.cross) {
        const s = sl[i] / 15, bk = bl[i] / 15;
        const em = def.emit ? 1 : 0;
        const tr = b === B.TALLGRASS ? tint[0] : 1, tg = b === B.TALLGRASS ? tint[1] : 1, tb = b === B.TALLGRASS ? tint[2] : 1;
        const sh = .92, L = em ? 1 : s, Bk = em ? 1 : bk, tl = def.top;
        const a = .12, bq = .88;
        // dvě roviny, obě strany
        quad(MO, x + a, y, z + a, x + bq, y, z + bq, x + bq, y + 1, z + bq, x + a, y + 1, z + a, tl, sh * tr, sh * tg, sh * tb, L, Bk);
        quad(MO, x + bq, y, z + bq, x + a, y, z + a, x + a, y + 1, z + a, x + bq, y + 1, z + bq, tl, sh * tr, sh * tg, sh * tb, L, Bk);
        quad(MO, x + bq, y, z + a, x + a, y, z + bq, x + a, y + 1, z + bq, x + bq, y + 1, z + a, tl, sh * tr, sh * tg, sh * tb, L, Bk);
        quad(MO, x + a, y, z + bq, x + bq, y, z + a, x + bq, y + 1, z + a, x + a, y + 1, z + bq, tl, sh * tr, sh * tg, sh * tb, L, Bk);
        continue;
      }
      if (W.isWater(b) || W.isLava(b)) {
        const wat = W.isWater(b);
        const same = wat ? W.isWater : W.isLava;
        const M = wat ? MT : MO;
        const above = pb[i + 1024];
        const lvl = W.levelOf(b), maxL = wat ? 8 : 4;
        const topH = same(above) ? 1 : .875 * (1 - lvl / maxL);
        const em = !wat;
        for (let f = 0; f < 6; f++) {
          if (f === 3) continue;
          const n = pb[i + FOFF[f].n];
          if (OCC[n]) continue;
          let yb = 0;
          if (same(n)) {
            if (f === 2) continue;
            const hn = same(pb[i + FOFF[f].n + 1024]) ? 1 : .875 * (1 - W.levelOf(n) / maxL);
            if (hn >= topH - 1e-3) continue;
            yb = hn;
          }
          if (f === 2 && same(above)) continue;
          const F = FD[f];
          const Fi = i + FOFF[f].n;
          const s = em ? 1 : sl[Fi] / 15, bk = em ? 1 : bl[Fi] / 15;
          const sh = F[12] * (em ? 1 : .95);
          const tile = def.top;
          if (f === 2) {
            quad(M, x, y + topH, z + 1, x + 1, y + topH, z + 1, x + 1, y + topH, z, x, y + topH, z, tile, sh, sh, sh, s, bk);
          } else {
            const o0 = F[3], o1 = F[5], ux = F[6], uz = F[8];
            const ax = x + o0, az = z + o1, bx = x + o0 + ux, bz = z + o1 + uz;
            quad(M, ax, y + yb, az, bx, y + yb, bz, bx, y + topH, bz, ax, y + topH, az, tile, sh, sh, sh, s, bk);
          }
        }
        continue;
      }
      const emissive = def.emit > 0;
      const isLeaves = b === B.LEAVES, isGlass = b === B.GLASS || b === B.MGLASS, isCactus = b === B.CACTUS;
      const M = def.trans ? MT : MO;
      for (let f = 0; f < 6; f++) {
        const nb = pb[i + FOFF[f].n];
        if (OCC[nb]) continue;
        if (isLeaves && nb === B.LEAVES) continue;
        if (isGlass && nb === b) continue;
        if (isCactus && nb === B.CACTUS && f >= 2 && f <= 3) continue;
        const tile = f === 2 ? def.top : f === 3 ? def.bot : def.side;
        let tr = 1, tg = 1, tb = 1;
        if ((b === B.GRASS && f === 2) || isLeaves || (b === B.GRASS && f > 3)) { tr = tint[0]; tg = tint[1]; tb = tint[2]; if (b === B.GRASS && f > 3) { tr = (tr + 1) / 2; tg = (tg + 1) / 2; tb = (tb + 1) / 2; } }
        emitFace(M, f, x, y, z, i, tile, tr, tg, tb, emissive, isCactus && f !== 2 && f !== 3 ? .0625 : 0);
      }
    }
  }
  setGeo(c, 'mo', MO, matOpaque);
  setGeo(c, 'mt', MT, matTrans);
  c.meshed = true; c.needMesh = false;
}

const sharedIndex = (() => {
  const idx = new Uint32Array(QCAP * 6);
  for (let q = 0; q < QCAP; q++) { const v = q * 4; idx.set([v, v + 1, v + 2, v, v + 2, v + 3], q * 6); }
  return new THREE.BufferAttribute(idx, 1);
})();

function setGeo(c, slot, M, mat) {
  if (c[slot]) { scene.remove(c[slot]); c[slot].geometry.dispose(); c[slot] = null; }
  if (M.n === 0) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(M.pos.slice(0, M.n * 12), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(M.uv.slice(0, M.n * 8), 2));
  g.setAttribute('aShade', new THREE.BufferAttribute(M.sh.slice(0, M.n * 12), 3));
  g.setAttribute('aLight', new THREE.BufferAttribute(M.li.slice(0, M.n * 8), 2));
  g.setIndex(sharedIndex);
  g.setDrawRange(0, M.n * 6);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(8, H / 2, 8), 70);
  const m = new THREE.Mesh(g, mat);
  m.position.set(c.cx * CH, 0, c.cz * CH);
  m.matrixAutoUpdate = false; m.updateMatrix();
  if (slot === 'mt') m.renderOrder = 1; else m.layers.enable(1);
  G.meshVer = (G.meshVer || 0) + 1;
  scene.add(m);
  c[slot] = m;
}

function disposeChunk(c) {
  for (const s of ['mo', 'mt']) if (c[s]) { scene.remove(c[s]); c[s].geometry.dispose(); c[s] = null; }
}

/* ---------- streamování chunků ---------- */
const OFFS = [];
for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) { const d = dx * dx + dz * dz; if (d <= 256) OFFS.push([dx, dz, d]); }
OFFS.sort((a, b) => a[2] - b[2]);
G.onChunkGenerated = null;
let lastPcx = 1e9, lastPcz = 1e9;

function genOne(cx, cz) {
  const k = ckey(cx, cz);
  const c = W.genChunk(cx, cz, modsMap.get(k));
  c.needMesh = true; c.meshed = false; c.mo = null; c.mt = null;
  chunks.set(k, c);
  if (G.onChunkGenerated) G.onChunkGenerated(c);
  return c;
}
G.genOne = genOne;
G.meshNow = (c) => meshChunk(c);

function hasNeighbors(cx, cz) {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!chunks.has(ckey(cx + dx, cz + dz))) return false;
  return true;
}
G.updateChunks = function (px, pz, budget) {
  const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH);
  const R = G.R;
  if (pcx !== lastPcx || pcz !== lastPcz) {
    lastPcx = pcx; lastPcz = pcz;
    const lim = (R + 3) * (R + 3);
    for (const [k, c] of chunks) {
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > lim) { disposeChunk(c); chunks.delete(k); dirty.delete(k); }
    }
  }
  const t0 = performance.now();
  // úpravy hráčem mají přednost
  if (dirty.size) {
    for (const k of dirty) {
      const c = chunks.get(k);
      dirty.delete(k);
      if (c && c.meshed && hasNeighbors(c.cx, c.cz)) meshChunk(c);
      else if (c) c.needMesh = true;
      if (performance.now() - t0 > 30) break;
    }
  }
  let work = 0;
  const lim2 = (R + 1) * (R + 1);
  for (let n = 0; n < OFFS.length; n++) {
    const o = OFFS[n];
    if (o[2] > lim2) break;
    const cx = pcx + o[0], cz = pcz + o[1];
    let c = chunks.get(ckey(cx, cz));
    if (!c) { genOne(cx, cz); work++; }
    else if (c.needMesh && o[2] <= R * R + 1 && hasNeighbors(cx, cz)) { meshChunk(c); work++; }
    if (performance.now() - t0 > budget) break;
  }
  return work;
};
G.pendingChunks = function (px, pz) {
  const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH), R = G.R;
  let total = 0, done = 0;
  for (const o of OFFS) { if (o[2] > R * R) break; total++; const c = chunks.get(ckey(pcx + o[0], pcz + o[1])); if (c && c.meshed) done++; }
  return [done, total];
};
G.clearWorld = function () {
  for (const c of chunks.values()) disposeChunk(c);
  chunks.clear(); modsMap.clear(); dirty.clear(); lastPcx = lastPcz = 1e9;
};

/* ---------- obloha ---------- */
function mkTex(size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); fn(ctx, size);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
const sunTex = mkTex(16, (ctx) => { ctx.fillStyle = '#fff6a8'; ctx.fillRect(1, 1, 14, 14); ctx.fillStyle = '#fffbe0'; ctx.fillRect(3, 3, 10, 10); });
const moonTex = mkTex(16, (ctx) => { ctx.fillStyle = '#d8dce8'; ctx.fillRect(2, 2, 12, 12); ctx.fillStyle = '#b0b6c8'; ctx.fillRect(4, 4, 3, 3); ctx.fillRect(9, 8, 3, 4); ctx.fillRect(5, 10, 2, 2); });
const skyMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
const sun = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), skyMat(sunTex));
const moon = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), skyMat(moonTex));
sun.renderOrder = -2; moon.renderOrder = -2;
scene.add(sun, moon);
const starGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(900 * 3), r = W.mulberry(42);
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, e = Math.asin(r() * 2 - 1), R = 800;
    p[i * 3] = Math.cos(a) * Math.cos(e) * R; p[i * 3 + 1] = Math.sin(e) * R; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
}
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
const stars = new THREE.Points(starGeo, starMat);
stars.renderOrder = -3; stars.frustumCulled = false;
scene.add(stars);
// mraky
const cloudTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'); const nz = new (function () { })();
  const r = W.mulberry(9);
  const g = []; for (let i = 0; i < 16 * 16; i++) g.push(r());
  const smooth = (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; const v = (a, b) => g[((b + 16) % 16) * 16 + ((a + 16) % 16)]; const l = (a, b, t) => a + (b - a) * t; return l(l(v(x0, y0), v(x0 + 1, y0), fx), l(v(x0, y0 + 1), v(x0 + 1, y0 + 1), fx), fy); };
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const v = smooth(x / 4, y / 4) * .65 + smooth(x / 2 + 3, y / 2 + 7) * .35;
    if (v > .54) { ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(x, y, 1, 1); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.repeat.set(2, 2);
  return t;
})();
const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 0.9 });
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1536, 1536), cloudMat);
clouds.rotation.x = -Math.PI / 2; clouds.renderOrder = -1;
scene.add(clouds);


/* ---------- nebeská kopule: gradient, slunce, měsíc, procedurální mraky ---------- */
const domeU = { uTop: { value: U.uSkyTop.value }, uHor: { value: U.uSkyHor.value }, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uSunI: U.uSunI, uDay: U.uDay, uTime: { value: 0 }, uRain: { value: 0 }, uCam: { value: new THREE.Vector3() } };
const domeMat = new THREE.ShaderMaterial({
  uniforms: domeU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir=position; vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.9999; }',
  fragmentShader: `
varying vec3 vDir; uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunI; uniform float uDay; uniform float uTime; uniform float uRain; uniform vec3 uCam;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(7.1,3.7); a*=0.5; } return s; }
void main(){
  vec3 d=normalize(vDir); float y=d.y;
  vec3 col=mix(uHor,uTop,pow(clamp(y,0.0,1.0),0.5));
  if(y<0.0) col=uHor*mix(1.0,0.82,clamp(-y*5.0,0.0,1.0));
  float sd=max(dot(d,uSunDir),0.0);
  float clear=1.0-uRain;
  col+=uSunCol*(pow(sd,6.0)*0.14+pow(sd,48.0)*0.32+pow(sd,600.0)*0.9)*uSunI*clear;
  col+=uSunCol*smoothstep(0.99955,0.99985,sd)*9.0*uSunI*clear;
  // měsíc
  float md=dot(d,-uSunDir);
  float disc=smoothstep(0.99935,0.9996,md);
  vec2 mq=(d.xz-(-uSunDir).xz)*90.0;
  float maria=0.78+0.22*noise(mq*1.7);
  col+=vec3(0.78,0.82,0.92)*disc*maria*(1.0-uDay)*1.6*clear;
  col+=vec3(0.45,0.52,0.7)*pow(max(md,0.0),90.0)*(1.0-uDay)*0.35*clear;
  // mraky
  if(y>0.012){
    vec2 uv=d.xz/(y+0.14)*1.15+vec2(uTime*0.006,uTime*0.002)+uCam.xz*0.00035;
    float cov=mix(0.52,0.30,uRain);
    float n=fbm(uv*1.3);
    float c=smoothstep(cov,cov+0.20,n);
    float n2=fbm(uv*1.3+uSunDir.xz*0.10);
    float lit=clamp(0.62+(n-n2)*3.2,0.15,1.0);
    vec3 cc=mix(vec3(0.50,0.56,0.68),vec3(1.0),lit);
    cc+=uSunCol*0.22*uSunI*lit;
    cc=mix(cc,vec3(0.45,0.48,0.54),uRain*0.7);
    cc*=mix(vec3(0.07,0.09,0.15),vec3(1.0),uDay);
    cc=mix(cc,cc*uHor*1.6,0.18);
    c*=smoothstep(0.012,0.14,y);
    col=mix(col,cc,c*0.93);
  }
  gl_FragColor=vec4(col,1.0);
}`
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), domeMat);
dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);

const skyDay = new THREE.Color(0x8fbcf2), skyNight = new THREE.Color(0x03040c), skyDusk = new THREE.Color(0xff8a4a);
const tmpC = new THREE.Color(), tmpDeep = new THREE.Color(), tmpGrey = new THREE.Color();
G.q = 2;
G.time = 0.3; // 0..1 (0.25 východ, 0.5 poledne, 0.75 západ, 0 půlnoc)
G.dayFactor = 1;
G.underwater = false;
G.updateSky = function (dt, camPos) {
  const a = (G.time - 0.25) * Math.PI * 2;
  const elev = Math.sin(a);
  const day = Math.min(1, Math.max(0, (elev + .12) / .37));
  const dayS = day * day * (3 - 2 * day);
  G.dayFactor = dayS; G.elev = elev;
  tmpC.copy(skyNight).lerp(skyDay, dayS);
  const dusk = Math.max(0, 1 - Math.abs(elev) / .28) * .55;
  tmpC.lerp(skyDusk, dusk * (1 - Math.abs(elev) * .5));
  const wr = G.weather ? G.weather.rain : 0, fl = G.weather ? G.weather.flash : 0;
  tmpC.lerp(new THREE.Color(.42, .45, .5).multiplyScalar(.25 + .75 * dayS), wr * .75);
  tmpC.lerp(new THREE.Color(.95, .95, 1), fl * .7);
  U.uSun.value = Math.min(1, (.12 + .88 * dayS) * (1 - .4 * wr) + fl * .6); U.uDay.value = dayS;
  scene.fog.color.copy(tmpC);
  scene.background = scene.background || new THREE.Color();
  scene.background.copy(tmpC);
  // mlha se při letu vysoko natahuje, aby terén nezmizel v modré prázdnotě
  const alt = Math.min(500, Math.max(0, camPos.y - Math.max(0, G.topY(Math.floor(camPos.x), Math.floor(camPos.z)))));
  const baseFar = G.R * CH * .95, far = Math.sqrt(baseFar * baseFar + alt * alt) + (alt > 0 ? 10 : 0);
  if (G.underwater) { scene.fog.near = 0.5; scene.fog.far = 22; scene.fog.color.setRGB(.1, .25, .55).multiplyScalar(.3 + .7 * dayS); scene.background.copy(scene.fog.color); }
  else if (G.inLava) { scene.fog.near = 0.2; scene.fog.far = 4; scene.fog.color.setRGB(.9, .3, 0); scene.background.copy(scene.fog.color); }
  else { scene.fog.near = Math.min(far * .9, Math.max(far * .55, alt + baseFar * .15)); scene.fog.far = far; }
  U.uFogNear.value = scene.fog.near; U.uFogFar.value = scene.fog.far;
  const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), .25).normalize();
  G.sunDir = dir; U.uWet.value = wr;
  // --- realistický režim: barvy slunce a oblohy ---
  U.uSunDir.value.copy(dir);
  const sI = Math.min(1, Math.max(0, (elev + .015) / .22));
  U.uSunI.value = sI * (1 - .9 * wr) * (1 - .25 * fl);
  const warm = 1 - Math.min(1, Math.max(0, elev / .55));      // nízké slunce = oranžové
  U.uSunCol.value.setRGB(1, .95 - .30 * warm, .86 - .55 * warm);
  U.uSkyHor.value.copy(tmpC);
  tmpDeep.setRGB(.16, .36, .85).lerp(skyNight, 1 - dayS).lerp(tmpGrey.setRGB(.42, .45, .5).multiplyScalar(.25 + .75 * dayS), wr * .8);
  U.uSkyTop.value.copy(tmpDeep);
  domeU.uTime.value += dt; domeU.uRain.value = wr; domeU.uCam.value.copy(camPos);
  dome.position.copy(camPos);
  const real = G.q >= 2 && !G.underwater && !G.inLava;
  dome.visible = real;
  sun.position.copy(camPos).addScaledVector(dir, 600); sun.lookAt(camPos);
  moon.position.copy(camPos).addScaledVector(dir, -600); moon.lookAt(camPos);
  sun.visible = elev > -.25 && !real; moon.visible = elev < .25 && !real;
  stars.position.copy(camPos); stars.rotation.z = a; stars.rotation.x = .4;
  starMat.opacity = Math.max(0, 1 - dayS * 1.6);
  clouds.visible = camPos.y < 152 && !real;
  clouds.position.set(camPos.x, 150, camPos.z);
  cloudTex.offset.x = camPos.x / 768 + G.time * 6; cloudTex.offset.y = -camPos.z / 768;
  cloudMat.color.setScalar((.35 + .65 * dayS) * (1 - .45 * wr)).lerp(tmpC, .1);
  cloudMat.color.r = Math.min(1, cloudMat.color.r + dusk * .25);
};

/* ---------- počasí: déšť, sníh, bouřka ---------- */
G.weather = { rain: 0, target: 0, thunder: false, timer: 25 + Math.random() * 60, nextBolt: 10, flash: 0 };
const RAIN_N = 2200, RR = 17, RH = 22;
const rainPos = new Float32Array(RAIN_N * 6), dX = new Float32Array(RAIN_N), dY = new Float32Array(RAIN_N), dZ = new Float32Array(RAIN_N), dG = new Float32Array(RAIN_N);
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0xa8b8d6, transparent: true, opacity: .5, depthWrite: false, fog: false });
const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
rainMesh.frustumCulled = false; rainMesh.renderOrder = 4; rainMesh.visible = false; scene.add(rainMesh);
let rainInit = false;
function respawnDrop(i, cx, cy, cz, initial) {
  dX[i] = cx + (Math.random() * 2 - 1) * RR; dZ[i] = cz + (Math.random() * 2 - 1) * RR;
  const top = G.topY(Math.floor(dX[i]), Math.floor(dZ[i]));
  dG[i] = (top > 0 ? top + 1 : cy - 40);
  dY[i] = initial ? dG[i] + Math.random() * (cy + RH - dG[i]) : cy + RH;
  if (dY[i] < dG[i]) dY[i] = dG[i] + 1;
}
G.updateWeatherVisuals = function (dt, cam) {
  const w = G.weather, rn = w.rain;
  if (rn < .03) { rainMesh.visible = false; return; }
  const c = G.getChunk(Math.floor(cam.x / 16), Math.floor(cam.z / 16));
  const snow = (c && c.biome[(Math.floor(cam.z) & 15) * 16 + (Math.floor(cam.x) & 15)] === 5) || cam.y > 112;
  G.snowing = snow;
  rainMesh.visible = true;
  rainMat.color.set(snow ? 0xffffff : 0xa8b8d6); rainMat.opacity = snow ? .9 : .55;
  const n = Math.floor(RAIN_N * Math.min(1, rn)), sp = snow ? 3.2 : 27, len = snow ? .14 : .75;
  if (!rainInit) { for (let i = 0; i < RAIN_N; i++) respawnDrop(i, cam.x, cam.y, cam.z, true); rainInit = true; }
  const t = performance.now() / 1000;
  for (let i = 0; i < n; i++) {
    dY[i] -= sp * (snow ? 1 : (.85 + (i % 7) * .04)) * dt;
    const sway = snow ? Math.sin(t * 1.3 + i) * .6 * dt : 0;
    dX[i] += sway;
    if (dY[i] < dG[i] || Math.abs(dX[i] - cam.x) > RR || Math.abs(dZ[i] - cam.z) > RR || dY[i] > cam.y + RH + 2) respawnDrop(i, cam.x, cam.y, cam.z, false);
    const o = i * 6;
    rainPos[o] = dX[i]; rainPos[o + 1] = dY[i]; rainPos[o + 2] = dZ[i];
    rainPos[o + 3] = dX[i] - (snow ? 0 : .08); rainPos[o + 4] = dY[i] + len; rainPos[o + 5] = dZ[i];
  }
  rainGeo.setDrawRange(0, n * 2);
  rainGeo.attributes.position.needsUpdate = true;
};
/* blesk */
let bolt = null, boltT = 0;
G.lightning = function (x, z) {
  const top = Math.max(1, G.topY(Math.floor(x), Math.floor(z))) + 1;
  const pts = []; let px = x, pz = z;
  for (let y = top + 90; y >= top; y -= 6) { pts.push(px, y, pz); px += (Math.random() - .5) * 5; pz += (Math.random() - .5) * 5; }
  pts.push(x, top, z);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  if (bolt) { scene.remove(bolt); bolt.geometry.dispose(); }
  bolt = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xf4f4ff, fog: false, linewidth: 2 }));
  bolt.frustumCulled = false; scene.add(bolt); boltT = .22; G.weather.flash = 1;
};
G.tickBolt = function (dt) { if (bolt) { boltT -= dt; if (boltT <= 0) { scene.remove(bolt); bolt.geometry.dispose(); bolt = null; } } G.weather.flash = Math.max(0, G.weather.flash - dt * 2.2); };

/* ---------- závěrečné zpracování obrazu (filmový vzhled) ---------- */
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postU = { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uSunUV: { value: new THREE.Vector2(.5, .5) }, uGlare: { value: 0 }, uRain: { value: 0 }, uDay: { value: 1 }, uTime: { value: 0 }, uHQ: { value: 0 }, tDepth: { value: null }, uNF: { value: new THREE.Vector2(0.08, 1200) } };
const postMat = new THREE.ShaderMaterial({
  uniforms: postU, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `
uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform vec2 uSunUV; uniform float uGlare; uniform float uRain; uniform float uDay; uniform float uTime; uniform float uHQ; uniform sampler2D tDepth; uniform vec2 uNF;
varying vec2 vUv;
float linD(vec2 uv){ float d=texture2D(tDepth,uv).r; float z=d*2.0-1.0; return 2.0*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x)); }
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  if(uHQ>0.5){
    float dc=linD(vUv);
    if(dc<70.0){
      float px=clamp(46.0/dc,4.0,26.0);
      float ang=fract(sin(dot(vUv,vec2(12.9898,78.233)))*43758.5453)*6.2832;
      float occ=0.0;
      for(int i=0;i<12;i++){
        float fi=float(i); float a=ang+fi*2.39996; float rr=(0.25+0.75*fract(fi*0.618+0.1))*px;
        vec2 o=vec2(cos(a),sin(a))*rr*uTexel;
        float ds=linD(vUv+o); float df=dc-ds;
        occ+=smoothstep(0.05,0.3,df)*(1.0-smoothstep(0.9,2.5,df));
      }
      c*=1.0-clamp(occ/12.0*1.15,0.0,0.55)*(1.0-smoothstep(30.0,70.0,dc));
    }
  }
  vec3 b = vec3(0.0);
  for(int i=0;i<8;i++){
    float a = float(i)*0.7854; vec2 o = vec2(cos(a), sin(a));
    b += max(texture2D(tDiffuse, vUv + o*uTexel*5.0).rgb - 0.7, 0.0)*0.6 + max(texture2D(tDiffuse, vUv + o*uTexel*13.0).rgb - 0.7, 0.0)*0.4;
  }
  c += b*0.15;
  vec2 d = vUv - uSunUV; d.x *= uTexel.y/uTexel.x; float r = length(d);
  c += vec3(1.0,0.86,0.62)*uGlare*(0.30/(1.0+r*10.0) + 0.22*exp(-r*3.2))*0.55;
  vec3 a = (c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);
  c = mix(c, a, 0.5 + 0.3*uHQ);
  float l = dot(c, vec3(0.299,0.587,0.114));
  c = mix(vec3(l), c, 1.08 - 0.15*uHQ - 0.38*uRain - 0.1*(1.0-uDay));
  c *= mix(vec3(1.0), vec3(0.92,0.98,1.07), uRain*0.7);
  c = mix(c, c*vec3(1.05,1.0,0.93), smoothstep(0.45,1.0,l)*uDay*0.6);
  vec2 q = vUv - 0.5; float v = 1.0 - smoothstep(0.25, 0.95, length(q*vec2(1.0,0.92)));
  c *= mix(0.76, 1.0, v);
  c += (fract(sin(dot(vUv*vec2(1.0,1.0) + fract(uTime), vec2(12.9898,78.233)))*43758.5453) - 0.5)*0.016;
  gl_FragColor = vec4(c, 1.0);
}`
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
let rt = null;
function makeRT() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  if (rt) rt.dispose();
  const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
  try { const dt = new THREE.DepthTexture(sz.x, sz.y); dt.type = THREE.UnsignedIntType; dt.format = THREE.DepthFormat; dt.minFilter = dt.magFilter = THREE.NearestFilter; opts.depthTexture = dt; postU.tDepth.value = dt; G.hasDepthRT = true; } catch (e) { G.hasDepthRT = false; }
  rt = new THREE.WebGLRenderTarget(sz.x, sz.y, opts);
  postU.tDiffuse.value = rt.texture; postU.uTexel.value.set(1 / sz.x, 1 / sz.y);
}
window.__postReady = true; makeRT();
G.postOn = true;

/* ---------- sluneční stíny (shadow map sledující hráče) ---------- */
const SH_N = 2048, SH_E = 56;
let shRT = null, shCam = null, shMat = null, shOK = false;
const shM = new THREE.Matrix4(), shBias = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
const shCenter = new THREE.Vector3(), shLast = new THREE.Vector3(1e9, 0, 1e9), shV = new THREE.Vector3(), shLastDir = new THREE.Vector3();
let shAge = 99, shVer = -1;
function initShadow() {
  try {
    const gl = renderer.getContext();
    const ok = renderer.capabilities.isWebGL2 || renderer.extensions.has('WEBGL_depth_texture');
    if (!ok) return false;
    const dt = new THREE.DepthTexture(SH_N, SH_N); dt.type = THREE.UnsignedIntType; dt.format = THREE.DepthFormat; dt.minFilter = dt.magFilter = THREE.NearestFilter;
    shRT = new THREE.WebGLRenderTarget(SH_N, SH_N, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, depthTexture: dt, depthBuffer: true });
    shCam = new THREE.OrthographicCamera(-SH_E, SH_E, SH_E, -SH_E, 1, 520); shCam.layers.set(1);
    shMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlasTex } }, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ if(texture2D(map,vUv).a<0.5) discard; gl_FragColor=vec4(1.0); }'
    });
    U.uShadow.value = dt; U.uShTexel.value = 1 / SH_N;
    return true;
  } catch (e) { console.warn('stíny nejsou k dispozici', e); return false; }
}
function updateShadow(force) {
  const sd = G.sunDir; if (!sd) return;
  const cp = camera.position;
  shAge++;
  const moved = Math.hypot(cp.x - shLast.x, cp.z - shLast.z) + Math.abs(cp.y - shLast.y) * .5;
  const turned = shLastDir.distanceTo(sd) > .004;
  if (!force && moved < 5 && !turned && shVer === G.meshVer && shAge < 90) return;
  if (!force && shAge < 6) return;
  shAge = 0; shLast.copy(cp); shLastDir.copy(sd); shVer = G.meshVer;
  // střed mapy: kousek před kamerou (směr pohledu), zarovnaný na texely
  shCenter.set(cp.x, Math.max(0, cp.y - 8), cp.z);
  shCam.position.copy(shCenter).addScaledVector(sd, 260);
  shCam.up.set(0, 1, 0); if (Math.abs(sd.y) > .97) shCam.up.set(0, 0, 1);
  shCam.lookAt(shCenter); shCam.updateMatrixWorld(true);
  shV.copy(shCenter).applyMatrix4(shCam.matrixWorldInverse);
  const tx = 2 * SH_E / SH_N;
  shV.x = Math.round(shV.x / tx) * tx; shV.y = Math.round(shV.y / tx) * tx;
  shV.applyMatrix4(shCam.matrixWorld);
  shCam.position.copy(shV).addScaledVector(sd, 260); shCam.lookAt(shV); shCam.updateMatrixWorld(true);
  shM.copy(shBias).multiply(shCam.projectionMatrix).multiply(shCam.matrixWorldInverse);
  U.uShadowM.value.copy(shM);
  const bg = scene.background, fg = scene.fog;
  scene.background = null; scene.fog = null; scene.overrideMaterial = shMat;
  const prevRT = renderer.getRenderTarget();
  renderer.setRenderTarget(shRT); renderer.setClearColor(0xffffff, 1); renderer.clear(true, true, false);
  renderer.render(scene, shCam);
  renderer.setRenderTarget(prevRT); renderer.setClearColor(0x000000, 1);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fg;
}
/* úroveň grafiky: 2 realistická, 1 filmová, 0 rychlá */
G.setGfx = function (q) {
  q = +q;
  if (q >= 2 && !shOK && !(shOK = initShadow())) q = 1;
  G.q = q; G.postOn = q >= 1; U.uQ.value = q; U.uShOn.value = (q >= 2 && shOK) ? 1 : 0;
  shAge = 99;
  return q;
};

const fwd = new THREE.Vector3(), sunV = new THREE.Vector3(); let glare = 0, glareT = 0, glareOcc = 0;
const handPass = () => {
  if (!G.HAND_LAYER) return;
  const bg = scene.background, fg = scene.fog; scene.background = null; scene.fog = null;
  renderer.autoClear = false; renderer.clearDepth();
  camera.layers.set(G.HAND_LAYER); renderer.render(scene, camera); camera.layers.set(0);
  renderer.autoClear = true; scene.background = bg; scene.fog = fg;
};
G.render = () => {
  if (G.q >= 2 && U.uShOn.value > .5 && !G.underwater) updateShadow(false);
  if (!G.postOn || !rt) { renderer.render(scene, camera); handPass(); return; }
  const rain = G.weather ? G.weather.rain : 0, sd = G.sunDir;
  let tg = 0;
  if (sd && G.elev > .02 && !G.underwater && !G.inLava) {
    camera.getWorldDirection(fwd); const f = fwd.dot(sd);
    if (f > 0) {
      sunV.copy(camera.position).addScaledVector(sd, 100).project(camera); postU.uSunUV.value.set(sunV.x * .5 + .5, sunV.y * .5 + .5);
      if ((glareT++ & 3) === 0 && G.rayClear) { const p = camera.position; glareOcc = G.rayClear(p.x, p.y, p.z, p.x + sd.x * 70, p.y + sd.y * 70, p.z + sd.z * 70) ? 1 : 0; }
      tg = Math.pow(f, 5) * G.dayFactor * (1 - Math.min(1, rain * 1.3)) * glareOcc;
    }
  }
  glare += (tg - glare) * .12; postU.uGlare.value = glare;
  postU.uHQ.value = (G.q >= 2 && G.hasDepthRT) ? 1 : 0; postU.uNF.value.set(camera.near, camera.far); postU.uRain.value = rain; postU.uDay.value = G.dayFactor; postU.uTime.value = performance.now() / 1000;
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  handPass();
};

})();
