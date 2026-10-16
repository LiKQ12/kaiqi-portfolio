from pathlib import Path
from hashlib import sha256
import json
manifest=json.loads(Path('release-manifest.json').read_text(encoding='utf-8'))
for entry in manifest['files']:
    path=Path('dist')/entry['path']
    assert path.stat().st_size==entry['bytes'], entry['path']
    assert sha256(path.read_bytes()).hexdigest()==entry['sha256'], entry['path']
print(f"Verified {len(manifest['files'])} release files")
