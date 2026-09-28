const test = require('node:test');
const assert = require('node:assert/strict');
const {makeAssetLinks} = require('../mobile/assetlinks.cjs');
test('asset links reject missing and placeholder certificates',()=>{
 for(const sha of ['', 'AA', Array(32).fill('00').join(':')]) assert.throws(()=>makeAssetLinks('app.fortuneforge.game',sha));
 assert.throws(()=>makeAssetLinks('invalid',Array.from({length:32},(_,i)=>i.toString(16).padStart(2,'0')).join(':')));
});
test('asset links preserve package and actual certificate bytes',()=>{
 const sha=Array.from({length:32},(_,i)=>i.toString(16).padStart(2,'0')).join(':');
 const [entry]=makeAssetLinks('app.fortuneforge.game',sha);
 assert.equal(entry.target.package_name,'app.fortuneforge.game');
 assert.deepEqual(entry.target.sha256_cert_fingerprints,[sha.toUpperCase()]);
 assert.deepEqual(entry.relation,['delegate_permission/common.handle_all_urls']);
});
