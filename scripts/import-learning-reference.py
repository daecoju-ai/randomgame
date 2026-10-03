"""Fetch bounded dictionary reference data for editorial review, never live gameplay.
Usage: python3 scripts/import-learning-reference.py krdict 사과 --output .learning-staging/apple.json
Keys come only from process environment. Raw text is excluded from Git.
"""
import argparse, datetime, hashlib, json, os, pathlib, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
PROVIDERS = {
 'krdict': ('KRDIC_API_KEY','https://krdict.korean.go.kr/api/search'),
 'stdict': ('STDICT_API_KEY','https://stdict.korean.go.kr/api/search.do')
}
def normalize(xml, provider):
 root=ET.fromstring(xml)
 if root.find('.//error') is not None or root.tag=='error':raise ValueError('API response rejected')
 return [{'source':provider,'source_id':item.findtext('target_code'), 'word':item.findtext('word'), 'pos':item.findtext('pos'), 'definitions':[node.text for node in item.findall('.//definition') if node.text]} for item in root.findall('.//item')]
def main():
 p=argparse.ArgumentParser();p.add_argument('provider',choices=PROVIDERS);p.add_argument('query');p.add_argument('--output',required=True);a=p.parse_args()
 key_name,endpoint=PROVIDERS[a.provider];key=os.environ.get(key_name)
 if not key:raise ValueError(key_name+' is not configured')
 out=pathlib.Path(a.output).resolve();stage=(pathlib.Path(__file__).resolve().parents[1]/'.learning-staging').resolve()
 if not out.is_relative_to(stage):raise ValueError('Output must be in ignored .learning-staging/ directory')
 url=endpoint+'?'+urllib.parse.urlencode({'key':key,'q':a.query,'num':10,'start':1})
 with urllib.request.urlopen(url,timeout=20) as r:raw=r.read(2_000_001)
 if len(raw)>2_000_000:raise ValueError('Response is too large')
 data={'provider':a.provider,'query':a.query,'checked_at':datetime.date.today().isoformat(),'checksum':hashlib.sha256(raw).hexdigest(),'review_status':'draft','license_review_required':True,'records':normalize(raw,a.provider)}
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Reference saved for editorial review. No game content was published.')
if __name__=='__main__':
 try:main()
 except Exception:
  print('Reference import failed. Check provider, server environment key, output directory and connectivity. No key or request URL is logged.',file=sys.stderr);sys.exit(1)
