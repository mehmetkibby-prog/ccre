import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / 'working/core511-source/scripts/core511'
OUT = ROOT / 'candidates/adventure-scheduler-r85'
EXPECTED = '452af5eb132fda60e4cb6500772fa0d5aeb4dffe012f1bb90a07351e28e947c4'
source = (CORE / 'adventure-channel.mjs').read_text()
sha = lambda value: hashlib.sha256(value.encode()).hexdigest()
assert sha(source) == EXPECTED, 'current adventure-channel changed; review before preparing'
patches = [
    ('return this.execute([],run,null,now);continue;}', 'if(this.execute([],run,null,now)!==false)return;continue;}'),
    ('   if(due)return this.execute(ids,run,null,now);',
     '   // Only an explicit pre-submission refusal permits trying another room.\n'
     '   // A started or unknown outcome retains the one-operation tick boundary.\n'
     '   if(due&&this.execute(ids,run,null,now)!==false)return;'),
    ('return !p||p.barrier||p.suspended||p.quiescer;}))return;',
     'return !p||p.barrier||p.suspended||p.quiescer;}))return false;'),
    ("'adventure:'+randomUUID());if(!lease)return;", "'adventure:'+randomUUID());if(!lease)return false;"),
    ('if(this.pending===task)this.pending=null;});', 'if(this.pending===task)this.pending=null;});return true;'),
]
candidate = source
for old, new in patches:
    assert candidate.count(old) == 1, old
    candidate = candidate.replace(old, new)
inverse = candidate
for old, new in reversed(patches):
    assert inverse.count(new) == 1, new
    inverse = inverse.replace(new, old)
assert inverse == source
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'baseline-adventure-channel.mjs').write_text(source)
(OUT / 'adventure-channel.mjs').write_text(candidate)
(OUT / 'manifest.json').write_text(json.dumps({
    'scope': 'isolated candidate; current working production source untouched',
    'file': 'adventure-channel.mjs', 'beforeSha256': sha(source),
    'afterSha256': sha(candidate), 'inverseExact': True,
    'patches': [{'before': old, 'after': new} for old, new in patches],
    'unchangedDungeonSha256': hashlib.sha256((CORE / 'dungeon-channel.mjs').read_bytes()).hexdigest(),
    'scheduledPortalPriorityUnchanged': True,
    'skipContract': 'Only execute() === false means no operation or asynchronous work started.',
}, indent=2) + '\n')
print(json.dumps({'before': sha(source), 'candidate': sha(candidate), 'inverseExact': True}))
