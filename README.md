# FORTUNE FORGE — 운명의 대장간

V8 `fortune_forge_v8_recipe_fix.html`을 기반으로 개선한 V9 개발 버전입니다.

## 실행

Python 3와 Node.js를 설치한 환경에서:

```sh
npm start
# http://localhost:8080
npm test
npm run check
```

외부 npm 의존성과 빌드 과정이 없는 HTML/CSS/Canvas 게임입니다.

## 이번 변경

- 청록 유적 전장, 금빛 HUD, 시작 화면, 모바일 도감 카드.
- 같은 Canvas 렌더러로 전장/도감 표시. T1 단순 복장 → T2 갑옷 → T3 관/문양 → T4 전설 장비 → T5 후광과 날개.
- 기본 영웅 12종, 전설 6종, 신화 3종.
- T2/T3 계열별 랜덤 조합, T4 지정 재료 조합, T5 전설 2개 조합.
- ZERO의 FROST 2개 수량 검사. 신화 조합이 실제 재료를 소모하고 실제 전투 유닛 생성.
- 조합 가능 필터, 보유/부족 재료 표시, 전투 중 즉시 조합, 닫기/Escape/키보드 포커스.
- 80마리 도달 패배, 마지막 웨이브의 적을 모두 처치한 후 승리, 재시작 초기화.
- PWA manifest, 192/512 PNG 및 maskable 아이콘, 서비스워커, 설치 안내.
- Vercel 정적 배포 설정 (`public` 디렉터리).

## Vercel 연결

Vercel에서 Git 저장소 `daecoju-ai/randomgame`을 가져옵니다. Framework는 **Other**, Output Directory는 **public**입니다. 빌드 명령은 필요 없습니다. `vercel.json`이 설정을 제공합니다. 이후 main 변경은 Git 연동 설정에 따라 자동 배포됩니다.

## 테스트와 한계

`npm test`는 DOM/Canvas 대역으로 실제 게임 코드를 실행해 재료 소비, 신화 생성, 비용/초기화, 승패, 배치 경계와 PWA 자원을 검사합니다. 실제 터치 입력, Android 설치, 오프라인 재실행, 시각적 레이아웃을 검증한 것은 아닙니다. 공개 배포 후 실제 브라우저/기기로 확인해야 합니다.

이 버전에는 계정, 저장/이어하기, 결제, 광고, 멀티플레이가 없습니다. 새로고침하면 전투가 초기화됩니다. 밸런스는 개발 단계이며, 모든 웨이브 완주 난이도는 추가 플레이 테스트 대상입니다. 설명 중 원본 스킬 표현 일부는 향후 고유 스킬 확장 대상입니다.

## Google Play

[등록 준비 문서](docs/PLAY_RELEASE.md)를 참고하세요. 현재 산출물은 PWA 소스이며 서명된 Android App Bundle이나 스토어 등록 완료본은 아닙니다.
