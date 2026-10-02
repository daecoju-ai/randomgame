const fs=require('node:fs'),path=require('node:path');
function tuneProject(out,c){
 const top=path.join(out,'build.gradle');fs.writeFileSync(top,fs.readFileSync(top,'utf8').replace("com.android.tools.build:gradle:8.9.1","com.android.tools.build:gradle:8.10.1").replaceAll('jcenter()','mavenCentral()'));
 const app=path.join(out,'app/build.gradle');let s=fs.readFileSync(app,'utf8');
 s=s.replace('android {',`android {\n    buildToolsVersion '36.0.0'\n    signingConfigs {\n        debug {\n            storeFile rootProject.file('.preview-signing/debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        }\n        release {\n            def uploadPath = System.getenv('FORGE_UPLOAD_KEYSTORE')\n            if (uploadPath) {\n                def storePass = System.getenv('FORGE_UPLOAD_STORE_PASSWORD')\n                def keyPass = System.getenv('FORGE_UPLOAD_KEY_PASSWORD')\n                if (!storePass || !keyPass) throw new GradleException('Upload signing passwords are missing')\n                storeFile file(uploadPath)\n                storePassword storePass\n                keyAlias System.getenv('FORGE_UPLOAD_KEY_ALIAS') ?: 'upload'\n                keyPassword keyPass\n            }\n        }\n    }`);
 s=s.replace('buildTypes {',`buildTypes {\n        debug {\n            applicationIdSuffix '.preview'\n            versionNameSuffix '-preview'\n            resValue 'string', 'appName', '${c.name} 체험판'\n            resValue 'string', 'launcherName', '${c.name} 체험판'\n            resValue 'string', 'providerAuthority', '${c.packageId}.preview.fileprovider'\n        }`);
 s=s.replace('release {\n            minifyEnabled true',"release {\n            if (System.getenv('FORGE_UPLOAD_KEYSTORE')) signingConfig signingConfigs.release\n            minifyEnabled true");
 fs.writeFileSync(app,s);
 const wrapper=path.join(out,'gradle/wrapper/gradle-wrapper.properties');fs.appendFileSync(wrapper,'\ndistributionSha256Sum=f397b287023acdba1e9f6fc5ea72d22dd63669d59ed4a289a29b1a76eee151c6\n');
}
module.exports={tuneProject};
