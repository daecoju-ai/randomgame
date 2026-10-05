# 초·중·고 학습자료 → 게임 문제은행 적용 규칙

## 결론

외부 무료자료를 그대로 GitHub 문제은행으로 복사하지 않는다. 저장소에는 **자체 제작 문제와 출처 메타데이터**를 남기고, AI-Hub·KICE·EBS·에듀넷 자료는 개념·난이도·출제방식 분석에 사용한다.

AI-Hub의 교과 단계별 데이터(71855), 수학 풀이과정 데이터(71859), 국어 지문형 데이터(71857)는 2026-10-06 기준 출처 레지스트리에 등록했다. 원본 재배포 대신 새 문제 생성의 참고자료로 사용한다.

## 저장 구조

```text
data/
  questions/
    school/
      math/
      english/
      korean/
      science/
      social/
  sources/
    sources.json
    licenses.json
  references/
    school-content-sources.v64.json
  raw/
    school-external/   # 로컬 분석용, 원본 Git 커밋 차단
```

## 실제 변환 순서

1. 학년/과목/핵심 개념을 2022 교육과정 기준으로 고른다.
2. AI-Hub·KICE·EBS·에듀넷 자료에서는 문항 원문이 아니라 **문제 유형, 요구 사고과정, 난이도, 오답 패턴**을 분석한다.
3. 문제의 상황·숫자·지문·보기·해설을 새로 만든다.
4. 국어 어휘는 국립국어원, 실생활 통계는 KOSIS처럼 출처가 명확한 원천데이터를 우선한다.
5. 문제 JSON에는 기존 필수 필드와 함께 아래 품질 필드를 권장한다.
   - `hint`
   - `easy_explanation`
   - `principle`
   - `explanation_steps`
   - `wrong_answer_feedback`
   - `followup_question`
6. 자체 제작 문제는 기본적으로 `content_origin: "original"`, `license: "original_game_content"`를 사용한다. 외부 자료는 `source_references`에 참고 이력을 남길 수 있다.
7. 게시 전 `python scripts/validate_questions.py`와 `node scripts/build-learning.cjs`를 통과시킨다.

## 학년별 확대 순서

현재 저장소에는 초등 수학 1~6학년과 영어 시범 콘텐츠가 이미 있으므로 다음 순서로 채운다.

1. 초등 국어·과학·사회·영어 학년별 보강
2. 중1 → 중2 → 중3 국어·수학·영어·과학·사회
3. 고1 공통 기초 영역
4. 고2~고3 심화 및 시험형 문제

문제 수를 먼저 늘리기보다, 한 개념마다 **기초 이해 → 원리 → 적용 → 오답 교정 → 즉시 유사문제**가 이어지도록 구성한다.

## 금지

- 다운로드 가능한 문제집/PDF를 이유만으로 상업게임에 그대로 수록
- AI-Hub 원본 데이터·이미지를 저장소에 통째로 업로드
- KICE/EBS/에듀넷 문제와 해설을 문장만 조금 바꿔 재사용
- 출처가 불명확한 인터넷 문제를 대량 수집
- API 키를 JSON이나 프런트엔드 코드에 저장

기계가 읽는 전체 정책과 우선순위는 `data/references/school-content-sources.v64.json`을 사용한다.
