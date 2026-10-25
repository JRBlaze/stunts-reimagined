import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/core.mjs';

test('all eleven cars and six opponents are available', () => {
  assert.equal(game.CARS.length, 11);
  assert.equal(game.RIVALS.length, 6);
});

const flat = () => {const t=game.blankTrack('Test');game.paint(t,15,20,1);for(let z=1;z<20;z++)game.paint(t,15,z,4);return game.compileTrack(t);};
const neutral={throttle:0,brake:0,steer:0,handbrake:false};

test('full-lock steering follows a tight 16-metre paved corner at 72 km/h',()=>{
  const t=game.blankTrack('Tight corner');t.tiles[16*30+15]=1;t.tiles[15*30+15]=4;t.tiles[14*30+15]=6;t.tiles[14*30+16]=5;
  const w=game.compileTrack(t),c=game.createCar(w),corner=w.paths.find(p=>p.kind==='corner');
  Object.assign(c,game.samplePath(corner,0),{speed:20,vx:0,vz:-20});
  for(let i=0;i<240&&c.yaw<Math.PI/2;i++)game.stepCar(c,{...neutral,steer:1},w);
  assert.ok(c.yaw>=Math.PI/2,'Must complete the right-angle turn within two seconds');
  assert.ok(Math.abs(c.x-512)<4&&Math.abs(c.z-464)<4,'Must follow the actual corner footprint');
  assert.equal(c.penalty,0);assert.equal(c.crashed,false);
});
test('steering stays proportional, works in reverse, and retains slippery surfaces',()=>{
  const measure=(steer,speed=20,code=4,handbrake=false)=>{const t=flat().track;t.tiles[19*30+15]=code;const w=game.compileTrack(t),c=game.createCar(w);Object.assign(c,game.samplePath(w.paths.find(p=>p.index===19*30+15),16),{speed});game.stepCar(c,{...neutral,steer,handbrake},w);return c.yaw;};
  const full=measure(1);assert.ok(full>0.01);assert.ok(Math.abs(measure(.5)/full-.5)<.001);assert.ok(Math.abs(measure(-1)+full)<.001);
  assert.equal(measure(1,0),0);assert.ok(measure(1,-10)<0);assert.ok(measure(1,20,14)<full);assert.ok(measure(1,20,24)<measure(1,20,14));assert.ok(measure(1,20,4,true)>full);
});
test('reverse reaches useful speed quickly, caps at 65 km/h, and forward throttle stops backing up',()=>{
  const t=game.blankTrack('Reversing strip');for(let z=2;z<28;z++)t.tiles[z*30+15]=4;t.tiles[10*30+15]=1;const w=game.compileTrack(t);
  for(let carIndex=0;carIndex<game.CARS.length;carIndex++){
    const c=game.createCar(w,carIndex);for(let i=0;i<120;i++)game.stepCar(c,{...neutral,brake:1},w);
    assert.ok(c.speed<=-9,`${game.CARS[carIndex].name} should reverse promptly`);
    for(let i=0;i<240;i++)game.stepCar(c,{...neutral,brake:1},w);
    assert.ok(c.speed<=-17.5&&c.speed>=-18);assert.ok(c.z>350);assert.equal(c.crashed,false);
    for(let i=0;i<360;i++)game.stepCar(c,{...neutral,throttle:1},w);assert.ok(c.speed>0);
  }
});
test('planted tree collision stops the car without ending the run, then permits backing away',()=>{
  const t=flat().track;t.tiles[19*30+15]=153;const w=game.compileTrack(t),c=game.createCar(w);
  const tree=w.trees.find(tree=>tree.x===496&&tree.z===624);assert.ok(tree);
  c.speed=35;c.vz=-35;
  for(let i=0;i<360&&c.speed!==0;i++)game.stepCar(c,{...neutral,throttle:1},w);
  assert.equal(c.speed,0);assert.equal(c.vx,0);assert.equal(c.vz,0);assert.equal(c.crashed,false);assert.equal(c.finished,false);assert.equal(c.damage,0);
  const contact=c.z,elapsed=c.time;assert.ok(contact>=tree.z+tree.radius+2.4-.01);
  for(let i=0;i<120;i++)game.stepCar(c,{...neutral,throttle:1},w);
  assert.ok(Math.abs(c.z-contact)<.01);assert.ok(c.time>elapsed);assert.equal(c.crashed,false);
  for(let i=0;i<120;i++)game.stepCar(c,{...neutral,brake:1},w);
  assert.ok(c.speed<-9);assert.ok(c.z>contact+3);assert.equal(c.crashed,false);
});
test('generated forest trees are solid too and their layout is deterministic',()=>{
  const w=flat();assert.deepEqual(w.trees,game.compileTrack(w.track).trees);assert.ok(w.trees.length>100);
  const tree=w.trees[0],c=game.createCar(w);Object.assign(c,{x:tree.x,y:tree.y,z:tree.z+5,speed:100,vx:0,vz:-100});
  game.stepCar(c,{...neutral,throttle:1},w,.05);assert.equal(c.speed,0);assert.equal(c.crashed,false);assert.ok(c.z>tree.z);
});
test('swept trunk collisions prevent tunnelling and allow misses, jumps and reverse escapes',()=>{
  const tree={x:0,y:0,z:0,radius:.6,height:3},p=(x,y=0,z=0)=>({x,y,z});
  const hit=game.treeCollision([tree],p(-10),p(10));assert.ok(hit&&Math.abs(hit.time-.35)<.001);
  assert.equal(game.treeCollision([tree],p(-10,0,4),p(10,0,4)),null);
  assert.equal(game.treeCollision([tree],p(-10,8),p(10,8)),null);
  assert.equal(game.treeCollision([tree],p(-10,-5),p(10,-5)),null);
  assert.equal(game.treeCollision([tree],p(8),p(9)),null);
  assert.equal(game.treeCollision([tree],p(-9),p(-8)),null);
  assert.equal(game.treeCollision([tree],p(8),p(8)),null);
  assert.equal(game.treeCollision([tree],p(0),p(0)).time,0);
  assert.equal(game.treeCollision([tree],p(1),p(5)),null);
  assert.equal(game.treeCollision([tree],p(0),p(-5)),null);
  assert.equal(game.treeCollision([tree],p(1),p(-5)).time,0);
  assert.ok(game.treeCollision([tree],p(0,8),p(0,0)).time>0);
  assert.ok(game.treeCollision([tree],p(0,-8),p(0,0)).time>0);
  assert.equal(game.treeCollision([tree],p(-10,8),p(10,7)),null);
  assert.equal(game.treeCollision([tree],p(3.01),p(8)),null);
  assert.equal(game.treeCollision([tree,{...tree,x:-5}],p(-20),p(20)).tree.x,-5);
  assert.equal(game.treeCollision([{...tree,x:-5},tree],p(-20),p(20)).tree.x,-5);
});
test('DOS tracks round-trip every tile, opposite row order, horizon and terrain',()=>{
  const t=game.makeDemo();t.terrain[0]=18;t.tiles[899]=178;
  const bytes=game.writeTrack(t);assert.equal(bytes.length,1802);assert.equal(bytes[29*30+9],t.tiles[9]);
  assert.deepEqual(game.readTrack(bytes,t.name),t);
  assert.throws(()=>game.readTrack(new Uint8Array(100)),/1,802/);
  bytes[901]=19;assert.throws(()=>game.readTrack(bytes),/terrain/);
  assert.equal(game.readTrack(game.writeTrack(game.blankTrack())).name,'Imported track');
});
test('track validation rejects corrupt and malicious data',()=>{
  for(const t of [null,{}, {name:1}, {...game.blankTrack(),tiles:[]},{...game.blankTrack(),terrain:[]}])assert.throws(()=>game.validateTrack(t));
  for(const change of [{tiles:Array(900).fill(-1)},{tiles:Array(900).fill(256)},{tiles:Array(900).fill(1.2)},{terrain:Array(900).fill(19)},{terrain:Array(900).fill(-1)},{terrain:Array(900).fill(0.5)},{horizon:-1},{horizon:5},{horizon:0.5}])assert.throws(()=>game.validateTrack({...game.blankTrack(),...change}));
  assert.equal(game.validateTrack(game.blankTrack()).tiles.length,900);
});
test('editor bounds, codes, terrain brush, and rotations',()=>{
  const t=game.blankTrack();
  for(const [x,z] of [[-1,0],[0,-1],[30,0],[0,30],[1.5,0],[0,1.5]])assert.equal(game.paint(t,x,z,4),false);
  for(const code of [-1,256,0.4])assert.equal(game.paint(t,0,0,code),false);
  assert.equal(game.paint(t,0,0,19,true),false);assert.equal(game.paint(t,0,0,6,true),true);
  assert.equal(game.paint(t,0,0,4),true);assert.equal(t.tiles[0],4);assert.equal(t.terrain[0],6);
  assert.equal(game.rotateCode(4),5);assert.equal(game.rotateCode(5),4);
  assert.equal(game.rotateCode(9),6);assert.equal(game.rotateCode(60),61);assert.equal(game.rotateCode(63),60);assert.equal(game.rotateCode(0),0);
});
test('all DOS codes decode and every supported road compiles to finite geometry',()=>{
  for(let code=0;code<=255;code++){
    const t=game.blankTrack();t.tiles[465]=code;const d=game.describe(code),w=game.compileTrack(t);
    assert.ok(d.kind);for(const path of w.paths){assert.ok(path.length>0);for(const p of path.points)for(const key of ['x','y','z','bank'])assert.ok(Number.isFinite(p[key]),`${code}:${key}`);assert.ok(Number.isFinite(game.samplePath(path,path.length/2).yaw));}
  }
  assert.equal(game.describe(125).surface,'dirt');assert.equal(game.describe(138).surface,'ice');
  assert.equal(game.describe(126).surface,'dirt');assert.equal(game.describe(139).surface,'ice');
  assert.equal(game.describe(151).kind,'tree');assert.equal(game.describe(154).kind,'building');
});
test('terrain heights, out of bounds, and all horizons',()=>{
  const t=game.blankTrack();assert.equal(game.terrainHeight(t,-1,0),-4);assert.equal(game.terrainHeight(t,0,-1),-4);assert.equal(game.terrainHeight(t,960,0),-4);assert.equal(game.terrainHeight(t,0,960),-4);
  for(let c=0;c<=18;c++){t.terrain[0]=c;const height=game.terrainHeight(t,8,24);assert.ok(Number.isFinite(height));if(c===6)assert.equal(height,12);}
  for(let i=0;i<3;i++){const w=game.compileTrack(game.makeDemo(i));assert.ok(w.start);assert.ok(w.paths.length>30);assert.equal(w.warnings.length,0);}
  const bad=game.blankTrack();bad.tiles[0]=200;assert.equal(game.compileTrack(bad).warnings.length,2);assert.throws(()=>game.createCar(game.compileTrack(game.blankTrack())));
});
test('road sampling clamps, projects and detects distant roads',()=>{
  const w=flat(),p=w.start;
  assert.deepEqual(game.samplePath(p,-100),game.samplePath(p,0));assert.deepEqual(game.samplePath(p,999),game.samplePath(p,p.length));
  const a=game.samplePath(p,16),n=game.nearestRoad(w,a.x,a.y,a.z);assert.equal(n.distance,0);assert.equal(n.path,p);
  assert.equal(game.nearestRoad(w,-1000,0,-1000),null);
  const old=w.paths[0].points[1];w.paths[0].points[1]={...w.paths[0].points[0]};assert.ok(game.nearestRoad(w,496,0.15,32));w.paths[0].points[1]=old;
});
test('keyboard and analog gamepad controls include deadzone, triggers and action buttons',()=>{
  const input=game.controls(new Set(['KeyW','KeyS','KeyA','KeyD','Space']));assert.equal(input.throttle,1);assert.equal(input.brake,1);assert.equal(input.steer,0);assert.equal(input.handbrake,true);
  assert.equal(game.controls(new Set(['ArrowUp','ArrowDown','ArrowLeft'])).steer,-1);assert.equal(game.controls(new Set(['ArrowRight'])).steer,1);
  const pad={axes:[0.57],buttons:Array.from({length:10},()=>({value:1}))};const c=game.controls(new Set(),pad);assert.ok(Math.abs(c.steer-0.5)<1e-10);for(const key of ['pause','reset','camera','up','down','handbrake'])assert.equal(c[key],true);
  pad.axes[0]=-0.57;assert.ok(game.controls(new Set(),pad).steer<0);pad.axes[0]=0.1;assert.equal(game.controls(new Set(),pad).steer,0);assert.equal(game.controls(new Set(),{axes:[],buttons:[]}).throttle,0);
});
test('driving accelerates, brakes, steers, reverses, shifts and freezes after crash/finish',()=>{
  const w=flat(),c=game.createCar(w);for(let i=0;i<300;i++)game.stepCar(c,{...neutral,throttle:1},w);assert.ok(c.speed>15);assert.ok(c.z<650);
  const speed=c.speed;for(let i=0;i<60;i++)game.stepCar(c,{...neutral,brake:1},w);assert.ok(c.speed<speed);
  c.speed=20;game.stepCar(c,{...neutral,steer:1,handbrake:true},w);assert.ok(c.yaw>0);
  c.auto=false;c.gear=1;c.speed=50;game.stepCar(c,{...neutral,throttle:1},w);assert.ok(c.speed<50);
  game.shift(c,20);assert.equal(c.gear,6);game.shift(c,-20);assert.equal(c.gear,1);
  c.crashed=true;const state=JSON.stringify(c);game.stepCar(c,neutral,w);assert.equal(JSON.stringify(c),state);c.crashed=false;c.finished=true;const state2=JSON.stringify(c);game.stepCar(c,neutral,w);assert.equal(JSON.stringify(c),state2);
  const reverse=game.createCar(w);for(let i=0;i<120;i++)game.stepCar(reverse,{...neutral,brake:1},w);assert.ok(reverse.speed<0);
  const stopped=game.createCar(w);game.stepCar(stopped,neutral,w,0);assert.equal(stopped.speed,0);
});
test('road surfaces change traction and offroad incurs a time penalty',()=>{
  for(const code of [4,14,24]){const t=flat().track;t.tiles[19*30+15]=code;const w=game.compileTrack(t),c=game.createCar(w);Object.assign(c,game.samplePath(w.paths.find(p=>p.index===19*30+15),16));c.speed=20;game.stepCar(c,{...neutral,throttle:1,steer:1},w);assert.ok(Number.isFinite(c.x));}
  const w=flat(),c=game.createCar(w);c.x+=20;c.speed=20;game.stepCar(c,{...neutral,throttle:1},w);assert.ok(c.penalty>0);assert.ok(c.offroad>0);
});
test('water, building, world edge and hard landings crash; air time is recorded',()=>{
  for(const kind of ['water','building','left','right','top','bottom','fall']){
    const w=flat(),c=game.createCar(w);
    if(kind==='water')w.track.terrain[20*30+15]=1;
    if(kind==='building')w.track.tiles[20*30+15]=163;
    if(kind==='left')c.x=-5;if(kind==='right')c.x=961;if(kind==='top')c.z=-5;if(kind==='bottom')c.z=961;
    if(kind==='fall'){c.airborne=true;c.vy=-40;c.y=0.5;}
    game.stepCar(c,neutral,w);assert.equal(c.crashed,true,kind);
  }
  const w=flat(),c=game.createCar(w);c.y=20;game.stepCar(c,neutral,w);assert.equal(c.airborne,true);assert.ok(c.airtime>0);
  c.y=0.16;c.vy=-1;game.stepCar(c,neutral,w);assert.equal(c.airborne,false);assert.ok(c.bestAir>0);
});
test('stunt attachment, forward/backward exits, gravity and failure',()=>{
  for(const code of [64,65,85,86,117])for(const reverse of [false,true]){
    const t=game.blankTrack();t.tiles[20*30+15]=1;t.tiles[15*30+15]=code;const w=game.compileTrack(t),path=w.paths.find(p=>p.index===15*30+15),c=game.createCar(w);
    const p=game.samplePath(path,reverse?path.length-1:1);Object.assign(c,p);c.yaw+=reverse?Math.PI:0;c.speed=40;
    game.stepCar(c,neutral,w);assert.ok(c.attachment,`${code} ${reverse}`);
    c.attachment.distance=reverse?0.01:path.length-0.01;game.stepCar(c,neutral,w);assert.equal(c.attachment,null);
    Object.assign(c,p);c.crashed=false;c.speed=20;c.attachment={index:w.paths.indexOf(path),distance:1,direction:1,lateral:9};game.stepCar(c,neutral,w);assert.equal(c.crashed,true);
    c.crashed=false;c.speed=1;c.attachment={index:w.paths.indexOf(path),distance:1,direction:1,lateral:0};game.stepCar(c,neutral,w);assert.equal(c.crashed,true);
  }
});
test('lap completion requires distance, departure and visited circuit',()=>{
  const w=flat(),c=game.createCar(w);const next=game.samplePath(w.paths[0],16);Object.assign(c,next);game.stepCar(c,neutral,w);assert.equal(c.departed,true);
  const p=game.samplePath(w.start,16);Object.assign(c,p);c.distance=250;game.stepCar(c,neutral,w);assert.equal(c.finished,false);
  c.lastTile=-1;c.visited=w.paths.map(p=>p.index);game.stepCar(c,neutral,w);assert.equal(c.finished,true);
});
test('continuous acceleration drives through the demo loop and exits upright without a spurious launch',()=>{
  const w=game.compileTrack(game.makeDemo()),c=game.createCar(w);let attached=false,exited=false;
  for(let i=0;i<1200;i++){
    game.stepCar(c,{...neutral,throttle:1},w);if(c.attachment)attached=true;
    if(attached&&!c.attachment){exited=true;assert.ok(Math.abs(c.pitch)<.1);assert.ok(Math.abs(c.roll)<.1);assert.ok(c.y<1);}
  }
  assert.equal(attached,true);assert.equal(exited,true);assert.equal(c.crashed,false);assert.ok(c.y<1);
});
test('AI route joins connected tile endpoints, reverses and wraps',()=>{
  const w=game.compileTrack(game.makeDemo()),route=game.buildRoute(w);assert.ok(route.length>45);assert.equal(game.buildRoute(game.compileTrack(game.blankTrack())).length,0);
  assert.equal(game.rivalPose([],0),null);
  for(const time of [0,1,5,10000])assert.ok(Number.isFinite(game.rivalPose(route,time).x));
  assert.ok(Number.isFinite(game.rivalPose([{path:w.start,reverse:true}],0,5).yaw));
});
test('replays interpolate positions and wrap heading without a full spin',()=>{
  const c=game.createCar(flat()),a=game.recordFrame(c),b={...a,x:a.x+10,yaw:-Math.PI+0.1,time:1};a.yaw=Math.PI-0.1;
  assert.equal(game.replayPose([],0),null);assert.deepEqual(game.replayPose([a,b],-1),a);assert.deepEqual(game.replayPose([a,b],2),b);
  const p=game.replayPose([a,b],0.5);assert.equal(p.x,a.x+5);assert.ok(Math.abs(p.yaw-Math.PI)<0.001);
  const frames=Array.from({length:20},(_,i)=>({...a,time:i}));assert.equal(game.replayPose(frames,8.5).time,8.5);
  const replay={version:1,track:game.makeDemo(),carIndex:0,frames:[a,b]};assert.deepEqual(game.parseReplay(JSON.stringify(replay)),replay);
  for(const change of [{version:2},{carIndex:11},{carIndex:-1},{carIndex:0.5},{frames:[]},{frames:{}},{frames:Array(144001).fill(a)},{frames:[{...a,x:null}]},{frames:[b,a]}])assert.throws(()=>game.parseReplay(JSON.stringify({...replay,...change})));
  assert.throws(()=>game.parseReplay('invalid'));
});
test('storage survives quota/corruption; best times and stable track identity',()=>{
  const map=new Map(),storage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)??null};assert.equal(game.saveJSON(storage,'x',{a:1}),true);assert.deepEqual(game.loadJSON(storage,'x',{}),{a:1});assert.equal(game.loadJSON(storage,'none',5),5);map.set('bad','{');assert.equal(game.loadJSON(storage,'bad',5),5);
  const fail={setItem(){throw Error('quota');},getItem(){throw Error('blocked');}};assert.equal(game.saveJSON(fail,'x',1),false);assert.equal(game.loadJSON(fail,'x',5),5);
  assert.deepEqual(game.bestTime({},'a',5),{a:5});assert.deepEqual(game.bestTime({a:5},'a',10),{a:5});assert.deepEqual(game.bestTime({},'a',NaN),{});assert.deepEqual(game.bestTime({},'a',0),{});
  assert.equal(game.trackKey(game.makeDemo(),0),game.trackKey(game.makeDemo(),0));assert.notEqual(game.trackKey(game.makeDemo(),0),game.trackKey(game.makeDemo(),1));
  assert.equal(game.formatTime(65.125),'01:05.13');assert.equal(game.formatTime(-5),'00:00.00');assert.equal(game.formatTime(Infinity),'—');assert.equal(game.angle(2*Math.PI),-2.4492935982947064e-16);
});
