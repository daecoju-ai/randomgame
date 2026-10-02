# 구글·카카오 간편 로그인 활성화

게임 버튼, PKCE 인증 요청, 서버 콜백, HttpOnly 세션 저장과 기존 계정 성장 불러오기는 구현되어 있습니다. Supabase의 공개 설정에서 제공자가 활성화되면 버튼이 자동 활성화됩니다. 개발자 인증키를 코드나 채팅에 올리지 말고 Supabase 대시보드의 제공자 설정에 직접 입력합니다.

## 공통

- 게임 주소: https://randomfortune-game.vercel.app
- Google/Kakao 개발자 콘솔에 등록할 Redirect URI: https://ozyrzptyfyytqchufbbe.supabase.co/auth/v1/callback
- Supabase Auth URL Configuration의 Site URL: https://randomfortune-game.vercel.app
- Supabase Redirect URLs에 추가: https://randomfortune-game.vercel.app/api/oauth-callback
- Supabase 제공자 설정: https://supabase.com/dashboard/project/ozyrzptyfyytqchufbbe/auth/providers

## 구글

Google Auth Platform에서 웹 애플리케이션 OAuth 클라이언트를 만듭니다. Authorized JavaScript origins에는 게임 주소, Authorized redirect URIs에는 위 Supabase 콜백을 입력합니다. 구글 Client ID/Client Secret을 Supabase Google 설정에 입력하고 활성화합니다. 테스트 모드에서는 등록한 테스트 사용자만 로그인할 수 있으므로 일반 공개 전 게시 상태도 확인합니다. openid, email, profile만 사용합니다.

## 카카오

Kakao Developers에서 앱을 등록하고 카카오 로그인을 활성화합니다. 웹 사이트 도메인은 게임 주소로, Redirect URI는 위 Supabase 콜백으로 등록합니다. REST API 키와 카카오 로그인 Client Secret을 Supabase Kakao 설정에 입력하고 활성화합니다. 기존 이메일 계정 연결을 위해 이메일 제공 동의 항목과 필요한 권한 승인을 확인합니다.

## 기존 계정 기록

Supabase가 같은 검증된 이메일의 로그인 식별자를 동일 사용자에 연결하면 기존 사용자 ID의 성장·다이아·유닛 기록을 그대로 불러옵니다. 서로 다른 이메일의 계정은 자동 합치지 않습니다. 이메일을 제공하지 않는 카카오 계정도 기존 이메일 계정과 동일한 기록을 보장하지 않습니다. 로그인 후 사용자 ID를 키로 하는 기존 기록 로더를 사용하며 통화나 유닛 데이터는 콜백에서 변경하지 않습니다.

## 최종 검증

제공자 활성화 후 각각 실제 테스트 계정으로 로그인 → 게임 복귀 → 기존 기록 확인 → 새로고침 후 로그인 유지 → 로그아웃을 확인합니다. 승인 취소와 만료된 로그인 요청도 안전한 안내 화면으로 돌아와야 합니다.
