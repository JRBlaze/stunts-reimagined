import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

test('desktop boot locks down navigation, permissions and renderer privileges',async()=>{
  const events={},windows=[],opened=[];let permission;
  class Window{constructor(options){this.options=options;this.webContents={setWindowOpenHandler:fn=>this.open=fn,on:(name,fn)=>this[name]=fn};windows.push(this);}setMenuBarVisibility(v){this.menu=v;}loadFile(file){this.file=file;}static getAllWindows(){return windows;}}
  const app={setName:n=>app.name=n,whenReady:()=>Promise.resolve(),on:(name,fn)=>events[name]=fn,quit:()=>app.quitCalled=true};
  const electron={app,BrowserWindow:Window,shell:{openExternal:url=>opened.push(url)},session:{defaultSession:{setPermissionRequestHandler:fn=>permission=fn}}};
  const source=fs.readFileSync('desktop/main.cjs','utf8');
  vm.runInNewContext(source,{require:name=>name==='electron'?electron:path,__dirname:path.resolve('desktop'),process:{platform:'win32'}},{filename:path.resolve('desktop/main.cjs')});await Promise.resolve();
  assert.equal(windows.length,1);const w=windows[0];assert.equal(w.options.webPreferences.nodeIntegration,false);assert.equal(w.options.webPreferences.contextIsolation,true);assert.equal(w.options.webPreferences.sandbox,true);assert.equal(w.menu,false);assert.ok(w.file.endsWith('dist'+path.sep+'index.html'));
  for(const url of ['https://wiki.stunts.hu/wiki/Track_file','https://www.retrogames.cz/manualy/DOS/4D_Sports_Driving_-_DOS_-_Manual.pdf','https://evil.example','javascript:alert(1)'])assert.equal(w.open({url}).action,'deny');assert.equal(opened.length,2);
  let denied=false;permission(null,'camera',allowed=>denied=!allowed);assert.equal(denied,true);let full=false;permission(null,'fullscreen',allowed=>full=allowed);assert.equal(full,true);let prevented=false;w['will-navigate']({preventDefault(){prevented=true;}});assert.equal(prevented,true);
  events.activate();assert.equal(windows.length,1);windows.length=0;events.activate();assert.equal(windows.length,1);events['window-all-closed']();assert.equal(app.quitCalled,true);
  app.quitCalled=false;vm.runInNewContext(source,{require:name=>name==='electron'?electron:path,__dirname:path.resolve('desktop'),process:{platform:'darwin'}},{filename:path.resolve('desktop/main.cjs')});await Promise.resolve();events['window-all-closed']();assert.equal(app.quitCalled,false);
});
