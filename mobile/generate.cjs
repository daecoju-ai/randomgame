const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {TwaManifest,TwaGenerator,ConsoleLog} = require('@bubblewrap/core');
const c = require('./release.json');
async function main() {
  const out = path.join(__dirname,'generated');
  if (fs.existsSync(out)) throw new Error('mobile/generated already exists. Back up manual changes and remove it before regenerating.');
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(c.packageId)) throw new Error('Invalid package ID');
  if (!/^[a-z0-9.-]+$/.test(c.host)) throw new Error('Invalid host');
  const origin = `https://${c.host}`;
  const web = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/manifest.webmanifest'),'utf8'));
  const twa = TwaManifest.fromWebManifestJson(new URL(origin+'/manifest.webmanifest'), web);
  Object.assign(twa, {packageId:c.packageId,name:c.name,launcherName:c.name,host:c.host,
    appVersionName:c.versionName,appVersionCode:c.versionCode,minSdkVersion:c.minSdk,
    orientation:'portrait',enableNotifications:false,shortcuts:[],
    signingKey:{path:'../signing/upload.jks',alias:'upload'},generatorApp:'fortune-forge-release',
    webManifestUrl:undefined});
  const canonicalIcon=twa.iconUrl, canonicalMask=twa.maskableIconUrl;
  const files = new Map(['/icons/icon-512.png','/icons/maskable-512.png'].map(p=>[p,fs.readFileSync(path.join(__dirname,'../public',p))]));
  const server=http.createServer((req,res)=>{
    const data=files.get(req.url);
    if(!data){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':'image/png'});res.end(data);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try {
    const local=`http://127.0.0.1:${server.address().port}`;
    twa.iconUrl=local+'/icons/icon-512.png';twa.maskableIconUrl=local+'/icons/maskable-512.png';
    const invalid=twa.validate();if(invalid)throw new Error(invalid);
    await new TwaGenerator().createTwaProject(out,twa,new ConsoleLog('FortuneForge'));
    const gradle=fs.readFileSync(path.join(out,'app/build.gradle'),'utf8');
    for(const key of ['compileSdkVersion','targetSdkVersion']) {
      const match=gradle.match(new RegExp(key+'\\s+(\\d+)'));
      if(!match || Number(match[1])<c.targetSdk)throw new Error(`${key} is below required ${c.targetSdk}`);
    }
    twa.iconUrl=canonicalIcon;twa.maskableIconUrl=canonicalMask;
    twa.webManifestUrl=new URL(origin+'/manifest.webmanifest');
    await twa.saveToFile(path.join(out,'twa-manifest.json'));
    console.log('Android source generated and SDK levels checked. No AAB built or signing key created.');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
