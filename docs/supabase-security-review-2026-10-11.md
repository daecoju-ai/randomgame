# Supabase 보안·개발 도구 검토 (2026-10-11)

대상: `randomgame` / GitHub `daecoju-ai/randomgame`.

## 검토한 첨부 자료

- Supabase 2026-10-02 발표: https://supabase.com/blog/select-2026-build-anything
- 외부 SQL 감사 프로젝트: https://github.com/EstasDespedido/supabase-audit
- 이메일에서 소개된 Ekwo OS, Atomic CRM, Supabuckt, NO SUS는 현재 게임의 핵심 요구(교육 문제은행·전투·계정 보상)와 직접 관련이 적어 설치하지 않음.

## 실제 프로젝트 공식 Advisors 결과

- 보안 WARN: `public.delete_forge_account()`는 `SECURITY DEFINER`이고 authenticated 실행 가능. **의도된 기능**: Google Play 계정 삭제를 위해 `api/account.js`가 인증된 사용자 토큰으로 호출함. 함수는 `auth.uid()`가 NULL이면 거부하고 `auth.users`에서 해당 사용자 ID만 삭제. 무조건 REVOKE하면 계정 삭제가 고장 나므로 변경하지 않음. [공식 설명](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- 보안 WARN: 유출 비밀번호 보호가 비활성화됨. 이메일/비밀번호 인증을 계속 사용하므로 Dashboard에서 보호 기능을 활성화하는 것을 권장. [설정 설명](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- 보안 INFO: private 스키마의 25개 테이블에 RLS 정책 없음. private 스키마는 공개 Data API가 아니며 함수가 접근하는 서버 전용 테이블. 접근 범위 확인 없이 일괄 정책을 추가하지 않음. [설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- 공개 테이블 `public.player_progress`: RLS 활성화 확인.
- 성능 INFO: 외래 키 인덱스 후보 3개 (event_campaign.winner, luck_discoveries.mission_id, luck_event_winners.user_id), 미사용 인덱스 후보 1개. 데이터가 적어 즉시 추가/삭제하지 않음.

## 적용 판단

1. **즉시 활용**: Supabase 공식 Advisors로 읽기 전용 진단. 비밀키 공유 불필요.
2. **향후 적용**: Supabase 선언형 스키마/설정 GitHub 관리 및 로컬 테스트. 2026-10-02 발표 기준 일부는 실험적/알파 기능. 기존 마이그레이션과 충돌 검증 전 자동 마이그레이션 적용 금지.
3. **보류**: 게임 자체 MCP 서버, Compute, 외부 CRM, 복식부기, 스토리지 브라우저. 비용·복잡성만 증가할 가능성이 높음.
4. **외부 audit.sql**: 출처 확인, 코드 검토 후 읽기 전용으로만 사용할 것. 신뢰하지 않은 SQL을 실서버에서 바로 실행하지 않음. 공식 Advisors를 우선 사용.
5. **저장 최소화 유지**: 문제/해설 GitHub, 오답/복습 기기 내부, Supabase 인증·재화·보상 중복 방지 최소 데이터만.

## 남은 작업

- Dashboard에서 Leaked Password Protection 활성화 여부 확인 및 적용 (운영자 설정).
- 계정 삭제 기능은 유지하며 실제 인증 사용자만 자기 계정을 삭제할 수 있는지 통합 테스트.
- 신규 스키마 도입 전 백업, 로컬 테스트, 릴리스 테스트 통과 확인.

이 문서는 검토 보고서이며 데이터베이스를 변경하지 않습니다.
