import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Everything, including textures and the city, is generated locally. No asset requests.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#scene'), scene=new THREE.Scene();
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});}
catch(e){$('#load-status').textContent='此浏览器暂不支持 WebGL，请用 Edge 或 Chrome 打开。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.info.autoReset=false;
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.07,600);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.055;
controls.minDistance=1.3;controls.maxDistance=17;controls.maxPolarAngle=Math.PI*.85;controls.minPolarAngle=.14;controls.target.set(0,2.5,-1.4);
const pmrem=new THREE.PMREMGenerator(renderer);const roomEnv=new RoomEnvironment();
const env=pmrem.fromScene(roomEnv,.05);scene.environment=env.texture;scene.environmentIntensity=.24;roomEnv.dispose();pmrem.dispose();
RectAreaLightUniformsLib.init();
let seed=2801;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const mix=THREE.MathUtils.lerp, clamp=THREE.MathUtils.clamp;
const mats={}, glowMats=[], lamps=[], colliders=[];
const mat=(c,r=.8,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
function texture(w,h,draw,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const noiseTex=texture(256,256,(c,w,h)=>{const im=c.createImageData(w,h);for(let i=0;i<im.data.length;i+=4){const n=128+rnd()*80;im.data.set([n,n,n,255],i);}c.putImageData(im,0,0);},false);noiseTex.wrapS=noiseTex.wrapT=THREE.RepeatWrapping;noiseTex.repeat.set(5,5);
const linen=texture(256,256,(c,w,h)=>{c.fillStyle='#c3b7a1';c.fillRect(0,0,w,h);for(let i=0;i<256;i++){c.strokeStyle=i%2?'#a99e8d':'#d3c8b6';c.globalAlpha=.3+rnd()*.25;c.beginPath();c.moveTo(i+.5,0);c.lineTo(i+.5,h);c.stroke();c.beginPath();c.moveTo(0,i+.5);c.lineTo(w,i+.5);c.stroke();}for(let i=0;i<20000;i++){c.fillStyle=rnd()>.5?'#e4d9c1':'#9b8e79';c.globalAlpha=.12;c.fillRect(rnd()*w,rnd()*h,1,1);}},true);linen.wrapS=linen.wrapT=THREE.RepeatWrapping;linen.repeat.set(3,3);
const woodTex=texture(1024,256,(c,w,h)=>{c.fillStyle='#7d5436';c.fillRect(0,0,w,h);for(let j=0;j<1000;j++){const y=rnd()*h;c.strokeStyle=`rgba(${rnd()>.5?'35,18,8':'207,157,96'},${.03+rnd()*.13})`;c.lineWidth=.3+rnd()*1.6;c.beginPath();for(let x=0;x<w;x+=12){const a=y+Math.sin(x*.014+j)*1.3+Math.sin(x*.043+j)*.5;x?c.lineTo(x,a):c.moveTo(x,a);}c.stroke();}},true);woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;
mats.plaster=mat('#ded2bc',.94);mats.plaster.bumpMap=noiseTex;mats.plaster.bumpScale=.018;
mats.cream=mat('#e7dcc5',.9);mats.fabric=new THREE.MeshStandardMaterial({color:'#e0d3bb',map:linen,bumpMap:linen,bumpScale:.018,roughness:.98});
mats.brownFabric=mats.fabric.clone();mats.brownFabric.color.set('#8b7964');
mats.wood=new THREE.MeshStandardMaterial({color:'#bea084',map:woodTex,bumpMap:woodTex,bumpScale:.018,roughness:.5});
mats.darkwood=mats.wood.clone();mats.darkwood.color.set('#76503b');mats.black=mat('#171c1b',.38,.6);mats.brass=mat('#a48a56',.29,.8);mats.white=mat('#e2dccd',.34);mats.pages=mat('#c6bca7',.92);mats.leaf=mat('#3b4c2e',.7);mats.soil=mat('#2b241c',1);
mats.glass=new THREE.MeshPhysicalMaterial({color:'#a6c8d1',transparent:true,opacity:.11,roughness:.08,metalness:.05,depthWrite:false,side:THREE.DoubleSide});
function luminous(c,intensity=2){const m=new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:intensity,roughness:.4});glowMats.push({m,i:intensity});return m;}
const lightMat=luminous('#ffd58c',2.5),stripMat=luminous('#ffcd86',2.7),candleMat=luminous('#ff9a36',3.5);
const unitBox=new THREE.BoxGeometry(1,1,1), unitSphere=new THREE.SphereGeometry(1,24,16);
function mesh(g,m,x=0,y=0,z=0,parent=scene){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(w,h,d,m,x,y,z,parent=scene,r=0){return mesh(r?new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2)):new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);}
function sphere(sx,sy,sz,m,x,y,z,parent=scene){const o=mesh(unitSphere,m,x,y,z,parent);o.scale.set(sx,sy,sz);return o;}
function cyl(rt,rb,h,m,x,y,z,parent=scene,n=32){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z,parent);}
function rod(a,b,r,m,parent=scene){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),o=cyl(r,r,va.distanceTo(vb),m,0,0,0,parent,12);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return o;}
function group(x,y,z,ry=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);return g;}
function line(points,r,m,parent=scene){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(24,points.length*6),r,6,false),m,0,0,0,parent);}
function area(c,power,w,h,pos,target){const l=new THREE.RectAreaLight(c,power,w,h);l.position.set(...pos);l.lookAt(...target);scene.add(l);return l;}
function warmPoint(x,y,z,p=20,shadow=false){const l=new THREE.PointLight('#ffb96f',p,9,2);l.position.set(x,y,z);l.castShadow=shadow;if(shadow){l.shadow.mapSize.set(512,512);l.shadow.bias=-.003;l.shadow.normalBias=.035;}scene.add(l);lamps.push({l,p});return l;}
function collision(x1,x2,z1,z2,level=0){colliders.push({x1,x2,z1,z2,level});}
const shadowTexture=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(22,15,7,.7)');g.addColorStop(.4,'rgba(22,15,7,.4)');g.addColorStop(1,'rgba(22,15,7,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
function contactShadow(x,y,z,w,d,opacity=.42){const m=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});const o=mesh(new THREE.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-Math.PI/2;o.castShadow=false;o.receiveShadow=false;return o;}

// Architecture: 11 m × 10.4 m, two full-height glass façades and a half-width mezzanine.
box(11.4,.24,10.8,mats.darkwood,0,-.14,.3);
const floorVariants=Array.from({length:8},()=>{const m=mats.wood.clone();m.color.set(['#c6b99c','#b7aa8a','#c2b798','#b9ae93','#cec1a3','#b8ab8d','#c8b99b','#c0b195'][Math.floor(rnd()*8)]);return m;});
for(let row=0;row<27;row++){const z=-4.7+row*.385;for(let col=0;col<6;col++){let x=-5.5+col*2.2-(row%2)*1.1;let w=Math.min(2.19,5.5-x);if(w>0){if(x< -5.5){w-= -5.5-x;x=-5.5;}box(w,.035,.377,floorVariants[(row+col)%8],x+w/2,.005,z);}}}
box(.19,6.65,10.8,mats.plaster,5.6,3.2,.3);box(11.4,6.65,.18,mats.plaster,0,3.2,5.63);
box(11.4,.18,10.8,mats.plaster,0,6.53,.3);
// Skirting and perimeter coves.
box(.035,.13,10.4,mats.cream,5.48,.08,.3);box(11,.13,.035,mats.cream,0,.08,5.5);
box(.12,.14,10.5,mats.cream,5.37,6.25,.3);box(.045,.03,10.45,stripMat,5.32,6.36,.3);
box(10.8,.14,.12,mats.cream,0,6.25,5.38);box(10.8,.03,.045,stripMat,0,6.36,5.32);
for(let x=-5.5;x<5.6;x+=2.2){box(.065,6.4,.12,mats.black,x,3.2,-4.82);box(2.18,.065,.12,mats.black,x+1.1,3.22,-4.82);}
box(11.2,.12,.18,mats.black,0,6.4,-4.82);box(11.2,.12,.22,mats.black,0,.1,-4.82);
for(let z=-4.8;z<5.6;z+=2.08){box(.12,6.4,.065,mats.black,-5.55,3.2,z);box(.12,.065,2.08,mats.black,-5.55,3.22,z+1.04);}
box(.2,.12,10.5,mats.black,-5.55,.1,.3);box(.15,.14,10.5,mats.black,-5.55,6.4,.3);
// Extremely subtle glass. It must never turn the city into a mirror.
const facade=mesh(new THREE.PlaneGeometry(11,6.25),mats.glass,0,3.23,-4.85);facade.castShadow=false;
const facade2=mesh(new THREE.PlaneGeometry(10.4,6.25),mats.glass,-5.57,3.23,.3);facade2.rotation.y=Math.PI/2;facade2.castShadow=false;
box(4.6,.22,10.4,mats.cream,3.2,3.13,.3);box(4.58,.035,10.35,mats.wood,3.2,3.26,.3);
for(let row=0;row<27;row++){const z=-4.7+row*.385;for(let col=0;col<3;col++){let x=.94+col*2.05-(row%2)*1.025;let w=Math.min(2.04,5.48-x);if(x<.94){w-=.94-x;x=.94;}if(w>0)box(w,.025,.377,floorVariants[(row+col)%8],x+w/2,3.287,z);}}
box(.055,.035,10.3,stripMat,1.03,3.005,.3);
box(.1,.11,10.4,mats.cream,1.0,3.2,.3);
// Thin green-edged glass balustrade with bronze brackets.
const railGlass=new THREE.MeshPhysicalMaterial({color:'#b4d2cb',transparent:true,opacity:.16,roughness:.08,metalness:.08,side:THREE.DoubleSide,depthWrite:false});
for(let i=0;i<5;i++){const z=-3.76+i*1.83;box(.015,1.03,1.78,railGlass,.94,3.83,z);for(let dz of [-.68,.68])box(.05,.11,.09,mats.brass,.94,3.34,z+dz);}
rod([.94,4.38,-4.6],[.94,4.38,4.05],.018,mats.brass);
// Stair climbing direction: left to right at the back of the room.
for(let i=0;i<18;i++){const x=-3.5+(i+.5)*.25;const y=(i+1)*3.26/18;box(.285,.10,1.28,mats.darkwood,x,y-.05,4.62);}
rod([-3.5,.06,4.18],[1,3.2,4.18],.065,mats.black);rod([-3.5,.06,5.05],[1,3.2,5.05],.065,mats.black);
for(let i=0;i<10;i++){const x=-3.45+i*.48,y=(x+3.5)/4.5*3.26;rod([x,y,3.94],[x,y+.94,3.94],.018,mats.black);}
rod([-3.5,1.0,3.94],[1,4.26,3.94],.027,mats.darkwood);

// Soft furniture with rounded volumes, seams, irregular draping and textured weave.
function piping(w,h,d,x,y,z,parent){const p=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;const xx=Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.18)*w/2;const zz=Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.18)*d/2;p.push([x+xx,y+h/2,z+zz]);}line(p,.005,mats.fabric,parent);}
const sofa=group(2.5,.03,-.45,Math.PI/2);
for(const x of [-1.55,1.55])for(const z of [-.42,.45])cyl(.045,.04,.16,mats.darkwood,x,.13,z,sofa);
box(3.85,.32,1.18,mats.fabric,0,.32,0,sofa,.15);
box(3.65,.7,.32,mats.fabric,0,.82,.48,sofa,.15);
for(let x of [-1.82,1.82])box(.3,.65,1.17,mats.fabric,x,.65,0,sofa,.14);
for(let i=0;i<3;i++){const x=(i-1)*1.13;box(1.1,.25,.95,mats.fabric,x,.59,-.08,sofa,.12);piping(1.03,.19,.85,x,.59,-.08,sofa);const b=box(1.1,.63,.26,mats.fabric,x,.96,.31,sofa,.13);b.rotation.x=-.14;}
for(const [x,y,z,rz,c] of [[-1.34,.95,.02,.2,'#d1c2a8'],[1.32,1.0,.05,-.25,'#a8957c'],[.86,.89,-.06,.28,'#d9cdb7']]){const m=mats.fabric.clone();m.color.set(c);const p=box(.63,.63,.21,m,x,y,z,sofa,.16);p.rotation.set(-.15,.1,rz);}
function cloth(w,d,fn,m,x,y,z,parent=scene){const g=new THREE.PlaneGeometry(w,d,65,65);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const xx=p.getX(i),zz=p.getZ(i),result=fn(xx,zz);if(typeof result==='number')p.setY(i,result);else{p.setY(i,result.y);p.setZ(i,result.z);}}g.computeVertexNormals();const o=mesh(g,m,x,y,z,parent);o.material.side=THREE.DoubleSide;return o;}
cloth(.96,1.85,(x,z)=>{const hang=z<-.15,wrinkle=Math.sin(x*32+z*6)*.018+Math.sin(z*21+x*7)*.008;return {y:.81+(hang?(z+.15)*.9:0)+wrinkle,z:hang?-.32+(z+.15)*.1:z};},mats.brownFabric,.05,0,-.33,sofa);
collision(1.73,3.32,-2.5,1.55);
contactShadow(2.5,.037,-.45,2.5,5.0,.65);
const ottoman=group(.1,.04,2.04,-.08);box(1.12,.13,.94,mats.darkwood,0,.13,0,ottoman,.05);box(1.2,.32,1.02,mats.fabric,0,.31,0,ottoman,.15);piping(1.12,.23,.94,0,.31,0,ottoman);contactShadow(.1,.037,2.04,1.8,1.6,.5);collision(-.52,.74,1.5,2.57);
book(.35,.045,.26,'#6a695d',.08,.54,2.02,scene,.16);
// Deep wool rug and tassels.
const rugTex=texture(512,512,(c,w,h)=>{c.fillStyle='#ad9a7d';c.fillRect(0,0,w,h);for(let i=0;i<150000;i++){c.fillStyle=rnd()>.5?'#d1c4aa':'#7e705d';c.globalAlpha=.2;c.fillRect(rnd()*w,rnd()*h,.6,2);}c.globalAlpha=.26;c.strokeStyle='#6d5b43';c.lineWidth=3;c.strokeRect(17,17,w-34,h-34);c.strokeRect(23,23,w-46,h-46);});
const rugMat=new THREE.MeshStandardMaterial({map:rugTex,bumpMap:rugTex,bumpScale:.025,roughness:1});
box(4.45,.032,4.75,rugMat,-.22,.044,-.55,scene,.045);
for(let i=0;i<74;i++){for(let z of [-2.98,1.87]){const x=-2.37+i*.058;rod([x,.052,z],[x+(rnd()-.5)*.025,.047,z+(z<0?-.085:.085)],.006,mats.pages);}}
// Travertine round coffee table, sculptural cross base.
const stone=mat('#b7a78e',.57);stone.bumpMap=noiseTex;stone.bumpScale=.02;
cyl(.86,.86,.1,stone,-.2,.47,-.63,scene,80);box(.15,.39,1.12,stone,-.2,.23,-.63,scene,.025);box(1.12,.39,.15,stone,-.2,.23,-.63,scene,.025);collision(-1.11,.72,-1.54,.3);
contactShadow(-.2,.066,-.63,2.7,2.7,.55);
function book(w,h,d,color,x,y,z,parent=scene,ry=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;parent.add(g);const m=mat(color,.74);box(w,h,d,m,0,0,0,g,.006);box(w-.016,h*.68,d-.027,mats.pages,0,.001,-.006,g);box(.013,h,d,m,-w/2,0,0,g);return g;}
book(.55,.045,.39,'#373c38',-.28,.56,-.52,scene,.16);book(.48,.038,.34,'#b4814b',-.27,.601,-.5,scene,-.08);
const coverTex=texture(256,256,(c,w,h)=>{c.fillStyle='#ded4c1';c.fillRect(0,0,w,h);c.fillStyle='#292b26';c.font='18px serif';c.fillText('THE QUIET',24,42);c.fillText('HOURS',24,67);c.fillStyle='#736e55';c.fillRect(24,92,208,125);c.fillStyle='#b2a188';c.beginPath();c.arc(129,150,51,0,7);c.fill();});
const cover=mesh(new THREE.PlaneGeometry(.45,.32),new THREE.MeshStandardMaterial({map:coverTex}),-.27,.623,-.5);cover.rotation.x=-Math.PI/2;cover.rotation.z=.08;
function vase(x,y,z,s=1,c='#bfb49b',parent=scene){const profile=[[0,0],[.16,0],[.18,.06],[.19,.21],[.12,.32],[.075,.4],[.075,.48],[.06,.49]].map(([x,y])=>new THREE.Vector2(x*s,y*s));const v=mesh(new THREE.LatheGeometry(profile,40),mat(c,.5),x,y,z,parent);return v;}
vase(.18,.53,-.94,.42,'#5b4936');cyl(.08,.075,.12,mats.white,.27,.6,-.55);const handle=mesh(new THREE.TorusGeometry(.048,.013,10,24),mats.white,.35,.62,-.55);handle.rotation.y=Math.PI/2;
function candle(x,y,z,s=1){cyl(.075*s,.075*s,.12*s,mats.cream,x,y+.06*s,z);const f=sphere(.014*s,.04*s,.014*s,candleMat,x,y+.15*s,z);f.castShadow=false;}
candle(.26,.52,-.78,.7);
// Curved walnut lounge chair near the glazing.
const chair=group(-3.7,.02,-2.5,-.44);
for(let x of [-.4,.4]){rod([x,.1,-.38],[x,.65,.3],.035,mats.darkwood,chair);rod([x,.1,.43],[x,.68,-.35],.035,mats.darkwood,chair);}
box(.91,.17,.87,mats.brownFabric,0,.51,0,chair,.09);const chairBack=box(.89,.78,.18,mats.darkwood,0,.94,.4,chair,.1);chairBack.rotation.x=-.2;const cb=box(.78,.68,.18,mats.brownFabric,0,.98,.29,chair,.1);cb.rotation.x=-.2;
for(let x of [-.51,.51]){rod([x,.37,-.27],[x,.82,-.27],.023,mats.darkwood,chair);box(.09,.065,.95,mats.darkwood,x,.84,.03,chair,.03);}
collision(-4.4,-3.0,-3.2,-1.9);
contactShadow(-3.7,.04,-2.5,1.7,1.65,.6);
// Small side table and reading lamp.
cyl(.31,.33,.05,mats.darkwood,-2.72,.61,-3.05);cyl(.035,.035,.58,mats.black,-2.72,.3,-3.05);cyl(.23,.23,.025,mats.black,-2.72,.04,-3.05);book(.26,.035,.2,'#8d6246',-2.74,.658,-3.08,scene,.12);
function floorLamp(x,y,z,h=1.85){cyl(.23,.25,.035,mats.black,x,y+.035,z);rod([x,y+.04,z],[x,y+h,z],.018,mats.brass);const shade=cyl(.2,.38,.36,mats.cream,x,y+h,z);shade.material=shade.material.clone();shade.material.side=THREE.DoubleSide;cyl(.33,.33,.012,lightMat,x,y+h-.18,z);warmPoint(x,y+h-.23,z,19,true);}
floorLamp(-3.05,0,-3.75,1.95);
// Indoor tree, individually curved leaves in a ribbed ceramic planter.
function plant(x,y,z,s=1){const g=group(x,y,z);cyl(.25*s,.18*s,.46*s,mat('#958369',.8),0,.23*s,0,g);cyl(.23*s,.23*s,.016,mats.soil,0,.46*s,0,g);for(let i=0;i<32;i++){const a=i/32*Math.PI*2;rod([Math.cos(a)*.222*s,.04*s,Math.sin(a)*.222*s],[Math.cos(a)*.25*s,.44*s,Math.sin(a)*.25*s],.006*s,mats.cream,g);}for(let branch=0;branch<4;branch++){const h=(1.15+branch*.34)*s;const bx=(branch%2?.14:-.1)*s,bz=(branch%3-.8)*.13*s;rod([0,.4*s,0],[bx,h,bz],.018*s,mats.darkwood,g);for(let j=0;j<9;j++){const a=j/9*Math.PI*2+branch*.7,len=(.34+rnd()*.3)*s;const points=[[bx,h,bz],[bx+Math.cos(a)*len*.6,h+.11*s,bz+Math.sin(a)*len*.6],[bx+Math.cos(a)*len,h-.32*s,bz+Math.sin(a)*len]];const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const geom=new THREE.BufferGeometry(),pos=[],uv=[],idx=[];for(let k=0;k<=12;k++){const t=k/12,p=curve.getPoint(t),w=Math.sin(t*Math.PI)*.047*s;for(let side of [-1,1]){pos.push(p.x-Math.sin(a)*w*side,p.y,p.z+Math.cos(a)*w*side);uv.push((side+1)/2,t);}if(k<12){const n=k*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.setIndex(idx);geom.computeVertexNormals();const m=mats.leaf.clone();m.side=THREE.DoubleSide;mesh(geom,m,0,0,0,g);}}return g;}
plant(-4.58,0,-.7,1.15);plant(4.7,3.28,2.85,.66);
// Full-height linen curtains stay open, framing the city with soft folds.
const curtainMat=new THREE.MeshStandardMaterial({color:'#bbb29d',map:linen,bumpMap:linen,bumpScale:.01,roughness:1,side:THREE.DoubleSide});
for(const [cx,cz,ry,width] of [[-5.28,-4.6,0,.6],[5.2,-4.6,0,.58],[-5.3,5.2,Math.PI/2,.65]]){const g=new THREE.PlaneGeometry(width,6.17,30,24);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin((x/width+.5)*Math.PI*10)*.095+Math.sin(y*.7)*.018);}g.computeVertexNormals();const o=mesh(g,curtainMat,cx,3.2,cz);o.rotation.y=ry;}
// Console, shelves, records and abstract framed works.
box(.53,.62,3.25,mats.darkwood,5.12,.42,-2.3,scene,.025);for(let z of [-3.31,-2.3,-1.3]){box(.018,.47,.93,mats.wood,4.84,.45,z);box(.02,.04,.25,mats.brass,4.81,.63,z);}
function artwork(w,h,x,y,z,ry,variant=0){const t=texture(512,640,(c,W,H)=>{c.fillStyle=variant?'#c2b69d':'#e0d2b7';c.fillRect(0,0,W,H);c.fillStyle='#574e3e';if(variant){for(let i=0;i<22;i++){c.lineWidth=1;c.strokeStyle='#514a3d';c.beginPath();c.moveTo(80+i*16,70);c.bezierCurveTo(330-i*7,220,60+i*13,420,100+i*12,570);c.stroke();}}else{c.fillStyle='#99835c';c.beginPath();c.arc(270,260,145,Math.PI,0);c.lineTo(415,520);c.lineTo(125,520);c.fill();c.fillStyle='#302f29';c.beginPath();c.arc(245,355,100,0,7);c.fill();c.fillStyle='#d9cbb1';c.fillRect(240,355,150,200);}c.fillStyle='#52493c';c.font='12px serif';c.fillText(variant?'STUDIES IN STILLNESS':'FORME / 028',46,H-28);});const g=group(x,y,z,ry);box(w+.06,h+.06,.045,mats.darkwood,0,0,.015,g,.005);mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.9}),0,0,-.012,g).rotation.y=Math.PI;return g;}
artwork(1.05,1.42,5.46,1.75,-2.8,Math.PI/2);artwork(.64,.88,5.46,1.48,-1.55,Math.PI/2,1);
for(let z of [-2.8,-1.4])box(.35,.045,1.1,mats.wood,5.24,2.54,z);
vase(5.15,2.57,-2.9,.62);vase(5.2,2.57,-1.2,.4,'#453f33');
for(let i=0;i<7;i++)book(.04,.26+rnd()*.11,.18,['#b5a483','#4b5149','#a46f44'][i%3],5.1,2.72,-1.75+i*.045,scene,Math.PI/2);
// Kitchen beneath the loft, including sink, brass tap and warm backsplash.
box(3.3,.88,.62,mats.cream,3.68,.45,5.12,scene,.022);box(3.44,.07,.72,stone,3.68,.925,5.08,scene,.012);
for(let x of [2.47,3.26,4.05,4.84]){box(.015,.72,.63,mats.darkwood,x,.47,5.11);rod([x+.12,.79,4.75],[x+.52,.79,4.75],.009,mats.brass);}
box(3.3,.66,.035,mats.wood,3.68,1.29,5.5);box(3.4,.055,.32,mats.wood,3.68,1.78,5.33);box(3.32,.013,.02,stripMat,3.68,1.74,5.16);warmPoint(3.7,1.5,5.12,17);
box(.7,.025,.44,mats.black,3.34,.972,5.05,scene,.07);box(.59,.014,.33,mat('#4b5351',.2,.7),3.34,.99,5.05,scene,.08);
line([[3.35,.98,5.33],[3.35,1.35,5.33],[3.35,1.42,5.18],[3.35,1.26,5.07]],.015,mats.brass);
for(let x of [4.44,4.84]){const b=mesh(new THREE.TorusGeometry(.13,.014,10,36),mats.black,x,.978,5.06);b.rotation.x=Math.PI/2;}vase(2.3,.97,5.12,.38,'#7d7157');
collision(1.94,5.47,4.7,5.5);
// Round breakfast table, bentwood stools, pendant.
cyl(.65,.65,.06,mats.darkwood,-3.36,.82,1.63,scene,64);cyl(.09,.2,.76,mats.darkwood,-3.36,.4,1.63);
for(const [x,z] of [[-4.25,1.6],[-3.25,2.55]]){cyl(.27,.27,.07,mats.wood,x,.49,z);for(let i=0;i<3;i++){const a=i/3*Math.PI*2;rod([x+Math.cos(a)*.19,.47,z+Math.sin(a)*.19],[x+Math.cos(a)*.25,.04,z+Math.sin(a)*.25],.025,mats.darkwood);}}
vase(-3.4,.86,1.61,.5,'#6e5c45');for(let i=0;i<5;i++){const a=rnd()*6.28;line([[-3.4,1.08,1.61],[-3.4+Math.cos(a)*.08,1.4,1.61+Math.sin(a)*.08],[-3.4+Math.cos(a)*.19,1.55,1.61+Math.sin(a)*.19]],.004,mats.darkwood);sphere(.06,.03,.08,mats.pages,-3.4+Math.cos(a)*.19,1.55,1.61+Math.sin(a)*.19);}
rod([-3.36,6.4,1.63],[-3.36,2.6,1.63],.009,mats.black);cyl(.08,.38,.23,mats.cream,-3.36,2.6,1.63);cyl(.33,.33,.01,lightMat,-3.36,2.48,1.63);warmPoint(-3.36,2.4,1.63,20);
collision(-4.05,-2.65,.92,2.35);
// A tall column of books, a direct spatial detail from the references.
for(let i=0;i<36;i++){book(.46+rnd()*.08,.048+rnd()*.028,.33+rnd()*.08,['#c4b99f','#ddd3be','#6a695d','#9a8669'][i%4],-4.97+(rnd()-.5)*.05,i*.069+.045,-4.13,scene,(rnd()-.5)*.22);}
// Upstairs bedroom: upholstered bed, pillow creases and a casually folded duvet.
const bed=group(3.4,3.29,-2.13,-Math.PI/2);
box(2.15,.26,2.65,mats.darkwood,0,.22,0,bed,.06);box(2.05,.28,2.53,mats.fabric,0,.43,0,bed,.13);
box(2.23,1.02,.15,mats.brownFabric,0,.7,-1.37,bed,.06);
for(let x of [-.52,.52]){const pillow=box(.87,.22,.57,mats.fabric,x,.66,-.82,bed,.12);pillow.rotation.set(.06,(x>0?.08:-.07),x*.06);}
const duvetMat=mats.fabric.clone();duvetMat.color.set('#ac9b81');
cloth(2.4,2.12,(x,z)=>{const drop=Math.max(0,Math.abs(x)-.93)*1.7+Math.max(0,z-.94)*1.8;return .65-drop+Math.sin(x*11+z*6)*.027+Math.sin(z*26-x*3)*.012+Math.exp(-Math.pow(z+.74,2)*40)*.08;},duvetMat,0,0,.3,bed);
const throwMat=mats.brownFabric.clone();throwMat.color.set('#6d6b55');cloth(2.43,.66,(x,z)=>.7-Math.max(0,Math.abs(x)-.94)*1.75+Math.sin(x*33+z*14)*.018,throwMat,0,0,.9,bed);
collision(1.92,4.86,-3.3,-.96,1);
contactShadow(3.4,3.29,-2.13,3.8,3.0,.55);
// Bedside walnut cubes and glowing linen lamps.
function tableLamp(x,y,z,s=1){cyl(.11*s,.14*s,.025*s,mats.brass,x,y+.025*s,z);vase(x,y,z,.52*s,'#8d6241');const sh=cyl(.16*s,.26*s,.32*s,mats.cream,x,y+.43*s,z);sh.material=sh.material.clone();sh.material.side=THREE.DoubleSide;cyl(.22*s,.22*s,.01,lightMat,x,y+.27*s,z);warmPoint(x,y+.25*s,z,13*s);}
for(let z of [-3.63,-.58]){box(.54,.43,.58,mats.darkwood,4.8,3.51,z,scene,.024);tableLamp(4.8,3.74,z,.85);}
area('#ffca8a',1.0,2.6,2,[5.32,4.63,-2],[2.5,4,-2]);
artwork(1.15,1.45,5.48,5.02,-2,Math.PI/2,1);
// Upstairs reading corner and small work desk.
box(1.65,.07,.67,mats.darkwood,4.5,4.04,1.48,scene,.025);
for(let x of [3.8,5.19])for(let z of [1.25,1.72])rod([x,3.3,z],[x,4.0,z],.025,mats.black);
box(.59,.038,.4,mats.black,4.5,4.095,1.42,scene,.017);const laptop=box(.59,.4,.025,mats.black,4.5,4.3,1.61,scene,.018);laptop.rotation.x=-.16;
const screen=mesh(new THREE.PlaneGeometry(.54,.34),mat('#566463',.5),4.5,4.31,1.59);screen.rotation.y=Math.PI;screen.rotation.x=.16;
cyl(.29,.29,.09,mats.brownFabric,4.45,3.76,2.22);for(let i=0;i<4;i++){const a=i/4*Math.PI*2;rod([4.45+Math.cos(a)*.18,3.72,2.22+Math.sin(a)*.18],[4.45+Math.cos(a)*.25,3.29,2.22+Math.sin(a)*.25],.018,mats.black);}
tableLamp(5.02,4.08,1.49,.7);book(.28,.04,.21,'#bb9e6f',4.0,4.1,1.46);
collision(3.56,5.37,1.03,1.88,1);
// Architectural lights: neutral daylight outside, practical warm pools inside.
const hemi=new THREE.HemisphereLight('#b7d0e2','#70604d',.75);scene.add(hemi);
const ambient=new THREE.AmbientLight('#e7cfaf',.13);scene.add(ambient);
const sun=new THREE.DirectionalLight('#d6e7ff',1.3);sun.position.set(-10,14,-10);sun.target.position.set(0,0,0);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=.5;sun.shadow.camera.far=48;sun.shadow.normalBias=.025;sun.shadow.bias=-.00035;sun.shadow.radius=4;
const windowFill=area('#9dc1ed',2.2,9.5,5.5,[0,3.4,-4.6],[0,2,2]);
const sideFill=area('#9bb4d2',1.4,7,5,[-5.3,3.2,.1],[2,2,.1]);
const livingFill=area('#ffd3a1',2.4,3.5,2.2,[5.26,2,-.4],[0,0,-.4]);
const coveFill=area('#ffca8d',2.6,3,7,[4.8,6.25,.3],[4.8,4,.3]);
warmPoint(2.6,2.85,1.7,9);warmPoint(3.5,5.9,3.5,13);
for(const [x,z] of [[2,-3.8],[4,-3.8],[2,2.9],[4,4.6],[-3,4.9]]){cyl(.068,.068,.018,mats.black,x,6.42,z);cyl(.045,.045,.022,lightMat,x,6.402,z);}

// The skyline is real geometry; façade windows are a batched GLSL grid.
const worldUniforms={uNight:{value:1},uFog:{value:0},uTime:{value:0}};
const cityMat=new THREE.ShaderMaterial({uniforms:{...worldUniforms},vertexShader:`varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; void main(){vLocal=position;vec4 w=instanceMatrix*vec4(position,1.); vWorld=(modelMatrix*w).xyz;vNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,fragmentShader:`uniform float uNight;uniform float uFog;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 uv=abs(vNormal.z)>.5?vWorld.xy:vWorld.zy;vec2 cell=floor(uv*vec2(.89,.94));vec2 f=fract(uv*vec2(.89,.94));float r=hash(cell+floor(vWorld.xz*.04));float isWindow=step(.28,f.x)*step(f.x,.70)*step(.26,f.y)*step(f.y,.68);float lit=step(.73,r)*isWindow*step(abs(vNormal.y),.5);float shade=.5+.3*max(0.,dot(vNormal,normalize(vec3(-.5,.7,-.3))));vec3 day=vec3(.21,.27,.31)*shade;vec3 night=vec3(.008,.018,.036)*shade;vec3 c=mix(day,night,uNight);float variation=hash(floor(vWorld.xz*.05));c*=.7+variation*.6;c+=isWindow*mix(vec3(.025,.055,.09),vec3(.002,.005,.009),uNight);vec3 warm=mix(vec3(.28,.16,.065),vec3(.1,.18,.28),step(.94,r));c+=lit*warm*(.08+uNight*.7);float dist=distance(cameraPosition,vWorld);vec3 fogColor=mix(vec3(.44,.57,.65),vec3(.014,.035,.072),uNight);float fog=1.-exp(-dist*mix(.0009,.012,uFog));c=mix(c,fogColor,fog);gl_FragColor=vec4(c,1.);#include <tonemapping_fragment> #include <colorspace_fragment>}`.replaceAll('#include','\n#include')});
const city=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),cityMat,180);const dummy=new THREE.Object3D();
let cityIndex=0;
for(let row=0;row<10;row++){for(let col=0;col<18;col++){const x=-170+col*19+rnd()*7,z=-20-row*21-rnd()*5;const w=6+rnd()*9,d=7+rnd()*9;let height=12+rnd()*52;if(row<2)height=13+rnd()*38;if(row>5)height=15+rnd()*65;dummy.position.set(x,-54+height/2,z);dummy.scale.set(w,height,d);dummy.rotation.set(0,0,0);dummy.updateMatrix();city.setMatrixAt(cityIndex++,dummy.matrix);}}
city.frustumCulled=false;city.castShadow=false;city.receiveShadow=false;scene.add(city);
const sideCity=city.clone();sideCity.rotation.y=Math.PI/2;sideCity.position.set(-18,0,12);scene.add(sideCity);
const ground=box(600,1,600,mat('#26343b',1),0,-54,0);ground.castShadow=false;
// Nearby balconies give parallax and scale.
const neighbor=group(-15,-26,-12);
for(let y=0;y<66;y+=3.2){box(9,.16,8,mat('#344049',.65),0,y,0,neighbor);for(let x of [-4.3,-2,1,4.3])box(.12,3.2,.12,mats.black,x,y+1.6,4,neighbor);box(9,1,.025,new THREE.MeshStandardMaterial({color:'#527281',metalness:.6,roughness:.3}),0,y+.65,4,neighbor);}
// Sky, cloud banks and atmospheric layers. The shader is independent of indoor fog.
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:worldUniforms,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uNight;uniform float uTime;uniform float uFog;varying vec3 vDir;float hash(vec2 p){return fract(sin(dot(p,vec2(12.71,31.17)))*43758.54);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.02+1.3;a*=.5;}return v;}void main(){vec3 d=normalize(vDir);float h=clamp(d.y*.8+.1,0.,1.);vec3 day=mix(vec3(.77,.78,.71),vec3(.23,.48,.68),pow(h,.5));vec3 night=mix(vec3(.025,.065,.15),vec3(.002,.009,.035),pow(h,.5));vec3 c=mix(day,night,uNight);vec2 p=d.xz/(max(.18,d.y+.36))*2.4;float cl=fbm(p+vec2(uTime*.002,0.));float bank=smoothstep(.43,.75,cl)*smoothstep(-.13,.22,d.y);vec3 cloud=mix(vec3(.95,.9,.79),vec3(.05,.11,.21),uNight);c=mix(c,cloud,bank*.63);float sun=pow(max(0.,dot(d,normalize(vec3(-.6,.35,-.7)))),100.);c+=vec3(1.,.8,.5)*sun*(1.-uNight)*.5;float moon=smoothstep(.9995,.9998,dot(d,normalize(vec3(-.32,.38,-.86))));c+=vec3(.65,.75,.83)*moon*uNight;c=mix(c,mix(vec3(.69,.74,.74),vec3(.025,.055,.1),uNight),uFog*.35);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
const sky=mesh(new THREE.SphereGeometry(450,48,32),skyMat);sky.castShadow=sky.receiveShadow=false;
// Small distant traffic threads and aircraft are intentionally quiet.
const traffic=[];const trafficMat=luminous('#ffc98e',1.4);
for(let i=0;i<34;i++){const p=sphere(.09,.07,.09,trafficMat,-100+rnd()*200,-52.7,-24-rnd()*110);p.castShadow=false;traffic.push({o:p,s:.6+rnd()*.8});}

// Merge static geometry by material: keeps detailed furnishings affordable in real time.
scene.updateMatrixWorld(true);
const batches=new Map(),animated=new Set(traffic.map(t=>t.o));let staticCount=0;
scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||animated.has(o)||Array.isArray(o.material)||!o.material.isMeshStandardMaterial||o.material.transparent)return;
const m=o.material,key=[m.type,m.color.getHex(),m.roughness,m.metalness,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.emissive.getHex(),m.emissiveIntensity,m.side].join('/');
if(!batches.has(key))batches.set(key,{material:m,objects:[]});batches.get(key).objects.push(o);staticCount++;});
for(const {material,objects} of batches.values()){if(objects.length<2)continue;const geos=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);return g;});const combined=mergeGeometries(geos,false);if(combined){const o=mesh(combined,material);objects.forEach(item=>item.removeFromParent());}geos.forEach(g=>g.dispose());}

// Gentle postprocessing: contact occlusion, highlight bloom and a subtle film finish.
const composer=new EffectComposer(renderer);
const renderPass=new RenderPass(scene,camera);const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.65;ao.minDistance=.002;ao.maxDistance=.08;
composer.addPass(renderPass);composer.addPass(ao);
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.17,.5,1.35);composer.addPass(bloom);
const finish=new ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float vignette=smoothstep(.9,.23,distance(vUv,vec2(.5,.51)));c*=mix(.86,1.,vignette);float grain=fract(sin(dot(vUv+fract(uTime),vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.0025;gl_FragColor=vec4(c,1.);}`});composer.addPass(finish);composer.addPass(new OutputPass());composer.addPass(new SMAAPass());

// Visitor: a deliberately quiet, human-scale figure; animated only in third person.
const avatar=group(-1.8,0,2.5);avatar.visible=false;const shirt=mat('#a79578',.93),pants=mat('#363d39',.9),skin=mat('#b99577',.8),hair=mat('#292721',.88);
sphere(.2,.25,.19,skin,0,1.48,0,avatar);sphere(.205,.13,.2,hair,0,1.65,.025,avatar);box(.45,.52,.26,shirt,0,1.02,0,avatar,.12);cyl(.07,.08,.13,skin,0,1.27,0,avatar);
const limbs=[];for(let side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.29,1.22,0);avatar.add(arm);mesh(new THREE.CapsuleGeometry(.075,.37,5,10),shirt,0,-.21,0,arm);sphere(.066,.09,.067,skin,0,-.48,0,arm);const leg=new THREE.Group();leg.position.set(side*.125,.79,0);avatar.add(leg);mesh(new THREE.CapsuleGeometry(.095,.51,5,10),pants,0,-.32,0,leg);box(.18,.13,.31,mats.black,0,-.71,-.055,leg,.05);limbs.push({arm,leg,side});}
const player=new THREE.Vector3(-1.8,0,2.5);let yaw=.15,pitch=-.03,mode='orbit',night=1,targetNight=1,fog=0,targetFog=0,tour=false,immersive=false,walkDistance=0;
const keys=new Set();let transition=null,drag=null,showReady=false,frameCount=0;
const views={living:{p:[-4.55,2.55,4.65],t:[.45,2.45,-1.35],label:'客厅 · 一层'},window:{p:[-.7,1.65,1.5],t:[-3.8,1.85,-4.6],label:'窗边 · 一层'},bedroom:{p:[1.58,4.65,3.5],t:[3.2,4.0,-2.15],label:'卧室 · 二层'},overview:{p:[-4.93,4.7,5.0],t:[1.05,2.65,-1.35],label:'挑空 · 全景'}};
camera.position.set(...views.living.p);controls.target.set(...views.living.t);controls.update();
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function stopTour(){tour=false;$('#tour-btn').setAttribute('aria-pressed','false');$('#tour-btn .play-symbol').textContent='▷';}
function selectView(name,animate=true){const v=views[name];if(!v)return;setMode('orbit',false);controls.target.set(...v.t);transition=animate?{from:camera.position.clone(),to:new THREE.Vector3(...v.p),fromT:camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(6).add(camera.position),toT:new THREE.Vector3(...v.t),time:0,duration:1.8}:null;if(!animate){camera.position.set(...v.p);controls.update();}$$('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===name));$('#floor-label').textContent=v.label;}
function getFloor(x,z){if(z>=3.97&&z<=5.3&&x>=-3.6&&x<=1.18)return clamp((x+3.5)/4.5,0,1)*3.26;if(x>=1.18)return player.y>2.9?3.29:0;return 0;}
function canMove(x,z){if(x< -5.17||x>5.17||z< -4.44||z>5.28)return false;const upstairs=player.y>2.9;const onStairs=z>=3.97&&z<=5.28&&x>=-3.65&&x<=1.5;
if(upstairs&&x<1.22&&!onStairs)return false;
if(player.y>.12&&player.y<3.18&&x<1.18&&(z<3.98||z>5.28))return false;
if(!upstairs&&onStairs&&x> -3.3&&player.y<.1&&player.z<3.95)return false;
const level=upstairs?1:0;for(const b of colliders){if(b.level!==level)continue;if(x>b.x1-.19&&x<b.x2+.19&&z>b.z1-.19&&z<b.z2+.19)return false;}return true;}
function setMode(next,notify=true){if(next===mode)return;const previous=mode,fromUpper=camera.position.y>3.8&&camera.position.x>1.2;stopTour();transition=null;mode=next;controls.enabled=mode==='orbit';document.exitPointerLock?.();keys.clear();$$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});document.body.classList.toggle('walking',mode!=='orbit');avatar.visible=mode==='third';$('#crosshair').style.display=mode==='first'?'block':'none';$('#walk-prompt').hidden=mode==='orbit';$('#touch-controls').hidden=mode==='orbit'||!matchMedia('(pointer:coarse)').matches;
if(mode!=='orbit'){if(previous==='orbit'){player.set(...(fromUpper?[1.65,3.29,2.8]:[-1.85,0,2.6]));yaw=0;pitch=-.03;}$('#floor-label').textContent=player.y>2.9?'卧室 · 二层':'客厅 · 一层';$('#hint').textContent='沿后方木楼梯，可以走上二楼';if(matchMedia('(pointer:coarse)').matches)$('#walk-prompt').hidden=true;if(notify)toast(mode==='first'?'第一人称 · 点击画面后，用 WASD 移动':'第三人称 · 拖动环顾，用 WASD 移动');}else{$('#hint').innerHTML='拖动环顾 · 滚轮靠近 <span>选择第一 / 第三人称，即可步行参观</span>';selectView('living');}}
function setTime(v){targetNight=v==='night'?1:0;$$('[data-time]').forEach(b=>{const active=b.dataset.time===v;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('#clock-label').textContent=targetNight?'19:20':'15:40';$('#scene-label').textContent=targetNight?'蓝调时刻 / BLUE HOUR':'日光入室 / AFTERNOON LIGHT';}
function toggleFog(){targetFog=targetFog?0:1;$('#fog-btn').setAttribute('aria-pressed',String(!!targetFog));}
function toggleUI(){immersive=!immersive;document.body.classList.toggle('immersive',immersive);$('#restore-btn').hidden=!immersive;}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$$('[data-view]').forEach(b=>b.addEventListener('click',()=>{stopTour();selectView(b.dataset.view);}));$$('[data-time]').forEach(b=>b.addEventListener('click',()=>setTime(b.dataset.time)));$('#fog-btn').onclick=toggleFog;$('#hide-btn').onclick=$('#restore-btn').onclick=toggleUI;
$('#help-btn').onclick=()=>{document.exitPointerLock?.();keys.clear();$('#help').showModal();};$('.close-dialog').onclick=$('#help-done').onclick=()=>$('#help').close();
$('#atmosphere-btn').onclick=()=>{const open=document.body.classList.toggle('settings-open');$('#atmosphere-btn').setAttribute('aria-expanded',String(open));$('#atmosphere-btn').setAttribute('aria-label',open?'收起氛围设置':'展开氛围设置');};
$('#fullscreen-btn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('可以使用浏览器的 F11 进入全屏');}};
$('#capture-btn').onclick=()=>{try{composer.render();const a=document.createElement('a');a.download=`云间-${targetNight?'夜幕':'白昼'}${targetFog?'-薄雾':''}.png`;a.href=canvas.toDataURL('image/png');a.click();toast('已保存这一刻');}catch{toast('当前浏览器无法保存画面');}};
let tourTime=0;$('#tour-btn').onclick=()=>{if(tour){stopTour();return;}setMode('orbit',false);tour=true;tourTime=0;$('#tour-btn').setAttribute('aria-pressed','true');$('#tour-btn .play-symbol').textContent='Ⅱ';toast('镜头正在漫游 · 拖动画面可随时接管');};controls.addEventListener('start',()=>{stopTour();transition=null;});
function requestLock(){if(mode==='orbit')return;if(!matchMedia('(pointer:coarse)').matches)canvas.requestPointerLock?.().catch?.(()=>toast('拖动画面也可以环顾'));}
$('#lock-btn').onclick=requestLock;document.addEventListener('pointerlockchange',()=>{$('#walk-prompt').hidden=!!document.pointerLockElement||mode==='orbit'||matchMedia('(pointer:coarse)').matches;keys.clear();});
canvas.addEventListener('pointerdown',e=>{if(mode==='orbit')return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(mode==='orbit'||document.pointerLockElement===canvas||!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;yaw-=dx*.003;pitch=clamp(pitch-dy*.003,-1.18,1.18);drag.x=e.clientX;drag.y=e.clientY;});canvas.addEventListener('pointerup',()=>drag=null);
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&mode!=='orbit'){yaw-=e.movementX*.002;pitch=clamp(pitch-e.movementY*.002,-1.18,1.18);}});
document.addEventListener('keydown',e=>{if($('#help').open||e.target instanceof HTMLSelectElement)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Digit1')setMode('orbit');if(e.code==='Digit2')setMode('first');if(e.code==='Digit3')setMode('third');if(e.code==='KeyN')setTime(targetNight?'day':'night');if(e.code==='KeyF')toggleFog();if(e.code==='KeyH')toggleUI();});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
$$('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(b.dataset.key);b.setPointerCapture(e.pointerId);});for(let event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
$('#quality').onchange=()=>{const q=$('#quality').value;ao.enabled=q!=='low';bloom.enabled=q!=='low';renderer.setPixelRatio(q==='ultra'?Math.min(devicePixelRatio,2):q==='low'?Math.min(devicePixelRatio,1):Math.min(devicePixelRatio,1.5));sun.shadow.mapSize.set(q==='ultra'?4096:2048,q==='ultra'?4096:2048);sun.shadow.map?.dispose();sun.shadow.map=null;resize();toast(q==='ultra'?'极致画质 · 高分辨率阴影与环境遮蔽':q==='low'?'流畅画质 · 降低后期处理开销':'精致画质');};
let audioContext,audioGain;$('#sound-btn').onclick=async()=>{try{if(!audioContext){audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate);const data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.025)/1.025;data[i]=last;}const src=audioContext.createBufferSource();src.buffer=buffer;src.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;src.connect(filter).connect(audioGain);src.start();}await audioContext.resume();const on=$('#sound-btn').getAttribute('aria-pressed')!=='true';audioGain.gain.setTargetAtTime(on?.22:0,audioContext.currentTime,.8);$('#sound-btn').setAttribute('aria-pressed',String(on));$('#sound-btn').setAttribute('aria-label',on?'关闭环境声音':'开启环境声音');toast(on?'城市低语 · 已开启':'环境声音已关闭');}catch{toast('当前浏览器无法开启声音');}};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);if(innerWidth<600&&mode==='orbit'&&!transition){camera.fov=75;camera.updateProjectionMatrix();}else{camera.fov=62;camera.updateProjectionMatrix();}}window.addEventListener('resize',resize);resize();
let lastFrame=performance.now(),elapsed=0,fpsStart=performance.now(),fpsFrames=0;
const focus=new THREE.Vector3(),offset=new THREE.Vector3(),desired=new THREE.Vector3(),forward=new THREE.Vector3();
const followRay=new THREE.Ray(),followDirection=new THREE.Vector3(),followHit=new THREE.Vector3();
const cameraObstacles=[new THREE.Box3(new THREE.Vector3(-3.6,0,3.93),new THREE.Vector3(1.1,3.5,5.4)),new THREE.Box3(new THREE.Vector3(.9,3.0,-4.8),new THREE.Vector3(5.55,3.3,5.5))];
function animate(){requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;elapsed+=dt;frameCount++;
night=mix(night,targetNight,1-Math.exp(-dt*1.8));fog=mix(fog,targetFog,1-Math.exp(-dt*1.35));worldUniforms.uNight.value=night;worldUniforms.uFog.value=fog;worldUniforms.uTime.value=elapsed;finish.uniforms.uTime.value=elapsed;
hemi.intensity=mix(1.25,.23,night);ambient.intensity=mix(.12,.055,night);sun.intensity=mix(2.5,.22,night);sun.color.set(night>.5?'#afc9ee':'#ffdbad');windowFill.intensity=mix(3.3,.7,night);sideFill.intensity=mix(2.1,.4,night);livingFill.intensity=mix(.6,.95,night);coveFill.intensity=mix(.7,1.15,night);scene.environmentIntensity=mix(.36,.12,night);renderer.toneMappingExposure=mix(.95,.95,night);
for(const {l,p} of lamps)l.intensity=p*mix(.22,.66,night);for(const {m,i} of glowMats)m.emissiveIntensity=i*mix(.45,1,night);
for(const t of traffic){t.o.position.x+=dt*t.s;if(t.o.position.x>120)t.o.position.x=-120;}
if(mode==='orbit'){
 if(transition){transition.time+=dt;const t=clamp(transition.time/transition.duration,0,1),e=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.fromT,transition.toT,e);if(t>=1)transition=null;}
 if(tour){tourTime+=dt;const a=tourTime*.08;camera.position.set(-4.3+Math.sin(a)*.45,3.15+Math.sin(a*.55)*1.05,4.7-Math.sin(a*.7)*.65);controls.target.set(.2+Math.sin(a*.4)*.8,2.6+Math.sin(a*.55)*.35,-1.5);}
 controls.update();
}else{
 let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));let z=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));const moving=x!==0||z!==0;
 if(moving){const norm=Math.hypot(x,z);x/=norm;z/=norm;const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.7:1.65)*dt;const dx=(Math.cos(yaw)*x-Math.sin(yaw)*z)*speed,dz=(-Math.sin(yaw)*x-Math.cos(yaw)*z)*speed;if(canMove(player.x+dx,player.z))player.x+=dx;if(canMove(player.x,player.z+dz))player.z+=dz;const floor=getFloor(player.x,player.z);player.y=mix(player.y,floor,Math.min(1,dt*14));walkDistance+=speed;avatar.rotation.y=Math.atan2(-dx,-dz);}
 avatar.position.copy(player);for(const limb of limbs){limb.arm.rotation.x=moving?Math.sin(walkDistance*7)*.35*limb.side:0;limb.leg.rotation.x=moving?-Math.sin(walkDistance*7)*.45*limb.side:0;}
 const bob=moving?Math.sin(walkDistance*12)*.018:Math.sin(elapsed*1.5)*.003;
 if(mode==='first'){camera.position.set(player.x,player.y+1.65+bob,player.z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
 else{focus.set(player.x,player.y+1.18,player.z);let bestScore=-Infinity;for(const angle of [0,.7,-.7,1.4,-1.4,2.2,-2.2,Math.PI]){offset.set(Math.sin(yaw+angle)*2.65,.72-Math.sin(pitch)*1.6,Math.cos(yaw+angle)*2.65);desired.copy(focus).add(offset);desired.x=clamp(desired.x,-5.22,5.2);desired.z=clamp(desired.z,-4.4,5.25);if(player.y<2.5&&desired.x>1.1)desired.y=Math.min(desired.y,2.85);desired.y=Math.min(desired.y,6.14);followDirection.copy(desired).sub(focus).normalize();followRay.set(focus,followDirection);for(const obstacle of cameraObstacles){if(!obstacle.containsPoint(focus)&&followRay.intersectBox(obstacle,followHit)&&focus.distanceTo(followHit)<focus.distanceTo(desired)){desired.copy(focus).addScaledVector(followDirection,Math.max(.65,focus.distanceTo(followHit)-.22));}}const score=focus.distanceTo(desired)-Math.abs(angle)*.23;if(score>bestScore){bestScore=score;forward.copy(desired);}}camera.position.lerp(forward,1-Math.exp(-dt*7));camera.lookAt(focus);}
 $('#floor-label').textContent=player.y>2.9?'卧室 · 二层':player.y>.2?'楼梯 · 层间':'客厅 · 一层';
}
renderer.info.reset();composer.render();fpsFrames++;
if(now-fpsStart>1000){canvas.dataset.fps=String(Math.round(fpsFrames*1000/(now-fpsStart)));fpsStart=now;fpsFrames=0;}
if(frameCount%10===0){canvas.dataset.player=player.toArray().map(v=>v.toFixed(2)).join(',');canvas.dataset.mode=mode;canvas.dataset.drawCalls=String(renderer.info.render.calls);}
if(!showReady&&frameCount===3){showReady=true;$('#loading').style.opacity='0';setTimeout(()=>$('#loading').remove(),1100);}
}
// Read-only QA state, useful for checking actual render and navigation without changing UI.
window.cloudroom={get state(){return {mode,night:targetNight,fog:targetFog,player:player.toArray(),camera:camera.position.toArray(),tour,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
animate();
