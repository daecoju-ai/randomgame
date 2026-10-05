"""Create original pilot questions; publish only after live math.js verification.

No keys required. POST batches, timeout/retry, fail closed, and save provenance.
Run --offline to regenerate from the committed verification snapshot.
"""
import ast
import datetime
from decimal import Decimal
from fractions import Fraction
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENDPOINT = 'https://api.mathjs.org/v4/'
SNAPSHOT = ROOT / 'data/references/mathjs-v61-verification.json'

def calculate(expression):
    """Independent exact rational arithmetic; never eval remote expressions."""
    def walk(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return Fraction(str(node.value))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -walk(node.operand)
        if isinstance(node, ast.BinOp):
            a, b = walk(node.left), walk(node.right)
            if isinstance(node.op, ast.Add): return a + b
            if isinstance(node.op, ast.Sub): return a - b
            if isinstance(node.op, ast.Mult): return a * b
            if isinstance(node.op, ast.Div): return a / b
        raise ValueError('Unsupported arithmetic expression')
    return walk(ast.parse(expression, mode='eval').body)

def number(value):
    value = Fraction(value)
    if value.denominator == 1: return str(value.numerator)
    # All generated answers are finite decimals, limited to six places.
    result = Decimal(value.numerator) / Decimal(value.denominator)
    return format(result, 'f').rstrip('0').rstrip('.')

def candidates():
    rows = []
    def add(grade, topic, expr, prompt, explanation, domain='number_operations'):
        rows.append(dict(grade=grade, topic=topic, expression=expr,
                         question=prompt, explanation=explanation, domain=domain))
    for i in range(1, 31):
        a, b = i % 8 + 2, (i // 8) + 1
        add(1,'덧셈',f'{a}+{b}',f'{a} + {b} = ?',f'{a}에서 {b}만큼 더 세면 {{answer}}입니다.')
        add(1,'뺄셈',f'{a+b}-{b}',f'사탕 {a+b}개 중 {b}개를 먹었습니다. 남은 사탕은 몇 개인가요?',f'전체에서 먹은 수를 빼요. {a+b} − {b} = {{answer}}개입니다.')
        add(1,'빈칸',f'{a+b}-{a}',f'{a} + □ = {a+b}. □에 들어갈 수는?',f'합에서 이미 알고 있는 수를 빼요. {a+b} − {a} = {{answer}}입니다.')
        add(1,'수의 순서',f'{i}+1',f'{i} 다음에 오는 수는?',f'다음 수는 1 큰 수입니다. {i} + 1 = {{answer}}입니다.')
        add(1,'자료 읽기',f'{a}+{b}',f'빨간 블록 {a}개와 파란 블록 {b}개가 있습니다. 블록은 모두 몇 개인가요?',f'색이 달라도 블록 수를 모두 더해요. {a} + {b} = {{answer}}개입니다.','data_patterns')
        a,b=i+21,i%9+3
        add(2,'두 자리 덧셈',f'{a}+{b}',f'{a} + {b} = ?',f'두 수를 더하면 {a} + {b} = {{answer}}입니다.')
        add(2,'두 자리 뺄셈',f'{a}-{b}',f'{a} − {b} = ?',f'{a}에서 {b}를 빼면 {{answer}}입니다.')
        m,n=i%8+2,i//8+2
        add(2,'곱셈의 뜻',f'{m}*{n}',f'접시 {n}개에 과자를 각각 {m}개씩 놓았습니다. 과자는 모두 몇 개인가요?',f'{m}개씩 {n}묶음이므로 {m} × {n} = {{answer}}개입니다.')
        add(2,'길이',f'{a}+{b}',f'길이 {a}cm 끈과 {b}cm 끈을 겹치지 않게 이었습니다. 전체 길이는 몇 cm인가요?',f'겹치지 않으므로 길이를 더해요. {a} + {b} = {{answer}}cm입니다.','geometry_measurement')
        add(2,'규칙',f'{i}*2+6',f'{i*2}, {i*2+2}, {i*2+4}, □. 같은 규칙으로 늘어날 때 □는?',f'2씩 커지는 규칙입니다. {i*2+4} + 2 = {{answer}}입니다.','data_patterns')
        a,b=i+12,i%6+2
        add(3,'곱셈',f'{a}*{b}',f'{a} × {b} = ?',f'{a}를 {b}번 더하는 것과 같아요. {a} × {b} = {{answer}}입니다.')
        add(3,'나눗셈',f'{a*b}/{b}',f'색연필 {a*b}자루를 {b}명에게 똑같이 나눕니다. 한 명은 몇 자루를 받나요?',f'전체 수를 사람 수로 나눠요. {a*b} ÷ {b} = {{answer}}자루입니다.')
        add(3,'나머지',f'{b-1}',f'{a*b+b-1}개를 한 묶음에 {b}개씩 묶으면 남는 개수는?',f'{b} × {a} = {a*b}이고 {a*b+b-1} − {a*b} = {{answer}}개가 남아요. 나머지는 {b}보다 작습니다.')
        add(3,'시간',f'{i+25}+{b}',f'책을 {i+25}분 읽고 {b}분 쉬었습니다. 모두 몇 분이 지났나요?',f'읽은 시간과 쉰 시간을 더해요. {i+25} + {b} = {{answer}}분입니다.','geometry_measurement')
        add(3,'길이 변환',f'{i}*100+{b}',f'{i}m {b}cm는 몇 cm인가요?',f'1m는 100cm입니다. {i} × 100 + {b} = {{answer}}cm입니다.','geometry_measurement')
        a,b=i+102,i%8+2
        add(4,'큰 수 곱셈',f'{a}*{b}',f'{a} × {b} = ?',f'각 자리의 값을 곱한 뒤 합하면 {a} × {b} = {{answer}}입니다.')
        add(4,'몫',f'{a*b}/{b}',f'{a*b} ÷ {b} = ?',f'{b} × {{answer}} = {a*b}이므로 몫은 {{answer}}입니다.')
        add(4,'소수 덧셈',f'{i}/10+{b}/10',f'{number(Fraction(i,10))} + {number(Fraction(b,10))} = ?',f'소수점 자리를 맞춰 더해요. {i}/10 + {b}/10 = {{answer}}입니다.')
        add(4,'각도',f'180-{i+30}',f'180°를 이루는 두 각 중 하나가 {i+30}°입니다. 다른 각은 몇 도인가요?',f'두 각의 합이 180°이므로 180 − {i+30} = {{answer}}°입니다.','geometry_measurement')
        add(4,'자료 합계',f'{i+20}+{i+23}+{i+26}',f'도서관 대출 수가 월요일 {i+20}권, 화요일 {i+23}권, 수요일 {i+26}권입니다. 합계는 몇 권인가요?',f'세 날의 자료를 모두 더하면 {i+20} + {i+23} + {i+26} = {{answer}}권입니다.','data_patterns')
        a,b=i+4,i%7+2
        add(5,'직사각형 넓이',f'{a}*{b}',f'가로 {a}cm, 세로 {b}cm인 직사각형의 넓이는 몇 cm²인가요?',f'직사각형 넓이 = 가로 × 세로입니다. {a} × {b} = {{answer}}cm²입니다.','geometry_measurement')
        add(5,'삼각형 넓이',f'{2*a}*{b}/2',f'밑변 {2*a}cm, 높이 {b}cm인 삼각형의 넓이는 몇 cm²인가요?',f'삼각형 넓이 = 밑변 × 높이 ÷ 2입니다. {2*a} × {b} ÷ 2 = {{answer}}cm²입니다.','geometry_measurement')
        add(5,'평균',f'({i}+{i+2}+{i+4})/3',f'세 번의 점수가 {i}점, {i+2}점, {i+4}점입니다. 평균은 몇 점인가요?',f'점수의 합을 횟수로 나눠요. ({i} + {i+2} + {i+4}) ÷ 3 = {{answer}}점입니다.','data_patterns')
        add(5,'소수 곱셈',f'{i}/10*{b}',f'{number(Fraction(i,10))} × {b} = ?',f'{i}/10을 {b}배 하면 {{answer}}입니다.')
        add(5,'분수의 양',f'{a*b}/{b}',f'물 {a*b}L의 1/{b}은 몇 L인가요?',f'전체를 {b}등분한 한 부분입니다. {a*b} ÷ {b} = {{answer}}L입니다.')
        add(6,'백분율',f'{i*20}*25/100',f'{i*20}명의 25%는 몇 명인가요?',f'25%는 25/100입니다. {i*20} × 25 ÷ 100 = {{answer}}명입니다.')
        add(6,'비례배분',f'{(i+3)*5}*2/5',f'구슬 {(i+3)*5}개를 2 : 3으로 나눕니다. 작은 몫은 몇 개인가요?',f'전체 비의 합은 2 + 3 = 5입니다. {(i+3)*5} × 2/5 = {{answer}}개입니다.')
        add(6,'직육면체 부피',f'{a}*{b}*3',f'가로 {a}cm, 세로 {b}cm, 높이 3cm인 직육면체의 부피는 몇 cm³인가요?',f'직육면체 부피 = 가로 × 세로 × 높이입니다. {a} × {b} × 3 = {{answer}}cm³입니다.','geometry_measurement')
        add(6,'원의 넓이',f'{i+1}*{i+1}*3.14',f'반지름 {i+1}cm인 원의 넓이는 몇 cm²인가요? (원주율 3.14)',f'원의 넓이 = 반지름 × 반지름 × 원주율입니다. {i+1} × {i+1} × 3.14 = {{answer}}cm²입니다.','geometry_measurement')
        add(6,'분수 나눗셈',f'{a}/({b}/2)',f'{a} ÷ ({b}/2) = ? (답은 소수로)',f'분수로 나눌 때는 역수를 곱해요. {a} × 2/{b} = {{answer}}입니다.')
    return rows

def generate():
    existing = {q['question'] for f in (ROOT/'data/questions').rglob('*.json')
                if not f.name.endswith('.v61.json') for q in json.loads(f.read_text())}
    selected, counts = [], {}
    for row in candidates():
        key = row['grade'], row['topic']
        expected = calculate(row['expression'])
        # No repeating-decimal answers; exact finite decimals only.
        denominator = expected.denominator
        for factor in (2, 5):
            while denominator % factor == 0: denominator //= factor
        if denominator != 1 or row['question'] in existing or counts.get(key, 0) >= 20:
            continue
        counts[key] = counts.get(key, 0) + 1
        existing.add(row['question']); selected.append(row)
    return selected

def verify(rows, snapshot):
    expressions = [r['expression'] for r in rows]
    if snapshot['expressions'] != expressions: raise ValueError('Snapshot does not match questions')
    if len(snapshot['results']) != len(rows): raise ValueError('Incomplete API results')
    for row, value in zip(rows, snapshot['results']):
        exact = calculate(row['expression'])
        expected = Decimal(exact.numerator) / Decimal(exact.denominator)
        if abs(Decimal(value) - expected) > Decimal('0.0000000001'):
            raise ValueError('API/local calculation disagreement: ' + row['expression'])

def main():
    rows = generate()
    if '--offline' in sys.argv:
        snapshot = json.loads(SNAPSHOT.read_text())
    else:
        results = []
        for start in range(0, len(rows), 75):
            expressions = [r['expression'] for r in rows[start:start+75]]
            request = urllib.request.Request(ENDPOINT, data=json.dumps({'expr':expressions,'precision':14}).encode(),
                                             headers={'Content-Type':'application/json'}, method='POST')
            for attempt in range(3):
                try:
                    with urllib.request.urlopen(request, timeout=30) as response:
                        if response.status != 200: raise ValueError('API unsuccessful')
                        value = json.load(response)
                    if value.get('error') or not isinstance(value.get('result'), list): raise ValueError('API invalid result')
                    if len(value['result']) != len(expressions): raise ValueError('API incomplete batch')
                    results.extend(value['result']); break
                except Exception:
                    if attempt == 2: raise
            print(f'API verified {len(results)}/{len(rows)}', flush=True)
        snapshot = {'provider':'math.js REST API','endpoint':ENDPOINT,'docs':'https://api.mathjs.org/',
                    'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'expressions':[r['expression'] for r in rows], 'results':results}
    verify(rows, snapshot)
    groups = {}
    for row, result in zip(rows, snapshot['results']):
        grade = row['grade']; group = groups.setdefault(grade, [])
        exact = calculate(row['expression']); answer = number(exact)
        choices = [answer] + [number(exact + n) for n in (-1,1,2) if exact+n >= 0]
        if len(choices) < 4: choices.append(number(exact+3))
        q = dict(id=f'V61-E{grade}-MATH-{len(group)+1:03}',curriculum='2022',school='elementary',grade=grade,
                 subject='math',domain=row['domain'],learning_target=row['topic']+'의 뜻을 이해하고 문제에 적용한다',
                 difficulty=1 if grade<=2 else 2 if grade<=4 else 3,game_type='TILE_CHOICE',question=row['question'],
                 choices=choices,answer=answer,explanation=row['explanation'].replace('{answer}',answer),
                 content_origin='original',source_reference='moe_2022_curriculum',license='original_game_content',
                 review_status='reviewed',release_channel='pilot',version=1,tags=[row['topic']],
                 review={'method':'mathjs_api_and_exact_rational_verification','date':snapshot['checked_at'][:10],
                         'human_publication_pending':True},
                 verification={'provider':'mathjs','expression':row['expression'],'result':result,
                               'source_reference':'mathjs_calculation_api','snapshot':'data/references/mathjs-v61-verification.json'})
        group.append(q)
    SNAPSHOT.parent.mkdir(exist_ok=True)
    SNAPSHOT.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
    for grade, group in groups.items():
        (ROOT/f'data/questions/school/math/elementary-grade{grade}.v61.json').write_text(json.dumps(group,ensure_ascii=False,indent=2)+'\n')
    print('Saved',sum(map(len,groups.values())),'original API-verified questions:',{g:len(q) for g,q in groups.items()})

if __name__ == '__main__': main()
