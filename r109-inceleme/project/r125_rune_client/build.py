"""Build content-addressed client assets for four-channel Rune rendering."""
from hashlib import sha256
from pathlib import Path
import re

here = Path(__file__).resolve().parent
source = here.parent / 'r109_latency_completion/working/core511-source/scripts/core511/generated/client'
out = here / 'assets'
out.mkdir(exist_ok=True)
game = source / 'game-client-core511-r120-69c9ea09dc330cc6.js'
portal = source / 'auth-portal-core511-r120-93f57bbee2e7ec95.js'
data, count = re.subn(rb'(rune-v2-(?:boss|\(tide\|warden\|sentinel\|wraith\|boss\))-c)\[1-3\]', rb'\g<1>[1-4]', game.read_bytes())
assert count == 2
game_name = f'game-client-core511-r125-{sha256(data).hexdigest()[:16]}.js'
(out / game_name).write_bytes(data)
portal_data = portal.read_bytes()
assert game.name.encode() in portal_data
portal_data = portal_data.replace(game.name.encode(), game_name.encode())
portal_name = f'auth-portal-core511-r125-{sha256(portal_data).hexdigest()[:16]}.js'
(out / portal_name).write_bytes(portal_data)
print(game_name, portal_name)
