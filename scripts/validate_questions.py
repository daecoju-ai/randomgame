import json, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
files=list((root/'data/questions').rglob('*.json'))
seen=set(); errors=[]
for f in files:
    try: rows=json.loads(f.read_text(encoding='utf-8'))
    except Exception as e: errors.append(f'{f}: invalid JSON: {e}'); continue
    if not isinstance(rows,list): rows=[rows]
    for i,q in enumerate(rows):
        p=f'{f}:{i+1}'
        for k in ['id','curriculum','school','grade','subject','domain','learning_target','difficulty','game_type','question','answer','content_origin','source_reference','license','review_status','version']:
            if k not in q or q[k] in ('',None): errors.append(f'{p}: missing {k}')
        qid=q.get('id')
        if qid in seen: errors.append(f'{p}: duplicate id {qid}')
        seen.add(qid)
        if q.get('game_type') in ('multiple_choice','tile_order') and 'choices' in q and str(q.get('answer')) not in [str(x) for x in q['choices']]: errors.append(f'{p}: answer not in choices')
        if q.get('review_status') not in ('draft','reviewed','published'): errors.append(f'{p}: invalid review_status')
        if '/data/questions/certification/' in ('/'+f.as_posix()):
            for k in ['qualification_code','qualification_name','qualification_grade']:
                if not q.get(k): errors.append(f'{p}: missing {k}')
            refs=q.get('source_references',[])
            if not isinstance(refs,list) or not refs: errors.append(f'{p}: missing source_references')
if errors:
    print('\n'.join(errors)); sys.exit(1)
print(f'OK: {len(seen)} questions validated across {len(files)} files')
# Extended checks reuse the package validator and schemas.
def validate_schema(q,schema):
 for key in schema['required']:
  if key not in q:raise ValueError('missing '+key)
 for key,rules in schema['properties'].items():
  if key not in q:continue
  v=q[key];types=rules.get('type');types=[types] if isinstance(types,str) else types
  matches={'string':isinstance(v,str),'integer':isinstance(v,int) and not isinstance(v,bool),'array':isinstance(v,list),'object':isinstance(v,dict),'null':v is None}
  if types and not any(matches.get(t,True) for t in types):raise ValueError('invalid type '+key)
  if 'enum' in rules and v not in rules['enum']:raise ValueError('invalid '+key)
  if 'minimum' in rules and v<rules['minimum']:raise ValueError('invalid '+key)
  if 'maximum' in rules and v>rules['maximum']:raise ValueError('invalid '+key)
  if isinstance(v,str) and len(v)<rules.get('minLength',0):raise ValueError('empty '+key)
  if 'pattern' in rules:
   import re
   if not re.match(rules['pattern'],v):raise ValueError('invalid '+key)

schema=json.loads((root/'data/schemas/question.schema.json').read_text())
sources={x['id'] for x in json.loads((root/'data/sources/sources.json').read_text())}
licenses={x.get('id') for x in json.loads((root/'data/sources/licenses.json').read_text())}
curricula=list((root/'data/curriculum').rglob('*.json'));curriculum_codes={json.loads(f.read_text())['curriculum'] for f in curricula}
for f in files:
 for q in json.loads(f.read_text()):
  try: validate_schema(q,schema)
  except ValueError as e: errors.append(f"{q.get('id')}: {e}")
  if q.get('source_reference') not in sources:errors.append(f"{q.get('id')}: unknown source")
  if q.get('license') not in licenses:errors.append(f"{q.get('id')}: unknown license")
  if q.get('curriculum') not in curriculum_codes:errors.append(f"{q.get('id')}: invalid curriculum code")
  if q.get('school')!='general' and (not isinstance(q.get('grade'),int) or not 1<=q['grade']<=(6 if q['school']=='elementary' else 3)):errors.append(f"{q.get('id')}: invalid grade")
  answers=q['answer'] if isinstance(q['answer'],list) else [q['answer']]
  if any(str(a) not in [str(x) for x in q.get('choices',[])] for a in answers):errors.append(f"{q.get('id')}: answer/choices mismatch")
  if q.get('school')=='elementary' and q.get('subject')=='math':
   domains={u['domain'] for c in curricula for u in json.loads(c.read_text()).get('units',[])}
   if q.get('domain') not in domains:errors.append(f"{q.get('id')}: unknown curriculum domain")
if errors:print('\n'.join(errors));sys.exit(1)
print('OK: schema, grade, curriculum, source, license and answer checks')
