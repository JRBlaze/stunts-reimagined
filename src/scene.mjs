import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {TILE,CARS,describe,terrainHeight,samplePath,sceneryNoise as noise} from './core.mjs';

const material=(color,roughness=0.6,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export function box(parent,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function buildCar(spec=CARS[0],ghost=false) {
  const car=new THREE.Group(),paint=new THREE.MeshPhysicalMaterial({color:spec.color,metalness:0.68,roughness:0.22,clearcoat:1,clearcoatRoughness:0.12});
  if(ghost){paint.transparent=true;paint.opacity=0.36;}
  const dark=material('#12191c',0.42,0.4),glass=new THREE.MeshPhysicalMaterial({color:'#142c38',metalness:0.8,roughness:0.09,clearcoat:1});
  const alloy=material('#a9b5b8',0.25,0.9),rubber=material('#151719',0.95),light=new THREE.MeshStandardMaterial({color:'#e4f6ff',emissive:'#b4dfff',emissiveIntensity:2});
  const tail=new THREE.MeshStandardMaterial({color:'#ed2e29',emissive:'#e41d13',emissiveIntensity:1.5});
  const truck=spec.shape==='truck',formula=spec.shape==='formula',proto=spec.shape==='prototype';
  const w=truck?2.3:formula?1.4:2.05,h=truck?0.9:0.48,len=proto?4.9:4.5;
  const profile=new THREE.Shape();profile.moveTo(-len/2,0.42);profile.lineTo(-len/2,0.66);profile.lineTo(-0.55,0.95);profile.lineTo(1.45,0.96);profile.lineTo(len/2,0.82);profile.lineTo(len/2,0.42);profile.closePath();
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(profile,{depth:w-0.12,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:0.06,bevelThickness:0.06,curveSegments:12}),paint);body.rotation.y=-Math.PI/2;body.position.x=w/2-0.06;body.castShadow=true;body.receiveShadow=true;car.add(body);
  if(truck)box(car,w,h,len,0,0.85,0,paint);
  box(car,w*0.94,0.12,len*0.98,0,0.38,0,dark);
  // Sloped glass canopy with painted pillars and roof.
  const cabin=new THREE.Mesh(new RoundedBoxGeometry(formula?0.6:1.56,truck?0.9:0.6,truck?2.6:1.8,3,0.14),glass);cabin.position.set(0,truck?1.5:1.12,0.35);car.add(cabin);
  cabin.rotation.x=truck?0:-0.12;
  box(car,truck?1.7:1.42,0.08,truck?2.3:1.27,0,truck?2:1.47,0.5,paint);
  box(car,w*0.78,0.04,1.2,0,0.91,-1.32,paint);
  for(const side of [-1,1]){
    box(car,0.07,0.61,0.09,side*0.73,1.13,-0.43,paint).rotation.x=-0.3;
    box(car,0.07,0.57,0.1,side*0.74,1.14,1.2,paint).rotation.x=0.25;
    box(car,0.22,0.13,0.28,side*(w/2+0.09),1.12,-0.32,paint);
    box(car,0.67,0.12,0.06,side*0.62,0.79,-len/2-0.02,light);
    box(car,0.71,0.13,0.06,side*0.6,0.75,len/2+0.02,tail);
    box(car,0.05,0.16,1.04,side*(w/2+0.02),0.7,0.57,dark);
    box(car,0.27,0.035,0.08,side*(w/2+0.04),1.01,0.65,alloy);
    const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.2,12),alloy);exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*0.64,0.42,len/2+0.08);car.add(exhaust);
  }
  for(let i=0;i<6;i++)box(car,0.75,0.025,0.055,0,0.91,1.3+i*0.12,dark);
  const wheels=[];
  for(const side of [-1,1])for(const axle of [-1.43,1.43]){
    const pivot=new THREE.Group();pivot.position.set(side*(formula?1.06:w/2),truck?0.56:0.47,axle);
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(truck?0.54:0.43,truck?0.54:0.43,0.36,24),rubber);wheel.rotation.z=Math.PI/2;wheel.castShadow=true;pivot.add(wheel);
    for(const s of [-1,1]){
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.025,16),alloy);rim.rotation.z=Math.PI/2;rim.position.x=s*0.19;pivot.add(rim);
      for(let j=0;j<5;j++){const spoke=box(pivot,0.035,0.48,0.045,s*0.21,0,0,dark);spoke.rotation.x=j*Math.PI/5;}
    }
    car.add(pivot);wheels.push(pivot);
  }
  if(proto||formula||spec.shape==='wedge'){
    box(car,w+0.35,0.09,0.45,0,1.33,1.95,paint);for(const s of [-1,1])box(car,0.07,0.55,0.25,s*0.65,1.03,1.9,dark);
  }
  if(formula){box(car,2.4,0.12,0.5,0,0.45,-2.25,paint);box(car,0.5,0.3,1.4,0,0.91,-1.5,paint);}
  car.userData={wheels,paint};return car;
}
export function ribbonGeometry(path,width=path.width,offset=0,height=0) {
  const positions=[],uvs=[],indices=[];const right=new THREE.Vector3(),quat=new THREE.Quaternion();
  const count=Math.max(24,Math.ceil(path.length/1.5));
  for(let i=0;i<=count;i++){
    const p=samplePath(path,path.length*i/count);quat.setFromEuler(new THREE.Euler(p.pitch,-p.yaw,-p.roll,'YXZ'));right.set(1,0,0).applyQuaternion(quat);
    for(const s of [-1,1]){const side=offset+s*width/2;positions.push(p.x+right.x*side,p.y+right.y*side+height,p.z+right.z*side);uvs.push(s===-1?0:1,i/count*path.length/8);}
    if(i<count){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function buildRoad(world,materials) {
  const group=new THREE.Group();
  for(const path of world.paths){
    const mat=materials[path.surface],road=new THREE.Mesh(ribbonGeometry(path),mat);road.receiveShadow=true;road.castShadow=true;group.add(road);
    for(const side of [-1,1]){
      const curb=new THREE.Mesh(ribbonGeometry(path,0.55,side*(path.width/2+0.28),0.025),materials.curb);curb.receiveShadow=true;group.add(curb);
      const stripe=new THREE.Mesh(ribbonGeometry(path,0.12,side*(path.width/2-0.4),0.035),materials.white);group.add(stripe);
    }
    if(['tunnel','pipe','halfpipe'].includes(path.kind)){
      const a=path.points[0],b=path.points.at(-1),center=new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5);
      if(path.kind==='tunnel'){
        const frame=new THREE.Group();frame.position.copy(center);frame.rotation.y=-samplePath(path,0).yaw;
        box(frame,path.width+1,0.8,32,0,6,0,materials.concrete);for(const s of [-1,1])box(frame,0.65,6,32,s*(path.width/2+0.25),3,0,materials.concrete);group.add(frame);
      }else{
        const arch=new THREE.Mesh(new THREE.CylinderGeometry(7,7,32,32,1,true,0,path.kind==='halfpipe'?Math.PI:Math.PI*2),materials.concrete);arch.rotation.x=Math.PI/2;arch.rotation.z=samplePath(path,0).yaw;arch.position.copy(center);arch.position.y+=5.8;group.add(arch);
      }
    }
    if(['bridge','overpass','loop','ramp','corkup'].includes(path.kind))for(let i=0;i<path.points.length;i+=6){const p=path.points[i];if(p.y>4)box(group,0.7,p.y,0.7,p.x,p.y/2-0.05,p.z,materials.steel);}
    if(path.kind==='slalom')for(let i=4;i<24;i+=6){const p=path.points[i];box(group,1.2,1.7,1.2,p.x+(i%12===4?-2.3:2.3),p.y+0.85,p.z,materials.curb);}
    if(path.kind==='start'){
      const pose=samplePath(path,path.length/2),gate=new THREE.Group();gate.position.set(pose.x,pose.y,pose.z);gate.rotation.y=-pose.yaw;
      for(const s of [-1,1])box(gate,0.6,8,0.7,s*7,4,0,materials.steel);
      box(gate,14.6,1.3,0.7,0,7.7,0,materials.black);box(gate,6,0.12,0.8,0,6.98,0,materials.orange);
      const checker=new THREE.Mesh(new THREE.PlaneGeometry(path.width,2.6),materials.checker);checker.rotation.x=-Math.PI/2;checker.position.y=0.045;gate.add(checker);group.add(gate);
    }
  }
  return group;
}
export function buildTerrain(world,materials) {
  const group=new THREE.Group(),g=new THREE.PlaneGeometry(960,960,120,120);g.rotateX(-Math.PI/2);g.translate(480,-0.12,480);
  const pos=g.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,terrainHeight(world.track,pos.getX(i),pos.getZ(i))-0.1);g.computeVertexNormals();
  const ground=new THREE.Mesh(g,materials.ground);ground.receiveShadow=true;group.add(ground);
  const pines=world.trees.map(t=>[t.x,t.crownY,t.z,t.scale]),trunks=world.trees.map(t=>[t.x,t.trunkY,t.z,t.scale]),buildings=[];
  world.track.tiles.forEach((code,index)=>{if(describe(code).kind==='building'){const x=index%30*32+16,z=Math.floor(index/30)*32+16;buildings.push([x,terrainHeight(world.track,x,z)+5,z]);}});
  // Render the same positions and scales that the simulation uses for collisions.
  const inst=(geometry,mat,items)=>{const mesh=new THREE.InstancedMesh(geometry,mat,items.length),dummy=new THREE.Object3D();items.forEach((item,i)=>{const [x,y,z,scale=0.8+noise(i)*0.5]=item;dummy.position.set(x,y,z);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);};
  inst(new THREE.ConeGeometry(3.8,6,12),materials.forest,pines.map(([x,y,z,s])=>[x,y-1.5,z,s]));inst(new THREE.ConeGeometry(3,6,12),materials.forest,pines.map(([x,y,z,s])=>[x,y+1,z,s]));inst(new THREE.ConeGeometry(2,5,12),materials.forest,pines.map(([x,y,z,s])=>[x,y+3.3,z,s]));inst(new THREE.CylinderGeometry(0.45,0.6,3,7),materials.trunk,trunks);inst(new THREE.BoxGeometry(14,10,13),materials.concrete,buildings);
  for(let i=0;i<900;i++)if(world.track.terrain[i]===1){const water=new THREE.Mesh(new THREE.PlaneGeometry(32.1,32.1),materials.water);water.rotation.x=-Math.PI/2;water.position.set(i%30*32+16,0.02,Math.floor(i/30)*32+16);group.add(water);}
  for(let i=0;i<42;i++){
    const a=i/42*Math.PI*2,r=1000+noise(i)*700,height=100+noise(i+50)*430;
    const geo=new THREE.ConeGeometry(160+noise(i+6)*180,height,36,8),vertices=geo.attributes.position;
    for(let j=0;j<vertices.count;j++){const x=vertices.getX(j),z=vertices.getZ(j),f=1+Math.sin(x*.035+z*.017)*.12;vertices.setX(j,x*f);vertices.setZ(j,z*f);}geo.computeVertexNormals();
    const mountain=new THREE.Mesh(geo,materials.mountain);mountain.position.set(480+Math.sin(a)*r,height/2-30,480+Math.cos(a)*r);mountain.rotation.y=noise(i+9)*6;group.add(mountain);
  }
  return group;
}
export function disposeGroup(group){group.traverse(o=>{if(o.geometry)o.geometry.dispose();});group.removeFromParent();}
export function makeMaterials(document) {
  const pattern=(type)=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=type==='asphalt'?'#343c40':'#eee9db';ctx.fillRect(0,0,128,128);if(type==='asphalt'){for(let i=0;i<6000;i++){const v=38+noise(i)*55;ctx.fillStyle=`rgb(${v},${v+5},${v+7})`;ctx.fillRect(noise(i*2)*128,noise(i*2+1)*128,1,1);}}else{for(let y=0;y<8;y++)for(let x=0;x<8;x++){ctx.fillStyle=type==='checker'?((x+y)%2?'#172125':'#f3eddf'):(y%2?'#ef603f':'#eee9db');ctx.fillRect(x*16,y*16,16,16);}}const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;};
  const asphalt=pattern('asphalt'),curb=pattern('curb');
  return {tarmac:new THREE.MeshStandardMaterial({map:asphalt,roughness:0.91,side:THREE.DoubleSide}),dirt:material('#a68a62',1),ice:material('#a4cdd1',0.12,0.32),curb:new THREE.MeshStandardMaterial({map:curb,roughness:0.75,side:THREE.DoubleSide}),white:material('#e4dfc9',0.8),ground:material('#7c8866',1),forest:material('#344b3e',1),trunk:material('#695544',1),concrete:new THREE.MeshStandardMaterial({color:'#aaa99d',roughness:0.8,side:THREE.DoubleSide}),steel:material('#86928b',0.5,0.65),mountain:material('#747e78',0.99),water:material('#497f89',0.12,0.45),checker:new THREE.MeshStandardMaterial({map:pattern('checker'),roughness:0.7}),orange:material('#f46a40',0.4),black:material('#18242a',0.7)};
}
export function createScene(canvas,Renderer=THREE.WebGLRenderer,PMREM=THREE.PMREMGenerator) {
  const renderer=new Renderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#cad5d0');scene.fog=new THREE.FogExp2('#c6d0c8',0.00075);
  const camera=new THREE.PerspectiveCamera(52,1,0.12,6000);let renderTime=performance.now();
  const hemi=new THREE.HemisphereLight('#c9e2ff','#797352',2.1);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffebc6',3.8);sun.position.set(180,260,-120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.1;scene.add(sun);scene.add(sun.target);
  const sky=new Sky();sky.scale.setScalar(5000);sky.material.uniforms.turbidity.value=3;sky.material.uniforms.rayleigh.value=1.2;sky.material.uniforms.sunPosition.value.copy(sun.position);scene.add(sky);
  const pmrem=new PMREM(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,0.04).texture;room.dispose();pmrem.dispose();
  const materials=makeMaterials(canvas.ownerDocument);let worldGroup=null,car=null,rival=null,ghost=null,world=null;
  const target=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3();let lastMode='';
  function load(next,carIndex=0){
    world=next;if(worldGroup)disposeGroup(worldGroup);if(car)disposeGroup(car);if(rival)disposeGroup(rival);if(ghost)disposeGroup(ghost);
    materials.ground.color.set(world.track.horizon===0?'#b5a17b':'#7c8866');
    worldGroup=new THREE.Group();worldGroup.add(buildTerrain(world,materials),buildRoad(world,materials));scene.add(worldGroup);
    car=buildCar(CARS[carIndex]);scene.add(car);rival=buildCar({...CARS[carIndex],color:'#dce2d8'});scene.add(rival);ghost=buildCar({...CARS[carIndex],color:'#81d2d8'},true);scene.add(ghost);lastMode='';
  }
  function pose(mesh,p){mesh.visible=!!p;if(!p)return;mesh.position.set(p.x,p.y+0.07,p.z);mesh.rotation.set(p.pitch,-p.yaw,-p.roll,'YXZ');for(const wheel of mesh.userData.wheels)wheel.rotation.x=-(p.time||0)*(p.speed||0)*2.2;}
  function render(state) {
    const now=performance.now(),dt=Math.min((now-renderTime)/1000,0.05),w=canvas.clientWidth,h=canvas.clientHeight;renderTime=now;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    pose(car,state.car);pose(rival,state.rival);pose(ghost,state.ghost);
    const p=state.car||{x:304,y:0,z:640,yaw:0,pitch:0,roll:0,speed:0};
    if(state.mode==='menu'){
      const t=performance.now()/1000;desired.set(p.x+14+Math.sin(t*0.04),p.y+5,p.z-17);look.set(p.x+7,p.y+0.8,p.z+4);
    }else if(state.camera===3){desired.set(p.x+45,p.y+65,p.z+45);look.set(p.x,p.y,p.z);}
    else if(state.camera===2){desired.set(p.x+Math.cos(p.yaw)*18,p.y+5,p.z+Math.sin(p.yaw)*18);look.set(p.x,p.y+0.8,p.z);}
    else{
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch,-p.yaw,-p.roll,'YXZ'));
      const cockpit=state.camera===1;desired.set(0,cockpit?1.4:4,cockpit?-0.1:10+Math.abs(p.speed)*0.06).applyQuaternion(q).add(new THREE.Vector3(p.x,p.y,p.z));
      look.set(0,cockpit?1.3:1,-(cockpit?18:10)).applyQuaternion(q).add(new THREE.Vector3(p.x,p.y,p.z));
      car.visible=!cockpit;
    }
    if(lastMode!==state.mode){camera.position.copy(desired);target.copy(look);lastMode=state.mode;}
    camera.position.lerp(desired,1-Math.exp(-dt*7));target.lerp(look,1-Math.exp(-dt*12));camera.lookAt(target);
    const fov=52+Math.min(Math.abs(p.speed)*0.12,12);if(Math.abs(camera.fov-fov)>0.1){camera.fov=fov;camera.updateProjectionMatrix();}
    sun.position.set(p.x+180,p.y+260,p.z-120);sun.target.position.set(p.x,p.y,p.z);renderer.render(scene,camera);
  }
  function quality(level){renderer.setPixelRatio(level==='low'?1:Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=level!=='low';}
  return {load,render,quality,renderer,scene,camera};
}
