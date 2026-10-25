import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as G from '../src/core.mjs';

const source=fs.readFileSync('src/app.mjs','utf8').replace(/^import .*;$/gm,line=>' '.repeat(line.length));
async function harness(options={}){
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'http://localhost',runScripts:'outside-only'}),w=dom.window;
  const ctx=w.getInternalVMContext?.()||dom.getInternalVMContext(),timers=[],draws=[];
  const graphics={clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
  w.HTMLCanvasElement.prototype.getContext=()=>graphics;w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){draws.push(this.download);};
  Object.defineProperty(w.HTMLElement.prototype,'offsetParent',{get(){return this.parentElement;}});
  w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,width:720,height:720});
  let pad=null;w.navigator.getGamepads=()=>[pad];w.requestAnimationFrame=()=>{};w.setTimeout=fn=>{timers.push(fn);return timers.length;};w.clearTimeout=()=>{};
  w.URL.createObjectURL=()=> 'blob:local';w.URL.revokeObjectURL=()=>{};
  w.document.documentElement.requestFullscreen=async()=>{};w.document.exitFullscreen=async()=>{};
  class Audio{constructor(){this.currentTime=0;this.destination={};}createOscillator(){return {type:'',frequency:{setTargetAtTime(){}},connect:b=>b,start(){}};}createBiquadFilter(){return {type:'',frequency:{value:0},connect:b=>b};}createGain(){return {gain:{value:0,setTargetAtTime(){}},connect:b=>b};}resume(){return Promise.resolve();}}
  w.structuredClone=structuredClone;w.AudioContext=Audio;w.G=G;w.createScene=()=>{if(options.failGraphics)throw Error('<WebGL unavailable>');return {load(){},quality(){},render(){},renderer:{info:{render:{calls:1}}}};};
  for(const [key,value] of Object.entries(options.storage||{}))w.localStorage.setItem(key,value);
  w.fetch=options.fetch||(()=>Promise.resolve({ok:true,json:async()=>[]}));
  const run=s=>vm.runInContext(s,ctx);let thrown;
  try{new vm.Script(source,{filename:path.resolve('src/app.mjs')}).runInContext(ctx);}catch(error){thrown=error;}
  await new Promise(resolve=>setImmediate(resolve));
  return {w,run,dom,timers,draws,thrown,pad:p=>{pad=p;},click:selector=>w.document.querySelector(selector).click(),get:selector=>w.document.querySelector(selector)};
}
test('app boot, every menu, selection, escaping and settings controls',async()=>{
  const h=await harness({storage:{'stunts.tracks':JSON.stringify([{},G.makeDemo()])}});assert.equal(h.thrown,undefined);assert.equal(h.w.stunts.trackCount,4);
  for(const p of ['home','garage','tracks','race','editor','settings','help']){h.run(`navigate('${p}')`);assert.ok(h.get('.screen')||h.get('.home'));}
  h.run('navigate("garage")');h.click('[data-car="3"]');assert.equal(h.w.stunts.carIndex,3);
  h.run('navigate("tracks")');h.click('[data-track="1"]');assert.equal(h.w.stunts.track.name,'Desert velocity');
  h.run('navigate("race")');h.get('#rival').value='3';h.get('#rival').onchange({target:h.get('#rival')});assert.equal(h.run('rival'),3);
  h.run('navigate("settings")');for(const id of ['volume','deadzone','sensitivity','quality','units']){const element=h.get('#'+id);element.oninput({target:element});}
  assert.ok(h.w.localStorage.getItem('stunts.settings'));h.run('navigate("home")');h.click('[data-page="garage"]');assert.equal(h.w.stunts.page,'garage');
  assert.equal(h.run(`esc(${JSON.stringify('<>&"\'')})`),'&lt;&gt;&amp;&quot;&#39;');
  h.run('persist("bad", {toJSON(){throw Error("quota")}})');assert.match(h.get('#toast').textContent,/Storage/);h.timers.forEach(fn=>fn());
  h.dom.window.close();
});
test('graphics failure gives an actionable escaped message',async()=>{const h=await harness({failGraphics:true});assert.match(h.thrown.message,/WebGL/);assert.match(h.get('.dialog').textContent,/hardware/);assert.ok(h.get('.dialog').innerHTML.includes('&lt;WebGL'));h.dom.window.close();});
test('editor brushes, mouse gestures, undo/redo, save, import and export',async()=>{
  const h=await harness();h.run('navigate("editor")');h.get('#track-name').value='Custom <circuit>';h.click('[data-brush="66"]');
  const c=h.get('#editor-map');c.oncontextmenu({preventDefault(){}});c.onpointerdown({preventDefault(){},pointerId:1,buttons:1,clientX:60,clientY:60});c.onpointermove({buttons:1,clientX:85,clientY:60});c.onpointerup();c.onpointermove({buttons:1,clientX:100,clientY:100});c.onlostpointercapture();assert.equal(h.run('editor.tiles[62]'),66);
  h.run('action("undo")');assert.equal(h.run('editor.tiles[62]'),0);h.run('action("redo")');assert.equal(h.run('editor.tiles[62]'),66);
  h.run('undo=[];redo=[];action("undo");action("redo")');
  h.run('undo=Array.from({length:101},()=>structuredClone(editor))');c.onpointerdown({preventDefault(){},pointerId:1,buttons:2,clientX:60,clientY:60});assert.equal(h.run('undo.length'),101);c.onpointerup();
  h.click('[data-terrain="7"]');h.run('action("rotate")');assert.equal(h.run('brush'),8);h.click('[data-terrain="0"]');h.run('action("rotate")');assert.equal(h.run('brush'),0);
  h.get('#horizon').value='0';h.get('#horizon').onchange({target:h.get('#horizon')});assert.equal(h.run('editor.horizon'),0);
  h.run('action("saveTrack");action("saveTrack");action("exportTrk")');assert.equal(h.run('custom.length'),1);assert.ok(h.draws[0].endsWith('.TRK'));
  h.run('action("newTrack");action("testDrive")');assert.equal(h.w.stunts.mode,'menu');assert.match(h.get('#toast').textContent,/start/);
  h.run('action("rotate");action("import");action("importReplay")');assert.equal(h.get('#file').accept,'.replay');
  await h.get('#file').onchange({target:{files:[]}});
  await h.get('#file').onchange({target:{files:[{size:50000000,name:'huge.trk'}]}});assert.match(h.get('#toast').textContent,/large/);
  await h.get('#file').onchange({target:{files:[{size:1,name:'bad.json',text:async()=>'bad'}]}});assert.ok(h.get('#toast').textContent);
  const bytes=G.writeTrack(G.makeDemo());await h.get('#file').onchange({target:{files:[{size:1802,name:'Imported.TRK',arrayBuffer:async()=>bytes.buffer}]}});assert.equal(h.w.stunts.track.name,'Imported');
  await h.get('#file').onchange({target:{files:[{size:1802,name:'Imported.stunt',text:async()=>JSON.stringify(G.makeDemo())}]}});assert.equal(h.w.stunts.track.name,'Alpine proving ground');
  h.run('navigate("editor");editor.name="";document.querySelector("#track-name").value="";saveEditor();navigate("settings");navigate("editor")');
  h.run('setTrack(G.blankTrack());navigate("garage")');h.click('[data-car="2"]');assert.equal(h.w.stunts.carIndex,2);
  h.dom.window.close();
});
test('race countdown, telemetry, manual shifting, pauses, result records and replays',async()=>{
  const h=await harness();h.run('navigate("race")');h.get('#transmission').value='manual';h.run('action("start")');assert.equal(h.w.stunts.car.auto,false);
  h.run('tick(lastTime+50)');assert.match(h.get('#countdown').textContent,/3/);h.run('countdown=0.01;tick(lastTime+50)');assert.equal(h.get('#countdown').textContent,'GO');
  h.run('keys.add("KeyW");for(let i=0;i<30;i++)tick(lastTime+50);keys.clear()');assert.ok(h.w.stunts.car.speed>3);assert.equal(h.get('#countdown').textContent,'');
  h.run('car.airborne=true;tick(lastTime+1);car.airborne=false;car.attachment={index:0};tick(lastTime+1);car.attachment=null;car.offroad=1;tick(lastTime+1);car.speed=-2;settings.units="mph";tick(lastTime+1)');assert.equal(h.get('#gear').textContent,'R');
  h.run('pause()');assert.equal(h.w.stunts.mode,'paused');h.click('[data-action="resume"]');assert.equal(h.w.stunts.mode,'race');h.click('#pause');h.run('action("watch")');assert.equal(h.w.stunts.mode,'replay');
  h.get('#scrub').value='.1';h.get('#scrub').oninput({target:h.get('#scrub')});h.get('#replay-rate').value='2';h.get('#replay-rate').onchange({target:h.get('#replay-rate')});h.run('action("replayToggle");tick(lastTime+50);action("camera");action("saveReplay")');assert.ok(h.draws.some(n=>n.endsWith('.replay')));
  h.run('action("continue")');assert.equal(h.w.stunts.car.practice,true);h.run('action("restart")');assert.equal(h.w.stunts.car.auto,false);
  h.run('countdown=0;car.crashed=true;tick(lastTime+50)');assert.equal(h.w.stunts.mode,'result');h.run('finishRun();action("saveReplay");action("restart");countdown=0;car.finished=true;car.time=25;tick(lastTime+50)');assert.ok(h.w.localStorage.getItem('stunts.scores'));
  h.run('rival=2;tick(lastTime+1);action("restart");countdown=0;tick(lastTime+1)');
  h.run('car.practice=true;car.finished=true;car.time=100;tick(lastTime+50);action("home");action("race");action("garage");action("tracks");action("editor")');
  h.run('frames=[];watchReplay();action("saveReplay")');assert.match(h.get('#toast').textContent,/recorded/);
  const t=G.makeDemo(),c=G.createCar(G.compileTrack(t)),replay={version:1,track:t,carIndex:2,frames:[G.recordFrame(c),{...G.recordFrame(c),time:1,x:c.x+10}]};
  await h.get('#file').onchange({target:{files:[{size:100,name:'test.replay',text:async()=>JSON.stringify(replay)}]}});assert.equal(h.w.stunts.mode,'replay');
  h.run('action("saveReplay");replayPlaying=false;tick(lastTime+1)');
  h.dom.window.close();
});
test('keyboard, controller edges, menu focus, visibility and fullscreen',async()=>{
  const h=await harness(),key=(code,extra={})=>h.w.dispatchEvent(new h.w.KeyboardEvent('keydown',{code,bubbles:true,cancelable:true,...extra}));
  key('ArrowDown');key('ArrowUp');key('KeyA',{repeat:true});h.w.dispatchEvent(new h.w.KeyboardEvent('keyup',{code:'KeyA'}));
  h.run('navigate("editor")');h.get('#track-name').focus();key('KeyR');key('Escape');h.run('navigate("editor")');h.get('#track-name').blur();key('KeyR');
  h.run('navigate("race");action("start");countdown=0');key('Space');key('Tab');key('KeyC');key('KeyE');key('KeyQ');key('KeyR');key('Escape');key('Escape');
  h.w.dispatchEvent(new h.w.Event('blur'));assert.equal(h.w.stunts.mode,'paused');h.run('pause()');Object.defineProperty(h.w.document,'hidden',{value:true,configurable:true});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));assert.equal(h.w.stunts.mode,'paused');Object.defineProperty(h.w.document,'hidden',{value:false});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));
  await h.run('action("fullscreen")');Object.defineProperty(h.w.document,'fullscreenElement',{value:h.w.document.body,configurable:true});await h.run('action("fullscreen")');h.w.document.exitFullscreen=async()=>{throw Error();};await h.run('action("fullscreen")');key('F11');
  h.run('action("home");pollPad()');const pad={connected:true,axes:[.5],buttons:Array.from({length:17},()=>({value:0}))};h.pad(pad);
  const press=i=>{pad.buttons[i].value=1;h.run('pollPad()');pad.buttons[i].value=0;h.run('pollPad()');};
  for(const i of [12,13,14,15])press(i);h.get('.brand').focus();press(0);press(1);
  h.run('navigate("settings")');h.get('#quality').focus();press(0);
  h.run('navigate("race");action("start")');for(const i of [3,2,5,4,9,9])press(i);
  h.run('action("home")');key('Escape');key('KeyC');
  h.dom.window.close();
});
test('catalog handles successful, missing and rejected track requests',async()=>{
  const bytes=G.writeTrack(G.makeDemo());let n=0;
  const h=await harness({fetch:async()=>{n++;if(n===1)return {ok:true,json:async()=>[{name:'A',file:'A.TRK'},{name:'B',file:'B.TRK'}]};if(n===2)return {ok:true,arrayBuffer:async()=>bytes.buffer};return {ok:false};}});
  assert.equal(h.w.stunts.trackCount,4);assert.match(h.get('#toast').textContent,/1 original/);h.dom.window.close();
  const bad=await harness({fetch:async()=>({ok:false})});assert.match(bad.get('#toast').textContent,/unavailable/);bad.dom.window.close();
});
test('edge cases: theme settings, terrain/scenery, empty names and hardware absence',async()=>{
  const h=await harness();h.run('tick(lastTime+10);settings.quality="low";settings.units="mph";navigate("settings")');h.click('[data-action="fullscreen"]');
  h.run('track.terrain[0]=6;track.tiles[0]=163;drawMap(document.createElement("canvas"),track);navigate("editor");document.querySelector("#track-name").value="";action("exportTrk");action("testDrive")');
  h.w.dispatchEvent(new h.w.KeyboardEvent('keydown',{code:'Escape'}));h.run('car.crashed=true;countdown=0;mode="race";tick(lastTime+1)');h.w.dispatchEvent(new h.w.KeyboardEvent('keydown',{code:'KeyR'}));
  h.w.navigator.getGamepads=undefined;h.run('pollPad();mode="menu";tick(lastTime+1)');h.pad({connected:false,buttons:[]});h.w.navigator.getGamepads=()=>[null,{connected:false,buttons:[]}];h.run('pollPad()');
  h.run('audio.ctx={resume:()=>Promise.reject(Error("disabled"))};audio.start()');await Promise.resolve();
  h.dom.window.close();
});
test('tree stops keep the session and replay recording alive and allow reversing',async()=>{
  const h=await harness();
  h.run('const treeTrack=G.blankTrack("Tree recovery");treeTrack.terrain.fill(6);treeTrack.tiles[20*30+15]=1;treeTrack.tiles[19*30+15]=153;setTrack(treeTrack);navigate("race");startRun();countdown=0;keys.add("KeyW");for(let i=0;i<100;i++)tick(lastTime+50);keys.clear()');
  assert.equal(h.w.stunts.mode,'race');assert.equal(h.w.stunts.car.speed,0);assert.equal(h.w.stunts.car.crashed,false);assert.equal(h.get('.overlay'),null);
  const contact=h.w.stunts.car.z,recorded=h.w.stunts.frames;
  h.run('keys.add("KeyS");for(let i=0;i<25;i++)tick(lastTime+50);keys.clear()');
  assert.ok(h.w.stunts.car.speed<-9);assert.ok(h.w.stunts.car.z>contact+3);assert.ok(h.w.stunts.frames>recorded);assert.equal(h.w.stunts.mode,'race');h.dom.window.close();
});
