# Google Play 등록 준비 — 2026-09-27

## 현재 구현과 다음 단계

PWA manifest, 아이콘, 오프라인 앱 셸, Vercel 설정은 구현했습니다. 다음은 실제 Vercel HTTPS 주소를 확보하고 기기 검증을 완료한 뒤 진행합니다.

1. Vercel에 GitHub `daecoju-ai/randomgame` 연결 → 최종 도메인 확정.
2. Android Chrome에서 앱 설치, 홈 아이콘 실행, 비행기 모드 재실행, 업데이트 후 새 버전 반영 확인.
3. TWA(Bubblewrap) 프로젝트 생성. 앱 ID는 `com.daecoju.randomgame`을 후보로 두되 개발자 소유/미사용 여부 확인 후 확정.
4. 업로드 키 생성과 안전한 별도 보관 → 서명된 AAB 생성. 키와 비밀번호는 저장소에 올리지 않음.
5. Play App Signing 인증서 SHA-256과 앱 ID로 `/.well-known/assetlinks.json` 생성. 최종 HTTPS 도메인에서 검증.
6. Play Console에 AAB 업로드, 내부 테스트 진행. 출시 대상 기기에서 실제 설치/실행/오프라인 확인.
7. 앱 이름, 설명, 실제 스크린샷, 1024×500 기능 그래픽, 개인정보처리방침, 지원 이메일, 콘텐츠 등급, 타깃 연령, 데이터 보안 작성.
8. 계정에 적용되는 비공개 테스트와 프로덕션 접근 심사 후 출시 심사 제출.

## 사용자 계정에서 필요한 정보

- Play Console 개발자 계정 존재 여부 및 개인/조직 구분.
- 개인 계정 생성 시점, 계정 본인/연락처 검증 상태.
- 공개할 개발자 이름, 지원 이메일, 대상 연령, 광고/결제 계획.
- 실제 배포 도메인, 확정 앱 ID, Play App Signing 인증서 지문.

이 정보는 임의로 채우지 않습니다. 결제, 계약 동의, 신원 확인은 계정 소유자가 진행해야 합니다.

## 2026-09-27 확인한 공식 요구사항

2023-11-13 이후 생성한 개인 개발자 계정은 최소 12명이 14일 연속 참여하는 비공개 테스트를 거친 후 프로덕션 접근을 신청해야 합니다. 계정별 Console 표시가 최종 기준입니다.
https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko

TWA는 웹사이트와 Android 앱의 관계를 Digital Asset Links로 검증합니다.
https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs
https://developer.chrome.com/docs/android/trusted-web-activity/quick-start

배포 형식/릴리스 절차:
https://support.google.com/googleplay/android-developer/answer/9859348?hl=en

## 스토어 문구 초안

이름: Fortune Forge: 운명의 대장간
짧은 설명: 영웅을 소환하고 조합하여 30개의 웨이브를 지키는 전략 디펜스

상세 설명:
작은 영웅들을 모아 전설과 신화를 완성하세요. 수호·검사, 궁수·포수, 마법사 세 계열을 전략적으로 배치하고 같은 계열의 영웅을 조합해 더 강한 팀을 만드세요. 조합 도감에서 보유 재료를 확인하고 전투 중 바로 승급할 수 있습니다. 에메랄드 유적을 지키는 30웨이브 도전에 나서세요.

현재 광고/결제/분석 SDK는 포함되어 있지 않습니다. 다만 호스팅 서비스의 접속 로그 처리 등을 포함한 최종 데이터 흐름은 출시 전 실제 설정으로 검토해야 하므로 데이터 보안/개인정보처리방침의 미수집 선언을 자동 확정하지 않습니다.
