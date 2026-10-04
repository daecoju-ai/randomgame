import json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]; e=[]; seen=set()
for p in (R/'data/questions/certification').rglob('*.json'):
 d=json.loads(p.read_text(encoding='utf-8')); d=d if isinstance(d,list) else [d]
 for i,q in enumerate(d):
  for k in ['id','qualification','subject','domain','game_type','question','answer','content_origin','review_status','version']:
   if k not in q:e.append(f'{p}:{i}: missing {k}')
  if q.get('id') in seen:e.append(f'{p}:{i}: duplicate id {q.get("id")}')
  seen.add(q.get('id'))
  if q.get('content_origin')=='licensed_external' and not q.get('source_references'):e.append(f'{p}:{i}: licensed_external requires source_references')
for p in (R/'data/certifications/source-index').glob('*.json'):
 if p.name in {'POLICY.json','index.json'}:continue
 d=json.loads(p.read_text(encoding='utf-8')); d=d if isinstance(d,list) else [d]
 for i,s in enumerate(d):
  if s.get('license_status') in {'unknown','restricted'} and s.get('storage_policy')=='licensed_original_allowed':e.append(f'{p}:{i}: prohibited storage policy')
if e: print('\n'.join(e));sys.exit(1)
print(f'OK: certification bank validation passed ({len(seen)} question ids)')