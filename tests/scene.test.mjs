import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CARS,compileTrack,blankTrack,makeDemo} from '../src/core.mjs';
import {buildCar,ribbonGeometry,buildRoad,buildTerrain,disposeGroup,makeMaterials,createScene} from '../src/scene.mjs';
const document={createElement:()=>({width:0,height:0,getContext:()=>({fillStyle:'',fillRect(){}})})};
test('eleven procedural cars have four wheels, finite transforms and reflective paint',()=>{
  for(const c of CARS){const car=buildCar(c);assert.equal(car.userData.wheels.length,4);assert.ok(car.userData.paint.metalness>0.5);assert.ok(car.children.length>20);car.traverse(o=>assert.ok(Number.isFinite(o.position.y)));}
  assert.equal(buildCar(undefined,true).userData.paint.opacity,0.36);
});
test('render controller handles world replacement, all cameras, resizing and quality',()=>{
  globalThis.devicePixelRatio=2;
  const canvas={width:0,height:0,clientWidth:1000,clientHeight:700,ownerDocument:document,addEventListener(){},removeEventListener(){},getContext:()=>null,style:{}};
  class Renderer{constructor(){this.shadowMap={};this.ratio=1;this.calls=0;}setPixelRatio(r){this.ratio=r;}getPixelRatio(){return this.ratio;}setSize(w,h){canvas.width=Math.floor(w*this.ratio);canvas.height=Math.floor(h*this.ratio);}render(){this.calls++;}}
  class Environment{fromScene(){return {texture:new THREE.Texture()};}dispose(){}}
  const error=console.error;console.error=()=>{};try{assert.throws(()=>createScene(canvas));assert.throws(()=>createScene(canvas,Renderer));}finally{console.error=error;}
  const scene=createScene(canvas,Renderer,Environment),w=compileTrack(makeDemo());scene.load(w);scene.quality('low');assert.equal(scene.renderer.shadowMap.enabled,false);scene.quality('high');assert.equal(scene.renderer.shadowMap.enabled,true);
  const car={...w.start.points[0],yaw:0,pitch:0,roll:0,speed:0,time:0};
  for(const mode of ['menu','drive','drive'])for(const camera of [0,1,2,3]){scene.render({mode,camera,car,rival:car,ghost:car});scene.render({mode,camera,car:{...car,time:2,speed:50},rival:null,ghost:null});}
  scene.render({mode:'menu',camera:0,car:null,rival:null,ghost:null});canvas.clientHeight=701;scene.render({mode:'drive',camera:0,car});assert.ok(Number.isFinite(scene.camera.position.x));assert.ok(scene.renderer.calls>20);
  scene.load(compileTrack(makeDemo(1)),1);scene.render({mode:'drive',camera:1,car});
});
test('road ribbons include normals and correct finite indexed surfaces',()=>{
  const w=compileTrack(makeDemo());
  for(const p of w.paths){const g=ribbonGeometry(p);assert.ok(g.index.count>0);assert.equal(g.attributes.position.count,g.attributes.normal.count);for(const n of g.attributes.position.array)assert.ok(Number.isFinite(n));}
  const materials=makeMaterials(document),road=buildRoad(w,materials);assert.ok(road.children.length>w.paths.length*4);
});
test('every rendered trunk matches its physical collider position, scale and height',()=>{
  const track=makeDemo();track.tiles[0]=153;const world=compileTrack(track),group=buildTerrain(world,makeMaterials(document));
  const trunks=group.children.find(mesh=>mesh.isInstancedMesh&&mesh.geometry.type==='CylinderGeometry');assert.equal(trunks.count,world.trees.length);
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
  for(let i=0;i<trunks.count;i++){trunks.getMatrixAt(i,matrix);matrix.decompose(position,quaternion,scale);const tree=world.trees[i];assert.ok(Math.abs(position.x-tree.x)<.0001&&Math.abs(position.z-tree.z)<.0001);assert.ok(Math.abs(scale.x-tree.scale)<.0001);assert.ok(Math.abs(position.y+1.5*scale.y-tree.y-tree.height)<.0001);assert.ok(Math.abs(.6*scale.x-tree.radius)<.0001);}
});
test('every supported track code renders safely, including large stunt geometry',()=>{
  const t=blankTrack();t.tiles[899]=1;for(let i=0;i<256;i++)t.tiles[i]=i;
  const w=compileTrack(t),materials=makeMaterials(document);assert.ok(buildRoad(w,materials).children.length>100);assert.ok(buildTerrain(w,materials).children.length>40);
  const group=buildTerrain(compileTrack(makeDemo()),materials),root=new THREE.Group();root.add(group);let count=0;group.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>count++);});disposeGroup(group);assert.equal(root.children.length,0);assert.ok(count>0);
});
