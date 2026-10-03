# Learning Content Pack

행운의 디펜스 학습 시스템용 사전 제작 데이터 패키지.

## 원칙
- 문제은행은 GitHub 정적 JSON으로 관리.
- 사용자 진도/보상/풀이기록은 Supabase에 저장.
- 외부 API 키는 저장소에 커밋하지 않고 Vercel 환경변수 사용.
- 2022 개정 교육과정은 출제 범위 기준으로 사용하고 문제/보기/해설은 자체 제작.
- 외부 데이터는 `data/sources`에서 출처/라이선스 추적.
- AI 생성 문제는 기본 `draft`; 검수 후 `reviewed`/`published`로 승격.

## Work가 할 일
1. 이 폴더를 실제 저장소 구조에 맞게 병합한다.
2. 공식 2022 교육과정과 starter_map을 대조하고 정확한 학년군/영역 구조로 확장한다. 원문 대량복제 금지.
3. question/curriculum schema를 프로젝트 검증 파이프라인에 연결한다.
4. 샘플 문제 로더를 구현해 게임에서 실제 출제한다.
5. Supabase에는 문제 원문이 아니라 user progress/result/reward를 저장한다.
6. API 키가 준비되면 서버 측에서 국어사전/법령/자격정보를 연결한다.

## 검증
`python scripts/validate_questions.py`
