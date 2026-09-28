const fs = require('node:fs');
const path = require('node:path');
const config = require('./release.json');
function makeAssetLinks(packageId, fingerprint) {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(packageId)) throw new Error('Invalid package ID');
  const sha = String(fingerprint || '').toUpperCase();
  if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(sha) || new Set(sha.split(':')).size < 2) throw new Error('Provide a real SHA-256 Play app signing certificate fingerprint');
  return [{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:packageId,sha256_cert_fingerprints:[sha]}}];
}
if (require.main === module) {
  const data = makeAssetLinks(config.packageId, process.argv[2]);
  const out = path.join(__dirname,'generated','assetlinks.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
  console.log(out+' — inspect, then copy to public/.well-known/assetlinks.json');
}
module.exports = {makeAssetLinks};
