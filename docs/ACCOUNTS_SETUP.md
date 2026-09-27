# V12 회원 계정 활성화

코드와 UI는 구현되어 있지만 Supabase 프로젝트·SQL·메일 발송 설정·Vercel 환경변수가 없으면 실제 가입은 열리지 않습니다. `/api/account`의 status 응답은 configured:false이며 화면은 비회원 플레이를 유지합니다.

## 운영자가 한 번 설정할 항목
1. 이 게임용 Supabase 프로젝트를 생성합니다. 기존 다른 앱의 데이터베이스는 변경하지 않습니다.
2. SQL Editor에서 `supabase/001_accounts.sql`, `supabase/002_isolate_progress_writer.sql`을 순서대로 실행합니다. 각 계정은 본인의 기록만 읽을 수 있으며 private 스키마의 저장 함수가 로그인 UID와 revision을 검사합니다. 공개 RPC는 SECURITY INVOKER입니다.
3. Authentication의 Email provider를 켜고 **Confirm email**을 활성화합니다. 비밀번호 최소 길이 10자. Site URL은 `https://randomfortune-game.vercel.app`.
4. Email Templates의 Confirm signup / Reset password 본문을 아래 인증번호 방식으로 설정합니다. 기본 이메일 링크 템플릿은 이 앱의 쿠키 인증 흐름과 호환되지 않습니다.
   - 가입: `<h2>운명의 대장간 이메일 인증</h2><p>게임의 이메일 인증 화면에 입력하세요.</p><p>{{ .Token }}</p>`
   - 재설정: `<h2>비밀번호 재설정</h2><p>게임의 비밀번호 찾기 화면에 입력하세요.</p><p>{{ .Token }}</p>`
5. 일반 이용자에게 인증 메일을 보내려면 Supabase의 Custom SMTP를 연결하고 발신 도메인을 인증합니다. 기본 테스트 메일 발송 제한은 공개 서비스용으로 충분하지 않습니다. 공급자 rate limit을 유지합니다. 이 단계의 발송 서비스 비용·계정 설정은 별도입니다.
6. Vercel의 **randomfortune-game → Settings → Environment Variables → Production**에 `.env.example`의 3개 변수를 등록합니다. Supabase Project URL과 publishable key(또는 legacy anon key)를 사용합니다. **service_role/secret key 사용 금지**. 키를 GitHub 파일이나 채팅에 올리지 않습니다.
7. Production을 재배포합니다. SQL/SMTP/환경변수가 모두 준비된 후 공개 테스트 계정으로 가입 → 인증번호 → 로그인 → 성장 저장 → 로그아웃 → 다른 브라우저 로그인 흐름을 점검합니다.

## 구현
- 이메일/비밀번호 가입, 이메일 인증번호 확인·재발송, 로그인, 비밀번호 재설정, 로그아웃.
- 비밀번호는 Supabase Auth에서 처리합니다. 앱의 저장소·로그·브라우저 localStorage에 기록하지 않습니다.
- 세션은 Secure/HttpOnly/SameSite=Lax 및 __Host- 접두어 쿠키. 요청 Origin과 JSON 전용 헤더 검증. API 응답은 no-store이고 서비스워커는 API를 캐시하지 않습니다.
- 새 계정의 첫 기록은 비회원 기록 가져오기 또는 신규 시작 중 선택합니다. 게스트 원본은 보존됩니다. 계정별 임시 저장과 owner 검사로 계정 혼합을 방지합니다.
- 저장은 revision 비교로 충돌을 감지합니다. 충돌 시 자동 병합/덮어쓰기 하지 않습니다. 사용자가 서버 기록을 선택하면 미저장 기록은 기기에 백업합니다.
- 연결 실패 시 미저장 기록을 기기에 보존하고 전투를 일시정지합니다. 재연결 저장 후 재개할 수 있습니다. 오프라인 비회원 플레이는 기존대로 동작합니다.
- 로그인 성장 데이터는 클라이언트 계산 결과입니다. 값의 형식·범위·소유권을 검증하지만 치트 방지용 서버 전투 판정은 아닙니다. 경쟁 순위·현금성 재화 도입 전에 서버 권위형 보상으로 바꿔야 합니다.
- 계정 삭제 UI/소셜 로그인/관리자 기능은 이번 범위에 포함되지 않습니다.

## 확인 범위
2026-09-27: 서울 리전의 `randomgame` 프로젝트(`ozyrzptyfyytqchufbbe`)에 두 SQL 적용 완료. 생성 비용 조회 결과 월 $0. 실제 DB에서 최초 저장, 정상 revision 갱신, 오래된 revision 거절, 다른 계정의 조회·갱신 차단을 트랜잭션 롤백 방식으로 검증했습니다. 테스트 데이터는 남기지 않았습니다. Supabase security advisor 경고 0개. Vercel 팀 목록이 비어 있어 운영 환경변수는 적용하지 못했으며, 이메일 템플릿·SMTP·실제 가입 흐름은 미검증입니다.

Node 자동 테스트는 mock Supabase 응답으로 인증/쿠키/접근제어/충돌을 검증합니다. 실제 이메일 발송 및 기기 간 계정 연동은 외부 서버 설정 완료 후 별도 검증해야 합니다.
