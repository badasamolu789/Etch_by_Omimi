"""Check executable JavaScript, duplicate IDs, and local HTML references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import subprocess, tempfile

ROOT = Path(__file__).resolve().parent.parent
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]; self.ids=[]; self.scripts=[]; self.code=None
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        for key in ('href','src'):
            if key in attrs: self.refs.append(attrs[key])
        if tag=='script' and 'src' not in attrs and attrs.get('type','') not in ('application/json','application/ld+json'): self.code=''
    def handle_data(self, data):
        if self.code is not None: self.code+=data
    def handle_endtag(self, tag):
        if tag=='script' and self.code is not None: self.scripts.append(self.code); self.code=None

errors=[]; checked=0
for path in ROOT.rglob('*.html'):
    parser=Parser(); parser.feed(path.read_text())
    for value in parser.refs:
        url=urlsplit(value)
        if url.scheme or url.netloc or not url.path or '${' in value: continue
        target=ROOT/url.path.lstrip('/') if url.path.startswith('/') else path.parent/unquote(url.path)
        if not target.exists(): errors.append(f'{path.relative_to(ROOT)}: missing {value}')
    for id_, count in Counter(parser.ids).items():
        if count>1: errors.append(f'{path.relative_to(ROOT)}: duplicate ID {id_}')
    for code in parser.scripts:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js') as script:
            script.write(code); script.flush()
            result=subprocess.run(['node','--check',script.name],capture_output=True,text=True); checked+=1
            if result.returncode: errors.append(f'{path.relative_to(ROOT)}: {result.stderr}')
for path in [*ROOT.rglob('*.js'), *ROOT.rglob('*.mjs')]:
    result=subprocess.run(['node','--check',str(path)],capture_output=True,text=True); checked+=1
    if result.returncode: errors.append(result.stderr)
print(f'{checked} JavaScript syntax checks; {len(errors)} errors')
for error in errors: print(error)
raise SystemExit(bool(errors))
