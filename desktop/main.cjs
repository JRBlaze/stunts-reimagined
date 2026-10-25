const {app,BrowserWindow,shell,session}=require('electron');
const path=require('node:path');

app.setName('Stunts Reimagined');
function createWindow(){
  const window=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:640,backgroundColor:'#172326',title:'Stunts Reimagined',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(({url})=>{
    if(url==='https://wiki.stunts.hu/wiki/Track_file'||url==='https://www.retrogames.cz/manualy/DOS/4D_Sports_Driving_-_DOS_-_Manual.pdf')shell.openExternal(url);
    return {action:'deny'};
  });
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.loadFile(path.join(__dirname,'../dist/index.html'));
  return window;
}
app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_contents,permission,callback)=>callback(permission==='fullscreen'));
  createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
