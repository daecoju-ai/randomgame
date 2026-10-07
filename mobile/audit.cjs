const fs = require('node:fs');
const path = require('node:path');
const c = require('./release.json');
const expectedPackage='com.dananum.luckydefense';
const rows = [
 ['Play 패키지 ID', c.packageId === expectedPackage],
 ['target API 36+', c.targetSdk >= 36],
 ['개발자 표시명', Boolean(c.developerName.trim())],
 ['지원 이메일', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.supportEmail)],
 ['프로덕션 HTTPS 호스트', c.host === 'randomfortune-game.vercel.app'],
 ['대상 연령 결정', Boolean(c.targetAudience.trim())],
 ['Play 계정 유형 확인', ['personal','organization'].includes(c.playAccountType)],
 ...Object.entries(c.evidence).map(([name,evidence])=>[name,typeof evidence==='string' && evidence.trim().length>0])
];
for (const [name,ok] of rows) console.log(`${ok?'RECORDED':'BLOCKED'} | ${name}`);
console.log('\n수동 증빙 기록 점검입니다. 실제 심사 승인이나 자동 기능 검증을 의미하지 않습니다.');
if (process.argv.includes('--strict') && rows.some(([,ok])=>!ok)) process.exitCode=1;
