# 초·중·고 문제은행 구조

이 폴더는 게임에 실제 배포되는 **자체 제작 문제**만 저장합니다.

## 권장 경로

- `math/`: 기존 초등 수학 문제 유지. 이후 중등·고등도 같은 subject 폴더 안에서 파일명으로 학교/학년 구분
- `english/`: 기존 영어 문장 문제 유지
- `korean/`, `science/`, `social/`: 과목별 자체 문제를 추가
- 파일명 예: `middle-grade1.v64.json`, `high-grade1.v64.json`

## 한 문제의 권장 해설 흐름

1. `hint` — 정답을 바로 주지 않는 첫 힌트
2. `easy_explanation` — 공부가 어려운 사용자도 이해할 수 있는 쉬운 설명
3. `principle` — 외워야 할 핵심 원리
4. `explanation_steps` — 단계별 풀이
5. `wrong_answer_feedback` — 자주 틀리는 선택지의 이유
6. `followup_question` — 같은 원리를 바로 다시 써보는 유사 문제

기존 필수 필드는 `data/schemas/question.schema.json`을 따릅니다.

## 출처 규칙

외부 자료는 무료 다운로드가 가능해도 그대로 저장하지 않습니다. AI-Hub/KICE/EBS/에듀넷 등은 라이선스 정책에 따라 참고용으로 분리하고, GitHub에는 자체 제작 결과만 넣습니다.

상세 정책: `docs/SCHOOL_CONTENT_PIPELINE.md`
