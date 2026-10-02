const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const c=require('./release.json'),{makeAssetLinks}=require('./assetlinks.cjs');
function main(){
 const project=path.join(__dirname,'generated'),sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT,jdk=process.env.JAVA_HOME;
 if(!fs.existsSync(path.join(project,'gradlew')))throw Error('Generate the Android project first: npm run generate --prefix mobile');
 if(!sdk||!fs.existsSync(path.join(sdk,`platforms/android-${c.targetSdk}/android.jar`)))throw Error(`Set ANDROID_HOME to an Android SDK with platform ${c.targetSdk}.`);
 const win=process.platform==='win32',exe=win?'.exe':'';
 if(!jdk||!fs.existsSync(path.join(jdk,'bin','javac'+exe)))throw Error('Set JAVA_HOME to a full Java 17 JDK (a JRE is not enough).');
 const tool=path.join(sdk,'build-tools','36.0.0','apksigner'+(win?'.bat':''));if(!fs.existsSync(tool))throw Error('Install Android SDK Build Tools 36.0.0.');
 const run=(cmd,args,opts={})=>{const r=cp.spawnSync(cmd,args,{cwd:project,stdio:'inherit',...opts});if(r.error)throw r.error;if(r.status!==0)throw Error(`${path.basename(cmd)} failed (${r.status})`);return r};
 const keyDir=path.join(project,'.preview-signing');fs.mkdirSync(keyDir,{recursive:true});const debugKey=path.join(keyDir,'debug.keystore');
 if(!fs.existsSync(debugKey))run(path.join(jdk,'bin','keytool'+exe),['-genkeypair','-keystore',debugKey,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-keysize','2048','-validity','365','-dname','CN=Android Debug,O=Android,C=US']);
 fs.writeFileSync(path.join(project,'local.properties'),'sdk.dir='+sdk.replaceAll('\\','/')+'\n');
 const env={...process.env,GRADLE_USER_HOME:process.env.GRADLE_USER_HOME||path.join(__dirname,'.gradle-cache')};
 run(win?'cmd.exe':'sh',win?['/d','/s','/c','gradlew.bat --no-daemon --max-workers=2 assembleDebug bundleRelease']:['./gradlew','--no-daemon','--max-workers=2','assembleDebug','bundleRelease'],{env});
 const out=path.join(__dirname,'dist');fs.mkdirSync(out,{recursive:true});const signed=!!process.env.FORGE_UPLOAD_KEYSTORE;
 const names=[['app/build/outputs/apk/debug/app-debug.apk',`fortune-forge-${c.versionName}-preview.apk`],['app/build/outputs/bundle/release/app-release.aab',`fortune-forge-${c.versionName}${signed?'':'-unsigned'}.aab`]];
 const artifacts=names.map(([src,name])=>{const dest=path.join(out,name);fs.copyFileSync(path.join(project,src),dest);return{name,bytes:fs.statSync(dest).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')}});
 const v=cp.spawnSync(tool,['verify','--print-certs',path.join(out,names[0][1])],{cwd:project,encoding:'utf8',shell:win});if(v.status!==0)throw Error('Preview APK signature verification failed');
 const match=v.stdout.match(/certificate SHA-256 digest:\s*([0-9a-f]{64})/i);if(!match)throw Error('Preview certificate fingerprint missing');const fingerprint=match[1].match(/../g).join(':').toUpperCase();
 fs.writeFileSync(path.join(out,'preview-assetlinks.json'),JSON.stringify(makeAssetLinks(c.packageId+'.preview',fingerprint),null,2)+'\n');
 const report={packageId:c.packageId,previewPackageId:c.packageId+'.preview',versionName:c.versionName,versionCode:c.versionCode,targetSdk:c.targetSdk,webOrigin:`https://${c.host}`,releaseSigned:signed,playReady:false,previewCertificateSha256:fingerprint,builtAt:new Date().toISOString(),artifacts};
 fs.writeFileSync(path.join(out,'build-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(!signed)console.log('AAB is UNSIGNED: do not upload to Play Console. Sign it with your own upload key first.');
}
if(require.main===module)try{main()}catch(e){console.error(e.message);process.exitCode=1}
module.exports={main};
