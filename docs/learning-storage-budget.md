# 학습 저장 용량 운영 기준

- 문제·보기·해설·출처: GitHub data/questions, public/learning-data. 사용자별 복사 금지.
- 기존 Supabase private.learning_profiles: 사용자 설정 및 요약.
- 기존 private.learning_mastery: 문항 ID와 정답·오답·숙련도 요약.
- 기존 private.learning_current: 진행 중인 학습 및 중복 요청 방어.
- 기존 private.learning_daily / private.learning_rewards: 보상 중복 지급 방어.
- 기존 private.learning_sessions: 서버 검증용 세부 풀이. 보상 멱등성과 연결되어 있으므로 보존기간 확인 전 임의 삭제 금지.
- 기기별 localStorage ff_learning_<account>_review: 최근 오답 문제 ID 최대 80개. 정답으로 완주한 다음 시도에서 제거. 기기를 바꾸면 복습 목록은 동기화되지 않음.
- draft 문항: 기기 내 연습만 허용. 서버 보상 시작은 reviewed/published에 한정.
- 지식의 별: 서버에서 보상 검증·잔액 관리가 완성되기 전에는 구매 기능 활성화 금지.

## 2026-10-09 Supabase 저장량 측정
private.learning_current 64kB, learning_daily 64kB, learning_profiles 64kB, learning_sessions 56kB, learning_mastery 40kB, learning_rewards 32kB. 각 수치는 인덱스·할당 공간을 포함하는 총 테이블 크기이며 실제 사용자당 사용량을 뜻하지 않는다.

## 추후 서버 동기화
계정 간 동기화가 필요하면 기존 learning_mastery의 숙련도/오답 정보만 읽는 인증된 RPC를 추가하고, 전체 풀이 이벤트 동기화는 피한다. 서버 보상 함수와 멱등성 키를 검증하기 전에는 sessions 테이블을 삭제·압축하지 않는다.
