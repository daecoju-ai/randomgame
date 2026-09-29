# Android 앱 빌드

웹 게임을 Trusted Web Activity(TWA)로 감싼 Android 프로젝트입니다. 게임은 https://randomfortune-game.vercel.app 에서 실행되므로 인터넷과 호환 브라우저가 필요합니다. 웹 업데이트는 앱에서도 반영됩니다.

## 현재 산출물

- `fortune-forge-1.0.0-preview.apk`: 별도 패키지 `app.fortuneforge.game.preview`, 테스트용 서명. Android 휴대폰에서 설치 테스트에 사용합니다. 실제 휴대폰 검증은 아직 하지 않았습니다.
- `fortune-forge-1.0.0-unsigned.aab`: 정식 패키지 `app.fortuneforge.game`, 서명 전 번들. Play Console에 업로드할 수 없습니다.
- 웹 도메인의 Digital Asset Links와 Play 앱 서명 인증서 연결은 출시 전에 필요합니다. 연결 전에는 브라우저 주소창이 표시될 수 있습니다.

## 다시 빌드

Java 17 JDK, Android SDK Platform 36, Build Tools 36.0.0을 설치하고 `JAVA_HOME`, `ANDROID_HOME`을 설정하세요.

```sh
npm ci --prefix mobile
npm run generate --prefix mobile
npm run build --prefix mobile
```

기존 generated 폴더가 있으면 생성기는 덮어쓰지 않습니다. 빌드는 단기 테스트용 키만 생성합니다. 출시키는 자동 생성하지 않습니다.

정식 서명은 별도로 안전하게 보관한 업로드 키를 사용하여 `FORGE_UPLOAD_KEYSTORE`, `FORGE_UPLOAD_STORE_PASSWORD`, `FORGE_UPLOAD_KEY_PASSWORD`, `FORGE_UPLOAD_KEY_ALIAS` 환경변수로 지정합니다. 비밀번호와 키 파일은 Git에 넣지 마세요.

Play 계정 인증, 앱 서명 설정, 개인정보처리방침, 데이터 보안, 계정 삭제, 실제 기기 테스트와 테스트 자격 요건도 완료해야 합니다. 결제·광고 연동은 이 포장 작업에 포함되지 않습니다.
