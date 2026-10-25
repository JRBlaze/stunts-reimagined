// All distances are metres, speed is metres/second, and simulation steps are seconds.
export const SIZE = 30, TILE = 32, WIDTH = 11, STEP = 1 / 120;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
export const sceneryNoise = n => {const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const CARS = [
  ['coun','Countach','ITALIAN EXOTIC',295,9.8,0.93,'#ff683a','wedge'],
  ['ansx','NSX','PRECISION SPORT',270,9.4,1.1,'#efcf6d','sport'],
  ['audi','Quattro Sport','RALLY LEGEND',245,9.2,1.08,'#e8e6d9','rally'],
  ['fgto','GTO','TWIN-TURBO CLASSIC',310,10.2,0.98,'#c3382d','sport'],
  ['jagu','XJR-9','ENDURANCE PROTOTYPE',350,13.3,1.3,'#7f65b4','prototype'],
  ['lanc','Delta Integrale','ALL-WHEEL RALLY',225,8.5,1.15,'#e4eee4','rally'],
  ['lm02','LM002','OFF-ROAD HEAVYWEIGHT',210,6.9,0.82,'#d4b882','truck'],
  ['p962','962 C','GROUP C RACER',360,14.1,1.32,'#e7e8df','prototype'],
  ['pc04','Carrera 4','REAR-ENGINE SPORT',275,9.7,1.05,'#6b9da8','sport'],
  ['pmin','March Indy','OPEN-WHEEL FORMULA',365,15.2,1.38,'#d78334','formula'],
  ['vett','Corvette ZR-1','AMERICAN MUSCLE',285,10.3,0.96,'#3169a3','wedge'],
].map(([id,name,tag,top,accel,grip,color,shape])=>({id,name,tag,top:top/3.6,accel,grip,color,shape}));
export const RIVALS = ['Bernie Rubber','Otto Partz','Joe Stallin','Cherry Chassis','Helen Wheels','Skid Vicious'];
export const PALETTE = [
  ['Road',4],['Corner',6],['Wide corner',10],['Start / finish',1],['Loop',64],
  ['Corkscrew',85],['Jump ramp',56],['Elevated ramp',36],['Bridge',34],
  ['Tunnel',66],['Pipe',68],['Slalom',115],['Chicane',60],['Banked corner',52],
  ['Banked road',48],['Dirt road',14],['Dirt corner',16],['Ice road',24],['Ice corner',26],
  ['Highway',109],['Half pipe',83],['Cork up/down',117],['Elevated corner',105],['Bank entrance',40],['Tree',153],['Building',163],['Erase',0],
];
const linear = new Map();
const register = (codes, kind, surface='tarmac') => codes.forEach((code,rot)=>linear.set(code,{kind,rot,surface}));
register([1,181,179,180],'start'); register([134,137,135,136],'start','dirt'); register([147,150,148,149],'start','ice');
register([4,5],'road'); register([14,15],'road','dirt'); register([24,25],'road','ice');
register([34,35],'bridge'); register([99,100],'bridge'); register([101,102],'overpass'); register([103,104],'bridge');
register([38,37,39,36],'ramp'); register([58,57,59,56],'jump'); register([97,96,98,95],'ramp');
register([64,65],'loop'); register([85,86],'corkscrew'); register([66,67],'tunnel');
register([68,69],'pipe'); register([83,84],'halfpipe'); register([70,72,71,73],'pipe');
register([109,110],'highway'); register([111,114,113,112],'highway'); register([115,116],'slalom');
register([50,48,51,49],'bank'); register([117,118,119,120],'corkup'); register([121,122,123,124],'corkup');
for(let code=40;code<=47;code++)linear.set(code,{kind:'bankentry',rot:code%2,surface:'tarmac'});
const corners = [[6,'corner','tarmac'],[10,'wide','tarmac'],[16,'corner','dirt'],[20,'wide','dirt'],[26,'corner','ice'],[30,'wide','ice'],[52,'bankcorner','tarmac'],[105,'elevatedcorner','tarmac']];
export function describe(code) {
  if (linear.has(code)) return {...linear.get(code)};
  for (const [base,kind,surface] of corners) if(code>=base && code<base+4) return {kind,surface,rot:code-base};
  if(code>=60 && code<=63) return {kind:'chicane',rot:code-60,surface:'tarmac'};
  if([74,125,138].includes(code)) return {kind:'cross',rot:0,surface:code===125?'dirt':code===138?'ice':'tarmac'};
  if((code>=75&&code<=82)||(code>=87&&code<=94)||(code>=126&&code<=133)||(code>=139&&code<=146)) return {kind:'split',rot:code%4,surface:code>=139?'ice':code>=126?'dirt':'tarmac'};
  if(code>=151 && code<=178) return {kind:code<=153?'tree':'building',rot:code%4,surface:'grass'};
  return {kind:code>=253?'filler':code===0?'empty':'unknown',rot:0,surface:'grass'};
}
export function blankTrack(name='Untitled') { return {name,tiles:Array(900).fill(0),terrain:Array(900).fill(0),horizon:2}; }
export function readTrack(bytes,name='Imported track') {
  if(bytes.length<1802) throw new Error('A DOS track must contain at least 1,802 bytes.');
  const track=blankTrack(name);
  for(let z=0;z<SIZE;z++) for(let x=0;x<SIZE;x++) track.tiles[z*SIZE+x]=bytes[(29-z)*SIZE+x];
  track.horizon=bytes[900]; track.terrain=Array.from(bytes.slice(901,1801));
  if(track.terrain.some(v=>v>18)) throw new Error('Unsupported terrain data.');
  return track;
}
export function writeTrack(track) {
  validateTrack(track);
  const bytes=new Uint8Array(1802);
  for(let z=0;z<SIZE;z++) for(let x=0;x<SIZE;x++) bytes[(29-z)*SIZE+x]=track.tiles[z*SIZE+x];
  bytes[900]=track.horizon; bytes.set(track.terrain,901); return bytes;
}
export function validateTrack(track) {
  if(!track || typeof track.name!=='string' || !Array.isArray(track.tiles)||track.tiles.length!==900||!Array.isArray(track.terrain)||track.terrain.length!==900) throw new Error('Invalid track: expected a named 30 × 30 layout.');
  if(track.tiles.some(v=>!Number.isInteger(v)||v<0||v>255)||track.terrain.some(v=>!Number.isInteger(v)||v<0||v>18)||!Number.isInteger(track.horizon)||track.horizon<0||track.horizon>4) throw new Error('Invalid track codes.');
  return track;
}
export function paint(track,x,z,code,terrain=false) {
  if(!Number.isInteger(x)||!Number.isInteger(z)||x<0||z<0||x>=30||z>=30) return false;
  const array=terrain?track.terrain:track.tiles;
  const max=terrain?18:255;
  if(!Number.isInteger(code)||code<0||code>max) return false;
  array[z*30+x]=code; return true;
}
export function rotateCode(code) {
  const d=describe(code);
  const entries=[...linear.entries()].filter(([,v])=>v.kind===d.kind&&v.surface===d.surface);
  if(entries.length){const at=entries.findIndex(([c])=>c===code); return entries[(at+1)%entries.length][0];}
  for(const [base] of corners) if(code>=base&&code<base+4) return base+(code-base+1)%4;
  if(code>=60&&code<=63) return 60+(code-59)%4;
  return code;
}
export function terrainHeight(track,x,z) {
  const gx=Math.floor(x/TILE),gz=Math.floor(z/TILE);
  if(gx<0||gz<0||gx>=30||gz>=30) return -4;
  const code=track.terrain[gz*30+gx],u=(x/TILE-gx),v=(z/TILE-gz);
  if(code===6) return 12;
  if(code===7) return (1-v)*12;
  if(code===8) return (1-u)*12;
  if(code===9) return v*12;
  if(code===10) return u*12;
  if(code>=11) return 6;
  return 0;
}
export function makeDemo(variant=0) {
  const t=blankTrack(['Alpine proving ground','Desert velocity','Midnight ice'][variant]);t.horizon=variant===1?0:2;
  // Clockwise, connected circuit. The multi-tile loop consumes two cells.
  for(let z=8;z<22;z++){paint(t,9,z,4);paint(t,20,z,4);}
  for(let x=10;x<20;x++){paint(t,x,7,5);paint(t,x,22,5);}
  paint(t,9,7,6);paint(t,20,7,7);paint(t,20,22,9);paint(t,9,22,8);
  paint(t,9,20,1);paint(t,9,13,64);paint(t,9,14,254);paint(t,14,7,67);
  paint(t,20,12,59);paint(t,20,13,0);paint(t,20,14,4);paint(t,16,22,86);paint(t,17,22,255);
  if(variant===1){paint(t,9,17,14);paint(t,9,18,14);paint(t,20,18,115);}
  if(variant===2){paint(t,9,16,24);paint(t,9,17,24);paint(t,14,22,25);}
  for(let z=3;z<27;z++) for(let x=4;x<26;x++) if((x<8||x>21||z<6||z>23)&&(x*7+z*11)%7===0)paint(t,x,z,153);
  for(let z=14;z<20;z++)for(let x=12;x<16;x++)t.terrain[z*30+x]=1;
  return t;
}
const rotation=[0,-Math.PI/2,Math.PI,Math.PI/2];
export function tilePaths(track,index) {
  const code=track.tiles[index],d=describe(code),gx=index%30,gz=Math.floor(index/30);
  if(['empty','filler','tree','building','unknown'].includes(d.kind))return [];
  let points=[],n=24,extent=['loop','corkscrew'].includes(d.kind)?64:32;
  let cx=gx*TILE+16,cz=gz*TILE+16;
  if(extent===64){if(d.rot%2===0)cz+=16;else cx+=16;}
  if(['wide','chicane','corkup'].includes(d.kind)){cx+=16;cz+=16;extent=64;}
  for(let i=0;i<=n;i++){
    const t=i/n;let x=0,z=extent*(0.5-t),y=0,bank=0;
    if(['corner','wide','bankcorner','elevatedcorner','split'].includes(d.kind)){
      const r=d.kind==='wide'?48:16,a=t*Math.PI/2;
      x=r*(1-Math.cos(a));z=r*(1-Math.sin(a));
      // S-E, S-W, N-E, N-W share a corner pivot.
      x-=d.kind==='wide'?16:0;z-=d.kind==='wide'?16:0;
      if(d.rot===1||d.rot===3)x=-x;
      if(d.rot>=2)z=-z;
      if(d.kind==='bankcorner')bank=Math.sin(t*Math.PI)*0.38;
    }
    if(d.kind==='loop') {const a=t*Math.PI*2;z=32-t*64-20*Math.sin(a);y=20*(1-Math.cos(a));}
    if(d.kind==='corkscrew'){bank=t*Math.PI*2;y=6*(1-Math.cos(t*Math.PI*2));x=Math.sin(t*Math.PI*2)*5;}
    if(d.kind==='corkup'){x=Math.sin(t*Math.PI*2)*13;y=t*12;bank=t*Math.PI*2;}
    if(d.kind==='chicane')x=13*Math.sin(t*Math.PI*2);
    if(d.kind==='bridge'||d.kind==='overpass'||d.kind==='elevatedcorner')y=12;
    if(d.kind==='ramp')y=t*12;
    if(d.kind==='jump')y=t*t*8;
    if(d.kind==='bank')bank=0.32;
    if(d.kind==='bankentry')bank=t*0.32;
    if(!['corner','wide','bankcorner','elevatedcorner','split'].includes(d.kind)){
      const a=rotation[d.rot],nx=x*Math.cos(a)-z*Math.sin(a);z=x*Math.sin(a)+z*Math.cos(a);x=nx;
    }
    const wx=cx+x,wz=cz+z;
    points.push({x:wx,y:y+terrainHeight(track,wx,wz)+0.15,z:wz,bank,loopPitch:d.kind==='loop'?t*Math.PI*2:0});
  }
  const paths=[{index,kind:d.kind,surface:d.surface,width:d.kind==='highway'?18:WIDTH,points}];
  if(['cross','overpass','split'].includes(d.kind))paths.push({index,kind:'road',surface:d.surface,width:WIDTH,points:Array.from({length:25},(_,i)=>({x:gx*32+i*32/24,y:terrainHeight(track,gx*32+i*32/24,gz*32+16)+0.15,z:gz*32+16,bank:0}))});
  return paths;
}
export function compileTrack(track) {
  validateTrack(track);
  const paths=track.tiles.flatMap((_,i)=>tilePaths(track,i));
  for(const p of paths){p.length=0;p.lengths=[0];for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i];p.length+=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);p.lengths.push(p.length);}}
  const start=paths.find(p=>p.kind==='start');
  const warnings=[];
  if(!start)warnings.push('Place a start / finish tile before racing.');
  const unknown=track.tiles.filter(c=>describe(c).kind==='unknown').length;
  if(unknown)warnings.push(`${unknown} unsupported tile codes are omitted.`);
  return {track,paths,start,warnings,trees:makeTrees(track,paths)};
}
function makeTrees(track,paths) {
  const trees=[];
  track.tiles.forEach((code,index)=>{if(describe(code).kind==='tree'){const x=index%30*32+16,z=Math.floor(index/30)*32+16,y=terrainHeight(track,x,z);trees.push({x,y,z,crownY:y+6,trunkY:y+1.3});}});
  for(let i=0;i<330;i++){
    const x=sceneryNoise(i*3)*950,z=sceneryNoise(i*3+1)*950,index=Math.floor(z/32)*30+Math.floor(x/32);
    if(track.tiles[index]||track.terrain[index])continue;
    if(paths.some(p=>Math.hypot(p.points[12].x-x,p.points[12].z-z)<26))continue;
    const y=terrainHeight(track,x,z);trees.push({x,y,z,crownY:y+5+sceneryNoise(i)*3,trunkY:y+1.5});
  }
  return trees.map((tree,i)=>{const scale=.8+sceneryNoise(i)*.5;return {...tree,scale,radius:.6*scale,height:tree.trunkY-tree.y+1.5*scale};});
}
// Sweep the whole movement, so fast cars cannot step through a narrow trunk.
export function treeCollision(trees,from,to,carHeight=1.5) {
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,a=dx*dx+dz*dz;let hit=null;
  for(const tree of trees){
    const ox=from.x-tree.x,oz=from.z-tree.z,radius=tree.radius+2.4,c=ox*ox+oz*oz-radius*radius,dot=ox*dx+oz*dz;
    let enter=0,exit=1;
    if(a===0){if(c>0)continue;}
    else{
      // A replay or an edited track can start inside a trunk; permit escape.
      if(c<0&&dot>=0)continue;
      const b=2*dot,discriminant=b*b-4*a*c;if(discriminant<0)continue;
      const root=Math.sqrt(discriminant);enter=Math.max(0,(-b-root)/(2*a));exit=Math.min(1,(-b+root)/(2*a));
    }
    if(dy===0){if(from.y>tree.y+tree.height||from.y+carHeight<tree.y)continue;}
    else{const low=(tree.y-carHeight-from.y)/dy,high=(tree.y+tree.height-from.y)/dy;enter=Math.max(enter,Math.min(low,high));exit=Math.min(exit,Math.max(low,high));}
    if(enter<=exit&&(!hit||enter<hit.time))hit={tree,time:enter};
  }
  return hit;
}
export function samplePath(path,distance) {
  const dist=clamp(distance,0,path.length);let i=1;
  while(i<path.lengths.length-1&&path.lengths[i]<dist)i++;
  const a=path.points[i-1],b=path.points[i],t=(dist-path.lengths[i-1])/(path.lengths[i]-path.lengths[i-1]);
  const loop=path.kind==='loop';
  return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),yaw:loop?(path.points[0].x===path.points.at(-1).x?0:-Math.PI/2):Math.atan2(b.x-a.x,a.z-b.z),pitch:loop?lerp(a.loopPitch,b.loopPitch,t):Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z)),roll:lerp(a.bank,b.bank,t)};
}
export function nearestRoad(world,x,y,z) {
  let best=null,bestDistance=Infinity;
  for(const path of world.paths){
    const anchor=path.points[12];if(Math.abs(anchor.x-x)>105||Math.abs(anchor.z-z)>105)continue;
    for(let i=1;i<path.points.length;i++){
      const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
      const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(den||1),0,1);
      const px=lerp(a.x,b.x,t),pz=lerp(a.z,b.z,t),py=lerp(a.y,b.y,t),horizontal=Math.hypot(x-px,z-pz);
      const score=horizontal+Math.abs(y-py)*1.5;
      if(score<bestDistance){bestDistance=score;best={path,x:px,y:py,z:pz,distance:horizontal,along:lerp(path.lengths[i-1],path.lengths[i],t),yaw:Math.atan2(dx,-dz),pitch:Math.atan2(b.y-a.y,Math.hypot(dx,dz)),roll:lerp(a.bank,b.bank,t)};}
    }
  }
  return best;
}
export function createCar(world,carIndex=0) {
  if(!world.start)throw new Error('This track needs a start / finish tile.');
  const p=samplePath(world.start,world.start.length*0.75);
  return {...p,speed:0,vx:0,vz:0,vy:0,time:0,penalty:0,gear:1,auto:true,carIndex,crashed:false,finished:false,airborne:false,airtime:0,bestAir:0,distance:0,visited:[],lastTile:world.start.index,departed:false,attachment:null,offroad:0,damage:0};
}
export function shift(car,delta){car.gear=clamp(car.gear+delta,1,6);}
export function controls(keys,pad=null,deadzone=0.14) {
  const has=k=>keys.has(k),button=i=>pad?.buttons?.[i]?.value??0;
  const axis=pad?.axes?.[0]??0,steer=Math.abs(axis)>deadzone?(Math.abs(axis)-deadzone)/(1-deadzone)*Math.sign(axis):0;
  return {throttle:Math.max(has('KeyW')||has('ArrowUp')?1:0,button(7)),brake:Math.max(has('KeyS')||has('ArrowDown')?1:0,button(6)),steer:clamp((has('KeyD')||has('ArrowRight')?1:0)-(has('KeyA')||has('ArrowLeft')?1:0)+steer,-1,1),handbrake:has('Space')||button(0)>0.5,pause:button(9)>0.5,reset:button(3)>0.5,camera:button(2)>0.5,up:button(5)>0.5,down:button(4)>0.5};
}
export function stepCar(car,input,world,dt=STEP) {
  if(car.crashed||car.finished)return car;
  dt=clamp(dt,0,0.05); const spec=CARS[car.carIndex],previous={x:car.x,y:car.y,z:car.z};car.time+=dt;
  const road=nearestRoad(world,car.x,car.y,car.z);
  const onRoad=road&&road.distance<road.path.width/2&&Math.abs(car.y-road.y)<3;
  const surface=onRoad?road.path.surface:'grass';
  const grip=spec.grip*({tarmac:1,dirt:0.62,ice:0.17,grass:0.36}[surface]);
  const top=spec.top*(surface==='grass'?0.42:surface==='dirt'?0.86:1);
  if(car.auto)car.gear=clamp(Math.floor(Math.abs(car.speed)/spec.top*6)+1,1,6);
  const gearLimit=spec.top*(0.12+car.gear*0.15);
  let acceleration=input.throttle*spec.accel*Math.max(0,1-(car.speed/top)**2);
  if(!car.auto&&car.speed>gearLimit)acceleration=0;
  const reverseAcceleration=Math.max(10,spec.accel*1.15);
  car.speed+=(acceleration-input.brake*(car.speed>0.15?18:reverseAcceleration)-0.0002*car.speed*Math.abs(car.speed)-Math.sign(car.speed)*0.35-(input.handbrake?Math.sign(car.speed)*12:0))*dt;
  car.speed=clamp(car.speed,-18,top*1.3);
  if(Math.abs(car.speed)<0.05)car.speed=0;
  // Loops and corkscrews attach to their 3D ribbon; lateral steering remains active.
  if(!car.attachment&&onRoad&&['loop','corkscrew','corkup'].includes(road.path.kind)&&car.speed>12){
    const direction=Math.cos(angle(car.yaw-road.yaw))>=0?1:-1;
    const entrance=direction===1?road.along<10:road.along>road.path.length-10;
    if(entrance)car.attachment={index:world.paths.indexOf(road.path),distance:road.along,direction,lateral:0};
  }
  if(car.attachment){
    const a=car.attachment,path=world.paths[a.index];a.distance+=car.speed*dt*a.direction;a.lateral+=input.steer*car.speed*0.18*dt;
    const p=samplePath(path,a.distance);car.speed-=Math.sin(p.pitch)*9.81*dt*a.direction;
    Object.assign(car,p);car.yaw+=a.direction===-1?Math.PI:0;car.pitch*=a.direction;car.roll*=a.direction;car.x+=Math.cos(car.yaw)*a.lateral;car.z+=Math.sin(car.yaw)*a.lateral;
    if(Math.abs(a.lateral)>path.width/2||car.speed<8){car.crashed=true;car.damage=1;}
    if(a.distance<0||a.distance>path.length){car.attachment=null;car.pitch=angle(car.pitch);car.roll=angle(car.roll);car.vx=Math.sin(car.yaw)*car.speed;car.vz=-Math.cos(car.yaw)*car.speed;car.vy=0;}
  }else{
    // Full lock follows the 16 m track corners at normal cornering speeds.
    const yawRate=input.steer*car.speed/(1+Math.abs(car.speed)*0.025)*0.105*grip*(input.handbrake?1.7:1);
    car.yaw+=yawRate*dt;
    const response=clamp(dt*grip*(input.handbrake?1.5:18),0,1);
    car.vx=lerp(car.vx,Math.sin(car.yaw)*car.speed,response);car.vz=lerp(car.vz,-Math.cos(car.yaw)*car.speed,response);
    car.x+=car.vx*dt;car.z+=car.vz*dt;
    const next=nearestRoad(world,car.x,car.y,car.z);
    const supported=next&&next.distance<next.path.width/2&&Math.abs(car.y-next.y)<3&&!['loop','corkscrew','corkup'].includes(next.path.kind);
    const floor=supported?next.y:terrainHeight(world.track,car.x,car.z);
    car.vy-=22*dt;car.y+=car.vy*dt;
    if(car.y<=floor+0.25){
      if(car.airborne&&car.vy<-32){car.crashed=true;car.damage=1;}
      car.y=floor;car.airborne=false;car.bestAir=Math.max(car.bestAir,car.airtime);car.airtime=0;
      car.pitch=lerp(car.pitch,supported?next.pitch*Math.cos(angle(car.yaw-next.yaw)):0,dt*14);
      car.roll=lerp(car.roll,supported?next.roll:0,dt*10);
      car.vy=supported?Math.sin(car.pitch)*car.speed:0;
      // Ramp lip supplies upward velocity, then gravity carries the car across a gap.
    }else{car.airborne=true;car.airtime+=dt;car.pitch=lerp(car.pitch,Math.atan2(car.vy,Math.abs(car.speed)+1),dt*2);}
    const tileX=Math.floor(car.x/32),tileZ=Math.floor(car.z/32),idx=tileZ*30+tileX;
    if(tileX<0||tileZ<0||tileX>=30||tileZ>=30||world.track.terrain[idx]===1||describe(world.track.tiles[idx]).kind==='building'){car.crashed=true;car.damage=1;}
  }
  const treeHit=treeCollision(world.trees,previous,car,spec.shape==='truck'?2.2:1.5);
  if(treeHit){
    const contact=Math.max(0,treeHit.time-.001);car.x=lerp(previous.x,car.x,contact);car.y=lerp(previous.y,car.y,contact);car.z=lerp(previous.z,car.z,contact);
    car.speed=0;car.vx=0;car.vy=0;car.vz=0;car.attachment=null;
  }
  car.distance+=Math.abs(car.speed)*dt;
  if(!onRoad&&!car.airborne){car.offroad+=dt;car.penalty+=dt*0.5;}else car.offroad=0;
  if(road&&onRoad){
    if(!car.visited.includes(road.path.index))car.visited.push(road.path.index);
    if(road.path.index!==world.start.index)car.departed=true;
    if(car.departed&&road.path.index===world.start.index&&car.lastTile!==world.start.index&&car.distance>200){
      const required=world.paths.filter(p=>p.kind!=='road'||p.index!==world.start.index).length;
      if(car.visited.length>=required*0.7)car.finished=true;
    }
    car.lastTile=road.path.index;
  }
  return car;
}
export function buildRoute(world) {
  if(!world.start)return [];
  const route=[{path:world.start,reverse:false}],used=new Set([world.start]);
  let end=world.start.points.at(-1);
  for(let step=0;step<world.paths.length;step++){
    let candidate=null,reverse=false,best=route.at(-1).path.kind==='jump'?50:3;
    for(const p of world.paths){if(used.has(p))continue;for(const rev of [false,true]){const a=rev?p.points.at(-1):p.points[0],d=Math.hypot(a.x-end.x,a.y-end.y,a.z-end.z);if(d<best){candidate=p;reverse=rev;best=d;}}}
    if(!candidate)break;
    route.push({path:candidate,reverse});used.add(candidate);end=reverse?candidate.points[0]:candidate.points.at(-1);
  }
  return route;
}
export function rivalPose(route,elapsed,difficulty=2) {
  if(!route.length)return null;
  const length=route.reduce((a,r)=>a+r.path.length,0);let dist=(elapsed*(17+difficulty*4))%length;
  let index=0;
  while(index<route.length-1&&dist>route[index].path.length){dist-=route[index].path.length;index++;}
  const r=route[index],p=samplePath(r.path,r.reverse?r.path.length-dist:dist);
  if(r.reverse){p.yaw+=Math.PI;p.pitch=-p.pitch;}
  return p;
}
export function recordFrame(car){return {x:car.x,y:car.y,z:car.z,yaw:car.yaw,pitch:car.pitch,roll:car.roll,speed:car.speed,time:car.time};}
export function replayPose(frames,time) {
  if(!frames.length)return null;
  if(time<=frames[0].time)return {...frames[0]};
  if(time>=frames.at(-1).time)return {...frames.at(-1)};
  let lo=0,hi=frames.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(frames[mid].time<time)lo=mid;else hi=mid;}
  const a=frames[lo],b=frames[hi],t=(time-a.time)/(b.time-a.time),out={};
  for(const k of ['x','y','z','pitch','roll','speed','time'])out[k]=lerp(a[k],b[k],t);
  out.yaw=a.yaw+angle(b.yaw-a.yaw)*t;return out;
}
export function parseReplay(text) {
  const r=JSON.parse(text);validateTrack(r.track);
  if(r.version!==1||!Number.isInteger(r.carIndex)||r.carIndex<0||r.carIndex>=11||!Array.isArray(r.frames)||!r.frames.length||r.frames.length>144000)throw new Error('Invalid replay.');
  let previous=-1;
  for(const frame of r.frames){if(!['x','y','z','yaw','pitch','roll','speed','time'].every(k=>Number.isFinite(frame[k]))||frame.time<previous)throw new Error('Invalid replay frames.');previous=frame.time;}
  return r;
}
export function formatTime(t){if(!Number.isFinite(t))return '—';const n=Math.max(0,t);return `${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(2).padStart(5,'0')}`;}
export function saveJSON(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function loadJSON(storage,key,fallback){try{const value=storage.getItem(key);return value===null?fallback:JSON.parse(value);}catch{return fallback;}}
export function bestTime(scores,key,time){if(!Number.isFinite(time)||time<=0)return scores;return {...scores,[key]:Math.min(scores[key]??Infinity,time)};}
export function trackKey(track,carIndex){let h=2166136261;for(const n of [...track.tiles,...track.terrain])h=Math.imul(h^n,16777619);return `${(h>>>0).toString(16)}-${carIndex}`;}
