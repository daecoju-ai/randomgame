# 운명의 대장간 · Android 출시 준비

상태: **패키징 준비 단계. Play 제출 가능 상태가 아니며 서명된 AAB는 아직 없음.**
현재 웹게임을 TWA로 실행한다. 웹 배포와 Android 패키지 버전은 별개이며 오프라인 전체 플레이를 보장하지 않는다.

## 준비 파일

- `mobile/release.json`: 앱 ID 후보, 버전, SDK, 운영자 정보, 검증 증빙.
- `mobile/generate.cjs`: Bubblewrap 1.25.0으로 Android 프로젝트 생성.
- `mobile/assetlinks.cjs`: Play 앱 서명 인증서의 SHA-256으로 연결 파일 생성.
- `mobile/audit.cjs`: 필수 정보와 수동 검증 증빙의 누락 점검.
- `LISTING.ko.md`: 스토어 소개 초안과 이미지 목록.
- `PRIVACY-DRAFT.ko.md`: 처리 정보 조사 및 개인정보처리방침 초안.

## 로컬 Android 빌드

Node.js, JDK 17, Android Studio와 Android SDK 36을 준비한다. SDK 사용 조건은 운영자가 확인한다.
저장소 루트에서 PowerShell:

```powershell
npm ci --prefix mobile
npm run generate --prefix mobile
npm run audit --prefix mobile
```

`mobile/generated`를 Android Studio에서 연다. 로컬 SDK 경로를 설정하고 Gradle 동기화 후 Build > Generate Signed Bundle / APK > Android App Bundle을 선택한다.
서명 키는 운영자 소유 안전한 위치에 생성하고 별도로 백업한다. 키·암호를 Git에 올리지 않는다.
처음 업로드하기 전에 `app.fortuneforge.game` 후보를 확정한다. 최초 등록 뒤 앱 ID를 바꾸면 다른 앱이 된다.
재생성은 기존 generated 폴더를 덮어쓰지 않는다. 수동 설정이 있다면 백업한 뒤 해당 폴더만 제거하고 다시 생성한다.

## 웹사이트 소유 연결

Play Console의 **앱 서명 키 인증서** SHA-256을 사용한다. 업로드 키와 혼동하지 않는다.

```powershell
npm run assetlinks --prefix mobile -- "실제 콜론으로 구분된 SHA-256"
```

생성 파일을 검토한 다음 `public/.well-known/assetlinks.json`에 복사해 배포한다.
`https://randomfortune-game.vercel.app/.well-known/assetlinks.json`에서 JSON으로 200 응답하는지 확인한다.
Play 내부 테스트로 설치한 앱에서 주소창 없이 실행되는지 확인한다. 검증에 실패하면 브라우저 UI가 보일 수 있다.

## 출시 차단 항목

- 실제 이메일 수신 → 인증 → 로그인 → 재실행 → 로그아웃 → 비밀번호 재설정 검증.
  Supabase 이메일 템플릿의 OTP/링크 방식과 리디렉션 주소도 점검. 서버 연결만 확인된 상태는 인증 완료 검증이 아니다.
- 앱 내부 및 외부 웹 계정 삭제 요청 기능 구현 및 데이터 삭제 검증.
- 운영자·연락처·보유기간 확정, 개인정보처리방침 공개, 데이터 보안 설문 확정.
- 대상 연령 결정, IARC 등급 설문, 앱 접근 안내 및 심사용 테스트 계정 준비.
- 실제 Android 기기에서 뒤로가기, 화면 복귀, 오디오, 네트워크 끊김, 세션 유지, 조합·보상 중복 방지 테스트.
- 서명 AAB 생성, Play 내부 테스트, 사전 출시 보고서 확인.
- 실제 게임 스크린샷·피처 그래픽과 이미지/사운드의 상업 이용 권리 확인.
- Play 계정 유형/개설일에 따른 프로덕션 진입 테스트 요건 확인.

`release.json` evidence 각 값에 검증 날짜와 결과/자료 위치를 기록한다. 임의로 true를 넣어 통과시키지 않는다.
`node mobile/audit.cjs --strict`는 누락 시 종료 코드 1을 반환한다. 증빙 존재 점검이지 자동 심사 보증은 아니다.

## 최초 버전 운영 제안

광고·결제 없이 게임 안정성과 계정/저장 기능부터 검증한다. 현재 결제·AdMob은 구현되지 않았다.
추가 버전에서 광고 동의, 결제 검증, 환불/복원, 데이터 보안 변경을 함께 구현한다.
서버가 검증하는 보상 범위에도 클라이언트 전투 보고가 포함되어 있어 유료 경제 도입 전 부정 이용 검증을 강화한다.

## 공식 확인 자료 (2026-09-29 KST)

- API 36: https://developer.android.com/google/play/requirements/target-sdk
- 계정 삭제: https://support.google.com/googleplay/android-developer/answer/13327111
- 개인정보: https://support.google.com/googleplay/android-developer/answer/10144311
- 개인 계정 테스트: https://support.google.com/googleplay/android-developer/answer/14151465
- 등록 이미지: https://support.google.com/googleplay/android-developer/answer/9866151
- TWA: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start

요건은 제출 직전 Console과 공식 문서에서 다시 확인한다.
